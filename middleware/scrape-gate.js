// middleware/scrape-gate.js — requires a real browser to reach page content.
//
// READ THIS BEFORE CHANGING ANYTHING HERE, AND BEFORE BELIEVING IT DOES MORE
// THAN IT DOES:
//
// This raises the cost of copying the site. It does not, and cannot, make the
// frontend undownloadable. Any page a browser can render, the person running
// that browser can save — Ctrl+S, DevTools, "Save page as", a headless Chrome
// script, or a browser extension all defeat every check in this file, because
// by the time the page is on screen the HTML/CSS/JS is already in their
// machine's memory by definition. That is true of every website that has ever
// existed, including the live-tv.xo.je page whose AES gate prompted this: the
// reason a "save site as zip" tool got nothing useful from it is that the tool
// made ONE plain HTTP GET and never ran any JavaScript. Load that same page in
// a real browser and save it, and you get the whole thing. Its AES was never
// protecting anything — the key, IV, and ciphertext were all sitting in the
// page source in plain sight.
//
// So what this file actually buys you, honestly:
//   - Generic one-shot fetchers/mirrorers (curl, wget -r, HTTrack, web2zip,
//     most "download this website" services) get a content-free stub, because
//     they never execute the JS that produces a valid ticket.
//   - A ticket lifted out of a real browser's DevTools cannot simply be pasted
//     into one of those tools: it expires quickly and is bound to the client
//     that was issued it (see below). That was the hole in this file's first
//     version, which served one hardcoded cookie value to everyone forever —
//     copy it once and `wget -r --header="Cookie: ..."` mirrored the whole site.
//   - Bulk/background crawling gets meaningfully more expensive.
// What it does NOT buy you:
//   - Any defense against a real or headless browser. Nothing here helps there.
//   - Any secrecy. Everything below is visible to anyone who looks; none of it
//     depends on the client not knowing how it works.
//
// For actual bot/WAF-grade filtering (JS challenges backed by browser
// fingerprinting, managed rules, per-ASN reputation), that belongs in front of
// the app at the edge — a CDN/WAF such as Cloudflare — not in application code.
// This file is the in-app layer that complements that, not a replacement.
//
// Layered on top of, not instead of, the UA-based botBlocker in
// security-middleware.js: that one rejects non-browser HTTP clients by their
// User-Agent; this one catches the ones that spoof a browser UA but still
// never execute JS.
//
// Applied per-route (see server.js) only to real HTML page routes —
// deliberately NOT to /api/*, since those return JSON a page-scraper has no
// use for, and gating them would break things that legitimately never load a
// page first: OAuth provider redirects (/api/*-auth/callback), the public
// developer API, and this site's own same-origin fetch() calls.

import crypto from "crypto";

const COOKIE_NAME = "sg";

// Deliberately short. A ticket is cheap to reissue (a failed check costs the
// visitor one invisible reload, not an error), so there's no reason to let a
// lifted one stay useful for long.
const TICKET_TTL_MS = 2 * 60 * 60 * 1000; // 2h

// Falls back to a fixed dev value rather than crashing boot. SET THIS IN
// PRODUCTION — without it, the signing key is a constant that's in this file's
// git history, and tickets become forgeable by anyone who reads this repo.
const GATE_SECRET = process.env.SCRAPE_GATE_SECRET || "es-teams-tv-dev-gate";

// Binding a ticket to the requester is what stops "copy the cookie out of
// DevTools, paste it into wget". Can be turned off with SCRAPE_GATE_BIND_IP=0
// if it ever proves troublesome on a specific network.
const BIND_IP = process.env.SCRAPE_GATE_BIND_IP !== "0";

// Only the network prefix, never the full address: a phone hopping between
// cell towers or a user behind CGNAT changes their exact IP far more often
// than their /24 (v4) or /48 (v6). Getting this wrong is not fatal — it just
// costs that visitor one more transparent reload — but needless re-challenges
// are still worth avoiding.
function ipPrefix(req) {
  if (!BIND_IP) return "-";
  let ip = String(req.ip || "").trim();
  if (!ip) return "-";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7); // IPv4-mapped IPv6 from the proxy
  if (ip.includes(".")) return ip.split(".").slice(0, 3).join("."); // /24
  return ip.split(":").slice(0, 3).join(":"); // /48
}

// The UA is not a secret and is trivially spoofable — that is fine and is not
// what it's doing here. Pinning it means a ticket issued to a real browser is
// useless in a tool that doesn't send that exact same UA string, so lifting a
// ticket requires also replicating the browser identity it was minted for.
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
  // Reject future-dated tickets too, not just old ones — a clock-skewed or
  // hand-crafted timestamp shouldn't buy anyone a longer-lived ticket.
  const age = Date.now() - ts;
  if (age < -60 * 1000 || age > TICKET_TTL_MS) return false;

  const expected = sign(ts, clientFingerprint(req));
  const a = Buffer.from(String(sig), "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const header = req.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

// Splits the ticket into character codes the page reassembles at runtime. This
// is a speed bump against a scraper that just regexes the response for a
// cookie-shaped string, NOT a security measure — anyone who reads the page can
// see exactly what it does. It is not why the gate works; the JS-execution
// requirement and the binding above are.
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
<style>
  body{background:#0A0A0F;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       font-family:system-ui,-apple-system,sans-serif;color:#8a8a9a}
  .m{max-width:340px;text-align:center;font-size:.85rem;line-height:1.6;padding:24px;display:none}
</style>
</head>
<body>
<noscript><div class="m" style="display:block">This site requires JavaScript. Please enable it and reload.</div></noscript>
<div class="m" id="m">Couldn't verify your browser. Please make sure cookies are enabled, then reload.</div>
<script>
(function(){
  try{
    // Two failed passes means the cookie isn't sticking (cookies disabled,
    // or a privacy mode dropping it). Stop and tell them, rather than
    // reloading forever.
    var n = +(sessionStorage.getItem('sg_try') || 0);
    if (n >= 2) { sessionStorage.removeItem('sg_try'); document.getElementById('m').style.display='block'; return; }
    sessionStorage.setItem('sg_try', n + 1);
  }catch(e){ /* sessionStorage unavailable (private mode) — proceed anyway */ }

  var c = ${JSON.stringify(scramble(ticket))}.split(',');
  var t = '';
  for (var i = 0; i < c.length; i++) t += String.fromCharCode(c[i] - ((i % 7) + 1));
  document.cookie = ${JSON.stringify(COOKIE_NAME)} + '=' + t + ${JSON.stringify(attrs)};
  location.reload();
})();
</script>
</body>
</html>`;
}

export function scrapeGate(req, res, next) {
  if (verifyTicket(readCookie(req, COOKIE_NAME), req)) {
    // The real page and the gate stub share one URL. If a shared cache (CDN,
    // corporate proxy) were allowed to store the real page, it could serve it
    // to clients that never passed the gate — bypassing this entirely. The
    // page routes that set this for their own reasons (/ and /login) already
    // send the same thing; this covers the rest.
    res.set("Cache-Control", "no-store");
    return next();
  }

  const secureCookie =
    req.secure || String(req.get?.("x-forwarded-proto") || "").split(",")[0].trim() === "https";

  // no-store matters here specifically: this response carries a ticket minted
  // for ONE client, and it's served from the same URL as the real page. A
  // shared cache holding onto it would hand that ticket to strangers and
  // serve the stub to people who should get the real page.
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Vary", "Cookie, User-Agent");
  // Nothing from the request is reflected into this response — the reload
  // target is implicit (location.reload()), so a hostile URL has nothing to
  // inject into. An earlier version interpolated req.originalUrl into the
  // inline <script>, which let a path containing "</script>" break out of it.
  res.status(200).type("html").send(interstitialHtml(issueTicket(req), secureCookie));
}
