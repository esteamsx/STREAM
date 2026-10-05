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

const NAV_PATHS = [
  "/live",
  "/profile",
  "/u/",
  "/account",
  "/football",
  "/tools",
  "/promote",
  "/channel-react",
  "/deploy-bot",
  "/developers",
];

const BUILD = Date.now().toString(36);

const SPONSOR_TAG = `<script nonce="__CSP_NONCE__" src="/sponsor.js?v=${BUILD}" defer></script>`;
const NAV_TAG = `<script nonce="__CSP_NONCE__" src="/site-ui.js?v=${BUILD}" defer></script>`;

function matches(path, list) {
  return list.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry || path.startsWith(entry + "/")));
}

export function injectPromoSlot(req, res, next) {
  if (req.method !== "GET") return next();
  const wantsAds = !matches(req.path, SKIP_PATHS);
  const wantsNav = matches(req.path, NAV_PATHS);
  if (!wantsAds && !wantsNav) return next();
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && res.statusCode === 200) {
      const type = String(res.getHeader("Content-Type") || "");
      if (!type.includes("json")) {
        const at = body.lastIndexOf("</body>");
        if (at !== -1) {
          const tags = (wantsNav ? NAV_TAG : "") + (wantsAds ? SPONSOR_TAG : "");
          body = body.slice(0, at) + tags + body.slice(at);
        }
      }
    }
    return originalSend(body);
  };
  next();
}
