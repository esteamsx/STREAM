import fs from "fs";
import path from "path";
import crypto from "crypto";
import { db } from "../config/firebase.js";

const STORE_FILE = path.join(process.cwd(), ".analytics-daily.json");
const MAX_DAYS_STORED = 400;
const FIRESTORE_DOC = db.collection("analyticsStore").doc("daily");

const VISITOR_COOKIE = "esv";
const VISITOR_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60 * 1000;

const SKIP_PREFIXES = ["/api/", "/public/", "/uploads/", "/embed/", "/favicon", "/sw.js", "/robots.txt", "/sitemap", "/health"];
const ASSET_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|map|json|xml|txt)$/i;

const hourly = new Map();
let dailyStore = null;
let storeLoadPromise = null;

function hourKeyFor(ts) {
  const d = new Date(ts);
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
    String(d.getUTCDate()).padStart(2, "0") + "T" + String(d.getUTCHours()).padStart(2, "0");
}
function dayKeyFor(ts) {
  return hourKeyFor(ts).slice(0, 10);
}

function getOrCreateHourBucket(hourKey) {
  let bucket = hourly.get(hourKey);
  if (!bucket) {
    bucket = { views: 0, visitorIds: new Set(), paths: new Map() };
    hourly.set(hourKey, bucket);
  }
  return bucket;
}

function readLocalFile() {
  try {
    if (!fs.existsSync(STORE_FILE)) return null;
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch (err) {
    return null;
  }
}
function writeLocalFile(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store));
  } catch (err) {
  }
}

async function ensureStoreLoaded() {
  if (dailyStore) return dailyStore;
  if (storeLoadPromise) return storeLoadPromise;
  storeLoadPromise = (async () => {
    const local = readLocalFile();
    if (local) {
      dailyStore = local;
      return dailyStore;
    }
    try {
      const snap = await FIRESTORE_DOC.get();
      dailyStore = snap.exists ? (snap.data().days || {}) : {};
    } catch (err) {
      console.error("[analytics] could not load daily store from Firestore:", err.message);
      dailyStore = {};
    }
    writeLocalFile(dailyStore);
    return dailyStore;
  })();
  return storeLoadPromise;
}

async function persistStore(store) {
  writeLocalFile(store);
  try {
    await FIRESTORE_DOC.set({ days: store, updatedAt: Date.now() });
  } catch (err) {
    console.error("[analytics] could not persist daily store to Firestore:", err.message);
  }
}

function normalizePath(p) {
  return p.replace(/\/[0-9a-fA-F]{16,}/g, "/:id").replace(/\/\d{4,}/g, "/:id");
}

function trackPageView(req, res, next) {
  try {
    if (req.method === "GET") {
      const p = req.path || "/";
      if (!SKIP_PREFIXES.some((pre) => p.startsWith(pre)) && !ASSET_EXT.test(p)) {
        let visitorId = req.cookies && req.cookies[VISITOR_COOKIE];
        if (!visitorId) {
          visitorId = crypto.randomBytes(16).toString("hex");
          res.cookie(VISITOR_COOKIE, visitorId, {
            maxAge: VISITOR_COOKIE_MAX_AGE,
            httpOnly: true,
            sameSite: "lax",
          });
        }
        const now = Date.now();
        const bucket = getOrCreateHourBucket(hourKeyFor(now));
        bucket.views++;
        bucket.visitorIds.add(visitorId);
        const key = normalizePath(p);
        bucket.paths.set(key, (bucket.paths.get(key) || 0) + 1);
      }
    }
  } catch (err) {
  }
  next();
}

async function flushCompletedDays() {
  try {
    const store = await ensureStoreLoaded();
    const now = Date.now();
    const currentDayKey = dayKeyFor(now);
    const currentHourKey = hourKeyFor(now);
    let changed = false;

    const byDay = new Map();
    for (const [hourKey, bucket] of hourly) {
      const dayKey = hourKey.slice(0, 10);
      if (!byDay.has(dayKey)) byDay.set(dayKey, []);
      byDay.get(dayKey).push([hourKey, bucket]);
    }

    for (const [dayKey, entries] of byDay) {
      if (dayKey === currentDayKey) continue;
      let views = 0;
      const visitorIds = new Set();
      const pathTotals = new Map();
      for (const [, bucket] of entries) {
        views += bucket.views;
        for (const id of bucket.visitorIds) visitorIds.add(id);
        for (const [p, c] of bucket.paths) pathTotals.set(p, (pathTotals.get(p) || 0) + c);
      }
      const topPaths = [...pathTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([p, count]) => ({ path: p, count }));
      const existing = store[dayKey];
      if (existing) {
        existing.views += views;
        existing.uniqueVisitors += visitorIds.size;
      } else {
        store[dayKey] = { views, uniqueVisitors: visitorIds.size, topPaths };
      }
      changed = true;
      for (const [hourKey] of entries) hourly.delete(hourKey);
    }

    const cutoff = now - 48 * 60 * 60 * 1000;
    for (const [hourKey] of hourly) {
      if (hourKey === currentHourKey) continue;
      const bucketTime = Date.parse(hourKey + ":00:00Z");
      if (bucketTime < cutoff) hourly.delete(hourKey);
    }

    if (changed) {
      const keys = Object.keys(store).sort();
      if (keys.length > MAX_DAYS_STORED) {
        for (const k of keys.slice(0, keys.length - MAX_DAYS_STORED)) delete store[k];
      }
      await persistStore(store);
    }
  } catch (err) {
    console.error("[analytics] flush failed:", err.message);
  }
}

setInterval(() => {
  flushCompletedDays().catch(() => {});
}, 5 * 60 * 1000).unref();

async function getAnalytics(range) {
  await flushCompletedDays();
  const store = dailyStore || {};
  const now = Date.now();

  if (range === "24h") {
    const points = [];
    let totalViews = 0;
    const unionVisitors = new Set();
    for (let i = 23; i >= 0; i--) {
      const t = now - i * 60 * 60 * 1000;
      const hourKey = hourKeyFor(t);
      const bucket = hourly.get(hourKey);
      const views = bucket ? bucket.views : 0;
      totalViews += views;
      if (bucket) for (const id of bucket.visitorIds) unionVisitors.add(id);
      points.push({ label: new Date(t).toISOString(), views, visitors: bucket ? bucket.visitorIds.size : 0 });
    }
    const pathTotals = new Map();
    for (const [, bucket] of hourly) {
      for (const [p, c] of bucket.paths) pathTotals.set(p, (pathTotals.get(p) || 0) + c);
    }
    const topPaths = [...pathTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([p, count]) => ({ path: p, count }));
    return { points, totals: { views: totalViews, visitors: unionVisitors.size }, topPaths };
  }

  const daysMap = { "7d": 7, "30d": 30, "60d": 60, "180d": 180 };
  const todayKey = dayKeyFor(now);
  let todayViews = 0;
  const todayVisitors = new Set();
  const todayPaths = new Map();
  for (const [hourKey, bucket] of hourly) {
    if (hourKey.slice(0, 10) !== todayKey) continue;
    todayViews += bucket.views;
    for (const id of bucket.visitorIds) todayVisitors.add(id);
    for (const [p, c] of bucket.paths) todayPaths.set(p, (todayPaths.get(p) || 0) + c);
  }

  let dayKeys;
  if (range === "lifetime") {
    dayKeys = Object.keys(store).sort();
    if (!dayKeys.includes(todayKey)) dayKeys.push(todayKey);
  } else {
    const n = daysMap[range] || 30;
    dayKeys = [];
    for (let i = n - 1; i >= 0; i--) {
      dayKeys.push(dayKeyFor(now - i * 24 * 60 * 60 * 1000));
    }
  }

  const points = [];
  let totalViews = 0;
  let totalVisitors = 0;
  const pathTotals = new Map();
  for (const dayKey of dayKeys) {
    let views = 0;
    let visitors = 0;
    let dayPaths = null;
    if (dayKey === todayKey) {
      views = todayViews;
      visitors = todayVisitors.size;
      dayPaths = todayPaths;
    } else if (store[dayKey]) {
      views = store[dayKey].views;
      visitors = store[dayKey].uniqueVisitors;
      dayPaths = new Map((store[dayKey].topPaths || []).map((p) => [p.path, p.count]));
    }
    totalViews += views;
    totalVisitors += visitors;
    if (dayPaths) for (const [p, c] of dayPaths) pathTotals.set(p, (pathTotals.get(p) || 0) + c);
    points.push({ label: dayKey, views, visitors });
  }

  const topPaths = [...pathTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([p, count]) => ({ path: p, count }));

  return { points, totals: { views: totalViews, visitors: totalVisitors }, topPaths };
}

export { trackPageView, getAnalytics };
