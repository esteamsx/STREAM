import { db } from "../config/firebase.js";
import { appendCoinLedger } from "./coin-ledger.js";
import { requestIdentity, fingerprintOf } from "./device-bans.js";


const SCAN_EVERY_MS = 24 * 60 * 60 * 1000;
const SCAN_BATCH = 400;
const AUTO_RESTRICT_AT_STRIKES = 2;
const BAN_CHOICES_HOURS = [1, 24, 168, 720];
const ALERTS = "fakeCoinAlerts";
const BLOCKS = "coinDeviceBlocks";

let hooks = { addNotification: async () => {}, getAdminUid: async () => null, invalidateUserProfileCache: () => {}, isAdminEmail: () => false };
let scanRunning = false;

export function initFakeCoins(h) {
  hooks = { ...hooks, ...h };
}

/* ---------- device blocks (so a banned device cannot just use another account) ---------- */

let blockCache = { at: 0, list: [] };
const BLOCK_CACHE_MS = 60 * 1000;

async function activeBlocks() {
  const now = Date.now();
  if (now - blockCache.at < BLOCK_CACHE_MS) return blockCache.list;
  try {
    const snap = await db.collection(BLOCKS).where("until", ">", now).limit(500).get();
    blockCache = { at: now, list: snap.docs.map((d) => d.data()) };
  } catch {
    blockCache = { at: now, list: blockCache.list };
  }
  return blockCache.list;
}

export async function coinDeviceGuard(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD") return next();
  try {
    const blocks = await activeBlocks();
    if (!blocks.length) return next();
    const { deviceId, fp } = requestIdentity(req);
    const hit = blocks.find((b) => (b.deviceId && b.deviceId === deviceId) || (b.fp && b.fp === fp));
    if (hit) {
      return res.status(400).json({ error: "Coins are restricted on this device while it is being reviewed. Contact support.", code: "coins/device-restricted" });
    }
  } catch { /* never block coin routes because of a lookup problem */ }
  next();
}

/* ---------- the daily check ---------- */

async function removeFakeCoins(uid) {
  const ref = db.collection("users").doc(uid);
  let result = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const data = snap.data();
    if (!data.coinLedgerTip) return;
    const balance = data.coinBalance || 0;
    const tip = data.coinLedgerTipBalance || 0;
    if (balance <= tip) return;
    const fake = balance - tip;
    const strikes = (data.fakeCoinStrikes || 0) + 1;
    const ledger = appendCoinLedger(tx, ref, { ...data, coinBalance: tip }, 0, "fake_coins_removed", { removed: fake, claimedBalance: balance, strike: strikes });
    const restrict = strikes >= AUTO_RESTRICT_AT_STRIKES;
    const patch = {
      coinBalance: tip,
      fakeCoinStrikes: strikes,
      lastFakeCoinAt: Date.now(),
      ...ledger,
    };
    if (restrict) { patch.coinRestricted = true; patch.coinRestrictedReason = "fake_coins"; patch.coinRestrictedAt = Date.now(); }
    tx.update(ref, patch);
    result = { uid, username: data.username || "", email: data.email || "", balanceBefore: balance, removed: fake, balanceAfter: tip, strikes, restricted: restrict };
  });
  if (result) hooks.invalidateUserProfileCache(uid);
  return result;
}

export async function runFakeCoinScan() {
  if (scanRunning) return { skipped: true };
  scanRunning = true;
  const found = [];
  let scanned = 0;
  try {
    let last = null;
    for (;;) {
      let q = db.collection("users").where("coinBalance", ">", 0).orderBy("coinBalance", "desc").limit(SCAN_BATCH)
        .select("coinBalance", "coinLedgerTip", "coinLedgerTipBalance", "email");
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      if (snap.empty) break;
      scanned += snap.size;
      for (const d of snap.docs) {
        const x = d.data();
        if (!x.coinLedgerTip) continue;                              // older accounts without a ledger yet cannot be checked
        if ((x.coinBalance || 0) <= (x.coinLedgerTipBalance || 0)) continue;
        if (hooks.isAdminEmail(x.email)) continue;
        const r = await removeFakeCoins(d.id).catch((e) => { console.error("[fake-coins] remove failed", d.id, e && e.message); return null; });
        if (r) found.push(r);
      }
      last = snap.docs[snap.docs.length - 1];
      if (snap.size < SCAN_BATCH) break;
    }
    const now = Date.now();
    const alertIds = [];
    for (const r of found) {
      const ref = await db.collection(ALERTS).add({ ...r, detectedAt: now, status: r.restricted ? "restricted" : "removed", banUntil: 0, reviewed: false });
      alertIds.push(ref.id);
    }
    await db.collection("settings").doc("fakeCoinScan").set({ lastRunAt: now, lastScanned: scanned, lastFound: found.length }, { merge: true });
    if (found.length) {
      const adminUid = await hooks.getAdminUid();
      if (adminUid) {
        const total = found.reduce((a, r) => a + r.removed, 0);
        await hooks.addNotification(adminUid, "fake_coins", "Fake Coins Detected",
          { accounts: found.length, coins: total, alertIds: alertIds.slice(0, 20), restricted: found.filter((r) => r.restricted).length });
      }
      for (const r of found.filter((x) => x.restricted)) {
        const adminUid = await hooks.getAdminUid();
        if (adminUid) await hooks.addNotification(adminUid, "fake_coins", `@${r.username || "A user"} was restricted automatically after repeated fake coins`, { accounts: 1, coins: r.removed, restricted: 1 });
      }
    }
    console.log(`[fake-coins] scanned ${scanned} accounts, found ${found.length}`);
    return { scanned, found: found.length };
  } finally {
    scanRunning = false;
  }
}

export function startFakeCoinSchedule() {
  const run = () => runFakeCoinScan().catch((e) => console.error("[fake-coins] scan failed:", e && e.message));
  setTimeout(async () => {
    let wait = 0;
    try {
      const snap = await db.collection("settings").doc("fakeCoinScan").get();
      const lastRunAt = snap.exists ? snap.data().lastRunAt || 0 : 0;
      wait = Math.max(0, lastRunAt + SCAN_EVERY_MS - Date.now());
    } catch { wait = 0; }
    setTimeout(() => { run(); setInterval(run, SCAN_EVERY_MS).unref(); }, wait).unref();
  }, 90 * 1000).unref();
}

/* ---------- admin actions ---------- */

export async function listFakeCoinAlerts() {
  const [alerts, restricted] = await Promise.all([
    db.collection(ALERTS).orderBy("detectedAt", "desc").limit(100).get(),
    db.collection("users").where("coinRestricted", "==", true).limit(100).select("username", "coinBalance", "fakeCoinStrikes").get(),
  ]);
  const now = Date.now();
  return {
    alerts: alerts.docs.map((d) => ({ id: d.id, ...d.data(), banActive: (d.data().banUntil || 0) > now })),
    restricted: restricted.docs.map((d) => ({ uid: d.id, username: d.data().username || "", coinBalance: d.data().coinBalance || 0, strikes: d.data().fakeCoinStrikes || 0 })),
  };
}

export async function banFakeCoinUser(alertId, hours) {
  const h = Number(hours);
  if (!BAN_CHOICES_HOURS.includes(h)) throw Object.assign(new Error("Pick 1 hour, 1 day, 7 days or 30 days."), { status: 400 });
  const aRef = db.collection(ALERTS).doc(String(alertId || ""));
  const aSnap = await aRef.get();
  if (!aSnap.exists) throw Object.assign(new Error("That alert was not found."), { status: 404 });
  const alert = aSnap.data();
  const until = Date.now() + h * 3600 * 1000;
  await db.collection("users").doc(alert.uid).update({ coinRestrictedUntil: until, coinRestrictedReason: "fake_coins", coinRestrictedAt: Date.now() });
  hooks.invalidateUserProfileCache(alert.uid);
  let blocked = 0;
  try {
    const sess = await db.collection("deviceSessions").where("uid", "==", alert.uid).limit(40).get();
    const seen = new Set();
    for (const d of sess.docs) {
      const r = d.data();
      const deviceId = /^[a-f0-9]{32}$/.test(String(r.deviceId || "")) ? r.deviceId : "";
      const fp = fingerprintOf(r);
      const key = deviceId || fp;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      await db.collection(BLOCKS).doc((alert.uid + "_" + key).slice(0, 120)).set({ uid: alert.uid, deviceId, fp, until, createdAt: Date.now() });
      blocked++;
    }
  } catch (e) { console.error("[fake-coins] device block failed", e && e.message); }
  blockCache = { at: 0, list: [] };
  await aRef.update({ banUntil: until, banHours: h, status: "banned", reviewed: true, devicesBlocked: blocked });
  return { until, devicesBlocked: blocked };
}

export async function dismissFakeCoinAlert(alertId) {
  await db.collection(ALERTS).doc(String(alertId || "")).update({ reviewed: true, status: "dismissed" });
}

export async function liftCoinRestriction(uid) {
  const ref = db.collection("users").doc(String(uid || ""));
  await ref.update({ coinRestricted: false, coinRestrictedUntil: 0, fakeCoinStrikes: 0 });
  hooks.invalidateUserProfileCache(ref.id);
  const blocks = await db.collection(BLOCKS).where("uid", "==", ref.id).limit(50).get();
  const batch = db.batch();
  blocks.docs.forEach((b) => batch.delete(b.ref));
  await batch.commit();
  blockCache = { at: 0, list: [] };
}

export const FAKE_COIN_BAN_CHOICES = BAN_CHOICES_HOURS;
