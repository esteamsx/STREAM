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
    const err = new Error(body?.error?.message || `Monitoring API ${r.status}`);
    err.status = r.status;
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
