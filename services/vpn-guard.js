
import { clientIp, isPrivateIp } from "./client-ip.js";

const DISABLED = /^(1|true|yes)$/i.test(String(process.env.VPN_BLOCK_DISABLED || ""));
const API_KEY = DISABLED ? "" : (process.env.PROXYCHECK_API_KEY || "");
const ALLOWED_IPS = new Set(String(process.env.VPN_ALLOWED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean));

const TTL_RESULT_MS = 12 * 60 * 60 * 1000;
const TTL_FLAGGED_MS = 60 * 60 * 1000;
const TTL_FAILED_MS = 5 * 60 * 1000;
const LOOKUP_TIMEOUT_MS = 1500;
const MAX_CACHE = 20000;

const BLOCK_TYPES = new Set(
  String(process.env.VPN_BLOCK_TYPES || "vpn,tor").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
);
const CARRIER_RE = new RegExp(
  process.env.VPN_CARRIER_ALLOW_REGEX ||
    "\\b(mtn|airtel|glo|globacom|9mobile|etisalat|vodafone|t-mobile|verizon|safaricom|orange|telkom|ntel)\\b",
  "i"
);

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

const cache = new Map();
const inflight = new Map();
let warnedNoKey = false;

function normalizeIp(ip) {
  return String(ip || "").replace(/^::ffff:/, "").trim();
}

async function lookup(ip) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const url = `https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${encodeURIComponent(API_KEY)}&vpn=1&asn=1`;
    const r = await fetch(url, { signal: controller.signal });
    const data = await r.json();
    if (!data || (data.status !== "ok" && data.status !== "warning")) return { ok: false };
    const entry = data[ip];
    if (!entry) return { ok: false };
    const type = String(entry.type || "");
    const owner = `${entry.provider || ""} ${entry.organisation || ""}`;
    const onCarrier = CARRIER_RE.test(owner);
    const vpn = entry.proxy === "yes" && BLOCK_TYPES.has(type.toLowerCase()) && !onCarrier;
    return { ok: true, vpn, type };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function remember(ip, result) {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(ip, { vpn: !!result.vpn, until: Date.now() + (result.ok ? (result.vpn ? TTL_FLAGGED_MS : TTL_RESULT_MS) : TTL_FAILED_MS) });
}

const recent = [];
let pausedUntil = 0;
function noteResult(ip, result) {
  if (!result.ok) return;
  if (result.vpn) console.warn(`[vpn-guard] flagged ip=${ip} type=${result.type}`);
  recent.push(!!result.vpn);
  if (recent.length > 40) recent.shift();
  if (recent.length >= 12 && recent.filter(Boolean).length / recent.length >= 0.8) {
    pausedUntil = Date.now() + 30 * 60 * 1000;
    recent.length = 0;
    console.warn("[vpn-guard] almost every visitor was flagged as VPN. Blocking paused for 30 minutes. Check /api/security/my-ip.");
  }
}

function startLookup(ip) {
  if (inflight.has(ip)) return inflight.get(ip);
  const p = lookup(ip).then((result) => {
    noteResult(ip, result);
    remember(ip, result);
    inflight.delete(ip);
    return result;
  });
  inflight.set(ip, p);
  return p;
}

export async function isVpnIp(rawIp) {
  const ip = normalizeIp(rawIp);
  if (!API_KEY || isPrivateIp(ip) || ALLOWED_IPS.has(ip)) return false;
  const hit = cache.get(ip);
  if (hit && hit.until > Date.now()) return hit.vpn;
  const result = await Promise.race([
    startLookup(ip),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, timeout: true }), LOOKUP_TIMEOUT_MS)),
  ]);
  return !!(result && result.ok && result.vpn);
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
  let blocked = false;
  try {
    blocked = await isVpnIp(clientIp(req));
  } catch {
    blocked = false;
  }
  if (!blocked) return next();

  res.locals.noRefusalCount = true;
  const wantsHtml = !req.path.startsWith("/api/") && String(req.headers.accept || "").includes("text/html");
  if (wantsHtml) {
    res.status(403).set("Cache-Control", "no-store").type("html").send(blockedHtml());
    return;
  }
  res.status(403).json({ error: "VPN Detected. To use this site turn off your VPN.", code: "vpn/detected" });
}
