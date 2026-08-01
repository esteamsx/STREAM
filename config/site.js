
export const SITE = {
  name: "ES TEAMS TV",
  short: "ES TEAMS",
  tagline: "Live TV & sport, streaming free.",
  description:
    "Hundreds of live channels and every match, in your browser — no app, no set-top box.",
  locale: "en_US",
  themeColor: "#0A0A0F",
  twitter: "",
};

export function siteOrigin() {
  const configured = String(process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  const firstAllowed = String(process.env.ALLOWED_HOSTS || "esteamstv.devs.surf")
    .split(",")[0]
    .trim();
  return `https://${firstAllowed}`;
}

export const PAGES = {
  home: { path: "/", title: SITE.name, description: SITE.description, auth: "required" },
  login: {
    path: "/login",
    title: `Sign In — ${SITE.name}`,
    description: `Sign in to ${SITE.name} to watch live channels and follow the football.`,
    auth: "guest-only",
  },
  football: {
    path: "/football",
    title: `Football Live — ${SITE.name}`,
    description: "Live football streams, fixtures and results as they happen.",
    auth: "public",
  },
  profile: {
    path: "/profile",
    title: `Profile — ${SITE.name}`,
    description: `Your profile on ${SITE.name}.`,
    auth: "required",
  },
  account: {
    path: "/account",
    title: `Account Settings — ${SITE.name}`,
    description: "Manage your account, security and privacy settings.",
    auth: "required",
  },
  user: {
    path: "/u/:username",
    title: `Profile — ${SITE.name}`,
    description: `A profile on ${SITE.name}.`,
    auth: "required",
  },
  verify: {
    path: "/verify",
    title: `Verify Your Email — ${SITE.name}`,
    description: "Confirm your email address to finish setting up your account.",
    auth: "public",
  },
  reset: {
    path: "/reset",
    title: `Reset Password — ${SITE.name}`,
    description: "Reset the password on your account.",
    auth: "public",
  },
  developers: {
    path: "/developers",
    title: `Developer API — ${SITE.name}`,
    description: "Build with the ES TEAMS TV API: live channel data and embeddable players.",
    auth: "public",
  },
  deployBot: {
    path: "/deploy-bot",
    title: `Deploy a Bot — ${SITE.name}`,
    description: "Deploy your own streaming bot in a few clicks.",
    auth: "required",
  },
  admin: { path: "/admin", title: `Admin — ${SITE.name}`, description: "", auth: "required" },
  privacy: {
    path: "/privacy",
    title: `Privacy Policy — ${SITE.name}`,
    description: `How ${SITE.name} handles your data.`,
    auth: "public",
  },
  dmca: {
    path: "/dmca",
    title: `DMCA — ${SITE.name}`,
    description: `Copyright and takedown policy for ${SITE.name}.`,
    auth: "public",
  },
};

export const PATH_ALIASES = {
  "/home": "/",
  "/index": "/",
  "/index.html": "/",
  "/watch": "/",
  "/tv": "/",
  "/live": "/",
  "/signin": "/login",
  "/sign-in": "/login",
  "/log-in": "/login",
  "/logout": "/login",
  "/signup": "/login",
  "/sign-up": "/login",
  "/register": "/login",
  "/join": "/login",
  "/soccer": "/football",
  "/sports": "/football",
  "/matches": "/football",
  "/me": "/profile",
  "/settings": "/account",
  "/preferences": "/account",
  "/security": "/account",
  "/docs": "/developers",
  "/api-docs": "/developers",
  "/api": "/developers",
  "/developer": "/developers",
  "/bots": "/deploy-bot",
  "/bot": "/deploy-bot",
  "/deploy": "/deploy-bot",
  "/forgot": "/reset",
  "/forgot-password": "/reset",
  "/reset-password": "/reset",
  "/copyright": "/dmca",
  "/takedown": "/dmca",
  "/legal": "/privacy",
  "/terms": "/privacy",
  "/policy": "/privacy",
};

const ICON_TAGS = `<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function siteHead({ title, description, path = "/", image = "/og.png", type = "website" } = {}) {
  const origin = siteOrigin();
  const url = origin + (path.startsWith("/") ? path : `/${path}`);
  const finalTitle = title || SITE.name;
  const finalDescription = description || SITE.description;
  const absoluteImage = image.startsWith("http") ? image : origin + image;

  return `${ICON_TAGS}
<meta name="theme-color" content="${SITE.themeColor}">
<meta name="application-name" content="${escapeAttr(SITE.name)}">
<meta name="apple-mobile-web-app-title" content="${escapeAttr(SITE.short)}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="description" content="${escapeAttr(finalDescription)}">
<link rel="canonical" href="${escapeAttr(url)}">
<meta property="og:site_name" content="${escapeAttr(SITE.name)}">
<meta property="og:type" content="${escapeAttr(type)}">
<meta property="og:title" content="${escapeAttr(finalTitle)}">
<meta property="og:description" content="${escapeAttr(finalDescription)}">
<meta property="og:url" content="${escapeAttr(url)}">
<meta property="og:locale" content="${SITE.locale}">
<meta property="og:image" content="${escapeAttr(absoluteImage)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeAttr(SITE.name)} — ${escapeAttr(SITE.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(finalTitle)}">
<meta name="twitter:description" content="${escapeAttr(finalDescription)}">
<meta name="twitter:image" content="${escapeAttr(absoluteImage)}">`;
}

export function siteHeadFor(key, overrides = {}) {
  const page = PAGES[key] || {};
  return siteHead({
    title: page.title,
    description: page.description,
    path: page.path && !page.path.includes(":") ? page.path : "/",
    ...overrides,
  });
}

export const WEB_MANIFEST = {
  name: SITE.name,
  short_name: SITE.short,
  description: SITE.description,
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any",
  background_color: SITE.themeColor,
  theme_color: SITE.themeColor,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
