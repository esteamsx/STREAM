
import crypto from "crypto";

const ALLOWED_HOST_HASHES = new Set(
  (process.env.ALLOWED_HOSTS || "esteamstv.devs.surf")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
    .map((h) => crypto.createHash("sha256").update(h).digest("hex"))
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

function blockedPageHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>ES TEAMS TV</title>
<style>
  *{box-sizing:border-box}
  body{
    background:#0A0A0F;color:#e8e8f0;font-family:system-ui,-apple-system,sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;
    margin:0;padding:24px;text-align:center;
  }
  .box{max-width:440px}
  h1{font-size:1.05rem;margin:0 0 10px;font-weight:700}
  p{color:#8a8a9a;font-size:.85rem;line-height:1.6;margin:0 0 8px}
  code{background:#15151F;padding:2px 6px;border-radius:4px;color:#00E0FF;font-size:.82rem}
</style>
</head>
<body>
  <div class="box">
    <h1>This site only runs at esteamstv.devs.surf</h1>
    <p>This instance isn't being served from an authorized domain.</p>
    <p>Developer testing from elsewhere? Supply your <code>DEVTOOLS_BYPASS_KEY</code> as a <code>?devtools_key=</code> query parameter or an <code>x-devtools-bypass</code> header.</p>
  </div>
</body>
</html>`;
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

  return res.status(403).type("html").send(blockedPageHtml());
}
