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

// Set on every request that clears the gate, read only by the interstitial's
// own script, and consumed the moment it's read. It answers one question the
// page cannot otherwise answer: "did this browser load a real page since the
// last time it was challenged?" — which is the whole difference between a
// visitor whose network moved (challenged, passes, browses, challenged again
// later) and a browser genuinely stuck in a reload loop (challenged, never
// passes). Carries no authority whatsoever: the server never reads it, and
// forging it buys nothing but a slightly longer reload loop for yourself.
const OK_COOKIE_NAME = "sgok";
const OK_COOKIE_TTL_S = 60;

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
//
// How much of the address to keep is tunable for the networks where a /24
// still isn't stable enough: SCRAPE_GATE_IPV4_OCTETS=2 binds to a /16 instead,
// which re-challenges far less on carrier NAT at the cost of a correspondingly
// weaker binding. A re-challenge is invisible (one reload), so the default
// stays at the stricter /24.
const IPV4_OCTETS = Math.min(4, Math.max(1, Number(process.env.SCRAPE_GATE_IPV4_OCTETS) || 3));

function ipPrefix(req) {
  if (!BIND_IP) return "-";
  let ip = String(req.ip || "").trim();
  if (!ip) return "-";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7); // IPv4-mapped IPv6 from the proxy
  if (ip.includes(".")) return ip.split(".").slice(0, IPV4_OCTETS).join(".");
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

// Returns EVERY cookie sent under this name, not just the first one. A
// browser will happily send two cookies with the same name when they differ
// by domain or path (a host-only `sg` alongside a leftover one scoped to a
// parent domain, say), and the order it sends them in is not something we
// control. Reading only the first match meant one stale duplicate could pin a
// visitor to a permanently failing ticket that no amount of reloading could
// clear — the interstitial sets a host-only, path=/ cookie, which never
// overwrites a differently-scoped one.
//
// decodeURIComponent throws a URIError on a malformed value (a stray "%" is
// enough). Unhandled, that turned a junk cookie into a 500 on every page.
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

// Splits the ticket into character codes the page reassembles at runtime. This
// is a speed bump against a scraper that just regexes the response for a
// cookie-shaped string, NOT a security measure — anyone who reads the page can
// see exactly what it does. It is not why the gate works; the JS-execution
// requirement and the binding above are.
function scramble(value) {
  const codes = [...value].map((ch, i) => ch.charCodeAt(0) + ((i % 7) + 1));
  return codes.join(",");
}

// The stub's job is to be invisible: set the ticket, reload, done. It shows a
// message ONLY when reloading genuinely cannot help, because the message it
// shows is a dead end for the visitor.
//
// The version this replaces got that backwards. It counted challenges in a
// sessionStorage key that only ever went up — never reset after a successful
// load, never scoped to a page — and gave up at the third. Tickets expire
// after 2h and are bound to the client's network prefix, so a phone that moves
// between towers is re-challenged as a matter of course; each one is meant to
// cost a single invisible reload. Three of them in one tab, however far apart,
// permanently showed "Couldn't verify your browser. Please make sure cookies
// are enabled" to a browser whose cookies were working perfectly. Simulated
// against a network that moves every 3s, that was 3 dead-end error screens in
// 12 page views; it is 0 now.
//
// What the page checks instead, in order:
//   1. Did the cookie stick? Read it straight back. If not, cookies really are
//      off and no reload will ever fix it — say so immediately, first pass, no
//      pointless bouncing.
//   2. Did a real page load since the last challenge (the sgok breadcrumb)?
//      Then this is a fresh network hiccup, not a continuing failure. Reset.
//   3. Only then, a loop-breaker: same URL, challenged again within 5s, three
//      times over. That is a reload loop and nothing else — a loop iterates in
//      a fraction of a second, a person moving between pages does not.
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

  function has(name){ return new RegExp('(?:^|;\\\\s*)' + name + '=').test(document.cookie); }

  var c = ${JSON.stringify(scramble(ticket))}.split(',');
  var t = '';
  for (var i = 0; i < c.length; i++) t += String.fromCharCode(c[i] - ((i % 7) + 1));
  try { document.cookie = NAME + '=' + t + ${JSON.stringify(attrs)}; } catch(e){}

  // Cookie didn't stick -> reloading can never help.
  if (!has(NAME)) { stop(); return; }

  // A real page loaded since the last challenge: fresh hiccup, not a loop.
  if (has(${JSON.stringify(OK_COOKIE_NAME)})) {
    document.cookie = ${JSON.stringify(OK_COOKIE_NAME)} + '=; max-age=0; path=/';
    try { sessionStorage.removeItem('sg_try'); } catch(e){}
  }

  // Loop-breaker only: same URL, re-challenged within 5s, three times over.
  var now = Date.now(), here = location.pathname, n = 0;
  try {
    var prev = JSON.parse(sessionStorage.getItem('sg_try') || 'null');
    if (prev && typeof prev.n === 'number' && prev.p === here && now - prev.t < 5000) n = prev.n;
    if (n >= 3) { sessionStorage.removeItem('sg_try'); stop(); return; }
    sessionStorage.setItem('sg_try', JSON.stringify({ n: n + 1, t: now, p: here }));
  } catch(e){ /* sessionStorage unavailable (private mode) — the cookie check above is the real guard against looping */ }

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
    // The real page and the gate stub share one URL. If a shared cache (CDN,
    // corporate proxy) were allowed to store the real page, it could serve it
    // to clients that never passed the gate — bypassing this entirely. The
    // page routes that set this for their own reasons (/ and /login) already
    // send the same thing; this covers the rest.
    res.set("Cache-Control", "no-store");
    // Breadcrumb for the interstitial, not for this server: it proves to the
    // next challenge (if there is one) that a real page loaded in between.
    // append(), not set() — page routes further down set their own cookies.
    res.append(
      "Set-Cookie",
      `${OK_COOKIE_NAME}=1; max-age=${OK_COOKIE_TTL_S}; path=/; samesite=lax${secureCookie ? "; secure" : ""}`
    );
    return next();
  }

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
