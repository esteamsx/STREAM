
import { PAGES, PATH_ALIASES } from "../config/site.js";

const NON_PAGE_PREFIXES = ["/api/", "/embed/", "/.well-known/"];
const NON_PAGE_EXACT = new Set([
  "/health",
  "/robots.txt",
  "/favicon.ico",
  "/favicon.svg",
  "/site.webmanifest",
  "/og.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/icon-32.png",
  "/icon-192.png",
  "/icon-512.png",
]);

function isPagePath(path) {
  if (NON_PAGE_EXACT.has(path)) return false;
  return !NON_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const CANONICAL_PATHS = new Set(
  Object.values(PAGES)
    .map((page) => page.path)
    .filter((path) => !path.includes(":"))
);

export function safeNextPath(value) {
  const raw = String(value || "");
  if (!raw || raw.length > 512) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\x00-\x1f\x7f]/.test(raw)) return null;
  return raw;
}

export function loginUrlFor(req) {
  const target = safeNextPath(req.originalUrl);
  return target && target !== "/" ? `/login?next=${encodeURIComponent(target)}` : "/login";
}

export function canonicalPath(req, res, next) {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (!isPagePath(req.path)) return next();

  let path = req.path;
  if (path.length > 1) path = path.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";

  const lowered = path.toLowerCase();
  if (!lowered.startsWith("/u/")) {
    if (CANONICAL_PATHS.has(lowered)) path = lowered;
    else if (PATH_ALIASES[lowered]) path = PATH_ALIASES[lowered];
  }

  if (path === req.path) return next();

  const queryIndex = req.originalUrl.indexOf("?");
  const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
  return res.redirect(301, path + query);
}

export function pageGuards({ verifySession, getUserProfile, isSessionRevoked }) {
  async function currentUser(req) {
    const sessionId = req.cookies?.["__Host-session"];
    if (!sessionId) return null;
    const uid = await verifySession(sessionId);
    if (!uid) return null;
    if (!getUserProfile) return { uid, profile: null };
    const profile = await getUserProfile(uid);
    if (!profile || profile.banned) return null;
    if (isSessionRevoked && isSessionRevoked(sessionId, profile)) return null;
    return { uid, profile };
  }

  return {
    requireUser: async (req, res, next) => {
      try {
        const user = await currentUser(req);
        if (!user) return res.redirect(loginUrlFor(req));
        req.uid = user.uid;
        req.userProfile = user.profile;
        return next();
      } catch {
        return res.redirect("/login");
      }
    },
    guestOnly: async (req, res, next) => {
      try {
        const user = await currentUser(req);
        if (!user) return next();
        const target = safeNextPath(req.query?.next) || "/";
        return res.redirect(target);
      } catch {
        return next();
      }
    },
  };
}
