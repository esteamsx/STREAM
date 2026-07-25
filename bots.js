import fs from "fs";
import path from "path";
import https from "https";
import { spawn, exec } from "child_process";
import { db } from "./firebase.js";
import admin from "firebase-admin";

// ── WhatsApp bot deployment engine ──────────────────────────────────────
// Deploys ONE fixed repo (paskito002/ES_TEAMS-V1) per user request, the
// way a Render web service deploy works: download the repo, npm install,
// run it as a long-lived child process, stream its logs, and manage its
// lifecycle (stop/restart/delete). Nothing here accepts an arbitrary
// repo URL — the source is hardcoded on purpose.
//
// The bot itself is a Baileys WhatsApp client. It authenticates via a
// "pairing code" (an 8-digit code entered in WhatsApp > Linked Devices),
// requested using a phone number passed in as the PHONE_NUMBER env var
// (confirmed directly from the repo's index.js: `process.env.PHONE_NUMBER
// || phoneNumber`). Once paired, Baileys writes session credentials to
// ./ES_TEAMS-SESSION inside the working directory — those files are
// backed up to Firestore periodically so a server restart can restore
// the session and reconnect without forcing everyone to re-pair.
//
// SPEED: the source + npm install are identical for every deployment (same
// fixed repo), so downloading and `npm install`-ing from scratch on every
// single deploy was the main reason deploys were slow. Instead, that work
// happens ONCE into a shared "template" directory; every deployment after
// that just copies the small source tree and symlinks the (large,
// read-only-in-practice) node_modules from the template rather than
// reinstalling it. Only the very first deploy on a fresh server (or after
// the template's TTL expires) pays the full download+install cost.

const REPO_TARBALL_URL = "https://github.com/paskito002/ES_TEAMS-V1/archive/refs/heads/main.tar.gz";
const BOTS_ROOT = path.join(process.cwd(), ".bot-deployments");
const TEMPLATE_DIR = path.join(BOTS_ROOT, "_template");
const TEMPLATE_MARKER = path.join(TEMPLATE_DIR, ".built-at");
const TEMPLATE_TTL_MS = 6 * 60 * 60 * 1000; // rebuild the shared template at most every 6h
const SESSION_DIR_NAME = "ES_TEAMS-SESSION";
const MAX_ACTIVE_BOTS = 100;
const MAX_INSTANCES_PER_USER = 3; // admin (isAdminEmail) bypasses this; the global 100 cap above still applies to everyone
// Every one of these counts as "in progress or running" for the cap and
// for boot-time restore — including the fast-moving download/extract/
// install stages, which mostly only appear on the very first deploy.
const ACTIVE_STATUSES = ["downloading", "extracting", "installing", "starting", "pairing", "connected", "reconnecting"];
const LOG_LINES_KEPT = 300;
const SESSION_BACKUP_INTERVAL_MS = 2 * 60 * 1000;

// uid+botId -> { proc, logs: string[], stoppedByUser: bool, backupTimer }
// In-memory only — this is process state (a running child process can't be
// reconstructed from Firestore), separate from the Firestore doc which is
// the durable record of what *should* be running.
const running = new Map();

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function pushLog(entry, line) {
  entry.logs.push(line);
  if (entry.logs.length > LOG_LINES_KEPT) entry.logs.splice(0, entry.logs.length - LOG_LINES_KEPT);
}

function isValidPhoneNumber(raw) {
  const digits = (raw || "").toString().replace(/[^0-9]/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

async function countActiveBots() {
  // Firestore has no server-side COUNT-with-multiple-values query here
  // without a composite index, so pull ids/status only for the active
  // set — cheap, this collection is small (capped at 100 rows total).
  const snap = await db.collection("botDeployments").where("status", "in", ACTIVE_STATUSES).get();
  return snap.size;
}

async function getBotDoc(uid, botId) {
  const ref = db.collection("botDeployments").doc(botId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Deployment not found.");
  const data = snap.data();
  if (data.uid !== uid) throw new Error("Deployment not found.");
  return { ref, data };
}

async function countBotsForUser(uid) {
  const snap = await db.collection("botDeployments").where("uid", "==", uid).get();
  return snap.size;
}

// ── Deploy ────────────────────────────────────────────────────────────
async function deployBot(uid, { label, phoneNumber }, isAdmin = false) {
  const cleanLabel = (label || "My Bot").toString().trim().slice(0, 60) || "My Bot";
  const cleanNumber = isValidPhoneNumber(phoneNumber);
  if (!cleanNumber) throw new Error("Enter a valid phone number, digits only (with country code, no + or spaces).");

  if (!isAdmin) {
    const mineCount = await countBotsForUser(uid);
    if (mineCount >= MAX_INSTANCES_PER_USER) {
      throw new Error(`You can only deploy ${MAX_INSTANCES_PER_USER} instances.`);
    }
  }

  const activeCount = await countActiveBots();
  if (activeCount >= MAX_ACTIVE_BOTS) {
    throw new Error(`Deployment limit reached (${MAX_ACTIVE_BOTS}/${MAX_ACTIVE_BOTS}). Try again once a slot frees up.`);
  }

  const ref = db.collection("botDeployments").doc();
  const now = Date.now();
  await ref.set({
    uid, label: cleanLabel, phoneNumber: cleanNumber,
    status: "downloading", pairingCode: null, pairingCodeAt: null, connectedAt: null,
    lastError: null, stoppedByUser: false, createdAt: now, updatedAt: now,
  });

  runDeployment(ref.id, uid, cleanNumber).catch((err) => {
    ref.update({ status: "crashed", lastError: err.message, updatedAt: Date.now() }).catch(() => {});
  });

  return { id: ref.id };
}

async function downloadTarball(destFile) {
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destFile);
    https.get(REPO_TARBALL_URL, { headers: { "User-Agent": "es-teams-tv-deploy" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // GitHub archive links usually redirect once — follow it manually
        // rather than pulling in a whole HTTP client just for this.
        https.get(res.headers.location, { headers: { "User-Agent": "es-teams-tv-deploy" } }, (res2) => {
          res2.pipe(file);
          file.on("finish", () => file.close(resolve));
        }).on("error", reject);
        return;
      }
      if (res.statusCode !== 200) { reject(new Error(`Download failed: HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
}

function run(cmd, opts) {
  return new Promise((resolve, reject) => {
    exec(cmd, { ...opts, maxBuffer: 1024 * 1024 * 20 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || stdout || err.message));
      else resolve(stdout);
    });
  });
}

// ── Shared template (download + install ONCE, reused by every deploy) ───
let templateReadyPromise = null;

function templateIsFresh() {
  try {
    const builtAt = parseInt(fs.readFileSync(TEMPLATE_MARKER, "utf8"), 10);
    return Number.isFinite(builtAt) && Date.now() - builtAt < TEMPLATE_TTL_MS;
  } catch {
    return false;
  }
}

// onStage(status) is called as the template moves through the slow steps —
// only relevant to whichever deployment happened to trigger the (re)build;
// every deployment that finds a fresh template skips straight past this.
async function ensureTemplate(onStage) {
  if (templateIsFresh()) return;
  if (!templateReadyPromise) {
    templateReadyPromise = (async () => {
      fs.rmSync(TEMPLATE_DIR, { recursive: true, force: true });
      fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
      await onStage?.("downloading");
      const tarPath = path.join(TEMPLATE_DIR, "_src.tar.gz");
      await downloadTarball(tarPath);
      await onStage?.("extracting");
      await run(`tar -xzf "${tarPath}" -C "${TEMPLATE_DIR}" --strip-components=1`, { cwd: TEMPLATE_DIR });
      fs.unlinkSync(tarPath);
      await onStage?.("installing");
      await run("npm install --omit=dev --no-audit --no-fund", { cwd: TEMPLATE_DIR });
      fs.writeFileSync(TEMPLATE_MARKER, String(Date.now()));
    })();
    templateReadyPromise.finally(() => { templateReadyPromise = null; });
  }
  await templateReadyPromise;
}

// Fast per-deployment setup once the template exists: copy the (small)
// source tree, and symlink node_modules instead of copying it — it's
// identical across every instance and can be tens/hundreds of MB, so
// copying it per-bot would eat disk and time for no benefit.
function materializeFromTemplate(workDir) {
  const entries = fs.readdirSync(TEMPLATE_DIR);
  for (const name of entries) {
    if (name === "node_modules" || name === ".built-at") continue;
    fs.cpSync(path.join(TEMPLATE_DIR, name), path.join(workDir, name), { recursive: true, force: true });
  }
  const linkPath = path.join(workDir, "node_modules");
  try { fs.rmSync(linkPath, { recursive: true, force: true }); } catch { /* fine if it didn't exist */ }
  fs.symlinkSync(path.join(TEMPLATE_DIR, "node_modules"), linkPath, "dir");
}

async function fetchDoc(botId) {
  return db.collection("botDeployments").doc(botId).get();
}

async function restoreSessionFiles(workDir, botId) {
  const snap = await fetchDoc(botId);
  const files = snap.exists ? snap.data().sessionFiles : null;
  if (!files) return;
  const sessionDir = path.join(workDir, SESSION_DIR_NAME);
  fs.mkdirSync(sessionDir, { recursive: true });
  for (const [name, base64] of Object.entries(files)) {
    try { fs.writeFileSync(path.join(sessionDir, name), Buffer.from(base64, "base64")); } catch { /* best-effort */ }
  }
}

async function backupSessionFiles(workDir, botId) {
  const sessionDir = path.join(workDir, SESSION_DIR_NAME);
  let names;
  try { names = fs.readdirSync(sessionDir); } catch { return; }
  const files = {};
  for (const name of names) {
    try {
      const full = path.join(sessionDir, name);
      if (fs.statSync(full).isFile()) files[name] = fs.readFileSync(full).toString("base64");
    } catch { /* skip unreadable file, don't fail the whole backup */ }
  }
  if (!Object.keys(files).length) return;
  await db.collection("botDeployments").doc(botId).update({ sessionFiles: files, updatedAt: Date.now() }).catch(() => {});
}

// The actual materialize → run pipeline. Used both for a fresh deploy and
// for restoring a bot that was running before a server restart.
async function runDeployment(botId, uid, phoneNumber, { isRestore = false } = {}) {
  const ref = db.collection("botDeployments").doc(botId);
  const workDir = path.join(BOTS_ROOT, botId);
  const entry = { proc: null, logs: [], stoppedByUser: false, backupTimer: null };
  running.set(botId, entry);

  fs.mkdirSync(workDir, { recursive: true });

  const setStatus = (status, extra = {}) => ref.update({ status, updatedAt: Date.now(), ...extra }).catch(() => {});

  if (!templateIsFresh()) pushLog(entry, "Preparing shared files (first deploy on this server — this one's slower, later ones won't be)…");
  await ensureTemplate(async (stage) => {
    pushLog(entry, stage === "downloading" ? "Downloading ES_TEAMS-V1…" : stage === "extracting" ? "Extracting…" : "Installing dependencies…");
    await setStatus(stage);
  });

  await setStatus("installing");
  pushLog(entry, "Preparing your instance…");
  materializeFromTemplate(workDir);

  if (isRestore) {
    await restoreSessionFiles(workDir, botId);
  }

  pushLog(entry, "Starting bot…");
  await setStatus("starting");

  const proc = spawn("node", ["index.js"], {
    cwd: workDir,
    env: { ...process.env, PHONE_NUMBER: phoneNumber },
  });
  entry.proc = proc;

  const onOutput = (buf) => {
    const clean = stripAnsi(buf.toString());
    clean.split(/\r?\n/).filter(Boolean).forEach((line) => {
      pushLog(entry, line);

      const codeMatch = line.match(/Pairing Code\s*:\s*([A-Za-z0-9-]{4,20})/i);
      if (codeMatch) {
        setStatus("pairing", { pairingCode: codeMatch[1], pairingCodeAt: Date.now() });
        return;
      }
      if (/^Connected to\s*:/i.test(line)) {
        setStatus("connected", { connectedAt: Date.now(), lastError: null });
        if (!entry.backupTimer) {
          entry.backupTimer = setInterval(() => backupSessionFiles(workDir, botId), SESSION_BACKUP_INTERVAL_MS);
        }
        return;
      }
      if (/Delete Session and Scan again/i.test(line)) {
        setStatus("needs_repair", { lastError: "Session invalid — restart to get a new pairing code." });
        return;
      }
      // The bot's own reconnect logic only covers connectionLost/Closed/
      // restartRequired/timedOut — for a manual "unlink this device" in
      // WhatsApp (loggedOut) or a session replaced elsewhere
      // (multideviceMismatch / connectionReplaced) it just logs and sits
      // idle without exiting, which was leaving the dashboard stuck
      // showing "Connected" forever. Catch those and reflect reality.
      if (/^Scan again/i.test(line) || /Close current Session first/i.test(line)) {
        setStatus("disconnected", { lastError: "Disconnected from WhatsApp — restart to get a new pairing code." });
        if (entry.proc) entry.proc.kill("SIGTERM");
        return;
      }
    });
  };
  proc.stdout.on("data", onOutput);
  proc.stderr.on("data", onOutput);

  proc.on("exit", (code) => {
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    backupSessionFiles(workDir, botId).finally(() => {
      running.delete(botId);
      if (entry.stoppedByUser) return; // stopBot() already set the final status
      ref.get().then((snap) => {
        if (snap.exists && ["needs_repair", "disconnected"].includes(snap.data().status)) return; // already handled above
        ref.update({ status: "crashed", lastError: `Process exited (code ${code}).`, updatedAt: Date.now() }).catch(() => {});
      }).catch(() => {});
    });
  });
}

// ── Management ──────────────────────────────────────────────────────────
async function listBotsForUser(uid) {
  const snap = await db.collection("botDeployments").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function getBotStatus(uid, botId) {
  const { data } = await getBotDoc(uid, botId);
  const entry = running.get(botId);
  return { ...data, id: botId, logs: entry ? entry.logs : [] };
}

async function _stopBotDoc(ref, data) {
  const entry = running.get(ref.id);
  if (entry) {
    entry.stoppedByUser = true;
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    if (entry.proc) entry.proc.kill("SIGTERM");
  }
  await ref.update({ status: "stopped", stoppedByUser: true, updatedAt: Date.now() });
  return { ok: true };
}

async function _restartBotDoc(ref, data) {
  if (running.has(ref.id)) await _stopBotDoc(ref, data);
  await ref.update({ status: "starting", stoppedByUser: false, lastError: null, pairingCode: null, updatedAt: Date.now() });
  runDeployment(ref.id, data.uid, data.phoneNumber, { isRestore: true }).catch((err) => {
    ref.update({ status: "crashed", lastError: err.message, updatedAt: Date.now() }).catch(() => {});
  });
  return { ok: true };
}

async function _deleteBotDoc(ref, data) {
  const entry = running.get(ref.id);
  if (entry) {
    entry.stoppedByUser = true;
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    if (entry.proc) entry.proc.kill("SIGTERM");
    running.delete(ref.id);
  }
  await ref.delete();
  fs.rm(path.join(BOTS_ROOT, ref.id), { recursive: true, force: true }, () => {});
  return { ok: true };
}

async function stopBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return _stopBotDoc(ref, data);
}

async function restartBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return _restartBotDoc(ref, data);
}

async function deleteBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return _deleteBotDoc(ref, data);
}

// ── Admin management — same actions, no ownership check ──────────────────
// Gating on isAdminEmail happens at the route level (server.js), same as
// every other admin-only endpoint in this app; these assume that's already
// been checked.
async function adminGetBotDoc(botId) {
  const ref = db.collection("botDeployments").doc(botId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Deployment not found.");
  return { ref, data: snap.data() };
}

async function adminStopBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return _stopBotDoc(ref, data);
}

async function adminRestartBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return _restartBotDoc(ref, data);
}

async function adminDeleteBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return _deleteBotDoc(ref, data);
}

// One row per user who has ever deployed a bot, with counts — powers the
// admin "Bot Deployments" section's user list.
async function adminListDeployingUsers() {
  const snap = await db.collection("botDeployments").get();
  const byUid = new Map();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (!byUid.has(data.uid)) byUid.set(data.uid, { uid: data.uid, count: 0, activeCount: 0 });
    const entry = byUid.get(data.uid);
    entry.count++;
    if (ACTIVE_STATUSES.includes(data.status)) entry.activeCount++;
  });
  return [...byUid.values()].sort((a, b) => b.activeCount - a.activeCount || b.count - a.count);
}

async function adminListBotsForUser(targetUid) {
  const snap = await db.collection("botDeployments").where("uid", "==", targetUid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
}

// Called once at server boot. Anything that was active before a restart
// gets its session restored from Firestore and respawned — this is what
// makes a redeploy/restart of the *main site* not kill everyone's bot.
export async function restoreBotsOnBoot() {
  try {
    const snap = await db.collection("botDeployments").where("status", "in", ACTIVE_STATUSES).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      await doc.ref.update({ status: "reconnecting", updatedAt: Date.now() }).catch(() => {});
      runDeployment(doc.id, data.uid, data.phoneNumber, { isRestore: true }).catch((err) => {
        doc.ref.update({ status: "crashed", lastError: err.message, updatedAt: Date.now() }).catch(() => {});
      });
    }
    if (snap.size) console.log(`🤖 Restoring ${snap.size} bot deployment(s) after restart…`);
  } catch (err) {
    console.error("Bot restore-on-boot failed:", err.message);
  }
}

export {
  deployBot, listBotsForUser, getBotStatus, stopBot, restartBot, deleteBot,
  countActiveBots, MAX_ACTIVE_BOTS, countBotsForUser, MAX_INSTANCES_PER_USER,
  adminStopBot, adminRestartBot, adminDeleteBot, adminListDeployingUsers, adminListBotsForUser,
};
