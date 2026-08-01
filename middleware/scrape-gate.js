// middleware/scrape-gate.js — requires a real browser to reach page content.
//
// HONEST SCOPE OF WHAT THIS DOES AND DOESN'T DO:
// This is not encryption and doesn't hide anything — the cookie value below
// isn't meant to be a secret an attacker can't ever learn, because that's
// not the threat it defends against. What it defends against is exactly what
// happened when a live-tv.xo.je clone was fed through a "save site as zip"
// tool: that tool made one plain HTTP GET, got back HTML, and never ran any
// of the page's <script> tags — so it only ever captured a content-free stub.
// It didn't need the target's cookie value to be secret; it just never
// executed the one line of JS that would have produced it. That's the entire
// mechanism: this route serves NO real page content until a request proves
// it can run JavaScript, by running an inline script that sets a cookie only
// JS execution can produce, then reloading. curl/wget/httrack/most one-shot
// HTML scrapers never get past that. A scraper built on a real or headless
// browser (Puppeteer/Playwright) still sails through — nothing server- or
// client-side can stop that, same caveat as lock.js's domain check.
//
// This is layered on top of, not instead of, the UA-based botBlocker in
// security-middleware.js — that one already rejects non-browser HTTP
// clients outright by their User-Agent; this one catches the ones that
// spoof a normal browser UA but still never execute JS.
//
// Applied per-route (see server.js) only to the actual HTML page routes —
// deliberately NOT applied to /api/*, since those return JSON that a page
// scraper has no use for, and blocking them would break real things that
// hit those URLs without first loading a page in a browser: OAuth provider
// redirects (/api/*-auth/callback), the public developer API, etc.

import crypto from "crypto";

const COOKIE_NAME = "sg";
const COOKIE_MAX_AGE_S = 12 * 60 * 60; // 12h — matches the devtools bypass cookie's lifetime in lock.js

// Deriving the value from a secret (instead of a fixed literal like "1")
// means someone has to actually load the page in a browser and read their
// own cookie to find a value that bypasses this — a fixed literal would let
// anyone hardcode `Cookie: sg=1` into a scraper without ever visiting the
// site. Falls back to a fixed dev value rather than crashing boot over it;
// set SCRAPE_GATE_SECRET in production for the real benefit of this.
const GATE_SECRET = process.env.SCRAPE_GATE_SECRET || "es-teams-tv-dev-gate";
const GATE_VALUE = crypto.createHmac("sha256", GATE_SECRET).update("scrape-gate-v1").digest("hex").slice(0, 24);

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return null;
}

function interstitialHtml(target) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
<style>body{background:#0A0A0F;margin:0;min-height:100vh}</style>
</head>
<body>
<noscript>This site requires JavaScript to be enabled.</noscript>
<script>
document.cookie=${JSON.stringify(COOKIE_NAME)}+"="+${JSON.stringify(GATE_VALUE)}+"; max-age=${COOKIE_MAX_AGE_S}; path=/; samesite=lax";
location.replace(${JSON.stringify(target)});
</script>
</body>
</html>`;
}

export function scrapeGate(req, res, next) {
  if (readCookie(req, COOKIE_NAME) === GATE_VALUE) return next();
  res.status(200).type("html").send(interstitialHtml(req.originalUrl));
}
