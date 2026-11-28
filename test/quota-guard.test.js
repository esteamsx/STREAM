import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "quota-guard-"));
process.chdir(workDir);

const mod = await import("../middleware/quota-guard.js");
const {
  createQuotaGuard, classifyQuotaError, nextPacificMidnight, nextEightAmWAT, nextResets,
  quotaMaintenanceGate, markQuotaExceeded, getQuotaMaintenanceUntil,
} = mod;

const iso = (ms) => new Date(ms).toISOString();
const utc = (...a) => Date.UTC(...a);
const tick = () => new Promise((resolve) => setImmediate(resolve));

function legacyNextEightAmWAT(fromMs) {
  const from = new Date(fromMs);
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 7, 0, 0, 0));
  if (from.getTime() >= target.getTime()) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime();
}

function quotaErr(message = "8 RESOURCE_EXHAUSTED: Quota exceeded.") {
  return Object.assign(new Error(message), { code: 8 });
}
function unavailableErr() {
  return Object.assign(new Error("14 UNAVAILABLE: No connection established"), { code: 14 });
}

function harness({ start, probe, withProbe = true }) {
  const clock = { t: start };
  const timers = [];
  let nextId = 1;
  const logs = [];
  const log = {
    log: (m) => logs.push(["log", m]),
    warn: (m) => logs.push(["warn", m]),
    error: (m) => logs.push(["error", m]),
  };
  const stateFile = path.join(workDir, "state-" + Math.random().toString(36).slice(2) + ".json");
  const probeCalls = [];
  const wrappedProbe = async () => {
    probeCalls.push(clock.t);
    return probe(clock.t);
  };
  const guard = createQuotaGuard({
    now: () => clock.t,
    stateFile,
    log,
    probe: withProbe ? wrappedProbe : null,
    setTimer: (fn, ms) => { const id = nextId++; timers.push({ id, at: clock.t + ms, fn }); return id; },
    clearTimer: (id) => { const i = timers.findIndex((x) => x.id === id); if (i >= 0) timers.splice(i, 1); },
  });
  async function advanceTo(target) {
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > target) break;
      timers.shift();
      clock.t = Math.max(clock.t, next.at);
      next.fn();
      await tick();
      await guard.whenIdle();
      await tick();
    }
    clock.t = target;
  }
  const has = (needle) => logs.some(([, m]) => m.includes(needle));
  return { clock, timers, logs, guard, stateFile, probeCalls, advanceTo, has };
}

test("Pacific reset during PST (winter) is 08:00 UTC, 09:00 in Nigeria", () => {
  const next = nextPacificMidnight(utc(2026, 0, 15, 12, 0, 0));
  assert.equal(iso(next), "2026-01-16T08:00:00.000Z");
  assert.equal(new Date(next + 3600000).getUTCHours(), 9);
});

test("Pacific reset during PDT (summer) is 07:00 UTC, 08:00 in Nigeria", () => {
  const next = nextPacificMidnight(utc(2026, 6, 15, 12, 0, 0));
  assert.equal(iso(next), "2026-07-16T07:00:00.000Z");
  assert.equal(new Date(next + 3600000).getUTCHours(), 8);
});

test("Pacific reset is correct around both daylight saving changes", () => {
  assert.equal(iso(nextPacificMidnight(utc(2026, 2, 8, 5, 0, 0))), "2026-03-08T08:00:00.000Z");
  assert.equal(iso(nextPacificMidnight(utc(2026, 2, 8, 9, 0, 0))), "2026-03-09T07:00:00.000Z");
  assert.equal(iso(nextPacificMidnight(utc(2026, 10, 1, 6, 30, 0))), "2026-11-01T07:00:00.000Z");
  assert.equal(iso(nextPacificMidnight(utc(2026, 10, 1, 9, 0, 0))), "2026-11-02T08:00:00.000Z");
});

test("Pacific reset is always in the future and under 25 hours away", () => {
  for (let d = 0; d < 800; d++) {
    const from = utc(2026, 0, 1) + d * 7 * 3600000 + 1234;
    const next = nextPacificMidnight(from);
    assert.ok(next > from);
    assert.ok(next - from <= 25 * 3600000);
  }
});

test("original 8 AM Nigeria reset is unchanged", () => {
  for (let d = 0; d < 800; d++) {
    const from = utc(2026, 0, 1) + d * 5 * 3600000 + 777;
    assert.equal(nextEightAmWAT(from), legacyNextEightAmWAT(from));
  }
  assert.equal(iso(nextEightAmWAT(utc(2026, 10, 27, 6, 0, 0))), "2026-11-27T07:00:00.000Z");
  assert.equal(iso(nextEightAmWAT(utc(2026, 10, 27, 7, 0, 0))), "2026-11-28T07:00:00.000Z");
});

test("both resets coexist: winter they differ by an hour, summer they coincide", () => {
  const winter = nextResets(utc(2026, 10, 27, 6, 0, 0));
  assert.equal(iso(winter.nigeria), "2026-11-27T07:00:00.000Z");
  assert.equal(iso(winter.pacific), "2026-11-27T08:00:00.000Z");
  const winterLate = nextResets(utc(2026, 10, 27, 7, 30, 0));
  assert.equal(iso(winterLate.pacific), "2026-11-27T08:00:00.000Z");
  assert.equal(iso(winterLate.nigeria), "2026-11-28T07:00:00.000Z");
  const summer = nextResets(utc(2026, 6, 15, 6, 0, 0));
  assert.equal(summer.pacific, summer.nigeria);
});

test("quota errors are told apart from other Firebase errors", () => {
  assert.equal(classifyQuotaError(quotaErr()), "daily");
  assert.equal(classifyQuotaError(quotaErr("8 RESOURCE_EXHAUSTED: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'")), "transient");
  assert.equal(classifyQuotaError(quotaErr("8 RESOURCE_EXHAUSTED: Received message larger than max (5000000 vs. 4194304)")), "other");
  assert.equal(classifyQuotaError(quotaErr("8 RESOURCE_EXHAUSTED: ")), "ambiguous");
  assert.equal(classifyQuotaError(unavailableErr()), "none");
  assert.equal(classifyQuotaError(Object.assign(new Error("7 PERMISSION_DENIED"), { code: 7 })), "none");
  assert.equal(classifyQuotaError(null), "none");
});

test("a single quota error does not activate maintenance", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => {} });
  h.guard.checkQuotaError(quotaErr());
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
  assert.equal(h.probeCalls.length, 0);
});

test("errors spread far apart do not add up to maintenance", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw quotaErr(); } });
  h.guard.checkQuotaError(quotaErr());
  h.clock.t += 10 * 60 * 1000;
  h.guard.checkQuotaError(quotaErr());
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
});

test("temporary rate limit errors never activate maintenance", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw quotaErr(); } });
  for (let i = 0; i < 20; i++) h.guard.checkQuotaError(quotaErr("8 RESOURCE_EXHAUSTED: Quota exceeded for limit 'Read requests per minute per user'"));
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
  assert.equal(h.probeCalls.length, 0);
});

test("repeated errors but Firestore is responding: maintenance is not activated", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => {} });
  h.guard.checkQuotaError(quotaErr());
  h.guard.checkQuotaError(quotaErr());
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
  assert.equal(h.probeCalls.length, 1);
  assert.ok(h.has("Firestore is responding"));
});

test("repeated errors confirmed by a failing check activate quota maintenance", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw quotaErr(); } });
  h.guard.checkQuotaError(quotaErr());
  h.guard.checkQuotaError(quotaErr());
  await h.guard.whenIdle();
  const state = h.guard.getState();
  assert.equal(state.reason, "quota");
  assert.ok(state.until > h.clock.t);
});

test("repeated errors confirmed only by a non-quota failure do not activate quota maintenance", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw unavailableErr(); } });
  h.guard.checkQuotaError(quotaErr());
  h.guard.checkQuotaError(quotaErr());
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
  assert.ok(h.has("non-quota error"));
});

test("a corrupted state file can no longer block maintenance from being set again", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw quotaErr(); } });
  fs.writeFileSync(h.stateFile, "{not json");
  assert.equal(h.guard.getQuotaMaintenanceUntil(), null);
  assert.equal(h.guard.markQuotaExceeded(), true);
  assert.equal(h.guard.getState().reason, "quota");
});

test("PST day: Nigeria 8 AM fallback verifies and retains, Pacific midnight then clears", async () => {
  const quotaBack = utc(2026, 10, 27, 8, 0, 0);
  const h = harness({
    start: utc(2026, 10, 27, 6, 0, 0),
    probe: async (t) => { if (t < quotaBack) throw quotaErr(); },
  });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  assert.equal(iso(h.guard.getState().until), "2026-11-27T07:00:00.000Z");

  await h.advanceTo(utc(2026, 10, 27, 7, 0, 30));
  assert.ok(h.has("reset executed mechanisms=nigeria-8am"));
  assert.ok(!h.has("mechanisms=pacific-midnight"));
  const retained = h.guard.getState();
  assert.ok(retained, "maintenance must be retained while quota is still exhausted");
  assert.equal(iso(retained.until), "2026-11-27T08:00:00.000Z");
  assert.ok(h.has("maintenance=retained"));
  assert.ok(h.has("quota still exhausted"));

  await h.advanceTo(utc(2026, 10, 27, 8, 0, 30));
  assert.ok(h.has("reset executed mechanisms=pacific-midnight"));
  assert.ok(h.has("verification=succeeded maintenance=cleared"));
  assert.equal(h.guard.getState(), null);
});

test("PDT day: both resets coincide and run exactly one verification", async () => {
  const resetAt = utc(2026, 6, 15, 7, 0, 0);
  const h = harness({
    start: utc(2026, 6, 15, 6, 30, 0),
    probe: async (t) => { if (t < resetAt) throw quotaErr(); },
  });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(resetAt - 1);
  const before = h.probeCalls.length;
  await h.advanceTo(resetAt + 5000);
  const atReset = h.probeCalls.filter((t) => t >= resetAt && t <= resetAt + 1000);
  assert.equal(atReset.length, 1);
  assert.ok(before >= 1);
  assert.equal(h.logs.filter(([, m]) => m.includes("reset executed")).length, 1);
  assert.ok(h.has("mechanisms=pacific-midnight+nigeria-8am"));
  assert.equal(h.guard.getState(), null);
});

test("log lines show both Pacific and Nigeria time", async () => {
  const resetAt = utc(2026, 10, 28, 8, 0, 0);
  const h = harness({ start: utc(2026, 10, 28, 7, 59, 0), probe: async () => {} });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(resetAt + 2000);
  const line = h.logs.map(([, m]) => m).find((m) => m.includes("reset executed"));
  assert.match(line, /pacific="Nov 28, 2026, 12:00:0\d AM PST"/);
  assert.match(line, /nigeria="Nov 28, 2026, 9:00:0\d AM WAT"/);
});

test("the same reset can never execute twice", async () => {
  const h = harness({ start: utc(2026, 6, 15, 6, 0, 0), probe: async () => {} });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  h.timers.sort((a, b) => a.at - b.at);
  const resetTimer = h.timers.find((x) => x.at === utc(2026, 6, 15, 7, 0, 0));
  assert.ok(resetTimer);
  const fire = resetTimer.fn;
  h.clock.t = utc(2026, 6, 15, 7, 0, 0);
  fire();
  await tick();
  await h.guard.whenIdle();
  fire();
  await tick();
  await h.guard.whenIdle();
  assert.equal(h.logs.filter(([, m]) => m.includes("reset executed")).length, 1);
});

test("a timer that fires slightly early does not run the reset twice", async () => {
  const instant = utc(2026, 10, 27, 7, 0, 0);
  const h = harness({ start: instant - 600, probe: async () => {} });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(instant + 5000);
  assert.equal(h.logs.filter(([, m]) => m.includes("reset executed")).length, 1);
});

test("temporary quota exhaustion recovers by itself on the first backoff retry", async () => {
  let available = false;
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { if (!available) throw quotaErr(); } });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(utc(2026, 10, 27, 12, 0, 30));
  assert.ok(h.guard.getState());
  available = true;
  await h.advanceTo(utc(2026, 10, 27, 12, 1, 30));
  assert.equal(h.guard.getState(), null);
  assert.ok(h.has("trigger=backoff-retry verification=succeeded maintenance=cleared"));
});

test("genuine outage keeps maintenance, retries with growing backoff, and is not aggressive", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw unavailableErr(); } });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(utc(2026, 10, 28, 9, 0, 0));
  assert.ok(h.guard.getState(), "an outage must never clear the state");
  const gaps = h.probeCalls.slice(1).map((t, i) => t - h.probeCalls[i]);
  const resetRuns = h.logs.filter(([, m]) => m.includes("reset executed")).length;
  assert.ok(h.probeCalls.length < 40, "too many probes: " + h.probeCalls.length);
  assert.ok(gaps[1] > gaps[0] && gaps[2] > gaps[1], "backoff must grow");
  assert.ok(Math.max(...gaps) <= 3600000 + 1000);
  assert.ok(h.has("firestore not reachable"));
  assert.ok(h.has("code=14"));
  assert.ok(resetRuns >= 1);
});

test("a stuck quota state is released after the maximum hold time", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw unavailableErr(); } });
  h.guard.start({});
  h.guard.markQuotaExceeded();
  await h.advanceTo(utc(2026, 10, 28, 12, 0, 0));
  assert.ok(h.guard.getState());
  await h.advanceTo(utc(2026, 10, 28, 15, 0, 0));
  assert.equal(h.guard.getState(), null);
  assert.ok(h.has("maximum hold time reached"));
});

test("manually enabled maintenance or any non-quota state is never touched", async () => {
  for (const reason of ["manual", "security"]) {
    const h = harness({ start: utc(2026, 10, 27, 6, 0, 0), probe: async () => {} });
    const until = utc(2026, 10, 27, 20, 0, 0);
    fs.writeFileSync(h.stateFile, JSON.stringify({ reason, until, setAt: h.clock.t }));
    h.guard.start({});
    await h.advanceTo(utc(2026, 10, 27, 9, 0, 0));
    assert.equal(h.probeCalls.length, 0);
    assert.equal(h.guard.getState().reason, reason);
    assert.ok(h.has("not quota related, left untouched"));
    assert.equal(h.guard.getQuotaMaintenanceUntil(), until);
    h.clock.t = until + 1;
    assert.equal(h.guard.getQuotaMaintenanceUntil(), null);
  }
});

test("a stale quota state left by the old logic recovers after verification", async () => {
  const h = harness({ start: utc(2026, 10, 27, 9, 0, 0), probe: async () => {} });
  fs.writeFileSync(h.stateFile, JSON.stringify({ until: utc(2026, 10, 28, 7, 0, 0), setAt: utc(2026, 10, 27, 7, 5, 0) }));
  h.guard.start({});
  await h.advanceTo(utc(2026, 10, 27, 9, 0, 10));
  assert.equal(h.guard.getState(), null);
  assert.ok(h.has("trigger=backoff-retry verification=succeeded maintenance=cleared"));
});

test("an overdue check is triggered by traffic even if a timer was missed", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => {} });
  h.guard.markQuotaExceeded();
  h.clock.t += 10 * 60 * 1000;
  const shown = h.guard.getQuotaMaintenanceUntil();
  assert.ok(shown > h.clock.t);
  await h.guard.whenIdle();
  assert.equal(h.guard.getState(), null);
  assert.ok(h.has("trigger=overdue-retry"));
});

test("the displayed countdown can never be in the past, so the page cannot reload in a loop", async () => {
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw quotaErr(); } });
  h.guard.markQuotaExceeded();
  const state = h.guard.getState();
  h.clock.t = state.until + 60000;
  const shown = h.guard.getQuotaMaintenanceUntil();
  assert.ok(shown >= h.clock.t + 15000);
});

test("logs never contain project identifiers or credentials", async () => {
  const secret = Object.assign(new Error("7 PERMISSION_DENIED: projects/my-secret-project/databases/(default) denied"), { code: 7 });
  const h = harness({ start: utc(2026, 10, 27, 12), probe: async () => { throw secret; } });
  h.guard.markQuotaExceeded();
  await h.advanceTo(utc(2026, 10, 27, 12, 2, 0));
  assert.ok(h.logs.every(([, m]) => !m.includes("my-secret-project")));
  assert.ok(h.has("projects/[redacted]"));
});

test("website gate: blocks while active, allows health and logout, and lets traffic through when cleared", () => {
  const stateFile = path.join(workDir, ".quota-maintenance.json");
  const run = (reqPath) => {
    const out = { nexted: false, status: null, body: null, headers: {} };
    const res = {
      set: (k, v) => { out.headers[k] = v; return res; },
      status: (c) => { out.status = c; return res; },
      json: (b) => { out.body = b; return res; },
      type: () => res,
      send: (b) => { out.body = b; return res; },
    };
    quotaMaintenanceGate({ path: reqPath }, res, () => { out.nexted = true; });
    return out;
  };
  assert.equal(run("/").nexted, true);
  markQuotaExceeded();
  assert.ok(fs.existsSync(stateFile));
  assert.equal(run("/").status, 503);
  assert.match(run("/").body, /Site is undergoing Maintenance/);
  assert.equal(run("/api/profile").status, 503);
  assert.ok(run("/api/profile").body.maintenanceUntil > Date.now());
  assert.equal(run("/health").nexted, true);
  assert.equal(run("/api/logout").nexted, true);
  fs.unlinkSync(stateFile);
  assert.equal(run("/").nexted, true);
  assert.equal(getQuotaMaintenanceUntil(), null);
});
