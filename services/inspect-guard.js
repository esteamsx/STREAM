import { db } from "../config/firebase.js";
import { siteOrigin, PAGES } from "../config/site.js";
import { createUserBan, requestIdentity, BAN_MS } from "./device-bans.js";

/* "Website Inspect Detected".
   The API request tester must never be pointed at this website. Anyone who tries is suspended for 72 hours:
   their account, their device and their IP address. The owner gets an in-app alert with the person's details,
   and the device lands in Flagged Devices where it can be blacklisted for good.

   The dependencies that live in other services are passed in once at start up (initInspectGuard), which keeps
   this file free of circular imports. */

const COLLECTION = "inspectBans";
const SWEEP_MS = 5 * 60 * 1000;

let deps = null;
const byIp = new Map();        // ip -> until
const byDevice = new Map();    // deviceId -> until
const byFp = new Map();        // device fingerprint (specific phones only) -> until

export function initInspectGuard(d) {
  deps = d;
  load();
  const t = setInterval(() => { sweep(); if (deps.liftExpiredTempBans) deps.liftExpiredTempBans().catch(() => {}); }, SWEEP_MS);
  if (t.unref) t.unref();
}

/* ---------- which addresses count as "this website" ---------- */
function ownHosts(req) {
  const set = new Set();
  const add = (h) => { const x = String(h || "").trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "").replace(/:\d+$/, ""); if (x) set.add(x); };
  try { add(new URL(siteOrigin()).hostname); } catch { /* ignore */ }
  String(process.env.ALLOWED_HOSTS || "").split(",").forEach(add);
  add(req && (req.hostname || (req.headers && req.headers.host)));
  return [...set];
}

export function isOwnSiteUrl(raw, req) {
  const text = String(raw || "").trim();
  if (!text) return false;
  const candidates = [text];
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) candidates.push("https://" + text.replace(/^\/+/, ""));
  const hosts = ownHosts(req);
  for (const c of candidates) {
    let u;
    try { u = new URL(c); } catch { continue; }
    const h = u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (hosts.some((own) => h === own || h.endsWith("." + own))) return true;
  }
  return false;
}

/* ---------- the 72 hour block on IP and device ---------- */
const clientIp = (req) => String(req.ip || (req.socket && req.socket.remoteAddress) || "");

function remember(rec) {
  if (rec.ip) byIp.set(rec.ip, rec.until);
  if (rec.deviceId) byDevice.set(rec.deviceId, rec.until);
  if (rec.fp) byFp.set(rec.fp, rec.until);
}
function sweep() {
  const now = Date.now();
  for (const m of [byIp, byDevice, byFp]) for (const [k, until] of m) if (until <= now) m.delete(k);
}
async function load() {
  try {
    const snap = await db.collection(COLLECTION).where("until", ">", Date.now()).get();
    snap.docs.forEach((d) => remember(d.data()));
  } catch (err) {
    console.error("[inspect-guard] could not load blocks:", err && err.message);
    setTimeout(load, 60 * 1000).unref();
  }
}

export function isBlocked(req) {
  if (!byIp.size && !byDevice.size && !byFp.size) return false;
  const now = Date.now();
  const ip = clientIp(req);
  if (ip && (byIp.get(ip) || 0) > now) return true;
  const { deviceId, fp, specific } = requestIdentity(req);
  if (deviceId && (byDevice.get(deviceId) || 0) > now) return true;
  return !!(specific && (byFp.get(fp) || 0) > now);
}

function suspendedHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ES TEAMS TV</title>
<style>body{background:#0A0A0F;color:#F3F3FA;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}
.box{max-width:380px}h1{font-size:1.15rem;margin:0 0 10px}p{color:rgba(255,255,255,.55);font-size:.85rem;line-height:1.6;margin:0}.brand{margin-top:26px;font-weight:700;font-size:.85rem;color:#00E0FF}</style></head>
<body><div class="box"><h1>Access suspended</h1><p>This device and network have been suspended for 72 hours because of activity that is not allowed on this website.</p><div class="brand">ES TEAMS TV</div></div></body></html>`;
}

export function inspectBlockGuard(req, res, next) {
  if (req.path === "/favicon.svg" || req.path === "/health") return next();
  if (!isBlocked(req)) return next();
  const wantsHtml = !req.path.startsWith("/api/") && String(req.headers.accept || "").includes("text/html");
  res.set("Cache-Control", "no-store");
  if (wantsHtml) return res.status(403).type("html").send(suspendedHtml());
  return res.status(403).json({ error: "Access suspended for 72 hours.", code: "inspect/suspended" });
}

/* A backup for anyone who skips the tester's own check: a fetch() made from the API tester page that asks
   for one of this site's pages. Normal use never does that, so it is safe to treat as an inspect attempt. */
const PAGE_PATHS = new Set(["/", ...Object.values(PAGES || {}).map((p) => p && p.path).filter(Boolean)]);
export function inspectPageFetchGuard(req, res, next) {
  try {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    if (String(req.headers["sec-fetch-dest"] || "") !== "empty") return next();
    const ref = String(req.headers.referer || "");
    if (!ref) return next();
    let rp;
    try { rp = new URL(ref); } catch { return next(); }
    if (!rp.pathname.startsWith("/tools/api-tester")) return next();
    const p = req.path.length > 1 ? req.path.replace(/\/+$/, "") : req.path;
    if (!PAGE_PATHS.has(p)) return next();
    flagWebsiteInspect(req, { url: req.originalUrl }).catch(() => {});
    return res.status(403).json({ error: "Access suspended for 72 hours.", code: "inspect/suspended" });
  } catch { return next(); }
}

/* ---------- the response to someone inspecting the site ---------- */
export async function flagWebsiteInspect(req, { url } = {}) {
  if (!deps) return { skipped: true };
  const uid = req.uid || null;
  let profile = req.userProfile || null;
  if (uid && !profile) { try { profile = await deps.getUserProfile(uid); } catch { /* ignore */ } }
  if (profile && deps.isAdminEmail(profile.email)) return { skipped: true, admin: true };   // never lock the owner out

  const { dev, deviceId, fp, specific } = requestIdentity(req);
  const ip = clientIp(req) || dev.ip || "";
  const now = Date.now();
  const until = now + BAN_MS;
  const already = ip && (byIp.get(ip) || 0) > now;

  remember({ ip, deviceId, fp: specific ? fp : "", until });
  const banUid = uid || "anon_" + String(fp).slice(0, 16);
  const rec = { ...dev, deviceId, ip };

  const jobs = [
    db.collection(COLLECTION).add({ ip, deviceId, fp: specific ? fp : "", uid: uid || "", until, createdAt: now, url: String(url || "").slice(0, 300) }),
    createUserBan(banUid, rec, "inspect"),
  ];
  if (uid && deps.tempBanUser) jobs.push(deps.tempBanUser(uid, BAN_MS, "website_inspect"));
  const done = await Promise.allSettled(jobs);
  done.forEach((r) => { if (r.status === "rejected") console.error("[inspect-guard]", r.reason && r.reason.message); });

  if (!already) {
    try {
      const adminUid = await deps.getAdminUid();
      if (adminUid) {
        const who = profile ? "@" + (profile.username || "user") : "A visitor";
        await deps.addNotification(adminUid, "website_inspect", `Website Inspect Detected: ${who} tried to inspect the website`, {
          uid: uid || "", username: profile ? profile.username || "" : "",
          name: profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "",
          device: { name: dev.name || "", model: dev.model || "", type: dev.type || "", browser: dev.browser || "", os: dev.os || "", ip },
          expiresAt: until, url: String(url || "").slice(0, 200), link: "/admin",
        });
        if (deps.sendPushToUid) {
          deps.sendPushToUid(adminUid, { title: "ES TEAMS TV", body: "Website Inspect Detected", url: "/account", tag: "inspect-" + now }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[inspect-guard] could not notify the admin:", err && err.message);
    }
  }
  return { banned: true, until };
}
