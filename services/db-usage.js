import admin from "firebase-admin";

const LIMITS = { reads: 50000, writes: 20000, deletes: 20000 };
const METRICS = {
  reads: "firestore.googleapis.com/document/read_count",
  writes: "firestore.googleapis.com/document/write_count",
  deletes: "firestore.googleapis.com/document/delete_count",
};
const CACHE_MS = 45 * 1000;

let cached = null;
let inflight = null;

function projectId() {
  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}").project_id || "";
  } catch {
    return "";
  }
}

function pacificDayWindow(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(now));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const sinceMidnight = ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000;
  const start = now - sinceMidnight;
  return { start, end: now, resetAt: start + 24 * 60 * 60 * 1000 };
}

async function sumMetric(token, project, metric, win) {
  const seconds = Math.max(60, Math.ceil((win.end - win.start) / 1000));
  const params = new URLSearchParams({
    filter: `metric.type="${metric}"`,
    "interval.startTime": new Date(win.start).toISOString(),
    "interval.endTime": new Date(win.end).toISOString(),
    "aggregation.alignmentPeriod": `${seconds}s`,
    "aggregation.perSeriesAligner": "ALIGN_SUM",
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
    view: "FULL",
  });
  const r = await fetch(`https://monitoring.googleapis.com/v3/projects/${encodeURIComponent(project)}/timeSeries?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    const e = body?.error || {};
    const info = (e.details || []).find((d) => d && d.reason) || {};
    const err = new Error(e.message || `Monitoring API ${r.status}`);
    err.status = r.status;
    err.googleStatus = e.status || "";
    err.reason = info.reason || "";
    err.consumer = info.metadata?.consumer || "";
    throw err;
  }
  const data = await r.json();
  let total = 0;
  for (const series of data.timeSeries || []) {
    for (const pt of series.points || []) {
      total += Number(pt.value?.int64Value ?? pt.value?.doubleValue ?? 0);
    }
  }
  return Math.round(total);
}

async function load() {
  const project = projectId();
  if (!project) throw new Error("Firebase project id not found.");
  const cred = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
  const { access_token: token } = await cred.getAccessToken();
  const win = pacificDayWindow();
  const [reads, writes, deletes] = await Promise.all(
    Object.values(METRICS).map((m) => sumMetric(token, project, m, win))
  );
  const used = { reads, writes, deletes };
  const out = { resetAt: win.resetAt, updatedAt: Date.now() };
  for (const k of Object.keys(LIMITS)) {
    out[k] = {
      used: used[k],
      limit: LIMITS[k],
      left: Math.max(0, LIMITS[k] - used[k]),
      percent: Math.min(100, Math.round((used[k] / LIMITS[k]) * 1000) / 10),
    };
  }
  return out;
}

export async function getDbUsage() {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  if (inflight) return inflight;
  inflight = load()
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function googleError(r) {
  const body = await r.json().catch(() => ({}));
  const e = body?.error || {};
  const info = (e.details || []).find((d) => d && d.reason) || {};
  return { httpStatus: r.status, status: e.status || "", reason: info.reason || "", consumer: info.metadata?.consumer || "", message: e.message || "" };
}

export async function diagnoseDbUsage() {
  const out = {
    authMethod: "Service account JSON key from FIREBASE_SERVICE_ACCOUNT_KEY (not Application Default Credentials)",
    monitoringTargetProject: projectId() || null,
  };
  let key;
  try {
    key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "");
  } catch {
    out.error = "FIREBASE_SERVICE_ACCOUNT_KEY is missing or not valid JSON.";
    return out;
  }
  out.keyType = key.type || null;
  out.keyServiceAccountEmail = key.client_email || null;
  out.keyProjectId = key.project_id || null;

  let token;
  try {
    token = (await admin.credential.cert(key).getAccessToken()).access_token;
  } catch (e) {
    out.token = { ok: false, error: String(e.message || e).slice(0, 300) };
    return out;
  }

  try {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: token }),
    });
    const t = await r.json().catch(() => ({}));
    const scopes = String(t.scope || "").split(" ").filter(Boolean);
    out.token = {
      ok: r.ok,
      authenticatedEmail: t.email || null,
      scopes,
      hasMonitoringScope: scopes.some((x) => /auth\/(cloud-platform|monitoring(\.read)?)$/.test(x)),
    };
  } catch (e) {
    out.token = { ok: true, note: "Token issued, tokeninfo check failed: " + String(e.message || e).slice(0, 120) };
  }

  const project = projectId();
  try {
    const r = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(project)}:testIamPermissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: ["monitoring.timeSeries.list"] }),
    });
    if (r.ok) {
      const d = await r.json();
      out.permissionCheck = { permission: "monitoring.timeSeries.list", granted: (d.permissions || []).includes("monitoring.timeSeries.list") };
    } else {
      out.permissionCheck = { error: await googleError(r) };
    }
  } catch (e) {
    out.permissionCheck = { error: String(e.message || e).slice(0, 200) };
  }

  try {
    const win = pacificDayWindow();
    out.monitoringRequest = { ok: true, reads: await sumMetric(token, project, METRICS.reads, win) };
  } catch (e) {
    out.monitoringRequest = { ok: false, httpStatus: e.status || null, status: e.googleStatus || "", reason: e.reason || "", consumer: e.consumer || "", message: e.message };
  }
  return out;
}
