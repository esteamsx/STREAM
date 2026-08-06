import fs from "fs";
import path from "path";
import https from "https";
import { spawn, exec } from "child_process";
import { db } from "./bot-firebase.js";
import admin from "firebase-admin";

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const REPO_TARBALL_URL = "https://github.com/paskito002/ES_TEAMS-V1/archive/refs/heads/main.tar.gz";
const REPO_LATEST_COMMIT_API = "https://api.github.com/repos/paskito002/ES_TEAMS-V1/commits/main";
const BOTS_ROOT = path.join(process.cwd(), ".bot-deployments");
const TEMPLATE_DIR = path.join(BOTS_ROOT, "_template");
const TEMPLATE_MARKER = path.join(TEMPLATE_DIR, ".built-meta.json");
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const SESSION_DIR_NAME = "ES_TEAMS-SESSION";
const MAX_ACTIVE_BOTS = 3;
const MAX_INSTANCES_PER_USER = 1;
const ACTIVE_STATUSES = ["downloading", "extracting", "installing", "starting", "pairing", "connected", "reconnecting"];
const LOG_LINES_KEPT = 300;
const SESSION_BACKUP_INTERVAL_MS = 3 * 60 * 1000;

const running = new Map();

const crashRestartCounts = new Map();
const MAX_AUTO_RESTARTS = 5;
const AUTO_RESTART_DELAY_MS = 5000;

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function pushLog(entry, line, type = "out") {
  const trimmed = line.length > 2000 ? line.slice(0, 2000) + "…" : line;
  entry.logs.push({ t: type, l: trimmed });
  if (entry.logs.length > LOG_LINES_KEPT) entry.logs.splice(0, entry.logs.length - LOG_LINES_KEPT);
}

function isValidPhoneNumber(raw) {
  const digits = (raw || "").toString().replace(/[^0-9]/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

async function countActiveBots() {
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

async function deployBot(uid, { label, phoneNumber }, isAdmin = false) {
  const cleanLabel = (label || "My Bot").toString().trim().slice(0, 60) || "My Bot";
  const cleanNumber = isValidPhoneNumber(phoneNumber);
  if (!cleanNumber) throw new Error("Enter a valid phone number, digits only (with country code, no + or spaces).");

  const ref = db.collection("botDeployments").doc();
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    if (!isAdmin) {
      const mineSnap = await tx.get(db.collection("botDeployments").where("uid", "==", uid));
      if (mineSnap.size >= MAX_INSTANCES_PER_USER) {
        throw new Error(`You can only deploy ${MAX_INSTANCES_PER_USER} instances.`);
      }
    }
    const activeSnap = await tx.get(db.collection("botDeployments").where("status", "in", ACTIVE_STATUSES));
    if (activeSnap.size >= MAX_ACTIVE_BOTS) {
      throw new Error(`Deployment limit reached (${MAX_ACTIVE_BOTS}/${MAX_ACTIVE_BOTS}). Try again once a slot frees up.`);
    }
    tx.set(ref, {
      uid, label: cleanLabel, phoneNumber: cleanNumber,
      status: "downloading", pairingCode: null, pairingCodeAt: null, connectedAt: null,
      lastError: null, stoppedByUser: false, createdAt: now, updatedAt: now,
    });
  });

  runDeployment(ref.id, uid, cleanNumber).catch((err) => {
    ref.update({ status: "crashed", lastError: err.message, updatedAt: Date.now() }).catch(() => {});
  });

  return { id: ref.id };
}

function githubHeaders(extra = {}) {
  const headers = { "User-Agent": "es-teams-tv-deploy", ...extra };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function downloadTarball(destFile) {
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destFile);
    https.get(REPO_TARBALL_URL, { headers: githubHeaders() }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, { headers: githubHeaders() }, (res2) => {
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

async function fetchLatestCommitSha() {
  return new Promise((resolve, reject) => {
    https.get(REPO_LATEST_COMMIT_API, { headers: githubHeaders({ Accept: "application/vnd.github+json" }) }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode !== 200) { reject(new Error(`GitHub API HTTP ${res.statusCode}: ${body.slice(0, 200)}`)); return; }
        try { resolve(JSON.parse(body).sha || null); } catch (err) { reject(err); }
      });
    }).on("error", reject);
  });
}

function readTemplateMeta() {
  try {
    const parsed = JSON.parse(fs.readFileSync(TEMPLATE_MARKER, "utf8"));
    return parsed && typeof parsed.builtAt === "number" ? parsed : null;
  } catch {
    return null;
  }
}

function templateExists() {
  return !!readTemplateMeta();
}

let templateReadyPromise = null;

let templateReaders = 0;
let templateDrainWaiters = [];

function acquireTemplateRead() {
  templateReaders++;
}
function releaseTemplateRead() {
  templateReaders--;
  if (templateReaders === 0 && templateDrainWaiters.length) {
    const waiters = templateDrainWaiters;
    templateDrainWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}
function waitForTemplateReadersToDrain() {
  if (templateReaders === 0) return Promise.resolve();
  return new Promise((resolve) => templateDrainWaiters.push(resolve));
}

async function buildTemplate(onStage) {
  if (!templateReadyPromise) {
    templateReadyPromise = (async () => {
      await waitForTemplateReadersToDrain();
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
      let sha = null;
      try { sha = await fetchLatestCommitSha(); } catch {  }
      fs.writeFileSync(TEMPLATE_MARKER, JSON.stringify({ builtAt: Date.now(), sha }));
    })();
    templateReadyPromise.finally(() => { templateReadyPromise = null; });
  }
  await templateReadyPromise;
}

async function ensureTemplate(onStage) {
  if (templateExists()) return;
  await buildTemplate(onStage);
}

async function checkForUpdates() {
  try {
    if (!templateExists()) return { checked: false, reason: "No template built yet, deploy a bot first." };
    if (templateReadyPromise) return { checked: false, reason: "A build is already in progress." };
    const meta = readTemplateMeta();
    const latestSha = await fetchLatestCommitSha();
    if (!latestSha) return { checked: false, reason: "GitHub didn't return a usable commit SHA." };
    if (meta.sha === latestSha) return { checked: true, updated: false, currentSha: meta.sha, latestSha };

    console.log(`🤖 New commit on ES_TEAMS-V1 (${latestSha.slice(0, 7)}), updating the shared template...`);
    await buildTemplate();

    const snap = await db.collection("botDeployments").where("status", "in", ACTIVE_STATUSES).get();
    for (const doc of snap.docs) {
      withBotLock(doc.id, () => _restartBotDoc(doc.ref, doc.data(), { skipTemplateCheck: true }))
        .catch((err) => console.error(`Auto-update restart failed for ${doc.id}:`, err.message));
    }
    if (snap.size) console.log(`🤖 Restarted ${snap.size} bot(s) to apply the update.`);
    return { checked: true, updated: true, previousSha: meta.sha, currentSha: latestSha, restarted: snap.size };
  } catch (err) {
    console.error("Bot update check failed:", err.message);
    return { checked: false, reason: err.message };
  }
}

async function getTemplateStatus() {
  const meta = readTemplateMeta();
  let latestSha = null, latestShaError = null;
  try { latestSha = await fetchLatestCommitSha(); } catch (err) { latestShaError = err.message; }
  return {
    exists: !!meta,
    builtAt: meta?.builtAt || null,
    currentSha: meta?.sha || null,
    latestSha,
    latestShaError,
    upToDate: !!meta && !!latestSha && meta.sha === latestSha,
  };
}

async function ensureLatestTemplate() {
  if (!templateExists()) { await buildTemplate(); return; }
  if (templateReadyPromise) { await templateReadyPromise; return; }
  try {
    const meta = readTemplateMeta();
    const latestSha = await fetchLatestCommitSha();
    if (latestSha && meta.sha !== latestSha) {
      console.log(`🤖 Restart triggered a refetch, new commit found (${latestSha.slice(0, 7)}).`);
      await buildTemplate();
    }
  } catch (err) {
    console.error("Could not check for the latest commit before restarting, using the existing template:", err.message);
  }
}

export function startBotUpdateChecker() {
  checkForUpdates().catch((err) => console.error("Initial bot update check failed:", err.message));
  setInterval(() => {
    checkForUpdates().catch((err) => console.error("Bot update check failed:", err.message));
  }, UPDATE_CHECK_INTERVAL_MS);
}

function materializeFromTemplate(workDir) {
  const entries = fs.readdirSync(TEMPLATE_DIR);
  for (const name of entries) {
    if (name === "node_modules" || name === ".built-at") continue;
    fs.cpSync(path.join(TEMPLATE_DIR, name), path.join(workDir, name), { recursive: true, force: true });
  }
  const linkPath = path.join(workDir, "node_modules");
  try { fs.rmSync(linkPath, { recursive: true, force: true }); } catch {  }
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
    try { fs.writeFileSync(path.join(sessionDir, name), Buffer.from(base64, "base64")); } catch {  }
  }
}

async function backupSessionFiles(workDir, botId, entry) {
  const sessionDir = path.join(workDir, SESSION_DIR_NAME);
  let names;
  try { names = fs.readdirSync(sessionDir); } catch { return; }

  const stats = [];
  for (const name of names) {
    try {
      const full = path.join(sessionDir, name);
      const st = fs.statSync(full);
      if (st.isFile()) stats.push(`${name}:${st.size}:${st.mtimeMs}`);
    } catch {  }
  }
  if (!stats.length) return;

  const signature = stats.sort().join("|");
  if (entry && entry.lastBackupSignature === signature) return;

  const files = {};
  for (const name of names) {
    try {
      const full = path.join(sessionDir, name);
      if (fs.statSync(full).isFile()) files[name] = fs.readFileSync(full).toString("base64");
    } catch {  }
  }
  if (!Object.keys(files).length) return;
  await db.collection("botDeployments").doc(botId).update({ sessionFiles: files, updatedAt: Date.now() }).catch(() => {});
  if (entry) entry.lastBackupSignature = signature;
}

async function runDeployment(botId, uid, phoneNumber, { isRestore = false } = {}) {
  const ref = db.collection("botDeployments").doc(botId);
  const workDir = path.join(BOTS_ROOT, botId);
  const entry = { proc: null, logs: [], stoppedByUser: false, backupTimer: null };
  entry.exited = new Promise((resolve) => { entry._resolveExited = resolve; });
  running.set(botId, entry);

  fs.mkdirSync(workDir, { recursive: true });

  const setStatus = (status, extra = {}) =>
    ref.update({ status, updatedAt: Date.now(), logs: entry.logs.slice(-150), ...extra }).catch(() => {});

  if (!templateExists()) pushLog(entry, "Preparing shared files (first deploy on this server, this one's slower, later ones won't be)...");
  await ensureTemplate(async (stage) => {
    pushLog(entry, stage === "downloading" ? "Downloading ES_TEAMS-V1…" : stage === "extracting" ? "Extracting…" : "Installing dependencies…");
    await setStatus(stage);
  });

  await setStatus("installing");
  pushLog(entry, "Preparing your instance…");
  acquireTemplateRead();
  try {
    materializeFromTemplate(workDir);
  } finally {
    releaseTemplateRead();
  }

  if (isRestore) {
    await restoreSessionFiles(workDir, botId);
  }

  pushLog(entry, "Starting bot…");
  await setStatus("starting");

  const childEnv = { ...process.env, PHONE_NUMBER: phoneNumber };
  if (!childEnv.SELF_URL) childEnv.SELF_URL = `${PUBLIC_BASE}/health`;
  delete childEnv.PORT;

  const proc = spawn("node", ["index.js"], {
    cwd: workDir,
    env: childEnv,
  });
  entry.proc = proc;

  const onOutput = (buf, type) => {
    const clean = stripAnsi(buf.toString());
    clean.split(/\r?\n/).filter(Boolean).forEach((line) => {
      pushLog(entry, line, type);

      const codeMatch = line.match(/Pairing Code\s*:\s*([A-Za-z0-9-]{4,20})/i);
      if (codeMatch) {
        setStatus("pairing", { pairingCode: codeMatch[1], pairingCodeAt: Date.now() });
        return;
      }
      if (/^Connected to\s*:/i.test(line)) {
        setStatus("connected", { connectedAt: Date.now(), lastError: null });
        crashRestartCounts.delete(botId);
        if (!entry.backupTimer) {
          backupSessionFiles(workDir, botId, entry);
          entry.backupTimer = setInterval(() => backupSessionFiles(workDir, botId, entry), SESSION_BACKUP_INTERVAL_MS);
        }
        return;
      }
      if (/Delete Session and Scan again/i.test(line)) {
        setStatus("needs_repair", { lastError: "Session invalid, restart to get a new pairing code." });
        return;
      }
      if (/Bad MAC|Failed to decrypt message with any known session/i.test(line)) {
        entry.badMacCount = (entry.badMacCount || 0) + 1;
        if (entry.badMacCount >= 3) {
          setStatus("needs_repair", { lastError: "Session out of sync with WhatsApp (messages failing to decrypt), restart to get a new pairing code." });
        }
        return;
      }
      if (/^Scan again/i.test(line) || /Close current Session first/i.test(line)) {
        entry.disconnectSignalCount = (entry.disconnectSignalCount || 0) + 1;
        if (entry.disconnectSignalCount >= 2) {
          setStatus("disconnected", { lastError: "Disconnected from WhatsApp, restart to get a new pairing code." });
          if (entry.proc) entry.proc.kill("SIGTERM");
        }
        return;
      }
      if (/ECONNREFUSED 127\.0\.0\.1/.test(line)) {
        entry.localConnRefusedCount = (entry.localConnRefusedCount || 0) + 1;
        if (entry.localConnRefusedCount >= 5) {
          pushLog(entry, "Bot is stuck on repeated local connection failures, restarting the process to recover…");
          if (entry.proc) entry.proc.kill("SIGTERM");
        }
        return;
      }
      if (/PING FAILED/i.test(line)) {
        entry.pingFailCount = (entry.pingFailCount || 0) + 1;
        if (entry.pingFailCount >= 5) {
          pushLog(entry, "Bot's internal ping check keeps failing, restarting the process to recover…");
          if (entry.proc) entry.proc.kill("SIGTERM");
        }
        return;
      }
    });
  };
  proc.stdout.on("data", (buf) => onOutput(buf, "out"));
  proc.stderr.on("data", (buf) => onOutput(buf, "err"));

  proc.on("error", (err) => {
    pushLog(entry, `Failed to start: ${err.message}`, "err");
    setStatus("error", { lastError: err.message });
    if (running.get(botId) === entry) running.delete(botId);
    entry._resolveExited?.();
  });

  proc.on("exit", (code) => {
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    backupSessionFiles(workDir, botId).finally(() => {
      if (running.get(botId) === entry) running.delete(botId);
      entry._resolveExited?.();
      if (entry.stoppedByUser) return;
      ref.get().then((snap) => {
        if (!snap.exists) return;
        const status = snap.data().status;
        if (["needs_repair", "disconnected"].includes(status)) return;
        ref.update({ status: "crashed", lastError: `Process exited (code ${code}).`, logs: entry.logs.slice(-150), updatedAt: Date.now() }).catch(() => {});

        const attempts = (crashRestartCounts.get(botId) || 0) + 1;
        crashRestartCounts.set(botId, attempts);
        if (attempts > MAX_AUTO_RESTARTS) {
          ref.update({ lastError: `Crashed ${attempts} times in a row, stopped auto-restarting. Restart manually once it's fixed.` }).catch(() => {});
          return;
        }
        setTimeout(() => {
          db.collection("botDeployments").doc(botId).get().then((freshSnap) => {
            if (!freshSnap.exists) return;
            const d = freshSnap.data();
            if (running.has(botId)) return;
            runDeployment(botId, d.uid, d.phoneNumber, { isRestore: true }).catch(() => {});
          }).catch(() => {});
        }, AUTO_RESTART_DELAY_MS);
      }).catch(() => {});
    });
  });
}

async function listBotsForUser(uid) {
  const snap = await db.collection("botDeployments").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function getBotStatus(uid, botId) {
  const { data } = await getBotDoc(uid, botId);
  const entry = running.get(botId);
  return { ...data, id: botId, logs: entry ? entry.logs : (data.logs || []) };
}

async function _stopBotDoc(ref, data) {
  const entry = running.get(ref.id);
  if (entry) {
    entry.stoppedByUser = true;
    if (entry.backupTimer) clearInterval(entry.backupTimer);
    if (entry.proc && entry.proc.exitCode === null && entry.proc.signalCode === null) {
      entry.proc.kill("SIGTERM");
      const killTimer = setTimeout(() => {
        try { entry.proc.kill("SIGKILL"); } catch {  }
      }, 8000);
      await Promise.race([
        entry.exited,
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
      clearTimeout(killTimer);
    } else {
      entry._resolveExited?.();
    }
  }
  const update = { status: "stopped", stoppedByUser: true, updatedAt: Date.now() };
  if (entry) update.logs = entry.logs.slice(-150);
  await ref.update(update);
  return { ok: true };
}

async function _restartBotDoc(ref, data, { skipTemplateCheck = false } = {}) {
  if (running.has(ref.id)) await _stopBotDoc(ref, data);
  crashRestartCounts.delete(ref.id);

  if (!skipTemplateCheck) await ensureLatestTemplate();
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
  crashRestartCounts.delete(ref.id);
  await ref.delete();
  fs.rm(path.join(BOTS_ROOT, ref.id), { recursive: true, force: true }, () => {});
  return { ok: true };
}

const botLocks = new Map();

function withBotLock(botId, fn) {
  const prev = botLocks.get(botId) || Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.then(() => {}, () => {});
  botLocks.set(botId, tail);
  tail.finally(() => {
    if (botLocks.get(botId) === tail) botLocks.delete(botId);
  });
  return run;
}

async function stopBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return withBotLock(botId, () => _stopBotDoc(ref, data));
}

async function restartBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return withBotLock(botId, () => _restartBotDoc(ref, data));
}

async function deleteBot(uid, botId) {
  const { ref, data } = await getBotDoc(uid, botId);
  return withBotLock(botId, () => _deleteBotDoc(ref, data));
}

async function adminGetBotDoc(botId) {
  const ref = db.collection("botDeployments").doc(botId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Deployment not found.");
  return { ref, data: snap.data() };
}

async function adminStopBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return withBotLock(botId, () => _stopBotDoc(ref, data));
}

async function adminRestartBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return withBotLock(botId, () => _restartBotDoc(ref, data));
}

async function adminDeleteBot(botId) {
  const { ref, data } = await adminGetBotDoc(botId);
  return withBotLock(botId, () => _deleteBotDoc(ref, data));
}

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
    if (snap.size) console.log(`🤖 Reconnecting ${snap.size} bot deployment(s) after server restart, using their saved sessions…`);
  } catch (err) {
    console.error("Bot restore-on-boot failed:", err.message);
  }
}

export {
  deployBot, listBotsForUser, getBotStatus, stopBot, restartBot, deleteBot,
  countActiveBots, MAX_ACTIVE_BOTS, countBotsForUser, MAX_INSTANCES_PER_USER,
  adminStopBot, adminRestartBot, adminDeleteBot, adminListDeployingUsers, adminListBotsForUser,
  checkForUpdates, getTemplateStatus,
};
