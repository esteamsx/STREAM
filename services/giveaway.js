import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "../config/firebase.js";
import {
  addNotification,
  getUserProfile,
  getFaceScanForUser,
  ensureReferralCode,
  validateImageDataUrl,
  normalizeFaceSamples,
  storedFaceSamples,
  bestDistanceBetween,
  verifyOwnFaceId,
  CLAIM_FACE_THRESHOLD,
} from "./auth.js";
import { sendPushToUid } from "../config/push.js";
import { siteOrigin } from "../config/site.js";

const CONFIG_REF = db.collection("giveaway_config").doc("current");
const ENTRIES = db.collection("giveaway_entries");
const HISTORY = db.collection("giveaway_history");

const MAX_OPEN_MINUTES = 7 * 24 * 60;
const MAX_DRAW_DELAY_MINUTES = 24 * 60;
const STUCK_DRAW_MS = 2 * 60 * 1000;
const SNAPSHOT_MAX_BYTES = 150 * 1024;

function fail(message, status = 400, code) {
  return Object.assign(new Error(message), { status, code });
}

function cleanText(value, max) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

export function normalizePhone(raw) {
  let digits = String(raw || "").replace(/[^\d+]/g, "");
  digits = digits.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) digits = "0" + digits.slice(3);
  return digits;
}

const CFG_TTL_IDLE_MS = 10 * 60 * 1000;
const CFG_TTL_ACTIVE_MS = 2 * 60 * 1000;
let cfgCache = { value: undefined, at: 0 };

function invalidateConfig() {
  cfgCache = { value: undefined, at: 0 };
}

async function getConfig({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && cfgCache.value !== undefined) {
    const active = cfgCache.value && (cfgCache.value.status === "open" || cfgCache.value.status === "drawing");
    if (now - cfgCache.at < (active ? CFG_TTL_ACTIVE_MS : CFG_TTL_IDLE_MS)) return cfgCache.value;
  }
  const snap = await CONFIG_REF.get();
  cfgCache = { value: snap.exists ? snap.data() : null, at: now };
  return cfgCache.value;
}

let roundIndex = null;
let roundIndexLoading = null;

function dropRoundIndex() {
  roundIndex = null;
  roundIndexLoading = null;
}

async function loadRoundIndex(roundId) {
  if (roundIndex && roundIndex.roundId === roundId) return roundIndex;
  if (roundIndexLoading && roundIndexLoading.roundId === roundId) return roundIndexLoading.promise;
  const promise = (async () => {
    const snap = await ENTRIES.where("roundId", "==", roundId).select("uid", "phoneNorm", "samples", "descriptor").get();
    const idx = { roundId, uids: new Set(), phones: new Set(), faces: [] };
    for (const d of snap.docs) {
      const e = d.data();
      idx.uids.add(e.uid);
      idx.phones.add(e.phoneNorm);
      idx.faces.push({ uid: e.uid, samples: storedFaceSamples(e) });
    }
    roundIndex = idx;
    return idx;
  })();
  roundIndexLoading = { roundId, promise };
  try {
    return await promise;
  } finally {
    if (roundIndexLoading && roundIndexLoading.promise === promise) roundIndexLoading = null;
  }
}

function phaseOf(cfg, now = Date.now()) {
  if (!cfg) return "none";
  if (cfg.status === "open") return now < cfg.endsAt ? "open" : "closed";
  if (cfg.status === "drawing") return "closed";
  return "ended";
}

const faceKnown = new Map();
async function hasFaceIdCached(uid) {
  const until = faceKnown.get(uid);
  if (until && until > Date.now()) return true;
  const scan = await getFaceScanForUser(uid).catch(() => null);
  if (scan) {
    if (faceKnown.size >= 5000) faceKnown.clear();
    faceKnown.set(uid, Date.now() + 10 * 60 * 1000);
  }
  return !!scan;
}

export async function getPublicStatus(uid) {
  const cfg = await getConfig();
  const now = Date.now();
  const phase = phaseOf(cfg, now);
  const out = { open: phase === "open", serverNow: now };
  if (phase !== "open") return out;

  const idx = await loadRoundIndex(cfg.roundId);
  const [profile, faceKnown] = await Promise.all([getUserProfile(uid).catch(() => null), hasFaceIdCached(uid)]);
  const entered = idx.uids.has(uid);
  let referralCode = profile?.referralCode || null;
  if (!referralCode && profile) referralCode = await ensureReferralCode(uid, profile).catch(() => null);
  const shareUrl = `${siteOrigin()}/giveaway${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`;
  return {
    ...out,
    shareUrl,
    title: cfg.title,
    prize: cfg.prize,
    endsAt: cfg.endsAt,
    entered,
    hasFaceId: faceKnown,
    username: profile?.username || "",
    name: [profile?.firstName, profile?.lastName].filter(Boolean).join(" "),
  };
}

export async function enterGiveaway(uid, body = {}) {
  const cfg = await getConfig();
  if (phaseOf(cfg) !== "open") throw fail("Giveaway has Ended. Please try again later.", 409, "giveaway/ended");

  const profile = await getUserProfile(uid);
  if (!profile || profile.banned) throw fail("Your account cannot enter this giveaway.", 403);
  const username = String(profile.username || "").trim();
  if (!username) throw fail("Set a username on your account before entering.");

  const name = cleanText(body.name, 60);
  if (!/^[\p{L}][\p{L}\p{M}'.\- ]{1,59}$/u.test(name)) throw fail("Enter your full name.");
  const phone = normalizePhone(body.phone);
  if (!/^0\d{10}$/.test(phone)) throw fail("Enter a valid phone number, like 08012345678.");

  const probes = normalizeFaceSamples(body.faceDescriptor);
  if (!probes.length) throw fail("Face scan required.");
  const snapshot = validateImageDataUrl(body.snapshot, SNAPSHOT_MAX_BYTES) ? body.snapshot : null;
  if (!snapshot) throw fail("Face photo missing. Please scan again.");

  await verifyOwnFaceId(uid, probes);

  const entryId = `${cfg.roundId}_${uid}`;
  const idx = await loadRoundIndex(cfg.roundId);
  if (idx.uids.has(uid)) throw fail("You have already entered this giveaway.", 409, "giveaway/duplicate");
  if (idx.phones.has(phone)) throw fail("This phone number has already been entered.", 409, "giveaway/duplicate");
  for (const f of idx.faces) {
    if (f.samples.length && bestDistanceBetween(probes, f.samples) <= CLAIM_FACE_THRESHOLD) {
      throw fail("This face has already been entered. One entry per person.", 409, "giveaway/duplicate");
    }
  }

  const face = { uid, samples: probes.slice(0, 8) };
  idx.uids.add(uid);
  idx.phones.add(phone);
  idx.faces.push(face);
  try {
    await ENTRIES.doc(entryId).create({
      roundId: cfg.roundId,
      uid,
      name,
      username,
      phone,
      phoneNorm: phone,
      descriptor: probes[0],
      samples: probes.slice(0, 8).map((v) => ({ v })),
      snapshot,
      createdAt: Date.now(),
    });
  } catch (err) {
    idx.uids.delete(uid);
    idx.phones.delete(phone);
    const at = idx.faces.indexOf(face);
    if (at >= 0) idx.faces.splice(at, 1);
    throw err;
  }
  return { ok: true };
}


export async function startGiveaway({ title, prize, pin, openMinutes, drawDelayMinutes }) {
  const cleanTitle = cleanText(title, 80) || "ES TEAMS TV Giveaway";
  const cleanPrize = cleanText(prize, 80);
  const cleanPin = cleanText(pin, 60);
  const open = Math.floor(Number(openMinutes));
  const delay = Math.floor(Number(drawDelayMinutes) || 0);
  if (!cleanPrize) throw fail("Enter the prize, for example: ₦500 MTN airtime.");
  if (cleanPin.length < 4) throw fail("Enter the recharge card PIN.");
  if (!Number.isFinite(open) || open < 1 || open > MAX_OPEN_MINUTES) throw fail("Entry time must be between 1 minute and 7 days.");
  if (delay < 0 || delay > MAX_DRAW_DELAY_MINUTES) throw fail("Draw delay must be between 0 and 1440 minutes.");

  const now = Date.now();
  const roundId = `g_${now.toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(CONFIG_REF);
    const prev = snap.exists ? snap.data() : null;
    if (prev && (prev.status === "open" || prev.status === "drawing")) {
      throw fail("A giveaway is already running. End or cancel it first.", 409);
    }
    const endsAt = now + open * 60000;
    tx.set(CONFIG_REF, {
      roundId,
      title: cleanTitle,
      prize: cleanPrize,
      pin: cleanPin,
      status: "open",
      startedAt: now,
      openMinutes: open,
      drawDelayMinutes: delay,
      endsAt,
      drawAt: endsAt + delay * 60000,
    });
  });
  invalidateConfig();
  dropRoundIndex();
  purgeEntriesExcept(roundId).catch(() => {});
  return getAdminState();
}

export async function closeEntriesNow() {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(CONFIG_REF);
    const c = snap.exists ? snap.data() : null;
    if (!c || c.status !== "open") throw fail("No giveaway is open.", 409);
    const now = Date.now();
    tx.update(CONFIG_REF, { endsAt: now, drawAt: now + (c.drawDelayMinutes || 0) * 60000 });
  });
  invalidateConfig();
  return getAdminState();
}

export async function pickWinnerNow() {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(CONFIG_REF);
    const c = snap.exists ? snap.data() : null;
    if (!c || c.status !== "open") throw fail("No giveaway is waiting for a draw.", 409);
    const now = Date.now();
    tx.update(CONFIG_REF, { endsAt: Math.min(c.endsAt, now), drawAt: now });
  });
  invalidateConfig();
  await runDueDraw();
  return getAdminState();
}

export async function cancelGiveaway() {
  const cfg = await getConfig({ fresh: true });
  if (!cfg || (cfg.status !== "open" && cfg.status !== "drawing")) throw fail("No giveaway is running.", 409);
  const now = Date.now();
  invalidateHistory();
  await HISTORY.add({
    type: "cancelled",
    roundId: cfg.roundId,
    title: cfg.title,
    prize: cfg.prize,
    pin: cfg.pin || "",
    startedAt: cfg.startedAt,
    drawnAt: now,
    entriesCount: await countEntries(cfg.roundId),
    hasPhoto: false,
  });
  await CONFIG_REF.update({ status: "ended", endedAt: now, pin: admin.firestore.FieldValue.delete() });
  invalidateConfig();
  invalidateHistory();
  await purgeRound(cfg.roundId);
  dropRoundIndex();
  return getAdminState();
}

async function countEntriesFromDb(roundId) {
  try {
    const agg = await ENTRIES.where("roundId", "==", roundId).count().get();
    return agg.data().count || 0;
  } catch {
    return (await ENTRIES.where("roundId", "==", roundId).select().get()).size;
  }
}

const countCache = new Map();
async function countEntries(roundId) {
  if (roundIndex && roundIndex.roundId === roundId) return roundIndex.uids.size;
  const hit = countCache.get(roundId);
  if (hit && Date.now() - hit.at < 15 * 1000) return hit.n;
  const n = await countEntriesFromDb(roundId);
  countCache.clear();
  countCache.set(roundId, { n, at: Date.now() });
  return n;
}

const HISTORY_TTL_MS = 5 * 60 * 1000;
let historyCache = { at: 0, list: null };
function invalidateHistory() {
  historyCache = { at: 0, list: null };
}

async function loadHistory() {
  if (historyCache.list && Date.now() - historyCache.at < HISTORY_TTL_MS) return historyCache.list;
  const histSnap = await HISTORY.orderBy("drawnAt", "desc").limit(30).select(
    "type", "title", "prize", "pin", "entriesCount", "drawnAt", "startedAt",
    "winnerName", "winnerUsername", "winnerPhone", "winnerUid", "hasPhoto"
  ).get();
  historyCache = { at: Date.now(), list: histSnap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  return historyCache.list;
}

export async function getAdminState() {
  const cfg = await getConfig();
  const now = Date.now();
  let current = null;
  if (cfg) {
    current = {
      roundId: cfg.roundId,
      title: cfg.title,
      prize: cfg.prize,
      pin: cfg.pin || "",
      status: cfg.status,
      phase: phaseOf(cfg, now),
      startedAt: cfg.startedAt,
      endsAt: cfg.endsAt,
      drawAt: cfg.drawAt,
      entriesCount: cfg.status === "ended" ? 0 : await countEntries(cfg.roundId),
    };
  }
  return { serverNow: now, current, history: await loadHistory() };
}

export async function getHistoryPhoto(id) {
  const snap = await HISTORY.doc(String(id)).get();
  if (!snap.exists) return null;
  const m = /^data:(image\/jpeg|image\/png|image\/webp);base64,(.+)$/.exec(String(snap.data().winnerPhoto || ""));
  if (!m) return null;
  return { type: m[1], buffer: Buffer.from(m[2], "base64") };
}


async function purgeEntriesExcept(keepRoundId) {
  for (;;) {
    const snap = await ENTRIES.select("roundId").limit(400).get();
    const stale = snap.docs.filter((d) => d.data().roundId !== keepRoundId);
    if (!stale.length) return;
    const batch = db.batch();
    stale.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (stale.length < snap.size) return;
  }
}

async function claimDueDraw() {
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(CONFIG_REF);
    if (!snap.exists) return null;
    const c = snap.data();
    const now = Date.now();
    const stuck = c.status === "drawing" && now - (c.drawStartedAt || 0) > STUCK_DRAW_MS;
    const due = c.status === "open" && now >= c.drawAt;
    if (!due && !stuck) return null;
    tx.update(CONFIG_REF, { status: "drawing", drawStartedAt: now });
    return c;
  });
  if (claimed) invalidateConfig();
  return claimed;
}

async function notifyWinner(historyId, h) {
  await addNotification(h.winnerUid, "giveaway_win", "You won the giveaway", { historyId, pin: h.pin, link: "/giveaway" });
  sendPushToUid(h.winnerUid, { title: "You won the giveaway!", body: "Open your notifications to copy your recharge PIN.", url: "/" }).catch(() => {});
  await HISTORY.doc(historyId).update({ notified: true });
}

async function pickEligibleWinner(roundId) {
  let pool;
  let total;
  if (roundIndex && roundIndex.roundId === roundId) {
    pool = [...roundIndex.uids].map((u) => `${roundId}_${u}`);
    total = pool.length;
  } else {
    const snap = await ENTRIES.where("roundId", "==", roundId).select("uid").get();
    pool = snap.docs.map((d) => d.id);
    total = snap.size;
  }
  while (pool.length) {
    const i = crypto.randomInt(pool.length);
    const [entryId] = pool.splice(i, 1);
    const full = await ENTRIES.doc(entryId).get();
    if (!full.exists) continue;
    const entry = full.data();
    const profile = await getUserProfile(entry.uid).catch(() => null);
    if (!profile || profile.banned) continue;
    return { entry, total };
  }
  return { entry: null, total };
}

async function purgeRound(roundId) {
  if (roundIndex && roundIndex.roundId === roundId) {
    const ids = [...roundIndex.uids].map((u) => `${roundId}_${u}`);
    for (let i = 0; i < ids.length; i += 400) {
      const batch = db.batch();
      ids.slice(i, i + 400).forEach((id) => batch.delete(ENTRIES.doc(id)));
      await batch.commit();
    }
    if ((await countEntriesFromDb(roundId)) === 0) return;
  }
  await purgeEntriesExcept(null);
}

export async function runDueDraw() {
  const known = await getConfig();
  const now = Date.now();
  const due = known && ((known.status === "open" && now >= known.drawAt) || (known.status === "drawing" && now - (known.drawStartedAt || 0) > STUCK_DRAW_MS));
  if (!due) return false;
  const cfg = await claimDueDraw();
  if (!cfg) return false;
  try {
    let historyId = cfg.historyId || null;
    let history = null;
    if (historyId) {
      const hs = await HISTORY.doc(historyId).get();
      history = hs.exists ? hs.data() : null;
    }
    if (!history) {
      const { entry, total } = await pickEligibleWinner(cfg.roundId);
      const now = Date.now();
      const base = {
        roundId: cfg.roundId,
        title: cfg.title,
        prize: cfg.prize,
        pin: cfg.pin || "",
        startedAt: cfg.startedAt,
        drawnAt: now,
        entriesCount: total,
      };
      history = entry
        ? {
            ...base,
            type: "winner",
            winnerUid: entry.uid,
            winnerName: entry.name,
            winnerUsername: entry.username,
            winnerPhone: entry.phone,
            winnerPhoto: entry.snapshot || "",
            hasPhoto: !!entry.snapshot,
            notified: false,
          }
        : { ...base, type: "no-entries", hasPhoto: false };
      const ref = await HISTORY.add(history);
      invalidateHistory();
      historyId = ref.id;
      await CONFIG_REF.update({ historyId });
    }
    if (history.type === "winner" && !history.notified) await notifyWinner(historyId, history);
    await CONFIG_REF.update({ status: "ended", endedAt: Date.now(), pin: admin.firestore.FieldValue.delete() });
    invalidateConfig();
    invalidateHistory();
    await purgeRound(cfg.roundId);
    dropRoundIndex();
    return true;
  } catch (err) {
    console.error("[giveaway] draw failed, will retry:", err.message);
    return false;
  }
}

let sweepTimer = null;
export function startGiveawaySweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => { runDueDraw().catch(() => {}); }, 15000);
  sweepTimer.unref?.();
}
