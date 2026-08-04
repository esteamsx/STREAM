
import ipaddr from "ipaddr.js";
import helmet from "helmet";

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
});

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};

const BLOCKED_UA_PATTERNS = [
  /curl/i, /wget/i, /python-requests/i, /python-urllib/i, /scrapy/i,
  /httpclient/i, /go-http-client/i, /node-fetch/i, /axios\//i,
  /okhttp/i, /libwww-perl/i, /^java\//i, /^ruby/i, /php\//i,
  /httrack/i, /wput/i, /crawler/i, /spider/i, /^$/,
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /playwright/i,
  /selenium/i, /^scrapy\//i, /aiohttp/i, /^postmanruntime/i,
  /^guzzlehttp/i, /^dart[:-]?http/i, /^got \(/i, /^undici/i,
];

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

export class SimpleRateLimiter {
  constructor(maxRequests = 100, windowMs = 60000, keyFn = (req) => req.ip, message = "Too many requests. Please slow down.") {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.keyFn = keyFn;
    this.message = message;
    this.hits = new Map();
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
        return res.status(429).json({ error: this.message });
      }

      timestamps.push(now);
      this.hits.set(key, timestamps);
      next();
    };
  }
}

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

export const ROBOTS_TXT = `User-agent: *
Disallow: /
Allow: /og.png
Allow: /favicon.ico
Allow: /favicon.svg
Allow: /apple-touch-icon.png
Allow: /icon-192.png
Allow: /icon-512.png
Allow: /site.webmanifest

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: Facebot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: Discordbot
Allow: /

User-agent: Slackbot-LinkExpanding
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: SkypeUriPreview
Allow: /
`;

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
    addr = ipaddr.process(req.ip);
  } catch {
    return next();
  }

  const matched = ipaddr.subnetMatch(addr, BLOCKED_RANGES, NO_MATCH);
  if (matched !== NO_MATCH) {
    console.warn(`⛔ Blocked IP: ${req.ip} (${matched}) - ${req.path}`);
    return res.status(403).send("Forbidden");
  }
  next();
};

export const permissionsPolicy = (req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()"
  );
  next();
};

export const hppGuard = (req, res, next) => {
  for (const key of Object.keys(req.query)) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][req.query[key].length - 1];
    }
  }
  next();
};

const PROBE_PATH_PREFIXES = [
  "/wp-admin", "/wp-login", "/wp-content", "/wp-includes", "/xmlrpc.php",
  "/phpmyadmin", "/pma", "/.aws", "/.ssh", "/.docker", "/config.json",
  "/server-status", "/actuator", "/.well-known/traffic-advice",
];

export const probePathTrap = (req, res, next) => {
  const p = req.path.toLowerCase();
  if (PROBE_PATH_PREFIXES.some((prefix) => p.startsWith(prefix))) {
    console.warn(`Blocked known-probe path: ${req.ip} - ${req.path}`);
    return res.status(404).end();
  }
  next();
};

export class RepeatedRefusalGuard {
  constructor(maxRefusals = 15, windowMs = 5 * 60 * 1000, banMs = 30 * 60 * 1000) {
    this.maxRefusals = maxRefusals;
    this.windowMs = windowMs;
    this.banMs = banMs;
    this.refusals = new Map();
    this.bannedUntil = new Map();
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
        if (res.statusCode !== 403) return;
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

  if (originHost === String(req.headers.host || "").toLowerCase()) return next();

  console.warn(`Blocked cross-origin write: ${req.ip} - ${origin} -> ${req.method} ${req.path}`);
  return res.status(403).json({ error: "Access denied" });
};
