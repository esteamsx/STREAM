const BLOCKED_API_ORIGIN_HOSTS = new Set(["wa.dclabs.my.id"]);
const API_ORIGIN_GUARD_PATHS = ["/api/", "/embed/"];

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const blockedApiOriginGuard = (req, res, next) => {
  if (!API_ORIGIN_GUARD_PATHS.some((prefix) => req.path.startsWith(prefix))) return next();
  const originHost = hostFromUrl(req.get("origin") || "");
  const refererHost = hostFromUrl(req.get("referer") || "");
  const blockedHost = [originHost, refererHost].find((host) => host && BLOCKED_API_ORIGIN_HOSTS.has(host));
  if (!blockedHost) return next();
  console.warn(`Blocked API request from denied site ${blockedHost}: ${req.method} ${req.path}`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(403).json({ error: "Access denied." });
};
