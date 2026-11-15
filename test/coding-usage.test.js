import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CODING_PLAN_ORDER, CODING_PLAN_DEFS, CODING_PURCHASABLE_PLAN_KEYS, CODING_PLAN_CREDITS, CODING_CREDIT_COST_NGN, CODING_COST_BUDGET_RATIO, CODING_PREMIUM_MODEL_IDS, CODING_FREE_DEFAULT_MODEL_ID,
  calculateCodingCredits, resolveCodingPlanKey, resolveCodingPlanForProfile, getCodingPeriodKeys, getCodingResetTimes, buildCodingUsageSnapshot, findBlockingWindow,
  getCodingUsage, reserveCodingCredits, settleCodingCredits, isPremiumCodingModel,
} from "../services/coding-usage.js";
import { renderCoding } from "../views/coding.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// Minimal in-memory Firestore: collection().doc().get() and a serialised runTransaction().
function fakeDb() {
  const docs = new Map();
  let chain = Promise.resolve();
  const ref = (name, id) => ({ key: `${name}/${id}` });
  return {
    docs,
    collection: (name) => ({ doc: (id) => ({ ...ref(name, id), get: async () => ({ exists: docs.has(`${name}/${id}`), data: () => structuredClone(docs.get(`${name}/${id}`)) }) }) }),
    runTransaction(fn) {
      const run = chain.then(() => fn({
        get: async (r) => ({ exists: docs.has(r.key), data: () => structuredClone(docs.get(r.key)) }),
        set: (r, data, options) => { docs.set(r.key, options?.merge ? { ...(docs.get(r.key) || {}), ...data } : data); },
      }));
      chain = run.catch(() => {});
      return run;
    },
  };
}

// ---------- plan limits & cost ----------
test("COD\\NG owns its tier catalog and matches the API plan prices", () => {
  assert.deepEqual(CODING_PLAN_ORDER, ["free", "starter", "standard", "pro", "max"]);
  assert.deepEqual(CODING_PURCHASABLE_PLAN_KEYS, ["standard", "pro", "max"]);
  assert.deepEqual(Object.fromEntries(["standard", "pro", "max"].map((key) => [key, CODING_PLAN_DEFS[key].priceNgn])), { standard: 7500, pro: 13500, max: 20500 });
  const auth = read("services/auth.js");
  const codingEntitlement = auth.slice(auth.indexOf("function getEffectiveCodingPlan"), auth.indexOf("function getMovieApiPlanConfig"));
  assert.match(codingEntitlement, /resolveCodingPlanForProfile/);
  assert.doesNotMatch(codingEntitlement, /movieApiPlan|devApiPlanPaid/);
  for (const key of CODING_PLAN_ORDER) {
    const { daily, weekly, monthly } = CODING_PLAN_CREDITS[key];
    assert.ok(daily < weekly && weekly < monthly, `${key} windows must grow daily < weekly < monthly`);
  }
  for (let i = 1; i < CODING_PLAN_ORDER.length; i += 1) {
    const lower = CODING_PLAN_CREDITS[CODING_PLAN_ORDER[i - 1]];
    const higher = CODING_PLAN_CREDITS[CODING_PLAN_ORDER[i]];
    assert.ok(higher.daily > lower.daily && higher.weekly > lower.weekly && higher.monthly > lower.monthly, "higher plans must allow more");
  }
});

test("full use of a paid plan stays inside the API cost budget", () => {
  const premiumPrice = Number(read("services/paystack.js").match(/VERIFICATION_PRICE_NGN = (\d+)/)[1]);
  const priceOf = (key) => key === "starter" ? premiumPrice : CODING_PLAN_DEFS[key].priceNgn;
  for (const key of ["starter", "standard", "pro", "max"]) {
    const worstCase = CODING_PLAN_CREDITS[key].monthly * CODING_CREDIT_COST_NGN;
    assert.ok(worstCase <= priceOf(key) * CODING_COST_BUDGET_RATIO, `${key}: NGN ${worstCase} exceeds ${CODING_COST_BUDGET_RATIO * 100}% of NGN ${priceOf(key)}`);
  }
  assert.ok(CODING_PLAN_CREDITS.free.monthly * CODING_CREDIT_COST_NGN <= 250, "free plan exposure must stay tiny");
});

test("COD\\NG paid entitlements are isolated from API plans and expire independently", () => {
  const now = 1_800_000_000_000;
  assert.equal(resolveCodingPlanForProfile({ movieApiPlanPaid: "max", devApiPlanPaid: "pro", movieApiPlanExpiresAt: now + 1000 }, { now }), "free");
  assert.equal(resolveCodingPlanForProfile({ codingPlanPaid: "standard", codingPlanExpiresAt: now + 1000 }, { now }), "standard");
  assert.equal(resolveCodingPlanForProfile({ codingPlanPaid: "pro", codingPlanExpiresAt: now + 1000 }, { now, verifiedActive: true }), "pro");
  assert.equal(resolveCodingPlanForProfile({ codingPlanPaid: "max", codingPlanExpiresAt: now }, { now }), "free");
  assert.equal(resolveCodingPlanForProfile({ codingPlanPaid: "max", codingPlanExpiresAt: now }, { now, verifiedActive: true }), "starter");
  assert.equal(resolveCodingPlanForProfile({}, { now, admin: true }), "max");
});

test("COD\\NG plan rank keeps purchased tiers above the verification benefit", () => {
  assert.equal(resolveCodingPlanKey("free", "free"), "free");
  assert.equal(resolveCodingPlanKey("free", "starter"), "starter");
  assert.equal(resolveCodingPlanKey("standard", "starter"), "standard");
  assert.equal(resolveCodingPlanKey("pro", "starter"), "pro");
  assert.equal(resolveCodingPlanKey("max", "starter"), "max");
  assert.equal(resolveCodingPlanKey("bogus", undefined), "free");
});

// ---------- weighted usage ----------
test("simple tasks are cheap, complex tasks cost more", () => {
  const simple = calculateCodingCredits({ modelId: CODING_FREE_DEFAULT_MODEL_ID, messageChars: 80 });
  assert.equal(simple.credits, 1);
  const longPrompt = calculateCodingCredits({ modelId: CODING_FREE_DEFAULT_MODEL_ID, messageChars: 2500 });
  assert.ok(longPrompt.credits > simple.credits);
  const files = calculateCodingCredits({ modelId: CODING_FREE_DEFAULT_MODEL_ID, messageChars: 80, attachmentCount: 2, attachmentBytes: 500 * 1024, hasArchive: true });
  assert.ok(files.credits > longPrompt.credits, "file analysis costs more than a long prompt");
  const tools = calculateCodingCredits({ modelId: CODING_FREE_DEFAULT_MODEL_ID, messageChars: 80, repositoryContext: true });
  assert.ok(tools.credits > simple.credits);
  const longOutput = calculateCodingCredits({ modelId: CODING_FREE_DEFAULT_MODEL_ID, messageChars: 80, outputChars: 25000 });
  assert.ok(longOutput.credits > simple.credits);
});

test("model multipliers and the complexity cap protect API costs", () => {
  const input = { messageChars: 2000, attachmentCount: 1, attachmentBytes: 300 * 1024 };
  const deepseek = calculateCodingCredits({ ...input, modelId: "deepseek-v4-1-flash-1017" }).credits;
  const gpt = calculateCodingCredits({ ...input, modelId: "gpt-6-astra" }).credits;
  const fable = calculateCodingCredits({ ...input, modelId: "claude-fable-5-2" }).credits;
  assert.ok(deepseek < gpt && gpt < fable);
  const extreme = calculateCodingCredits({ modelId: "claude-fable-5-2", messageChars: 1e6, historyChars: 1e6, attachmentCount: 99, attachmentBytes: 1e9, hasArchive: true, repositoryContext: true, outputChars: 1e6 });
  assert.equal(extreme.units, 10);
  assert.equal(extreme.credits, 30);
  assert.ok(calculateCodingCredits({}).credits >= 1);
  assert.equal(calculateCodingCredits({ modelId: "unknown", messageChars: 10 }).credits, 2, "unknown models use the safe default multiplier");
});

// ---------- periods ----------
test("period keys use the same UTC day / Monday week / month structure", () => {
  assert.deepEqual(getCodingPeriodKeys(new Date("2026-11-15T10:00:00Z")), { day: "2026-11-15", week: "2026-11-09", month: "2026-11" });
  assert.deepEqual(getCodingPeriodKeys(new Date("2026-11-16T00:00:00Z")), { day: "2026-11-16", week: "2026-11-16", month: "2026-11" });
  const resets = getCodingResetTimes(new Date("2026-11-15T10:00:00Z"));
  assert.equal(resets.daily, "2026-11-16T00:00:00.000Z");
  assert.equal(resets.weekly, "2026-11-16T00:00:00.000Z");
  assert.equal(resets.monthly, "2026-12-01T00:00:00.000Z");
});

// ---------- accounting ----------
test("reserving credits updates daily, weekly and monthly counters and the live snapshot", async () => {
  const db = fakeDb();
  const first = await reserveCodingCredits(db, "u1", "free", 2);
  assert.equal(first.allowed, true);
  assert.deepEqual([first.snapshot.daily.used, first.snapshot.weekly.used, first.snapshot.monthly.used], [2, 2, 2]);
  assert.equal(first.snapshot.daily.remaining, 3);
  const usage = await getCodingUsage(db, "u1", "free");
  assert.equal(usage.daily.remaining, 3);
  assert.equal(usage.requests.daily, 1);
  assert.equal(usage.requests.weekly, 1);
  assert.equal(usage.requests.monthly, 1);
  // Separate accounting: nothing is written to the Movie/Developers API counters.
  assert.deepEqual([...db.docs.keys()], ["codingUsage/u1"]);
});

test("chat file reads, edits and generated files are covered by one AI request reservation", () => {
  const routes = read("routes/coding.js");
  const chatStart = routes.indexOf('router.post("/api/coding/chat"');
  assert.ok(chatStart >= 0);
  const nextRoute = routes.indexOf("\n  router.", chatStart + 1);
  const chat = routes.slice(chatStart, nextRoute < 0 ? routes.length : nextRoute);
  assert.match(chat, /temporaryFiles\.readForProcessing/);
  assert.match(chat, /reservation = await reserveOrReject\(req, res, calculateCodingCredits\(creditInput\)\.credits\)/);
  assert.equal((chat.match(/reservation = await reserveOrReject/g) || []).length, 1);
  assert.match(chat, /buildCodingPayload\(\{ \.\.\.request, messages: chatContext\.messages, attachments: resolvedAttachments, repositoryContext \}\)/);
  assert.match(chat, /extractGeneratedCodingFiles\(generatedText\)/);
});

test("a request is blocked when any window cannot afford it", async () => {
  const db = fakeDb();
  assert.equal((await reserveCodingCredits(db, "u2", "free", 4)).allowed, true);
  const denied = await reserveCodingCredits(db, "u2", "free", 2);
  assert.equal(denied.allowed, false);
  assert.equal(denied.blockedBy, "daily");
  assert.equal(denied.snapshot.daily.used, 4, "a denied request must not consume credits");
  assert.equal((await reserveCodingCredits(db, "u2", "free", 1)).allowed, true, "a cheaper request still fits");
  assert.equal(findBlockingWindow(buildCodingUsageSnapshot({ dailyCredits: 0, weeklyCredits: 19, monthlyCredits: 0 }, "free"), 2), "weekly");
  assert.equal(findBlockingWindow(buildCodingUsageSnapshot({ dailyCredits: 0, weeklyCredits: 0, monthlyCredits: 39 }, "free"), 2), "monthly");
});

test("parallel requests cannot overspend a window", async () => {
  const db = fakeDb();
  const results = await Promise.all(Array.from({ length: 10 }, () => reserveCodingCredits(db, "u3", "free", 1)));
  assert.equal(results.filter((r) => r.allowed).length, 5, "free daily limit is 5 credits");
  assert.equal((await getCodingUsage(db, "u3", "free")).daily.used, 5);
});

test("long output is charged extra and failed requests are refunded", async () => {
  const db = fakeDb();
  const reservation = await reserveCodingCredits(db, "u4", "pro", 3);
  const after = await settleCodingCredits(db, "u4", "pro", reservation, 4);
  assert.equal(after.daily.used, 7);
  const refund = await reserveCodingCredits(db, "u4", "pro", 5);
  const refunded = await settleCodingCredits(db, "u4", "pro", refund, -5, { refundRequest: true });
  assert.equal(refunded.daily.used, 7);
  assert.equal(refunded.requests.daily, 1);
  const floor = await settleCodingCredits(db, "u4", "pro", reservation, -999);
  assert.equal(floor.daily.used, 0, "counters never go negative");
});

test("counters reset when the day, week or month rolls over", async () => {
  const db = fakeDb();
  const monday = new Date("2026-11-16T09:00:00Z");
  await reserveCodingCredits(db, "u5", "free", 5, { now: monday });
  assert.equal((await reserveCodingCredits(db, "u5", "free", 1, { now: monday })).allowed, false);
  const tuesday = new Date("2026-11-17T09:00:00Z");
  const next = await reserveCodingCredits(db, "u5", "free", 1, { now: tuesday });
  assert.equal(next.allowed, true);
  assert.equal(next.snapshot.daily.used, 1);
  assert.equal(next.snapshot.weekly.used, 6, "weekly keeps counting inside the same week");
  const nextMonth = await reserveCodingCredits(db, "u5", "free", 1, { now: new Date("2026-12-01T09:00:00Z") });
  assert.equal(nextMonth.snapshot.monthly.used, 1);
});

test("a refund after a period roll-over does not touch the new period", async () => {
  const db = fakeDb();
  const reservation = await reserveCodingCredits(db, "u6", "pro", 3, { now: new Date("2026-11-15T23:59:59Z") });
  await reserveCodingCredits(db, "u6", "pro", 2, { now: new Date("2026-11-16T00:00:01Z") });
  const settled = await settleCodingCredits(db, "u6", "pro", reservation, -3, { refundRequest: true, now: new Date("2026-11-16T00:00:02Z") });
  assert.equal(settled.daily.used, 2);
});

test("admins are tracked but never blocked", async () => {
  const db = fakeDb();
  const result = await reserveCodingCredits(db, "admin", "max", 500, { enforce: false });
  assert.equal(result.allowed, true);
  assert.equal(result.snapshot.unlimited, true);
});

// ---------- Premium restriction ----------
test("Claude Fable is the only Premium-only model and free accounts default to a cheaper one", () => {
  assert.deepEqual([...CODING_PREMIUM_MODEL_IDS], ["claude-fable-5-2"]);
  assert.equal(isPremiumCodingModel("claude-fable-5-2"), true);
  assert.equal(isPremiumCodingModel("gpt-6-astra"), false);
  assert.equal(isPremiumCodingModel(CODING_FREE_DEFAULT_MODEL_ID), false);
});

test("server enforces the Premium model gate, plan credits and the open page", () => {
  const routes = read("routes/coding.js");
  const server = read("server.js");
  assert.match(routes, /const premiumOnly = \(req, res, modelId\)/);
  assert.match(routes, /premium_required/);
  assert.match(routes, /if \(premiumOnly\(req, res, request\.modelId\)\) return;/);
  assert.match(routes, /if \(premiumOnly\(req, res, req\.body\?\.modelId\)\) return;/);
  assert.match(routes, /CODING_FREE_DEFAULT_MODEL_ID/);
  assert.match(routes, /reserveCodingCredits\(db, req\.uid, planKey, credits/);
  assert.match(routes, /coding_quota_exceeded/);
  assert.match(routes, /"\/api\/coding\/usage"/);
  assert.match(routes, /getEffectiveCodingPlan\(profile\)/);
  assert.doesNotMatch(routes, /getEffectiveMovieApiPlan|getEffectiveDevApiPlan/);
  assert.match(routes, /type: "usage"/);
  assert.match(routes, /settleUsage\(req, reservation, -reservation\.credits, \{ refundRequest: true \}\)/);
  const codingPage = server.slice(server.indexOf('app.get("/coding"'), server.indexOf('app.get("/deploy-bot"'));
  assert.doesNotMatch(codingPage, /redirect/);
  assert.doesNotMatch(codingPage, /isVerificationActive/);
});

test("the Get Premium overlay already lists AI coding and /account?premium=1 opens it", () => {
  const account = read("views/account.js");
  assert.match(account, /AI coding agent \(Cod\\\\NG\) for code help and downloadable file fixes/);
  assert.match(account, /get\('premium'\) === '1'\) openVerifyOverlay\(\)/);
});

// ---------- page ----------
test("the page uses API-style plan cards and shows live usage bars in Pricing & Plans", () => {
  const html = renderCoding({});
  assert.doesNotMatch(html, /class="hero"/);
  assert.doesNotMatch(html, /PREMIUM ONLY/);
  assert.match(html, /id="codingPricing"/);
  assert.match(html, /Plans &amp; Pricing/);
  assert.ok(html.indexOf('id="codingPlanGrid"') < html.indexOf('id="codingUsage"'));
  assert.ok(html.indexOf('id="codingUsage"') < html.indexOf('<div class="coding-layout">'));
  for (const name of ["daily", "weekly", "monthly"]) assert.match(html, new RegExp(`data-window="${name}"`));
  assert.match(html, /\.usage-fill\.lvl-warn\{background:linear-gradient/);
  assert.match(html, /\.usage-fill\.lvl-hot\{background:linear-gradient/);
  assert.match(html, /plan-card \.btn-primary/);
  assert.doesNotMatch(html, /id="codingPricingToggle"|id="codingPricingBody"|class="glass side"|pricing-note/);
  assert.match(html, /event\.type==='usage'\)\{if\(event\.usage\)applyUsage\(event\.usage\)/);
  assert.match(html, /fetch\('\/api\/coding\/usage'/);
});

test("the Claude Fable option is lockable and opens the Get Premium overlay", () => {
  const html = renderCoding({});
  const fable = html.match(/<button class="coding-model-option"[^>]*data-model-id="claude-fable-5-2"[\s\S]*?<\/button>/)[0];
  assert.match(fable, /coding-model-premium-tag/);
  assert.match(fable, /coding-model-lock/);
  const gpt = html.match(/<button class="coding-model-option"[^>]*data-model-id="gpt-6-astra"[\s\S]*?<\/button>/)[0];
  assert.doesNotMatch(gpt, /coding-model-premium-tag/);
  assert.match(html, /\.coding-model-option\.locked\{opacity:\.42;filter:grayscale/);
  assert.match(html, /classList\.contains\('locked'\)\)\{window\.location\.href='\/account\?premium=1'/);
  assert.match(html, /premium_required'\)\{window\.location\.href='\/account\?premium=1'/);
});
