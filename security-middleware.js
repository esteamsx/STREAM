/**
 * ES TEAMS TV - Security Middleware
 * Proprietary Software © ES TEAMS TECH. Unauthorized copying prohibited.
 *
 * Drop this file in the same folder as server.js (project root).
 * Nothing here touches your existing routes/logic — it's purely additive.
 */

import crypto from "crypto";

/* ───────────────────────────────────────────────
   LAYER 1: BROWSER-SIDE DETERRENTS
   (Stops casual users from right-click > Inspect, F12, the browser menu,
   AND — unlike a plain window-size check — detached DevTools windows and
   the remote/mobile "inspect" session (devtools://...) that a window-size
   check can never see, since that opens as its own separate window with
   its own dimensions, not a panel docked inside this page's window.
   None of this stops curl/wget/scripts — see Layer 3 for that — or a
   determined person who disables JS first.)
   ─────────────────────────────────────────────── */

// Change this, then set it as an env var (DEVTOOLS_BYPASS_KEY) on Railway/Render.
// You bypass the block yourself by visiting any page with
// ?estv_dd=<your secret> once — it's remembered for that browser tab.
// Only a SHA-256 hash of this ever gets sent to the browser — never the
// plaintext value itself, so it can't be read from page source/network tab.
const DEV_BYPASS_SECRET = process.env.DEVTOOLS_BYPASS_KEY || "change-me-please";
const DEV_BYPASS_MD5 = crypto.createHash("md5").update(DEV_BYPASS_SECRET).digest("hex"); // used only by the disable-devtool library's own internal check
const DEV_BYPASS_SHA256 = crypto.createHash("sha256").update(DEV_BYPASS_SECRET).digest("hex"); // used by our own fallback check below
const DEV_BYPASS_PARAM = "estv_dd";

// Path server.js serves the self-hosted disable-devtool bundle from.
// Self-hosted (not the public jsDelivr CDN) on purpose — the public CDN URL
// for this package is on uBlock Origin's "Annoyances" filter list, so the
// exact people you're trying to block are the most likely to have it silently
// fail to load if it's fetched from jsdelivr.
export const DEVTOOLS_LIB_ROUTE = "/assets/dd-core.js";

export const getDevToolsBlockScript = () => `<script src="${DEVTOOLS_LIB_ROUTE}"></script>
<script>
(function(){
  var BYPASS_PARAM = ${JSON.stringify(DEV_BYPASS_PARAM)};
  var BYPASS_MD5 = ${JSON.stringify(DEV_BYPASS_MD5)};
  var BYPASS_SHA256 = ${JSON.stringify(DEV_BYPASS_SHA256)};

  function sha256Hex(str){
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function(buf){
      return Array.prototype.map.call(new Uint8Array(buf), function(b){ return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function checkBypass(){
    var already = false;
    try { already = sessionStorage.getItem('estv_dd_ok') === '1'; } catch (e) {}
    if (already) return Promise.resolve(true);

    var typed = null;
    try { typed = new URLSearchParams(window.location.search).get(BYPASS_PARAM); } catch (e) {}
    if (!typed) return Promise.resolve(false);

    return sha256Hex(typed).then(function(hash){
      if (hash === BYPASS_SHA256) {
        try { sessionStorage.setItem('estv_dd_ok', '1'); } catch (e) {}
        return true;
      }
      return false;
    }).catch(function(){ return false; });
  }

  checkBypass().then(function(bypassed){
    if (bypassed) return;

  function trip(){
    document.body.innerHTML = '';
    window.location.href = '/';
  }

  // Init the disable-devtool library if the self-hosted script loaded.
  // It has its own detectors (including recognizing mobile/remote inspect
  // sessions) — this runs alongside the fallback traps below, not instead of.
  if (window.DisableDevtool) {
    try {
      window.DisableDevtool({
        md5: BYPASS_MD5,
        tkName: BYPASS_PARAM,
        url: '/',
        disableMenu: true,
        clearLog: true,
        disableSelect: true,
        ondevtoolopen: trip,
      });
    } catch (e) {}
  }

  // ── Fallback layer — always runs too, in case the library above failed to
  // load (blocked request, offline, etc). Belt and suspenders. ──

  document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) || (e.ctrlKey && e.key.toUpperCase() === 'U')) {
      e.preventDefault();
    }
  });

  // Window-size heuristic — still useful for a docked-in-window panel.
  var threshold = 160, sizeTripped = false;
  setInterval(function(){
    var wide = window.outerWidth - window.innerWidth > threshold;
    var tall = window.outerHeight - window.innerHeight > threshold;
    if ((wide || tall) && !sizeTripped) { sizeTripped = true; trip(); }
  }, 400);

  // Debugger-timing trap — a 'debugger' statement only actually pauses
  // execution if SOME inspector is attached to this page's JS engine —
  // local, detached, or a remote/mobile devtools:// session — regardless
  // of whether that inspector's window lives on this machine at all.
  var debugTripped = false;
  setInterval(function(){
    var t0 = performance.now();
    debugger;
    if (performance.now() - t0 > 100 && !debugTripped) {
      debugTripped = true;
      trip();
    }
  }, 600);

  // Console object-inspection trap — fires if an open console panel ever
  // renders this object (harmless no-op while the console stays closed).
  var consoleTripped = false;
  var probe = {};
  Object.defineProperty(probe, 'id', {
    get: function(){
      if (!consoleTripped) { consoleTripped = true; trip(); }
      return '';
    }
  });
  setInterval(function(){ console.log(probe); }, 700);

  // ── Web Worker debugger heartbeat — the strongest layer here. Chrome
  // pauses an attached debugger session (local, detached, or a remote
  // devtools:// tab) when a 'debugger' statement fires inside a Worker,
  // same as on the main thread — but the common trick of disabling one
  // specific main-thread breakpoint doesn't reach into a background
  // worker's own paused state the same way, so this is a harder trap to
  // quietly defeat. It runs its own debugger-timing check on a schedule
  // and reports back; if the worker itself gets paused, no report ever
  // arrives, and the main-thread watchdog below catches that silence.
  var workerTripped = false;
  try {
    var workerSrc = [
      'var last = performance.now();',
      'setInterval(function () {',
      '  var t0 = performance.now();',
      '  debugger;',
      '  var delta = performance.now() - t0;',
      '  postMessage({ delta: delta });',
      '  last = performance.now();',
      '}, 350);'
    ].join('\\n');
    var blob = new Blob([workerSrc], { type: 'application/javascript' });
    var worker = new Worker(URL.createObjectURL(blob));
    var lastBeat = performance.now();
    worker.onmessage = function(e){
      lastBeat = performance.now();
      var d = (e && e.data) || {};
      if (!workerTripped && d.delta > 100) { workerTripped = true; trip(); }
    };
    worker.onerror = function(){ /* swallow — never break the page over this */ };
    setInterval(function(){
      if (!workerTripped && performance.now() - lastBeat > 1500) {
        workerTripped = true;
        trip();
      }
    }, 800);
  } catch (e) {}
  });
})();
</script>`;

export const getProtectionCSS = () => `
  html, body, * {
    -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;
    -webkit-touch-callout: none;
  }
  input, textarea { -webkit-user-select: text; -moz-user-select: text; user-select: text; }
`;

/* ───────────────────────────────────────────────
   LAYER 2: SAFE SECURITY HEADERS
   (No strict CSP here on purpose — your pages rely heavily on
   inline <script>/<style>, and a strict CSP would break them.)
   ─────────────────────────────────────────────── */

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};

/* ───────────────────────────────────────────────
   LAYER 3: BOT / SCRAPER BLOCKING
   This is the layer that actually matters for "someone got my
   link and is scraping it with a script." Blocks known scraper
   / HTTP-client user agents outright. Spoofable, but stops the
   overwhelming majority of automated scraping and bulk cloning.
   ─────────────────────────────────────────────── */

const BLOCKED_UA_PATTERNS = [
  /curl/i, /wget/i, /python-requests/i, /python-urllib/i, /scrapy/i,
  /httpclient/i, /go-http-client/i, /node-fetch/i, /axios\//i,
  /okhttp/i, /libwww-perl/i, /^java\//i, /^ruby/i, /php\//i,
  /httrack/i, /wput/i, /crawler/i, /spider/i, /^$/,
];

// Paths that must always stay reachable (favicon etc.) even if UA looks odd.
const UA_ALLOWLIST_PATHS = ["/favicon.ico"];

export const botBlocker = (req, res, next) => {
  if (UA_ALLOWLIST_PATHS.includes(req.path)) return next();

  const ua = req.get("user-agent") || "";
  const isBlocked = BLOCKED_UA_PATTERNS.some((pattern) => pattern.test(ua));

  if (isBlocked) {
    console.warn(`⚠️ Blocked scraper UA: ${req.ip} - "${ua}" - ${req.path}`);
    return res.status(403).send("Forbidden");
  }
  next();
};

/* ───────────────────────────────────────────────
   LAYER 4: RATE LIMITING (no external dependency needed)
   ─────────────────────────────────────────────── */

export class SimpleRateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const now = Date.now();
      const ip = req.ip;
      const timestamps = (this.hits.get(ip) || []).filter((t) => now - t < this.windowMs);

      if (timestamps.length >= this.maxRequests) {
        console.warn(`⚠️ Rate limit exceeded: ${ip} on ${req.path}`);
        return res.status(429).json({ error: "Too many requests. Please slow down." });
      }

      timestamps.push(now);
      this.hits.set(ip, timestamps);
      next();
    };
  }
}

/* ───────────────────────────────────────────────
   LAYER 5: SUSPICIOUS REQUEST / INJECTION DETECTION
   ─────────────────────────────────────────────── */

const SUSPICIOUS_PATTERNS = [
  /\.\.\//, /\.\.%2f/i, /\/\.env/i, /\/\.git/i, /etc\/passwd/i,
  /<script/i, /javascript:/i, /union.*select/i, /drop\s+table/i,
];

export const suspiciousRequestDetector = (req, res, next) => {
  if (SUSPICIOUS_PATTERNS.some((p) => p.test(req.url))) {
    console.warn(`🚨 Suspicious request: ${req.ip} - ${req.url}`);
    return res.status(403).json({ error: "Access denied" });
  }
  next();
};

/* ───────────────────────────────────────────────
   LAYER 6: robots.txt content — keeps well-behaved
   crawlers from indexing or mirroring your pages.
   ─────────────────────────────────────────────── */

export const ROBOTS_TXT = `User-agent: *
Disallow: /
`;
