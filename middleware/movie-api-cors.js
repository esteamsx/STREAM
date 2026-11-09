export function movieApiCors(req, res, next) {
  if (!String(req.path || "").startsWith("/api/v1/movie/")) return next();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "x-api-key, content-type, range");
  res.setHeader("Access-Control-Expose-Headers", "content-range, accept-ranges, content-length, content-type, x-es-teams-tv-name, x-es-teams-tv-link");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
}
