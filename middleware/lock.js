
import crypto from "crypto";

const ALLOWED_HOSTS_LIST = (process.env.ALLOWED_HOSTS || "esteamstv.devs.surf")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const PRIMARY_HOST = ALLOWED_HOSTS_LIST[0] || "esteamstv.devs.surf";

const ALLOWED_HOST_HASHES = new Set(
  ALLOWED_HOSTS_LIST.map((h) => crypto.createHash("sha256").update(h).digest("hex"))
);

const BYPASS_KEY = process.env.DEVTOOLS_BYPASS_KEY || "";
const BYPASS_COOKIE_NAME = "dtb";
const BYPASS_COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function normalizeHost(hostHeader) {
  return String(hostHeader || "").toLowerCase().replace(/:\d+$/, "");
}

function isAllowedHost(hostHeader) {
  const hash = crypto.createHash("sha256").update(normalizeHost(hostHeader)).digest("hex");
  return ALLOWED_HOST_HASHES.has(hash);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function suppliedBypassKey(req) {
  return (
    req.headers["x-devtools-bypass"] ||
    (req.query && req.query.devtools_key) ||
    readCookie(req, BYPASS_COOKIE_NAME) ||
    ""
  );
}

function hasValidBypass(req) {
  if (!BYPASS_KEY) return false;
  const supplied = suppliedBypassKey(req);
  return supplied ? safeEqual(supplied, BYPASS_KEY) : false;
}

const HOST_EXEMPT_PATHS = new Set(["/health"]);

export function domainLock(req, res, next) {
  if (HOST_EXEMPT_PATHS.has(req.path)) return next();
  if (isAllowedHost(req.headers.host)) return next();

  if (hasValidBypass(req)) {
    res.cookie(BYPASS_COOKIE_NAME, BYPASS_KEY, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: BYPASS_COOKIE_MAX_AGE_MS,
    });
    return next();
  }

  return res.redirect(302, `https://${PRIMARY_HOST}${req.originalUrl}`);
}
