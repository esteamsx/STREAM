/**
 * ES TEAMS TV - Security Middleware
 * Proprietary Software © ES TEAMS TECH. Unauthorized copying prohibited.
 *
 * Drop this file in the same folder as server.js (project root).
 * Nothing here touches your existing routes/logic — it's purely additive.
 *
 * HONEST SCOPE: everything below raises the bar against casual/automated
 * abuse (curl scripts, bulk cloners, basic rate abuse). None of it — and
 * nothing at this layer ever can — stops a determined scraper running a
 * real browser that mimics human behavior and rotates IPs. That level of
 * defense lives at the edge (Cloudflare, etc.) or in protecting the data
 * itself (short-lived signed URLs, per-account throttling), not in header
 * or user-agent checks. Layer 7 below (per-key rate limiting) is the one
 * piece here that still works against a logged-in scraper rotating IPs,
 * because it doesn't key on IP at all.
 */

import ipaddr from "ipaddr.js";
import helmet from "helmet";

/* ───────────────────────────────────────────────
   LAYER 1: BROADER HEADER BASELINE (helmet)
   Kept separate from securityHeaders below rather than replacing it —
   both are harmless to run together. contentSecurityPolicy stays off for
   the same reason noted below: pages rely on inline <script>/<style>.
   ─────────────────────────────────────────────── */

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false, // would block loading channel logos/streams from other origins
  // Helmet's default here is "same-origin", which silently breaks Google
  // Sign-In: the Google popup can't postMessage back to window.opener once
  // this is on, so the button looks like it's "stuck" right after picking
  // an account. "same-origin-allow-popups" keeps the COOP protection for
  // everything else while still letting that one popup talk back to us.
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
});

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
  // Additional signatures: headless/automation frameworks and bulk-fetch tools
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /playwright/i,
  /selenium/i, /^scrapy\//i, /aiohttp/i, /^postmanruntime/i,
  /^guzzlehttp/i, /^dart[:-]?http/i, /^got \(/i, /^undici/i,
];

// Paths that must always stay reachable (favicon etc.) even if UA looks odd.
// /api/v1 and /embed are the public developer API surface — the whole point
// of that surface is to be called by scripts/bots (axios, node-fetch,
// python-requests, Telegram bots, etc.), so it would defeat its own purpose
// to block exactly those user agents here. Key-based auth and per-key rate
// limiting on those routes do the abuse-prevention job instead.
// /health has to answer everyone, including the platform's own checker, which
// is an HTTP client and says so: Railway's sends Go-http-client, and this list
// blocks that outright. A health check answered with 403 reads as a dead
// instance, so the platform restarts the service or refuses to promote the
// deploy — the site going down because it looked too much like a scraper to
// itself. It returns the string "ok" and nothing else.
const UA_ALLOWLIST_PATHS = ["/favicon.ico", "/health"];
const UA_ALLOWLIST_PREFIXES = ["/api/v1/", "/embed/"];

export const botBlocker = (req, res, next) => {
  if (UA_ALLOWLIST_PATHS.includes(req.path)) return next();
  if (UA_ALLOWLIST_PREFIXES.some((p) => req.path.startsWith(p))) return next();

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
   Now accepts an optional keyFn so callers can rate-limit by something
   other than IP — e.g. by account (req.uid), which is what actually stops
   a logged-in scraper rotating IPs against an authenticated API. Existing
   usages (new SimpleRateLimiter(n, ms)) are unaffected — keyFn defaults to
   IP exactly as before.
   ─────────────────────────────────────────────── */

export class SimpleRateLimiter {
  constructor(maxRequests = 100, windowMs = 60000, keyFn = (req) => req.ip) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyFn = keyFn;
    this.hits = new Map();
    // Without this, every distinct key (IP, by default) that's ever made a
    // request stays in the Map forever — only its timestamp array got
    // pruned, never the key itself. Over long uptime with many unique
    // visitors that's an unbounded leak. Sweep out fully-expired keys
    // periodically instead.
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits) {
        const fresh = timestamps.filter((t) => now - t < this.windowMs);
        if (fresh.length === 0) this.hits.delete(key);
        else if (fresh.length !== timestamps.length) this.hits.set(key, fresh);
      }
    }, Math.max(this.windowMs, 60000)).unref();
  }

  middleware() {
    return (req, res, next) => {
      const now = Date.now();
      const key = this.keyFn(req) || req.ip;
      const timestamps = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);

      if (timestamps.length >= this.maxRequests) {
        console.warn(`⚠️ Rate limit exceeded: ${key} on ${req.path}`);
        return res.status(429).json({ error: "Too many requests. Please slow down." });
      }

      timestamps.push(now);
      this.hits.set(key, timestamps);
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

/* ───────────────────────────────────────────────
   LAYER 7: IP / CIDR BLOCKLIST
   Blocks exact IPs or ranges (CIDR notation) outright — for specific
   IPs/hosts you've identified as sources of abuse. Configure via the
   BLOCKED_IPS env var: comma-separated IPs and/or CIDR ranges, e.g.
   BLOCKED_IPS=1.2.3.4,5.6.7.0/24,2001:db8::/32
   Handles IPv4 and IPv6 (including IPv4-mapped IPv6 from proxies) via
   ipaddr.js rather than hand-rolled string matching, which is where CIDR
   logic reliably goes wrong if done by hand.
   ─────────────────────────────────────────────── */

function parseBlocklist(raw) {
  const entries = String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ranges = {};
  let i = 0;
  for (const entry of entries) {
    try {
      const range = entry.includes("/")
        ? ipaddr.parseCIDR(entry)
        : [ipaddr.parse(entry), ipaddr.parse(entry).kind() === "ipv6" ? 128 : 32];
      ranges[`blocked_${i++}`] = range;
    } catch {
      console.warn(`⚠️ Ignoring invalid BLOCKED_IPS entry: "${entry}"`);
    }
  }
  return ranges;
}

const BLOCKED_RANGES = parseBlocklist(process.env.BLOCKED_IPS);
const HAS_BLOCKED_RANGES = Object.keys(BLOCKED_RANGES).length > 0;
const NO_MATCH = "__none__";

export const ipBlocklist = (req, res, next) => {
  if (!HAS_BLOCKED_RANGES) return next();

  let addr;
  try {
    addr = ipaddr.process(req.ip); // normalizes IPv4-mapped IPv6 (::ffff:1.2.3.4) to plain IPv4
  } catch {
    return next(); // couldn't parse req.ip at all — fail open rather than break the site
  }

  // subnetMatch is ipaddr.js's own tool for "check this address against a list
  // of ranges" — it's documented to safely skip mismatched address families
  // (an IPv4 address against an IPv6 range, etc.) rather than needing that
  // handled by hand.
  const matched = ipaddr.subnetMatch(addr, BLOCKED_RANGES, NO_MATCH);
  if (matched !== NO_MATCH) {
    console.warn(`⛔ Blocked IP: ${req.ip} (${matched}) - ${req.path}`);
    return res.status(403).send("Forbidden");
  }
  next();
};

/* ───────────────────────────────────────────────
   LAYER 7 (NEW): PERMISSIONS-POLICY HEADER
   Tells the browser this site never wants camera/mic/geolocation/USB/payment
   access, no matter what a compromised or injected script asks for. Purely
   additive — doesn't touch or replace securityHeaders() above, just adds
   one more header alongside it.
   ─────────────────────────────────────────────── */

export const permissionsPolicy = (req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()"
  );
  next();
};

/* ───────────────────────────────────────────────
   LAYER 8 (NEW): HTTP PARAMETER POLLUTION GUARD
   ?role=user&role=admin style duplicate query keys can confuse code that
   only expects one value. This collapses any duplicated query param down
   to its last value before your routes ever see req.query, so existing
   route code doesn't need to change to be protected by it.
   ─────────────────────────────────────────────── */

export const hppGuard = (req, res, next) => {
  for (const key of Object.keys(req.query)) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][req.query[key].length - 1];
    }
  }
  next();
};

/* ───────────────────────────────────────────────
   LAYER 9 (NEW): KNOWN-PROBE PATH TRAP
   Automated scanners constantly poke at these paths on every site they
   find, looking for misconfigured WordPress/PHP/env leftovers you don't
   even have. None of this overlaps with suspiciousRequestDetector's regex
   list above — this is a flat, easy-to-audit set of exact path prefixes.
   ─────────────────────────────────────────────── */

const PROBE_PATH_PREFIXES = [
  "/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/xmlrpc.php",
  "/phpmyadmin", "/pma", "/.aws", "/.ssh", "/.docker", "/config.json",
  "/server-status", "/actuator", "/.well-known/traffic-advice",
];

export const probePathTrap = (req, res, next) => {
  const p = req.path.toLowerCase();
  if (PROBE_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) {
    console.warn(`Blocked known-probe path: ${req.ip} - ${req.path}`);
    return res.status(404).end(); // 404, not 403 — no point confirming the path exists at all
  }
  next();
};

/* ───────────────────────────────────────────────
   LAYER 10 (NEW): REPEATED-403 IP GUARD
   Independent from SimpleRateLimiter above (which caps total request
   volume) — this tracks how many times an IP gets actively blocked by
   another security layer (bot UA, IP blocklist, invalid stream token, etc.)
   across ANY route. Deliberately 403-only, not 404 — bare 404s are far too
   common from ordinary browsing and browser/DevTools auto-probing
   (favicon.ico, apple-touch-icon, devtools.json, typos) to be a reliable
   attack signal; counting them was auto-banning real visitors for nothing.
   A scanner walking a wordlist still racks up plenty of real 403s from the
   other layers above. Wrap this around your existing app with app.use(),
   same as the others — it inspects res.statusCode after the fact and
   doesn't change what any existing route returns.
   ─────────────────────────────────────────────── */

export class RepeatedRefusalGuard {
  constructor(maxRefusals = 15, windowMs = 5 * 60 * 1000, banMs = 30 * 60 * 1000) {
    this.maxRefusals = maxRefusals;
    this.windowMs = windowMs;
    this.banMs = banMs;
    this.refusals = new Map(); // ip -> timestamps[]
    this.bannedUntil = new Map(); // ip -> expiry ms
    // Same leak shape as SimpleRateLimiter above: an IP that never crosses
    // the ban threshold still keeps a key in `refusals` forever, and an
    // expired ban still keeps a key in `bannedUntil` until that IP happens
    // to make another request. Sweep both periodically.
    setInterval(() => {
      const now = Date.now();
      for (const [ip, timestamps] of this.refusals) {
        const fresh = timestamps.filter((t) => now - t < this.windowMs);
        if (fresh.length === 0) this.refusals.delete(ip);
        else if (fresh.length !== timestamps.length) this.refusals.set(ip, fresh);
      }
      for (const [ip, expiry] of this.bannedUntil) {
        if (now >= expiry) this.bannedUntil.delete(ip);
      }
    }, Math.max(this.windowMs, 60000)).unref();
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();

      const bannedUntil = this.bannedUntil.get(ip);
      if (bannedUntil && now < bannedUntil) {
        return res.status(403).send("Forbidden");
      } else if (bannedUntil) {
        this.bannedUntil.delete(ip);
      }

      res.on("finish", () => {
        // Only count 403s here — those are already a deliberate block from
        // another security layer (bot UA, IP blocklist, invalid stream
        // token...), a real signal. Bare 404s are too common from normal
        // browsing and browser/DevTools auto-probing (favicon, touch icons,
        // devtools.json, typos, etc.) to safely treat as an attack signal —
        // counting them was auto-banning real visitors from the whole site
        // for nothing.
        if (res.statusCode !== 403) return;
        // The developer API legitimately returns 401/403/404 as part of normal
        // use (bad key, expired embed token, unknown channel id) — someone
        // testing it shouldn't get their IP auto-banned from the entire site.
        if (req.path.startsWith("/api/v1/") || req.path.startsWith("/embed/")) return;
        const hits = (this.refusals.get(ip) || []).filter((t) => now - t < this.windowMs);
        hits.push(now);
        this.refusals.set(ip, hits);
        if (hits.length >= this.maxRefusals) {
          console.warn(`Auto-banning ${ip} for ${Math.round(this.banMs / 60000)}min after ${hits.length} refused requests.`);
          this.bannedUntil.set(ip, now + this.banMs);
          this.refusals.delete(ip);
        }
      });

      next();
    };
  }
}

/* ───────────────────────────────────────────────
   LAYER 11 (NEW): CROSS-ORIGIN WRITE GUARD (CSRF defense-in-depth)
   The session cookie is already SameSite=lax, which is what actually stops a
   cross-site POST from carrying a logged-in session. This is the second lock
   on the same door: it refuses state-changing requests that announce a
   different origin than the one serving them, so a same-site subdomain, a
   stray CORS-enabled fetch, or a future cookie-attribute regression doesn't
   silently become an account-takeover path.

   Deliberately conservative about what it refuses, because a false positive
   here breaks a real person's action:
     - Only unsafe methods. GET/HEAD/OPTIONS never reach it.
     - A missing Origin header is allowed. Non-browser clients (the public
       developer API, curl, a Telegram bot) don't send one, and browsers omit
       it on plain same-origin form GETs; SameSite=lax already covers the
       browser case.
     - /api/v1/* and /embed/* are exempt outright — that surface is documented
       to be called cross-origin from other people's sites and scripts, and
       authenticates with an API key rather than with the session cookie.
   ─────────────────────────────────────────────── */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PREFIXES = ["/api/v1/", "/embed/"];

export const crossOriginWriteGuard = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const origin = req.get("origin");
  if (!origin || origin === "null") return next();

  let originHost;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return res.status(403).json({ error: "Access denied" });
  }

  // Compared against the Host this request was actually served under, not a
  // configured list, so it stays correct for every deployment (canonical
  // domain, a preview URL, localhost) without another env var to keep in sync.
  if (originHost === String(req.headers.host || "").toLowerCase()) return next();

  console.warn(`Blocked cross-origin write: ${req.ip} - ${origin} -> ${req.method} ${req.path}`);
  return res.status(403).json({ error: "Access denied" });
};
