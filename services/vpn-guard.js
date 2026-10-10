import { clientIp, isPrivateIp } from "./client-ip.js";

const DISABLED = /^(1|true|yes)$/i.test(String(process.env.VPN_BLOCK_DISABLED || ""));
const API_KEY = DISABLED ? "" : (process.env.PROXYCHECK_API_KEY || "");
const ALLOWED_IPS = new Set(String(process.env.VPN_ALLOWED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean));

const TTL_ALLOW_MS = 12 * 60 * 60 * 1000;
const TTL_BLOCK_MS = 60 * 60 * 1000;
const TTL_UNCERTAIN_MS = 15 * 60 * 1000;
const STALE_REUSE_MS = 7 * 24 * 60 * 60 * 1000;
const FAIL_RETRY_MS = 20 * 1000;
const WAIT_READ_MS = 1500;
const WAIT_WRITE_MS = 3500;
const FETCH_ABORT_MS = 4000;
const MAX_CACHE = 20000;
const WIRELESS_MIN_CONFIDENCE = 85;

const EXEMPT_PREFIXES = [
  "/api/v1/",
  "/api/free/",
  "/api/stream-token/",
  "/api/channel-status/",
  "/embed/",
  "/s/",
  "/api/paystack/webhook",
  "/.well-known/",
  "/api/visitor-support/",
];
const EXEMPT_PATHS = new Set(["/health", "/robots.txt", "/favicon.svg", "/favicon.ico", "/outbound-ip", "/api/security/my-ip", "/visitor-support.js"]);



export function classifyIntel(i) {
  if (i.tor) return { action: "block", reason: "tor" };

  const anonymizer = i.anonymous || i.vpn || i.proxy;
  if (anonymizer) {
    const label = i.vpn ? "vpn" : (i.proxy ? (i.residentialProxy ? "residential-proxy" : "proxy") : "anonymizer");
    const weakOnMobile = i.wireless && i.confidence !== null && i.confidence < WIRELESS_MIN_CONFIDENCE;
    if (weakOnMobile) return { action: "uncertain", reason: `${label}-weak-evidence-on-mobile` };
    return { action: "block", reason: label + (i.hosting ? "+datacenter" : "") };
  }
  if (i.compromised) {
    return i.wireless
      ? { action: "uncertain", reason: "compromised-on-mobile" }
      : { action: "block", reason: "compromised" };
  }
  if (i.hosting) return { action: "uncertain", reason: "datacenter-only" };
  return { action: "allow", reason: "clean" };
}

function intelFromV3(entry) {
  const d = entry && entry.detections;
  if (!d || typeof d !== "object") return null;
  const hasFlag = ["anonymous", "proxy", "vpn", "tor"].some((k) => typeof d[k] === "boolean");
  if (!hasFlag) return null;
  const services = entry.operator && Array.isArray(entry.operator.services) ? entry.operator.services.map(String) : [];
  return {
    tor: d.tor === true,
    vpn: d.vpn === true,
    proxy: d.proxy === true,
    compromised: d.compromised === true,
    hosting: d.hosting === true,
    anonymous: d.anonymous === true,
    wireless: /^wireless$/i.test(String((entry.network && entry.network.type) || "")),
    confidence: typeof d.confidence === "number" && Number.isFinite(d.confidence) ? d.confidence : null,
    residentialProxy: services.some((s) => /residential/i.test(s)),
  };
}

const V2_PROXY_TYPES = /^(socks|socks4|socks4a|socks5|socks5h|shadowsocks|http|https|openvpn)$/i;
function intelFromV2(entry) {
  if (!entry || typeof entry !== "object" || (entry.proxy !== "yes" && entry.proxy !== "no")) return null;
  const yes = entry.proxy === "yes";
  const type = String(entry.type || "");
  return {
    tor: yes && /^tor$/i.test(type),
    vpn: yes && /^vpn$/i.test(type),
    proxy: yes && V2_PROXY_TYPES.test(type),
    compromised: yes && /^compromised server$/i.test(type),
    hosting: !yes && /^hosting$/i.test(type),
    anonymous: false,
    wireless: false,
    confidence: null,
    residentialProxy: false,
  };
}


function redact(text) {
  const s = String(text || "");
  return API_KEY ? s.split(API_KEY).join("[key]").split(encodeURIComponent(API_KEY)).join("[key]") : s;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_ABORT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal });
    const data = await r.json().catch(() => null);
    return { httpStatus: r.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function statusProblem(httpStatus, data) {
  if (httpStatus === 429 || httpStatus === 401 || httpStatus === 403) return `provider-refused-${httpStatus}`;
  if (httpStatus >= 500) return `provider-error-${httpStatus}`;
  const s = data && data.status;
  if (s !== "ok" && s !== "warning") return `provider-status-${s || "none"}`;
  return null;
}

async function askV3(ip) {
  const { httpStatus, data } = await fetchJson(`https://proxycheck.io/v3/${encodeURIComponent(ip)}?key=${encodeURIComponent(API_KEY)}`);
  const problem = statusProblem(httpStatus, data);
  if (problem) return { state: "unavailable", reason: problem };
  if (data.status === "warning") noteProviderWarning(data.message);
  let entry = data[ip];
  if (!entry || typeof entry !== "object") entry = Object.values(data).find((v) => v && typeof v === "object" && v.detections);
  const intel = intelFromV3(entry);
  return intel ? { state: "ok", intel, api: "v3" } : { state: "badshape" };
}

async function askV2(ip) {
  const { httpStatus, data } = await fetchJson(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${encodeURIComponent(API_KEY)}&vpn=1&asn=1`);
  const problem = statusProblem(httpStatus, data);
  if (problem) return { state: "unavailable", reason: problem };
  const intel = intelFromV2(data[ip]);
  return intel ? { state: "ok", intel, api: "v2" } : { state: "unavailable", reason: "unreadable-answer" };
}

let v3ShapeFailures = 0;
let v3SkipUntil = 0;

async function lookup(ip) {
  try {
    let r = Date.now() < v3SkipUntil ? { state: "badshape" } : await askV3(ip);
    if (r.state === "badshape") {
      v3ShapeFailures += 1;
      if (v3ShapeFailures >= 5) v3SkipUntil = Date.now() + 15 * 60 * 1000;
      r = await askV2(ip);
    } else if (r.state === "ok") {
      v3ShapeFailures = 0;
    }
    if (r.state !== "ok") return r;
    const verdict = classifyIntel(r.intel);
    return { state: "ok", action: verdict.action, reason: verdict.reason, api: r.api };
  } catch (err) {
    return { state: "unavailable", reason: err && err.name === "AbortError" ? "timeout" : "network-error" };
  }
}


const cache = new Map();
const failures = new Map();
const inflight = new Map();
let warnedNoKey = false;

function normalizeIp(ip) {
  return String(ip || "").replace(/^::ffff:/, "").trim();
}

function remember(ip, v) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  const ttl = v.action === "block" ? TTL_BLOCK_MS : (v.action === "uncertain" ? TTL_UNCERTAIN_MS : TTL_ALLOW_MS);
  const now = Date.now();
  cache.set(ip, { action: v.action, reason: v.reason, until: now + ttl, hardUntil: now + STALE_REUSE_MS });
}

let healthy = true;
let lastHealthLog = 0;
function noteHealth(ok, reason) {
  const now = Date.now();
  if (ok) {
    if (!healthy) console.warn("[vpn-guard] provider recovered, new visitors are being verified again.");
    healthy = true;
    return;
  }
  if (healthy || now - lastHealthLog > 5 * 60 * 1000) {
    console.warn(`[vpn-guard] provider unavailable (${redact(reason)}). Known IPs use their last verdict; new visitors can browse but cannot sign in until it recovers.`);
    lastHealthLog = now;
  }
  healthy = false;
}

let lastWarningLog = 0;
function noteProviderWarning(message) {
  const now = Date.now();
  if (now - lastWarningLog < 10 * 60 * 1000) return;
  lastWarningLog = now;
  console.warn(`[vpn-guard] provider warning: ${redact(String(message || "").slice(0, 160))}`);
}

const recent = [];
let pausedUntil = 0;
function noteResult(ip, v) {
  if (v.action === "block") console.warn(`[vpn-guard] blocked ip=${ip} reason=${v.reason} api=${v.api}`);
  recent.push(v.action === "block");
  if (recent.length > 40) recent.shift();
  if (recent.length >= 12 && recent.filter(Boolean).length / recent.length >= 0.8) {
    pausedUntil = Date.now() + 30 * 60 * 1000;
    recent.length = 0;
    console.warn("[vpn-guard] almost every visitor was flagged as VPN. Blocking paused for 30 minutes. Check /api/security/my-ip.");
  }
}

function startLookup(ip) {
  if (inflight.has(ip)) return inflight.get(ip);
  const p = lookup(ip).then((r) => {
    inflight.delete(ip);
    if (r.state === "ok") {
      noteHealth(true);
      noteResult(ip, r);
      remember(ip, r);
      failures.delete(ip);
    } else {
      noteHealth(false, r.reason);
      if (failures.size >= MAX_CACHE) failures.delete(failures.keys().next().value);
      failures.set(ip, Date.now() + FAIL_RETRY_MS);
    }
    return r;
  });
  inflight.set(ip, p);
  return p;
}

async function checkIp(rawIp, waitMs) {
  const ip = normalizeIp(rawIp);
  if (isPrivateIp(ip) || ALLOWED_IPS.has(ip)) return { state: "ok", action: "allow", reason: "trusted" };

  const now = Date.now();
  const hit = cache.get(ip);
  if (hit && hit.until > now) return { state: "ok", action: hit.action, reason: hit.reason };

  const usable = () => {
    if (hit && hit.hardUntil > Date.now()) return { state: "ok", action: hit.action, reason: `${hit.reason} (last known)` };
    return { state: "unavailable", reason: "no-verdict" };
  };

  if ((failures.get(ip) || 0) > now) return usable();

  const result = await Promise.race([
    startLookup(ip),
    new Promise((resolve) => setTimeout(() => resolve({ state: "unavailable", reason: "slow" }), waitMs)),
  ]);
  return result.state === "ok" ? result : usable();
}

export async function isVpnIp(rawIp) {
  const v = await checkIp(rawIp, WAIT_WRITE_MS);
  return v.state === "ok" && v.action === "block";
}

function blockedHtml() {
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
      radial-gradient(900px 500px at 15% -10%,rgba(255,176,32,.09),transparent 60%),
      radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.06),transparent 55%);
  }
  .box{max-width:380px;display:flex;flex-direction:column;align-items:center}
  .warn{
    position:relative;width:84px;height:84px;border-radius:50%;margin:10px 0 34px;
    display:flex;align-items:center;justify-content:center;color:#FFB020;
    background:rgba(255,176,32,.1);border:1px solid rgba(255,176,32,.35);
    box-shadow:0 0 28px rgba(255,176,32,.28);
    animation:warnPulse 2s ease-in-out infinite;
  }
  .warn::before,.warn::after{
    content:"";position:absolute;inset:-1px;border-radius:50%;border:2px solid rgba(255,176,32,.55);
    animation:warnRipple 2.4s ease-out infinite;
  }
  .warn::after{animation-delay:1.2s}
  .warn svg{width:42px;height:42px;animation:warnShake 3.2s ease-in-out infinite;transform-origin:50% 80%}
  @keyframes warnPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
  @keyframes warnRipple{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}
  @keyframes warnShake{0%,70%,100%{transform:rotate(0)}74%{transform:rotate(-9deg)}78%{transform:rotate(9deg)}82%{transform:rotate(-6deg)}86%{transform:rotate(6deg)}90%{transform:rotate(0)}}
  h1{font-family:'Space Grotesk',system-ui,sans-serif;font-size:1.25rem;margin:0 0 10px;font-weight:700}
  p{color:rgba(255,255,255,.55);font-size:.88rem;line-height:1.6;margin:0}
  .retry{
    margin-top:24px;display:inline-block;padding:11px 26px;border-radius:12px;font-weight:700;font-size:.85rem;
    color:#04141a;text-decoration:none;background:linear-gradient(135deg,#00E0FF,#7c5cff);
  }
  .steps{margin:22px 0 0;padding:0;list-style:none;text-align:left;width:100%;counter-reset:st}
  .steps li{counter-increment:st;position:relative;padding:0 0 0 30px;margin:0 0 10px;color:rgba(255,255,255,.55);font-size:.82rem;line-height:1.5}
  .steps li::before{content:counter(st);position:absolute;left:0;top:1px;width:20px;height:20px;border-radius:50%;background:rgba(255,176,32,.12);border:1px solid rgba(255,176,32,.35);color:#FFB020;font-size:.68rem;font-weight:700;display:flex;align-items:center;justify-content:center}
  .contact{
    margin-top:6px;display:inline-block;padding:10px 24px;border-radius:12px;font-weight:700;font-size:.82rem;font-family:inherit;cursor:pointer;
    color:#F3F3FA;background:transparent;border:1px solid rgba(255,255,255,.22);
  }
  .brand{
    margin-top:30px;font-family:'Space Grotesk',system-ui,sans-serif;font-weight:700;font-size:.85rem;
    background:linear-gradient(90deg,#00E0FF,#7c5cff);-webkit-background-clip:text;background-clip:text;color:transparent;
  }
</style>
</head>
<body>
  <div class="box">
    <div class="warn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9.5v4.2M12 17h.01"/></svg>
    </div>
    <h1>VPN Detected</h1>
    <p>To use this site turn off your VPN</p>
    <a class="retry" href="">Try again</a>
    <ol class="steps">
      <li>Turn off any VPN, proxy or private DNS, then tap <b>Try again</b>.</li>
      <li>Clear your browser cache and cookies, close the tab and open the site again.</li>
      <li>Still seeing this? We may have flagged your network by mistake, so contact support and we will sort it out.</li>
    </ol>
    <button type="button" class="contact" id="vpnContactBtn">Contact Support</button>
    <div class="brand">ES TEAMS TV</div>
  </div>
<script nonce="__CSP_NONCE__" src="/visitor-support.js"></script>
<script nonce="__CSP_NONCE__">
document.getElementById("vpnContactBtn").addEventListener("click",function(){
  if(window.EsVisitorSupport)window.EsVisitorSupport.open("vpn");
});
</script>
</body>
</html>`;
}

function isExempt(req) {
  const p = req.path;
  if (EXEMPT_PATHS.has(p)) return true;
  return EXEMPT_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export async function vpnGuard(req, res, next) {
  if (!API_KEY) {
    if (!warnedNoKey) {
      warnedNoKey = true;
      console.warn("[vpn-guard] PROXYCHECK_API_KEY is not set, VPN blocking is OFF.");
    }
    return next();
  }
  if (isExempt(req)) return next();
  if (Date.now() < pausedUntil) return next();

  const readOnly = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  let v;
  try {
    v = await checkIp(clientIp(req), readOnly ? WAIT_READ_MS : WAIT_WRITE_MS);
  } catch {
    v = { state: "unavailable", reason: "error" };
  }

  if (v.state === "ok" && v.action !== "block") return next();

  if (v.state !== "ok") {
    if (readOnly) return next();
    res.status(503).set({ "Cache-Control": "no-store", "Retry-After": "30" }).json({
      error: "We could not verify your connection right now. Please try again in a minute.",
      code: "vpn/unverified",
    });
    return;
  }

  res.locals.noRefusalCount = true;
  const wantsHtml = !req.path.startsWith("/api/") && String(req.headers.accept || "").includes("text/html");
  if (wantsHtml) {
    res.status(403).set("Cache-Control", "no-store").type("html").send(blockedHtml());
    return;
  }
  res.status(403).json({ error: "VPN Detected. To use this site turn off your VPN.", code: "vpn/detected" });
}
