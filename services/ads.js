import crypto from "crypto";
import admin from "firebase-admin";
import sharp from "sharp";
import { db } from "../config/firebase.js";
import { assertPublicHttpUrl } from "./url-safety.js";
import {
  claimPendingPayment,
  addNotification,
  verifySession,
  getUserProfile,
  isVerificationActive,
  isAdminEmail,
} from "./auth.js";

export const AD_PRICE_PER_DAY_NGN = 2500;
export const AD_MIN_DAYS = 1;
export const AD_MAX_DAYS = 30;
export const AD_CTA_OPTIONS = ["Learn more", "Watch now", "Shop now", "Sign up", "Download", "Join now", "Get offer"];

const DAY_MS = 24 * 60 * 60 * 1000;
const WAT_OFFSET_MS = 60 * 60 * 1000;
const ACTIVE_CACHE_MS = 30 * 1000;
const VIEWER_CACHE_MS = 60 * 1000;
const TOKEN_TTL_MS = 30 * 60 * 1000;
const IMPRESSION_DEDUPE_MS = 60 * 1000;
const CLICK_DEDUPE_MS = 5 * 60 * 1000;
const FLUSH_INTERVAL_MS = 15 * 1000;
const CHART_DAYS = 14;
const MAX_ADS_PER_USER = 20;
const MAX_DRAFTS_PER_USER = 5;
const MAX_IMAGE_BYTES = 600 * 1024;
const IMAGE_CACHE_LIMIT = 60;
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|facebookexternalhit|curl|wget/i;

const TOKEN_SECRET = process.env.PROMO_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const FieldValue = admin.firestore.FieldValue;

function fail(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function dayKey(ts = Date.now()) {
  return new Date(ts + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

function recentDays(count) {
  const out = [];
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) out.push(dayKey(now - i * DAY_MS));
  return out;
}

function cleanText(value, min, max, label) {
  const text = String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (text.length < min) throw fail(`${label} must be at least ${min} characters.`);
  if (text.length > max) throw fail(`${label} must be ${max} characters or fewer.`);
  return text;
}

function isBot(req) {
  return BOT_UA.test(String(req.get("user-agent") || ""));
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", TOKEN_SECRET).update("promo:" + body).digest("hex").slice(0, 32);
  return body + "." + sig;
}

function readToken(token) {
  if (!token || typeof token !== "string" || token.length > 400 || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update("promo:" + body).digest("hex").slice(0, 32);
  const a = Buffer.from(sig || "", "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (!payload || !payload.a || !payload.v || typeof payload.e !== "number" || Date.now() > payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

function viewerKey(req, uid) {
  if (uid) return "u:" + uid;
  const raw = String(req.ip || "") + "|" + String(req.get("user-agent") || "");
  return "g:" + crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

const viewerCache = new Map();

async function resolveViewer(req) {
  const sessionId = req.cookies && req.cookies.session;
  if (!sessionId) return { uid: null, premium: false };
  const now = Date.now();
  const hit = viewerCache.get(sessionId);
  if (hit && hit.exp > now) return hit;
  let out = { uid: null, premium: false };
  try {
    const uid = await verifySession(sessionId);
    if (uid) {
      const profile = await getUserProfile(uid);
      if (profile && !profile.banned && !profile.pendingDeletion) {
        out = { uid, premium: isVerificationActive(profile) || isAdminEmail(profile.email) };
      }
    }
  } catch {
    out = { uid: null, premium: false };
  }
  if (viewerCache.size > 5000) viewerCache.clear();
  const entry = { ...out, exp: now + VIEWER_CACHE_MS };
  viewerCache.set(sessionId, entry);
  return entry;
}

async function processImage(dataUrl) {
  const match = /^data:image\/(?:png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
  if (!match) throw fail("Upload a PNG, JPG or WebP image.");
  const input = Buffer.from(match[1], "base64");
  if (!input.length || input.length > MAX_IMAGE_BYTES) throw fail("That image is too large. Keep it under 600 KB.");
  try {
    const output = await sharp(input).rotate().resize(640, 360, { fit: "cover" }).webp({ quality: 80 }).toBuffer();
    return output.toString("base64");
  } catch {
    throw fail("That image could not be read.");
  }
}

export async function createAdDraft(uid, input) {
  const title = cleanText(input && input.title, 3, 60, "Headline");
  const body = cleanText(input && input.body, 10, 140, "Description");
  const cta = AD_CTA_OPTIONS.includes(input && input.cta) ? input.cta : AD_CTA_OPTIONS[0];
  const rawUrl = String((input && input.url) || "").trim();
  if (!/^https:\/\//i.test(rawUrl)) throw fail("The link must start with https://");
  await assertPublicHttpUrl(rawUrl);
  const url = new URL(rawUrl).toString();
  if (url.length > 500) throw fail("That link is too long.");

  const existing = await db.collection("ads").where("uid", "==", uid).get();
  let total = 0;
  let drafts = 0;
  existing.forEach((doc) => {
    const ad = doc.data();
    if (ad.status === "removed") return;
    total++;
    if (ad.status === "draft") drafts++;
  });
  if (drafts >= MAX_DRAFTS_PER_USER) throw fail("You have unpaid drafts waiting. Pay for or delete one first.");
  if (total >= MAX_ADS_PER_USER) throw fail("You have reached the maximum number of ads.");

  let image = null;
  if (input && input.image) image = await processImage(input.image);

  const ref = db.collection("ads").doc();
  await ref.set({
    uid,
    title,
    body,
    cta,
    url,
    hasImage: !!image,
    status: "draft",
    createdAt: Date.now(),
    startsAt: null,
    endsAt: null,
    impressions: 0,
    clicks: 0,
    totalDays: 0,
    totalPaidKobo: 0,
  });
  if (image) await db.collection("adImages").doc(ref.id).set({ mime: "image/webp", data: image });
  return { id: ref.id };
}

export async function deleteAdDraft(uid, adId) {
  const ref = db.collection("ads").doc(adId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw fail("Ad not found.", 404);
  if (snap.data().status !== "draft") throw fail("Only unpaid drafts can be deleted.");
  await ref.delete();
  await db.collection("adImages").doc(adId).delete().catch(() => {});
}

export function validateDays(value) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < AD_MIN_DAYS || days > AD_MAX_DAYS) {
    throw fail(`Choose between ${AD_MIN_DAYS} and ${AD_MAX_DAYS} days.`);
  }
  return days;
}

export async function assertAdPayable(uid, adId) {
  const snap = await db.collection("ads").doc(String(adId || "")).get();
  if (!snap.exists || snap.data().uid !== uid) throw fail("Ad not found.", 404);
  if (snap.data().status === "removed") throw fail("This ad was removed and cannot be renewed.");
  return snap.data();
}

export async function createAdPayment(uid, reference, amountKobo, adId, days) {
  await db.collection("adPayments").doc(reference).set({
    uid,
    adId,
    days,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });
}

export async function getAdPayment(reference) {
  const snap = await db.collection("adPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

export async function finalizeAdPayment(reference, paystackData) {
  const ref = db.collection("adPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const adRef = db.collection("ads").doc(record.adId);
  const outcome = await db.runTransaction(async (tx) => {
    const [snap, paySnap] = await Promise.all([tx.get(adRef), tx.get(ref)]);
    if (paySnap.exists && paySnap.data().status === "success") return { applied: true };
    if (!snap.exists || snap.data().status === "removed") return null;
    const ad = snap.data();
    const now = Date.now();
    const running = ad.status === "active" && ad.endsAt > now;
    const base = running ? ad.endsAt : now;
    const endsAt = base + record.days * DAY_MS;
    tx.update(adRef, {
      status: "active",
      startsAt: running ? ad.startsAt : now,
      endsAt,
      lastPaidAt: now,
      totalDays: FieldValue.increment(record.days),
      totalPaidKobo: FieldValue.increment(record.amountKobo),
    });
    tx.update(ref, { status: "success", confirmedAt: now });
    return { endsAt, title: ad.title };
  });

  if (outcome && outcome.applied) return { alreadyProcessed: true, uid: record.uid };

  if (!outcome) {
    await ref.update({ status: "needs_refund", confirmedAt: Date.now() });
    await addNotification(record.uid, "ad_refund", "We could not start your ad because it no longer exists. Contact support for a refund.", { reference });
    return { alreadyProcessed: false, uid: record.uid, endsAt: null };
  }

  activeCache.at = 0;
  await addNotification(record.uid, "ad_live", `Your ad "${outcome.title}" is live`, { adId: record.adId, endsAt: outcome.endsAt });
  return { alreadyProcessed: false, uid: record.uid, adId: record.adId, endsAt: outcome.endsAt };
}

let activeCache = { at: 0, ads: [] };
let activeLoading = null;

async function loadActiveAds() {
  try {
    const snap = await db.collection("ads").where("status", "==", "active").get();
    const now = Date.now();
    const live = [];
    const expired = [];
    snap.forEach((doc) => {
      const ad = doc.data();
      if (ad.endsAt > now) {
        live.push({
          id: doc.id,
          uid: ad.uid,
          title: ad.title,
          body: ad.body,
          cta: ad.cta,
          url: ad.url,
          hasImage: !!ad.hasImage,
          createdAt: ad.createdAt,
          endsAt: ad.endsAt,
        });
      } else {
        expired.push(doc.ref);
      }
    });
    if (expired.length) {
      const batch = db.batch();
      expired.slice(0, 400).forEach((ref) => batch.update(ref, { status: "ended" }));
      batch.commit().catch(() => {});
    }
    activeCache = { at: now, ads: live };
  } catch (err) {
    console.error("promote active ads load failed:", err && err.message);
    activeCache = { at: Date.now() - ACTIVE_CACHE_MS + 5000, ads: activeCache.ads };
  }
  return activeCache.ads;
}

async function getActiveAds() {
  if (Date.now() - activeCache.at < ACTIVE_CACHE_MS) return activeCache.ads;
  if (!activeLoading) activeLoading = loadActiveAds().finally(() => { activeLoading = null; });
  return activeLoading;
}

export async function nextAdFor(req, lastId) {
  const viewer = await resolveViewer(req);
  if (viewer.premium) return null;
  const now = Date.now();
  const ads = await getActiveAds();
  const pool = ads.filter((ad) => ad.endsAt > now && ad.uid !== viewer.uid);
  if (!pool.length) return null;
  const fresh = pool.length > 1 ? pool.filter((ad) => ad.id !== lastId) : pool;
  const ad = fresh[crypto.randomInt(fresh.length)];
  const token = signToken({ a: ad.id, v: viewerKey(req, viewer.uid), e: now + TOKEN_TTL_MS });
  return {
    id: ad.id,
    title: ad.title,
    body: ad.body,
    cta: ad.cta,
    img: ad.hasImage ? `/api/sp/img/${ad.id}?v=${ad.createdAt}` : null,
    t: token,
  };
}

const buffer = new Map();
const recentImpressions = new Map();
const recentClicks = new Map();

function bump(ad, field) {
  const day = dayKey();
  const key = ad.id + "|" + day;
  let entry = buffer.get(key);
  if (!entry) {
    entry = { adId: ad.id, uid: ad.uid, day, impressions: 0, clicks: 0 };
    buffer.set(key, entry);
  }
  entry[field] += 1;
}

function firstSeen(map, key, windowMs) {
  const now = Date.now();
  const until = map.get(key);
  if (until && until > now) return false;
  map.set(key, now + windowMs);
  return true;
}

export async function recordImpression(req, token) {
  if (isBot(req)) return;
  const payload = readToken(token);
  if (!payload) return;
  if (!firstSeen(recentImpressions, payload.a + "|" + payload.v, IMPRESSION_DEDUPE_MS)) return;
  const ad = (await getActiveAds()).find((item) => item.id === payload.a);
  if (ad) bump(ad, "impressions");
}

export async function resolveClick(req, token) {
  const payload = readToken(token);
  if (!payload) return null;
  let ad = (await getActiveAds()).find((item) => item.id === payload.a);
  if (!ad) {
    const snap = await db.collection("ads").doc(String(payload.a)).get();
    if (!snap.exists || snap.data().status === "removed") return null;
    ad = { id: snap.id, uid: snap.data().uid, url: snap.data().url };
  }
  if (!isBot(req)) {
    const viewer = await resolveViewer(req);
    const own = viewer.uid && viewer.uid === ad.uid;
    if (!own && firstSeen(recentClicks, payload.a + "|" + payload.v, CLICK_DEDUPE_MS)) bump(ad, "clicks");
  }
  return ad.url;
}

export async function flushAdStats() {
  if (!buffer.size) return;
  const entries = Array.from(buffer.values());
  buffer.clear();
  let done = 0;
  try {
    while (done < entries.length) {
      const chunk = entries.slice(done, done + 200);
      const batch = db.batch();
      for (const e of chunk) {
        batch.set(
          db.collection("adDaily").doc(e.adId + "_" + e.day),
          { adId: e.adId, uid: e.uid, day: e.day, impressions: FieldValue.increment(e.impressions), clicks: FieldValue.increment(e.clicks) },
          { merge: true }
        );
        batch.set(
          db.collection("ads").doc(e.adId),
          { impressions: FieldValue.increment(e.impressions), clicks: FieldValue.increment(e.clicks) },
          { merge: true }
        );
      }
      await batch.commit();
      done += chunk.length;
    }
  } catch (err) {
    console.error("promote stats flush failed:", err && err.message);
    for (const e of entries.slice(done)) {
      const key = e.adId + "|" + e.day;
      const held = buffer.get(key);
      if (held) {
        held.impressions += e.impressions;
        held.clicks += e.clicks;
      } else {
        buffer.set(key, e);
      }
    }
  }
}

setInterval(() => {
  flushAdStats().catch(() => {});
}, FLUSH_INTERVAL_MS).unref();

setInterval(() => {
  const now = Date.now();
  for (const map of [recentImpressions, recentClicks]) {
    for (const [key, until] of map) if (until <= now) map.delete(key);
  }
  for (const [key, entry] of viewerCache) if (entry.exp <= now) viewerCache.delete(key);
}, 2 * 60 * 1000).unref();

function ctrOf(impressions, clicks) {
  return impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
}

export async function listAdsWithStats(uid) {
  const [adSnap, daySnap] = await Promise.all([
    db.collection("ads").where("uid", "==", uid).get(),
    db.collection("adDaily").where("uid", "==", uid).limit(2000).get(),
  ]);

  const days = recentDays(CHART_DAYS);
  const perAd = new Map();
  const touch = (adId, day, impressions, clicks) => {
    let series = perAd.get(adId);
    if (!series) {
      series = new Map();
      perAd.set(adId, series);
    }
    const cur = series.get(day) || { impressions: 0, clicks: 0 };
    cur.impressions += impressions;
    cur.clicks += clicks;
    series.set(day, cur);
  };
  daySnap.forEach((doc) => {
    const d = doc.data();
    touch(d.adId, d.day, d.impressions || 0, d.clicks || 0);
  });
  const unflushed = new Map();
  for (const e of buffer.values()) {
    if (e.uid !== uid) continue;
    touch(e.adId, e.day, e.impressions, e.clicks);
    const held = unflushed.get(e.adId) || { impressions: 0, clicks: 0 };
    held.impressions += e.impressions;
    held.clicks += e.clicks;
    unflushed.set(e.adId, held);
  }

  const now = Date.now();
  const ads = [];
  adSnap.forEach((doc) => {
    const ad = doc.data();
    if (ad.status === "removed") return;
    const extra = unflushed.get(doc.id) || { impressions: 0, clicks: 0 };
    const impressions = (ad.impressions || 0) + extra.impressions;
    const clicks = (ad.clicks || 0) + extra.clicks;
    const series = perAd.get(doc.id) || new Map();
    const live = ad.status === "active" && ad.endsAt > now;
    ads.push({
      id: doc.id,
      title: ad.title,
      body: ad.body,
      cta: ad.cta,
      url: ad.url,
      img: ad.hasImage ? `/api/sp/img/${doc.id}?v=${ad.createdAt}` : null,
      status: ad.status === "draft" ? "draft" : live ? "live" : "ended",
      createdAt: ad.createdAt,
      endsAt: ad.endsAt || null,
      remainingMs: live ? ad.endsAt - now : 0,
      impressions,
      clicks,
      ctr: ctrOf(impressions, clicks),
      spentNgn: Math.round((ad.totalPaidKobo || 0) / 100),
      daily: days.map((day) => {
        const point = series.get(day) || { impressions: 0, clicks: 0 };
        return { day, impressions: point.impressions, clicks: point.clicks };
      }),
    });
  });
  ads.sort((a, b) => b.createdAt - a.createdAt);

  const totals = { impressions: 0, clicks: 0 };
  const daily = days.map((day) => ({ day, impressions: 0, clicks: 0 }));
  let liveCount = 0;
  let spentNgn = 0;
  for (const ad of ads) {
    totals.impressions += ad.impressions;
    totals.clicks += ad.clicks;
    spentNgn += ad.spentNgn;
    if (ad.status === "live") liveCount++;
    ad.daily.forEach((point, i) => {
      daily[i].impressions += point.impressions;
      daily[i].clicks += point.clicks;
    });
  }

  return {
    pricePerDayNgn: AD_PRICE_PER_DAY_NGN,
    minDays: AD_MIN_DAYS,
    maxDays: AD_MAX_DAYS,
    ctaOptions: AD_CTA_OPTIONS,
    summary: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      ctr: ctrOf(totals.impressions, totals.clicks),
      liveCount,
      spentNgn,
      daily,
    },
    ads,
  };
}

const imageCache = new Map();

export async function getAdImage(adId) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(String(adId || ""))) return null;
  const hit = imageCache.get(adId);
  if (hit) return hit;
  const snap = await db.collection("adImages").doc(adId).get();
  if (!snap.exists) return null;
  const buf = Buffer.from(snap.data().data, "base64");
  if (imageCache.size >= IMAGE_CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
  imageCache.set(adId, buf);
  return buf;
}

const ADMIN_LIST_LIMIT = 500;
const ADMIN_CHART_DAYS = 30;

function statusOf(ad, now) {
  if (ad.status === "removed") return "removed";
  if (ad.status === "draft") return "draft";
  return ad.status === "active" && ad.endsAt > now ? "live" : "ended";
}

function unflushedByAd() {
  const map = new Map();
  for (const e of buffer.values()) {
    const held = map.get(e.adId) || { impressions: 0, clicks: 0 };
    held.impressions += e.impressions;
    held.clicks += e.clicks;
    map.set(e.adId, held);
  }
  return map;
}

async function ownersFor(uids) {
  const owners = new Map();
  await Promise.all(
    Array.from(new Set(uids)).map(async (uid) => {
      try {
        const profile = await getUserProfile(uid);
        owners.set(uid, { username: (profile && profile.username) || null, email: (profile && profile.email) || null });
      } catch {
        owners.set(uid, { username: null, email: null });
      }
    })
  );
  return owners;
}

function adminRow(id, ad, owner, held, now) {
  const impressions = (ad.impressions || 0) + held.impressions;
  const clicks = (ad.clicks || 0) + held.clicks;
  const status = statusOf(ad, now);
  return {
    id,
    uid: ad.uid,
    owner: owner || { username: null, email: null },
    title: ad.title,
    body: ad.body,
    cta: ad.cta,
    url: ad.url,
    img: ad.hasImage ? `/api/sp/img/${id}?v=${ad.createdAt}` : null,
    status,
    createdAt: ad.createdAt,
    startsAt: ad.startsAt || null,
    endsAt: ad.endsAt || null,
    remainingMs: status === "live" ? ad.endsAt - now : 0,
    impressions,
    clicks,
    ctr: ctrOf(impressions, clicks),
    totalDays: ad.totalDays || 0,
    spentNgn: Math.round((ad.totalPaidKobo || 0) / 100),
  };
}

export async function adminListAds() {
  const snap = await db.collection("ads").orderBy("createdAt", "desc").limit(ADMIN_LIST_LIMIT).get();
  const now = Date.now();
  const held = unflushedByAd();
  const owners = await ownersFor(snap.docs.map((doc) => doc.data().uid));
  const ads = snap.docs.map((doc) => {
    const ad = doc.data();
    return adminRow(doc.id, ad, owners.get(ad.uid), held.get(doc.id) || { impressions: 0, clicks: 0 }, now);
  });

  const summary = { live: 0, ended: 0, draft: 0, removed: 0, impressions: 0, clicks: 0, revenueNgn: 0 };
  for (const ad of ads) {
    summary[ad.status] += 1;
    summary.impressions += ad.impressions;
    summary.clicks += ad.clicks;
    summary.revenueNgn += ad.spentNgn;
  }
  summary.ctr = ctrOf(summary.impressions, summary.clicks);
  return { summary, ads };
}

export async function adminAdDetail(adId) {
  const id = String(adId || "");
  const snap = await db.collection("ads").doc(id).get();
  if (!snap.exists) throw fail("Ad not found.", 404);
  const ad = snap.data();
  const [daySnap, owners] = await Promise.all([
    db.collection("adDaily").where("adId", "==", id).limit(400).get(),
    ownersFor([ad.uid]),
  ]);

  const series = new Map();
  daySnap.forEach((doc) => {
    const d = doc.data();
    series.set(d.day, { impressions: d.impressions || 0, clicks: d.clicks || 0 });
  });
  const held = { impressions: 0, clicks: 0 };
  for (const e of buffer.values()) {
    if (e.adId !== id) continue;
    held.impressions += e.impressions;
    held.clicks += e.clicks;
    const cur = series.get(e.day) || { impressions: 0, clicks: 0 };
    cur.impressions += e.impressions;
    cur.clicks += e.clicks;
    series.set(e.day, cur);
  }

  const row = adminRow(id, ad, owners.get(ad.uid), held, Date.now());
  const daily = recentDays(ADMIN_CHART_DAYS).map((day) => {
    const point = series.get(day) || { impressions: 0, clicks: 0 };
    return { day, impressions: point.impressions, clicks: point.clicks };
  });
  const activeDays = daily.filter((d) => d.impressions > 0).length;
  return { ad: row, daily, activeDays };
}

export async function adminRemoveAd(adId) {
  const ref = db.collection("ads").doc(String(adId || ""));
  const snap = await ref.get();
  if (!snap.exists) throw fail("Ad not found.", 404);
  await ref.update({ status: "removed", removedAt: Date.now() });
  activeCache.at = 0;
  await addNotification(snap.data().uid, "ad_removed", `Your ad "${snap.data().title}" was removed for breaking the advertising rules.`, { adId });
}
