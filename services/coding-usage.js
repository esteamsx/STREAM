// COD\NG usage limits and accounting.
//
// COD\NG has its own plan catalog and paid entitlements. Its tier names/prices
// mirror the API pages today, but its allowances and counters are independent
// (Firestore `codingUsage`), so product usage never collides.
//
// This module is intentionally free of imports from services/auth.js so it can be
// unit-tested without Firebase. Names and prices are merged in by routes/coding.js.

export const CODING_PLAN_ORDER = Object.freeze(["free", "starter", "standard", "pro", "max"]);
export const CODING_PLAN_DEFS = Object.freeze({
  free: Object.freeze({ name: "Free", priceNgn: 0, note: "Default plan" }),
  starter: Object.freeze({ name: "Starter", priceNgn: 0, note: "Auto with account verification" }),
  standard: Object.freeze({ name: "Standard", priceNgn: 7500, note: "30 days" }),
  pro: Object.freeze({ name: "Pro", priceNgn: 13500, note: "30 days", highlight: true }),
  max: Object.freeze({ name: "Max", priceNgn: 20500, note: "30 days" }),
});
export const CODING_PURCHASABLE_PLAN_KEYS = Object.freeze(["standard", "pro", "max"]);

// ---- Cost basis -----------------------------------------------------------------
// One credit = one simple request on the cheapest model (DeepSeek V4.1 Flash).
// Assumed blended upstream cost per credit, in NGN. Re-tune this one number if the
// AI service pricing changes; every allowance below is checked against it in tests.
export const CODING_CREDIT_COST_NGN = 5;
// Fully using a paid plan's monthly allowance may cost at most this share of the
// plan price, so heavy users stay profitable.
export const CODING_COST_BUDGET_RATIO = 0.3;

// Monthly allowance targets (cost <= 30% of the plan price):
//   standard NGN 7,500  -> 450 credits  (NGN 2,250)
//   pro      NGN 13,500 -> 800 credits  (NGN 4,000)
//   max      NGN 20,500 -> 1,200 credits (NGN 6,000)
//   starter  (included with Premium, NGN 4,800) -> 250 credits (NGN 1,250)
//   free     -> 40 credits (NGN 200, cheaper models only)
// Daily / weekly follow the same ratios as the Movie API plans (daily ~10%,
// weekly ~50% of monthly) so a user cannot burn a month in a day.
export const CODING_PLAN_CREDITS = Object.freeze({
  free: Object.freeze({ daily: 5, weekly: 20, monthly: 40 }),
  starter: Object.freeze({ daily: 25, weekly: 125, monthly: 250 }),
  standard: Object.freeze({ daily: 45, weekly: 225, monthly: 450 }),
  pro: Object.freeze({ daily: 80, weekly: 400, monthly: 800 }),
  max: Object.freeze({ daily: 120, weekly: 600, monthly: 1200 }),
});

// ---- Models ---------------------------------------------------------------------
export const CODING_PREMIUM_MODEL_IDS = Object.freeze(["claude-fable-5-2"]);
export const CODING_FREE_DEFAULT_MODEL_ID = "deepseek-v4-1-flash-1017";
export const CODING_MODEL_CREDIT_MULTIPLIER = Object.freeze({
  "deepseek-v4-1-flash-1017": 1,
  "gpt-6-astra": 1.5,
  "claude-fable-5-2": 3,
});
const DEFAULT_MULTIPLIER = 2;

export function isPremiumCodingModel(modelId) {
  return CODING_PREMIUM_MODEL_IDS.includes(String(modelId || ""));
}

// ---- Weighted consumption -------------------------------------------------------
export const CODING_MAX_UNITS = 10;
export const CODING_COMMAND_CREDITS = 2;

/**
 * Weighted credit cost of one request.
 * units  = complexity (1 simple ... CODING_MAX_UNITS)
 * credits = ceil(units * modelMultiplier), never below 1.
 */
export function calculateCodingCredits(input = {}) {
  const n = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  const messageChars = n(input.messageChars);
  const historyChars = n(input.historyChars);
  const attachmentCount = Math.floor(n(input.attachmentCount));
  const attachmentBytes = n(input.attachmentBytes);
  const outputChars = n(input.outputChars);
  let units = 1;
  // Long prompt
  if (messageChars > 6000) units += 2; else if (messageChars > 1500) units += 1;
  // Long conversation context
  if (historyChars > 60000) units += 2; else if (historyChars > 20000) units += 1;
  // File analysis
  if (attachmentCount > 0) {
    units += Math.min(3, attachmentCount);
    if (attachmentBytes > 200 * 1024) units += 1;
    if (attachmentBytes > 2 * 1024 * 1024) units += 1;
    if (input.hasArchive === true) units += 1;
  }
  // Tool-heavy: repository context
  if (input.repositoryContext === true) units += 2;
  // Long output
  if (outputChars > 20000) units += 3; else if (outputChars > 8000) units += 2; else if (outputChars > 2000) units += 1;
  units = Math.min(units, CODING_MAX_UNITS);
  const multiplier = CODING_MODEL_CREDIT_MULTIPLIER[String(input.modelId || "")] ?? DEFAULT_MULTIPLIER;
  return { units, multiplier, credits: Math.max(1, Math.ceil(units * multiplier)) };
}

// ---- Plans ----------------------------------------------------------------------
export function resolveCodingPlanKey(...planKeys) {
  let best = 0;
  for (const key of planKeys) {
    const rank = CODING_PLAN_ORDER.indexOf(String(key || ""));
    if (rank > best) best = rank;
  }
  return CODING_PLAN_ORDER[best];
}

export function resolveCodingPlanForProfile(profile = {}, { now = Date.now(), verifiedActive = false, admin = false } = {}) {
  if (admin) return "max";
  const paidPlanActive = CODING_PURCHASABLE_PLAN_KEYS.includes(profile.codingPlanPaid)
    && Number(profile.codingPlanExpiresAt) > now;
  return resolveCodingPlanKey(paidPlanActive ? profile.codingPlanPaid : "free", verifiedActive ? "starter" : "free");
}

export function getCodingPlanLimits(planKey) {
  return CODING_PLAN_CREDITS[planKey] || CODING_PLAN_CREDITS.free;
}

// ---- Periods (same UTC day / ISO-Monday week / month keys as the Movie API) ------
export function getCodingPeriodKeys(now = new Date()) {
  const date = new Date(now);
  const day = date.toISOString().slice(0, 10);
  const year = date.getUTCFullYear();
  const weekStart = new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate()));
  const weekday = weekStart.getUTCDay() || 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - weekday + 1);
  return { day, week: weekStart.toISOString().slice(0, 10), month: `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}` };
}

export function getCodingResetTimes(now = new Date()) {
  const date = new Date(now);
  const y = date.getUTCFullYear(), m = date.getUTCMonth(), d = date.getUTCDate();
  const weekday = new Date(Date.UTC(y, m, d)).getUTCDay() || 7;
  return {
    daily: new Date(Date.UTC(y, m, d + 1)).toISOString(),
    weekly: new Date(Date.UTC(y, m, d + (8 - weekday))).toISOString(),
    monthly: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
  };
}

function normalizeUsage(data, keys) {
  const d = data || {};
  const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  return {
    dailyCredits: d.dayKey === keys.day ? num(d.dailyCredits) : 0,
    weeklyCredits: d.weekKey === keys.week ? num(d.weeklyCredits) : 0,
    monthlyCredits: d.monthKey === keys.month ? num(d.monthlyCredits) : 0,
    dailyRequests: d.dayKey === keys.day ? num(d.dailyRequests) : 0,
    weeklyRequests: d.weekKey === keys.week ? num(d.weeklyRequests) : 0,
    monthlyRequests: d.monthKey === keys.month ? num(d.monthlyRequests) : 0,
  };
}

export function buildCodingUsageSnapshot(usage, planKey, { unlimited = false, now = new Date() } = {}) {
  const limits = getCodingPlanLimits(planKey);
  const win = (used, limit) => ({ used, limit, remaining: Math.max(0, limit - used) });
  return {
    unit: "credits",
    plan: planKey,
    unlimited: unlimited === true,
    daily: win(usage.dailyCredits, limits.daily),
    weekly: win(usage.weeklyCredits, limits.weekly),
    monthly: win(usage.monthlyCredits, limits.monthly),
    requests: { daily: usage.dailyRequests, weekly: usage.weeklyRequests, monthly: usage.monthlyRequests },
    resetsAt: getCodingResetTimes(now),
    updatedAt: Date.now(),
  };
}

/** Which window (if any) cannot afford `credits`. */
export function findBlockingWindow(snapshot, credits) {
  for (const name of ["daily", "weekly", "monthly"]) {
    if (snapshot[name].remaining < credits) return name;
  }
  return null;
}

// ---- Firestore accounting (collection `codingUsage`, one doc per uid) -----------
const COLLECTION = "codingUsage";

export async function getCodingUsage(db, uid, planKey, options = {}) {
  const keys = getCodingPeriodKeys(options.now);
  const snap = await db.collection(COLLECTION).doc(String(uid)).get();
  return buildCodingUsageSnapshot(normalizeUsage(snap.exists ? snap.data() : {}, keys), planKey, options);
}

/**
 * Atomically check all three windows and reserve `credits`.
 * Returns { allowed, snapshot, credits, blockedBy, keys }.
 * Reserving before the AI call is what stops parallel requests from overspending.
 */
export async function reserveCodingCredits(db, uid, planKey, credits, { enforce = true, now } = {}) {
  const keys = getCodingPeriodKeys(now);
  const ref = db.collection(COLLECTION).doc(String(uid));
  const cost = Math.max(1, Math.ceil(Number(credits) || 1));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = normalizeUsage(snap.exists ? snap.data() : {}, keys);
    const before = buildCodingUsageSnapshot(current, planKey, { unlimited: !enforce, now });
    const blockedBy = enforce ? findBlockingWindow(before, cost) : null;
    if (blockedBy) return { allowed: false, snapshot: before, credits: cost, blockedBy, keys };
    const next = {
      uid: String(uid), dayKey: keys.day, weekKey: keys.week, monthKey: keys.month,
      dailyCredits: current.dailyCredits + cost, weeklyCredits: current.weeklyCredits + cost, monthlyCredits: current.monthlyCredits + cost,
      dailyRequests: current.dailyRequests + 1, weeklyRequests: current.weeklyRequests + 1, monthlyRequests: current.monthlyRequests + 1,
      updatedAt: Date.now(),
    };
    tx.set(ref, next, { merge: true });
    return { allowed: true, snapshot: buildCodingUsageSnapshot(normalizeUsage(next, keys), planKey, { unlimited: !enforce, now }), credits: cost, blockedBy: null, keys };
  });
}

/**
 * Adjust an earlier reservation. delta > 0 charges extra (long output),
 * delta < 0 refunds. refundRequest also removes the request from the count.
 * Windows that rolled over since the reservation are left untouched.
 */
export async function settleCodingCredits(db, uid, planKey, reservation, delta, { refundRequest = false, enforce = true, now } = {}) {
  const ref = db.collection(COLLECTION).doc(String(uid));
  const keys = reservation?.keys || getCodingPeriodKeys(now);
  const change = Math.trunc(Number(delta) || 0);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? { ...snap.data() } : {};
    const apply = (keyField, keyValue, creditField, requestField) => {
      if (data[keyField] !== keyValue) return;
      data[creditField] = Math.max(0, (Number(data[creditField]) || 0) + change);
      if (refundRequest) data[requestField] = Math.max(0, (Number(data[requestField]) || 0) - 1);
    };
    if (change !== 0 || refundRequest) {
      apply("dayKey", keys.day, "dailyCredits", "dailyRequests");
      apply("weekKey", keys.week, "weeklyCredits", "weeklyRequests");
      apply("monthKey", keys.month, "monthlyCredits", "monthlyRequests");
      data.updatedAt = Date.now();
      tx.set(ref, data, { merge: true });
    }
    return buildCodingUsageSnapshot(normalizeUsage(data, getCodingPeriodKeys(now)), planKey, { unlimited: !enforce, now });
  });
}
