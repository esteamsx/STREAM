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

const REPO_TARBALL_URL = "https://github.com/paskito002/ES_TEAMS-V1/archive/refs/heads/main.tar.gz";
const BOTS_ROOT = path.join(process.cwd(), ".bot-deployments");
const SESSION_DIR_NAME = "ES_TEAMS-SESSION";
const MAX_ACTIVE_BOTS = 100;
const ACTIVE_STATUSES = ["starting", "installing", "pairing", "connected", "reconnecting"];
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

// ── Deploy ────────────────────────────────────────────────────────────
async function deployBot(uid, { label, phoneNumber }) {
  const cleanLabel = (label || "My Bot").toString().trim().slice(0, 60) || "My Bot";
  const cleanNumber = isValidPhoneNumber(phoneNumber);
  if (!cleanNumber) throw new Error("Enter a valid phone number, digits only (with country code, no + or spaces).");

  const activeCount = await countActiveBots();
  if (activeCount >= MAX_ACTIVE_BOTS) {
    throw new Error(`Deployment limit reached (${MAX_ACTIVE_BOTS}/${MAX_ACTIVE_BOTS} active). Try again once a slot frees up.`);
  }

  const ref = db.collection("botDeployments").doc();
  const now = Date.now();
  await ref.set({
    uid, label: cleanLabel, phoneNumber: cleanNumber,
    status: "starting", pairingCode: null, pairingCodeAt: null, connectedAt: null,
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

// The actual clone → install → run pipeline. Used both for a fresh deploy
// and for restoring a bot that was running before a server restart.
async function runDeployment(botId, uid, phoneNumber, { isRestore = false } = {}) {
  const ref = db.collection("botDeployments").doc(botId);
  const workDir = path.join(BOTS_ROOT, botId);
  const entry = { proc: null, logs: [], stoppedByUser: false, backupTimer: null };
  running.set(botId, entry);

  fs.mkdirSync(workDir, { recursive: true });

  if (isRestore) {
    await restoreSessionFiles(workDir, botId);
  }

  await ref.update({ status: "installing", updatedAt: Date.now() });
  pushLog(entry, "Downloading ES_TEAMS-V1…");
  const tarPath = path.join(workDir, "_src.tar.gz");
  await downloadTarball(tarPath);
  pushLog(entry, "Extracting…");
  await run(`tar -xzf "${tarPath}" -C "${workDir}" --strip-components=1`, { cwd: workDir });
  fs.unlinkSync(tarPath);

  pushLog(entry, "Installing dependencies (this can take a minute)…");
  await run("npm install --omit=dev --no-audit --no-fund", { cwd: workDir });
  pushLog(entry, "Starting bot…");

  await ref.update({ status: "starting", updatedAt: Date.now() });

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
        ref.update({ status: "pairing", pairingCode: codeMatch[1], pairingCodeAt: Date.now(), updatedAt: Date.now() }).catch(() => {});
        return;
      }
      if (/^Connected to\s*:/i.test(line)) {
        ref.update({ status: "connected", connectedAt: Date.now(), lastError: null, updatedAt: Date.now() }).catch(() => {});
        if (!entry.backupTimer) {
          entry.backupTimer = setInterval(() => backupSessionFiles(workDir, botId), SESSION_BACKUP_INTERVAL_MS);
        }
        return;
      }
      if (/Delete Session and Scan again/i.test(line)) {
        ref.update({ status: "needs_repair", lastError: "Session invalid — redeploy to get a new pairing code.", updatedAt: Date.now() }).catch(() => {});
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
        if (snap.exists && snap.data().status === "needs_repair") return; // already handled above
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

async function stopBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  const entry = running.get(botId);
  if (entry) {
    entry.stoppedByUser = true;
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    if (entry.proc) entry.proc.kill("SIGTERM");
  }
  await ref.update({ status: "stopped", stoppedByUser: true, updatedAt: Date.now() });
  return { ok: true };
}

async function restartBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  if (running.has(botId)) await stopBot(uid, botId);
  await ref.update({ status: "starting", stoppedByUser: false, lastError: null, pairingCode: null, updatedAt: Date.now() });
  runDeployment(botId, uid, data.phoneNumber, { isRestore: true }).catch((err) => {
    ref.update({ status: "crashed", lastError: err.message, updatedAt: Date.now() }).catch(() => {});
  });
  return { ok: true };
}

async function deleteBot(uid, botId) {
  const { ref } = await getBotDoc(uid, botId);
  const entry = running.get(botId);
  if (entry) {
    entry.stoppedByUser = true;
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    if (entry.proc) entry.proc.kill("SIGTERM");
    running.delete(botId);
  }
  await ref.delete();
  fs.rm(path.join(BOTS_ROOT, botId), { recursive: true, force: true }, () => {});
  return { ok: true };
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

export { deployBot, listBotsForUser, getBotStatus, stopBot, restartBot, deleteBot, countActiveBots, MAX_ACTIVE_BOTS };
