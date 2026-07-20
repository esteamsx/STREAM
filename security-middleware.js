/**
 * ES TEAMS TV - Security Middleware
 * Proprietary Software © ES TEAMS TECH. Unauthorized copying prohibited.
 *
 * Drop this file in the same folder as server.js (project root).
 * Nothing here touches your existing routes/logic — it's purely additive.
 */

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
