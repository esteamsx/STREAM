import crypto from "crypto";
import { db } from "../config/firebase.js";
import { parseDevice, DEVICE_COOKIE } from "./device-sessions.js";

export const BAN_MS = 72 * 60 * 60 * 1000;

const BANS = "deviceBans";
const BLACKLIST = "deviceBlacklist";
const BLACKLIST_REFRESH_MS = 30 * 1000;

function browserFamily(browser) {
  return String(browser || "").replace(/\s*\d.*$/, "").trim().toLowerCase();
}

export function fingerprintOf({ model, name, browser, ip }) {
  const m = String(model || name || "").toLowerCase().trim();
  const raw = m + "|" + browserFamily(browser) + "|" + String(ip || "").trim();
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function isSpecific({ model, type }) {
  return !!model && (type === "phone" || type === "tablet") && !/^(iPhone|iPad)$/i.test(model);
}

export function requestIdentity(req) {
  const dev = parseDevice(req);
  let deviceId = req.cookies?.[DEVICE_COOKIE];
  if (!/^[a-f0-9]{32}$/.test(String(deviceId || ""))) deviceId = "";
  return { dev, deviceId, fp: fingerprintOf(dev), specific: isSpecific(dev) };
}

/* ---------- per-account bans ---------- */

export function banState(ban, now = Date.now()) {
  return (ban.expiresAt || 0) > now ? "banned" : "face_required";
}

export async function findBansForLogin(uid, req) {
  const { deviceId, fp } = requestIdentity(req);
  const queries = [db.collection(BANS).where("uid", "==", uid).where("fp", "==", fp).get()];
  if (deviceId) queries.push(db.collection(BANS).where("uid", "==", uid).where("deviceId", "==", deviceId).get());
  const snaps = await Promise.all(queries);
  const seen = new Map();
  snaps.forEach((s) => s.docs.forEach((d) => seen.set(d.id, { id: d.id, ...d.data() })));
  return Array.from(seen.values());
}

export async function createUserBan(uid, rec, source) {
  const fp = fingerprintOf(rec);
  const id = uid + "_" + fp.slice(0, 16);
  const ref = db.collection(BANS).doc(id);
  const existing = await ref.get();
  const now = Date.now();
  const doc = {
    uid, fp,
    deviceId: rec.deviceId || "",
    name: rec.name || "", model: rec.model || "", type: rec.type || "",
    browser: rec.browser || "", os: rec.os || "", ip: rec.ip || "",
    createdAt: existing.exists ? existing.data().createdAt : now,
    updatedAt: now,
    expiresAt: now + BAN_MS,
    strikes: existing.exists ? existing.data().strikes || 0 : 0,
    source: source || "user",
  };
  await ref.set(doc);
  return { id, ...doc };
}

export async function markFaceMismatch(ban) {
  const now = Date.now();
  const patch = { expiresAt: now + BAN_MS, updatedAt: now, strikes: (ban.strikes || 0) + 1, lastMismatchAt: now };
  await db.collection(BANS).doc(ban.id).update(patch);
  return { ...ban, ...patch };
}

export async function listUserBans(uid) {
  const snap = await db.collection(BANS).where("uid", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function removeUserBan(uid, banId) {
  const ref = db.collection(BANS).doc(banId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) return false;
  await ref.delete();
  return true;
}

/* ---------- admin: list / blacklist ---------- */

export async function listAllBans() {
  const snap = await db.collection(BANS).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 150);
}

export async function listBlacklist() {
  const snap = await db.collection(BLACKLIST).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function blacklistFromBan(banId, adminUid) {
  const snap = await db.collection(BANS).doc(banId).get();
  if (!snap.exists) return null;
  const b = snap.data();
  const id = crypto.createHash("sha1").update((b.fp || "") + "|" + (b.deviceId || "")).digest("hex").slice(0, 24);
  const entry = {
    fp: b.fp, deviceId: b.deviceId || "",
    specific: isSpecific({ model: b.model, type: b.type }),
    name: b.name, model: b.model, browser: b.browser, ip: b.ip,
    uid: b.uid, banId, createdAt: Date.now(), createdBy: adminUid,
  };
  await db.collection(BLACKLIST).doc(id).set(entry);
  await refreshBlacklist();
  return { id, ...entry };
}

export async function removeBlacklist(id) {
  await db.collection(BLACKLIST).doc(String(id)).delete();
  await refreshBlacklist();
}

/* ---------- site-wide blacklist (in-memory, refreshed) ---------- */

let blDeviceIds = new Set();
let blFps = new Set();

export async function refreshBlacklist() {
  try {
    const list = await listBlacklist();
    blDeviceIds = new Set(list.filter((e) => e.deviceId).map((e) => e.deviceId));
    blFps = new Set(list.filter((e) => e.specific && e.fp).map((e) => e.fp));
  } catch (err) {
    console.error("[device-blacklist] refresh failed:", err.message);
  }
}
refreshBlacklist();
setInterval(refreshBlacklist, BLACKLIST_REFRESH_MS).unref();

export function isBlacklistedRequest(req) {
  if (!blDeviceIds.size && !blFps.size) return false;
  const { deviceId, fp } = requestIdentity(req);
  if (deviceId && blDeviceIds.has(deviceId)) return true;
  return blFps.has(fp);
}

const SUPPORT_EMAIL = "esteamstech@gmail.com";

function blockedHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
<style>
  *{box-sizing:border-box}
  body{
    background:#0A0A0F;color:#F3F3FA;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;padding:24px;text-align:center;
    background-image:
      radial-gradient(900px 500px at 15% -10%,rgba(255,59,92,.09),transparent 60%),
      radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.06),transparent 55%);
  }
  .box{max-width:380px;display:flex;flex-direction:column;align-items:center}
  .ring{
    position:relative;width:30px;height:30px;border-radius:50%;flex-shrink:0;margin:22px 0 46px;
    background:url(/favicon.svg) center/cover no-repeat;
    box-shadow:0 0 14px #00E0FF;
  }
  .ring::before,.ring::after{
    content:"";position:absolute;border-radius:50%;box-sizing:border-box;
    border:2.5px solid transparent;
  }
  .ring::before{
    inset:-22px;border-top-color:#00E0FF;border-right-color:#00E0FF;
    animation:spin 1.1s linear infinite;
  }
  .ring::after{
    inset:-10px;border-width:2px;border-bottom-color:#00E0FF;border-left-color:#00E0FF;opacity:.75;
    animation:ssRev .85s linear infinite;
  }
  @keyframes ssRev{to{transform:rotate(-360deg)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:0 0 10px;font-weight:700}
  p{color:rgba(255,255,255,.55);font-size:.85rem;line-height:1.6;margin:0}
  a{color:#00E0FF;font-weight:700;text-decoration:underline}
  .brand{
    margin-top:28px;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:.85rem;
    background:linear-gradient(90deg,#00E0FF,#7c5cff);-webkit-background-clip:text;background-clip:text;color:transparent;
  }
</style>
</head>
<body>
  <div class="box">
    <div class="ring"></div>
    <h1>Device has been blacklisted</h1>
    <p>If you think it's an error, contact <a href="mailto:${SUPPORT_EMAIL}">support</a>.</p>
    <div class="brand">ES TEAMS TV</div>
  </div>
</body>
</html>`;
}

export function blacklistMiddleware(req, res, next) {
  if (req.path === "/favicon.svg" || req.path === "/health") return next();
  if (!isBlacklistedRequest(req)) return next();
  const wantsHtml = !req.path.startsWith("/api/") && String(req.headers.accept || "").includes("text/html");
  if (wantsHtml) {
    res.status(403).set("Cache-Control", "no-store").type("html").send(blockedHtml());
    return;
  }
  res.status(403).json({ error: "Device has been blacklisted. If you think it's an error, contact support.", code: "device/blacklisted" });
}
