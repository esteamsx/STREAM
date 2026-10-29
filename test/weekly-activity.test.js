import test from "node:test";
import assert from "node:assert/strict";
import {
  createWeeklyActivityService,
  getWeeklyActivityPeriod,
  summarizeWeeklyActivity,
  WEEKLY_ACTIVITY_MAX_PULSE_MS,
  WEEKLY_ACTIVITY_MIN_PULSE_MS,
} from "../services/weekly-activity.js";
import { registerChessRoutes } from "../routes/chess.js";
import { registerWeeklyActivityRoutes } from "../routes/weekly-activity.js";
import { injectPromoSlot } from "../middleware/promo-slot.js";

const HOUR = 60 * 60 * 1000;
const TARGET = 50 * 60 * 60;

function qualifyingData(now) {
  const period = getWeeklyActivityPeriod(now);
  const daySeconds = {};
  for (let index = 0; index < 5; index++) {
    daySeconds[new Date(period.startAt + index * 24 * HOUR).toISOString().slice(0, 10)] = 10 * 60 * 60;
  }
  return { weekKey: period.key, seconds: TARGET, daySeconds, claimedWeek: null };
}

class FakeFirestore {
  constructor() {
    this.documents = new Map();
    this.lock = Promise.resolve();
  }
  collection(name) { return new FakeCollection(this, [name]); }
  async runTransaction(callback) {
    let release;
    const previous = this.lock;
    this.lock = new Promise((resolve) => { release = resolve; });
    await previous;
    const writes = [];
    const tx = {
      get: async (ref) => {
        if (this.beforeRead) {
          const beforeRead = this.beforeRead;
          this.beforeRead = null;
          await beforeRead(ref);
        }
        const value = this.documents.get(ref.path);
        return { exists: value !== undefined, data: () => value && structuredClone(value) };
      },
      set: (ref, value, options = {}) => writes.push({ ref, value: structuredClone(value), merge: !!options.merge }),
    };
    try {
      const result = await callback(tx);
      for (const write of writes) {
        const prior = this.documents.get(write.ref.path) || {};
        this.documents.set(write.ref.path, applyValue(prior, write.value, write.merge));
      }
      return result;
    } finally {
      release();
    }
  }
}

function applyValue(prior, value, merge) {
  const next = merge ? { ...structuredClone(prior) } : {};
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === "object" && item.__increment === true) next[key] = (Number(next[key]) || 0) + item.amount;
    else if (item && typeof item === "object" && !Array.isArray(item) && !item.toDate) next[key] = merge ? { ...(next[key] || {}), ...structuredClone(item) } : structuredClone(item);
    else next[key] = item;
  }
  return next;
}

class FakeCollection {
  constructor(db, parts) { this.db = db; this.parts = parts; }
  doc(id) {
    const path = [...this.parts, id].join("/");
    return new FakeDocument(this.db, path);
  }
  orderBy(field, direction) { return new FakeQuery(this.db, this.parts, field, direction); }
}
class FakeDocument {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new FakeCollection(this.db, [...this.path.split("/"), name]); }
  async get() {
    const value = this.db.documents.get(this.path);
    return { exists: value !== undefined, data: () => value && structuredClone(value) };
  }
}
class FakeQuery {
  constructor(db, parts, field, direction) { this.db = db; this.parts = parts; this.field = field; this.direction = direction; this.take = 50; }
  limit(value) { this.take = value; return this; }
  async get() {
    const prefix = this.parts.join("/") + "/";
    const docs = [...this.db.documents.entries()]
      .filter(([path]) => path.startsWith(prefix) && path.slice(prefix.length).indexOf("/") === -1)
      .map(([path, data]) => ({ id: path.slice(prefix.length), data: () => structuredClone(data) }))
      .sort((a, b) => (b.data()[this.field] || 0) - (a.data()[this.field] || 0))
      .slice(0, this.take);
    return { docs };
  }
}

function createHarness(startAt = Date.UTC(2026, 9, 26, 12)) {
  const db = new FakeFirestore();
  let clock = startAt;
  const events = [];
  const rawService = createWeeklyActivityService({
    db,
    now: () => clock,
    increment: (amount) => ({ __increment: true, amount }),
    appendCoinLedger: (tx, userRef, priorData, delta, type, meta) => {
      const seq = (priorData.coinLedgerSeq || 0) + 1;
      tx.set(userRef.collection("coinLedger").doc(String(seq)), { seq, type, delta, meta });
      return { coinLedgerSeq: seq, coinLedgerTipBalance: (priorData.coinBalance || 0) + delta, coinLedgerTip: `tip-${seq}` };
    },
    coinLedgerMismatch: (data) => !!data.coinLedgerTip && data.coinBalance !== data.coinLedgerTipBalance,
    assertCoinsAllowed: (data) => { if (data.coinRestricted) throw Object.assign(new Error("restricted"), { status: 400 }); },
    invalidateProfileCache: () => {},
    onAbuse: (event) => events.push(event),
  });
  const issuedChallenges = new Map();
  const service = {
    ...rawService,
    async recordPulse(uid, body) {
      const payload = { ...body };
      if (payload.challenge === undefined && issuedChallenges.has(uid)) payload.challenge = issuedChallenges.get(uid);
      const result = await rawService.recordPulse(uid, payload);
      if (result.challenge) issuedChallenges.set(uid, result.challenge);
      return result;
    },
  };
  return { db, service, rawService, events, setNow(value) { clock = value; }, advance(ms) { clock += ms; }, getNow() { return clock; } };
}

function pulse(sessionId = "0123456789abcdef0123456789abcdef") {
  return { sessionId, interacted: true, activityKinds: ["pointer"] };
}

function putUser(db, uid, data = {}) {
  db.documents.set(`users/${uid}`, { coinBalance: 0, ...data });
}

test("weekly period starts Monday at 00:00 UTC and rolls over at the next Monday", () => {
  const sunday = Date.UTC(2026, 9, 25, 23, 59, 59);
  const monday = Date.UTC(2026, 9, 26, 0, 0, 1);
  assert.equal(getWeeklyActivityPeriod(sunday).key, "2026-10-19");
  assert.equal(getWeeklyActivityPeriod(monday).key, "2026-10-26");
});

test("summary requires both 50 hours and five distinct one-hour days", () => {
  const now = Date.UTC(2026, 9, 29, 12);
  const data = qualifyingData(now);
  const summary = summarizeWeeklyActivity(data, now, 7);
  assert.equal(summary.eligible, true);
  assert.equal(summary.hoursCompleted, 50);
  assert.equal(summary.qualifyingDays, 5);
  assert.equal(summary.coinBalance, 7);
  data.daySeconds[new Date(getWeeklyActivityPeriod(now).startAt + 4 * 24 * HOUR).toISOString().slice(0, 10)] = 3599;
  assert.equal(summarizeWeeklyActivity(data, now).eligible, false);
});

test("only valid server-timed intervals earn progress; rapid, idle, and manipulated requests do not", async () => {
  const h = createHarness();
  const uid = "user-a";
  await h.service.recordPulse(uid, pulse());
  h.advance(WEEKLY_ACTIVITY_MIN_PULSE_MS - 1000);
  const tooSoon = await h.service.recordPulse(uid, pulse());
  assert.equal(tooSoon.creditedSeconds, 0);
  h.advance(WEEKLY_ACTIVITY_MIN_PULSE_MS + 1000);
  const accepted = await h.service.recordPulse(uid, pulse());
  assert.equal(accepted.status, "credited");
  assert.ok(accepted.creditedSeconds > 0);
  const before = h.db.documents.get(`users/${uid}/weeklyActivity/current`).seconds;
  h.advance(WEEKLY_ACTIVITY_MAX_PULSE_MS + 1);
  const idle = await h.service.recordPulse(uid, pulse());
  assert.equal(idle.status, "idle_gap");
  assert.equal(h.db.documents.get(`users/${uid}/weeklyActivity/current`).seconds, before);
  await assert.rejects(h.service.recordPulse(uid, { ...pulse(), hours: 50 }), { status: 400, abuseCode: "client_supplied_progress" });
  assert.ok(h.events.some((event) => event.code === "client_supplied_progress"));
});

test("activity challenges rotate once per pulse and reject replay without credit", async () => {
  const h = createHarness();
  const uid = "user-challenge";
  const baseline = await h.rawService.recordPulse(uid, pulse());
  assert.match(baseline.challenge, /^[a-f0-9]{64}$/);
  h.advance(110000);
  const accepted = await h.rawService.recordPulse(uid, { ...pulse(), challenge: baseline.challenge });
  assert.equal(accepted.status, "credited");
  assert.notEqual(accepted.challenge, baseline.challenge);
  h.advance(110000);
  const replay = await h.rawService.recordPulse(uid, { ...pulse(), challenge: baseline.challenge });
  assert.equal(replay.status, "challenge_reset");
  assert.equal(replay.creditedSeconds, 0);
  assert.ok(h.events.some((event) => event.code === "invalid_activity_challenge"));
});

test("week rollover resets progress and the first reconnect heartbeat is only a baseline", async () => {
  const monday = Date.UTC(2026, 9, 26, 1);
  const h = createHarness(monday);
  await h.service.recordPulse("user-rollover", pulse());
  h.advance(110000);
  await h.service.recordPulse("user-rollover", pulse());
  const previous = h.db.documents.get("users/user-rollover/weeklyActivity/current");
  assert.ok(previous.seconds > 0);
  h.setNow(Date.UTC(2026, 10, 2, 0, 1));
  const rolled = await h.service.recordPulse("user-rollover", pulse());
  assert.equal(rolled.status, "baseline");
  assert.equal((await h.service.getSummary("user-rollover")).seconds, 0);
  h.advance(110000);
  const next = await h.service.recordPulse("user-rollover", pulse());
  assert.equal(next.status, "credited");
});

test("a delayed pre-rollover transaction cannot replace the newer week's progress", async () => {
  const sunday = Date.UTC(2026, 10, 1, 23, 59, 59);
  const monday = Date.UTC(2026, 10, 2, 0, 1);
  const h = createHarness(sunday);
  const path = "users/user-race/weeklyActivity/current";
  h.db.documents.set(path, { weekKey: "2026-11-02", seconds: 7200, daySeconds: { "2026-11-02": 7200 }, lastBeatAt: monday, sessionHash: "new-week-session" });
  h.db.beforeRead = async () => h.setNow(sunday);
  const result = await h.rawService.recordPulse("user-race", pulse());
  assert.equal(result.status, "stale_week");
  assert.equal(h.db.documents.get(path).weekKey, "2026-11-02");
  assert.equal(h.db.documents.get(path).seconds, 7200);
});

test("a changed session is logged and rebased without crediting overlapping time", async () => {
  const h = createHarness();
  await h.service.recordPulse("user-session", pulse("session-aaaaaaaaaaaa"));
  h.advance(110000);
  await h.service.recordPulse("user-session", pulse("session-bbbbbbbbbbbb"));
  assert.ok(h.events.some((event) => event.code === "overlapping_sessions"));
  assert.equal(h.db.documents.get("users/user-session/weeklyActivity/current").seconds, 0);
});

test("fixed-interval automation pattern is logged but never grants a client-specified duration", async () => {
  const h = createHarness();
  await h.service.recordPulse("user-pattern", pulse());
  let last;
  for (let i = 0; i < 22; i++) {
    h.advance(100000);
    last = await h.service.recordPulse("user-pattern", pulse());
  }
  assert.equal(last.status, "review_signal");
  assert.ok(h.events.some((event) => event.code === "regular_heartbeat_pattern"));
  assert.ok(h.events.some((event) => event.code === "repeated_interaction_pattern"));
  const stored = h.db.documents.get("users/user-pattern/weeklyActivity/current");
  assert.ok(stored.seconds <= 700);
});

test("claim checks eligibility server-side and awards exactly once under concurrent requests", async () => {
  const now = Date.UTC(2026, 9, 29, 12);
  const h = createHarness(now);
  putUser(h.db, "user-claim", { coinBalance: 3 });
  h.db.documents.set("users/user-claim/weeklyActivity/current", qualifyingData(now));
  const outcomes = await Promise.allSettled([h.service.claim("user-claim"), h.service.claim("user-claim")]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter((result) => result.status === "rejected" && result.reason.status === 409).length, 1);
  assert.equal(h.db.documents.get("users/user-claim").coinBalance, 13);
  assert.equal(h.db.documents.get("users/user-claim").lastDailyCoinClaimDay, undefined);
  assert.equal(h.db.documents.get("users/user-claim/weeklyActivity/current").claimedWeek, getWeeklyActivityPeriod(now).key);
  assert.equal(h.db.documents.get("users/user-claim/coinLedger/1").type, "weekly_activity");
});

test("weekly progress and the 10-coin claim are independent for unverified, verified, and admin accounts", async () => {
  const now = Date.UTC(2026, 9, 29, 12);
  const h = createHarness(now);
  const accounts = [
    ["unverified-user", { verified: false }],
    ["verified-user", { verified: true }],
    ["admin-user", { email: "etimpaschal95@gmail.com" }],
  ];
  for (const [uid, profile] of accounts) {
    putUser(h.db, uid, { coinBalance: 0, ...profile });
    h.db.documents.set(`users/${uid}/weeklyActivity/current`, qualifyingData(now));
  }
  const claims = await Promise.all(accounts.map(([uid]) => h.service.claim(uid)));
  assert.deepEqual(claims.map((result) => result.coinsAwarded), [10, 10, 10]);
  for (const [uid] of accounts) {
    assert.equal(h.db.documents.get(`users/${uid}`).coinBalance, 10);
    assert.equal(h.db.documents.get(`users/${uid}/weeklyActivity/current`).claimedWeek, getWeeklyActivityPeriod(now).key);
  }
});

test("claims reject non-eligible, restricted, and inconsistent-ledger accounts", async () => {
  const now = Date.UTC(2026, 9, 29, 12);
  const h = createHarness(now);
  putUser(h.db, "user-short");
  await assert.rejects(h.service.claim("user-short"), { status: 409 });
  putUser(h.db, "user-restricted", { coinRestricted: true });
  h.db.documents.set("users/user-restricted/weeklyActivity/current", qualifyingData(now));
  await assert.rejects(h.service.claim("user-restricted"), { status: 400 });
  putUser(h.db, "user-ledger", { coinBalance: 5, coinLedgerTip: "tip", coinLedgerTipBalance: 4 });
  h.db.documents.set("users/user-ledger/weeklyActivity/current", qualifyingData(now));
  await assert.rejects(h.service.claim("user-ledger"), { status: 409, code: "weekly_activity/coin_review" });
  assert.ok(h.events.some((event) => event.code === "coin_ledger_mismatch"));
});

test("weekly claim verifies ALTCHA before calling the atomic reward service", async () => {
  const routes = new Map();
  const calls = [];
  const requireAuth = () => {};
  const requireSiteOrigin = (req, res, next) => next();
  class AllowLimiter { middleware() { return (req, res, next) => next(); } }
  const router = {
    get(path, ...handlers) { routes.set("GET " + path, handlers); },
    post(path, ...handlers) { routes.set("POST " + path, handlers); },
  };
  registerWeeklyActivityRoutes(router, {
    requireAuth,
    requireSiteOrigin,
    SimpleRateLimiter: AllowLimiter,
    getSummary: async () => ({}),
    verifyCaptcha: async (token) => {
      calls.push(["captcha", token]);
      return token === "weekly-altcha-valid";
    },
    claimReward: async (uid) => {
      calls.push(["claim", uid]);
      return { ok: true, coinsAwarded: 10 };
    },
  });
  const handlers = routes.get("POST /api/rewards/weekly-activity/claim");
  const respond = () => ({
    statusCode: 200,
    headers: {},
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  });

  const success = respond();
  await handlers.at(-1)({ uid: "altcha-user", body: { altcha: "weekly-altcha-valid" } }, success);
  assert.deepEqual(calls.map((call) => call[0]), ["captcha", "claim"]);
  assert.deepEqual(success.data, { ok: true, coinsAwarded: 10 });
  assert.equal(success.headers["Cache-Control"], "no-store");

  calls.length = 0;
  const missingCaptcha = respond();
  await handlers.at(-1)({ uid: "altcha-user", body: {} }, missingCaptcha);
  assert.deepEqual(calls.map((call) => call[0]), ["captcha"]);
  assert.equal(missingCaptcha.statusCode, 400);
  assert.equal(missingCaptcha.data.error, "Captcha not completed.");

  calls.length = 0;
  const invalidCaptcha = respond();
  await handlers.at(-1)({ uid: "altcha-user", body: { altcha: "weekly-altcha-invalid" } }, invalidCaptcha);
  assert.deepEqual(calls.map((call) => call[0]), ["captcha"]);
  assert.equal(invalidCaptcha.statusCode, 400);
  assert.equal(invalidCaptcha.data.error, "Captcha not completed.");

});

test("weekly activity uses the existing chess heartbeat without changing plain presence pings", async () => {
  const routes = new Map();
  const touched = [];
  const received = [];
  const requireAuth = () => {};
  const requireSiteOrigin = (req, res, next) => next();
  class AllowLimiter { middleware() { return (req, res, next) => next(); } }
  const router = {
    get(path, ...handlers) { routes.set("GET " + path, handlers); },
    post(path, ...handlers) { routes.set("POST " + path, handlers); },
  };
  const hub = { setOnGameOver() {}, touch(uid) { touched.push(uid); } };
  registerChessRoutes(router, {
    requireAuth,
    requireSiteOrigin,
    SimpleRateLimiter: AllowLimiter,
    getUserProfile: async () => ({}),
    searchUsersByUsername: async () => [],
    isVerificationActive: () => false,
    isAdminEmail: () => false,
    creditChessBotWin: async () => {},
    recordChessReview: async () => {},
    recordWeeklyActivityPulse: async (uid, body) => { received.push({ uid, body }); return { challenge: "a".repeat(64) }; },
    hub,
  });
  const handlers = routes.get("POST /api/chess/hb");
  assert.equal(handlers[0], requireAuth);
  const respond = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    set() { return this; },
    json(data) { this.data = data; return this; },
  });
  const regularResponse = respond();
  await handlers.at(-1)({ uid: "presence-user", body: {} }, regularResponse);
  assert.deepEqual(regularResponse.data, { ok: true });
  assert.deepEqual(touched, ["presence-user"]);
  assert.equal(received.length, 0);

  const weeklyPayload = pulse();
  const weeklyResponse = respond();
  await handlers.at(-1)({ uid: "activity-user", body: { weeklyActivity: weeklyPayload } }, weeklyResponse);
  assert.deepEqual(received, [{ uid: "activity-user", body: weeklyPayload }]);
  assert.deepEqual(weeklyResponse.data, { ok: true, weeklyActivity: { challenge: "a".repeat(64) } });
  assert.deepEqual(touched, ["presence-user", "activity-user"]);
});

test("shared page injection adds the rewards assets with a nonce but not to API or sign-in pages", () => {
  function renderInjected(path) {
    const res = {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      getHeader(name) { return this.headers[name]; },
      send(body) { this.body = body; return this; },
      locals: {},
    };
    injectPromoSlot({ method: "GET", path }, res, () => {});
    res.send("<!doctype html><html><head></head><body></body></html>");
    return res.body;
  }
  const moviePage = renderInjected("/movies");
  assert.match(moviePage, /weekly-rewards\.css\?v=/);
  assert.match(moviePage, /nonce="__CSP_NONCE__" src="\/weekly-rewards\.js\?v=/);
  assert.doesNotMatch(renderInjected("/login"), /weekly-rewards/);
  assert.match(renderInjected("/admin"), /weekly-rewards\.js\?v=/);
  assert.doesNotMatch(renderInjected("/pay/example-token"), /weekly-rewards/);
  assert.doesNotMatch(renderInjected("/api/chess/hb"), /weekly-rewards/);
});
