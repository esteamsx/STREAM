const SKIP_PATHS = [
  "/api/",
  "/embed/",
  "/.well-known/",
  "/s/",
  "/tictactoe/guest",
  "/promote",
  "/login",
  "/verify",
  "/reset",
  "/admin",
];

const NAV_PATHS = [
  "/live",
  "/movies",
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

const PRESENCE_SKIP_PATHS = [
  "/api/",
  "/embed/",
  "/.well-known/",
  "/s/",
  "/login",
  "/verify",
  "/reset",
  "/chess/guest",
  "/ludo/guest",
  "/tictactoe/guest",
];

const SOCIAL_SKIP_PATHS = [
  "/api/",
  "/embed/",
  "/.well-known/",
  "/s/",
  "/tictactoe",
];

const POPUNDER_SKIP_PATHS = [
  "/api/",
  "/embed/",
  "/.well-known/",
  "/s/",
  "/chess",
  "/ludo",
  "/whot",
  "/snakes",
  "/tictactoe",
  "/login",
  "/verify",
  "/reset",
  "/account",
  "/pay/",
  "/promote",
  "/admin",
];

const NATIVE_EXACT_PATHS = ["/", "/channel-react", "/developers"];
const NATIVE_PREFIX_PATHS = ["/tools/"];

const BUILD = Date.now().toString(36);

const SPONSOR_TAG = `<script nonce="__CSP_NONCE__" src="/sponsor.js?v=${BUILD}" defer></script>`;
const PRESENCE_TAG = `<script nonce="__CSP_NONCE__" src="/chess-presence.js?v=${BUILD}" defer></script>`;
const SOCIAL_TAG = `<script nonce="__CSP_NONCE__" src="/social-bar.js?v=${BUILD}" defer></script>`;
const POPUNDER_TAG = `<script nonce="__CSP_NONCE__" src="/popunder.js?v=${BUILD}" defer></script>`;
const NATIVE_TAG = `<script nonce="__CSP_NONCE__" src="/native-banner.js?v=${BUILD}" defer></script>`;
const THEME_TAG = `<script nonce="__CSP_NONCE__" src="/site-theme.js?v=${BUILD}"></script>`;
const NAV_TAG = `<script nonce="__CSP_NONCE__" src="/site-ui.js?v=${BUILD}" defer></script>`;

function matches(path, list) {
  return list.some((entry) => (entry.endsWith("/") ? path.startsWith(entry) : path === entry || path.startsWith(entry + "/")));
}

export function injectPromoSlot(req, res, next) {
  if (req.method !== "GET") return next();
  const wantsAds = !matches(req.path, SKIP_PATHS);
  const wantsNav = matches(req.path, NAV_PATHS);
  const wantsPresence = !matches(req.path, PRESENCE_SKIP_PATHS);
  const wantsSocial = !matches(req.path, SOCIAL_SKIP_PATHS);
  const wantsPopunder = !matches(req.path, POPUNDER_SKIP_PATHS);
  const wantsNative = wantsPopunder && (NATIVE_EXACT_PATHS.includes(req.path) || NATIVE_PREFIX_PATHS.some((p) => req.path.startsWith(p)));
  if (!wantsAds && !wantsNav && !wantsPresence && !wantsSocial) return next();
  const originalSend = res.send.bind(res);
  res.send = (body) => {
    if (typeof body === "string" && res.statusCode === 200) {
      const type = String(res.getHeader("Content-Type") || "");
      if (!type.includes("json")) {
        if (wantsSocial) {
          const head = body.indexOf("</head>");
          if (head !== -1) body = body.slice(0, head) + THEME_TAG + body.slice(head);
        }
        const at = body.lastIndexOf("</body>");
        if (at !== -1) {
          const adsOk = !(res.locals && res.locals.noAds);
          const tags =
            (wantsNav ? NAV_TAG : "") +
            (wantsAds ? SPONSOR_TAG : "") +
            (wantsPresence ? PRESENCE_TAG : "") +
            (wantsSocial && adsOk ? SOCIAL_TAG : "") +
            (wantsPopunder && adsOk && body.indexOf("/popunder.js") === -1 ? POPUNDER_TAG : "") +
            (wantsNative && adsOk && body.indexOf("/native-banner.js") === -1 ? NATIVE_TAG : "");
          body = body.slice(0, at) + tags + body.slice(at);
        }
      }
    }
    return originalSend(body);
  };
  next();
}
