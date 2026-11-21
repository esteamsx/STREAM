import crypto from "crypto";
import { db } from "../config/firebase.js";
import { clientIp } from "./client-ip.js";

export const TRUSTED_IDLE_MS = 5 * 24 * 60 * 60 * 1000;
export const TRUSTED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SESSIONS = "deviceSessions";
const TRUSTED = "trustedDevices";
export const DEVICE_COOKIE = "es_did";
const DEVICE_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 1000;
const CACHE_MS = 90 * 1000;
const MAX_HISTORY = 40;
const HISTORY_MAX_AGE_MS = 45 * 24 * 60 * 60 * 1000;

const cache = new Map();

function clip(v, n = 80) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
}

function hint(req, name) {
  const v = req.headers[name];
  return v ? clip(String(v).replace(/^"|"$/g, ""), 60) : "";
}

const BRAND_RULES = [
  [/^SM-|^GT-|^SCH-|^Galaxy/i, "Samsung"],
  [/^Pixel/i, "Google"],
  [/^(Redmi|POCO|Mi |MI |M\d{4}[A-Z]\d|2\d{6}[A-Z]{1,2}$)/i, "Xiaomi"],
  [/^(CPH|RMX)/i, "OPPO/realme"],
  [/^(V\d{4}|vivo)/i, "vivo"],
  [/^(TECNO)/i, "TECNO"],
  [/^(Infinix|X\d{3,4}[A-Z]?$)/i, "Infinix"],
  [/^(itel)/i, "itel"],
  [/^(IN20|KB20|LE2|HD19|OnePlus|CPH2\d{3}$)/i, "OnePlus"],
  [/^(moto|XT\d{4})/i, "Motorola"],
  [/^(Nokia|TA-\d{4})/i, "Nokia"],
  [/^(HUAWEI|[A-Z]{3}-[LA]\d{2})/i, "Huawei"],
];

function brandOf(model) {
  for (const [re, brand] of BRAND_RULES) if (re.test(model)) return brand;
  return "";
}

export function parseDevice(req) {
  const ua = clip(req.headers["user-agent"], 400);
  const platformHint = hint(req, "sec-ch-ua-platform");
  const pv = hint(req, "sec-ch-ua-platform-version");
  let model = hint(req, "sec-ch-ua-model");
  let os = "";
  let osVersion = "";
  let type = "desktop";

  if (/Android/i.test(ua)) {
    os = "Android";
    type = /Mobile/i.test(ua) ? "phone" : "tablet";
    const m = ua.match(/Android\s([\d.]+)(?:;\s*([^;)]+))?/);
    osVersion = (pv ? pv.split(".")[0] : m ? m[1].split(".")[0] : "");
    if (!model && m && m[2]) {
      const cand = m[2].replace(/\sBuild\/.*$/i, "").trim();
      if (cand && cand !== "K" && !/^(Mobile|wv|U)$/i.test(cand)) model = cand;
    }
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    const ipad = /iPad/.test(ua);
    os = ipad ? "iPadOS" : "iOS";
    type = ipad ? "tablet" : "phone";
    const m = ua.match(/OS (\d+)[_\d]*/);
    osVersion = m ? m[1] : "";
    model = ipad ? "iPad" : "iPhone";
  } else if (/Windows NT/.test(ua)) {
    os = "Windows";
    osVersion = platformHint === "Windows" && parseInt(pv, 10) >= 13 ? "11" : (/Windows NT 10/.test(ua) ? "10" : "");
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    os = "macOS";
  } else if (/CrOS/.test(ua)) {
    os = "ChromeOS";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  let browser = "";
  let bv = "";
  const pick = (re) => { const m = ua.match(re); return m ? m[1].split(".")[0] : ""; };
  if (/Edg(e|A|iOS)?\//.test(ua)) { browser = "Edge"; bv = pick(/Edg(?:e|A|iOS)?\/([\d.]+)/); }
  else if (/OPR\/|Opera/.test(ua)) { browser = "Opera"; bv = pick(/OPR\/([\d.]+)/); }
  else if (/SamsungBrowser/.test(ua)) { browser = "Samsung Internet"; bv = pick(/SamsungBrowser\/([\d.]+)/); }
  else if (/Firefox|FxiOS/.test(ua)) { browser = "Firefox"; bv = pick(/(?:Firefox|FxiOS)\/([\d.]+)/); }
  else if (/Chrome|CriOS/.test(ua)) { browser = "Chrome"; bv = pick(/(?:Chrome|CriOS)\/([\d.]+)/); }
  else if (/Safari/.test(ua)) { browser = "Safari"; bv = pick(/Version\/([\d.]+)/); }

  const brand = brandOf(model);
  let name;
  if (type === "phone" || type === "tablet") {
    name = [brand && !model.toLowerCase().startsWith(brand.toLowerCase()) ? brand : "", model].filter(Boolean).join(" ") || (os ? os + " device" : "Mobile device");
  } else if (os === "Windows") name = "Windows PC";
  else if (os === "macOS") name = "Mac";
  else if (os === "ChromeOS") name = "Chromebook";
  else if (os === "Linux") name = "Linux PC";
  else name = "Unknown device";

  return {
    name: clip(name),
    brand: clip(brand, 30),
    model: clip(model, 60),
    type,
    os: clip(os + (osVersion ? " " + osVersion : ""), 40),
    browser: clip(browser + (bv ? " " + bv : ""), 40),
    ip: clip(clientIp(req), 60),
    userAgent: ua,
  };
}

function newDeviceId() {
  return crypto.randomBytes(16).toString("hex");
}

function getRec(sid) {
  const c = cache.get(sid);
  if (c && Date.now() - c.t < CACHE_MS) return Promise.resolve(c.rec);
  return db.collection(SESSIONS).doc(sid).get().then((snap) => {
    const rec = snap.exists ? snap.data() : null;
    cache.set(sid, { rec, t: Date.now() });
    return rec;
  });
}

function remember(sid, rec) {
  cache.set(sid, { rec, t: Date.now() });
}

export async function openDeviceSession({ uid, req, res, trustedOverride = false }) {
  let deviceId = req.cookies?.[DEVICE_COOKIE];
  if (!/^[a-f0-9]{32}$/.test(String(deviceId || ""))) deviceId = newDeviceId();
  res.cookie(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: true, sameSite: "lax", maxAge: DEVICE_COOKIE_MAX_AGE });

  const device = parseDevice(req);
  const trustRef = db.collection(TRUSTED).doc(uid + "_" + deviceId);
  const trustSnap = await trustRef.get();
  const trusted = (trustSnap.exists && trustSnap.data().trusted === true) || trustedOverride;
  if (trusted) trustRef.update({ lastUsedAt: Date.now(), name: device.name, model: device.model, type: device.type, os: device.os, browser: device.browser, ip: device.ip }).catch(() => {});
  if (trustedOverride && !(trustSnap.exists && trustSnap.data().trusted === true)) {
    await trustRef.set({ uid, deviceId, trusted: true, name: device.name, model: device.model, type: device.type, os: device.os, browser: device.browser, ip: device.ip, trustedAt: Date.now(), lastUsedAt: Date.now() });
  }

  const active = await db.collection(SESSIONS).where("uid", "==", uid).where("revoked", "==", false).get();
  const kicked = [];
  if (!active.empty) {
    const batch = db.batch();
    const now = Date.now();
    active.docs.forEach((d) => {
      kicked.push({ sid: d.id, ...d.data() });
      batch.update(d.ref, { revoked: true, revokedAt: now, revokedReason: "another_login" });
      cache.delete(d.id);
    });
    await batch.commit();
  }

  const sid = crypto.randomBytes(16).toString("hex");
  const now = Date.now();
  const rec = {
    uid, sid, deviceId, ...device,
    createdAt: now, lastActiveAt: now,
    trusted, trustDecided: trusted, trustedAt: trusted ? now : null,
    revoked: false,
  };
  await db.collection(SESSIONS).doc(sid).set(rec);
  remember(sid, rec);
  return { sid, trusted, device, kicked };
}

export async function checkDeviceSession(sid, uid, deviceId = null) {
  try {
    const rec = await getRec(sid);
    if (!rec || rec.uid !== uid || rec.revoked) return false;
    if (deviceId !== null && rec.deviceId !== deviceId) return false;
    if (rec.trusted && Date.now() - (rec.lastActiveAt || rec.createdAt || 0) > TRUSTED_IDLE_MS) {
      await revokeDeviceSession(sid, "idle");
      return false;
    }
    return true;
  } catch (err) {
    console.error("[device-sessions] check failed; rejecting session:", err.message);
    return false;
  }
}

export async function isTrustedDevice(uid, deviceId) {
  // Browser profiles are separate security contexts; never inherit trust from IP or user-agent guesses.
  if (!/^[a-f0-9]{32}$/.test(String(deviceId || ""))) return false;
  const snap = await db.collection(TRUSTED).doc(uid + "_" + deviceId).get();
  return snap.exists && snap.data().trusted === true;
}

export function touchDeviceSession(sid) {
  const c = cache.get(sid);
  const rec = c && c.rec;
  if (rec && Date.now() - (rec.lastActiveAt || 0) < TOUCH_EVERY_MS) return;
  const now = Date.now();
  if (rec) remember(sid, { ...rec, lastActiveAt: now });
  db.collection(SESSIONS).doc(sid).update({ lastActiveAt: now }).catch(() => {});
}

export async function revokeDeviceSession(sid, reason) {
  cache.delete(sid);
  await db.collection(SESSIONS).doc(sid).update({ revoked: true, revokedAt: Date.now(), revokedReason: reason || "logout" }).catch(() => {});
}

export async function revokeAllDeviceSessions(uid) {
  const snap = await db.collection(SESSIONS).where("uid", "==", uid).where("revoked", "==", false).get().catch(() => null);
  if (!snap || snap.empty) return;
  const batch = db.batch();
  const now = Date.now();
  snap.docs.forEach((d) => { batch.update(d.ref, { revoked: true, revokedAt: now, revokedReason: "revoked_all" }); cache.delete(d.id); });
  await batch.commit().catch(() => {});
}

export async function getDeviceSession(sid) {
  return getRec(sid);
}

function publicRec(r) {
  return {
    sid: r.sid,
    deviceId: r.deviceId,
    name: r.name,
    model: r.model || "",
    type: r.type,
    os: r.os,
    browser: r.browser,
    ip: r.ip,
    createdAt: r.createdAt,
    lastActiveAt: r.lastActiveAt,
    trusted: !!r.trusted,
    revoked: !!r.revoked,
    revokedReason: r.revokedReason || "",
  };
}

export async function listDevices(uid, currentSid) {
  const [sessSnap, trustSnap] = await Promise.all([
    db.collection(SESSIONS).where("uid", "==", uid).get(),
    db.collection(TRUSTED).where("uid", "==", uid).get(),
  ]);
  const all = sessSnap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const newestSessionByDevice = new Map();
  all.forEach((r) => { if (r.deviceId && !newestSessionByDevice.has(r.deviceId)) newestSessionByDevice.set(r.deviceId, r); });

  const keyOf = new Map();
  const newestPerDevice = new Map();
  all.forEach((r) => {
    const phone = r.type === "phone" || r.type === "tablet";
    const key = phone
      ? trustedDeviceGroupKey(r)
      : "d|" + (r.deviceId || r.sid);
    keyOf.set(r.sid, key);
    if (!newestPerDevice.has(key)) newestPerDevice.set(key, r);
  });
  const newestSids = new Set(Array.from(newestPerDevice.values()).map((r) => r.sid));

  const stale = all.filter((r, i) => r.revoked && (!newestSids.has(r.sid) || i >= MAX_HISTORY || Date.now() - (r.revokedAt || 0) > HISTORY_MAX_AGE_MS));
  if (stale.length) {
    const batch = db.batch();
    stale.forEach((r) => batch.delete(db.collection(SESSIONS).doc(r.sid)));
    batch.commit().catch(() => {});
  }
  const keep = all.filter((r) => !stale.includes(r));

  const now = Date.now();
  const isLive = (r) => !r.revoked && !(r.trusted && now - (r.lastActiveAt || r.createdAt || 0) > TRUSTED_IDLE_MS);
  const current = keep.find((r) => r.sid === currentSid) || null;
  const devices = Array.from(newestPerDevice.values()).filter((r) => keep.includes(r));
  const trustedGroups = new Map();
  trustSnap.docs.forEach((doc) => {
    const stored = doc.data();
    if (stored.trusted !== true || !stored.deviceId) return;
    const session = newestSessionByDevice.get(stored.deviceId) || {};
    const device = {
      ...session,
      ...stored,
      model: stored.model || session.model || "",
      type: stored.type || session.type || (/Android|iOS|iPadOS/i.test(stored.os || session.os || "") ? "phone" : "desktop"),
      name: stored.label || stored.name || session.name || "Device",
      os: stored.os || session.os || "",
      browser: stored.browser || session.browser || "",
    };
    const key = trustedDeviceGroupKey(device);
    let group = trustedGroups.get(key);
    if (!group) {
      group = {
        deviceId: stored.deviceId,
        deviceIds: [],
        name: device.name,
        label: stored.label || "",
        model: device.model || "",
        type: device.type,
        os: device.os,
        browsers: [],
        ip: device.ip || "",
        trustedAt: stored.trustedAt || 0,
        lastUsedAt: stored.lastUsedAt || stored.trustedAt || 0,
        isCurrent: false,
      };
      trustedGroups.set(key, group);
    }
    group.deviceIds.push(stored.deviceId);
    const browserFamily = String(device.browser || "").replace(/\s+\d+(?:\.\d+)*.*$/, "").trim();
    if (browserFamily && !group.browsers.includes(browserFamily)) group.browsers.push(browserFamily);
    if (stored.label) { group.label = stored.label; group.name = stored.label; }
    group.trustedAt = Math.max(group.trustedAt, stored.trustedAt || 0);
    const lastUsedAt = stored.lastUsedAt || stored.trustedAt || 0;
    if (lastUsedAt >= group.lastUsedAt) { group.lastUsedAt = lastUsedAt; group.ip = device.ip || group.ip; }
    if (current && current.deviceId === stored.deviceId) group.isCurrent = true;
  });
  const trusted = Array.from(trustedGroups.values()).map((group) => ({
    ...group,
    deviceIds: Array.from(new Set(group.deviceIds)),
    browsers: group.browsers.sort((a, b) => a.localeCompare(b)),
    browser: group.browsers.join(", "),
  })).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  const currentTrusted = current && trustSnap.docs.map((doc) => doc.data()).find((record) => record.deviceId === current.deviceId && record.trusted === true);
  return {
    current: current ? { ...publicRec(current), name: currentTrusted?.label || current.name } : null,
    trusted,
    history: devices.slice(0, 20).map((r) => {
      const key = keyOf.get(r.sid);
      const group = keep.filter((x) => keyOf.get(x.sid) === key);
      return { ...publicRec(r), active: group.some(isLive), current: group.some((x) => x.sid === currentSid) };
    }),
  };
}

function trustedDeviceGroupKey(device) {
  const mobile = device.type === "phone" || device.type === "tablet";
  if (!mobile) return "profile|" + String(device.deviceId || "");
  const model = String(device.model || device.name || "").trim().toLowerCase();
  const osFamily = String(device.os || "").trim().split(/\s+/)[0].toLowerCase();
  if (!model || /^android device$/.test(model) || !osFamily) return "profile|" + String(device.deviceId || "");
  // Group phone/tablet models across browsers in the account UI only; login trust remains cookie-specific.
  return ["mobile", device.type, model, osFamily].join("|");
}

export async function setTrusted(uid, sid, trusted) {
  const ref = db.collection(SESSIONS).doc(sid);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid || snap.data().revoked) return null;
  const rec = snap.data();
  const now = Date.now();
  const patch = { trusted: !!trusted, trustDecided: true, trustedAt: trusted ? now : null, lastActiveAt: now };
  await ref.update(patch);
  remember(sid, { ...rec, ...patch });
  const trustRef = db.collection(TRUSTED).doc(uid + "_" + rec.deviceId);
  if (trusted) {
    await trustRef.set({ uid, deviceId: rec.deviceId, trusted: true, name: rec.name, model: rec.model || "", type: rec.type || "", os: rec.os, browser: rec.browser, ip: rec.ip, trustedAt: now, lastUsedAt: now });
  } else {
    await trustRef.delete().catch(() => {});
  }
  return { ...rec, ...patch };
}

export async function removeTrustedDevice(uid, deviceId) {
  await db.collection(TRUSTED).doc(uid + "_" + deviceId).delete().catch(() => {});
  const snap = await db.collection(SESSIONS).where("uid", "==", uid).where("revoked", "==", false).get().catch(() => null);
  if (!snap) return;
  const batch = db.batch();
  snap.docs.forEach((d) => {
    if (d.data().deviceId === deviceId) { batch.update(d.ref, { trusted: false, trustedAt: null }); cache.delete(d.id); }
  });
  await batch.commit().catch(() => {});
}

export async function setTrustedDevicesLabel(uid, deviceIds, label) {
  const ids = Array.from(new Set((Array.isArray(deviceIds) ? deviceIds : []).map((id) => String(id || ""))));
  const cleanLabel = clip(label, 48);
  if (!ids.length || ids.length > 100 || ids.some((id) => !/^[a-f0-9]{32}$/.test(id)) || !cleanLabel) return false;
  const refs = ids.map((id) => db.collection(TRUSTED).doc(uid + "_" + id));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  if (snaps.some((snap) => !snap.exists || snap.data().uid !== uid || snap.data().trusted !== true)) return false;
  const batch = db.batch();
  refs.forEach((ref) => batch.update(ref, { label: cleanLabel }));
  await batch.commit();
  return true;
}

export async function removeTrustedDevices(uid, deviceIds) {
  const ids = Array.from(new Set((Array.isArray(deviceIds) ? deviceIds : []).map((id) => String(id || ""))));
  if (!ids.length || ids.length > 100 || ids.some((id) => !/^[a-f0-9]{32}$/.test(id))) return false;
  const refs = ids.map((id) => db.collection(TRUSTED).doc(uid + "_" + id));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  if (snaps.some((snap) => !snap.exists || snap.data().uid !== uid || snap.data().trusted !== true)) return false;
  const sessions = await db.collection(SESSIONS).where("uid", "==", uid).where("revoked", "==", false).get();
  const idsSet = new Set(ids);
  const batch = db.batch();
  refs.forEach((ref) => batch.delete(ref));
  sessions.docs.forEach((doc) => {
    if (idsSet.has(doc.data().deviceId)) {
      batch.update(doc.ref, { trusted: false, trustedAt: null });
      cache.delete(doc.id);
    }
  });
  await batch.commit();
  return true;
}

export async function revokeSessionsForDevice(uid, deviceId, reason) {
  if (!deviceId) return;
  const snap = await db.collection(SESSIONS).where("uid", "==", uid).where("revoked", "==", false).get().catch(() => null);
  if (!snap || snap.empty) return;
  const batch = db.batch();
  const now = Date.now();
  snap.docs.forEach((d) => {
    if (d.data().deviceId === deviceId) {
      batch.update(d.ref, { revoked: true, revokedAt: now, revokedReason: reason || "device_banned" });
      cache.delete(d.id);
    }
  });
  await batch.commit().catch(() => {});
}
