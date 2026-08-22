
import crypto from "crypto";
import ipaddr from "ipaddr.js";
import helmet from "helmet";

export const cspNonce = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && body.indexOf("__CSP_NONCE__") !== -1) {
      body = body.split("__CSP_NONCE__").join(nonce);
    }
    return originalSend(body);
  };
  next();
};

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

  check(key) {
    const now = Date.now();
    const k = key || "unknown";
    const timestamps = (this.hits.get(k) || []).filter((t) => now - t < this.windowMs);
    if (timestamps.length >= this.maxRequests) return false;
    timestamps.push(now);
    this.hits.set(k, timestamps);
    return true;
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyFn(req) || req.ip;
      if (!this.check(key)) {
        console.warn(`Rate limit exceeded: ${key} on ${req.path}`);
        return res.status(429).json({ error: this.message });
      }
      next();
    };
  }
}

export class DurableRateLimiter extends SimpleRateLimiter {
  constructor(maxRequests, windowMs, keyFn, message, options = {}) {
    super(maxRequests, windowMs, keyFn, message);
    this.bucket = options.bucket || "default";
    this.collection = options.collection || "rate_limits";
    this.getDb = options.getDb || null;
  }

  docId(key) {
    const safe = String(key || "unknown").replace(/[^A-Za-z0-9_.@:-]/g, "_").slice(0, 120);
    return `${this.bucket}__${safe}`;
  }

  async checkShared(key) {
    if (!this.getDb) return true;
    let db;
    try {
      db = this.getDb();
    } catch {
      return true;
    }
    if (!db) return true;
    const ref = db.collection(this.collection).doc(this.docId(key));
    const now = Date.now();
    try {
      return await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? snap.data() : null;
        if (!data || typeof data.resetAt !== "number" || now >= data.resetAt) {
          tx.set(ref, { count: 1, resetAt: now + this.windowMs, bucket: this.bucket });
          return true;
        }
        if ((data.count || 0) >= this.maxRequests) return false;
        tx.set(ref, { count: (data.count || 0) + 1, resetAt: data.resetAt, bucket: this.bucket }, { merge: true });
        return true;
      });
    } catch (err) {
      console.warn(`Durable rate limit unavailable for ${this.bucket}, allowing request: ${err.message}`);
      return true;
    }
  }

  middleware() {
    return (req, res, next) => {
      const key = this.keyFn(req) || req.ip;
      if (!this.check(key)) {
        console.warn(`Rate limit exceeded: ${key} on ${req.path}`);
        return res.status(429).json({ error: this.message });
      }
      this.checkShared(key)
        .then((allowed) => {
          if (allowed) return next();
          console.warn(`Shared rate limit exceeded: ${key} on ${req.path}`);
          res.status(429).json({ error: this.message });
        })
        .catch(() => next());
    };
  }
}

const SUSPICIOUS_PATTERNS = [
  /\.\.\//, /\.\.%2f/i, /\/\.env/i, /\/\.git/i, /etc\/passwd/i,
  /<script/i, /javascript:/i, /union.*select/i, /drop\s+table/i,
];

export const suspiciousRequestDetector = (req, res, next) => {
  if (SUSPICIOUS_PATTERNS.some((p) => p.test(req.url))) {
    console.warn(`Suspicious request: ${req.ip} - ${req.url}`);
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
      console.warn(`Ignoring invalid BLOCKED_IPS entry: "${entry}"`);
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
    console.warn(`Blocked IP: ${req.ip} (${matched}) - ${req.path}`);
    return res.status(403).send("Forbidden");
  }
  next();
};

export const permissionsPolicy = (req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), usb=(), payment=(), interest-cohort=()"
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

const NO_ORIGIN_EXEMPT_PATHS = ["/api/paystack/webhook"];

export const crossOriginWriteGuard = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const origin = req.get("origin");

  if (!origin || origin === "null") {
    if (NO_ORIGIN_EXEMPT_PATHS.includes(req.path)) return next();
    console.warn(`Blocked write with missing origin: ${req.ip} -> ${req.method} ${req.path}`);
    return res.status(403).json({ error: "This action must be performed from the website directly." });
  }

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

// Stricter than crossOriginWriteGuard: for sensitive/automatable actions (login,
// signup, claiming coins, deploying a bot), a missing Origin header is treated as
// a block rather than allowed through. Real browsers always send Origin on a
// same-origin fetch/POST; scripts, curl, Postman, and bots typically only send it
// if the author deliberately adds it, so this closes that specific gap for the
// routes that need it most, without changing behavior for the rest of the site.
export const requireSiteOrigin = (req, res, next) => {
  const origin = req.get("origin");
  let originHost = null;
  try {
    originHost = origin ? new URL(origin).host.toLowerCase() : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== String(req.headers.host || "").toLowerCase()) {
    console.warn(`Blocked request with missing/mismatched origin: ${req.ip} -> ${req.method} ${req.path} origin=${origin || "none"}`);
    return res.status(403).json({ error: "This action must be performed from the website directly." });
  }
  next();
};
