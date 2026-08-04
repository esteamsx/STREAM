
import crypto from "crypto";
import { siteHead } from "../config/site.js";

const COOKIE_NAME = "sg";

const OK_COOKIE_NAME = "sgok";
const OK_COOKIE_TTL_S = 60;

const PREVIEW_TAGS = siteHead();

const TICKET_TTL_MS = 2 * 60 * 60 * 1000;

const GATE_SECRET = process.env.SCRAPE_GATE_SECRET || "es-teams-tv-dev-gate";

const BIND_IP = process.env.SCRAPE_GATE_BIND_IP !== "0";

const IPV4_OCTETS = Math.min(4, Math.max(1, Number(process.env.SCRAPE_GATE_IPV4_OCTETS) || 3));

function ipPrefix(req) {
  if (!BIND_IP) return "-";
  let ip = String(req.ip || "").trim();
  if (!ip) return "-";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.includes(".")) return ip.split(".").slice(0, IPV4_OCTETS).join(".");
  return ip.split(":").slice(0, 3).join(":");
}

function clientFingerprint(req) {
  const ua = String(req.get?.("user-agent") || req.headers?.["user-agent"] || "");
  return crypto.createHash("sha256").update(ua + "|" + ipPrefix(req)).digest("hex").slice(0, 16);
}

function sign(ts, fp) {
  return crypto.createHmac("sha256", GATE_SECRET).update(`${ts}|${fp}`).digest("hex").slice(0, 24);
}

function issueTicket(req) {
  const ts = Date.now();
  return `${ts}.${sign(ts, clientFingerprint(req))}`;
}

function verifyTicket(value, req) {
  if (typeof value !== "string" || !value.includes(".")) return false;
  const [tsStr, sig] = value.split(".");
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const age = Date.now() - ts;
  if (age < -60 * 1000 || age > TICKET_TTL_MS) return false;

  const expected = sign(ts, clientFingerprint(req));
  const a = Buffer.from(String(sig), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readCookies(req, name) {
  const header = req.headers?.cookie;
  if (!header) return [];
  const values = [];
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() !== name) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      values.push(decodeURIComponent(raw));
    } catch {
      values.push(raw);
    }
  }
  return values;
}

function scramble(value) {
  const codes = [...value].map((ch, i) => ch.charCodeAt(0) + ((i % 7) + 1));
  return codes.join(",");
}

function interstitialHtml(ticket, secureCookie) {
  const attrs = `; max-age=${Math.floor(TICKET_TTL_MS / 1000)}; path=/; samesite=lax${secureCookie ? "; secure" : ""}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
${PREVIEW_TAGS}
<style>
  body{background:#0A0A0F;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,-apple-system,sans-serif;color:#8a8a9a}
  .m{max-width:340px;text-align:center;font-size:.85rem;line-height:1.6;padding:24px;display:none}
  .m a{color:#00E0FF;text-decoration:none;border-bottom:1px solid rgba(0,224,255,.35)}
</style>
</head>
<body>
<noscript><div class="m" style="display:block">This site requires JavaScript. Please enable it and reload.</div></noscript>
<div class="m" id="m">Couldn't verify your browser. Please make sure cookies are enabled, then <a href="/" id="r">try again</a>.</div>
<script>
(function(){
  var NAME = ${JSON.stringify(COOKIE_NAME)};
  function stop(){
    var el = document.getElementById('m');
    if (el) el.style.display = 'block';
    var r = document.getElementById('r');
    if (r) r.onclick = function(e){ e.preventDefault(); try{ sessionStorage.removeItem('sg_try'); }catch(_){} location.reload(); };
  }

  function has(name){ return new RegExp('(?:^|;\\s*)' + name + '=').test(document.cookie); }

  var c = ${JSON.stringify(scramble(ticket))}.split(',');
  var t = '';
  for (var i = 0; i < c.length; i++) t += String.fromCharCode(c[i] - ((i % 7) + 1));
  try { document.cookie = NAME + '=' + t + ${JSON.stringify(attrs)}; } catch(e){}

  if (!has(NAME)) { stop(); return; }

  if (has(${JSON.stringify(OK_COOKIE_NAME)})) {
    document.cookie = ${JSON.stringify(OK_COOKIE_NAME)} + '=; max-age=0; path=/';
    try { sessionStorage.removeItem('sg_try'); } catch(e){}
  }

  var now = Date.now(), here = location.pathname, n = 0;
  try {
    var prev = JSON.parse(sessionStorage.getItem('sg_try') || 'null');
    if (prev && typeof prev.n === 'number' && prev.p === here && now - prev.t < 5000) n = prev.n;
    if (n >= 3) { sessionStorage.removeItem('sg_try'); stop(); return; }
    sessionStorage.setItem('sg_try', JSON.stringify({ n: n + 1, t: now, p: here }));
  } catch(e){  }

  location.reload();
})();
</script>
</body>
</html>`;
}

export function scrapeGate(req, res, next) {
  const secureCookie =
    req.secure || String(req.get?.("x-forwarded-proto") || "").split(",")[0].trim() === "https";

  if (readCookies(req, COOKIE_NAME).some((value) => verifyTicket(value, req))) {
    res.set("Cache-Control", "no-store");
    res.append(
      "Set-Cookie",
      `${OK_COOKIE_NAME}=1; max-age=${OK_COOKIE_TTL_S}; path=/; samesite=lax${secureCookie ? "; secure" : ""}`
    );
    return next();
  }

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Vary", "Cookie, User-Agent");
  res.status(200).type("html").send(interstitialHtml(issueTicket(req), secureCookie));
}
