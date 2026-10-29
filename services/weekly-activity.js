import crypto from "crypto";

export const WEEKLY_ACTIVITY_HOURS = 50;
export const WEEKLY_ACTIVITY_REQUIRED_DAYS = 5;
export const WEEKLY_ACTIVITY_REWARD_COINS = 5;
export const WEEKLY_ACTIVITY_TARGET_SECONDS = WEEKLY_ACTIVITY_HOURS * 60 * 60;
export const WEEKLY_ACTIVITY_DAY_SECONDS = 60 * 60;
export const WEEKLY_ACTIVITY_MIN_PULSE_MS = 75 * 1000;
export const WEEKLY_ACTIVITY_MAX_PULSE_MS = 160 * 1000;
export const WEEKLY_ACTIVITY_MAX_CREDIT_MS = 130 * 1000;
const ABUSE_LOG_COOLDOWN_MS = 15 * 60 * 1000;
const ACTIVITY_CHALLENGE_TTL_MS = 3 * 60 * 1000;
const ABUSE_CODES = new Set([
  "client_supplied_progress",
  "invalid_session_id",
  "missing_interaction",
  "rapid_pulse",
  "overlapping_sessions",
  "regular_heartbeat_pattern",
  "repeated_interaction_pattern",
  "invalid_activity_challenge",
  "coin_ledger_mismatch",
]);
const INTERACTION_KINDS = new Set(["pointer", "keyboard", "touch", "scroll"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export function getWeeklyActivityPeriod(now = Date.now()) {
  const date = new Date(now);
  const offsetFromMonday = (date.getUTCDay() + 6) % 7;
  const startAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - offsetFromMonday);
  const endAt = startAt + 7 * DAY_MS;
  return {
    key: new Date(startAt).toISOString().slice(0, 10),
    startAt,
    endAt,
  };
}

function dataForPeriod(data, period) {
  const sameWeek = data && data.weekKey === period.key;
  return {
    ...(sameWeek ? data : {}),
    weekKey: period.key,
    seconds: sameWeek ? Math.max(0, Number(data.seconds) || 0) : 0,
    daySeconds: sameWeek && data.daySeconds && typeof data.daySeconds === "object" ? { ...data.daySeconds } : {},
    lastBeatAt: sameWeek && Number.isFinite(data.lastBeatAt) ? data.lastBeatAt : null,
    sessionHash: sameWeek && typeof data.sessionHash === "string" ? data.sessionHash : null,
    recentIntervals: sameWeek && Array.isArray(data.recentIntervals) ? data.recentIntervals.slice(-8) : [],
    challengeHash: sameWeek && typeof data.challengeHash === "string" ? data.challengeHash : null,
    challengeAt: sameWeek && Number.isFinite(data.challengeAt) ? data.challengeAt : null,
    claimedWeek: data && typeof data.claimedWeek === "string" ? data.claimedWeek : null,
    suspiciousLoggedAt: data && data.suspiciousLoggedAt && typeof data.suspiciousLoggedAt === "object"
      ? { ...data.suspiciousLoggedAt }
      : {},
    suspiciousCount: data && data.suspiciousCount && typeof data.suspiciousCount === "object"
      ? { ...data.suspiciousCount }
      : {},
  };
}

export function summarizeWeeklyActivity(data, now = Date.now(), coinBalance = 0) {
  const period = getWeeklyActivityPeriod(now);
  const state = dataForPeriod(data, period);
  const seconds = Math.min(WEEKLY_ACTIVITY_TARGET_SECONDS, state.seconds);
  const days = Array.from({ length: 7 }, (_, index) => {
    const at = period.startAt + index * DAY_MS;
    const key = new Date(at).toISOString().slice(0, 10);
    const activeSeconds = Math.min(24 * 60 * 60, Math.max(0, Number(state.daySeconds[key]) || 0));
    return { date: key, seconds: activeSeconds, qualifies: activeSeconds >= WEEKLY_ACTIVITY_DAY_SECONDS };
  });
  const qualifyingDays = days.filter((day) => day.qualifies).length;
  const claimed = state.claimedWeek === period.key;
  const eligible = !claimed && seconds >= WEEKLY_ACTIVITY_TARGET_SECONDS && qualifyingDays >= WEEKLY_ACTIVITY_REQUIRED_DAYS;
  const secondsRemaining = Math.max(0, WEEKLY_ACTIVITY_TARGET_SECONDS - seconds);

  return {
    weekKey: period.key,
    weekStartAt: period.startAt,
    resetAt: period.endAt,
    serverNow: now,
    seconds,
    targetSeconds: WEEKLY_ACTIVITY_TARGET_SECONDS,
    hoursCompleted: Math.floor(seconds / 3600),
    hoursExact: Math.round((seconds / 3600) * 10) / 10,
    hoursRemaining: Math.ceil(secondsRemaining / 3600),
    secondsRemaining,
    progressPercent: Math.min(100, Math.round((seconds / WEEKLY_ACTIVITY_TARGET_SECONDS) * 1000) / 10),
    qualifyingDays,
    requiredDays: WEEKLY_ACTIVITY_REQUIRED_DAYS,
    daysRemaining: Math.max(0, WEEKLY_ACTIVITY_REQUIRED_DAYS - qualifyingDays),
    days,
    claimed,
    eligible,
    rewardCoins: WEEKLY_ACTIVITY_REWARD_COINS,
    coinBalance: Math.max(0, Number(coinBalance) || 0),
  };
}

function hashSession(sessionId) {
  return crypto.createHash("sha256").update(sessionId).digest("hex");
}

function newActivityChallenge() {
  return crypto.randomBytes(32).toString("hex");
}

function challengeMatches(expectedHash, challenge) {
  if (typeof expectedHash !== "string" || typeof challenge !== "string") return false;
  const actual = Buffer.from(hashSession(challenge), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function abuseEventId(uid, code) {
  return crypto.createHash("sha256").update(`${uid}:${code}`).digest("hex");
}

function makeError(message, status = 400, code = "weekly_activity/invalid_request") {
  return Object.assign(new Error(message), { status, code });
}

function validatePulseBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw makeError("A valid activity heartbeat is required.");
  }
  const keys = Object.keys(body);
  const allowed = new Set(["sessionId", "interacted", "activityKinds", "challenge"]);
  if (keys.some((key) => !allowed.has(key))) {
    throw Object.assign(makeError("Activity time and progress are calculated by the server."), {
      abuseCode: "client_supplied_progress",
    });
  }
  if (typeof body.sessionId !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(body.sessionId)) {
    throw Object.assign(makeError("The activity session is invalid."), { abuseCode: "invalid_session_id" });
  }
  if (body.challenge !== undefined && (typeof body.challenge !== "string" || !/^[a-f0-9]{64}$/.test(body.challenge))) {
    throw Object.assign(makeError("The activity challenge is invalid."), { abuseCode: "invalid_activity_challenge" });
  }
  if (body.interacted !== true || !Array.isArray(body.activityKinds)) {
    throw Object.assign(makeError("A recent visible interaction is required."), { abuseCode: "missing_interaction" });
  }
  const kinds = [...new Set(body.activityKinds)];
  if (!kinds.length || kinds.length > 4 || kinds.some((kind) => !INTERACTION_KINDS.has(kind))) {
    throw Object.assign(makeError("A recent visible interaction is required."), { abuseCode: "missing_interaction" });
  }
  return { sessionHash: hashSession(body.sessionId), activityKinds: kinds.sort(), challenge: body.challenge || null };
}

function shouldLogAbuse(data, code, now) {
  const previous = Number(data?.suspiciousLoggedAt?.[code]) || 0;
  return now - previous >= ABUSE_LOG_COOLDOWN_MS;
}

function queueAbuse(tx, db, activityRef, data, uid, code, now, weekKey, eventId) {
  if (!ABUSE_CODES.has(code) || !shouldLogAbuse(data, code, now)) {
    return {
      logged: false,
      suspiciousLoggedAt: { ...(data?.suspiciousLoggedAt || {}) },
      suspiciousCount: { ...(data?.suspiciousCount || {}) },
    };
  }
  const suspiciousLoggedAt = { ...(data?.suspiciousLoggedAt || {}), [code]: now };
  const suspiciousCount = { ...(data?.suspiciousCount || {}), [code]: (Number(data?.suspiciousCount?.[code]) || 0) + 1 };
  tx.set(db.collection("weeklyActivityAbuse").doc(eventId), {
    uid,
    code,
    weekKey,
    at: now,
    occurrences: suspiciousCount[code],
  }, { merge: true });
  return { logged: true, suspiciousLoggedAt, suspiciousCount };
}

function splitCreditAcrossDays(daySeconds, startAt, endAt) {
  const nextDays = { ...daySeconds };
  let cursor = startAt;
  while (cursor < endAt) {
    const dayStart = Date.UTC(
      new Date(cursor).getUTCFullYear(),
      new Date(cursor).getUTCMonth(),
      new Date(cursor).getUTCDate(),
    );
    const boundary = Math.min(endAt, dayStart + DAY_MS);
    const key = new Date(dayStart).toISOString().slice(0, 10);
    nextDays[key] = (Number(nextDays[key]) || 0) + (boundary - cursor) / 1000;
    cursor = boundary;
  }
  return nextDays;
}

export function createWeeklyActivityService({
  db,
  increment,
  appendCoinLedger,
  coinLedgerMismatch,
  assertCoinsAllowed,
  invalidateProfileCache = () => {},
  now = () => Date.now(),
  onAbuse = () => {},
}) {
  if (!db || typeof db.runTransaction !== "function") throw new TypeError("A Firestore-compatible database is required.");

  function activityRefFor(uid) {
    return db.collection("users").doc(uid).collection("weeklyActivity").doc("current");
  }

  async function recordAbuse(uid, code, timestamp = now()) {
    if (!ABUSE_CODES.has(code)) return false;
    const period = getWeeklyActivityPeriod(timestamp);
    const activityRef = activityRefFor(uid);
    const eventId = abuseEventId(uid, code);
    const logged = await db.runTransaction(async (tx) => {
      const snap = await tx.get(activityRef);
      const data = snap.exists ? snap.data() : {};
      const abuse = queueAbuse(tx, db, activityRef, data, uid, code, timestamp, period.key, eventId);
      if (abuse.logged) {
        tx.set(activityRef, {
          suspiciousLoggedAt: abuse.suspiciousLoggedAt,
          suspiciousCount: abuse.suspiciousCount,
          updatedAt: timestamp,
        }, { merge: true });
      }
      return abuse.logged;
    });
    if (logged) onAbuse({ uid, code, at: timestamp, weekKey: period.key });
    return logged;
  }

  async function getSummary(uid, coinBalance = 0) {
    const nowValue = now();
    const ref = activityRefFor(String(uid));
    const snap = await ref.get();
    return summarizeWeeklyActivity(snap.exists ? snap.data() : null, nowValue, coinBalance);
  }

  async function recordPulse(uid, body) {
    let timestamp = now();
    let period = getWeeklyActivityPeriod(timestamp);
    let pulse;
    try {
      pulse = validatePulseBody(body);
    } catch (err) {
      if (err.abuseCode) await recordAbuse(String(uid), err.abuseCode, timestamp);
      throw err;
    }

    const activityRef = activityRefFor(String(uid));
    const result = await db.runTransaction(async (tx) => {
      timestamp = now();
      period = getWeeklyActivityPeriod(timestamp);
      const snap = await tx.get(activityRef);
      const stored = snap.exists ? snap.data() : {};
      if (stored.weekKey && stored.weekKey > period.key) {
        return { status: "stale_week", creditedSeconds: 0, logged: false };
      }
      const state = dataForPeriod(stored, period);
      const lastBeatAt = Number(state.lastBeatAt) || 0;
      const storedSession = state.sessionHash || null;
      const base = {
        ...state,
        lastBeatAt: timestamp,
        sessionHash: pulse.sessionHash,
        updatedAt: timestamp,
      };

      if (!snap.exists || stored.weekKey !== period.key || !lastBeatAt) {
        const challenge = newActivityChallenge();
        tx.set(activityRef, { ...base, challengeHash: hashSession(challenge), challengeAt: timestamp }, { merge: true });
        return { status: "baseline", creditedSeconds: 0, logged: false, challenge };
      }

      const intervalMs = timestamp - lastBeatAt;
      if (storedSession && storedSession !== pulse.sessionHash) {
        const abuse = intervalMs <= WEEKLY_ACTIVITY_MAX_PULSE_MS
          ? queueAbuse(tx, db, activityRef, state, String(uid), "overlapping_sessions", timestamp, period.key, abuseEventId(uid, "overlapping_sessions"))
          : { logged: false, suspiciousLoggedAt: state.suspiciousLoggedAt, suspiciousCount: state.suspiciousCount };
        const challenge = newActivityChallenge();
        tx.set(activityRef, {
          ...base,
          recentIntervals: [],
          sameInteractionRun: 0,
          lastInteractionKinds: [],
          suspiciousLoggedAt: abuse.suspiciousLoggedAt,
          suspiciousCount: abuse.suspiciousCount,
          challengeHash: hashSession(challenge),
          challengeAt: timestamp,
        }, { merge: true });
        return { status: "session_reset", creditedSeconds: 0, logged: abuse.logged, code: "overlapping_sessions", challenge };
      }

      const challengeIsValid = pulse.challenge
        && challengeMatches(state.challengeHash, pulse.challenge)
        && Number.isFinite(state.challengeAt)
        && timestamp >= state.challengeAt
        && timestamp - state.challengeAt <= ACTIVITY_CHALLENGE_TTL_MS;
      if (!challengeIsValid) {
        const abuse = queueAbuse(tx, db, activityRef, state, String(uid), "invalid_activity_challenge", timestamp, period.key, abuseEventId(uid, "invalid_activity_challenge"));
        const challenge = newActivityChallenge();
        tx.set(activityRef, {
          ...base,
          recentIntervals: [],
          sameInteractionRun: 0,
          lastInteractionKinds: [],
          suspiciousLoggedAt: abuse.suspiciousLoggedAt,
          suspiciousCount: abuse.suspiciousCount,
          challengeHash: hashSession(challenge),
          challengeAt: timestamp,
        }, { merge: true });
        return { status: "challenge_reset", creditedSeconds: 0, logged: abuse.logged, code: "invalid_activity_challenge", challenge };
      }

      if (intervalMs < WEEKLY_ACTIVITY_MIN_PULSE_MS) {
        const abuse = intervalMs > 0 && intervalMs < 30 * 1000
          ? queueAbuse(tx, db, activityRef, state, String(uid), "rapid_pulse", timestamp, period.key, abuseEventId(uid, "rapid_pulse"))
          : { logged: false, suspiciousLoggedAt: state.suspiciousLoggedAt, suspiciousCount: state.suspiciousCount };
        if (abuse.logged) {
          tx.set(activityRef, { suspiciousLoggedAt: abuse.suspiciousLoggedAt, suspiciousCount: abuse.suspiciousCount, updatedAt: timestamp }, { merge: true });
        }
        return { status: "too_soon", creditedSeconds: 0, logged: abuse.logged, code: "rapid_pulse" };
      }

      if (intervalMs > WEEKLY_ACTIVITY_MAX_PULSE_MS) {
        const challenge = newActivityChallenge();
        tx.set(activityRef, {
          ...base,
          recentIntervals: state.recentIntervals,
          challengeHash: hashSession(challenge),
          challengeAt: timestamp,
          updatedAt: timestamp,
        }, { merge: true });
        return { status: "idle_gap", creditedSeconds: 0, logged: false, challenge };
      }

      const creditedMs = Math.min(intervalMs, WEEKLY_ACTIVITY_MAX_CREDIT_MS);
      const creditedSeconds = Math.floor(creditedMs / 1000);
      const recentIntervals = [...state.recentIntervals, intervalMs].slice(-8);
      const intervalRange = recentIntervals.length >= 8
        ? Math.max(...recentIntervals) - Math.min(...recentIntervals)
        : Number.POSITIVE_INFINITY;
      const cadenceSuspected = recentIntervals.length >= 8 && intervalRange <= 400;
      const sameKinds = JSON.stringify(state.lastInteractionKinds || []) === JSON.stringify(pulse.activityKinds);
      const sameInteractionRun = sameKinds ? Math.min(1000, (Number(state.sameInteractionRun) || 0) + 1) : 1;
      const repeatedInteractionSuspected = sameInteractionRun >= 20 && recentIntervals.length >= 8 && intervalRange <= 400;
      const abuseCode = repeatedInteractionSuspected
        ? "repeated_interaction_pattern"
        : (cadenceSuspected ? "regular_heartbeat_pattern" : null);
      const suspiciousTiming = cadenceSuspected || repeatedInteractionSuspected;
      const abuse = abuseCode
        ? queueAbuse(tx, db, activityRef, state, String(uid), abuseCode, timestamp, period.key, abuseEventId(uid, abuseCode))
        : { logged: false, suspiciousLoggedAt: state.suspiciousLoggedAt, suspiciousCount: state.suspiciousCount };
      const awardedSeconds = suspiciousTiming ? 0 : creditedSeconds;
      const daySeconds = suspiciousTiming ? state.daySeconds : splitCreditAcrossDays(state.daySeconds, timestamp - creditedMs, timestamp);
      const challenge = newActivityChallenge();
      tx.set(activityRef, {
        ...state,
        seconds: Math.min(7 * 24 * 60 * 60, state.seconds + awardedSeconds),
        daySeconds,
        lastBeatAt: timestamp,
        sessionHash: pulse.sessionHash,
        recentIntervals,
        sameInteractionRun,
        lastInteractionKinds: pulse.activityKinds,
        suspiciousLoggedAt: abuse.suspiciousLoggedAt,
        suspiciousCount: abuse.suspiciousCount,
        challengeHash: hashSession(challenge),
        challengeAt: timestamp,
        updatedAt: timestamp,
      }, { merge: true });
      return {
        status: suspiciousTiming ? "review_signal" : "credited",
        creditedSeconds: awardedSeconds,
        logged: abuse.logged,
        code: abuseCode || "regular_heartbeat_pattern",
        challenge,
      };
    });

    if (result.logged) onAbuse({ uid: String(uid), code: result.code, at: timestamp, weekKey: period.key });
    return { ok: true, ...result };
  }

  async function claim(uid) {
    let timestamp = now();
    let period = getWeeklyActivityPeriod(timestamp);
    const activityRef = activityRefFor(String(uid));
    const userRef = db.collection("users").doc(String(uid));
    let result;
    try {
      result = await db.runTransaction(async (tx) => {
        timestamp = now();
        period = getWeeklyActivityPeriod(timestamp);
        const [activitySnap, userSnap] = await Promise.all([tx.get(activityRef), tx.get(userRef)]);
        const stored = activitySnap.exists ? activitySnap.data() : {};
        if (stored.weekKey && stored.weekKey > period.key) {
          throw makeError("Activity data changed at the weekly reset. Refresh and try again.", 409, "weekly_activity/stale_week");
        }
        const state = dataForPeriod(stored, period);
        if (state.claimedWeek === period.key) {
          throw makeError("This week's activity reward has already been claimed.", 409, "weekly_activity/already_claimed");
        }
        const summary = summarizeWeeklyActivity(state, timestamp, 0);
        if (!summary.eligible) {
          throw makeError("Complete 50 active hours across 5 qualifying days before claiming.", 409, "weekly_activity/not_eligible");
        }
        if (!userSnap.exists) throw makeError("Your account could not be found.", 404, "weekly_activity/account_missing");
        const userData = userSnap.data() || {};
        if (typeof assertCoinsAllowed === "function") assertCoinsAllowed(userData);
        if (typeof coinLedgerMismatch === "function" && coinLedgerMismatch(userData)) {
          const error = makeError("Your coin balance is under review. Contact support before claiming.", 409, "weekly_activity/coin_review");
          error.abuseCode = "coin_ledger_mismatch";
          throw error;
        }

        const ledgerFields = typeof appendCoinLedger === "function"
          ? appendCoinLedger(tx, userRef, userData, WEEKLY_ACTIVITY_REWARD_COINS, "weekly_activity", {
              weekKey: period.key,
              activeSeconds: summary.seconds,
              qualifyingDays: summary.qualifyingDays,
            })
          : {};
        tx.set(userRef, {
          coinBalance: increment ? increment(WEEKLY_ACTIVITY_REWARD_COINS) : (Number(userData.coinBalance) || 0) + WEEKLY_ACTIVITY_REWARD_COINS,
          ...ledgerFields,
        }, { merge: true });
        tx.set(activityRef, {
          ...state,
          claimedWeek: period.key,
          updatedAt: timestamp,
        }, { merge: true });
        const coinBalance = (Number(userData.coinBalance) || 0) + WEEKLY_ACTIVITY_REWARD_COINS;
        return {
          ok: true,
          coinsAwarded: WEEKLY_ACTIVITY_REWARD_COINS,
          coinBalance,
          summary: summarizeWeeklyActivity({ ...state, claimedWeek: period.key }, timestamp, coinBalance),
        };
      });
    } catch (err) {
      if (err.abuseCode) await recordAbuse(String(uid), err.abuseCode, timestamp);
      throw err;
    }

    invalidateProfileCache(String(uid));
    return result;
  }

  async function listAbuseEvents(limit = 50) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
    const snap = await db.collection("weeklyActivityAbuse").orderBy("at", "desc").limit(safeLimit).get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  return {
    getSummary,
    recordPulse,
    claim,
    listAbuseEvents,
    recordAbuse,
  };
}
