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
