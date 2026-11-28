import fs from "fs";
import path from "path";

const DEFAULT_STATE_FILE = path.join(process.cwd(), ".quota-maintenance.json");

const ALLOWED_PATHS = new Set(["/health", "/api/logout"]);

const PACIFIC_TZ = "America/Los_Angeles";
const NIGERIA_TZ = "Africa/Lagos";
const NIGERIA_RESET_UTC_HOUR = 7;
const ERROR_WINDOW_MS = 2 * 60 * 1000;
const ERROR_THRESHOLD = 2;
const CONFIRM_COOLDOWN_MS = 60 * 1000;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 60 * 60 * 1000;
const MAX_HOLD_MS = 26 * 60 * 60 * 1000;
const MIN_DISPLAY_MS = 15 * 1000;
const PROBE_TIMEOUT_MS = 8000;
const RESET_SLACK_MS = 1000;
const MAX_TIMER_MS = 2147483647;
const TRANSIENT_LOG_GAP_MS = 60 * 1000;

function classifyQuotaError(err) {
  if (!err) return "none";
  const msg = String(err.message || "");
  const exhausted = err.code === 8 || err.code === "8" || /resource_exhausted/i.test(msg) || /quota exceeded/i.test(msg);
  if (!exhausted) return "none";
  if (/message larger than max|max(imum)? message size|exceeds the maximum|maximum allowed size/i.test(msg)) return "other";
  if (/per (minute|second|user)|\brate\b|too many|throttl|try again|backoff|contention/i.test(msg)) return "transient";
  if (/quota exceeded/i.test(msg)) return "daily";
  return "ambiguous";
}

function isQuotaExceededError(err) {
  const kind = classifyQuotaError(err);
  return kind === "daily" || kind === "ambiguous";
}

function nextEightAmWAT(fromMs) {
  const from = new Date(fromMs);
  const target = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), NIGERIA_RESET_UTC_HOUR, 0, 0, 0));
  if (from.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime();
}

function tzOffsetMs(instantMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(instantMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

function nextPacificMidnight(fromMs) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PACIFIC_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(fromMs));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const naive = Date.UTC(get("year"), get("month") - 1, get("day") + 1, 0, 0, 0);
  let target = naive;
  for (let i = 0; i < 3; i++) target = naive - tzOffsetMs(target, PACIFIC_TZ);
  return target;
}

function nextResets(fromMs) {
  const pacific = nextPacificMidnight(fromMs);
  const nigeria = nextEightAmWAT(fromMs);
  return { pacific, nigeria, next: Math.min(pacific, nigeria) };
}

function formatPacific(ms) {
  return new Intl.DateTimeFormat("en-US", { timeZone: PACIFIC_TZ, dateStyle: "medium", timeStyle: "long" }).format(new Date(ms));
}

function formatNigeria(ms) {
  return new Intl.DateTimeFormat("en-US", { timeZone: NIGERIA_TZ, dateStyle: "medium", timeStyle: "medium" }).format(new Date(ms)) + " WAT";
}

function describeFailure(err) {
  if (!err) return "unknown error";
  const code = err.code !== undefined ? String(err.code) : "none";
  const msg = String(err.message || err.name || "error")
    .replace(/projects\/[^\s/]+/gi, "projects/[redacted]")
    .replace(/\s+/g, " ")
    .slice(0, 160);
  return "code=" + code + " message=" + msg;
}

function createQuotaGuard(options = {}) {
  const now = options.now || (() => Date.now());
  const stateFile = options.stateFile || DEFAULT_STATE_FILE;
  const log = options.log || console;
  const setTimer = options.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer || ((handle) => clearTimeout(handle));
  let probe = options.probe || null;

  let errorTimes = [];
  let confirming = null;
  let lastConfirmAt = 0;
  let lastTransientLogAt = 0;
  let recovering = null;
  let resetTimer = null;
  let retryTimer = null;
  let scheduled = null;
  const executed = new Set();

  function stamp() {
    const t = now();
    return "pacific=\"" + formatPacific(t) + "\" nigeria=\"" + formatNigeria(t) + "\"";
  }

  function readState() {
    try {
      if (!fs.existsSync(stateFile)) return null;
      const data = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      return data && typeof data === "object" ? data : null;
    } catch (readErr) {
      return null;
    }
  }

  function writeState(state) {
    try {
      fs.writeFileSync(stateFile, JSON.stringify(state));
      return true;
    } catch (writeErr) {
      return false;
    }
  }

  function clearState() {
    try {
      fs.unlinkSync(stateFile);
    } catch (unlinkErr) {
    }
  }

  function isQuotaState(state) {
    return !state.reason || state.reason === "quota";
  }

  function unrefTimer(handle) {
    if (handle && typeof handle.unref === "function") handle.unref();
    return handle;
  }

  function runProbe() {
    return new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        reject(new Error("verification timed out"));
      }, PROBE_TIMEOUT_MS);
      unrefTimer(timer);
      Promise.resolve()
        .then(() => probe())
        .then(
          (value) => { if (done) return; done = true; clearTimeout(timer); resolve(value); },
          (err) => { if (done) return; done = true; clearTimeout(timer); reject(err); }
        );
    });
  }

  function armRetryTimer(atMs) {
    if (retryTimer) clearTimer(retryTimer);
    const delay = Math.max(1000, Math.min(atMs - now(), MAX_TIMER_MS));
    retryTimer = unrefTimer(setTimer(() => {
      retryTimer = null;
      attemptRecovery("backoff-retry");
    }, delay));
  }

  function trip(trigger) {
    const t = now();
    const existing = readState();
    if (existing && Number(existing.until) > t) return false;
    const resets = nextResets(t);
    const state = { reason: "quota", setAt: t, until: resets.next, nextRetryAt: t + RETRY_BASE_MS, failures: 0, trigger };
    if (!writeState(state)) {
      log.error("[quota-recovery] " + stamp() + " could not persist the quota maintenance state, maintenance not activated");
      return false;
    }
    log.error("[quota-recovery] " + stamp() + " quota maintenance activated trigger=" + trigger
      + " nextVerificationInSec=" + Math.round(RETRY_BASE_MS / 1000)
      + " nextPacificReset=\"" + formatPacific(resets.pacific) + "\" nextNigeriaReset=\"" + formatNigeria(resets.nigeria) + "\"");
    armRetryTimer(state.nextRetryAt);
    return true;
  }

  function markQuotaExceeded() {
    return trip("forced");
  }

  function confirmAndTrip(kind) {
    if (confirming) return confirming;
    const t = now();
    if (t - lastConfirmAt < CONFIRM_COOLDOWN_MS) return null;
    lastConfirmAt = t;
    confirming = (async () => {
      if (!probe) {
        trip("repeated-" + kind + "-errors");
        return;
      }
      try {
        await runProbe();
        errorTimes = [];
        log.warn("[quota-recovery] " + stamp() + " repeated quota-class errors but Firestore is responding, maintenance not activated");
      } catch (err) {
        const probeKind = classifyQuotaError(err);
        if (probeKind === "daily" || probeKind === "ambiguous") {
          trip("confirmed-" + probeKind + "-quota");
        } else {
          log.warn("[quota-recovery] " + stamp() + " confirmation failed with a non-quota error, quota maintenance not activated reason=" + describeFailure(err));
        }
      }
    })().finally(() => { confirming = null; });
    return confirming;
  }

  function checkQuotaError(err) {
    const kind = classifyQuotaError(err);
    if (kind === "none" || kind === "other") return;
    const t = now();
    if (kind === "transient") {
      if (t - lastTransientLogAt >= TRANSIENT_LOG_GAP_MS) {
        lastTransientLogAt = t;
        log.warn("[quota-recovery] " + stamp() + " temporary rate limit error ignored for maintenance purposes reason=" + describeFailure(err));
      }
      return;
    }
    const existing = readState();
    if (existing && Number(existing.until) > t) return;
    errorTimes = errorTimes.filter((x) => t - x < ERROR_WINDOW_MS);
    errorTimes.push(t);
    if (errorTimes.length < ERROR_THRESHOLD) return;
    confirmAndTrip(kind);
  }

  function recordFailure(state, trigger, err) {
    const t = now();
    const failures = (Number(state.failures) || 0) + 1;
    const reason = describeFailure(err);
    const kind = classifyQuotaError(err);
    if (state.setAt && t - Number(state.setAt) >= MAX_HOLD_MS) {
      clearState();
      errorTimes = [];
      log.warn("[quota-recovery] " + stamp() + " trigger=" + trigger + " verification=failed maintenance=released cause=maximum hold time reached reason=" + reason);
      return { status: "released", reason, kind };
    }
    const nextRetryAt = t + Math.min(RETRY_MAX_MS, RETRY_BASE_MS * Math.pow(2, failures));
    const resets = nextResets(t);
    writeState({ ...state, failures, lastProbeAt: t, lastFailure: reason, nextRetryAt, until: resets.next });
    armRetryTimer(nextRetryAt);
    const cause = kind === "daily" || kind === "ambiguous" || kind === "transient" ? "quota still exhausted" : "firestore not reachable";
    log.warn("[quota-recovery] " + stamp() + " trigger=" + trigger + " verification=failed maintenance=retained cause=\"" + cause + "\" reason=" + reason
      + " nextRetryInSec=" + Math.round((nextRetryAt - t) / 1000)
      + " nextPacificReset=\"" + formatPacific(resets.pacific) + "\" nextNigeriaReset=\"" + formatNigeria(resets.nigeria) + "\"");
    return { status: "retained", reason, kind };
  }

  async function performRecovery(trigger) {
    const state = readState();
    if (!state) return { status: "idle" };
    if (!isQuotaState(state)) {
      log.log("[quota-recovery] " + stamp() + " trigger=" + trigger + " maintenance state is not quota related, left untouched");
      return { status: "untouched" };
    }
    if (!probe) return { status: "no-probe" };
    try {
      await runProbe();
    } catch (err) {
      return recordFailure(state, trigger, err);
    }
    clearState();
    errorTimes = [];
    log.log("[quota-recovery] " + stamp() + " trigger=" + trigger + " verification=succeeded maintenance=cleared");
    return { status: "cleared" };
  }

  function attemptRecovery(trigger) {
    if (recovering) return recovering;
    recovering = performRecovery(trigger).catch((err) => {
      log.error("[quota-recovery] " + stamp() + " recovery attempt failed unexpectedly reason=" + describeFailure(err));
      return { status: "error" };
    }).finally(() => { recovering = null; });
    return recovering;
  }

  async function runReset(names, instants) {
    log.log("[quota-recovery] " + stamp() + " reset executed mechanisms=" + names.join("+")
      + " scheduledPacific=\"" + formatPacific(instants.pacific) + "\" scheduledNigeria=\"" + formatNigeria(instants.nigeria) + "\"");
    errorTimes = [];
    lastConfirmAt = 0;
    const state = readState();
    if (!state) {
      log.log("[quota-recovery] " + stamp() + " reset found no quota maintenance active, nothing to clear");
      return { status: "idle" };
    }
    return attemptRecovery("reset:" + names.join("+"));
  }

  function armResetTimer() {
    if (resetTimer) clearTimer(resetTimer);
    const t = now();
    const resets = nextResets(t);
    scheduled = { pacific: resets.pacific, nigeria: resets.nigeria };
    const delay = Math.max(1000, Math.min(resets.next - t, MAX_TIMER_MS));
    resetTimer = unrefTimer(setTimer(() => {
      resetTimer = null;
      onResetTimer();
    }, delay));
  }

  function onResetTimer() {
    const t = now();
    const due = [];
    const plan = scheduled || nextResets(t);
    if (plan.pacific <= t + RESET_SLACK_MS) due.push(["pacific-midnight", plan.pacific]);
    if (plan.nigeria <= t + RESET_SLACK_MS) due.push(["nigeria-8am", plan.nigeria]);
    const fresh = due.filter(([name, instant]) => !executed.has(name + "@" + instant));
    for (const [name, instant] of fresh) executed.add(name + "@" + instant);
    while (executed.size > 12) executed.delete(executed.values().next().value);
    armResetTimer();
    if (!fresh.length) return null;
    return runReset(fresh.map(([name]) => name), plan);
  }

  function getQuotaMaintenanceUntil() {
    const state = readState();
    if (!state) return null;
    const t = now();
    if (!isQuotaState(state) || !probe) {
      if (!state.until || t >= state.until) {
        clearState();
        return null;
      }
      return state.until;
    }
    if (state.setAt && t - Number(state.setAt) >= MAX_HOLD_MS) {
      clearState();
      log.warn("[quota-recovery] " + stamp() + " trigger=maximum-hold maintenance=released cause=maximum hold time reached");
      return null;
    }
    if (t >= (Number(state.nextRetryAt) || 0) && !recovering) attemptRecovery("overdue-retry");
    return Math.max(Number(state.until) || 0, t + MIN_DISPLAY_MS);
  }

  function start(config = {}) {
    if (config.probe) probe = config.probe;
    armResetTimer();
    const state = readState();
    if (state && isQuotaState(state)) {
      const t = now();
      log.warn("[quota-recovery] " + stamp() + " startup found quota maintenance active, verification scheduled");
      armRetryTimer(t + 5000);
    }
  }

  function stop() {
    if (resetTimer) clearTimer(resetTimer);
    if (retryTimer) clearTimer(retryTimer);
    resetTimer = null;
    retryTimer = null;
  }

  return {
    checkQuotaError,
    markQuotaExceeded,
    getQuotaMaintenanceUntil,
    attemptRecovery,
    onResetTimer,
    start,
    stop,
    getState: readState,
    whenIdle: () => Promise.all([confirming, recovering]),
  };
}

function quotaMaintenanceHtml(untilMs) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
<style>
  *{box-sizing:border-box}
  body{
    background:#0A0A0F;color:#F3F3FA;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;padding:24px;text-align:center;
    background-image:
      radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.08),transparent 60%),
      radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.06),transparent 55%);
  }
  .box{max-width:380px;display:flex;flex-direction:column;align-items:center}
  .ring{
    position:relative;width:30px;height:30px;border-radius:50%;flex-shrink:0;margin:22px 0 46px;
    background:url(/favicon.svg) center/cover no-repeat;
    box-shadow:0 0 14px #00E0FF;
  }
  .ring::before,.ring::after{
    content:"";position:absolute;border-radius:50%;box-sizing:border-box;
    border:2.5px solid transparent;
  }
  .ring::before{
    inset:-22px;border-top-color:#00E0FF;border-right-color:#00E0FF;
    animation:spin 1.1s linear infinite;
  }
  .ring::after{
    inset:-10px;border-width:2px;border-bottom-color:#00E0FF;border-left-color:#00E0FF;opacity:.75;
    animation:ssRev .85s linear infinite;
  }
  @keyframes ssRev{to{transform:rotate(-360deg)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.15rem;margin:0 0 10px;font-weight:700}
  p{color:rgba(255,255,255,.55);font-size:.85rem;line-height:1.6;margin:0}
  .brand{
    margin-top:28px;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:.85rem;
    background:linear-gradient(90deg,#00E0FF,#7c5cff);-webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .cd-wrap{margin-top:24px;width:100%}
  .cd-label{
    font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
    color:rgba(255,255,255,.4);margin-bottom:10px;
  }
  .cd-grid{display:flex;gap:8px;justify-content:center}
  .cd-cell{
    flex:1;max-width:78px;padding:11px 4px;border-radius:12px;
    background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
    border:1px solid rgba(255,255,255,.16);
    box-shadow:0 10px 26px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.2);
  }
  .cd-num{
    font-family:ui-monospace,'JetBrains Mono',monospace;font-size:1.32rem;font-weight:700;
    line-height:1.1;letter-spacing:-.02em;
  }
  .cd-unit{
    font-size:.56rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
    color:rgba(255,255,255,.42);margin-top:4px;
  }
</style>
</head>
<body>
  <div class="box">
    <div class="ring"></div>
    <h1>Site is undergoing Maintenance</h1>
    <p>Please try again shortly.</p>
    <div class="cd-wrap" id="countdown">
      <div class="cd-label">Back online in</div>
      <div class="cd-grid">
        <div class="cd-cell"><div class="cd-num" id="cdHours">00</div><div class="cd-unit">Hours</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdMins">00</div><div class="cd-unit">Mins</div></div>
        <div class="cd-cell"><div class="cd-num" id="cdSecs">00</div><div class="cd-unit">Secs</div></div>
      </div>
    </div>
    <div class="brand">ES TEAMS TV</div>
  </div>
  <script nonce="__CSP_NONCE__">
    var until = ${JSON.stringify(untilMs)};
    function pad(n){ return String(n).padStart(2, '0'); }
    function tick(){
      var remain = Math.max(0, until - Date.now());
      var h = Math.floor(remain / 3600000);
      var m = Math.floor((remain % 3600000) / 60000);
      var s = Math.floor((remain % 60000) / 1000);
      document.getElementById('cdHours').textContent = pad(h);
      document.getElementById('cdMins').textContent = pad(m);
      document.getElementById('cdSecs').textContent = pad(s);
      if (remain <= 0) window.location.reload();
    }
    tick();
    setInterval(tick, 1000);
    setInterval(function(){
      fetch(window.location.pathname, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' })
        .then(function(r){ if (r.status !== 503) window.location.reload(); })
        .catch(function(){});
    }, 60000);
  </script>
</body>
</html>`;
}

function quotaMaintenanceGate(req, res, next) {
  if (ALLOWED_PATHS.has(req.path)) return next();
  const until = getQuotaMaintenanceUntil();
  if (!until) return next();

  res.set("Cache-Control", "no-store");
  res.set("Retry-After", "3600");
  if (req.path.startsWith("/api/") || req.path.startsWith("/embed/")) {
    return res.status(503).json({
      error: "Site is undergoing maintenance. Please try again shortly.",
      maintenanceUntil: until,
    });
  }
  return res.status(503).type("html").send(quotaMaintenanceHtml(until));
}

const guard = createQuotaGuard();

const checkQuotaError = guard.checkQuotaError;
const markQuotaExceeded = guard.markQuotaExceeded;
const getQuotaMaintenanceUntil = guard.getQuotaMaintenanceUntil;
const startQuotaRecovery = guard.start;

export {
  checkQuotaError,
  markQuotaExceeded,
  getQuotaMaintenanceUntil,
  quotaMaintenanceGate,
  isQuotaExceededError,
  startQuotaRecovery,
  createQuotaGuard,
  classifyQuotaError,
  nextPacificMidnight,
  nextEightAmWAT,
  nextResets,
};
