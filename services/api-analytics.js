import crypto from "crypto";

const API_TYPES = ["developer", "livetv"];
const API_PRODUCTS = { developer: "devapi", livetv: "livetv" };
const DAILY_SHARDS = 8;
const MAX_RANGE_DAYS = 90;
const PAGE_SIZE = 25;
const ROLLUP_READ_LIMIT = MAX_RANGE_DAYS * DAILY_SHARDS * API_TYPES.length;

function utcDateKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeRange(range, now) {
  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const current = new Date(now);
  const startAt = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - days + 1);
  const rollupStartAt = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - MAX_RANGE_DAYS + 1);
  return {
    range: `${days}d`,
    today: utcDateKey(now),
    startAt,
    startDate: utcDateKey(startAt),
    rollupStartAt,
    rollupStartDate: utcDateKey(rollupStartAt),
    endAt: now,
  };
}

function apiTypeForPath(path) {
  if (path.startsWith("/api/v1/dev/")) return "developer";
  if (path === "/api/v1/channels" || path.startsWith("/api/v1/stream/")) return "livetv";
  return null;
}

function endpointFallback(path, api) {
  if (api === "developer") return "/api/v1/dev/:unmatched";
  if (path === "/api/v1/channels") return "/api/v1/channels";
  return "/api/v1/stream/:channel";
}

function safeRoutePath(req, path, api) {
  const routePath = req.route && typeof req.route.path === "string" ? req.route.path : "";
  if (routePath.startsWith("/api/v1/") && routePath.length <= 180 && !/[?\r\n]/.test(routePath)) return routePath;
  return endpointFallback(path, api);
}

function emptyMetrics() {
  return { requests: 0, successful: 0, failed: 0, errorRate: 0, coinsSpent: 0, coinsRefunded: 0, netCoinsSpent: 0, coinsEarned: 0, requestPackPurchases: 0 };
}

function markCoinMetricsUnavailable(metrics) {
  metrics.coinsSpent = null;
  metrics.coinsRefunded = null;
  metrics.netCoinsSpent = null;
  metrics.coinsEarned = null;
  metrics.requestPackPurchases = null;
}

function finishMetrics(metrics) {
  metrics.errorRate = metrics.requests ? Math.round((metrics.failed / metrics.requests) * 10000) / 100 : 0;
  return metrics;
}

function addCounts(target, source) {
  target.requests += Number(source.requests) || 0;
  target.successful += Number(source.successful) || 0;
  target.failed += Number(source.failed) || 0;
}

function makeApiMap() {
  return { developer: emptyMetrics(), livetv: emptyMetrics() };
}

function makeCoinDay() {
  return { developer: 0, livetv: 0, developerRefunded: 0, livetvRefunded: 0, developerEarned: 0, livetvEarned: 0, developerPurchases: 0, livetvPurchases: 0 };
}

function makeDateMap(startDate, endDate) {
  const out = new Map();
  let cursor = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  while (cursor <= end) {
    out.set(utcDateKey(cursor), makeApiMap());
    cursor += 24 * 60 * 60 * 1000;
  }
  return out;
}

function addCoinTransaction(coinByDate, api, timestamp, amount, isRefund) {
  amount = Math.max(0, Math.round(Number(amount) || 0));
  if (!amount) return;
  const date = utcDateKey(timestamp);
  const day = coinByDate.get(date) || makeCoinDay();
  if (isRefund) day[`${api}Refunded`] += amount;
  else {
    day[api] += amount;
    day[`${api}Purchases`] += 1;
  }
  coinByDate.set(date, day);
}

async function queryCoinPackSpend(db, api, startAt, endAt, coinByDate) {
  const product = API_PRODUCTS[api];
  const pageSize = 250;
  const totals = { coinsSpent: 0, coinsRefunded: 0, purchases: 0, refunds: 0 };
  for (const type of ["store_redeem", "store_refund"]) {
    const baseQuery = db.collectionGroup("coinLedger")
      .where("type", "==", type)
      .where("meta.product", "==", product)
      .where("timestamp", ">=", startAt)
      .where("timestamp", "<=", endAt)
      .orderBy("timestamp", "desc");
    let cursor = null;
    while (true) {
      let page = baseQuery.limit(pageSize);
      if (cursor) page = page.startAfter(cursor);
      const snapshot = await page.get();
      for (const doc of snapshot.docs) {
        const entry = doc.data() || {};
        const delta = Number(entry.delta) || 0;
        const isRefund = type === "store_refund";
        const amount = isRefund ? Math.max(0, delta) : Math.max(0, -delta);
        if (!amount) continue;
        if (isRefund) {
          totals.coinsRefunded += amount;
          totals.refunds += 1;
        } else {
          totals.coinsSpent += amount;
          totals.purchases += 1;
        }
        addCoinTransaction(coinByDate, api, Number(entry.timestamp) || 0, amount, isRefund);
      }
      if (snapshot.docs.length < pageSize) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
  }
  totals.netCoinsSpent = totals.coinsSpent - totals.coinsRefunded;
  return totals;
}

async function queryApiCoinIncome(db, api, startAt, endAt, coinByDate) {
  const baseQuery = db.collectionGroup("coinLedger")
    .where("type", "==", "channel_react_income")
    .where("meta.source", "==", "api_request_limit")
    .where("meta.product", "==", API_PRODUCTS[api])
    .where("timestamp", ">=", startAt)
    .where("timestamp", "<=", endAt)
    .orderBy("timestamp", "desc");
  let cursor = null;
  let coinsEarned = 0;
  const pageSize = 250;
  while (true) {
    let page = baseQuery.limit(pageSize);
    if (cursor) page = page.startAfter(cursor);
    const snapshot = await page.get();
    for (const doc of snapshot.docs) {
      const entry = doc.data() || {};
      const delta = Math.max(0, Number(entry.delta) || 0);
      coinsEarned += delta;
      const date = utcDateKey(Number(entry.timestamp) || 0);
      const day = coinByDate.get(date) || makeCoinDay();
      day[`${api}Earned`] += delta;
      coinByDate.set(date, day);
    }
    if (snapshot.docs.length < pageSize) break;
    cursor = snapshot.docs[snapshot.docs.length - 1];
  }
  return coinsEarned;
}

async function persistApiEvent(db, event) {
  const eventRef = db.collection("apiRequestEvents").doc(event.id);
  const aggregateRef = db.collection("apiAnalyticsDaily").doc(`${event.date}_${event.api}_${event.shard}`);
  const errorRef = event.failed ? db.collection("apiRequestErrors").doc(event.id) : null;
  const metaRef = db.collection("apiAnalyticsMeta").doc("tracking");
  await db.runTransaction(async (tx) => {
    const [existing, aggregate, meta] = await Promise.all([
      tx.get(eventRef),
      tx.get(aggregateRef),
      tx.get(metaRef),
    ]);
    if (existing.exists) return;
    const previous = aggregate.exists ? aggregate.data() || {} : {};
    const endpointCounts = { ...(previous.endpointCounts || {}) };
    const endpoint = endpointCounts[event.endpoint] || { requests: 0, successful: 0, failed: 0 };
    endpoint.requests += 1;
    if (event.successful) endpoint.successful += 1;
    if (event.failed) endpoint.failed += 1;
    endpointCounts[event.endpoint] = endpoint;

    tx.create(eventRef, event);
    if (errorRef) tx.create(errorRef, event);
    tx.set(aggregateRef, {
      date: event.date,
      api: event.api,
      shard: event.shard,
      requests: (Number(previous.requests) || 0) + 1,
      successful: (Number(previous.successful) || 0) + (event.successful ? 1 : 0),
      failed: (Number(previous.failed) || 0) + (event.failed ? 1 : 0),
      endpointCounts,
      updatedAt: event.at,
    }, { merge: true });
    if (!meta.exists) tx.create(metaRef, { trackingStartedAt: event.at });
  });
}

export function createApiAnalyticsMiddleware(db, { now = () => Date.now(), randomShard = () => crypto.randomInt(DAILY_SHARDS), onError = (err) => console.warn("[api-analytics] event write failed", err && err.message) } = {}) {
  return function apiAnalyticsMiddleware(req, res, next) {
    const path = String(req.path || req.originalUrl || "").split("?")[0];
    const api = apiTypeForPath(path);
    if (!api || req.__apiAnalyticsTracked) return next();
    req.__apiAnalyticsTracked = true;
    const startedAt = now();
    const id = crypto.randomUUID().replace(/-/g, "");
    let finished = false;
    const record = (aborted = false) => {
      if (finished) return;
      finished = true;
      const at = now();
      const status = aborted ? 499 : (Number(res.statusCode) || 0);
      const successful = status >= 200 && status < 400;
      const failed = status >= 400;
      const event = {
        id,
        at,
        date: utcDateKey(at),
        api,
        method: String(req.method || "GET").slice(0, 8),
        endpoint: safeRoutePath(req, path, api),
        status,
        successful,
        failed,
        durationMs: Math.max(0, Math.min(10 * 60 * 1000, at - startedAt)),
        shard: randomShard(),
      };
      persistApiEvent(db, event).catch(onError);
    };
    res.once("finish", () => record(false));
    res.once("close", () => {
      if (!res.writableFinished) record(true);
    });
    next();
  };
}

export async function getApiActivityPage(db, { range = "30d", cursor = null, now = Date.now(), pageSize = PAGE_SIZE } = {}) {
  const normalized = normalizeRange(range, now);
  const limit = Math.max(1, Math.min(PAGE_SIZE, Math.floor(Number(pageSize) || PAGE_SIZE)));
  let query = db.collection("apiRequestEvents")
    .where("at", ">=", normalized.startAt)
    .where("at", "<=", now)
    .orderBy("at", "desc");
  if (typeof cursor === "string" && /^[a-f0-9]{32}$/.test(cursor)) {
    const cursorSnapshot = await db.collection("apiRequestEvents").doc(cursor).get();
    if (cursorSnapshot.exists) query = query.startAfter(cursorSnapshot);
  }
  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
  const events = docs.map((doc) => {
    const event = doc.data() || {};
    return { id: doc.id, at: Number(event.at) || 0, api: event.api, method: event.method, endpoint: event.endpoint, status: Number(event.status) || 0, successful: !!event.successful, failed: !!event.failed, durationMs: Number(event.durationMs) || 0 };
  });
  return { events, nextCursor: hasMore && docs.length ? docs[docs.length - 1].id : null };
}

async function getRecentErrors(db, startAt, now, limit = 15) {
  const snapshot = await db.collection("apiRequestErrors")
    .where("at", ">=", startAt)
    .where("at", "<=", now)
    .orderBy("at", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((doc) => {
    const event = doc.data() || {};
    return { at: Number(event.at) || 0, api: event.api, method: event.method, endpoint: event.endpoint, status: Number(event.status) || 0, durationMs: Number(event.durationMs) || 0 };
  });
}

export async function getApiAnalytics(db, { range = "30d", activityCursor = null, now = Date.now() } = {}) {
  const normalized = normalizeRange(range, now);
  const dailySnapshot = await db.collection("apiAnalyticsDaily")
    .where("date", ">=", normalized.rollupStartDate)
    .where("date", "<=", normalized.today)
    .limit(ROLLUP_READ_LIMIT)
    .get();
  const dates = makeDateMap(normalized.rollupStartDate, normalized.today);
  for (const doc of dailySnapshot.docs) {
    const value = doc.data() || {};
    const api = API_TYPES.includes(value.api) ? value.api : null;
    const day = dates.get(String(value.date || ""));
    if (api && day) addCounts(day[api], value);
  }

  const coinByDate = new Map();
  const coinReadResults = await Promise.allSettled([
    queryCoinPackSpend(db, "developer", normalized.rollupStartAt, normalized.endAt, coinByDate),
    queryCoinPackSpend(db, "livetv", normalized.rollupStartAt, normalized.endAt, coinByDate),
    queryApiCoinIncome(db, "developer", normalized.rollupStartAt, normalized.endAt, coinByDate),
    queryApiCoinIncome(db, "livetv", normalized.rollupStartAt, normalized.endAt, coinByDate),
  ]);
  const coinLedgerAvailable = coinReadResults.every((result) => result.status === "fulfilled");
  let coinLedgerNote = "Request-pack totals only; no per-call coin charge.";
  if (!coinLedgerAvailable) {
    coinByDate.clear();
    const failures = coinReadResults.filter((result) => result.status === "rejected").map((result) => result.reason);
    const missingIndex = failures.some((error) => /failed_precondition/i.test(String(error && error.code || "")) || /index/i.test(String(error && error.message || "")));
    coinLedgerNote = missingIndex
      ? "Coin totals unavailable; deploy the coinLedger composite indexes from firestore.indexes.json."
      : "Coin totals unavailable; a Firestore ledger query failed.";
    console.error("[api-analytics] coin ledger aggregation unavailable", failures.map((error) => error && (error.code || error.message) || "unknown error").join("; "));
  }

  const rangeFromDate = normalized.startDate;
  const todayDate = normalized.today;
  const periodStats = (fromDate, toDate) => {
    const result = makeApiMap();
    for (const [date, day] of dates.entries()) {
      if (date < fromDate || date > toDate) continue;
      for (const api of API_TYPES) addCounts(result[api], day[api]);
    }
    const coinDates = [...coinByDate.entries()].filter(([date]) => date >= fromDate && date <= toDate);
    for (const api of API_TYPES) {
      result[api].coinsSpent = coinDates.reduce((sum, [, value]) => sum + value[api], 0);
      result[api].coinsRefunded = coinDates.reduce((sum, [, value]) => sum + value[`${api}Refunded`], 0);
      result[api].netCoinsSpent = result[api].coinsSpent - result[api].coinsRefunded;
      result[api].coinsEarned = coinDates.reduce((sum, [, value]) => sum + value[`${api}Earned`], 0);
      result[api].requestPackPurchases = coinDates.reduce((sum, [, value]) => sum + value[`${api}Purchases`], 0);
      finishMetrics(result[api]);
    }
    const combined = emptyMetrics();
    addCounts(combined, result.developer);
    addCounts(combined, result.livetv);
    combined.coinsSpent = result.developer.coinsSpent + result.livetv.coinsSpent;
    combined.coinsRefunded = result.developer.coinsRefunded + result.livetv.coinsRefunded;
    combined.netCoinsSpent = combined.coinsSpent - combined.coinsRefunded;
    combined.coinsEarned = result.developer.coinsEarned + result.livetv.coinsEarned;
    combined.requestPackPurchases = result.developer.requestPackPurchases + result.livetv.requestPackPurchases;
    finishMetrics(combined);
    return { ...result, combined };
  };

  const selected = periodStats(rangeFromDate, todayDate);
  const current = new Date(now);
  const weekStartDate = utcDateKey(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - ((current.getUTCDay() + 6) % 7)));
  const monthStartDate = `${todayDate.slice(0, 7)}-01`;
  const currentDay = periodStats(todayDate, todayDate);
  const currentWeek = periodStats(weekStartDate, todayDate);
  const currentMonth = periodStats(monthStartDate, todayDate);
  if (!coinLedgerAvailable) {
    for (const period of [selected, currentDay, currentWeek, currentMonth]) {
      for (const api of API_TYPES) markCoinMetricsUnavailable(period[api]);
      markCoinMetricsUnavailable(period.combined);
    }
  }

  const series = [];
  for (const [date, day] of dates.entries()) {
    if (date < rangeFromDate || date > todayDate) continue;
    const coins = coinByDate.get(date) || makeCoinDay();
    series.push({
      date,
      developer: day.developer.requests,
      livetv: day.livetv.requests,
      total: day.developer.requests + day.livetv.requests,
      developerCoins: coinLedgerAvailable ? coins.developer : null,
      livetvCoins: coinLedgerAvailable ? coins.livetv : null,
      developerCoinRefunds: coinLedgerAvailable ? coins.developerRefunded : null,
      livetvCoinRefunds: coinLedgerAvailable ? coins.livetvRefunded : null,
      developerCoinsEarned: coinLedgerAvailable ? coins.developerEarned : null,
      livetvCoinsEarned: coinLedgerAvailable ? coins.livetvEarned : null,
    });
  }

  const topEndpoints = { developer: [], livetv: [] };
  for (const api of API_TYPES) {
    const endpoints = new Map();
    for (const doc of dailySnapshot.docs) {
      const value = doc.data() || {};
      const date = String(value.date || "");
      if (value.api !== api || date < rangeFromDate || date > todayDate) continue;
      for (const [endpoint, counts] of Object.entries(value.endpointCounts || {})) {
        const prior = endpoints.get(endpoint) || { requests: 0, successful: 0, failed: 0 };
        addCounts(prior, counts || {});
        endpoints.set(endpoint, prior);
      }
    }
    topEndpoints[api] = [...endpoints.entries()]
      .map(([endpoint, metrics]) => ({ endpoint, ...finishMetrics(metrics) }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 8);
  }

  const [activityResult, errorsResult, metaResult] = await Promise.allSettled([
    getApiActivityPage(db, { range: normalized.range, cursor: activityCursor, now }),
    getRecentErrors(db, normalized.startAt, now),
    db.collection("apiAnalyticsMeta").doc("tracking").get(),
  ]);
  const activity = activityResult.status === "fulfilled" ? activityResult.value : { events: [], nextCursor: null };
  const recentErrors = errorsResult.status === "fulfilled" ? errorsResult.value : [];
  const metaSnapshot = metaResult.status === "fulfilled" ? metaResult.value : null;
  const trackingStartedAt = metaSnapshot && metaSnapshot.exists ? Number((metaSnapshot.data() || {}).trackingStartedAt) || null : null;
  const apis = {
    developer: { ...selected.developer, today: currentDay.developer, week: currentWeek.developer, month: currentMonth.developer },
    livetv: { ...selected.livetv, today: currentDay.livetv, week: currentWeek.livetv, month: currentMonth.livetv },
  };

  return {
    range: normalized.range,
    rangeStart: normalized.startAt,
    rangeEnd: normalized.endAt,
    trackingStartedAt,
    historyNotice: "Tracking starts with this rollout; earlier request history is unavailable.",
    historicalRequestDataAvailable: false,
    totals: selected.combined,
    apis,
    periods: {
      today: { label: "Today (UTC)", ...currentDay.combined },
      week: { label: "This week (UTC)", ...currentWeek.combined },
      month: { label: "This month (UTC)", ...currentMonth.combined },
    },
    series,
    topEndpoints,
    recentErrors,
    activity: activity.events,
    nextActivityCursor: activity.nextCursor,
    activityAvailable: activityResult.status === "fulfilled",
    errorsAvailable: errorsResult.status === "fulfilled",
    coinAccounting: {
      available: coinLedgerAvailable,
      developerRequestPackPurchases: selected.developer.requestPackPurchases,
      livetvRequestPackPurchases: selected.livetv.requestPackPurchases,
      developerRequestPackCoinsRefunded: selected.developer.coinsRefunded,
      livetvRequestPackCoinsRefunded: selected.livetv.coinsRefunded,
      developerAdminCoinsEarned: selected.developer.coinsEarned,
      livetvAdminCoinsEarned: selected.livetv.coinsEarned,
      historicalAdminApiCoinIncomeAvailable: false,
      directPerRequestCoinCharges: 0,
      note: coinLedgerNote,
    },
  };
}
