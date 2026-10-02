const SKIP_PATHS = [
  "/api/",
  "/embed/",
  "/.well-known/",
  "/s/",
  "/promote",
  "/login",
  "/verify",
  "/reset",
  "/admin",
];

const SCRIPT_TAG = '<script nonce="__CSP_NONCE__" src="/sponsor.js" defer></script>';

function skipped(path) {
  return SKIP_PATHS.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry || path.startsWith(entry + "/")));
}

export function injectPromoSlot(req, res, next) {
  if (req.method !== "GET" || skipped(req.path)) return next();
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && res.statusCode === 200) {
      const type = String(res.getHeader("Content-Type") || "");
      if (!type.includes("json")) {
        const at = body.lastIndexOf("</body>");
        if (at !== -1) body = body.slice(0, at) + SCRIPT_TAG + body.slice(at);
      }
    }
    return originalSend(body);
  };
  next();
}
