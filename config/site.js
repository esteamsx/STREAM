
export const SITE = {
  name: "ES TEAMS TV",
  short: "ES TEAMS",
  tagline: "Live TV & sport, streaming free.",
  description:
    "Hundreds of live channels and every match, in your browser. No app, no set-top box.",
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
    description: `Sign in to ${SITE.name} to watch live channels and follow the football.`,
    auth: "guest-only",
  },
  football: {
    path: "/football",
    description: "Live football streams, fixtures and results as they happen.",
    auth: "public",
  },
  profile: {
    path: "/profile",
    description: `Your profile on ${SITE.name}.`,
    auth: "required",
  },
  account: {
    path: "/account",
    description: "Manage your account, security and privacy settings.",
    auth: "required",
  },
  user: {
    path: "/u/:username",
    description: `A profile on ${SITE.name}.`,
    auth: "required",
  },
  verify: {
    path: "/verify",
    description: "Confirm your email address to finish setting up your account.",
    auth: "public",
  },
  reset: {
    path: "/reset",
    description: "Reset the password on your account.",
    auth: "public",
  },
  developers: {
    path: "/developers",
    description: "Build with the ES TEAMS TV APIs: live channel data, embeddable players, and more.",
    auth: "public",
  },
  developersLiveTv: {
    path: "/developers/live-tv",
    description: "Build with the ES TEAMS TV Live TV API: channel data and embeddable players.",
    auth: "public",
  },
  developersApi: {
    path: "/developers/api",
    description: "The ES TEAMS TV Developer API: media and AI tools for your own site or bot.",
    auth: "public",
  },
  deployBot: {
    path: "/deploy-bot",
    description: "Deploy your own streaming bot in a few clicks.",
    auth: "required",
  },
  channelReact: {
    path: "/channel-react",
    description: "Send a channel reaction through your own deployed bot.",
    auth: "required",
  },
  trading: {
    path: "/tools/trading",
    description: "Live BTC/USDT chart and PnL dashboard.",
    auth: "required",
  },
  admin: { path: "/admin", description: "", auth: "required" },
  privacy: {
    path: "/privacy",
    description: `How ${SITE.name} handles your data.`,
    auth: "public",
  },
  dmca: {
    path: "/dmca",
    description: `Copyright and takedown policy for ${SITE.name}.`,
    auth: "public",
  },
  tools: {
    path: "/tools",
    description: "Free developer and network tools: DNS lookup, JS obfuscator, QR codes, SSL checker, WHOIS, and more.",
    auth: "public",
  },
  toolsDnsLookup: {
    path: "/tools/dns-lookup",
    description: "Look up A, AAAA, MX, TXT, NS, CNAME and SOA records for any domain.",
    auth: "public",
  },
  toolsObfuscate: {
    path: "/tools/obfuscate",
    description: "Obfuscate JavaScript source code right in your browser.",
    auth: "public",
  },
  toolsQrCode: {
    path: "/tools/qr-code",
    description: "Turn any text or URL into a scannable QR code.",
    auth: "public",
  },
  toolsSslChecker: {
    path: "/tools/ssl-checker",
    description: "Check a domain's TLS certificate: issuer, expiry and validity.",
    auth: "public",
  },
  toolsWhois: {
    path: "/tools/whois",
    description: "Look up domain registration info for any domain.",
    auth: "public",
  },
  toolsBase64: {
    path: "/tools/base64",
    description: "Encode or decode Base64 text instantly.",
    auth: "public",
  },
  toolsJwtDecode: {
    path: "/tools/jwt-decode",
    description: "Decode a JSON Web Token's header and payload.",
    auth: "public",
  },
  toolsJsonFormatter: {
    path: "/tools/json-formatter",
    description: "Format and validate JSON instantly.",
    auth: "public",
  },
  toolsFancyText: {
    path: "/tools/fancy-text",
    description: "Turn text into bold, italic, script, circled and other stylish Unicode fonts.",
    auth: "public",
  },
  toolsPasswordGenerator: {
    path: "/tools/password-generator",
    description: "Generate strong, cryptographically random passwords.",
    auth: "public",
  },
  toolsHashGenerator: {
    path: "/tools/hash-generator",
    description: "MD5, SHA-1, SHA-256 and SHA-512 hashes for text or files.",
    auth: "public",
  },
  toolsRegexTester: {
    path: "/tools/regex-tester",
    description: "Test a regular expression against text and see every match.",
    auth: "public",
  },
  toolsTimestampConverter: {
    path: "/tools/timestamp-converter",
    description: "Convert between Unix timestamps and human-readable dates.",
    auth: "public",
  },
  toolsWordCounter: {
    path: "/tools/word-counter",
    description: "Count words, characters, sentences and paragraphs.",
    auth: "public",
  },
  toolsCaseConverter: {
    path: "/tools/case-converter",
    description: "Switch text between upper, lower, title, camel, snake and kebab case.",
    auth: "public",
  },
  toolsLoremIpsum: {
    path: "/tools/lorem-ipsum",
    description: "Generate placeholder paragraphs for mockups and layouts.",
    auth: "public",
  },
  toolsSlugGenerator: {
    path: "/tools/slug-generator",
    description: "Turn any text into a clean, URL-friendly slug.",
    auth: "public",
  },
  toolsUrlEncoder: {
    path: "/tools/url-encoder",
    description: "Percent-encode or decode text for safe use in URLs.",
    auth: "public",
  },
  toolsHtmlEntity: {
    path: "/tools/html-entity",
    description: "Escape or unescape HTML special characters.",
    auth: "public",
  },
  toolsHexText: {
    path: "/tools/hex-text",
    description: "Convert text to hexadecimal and back.",
    auth: "public",
  },
  toolsBinaryText: {
    path: "/tools/binary-text",
    description: "Convert text to binary and back.",
    auth: "public",
  },
  toolsCaesarCipher: {
    path: "/tools/caesar-cipher",
    description: "Shift letters by any amount, including ROT13.",
    auth: "public",
  },
  toolsUuidGenerator: {
    path: "/tools/uuid-generator",
    description: "Generate RFC 4122 v4 UUIDs.",
    auth: "public",
  },
  toolsColorConverter: {
    path: "/tools/color-converter",
    description: "Convert between Hex, RGB and HSL color formats.",
    auth: "public",
  },
  toolsBaseConverter: {
    path: "/tools/base-converter",
    description: "Convert numbers between binary, octal, decimal and hexadecimal.",
    auth: "public",
  },
  toolsRomanNumeral: {
    path: "/tools/roman-numeral",
    description: "Convert between numbers and Roman numerals.",
    auth: "public",
  },
  toolsUserAgentParser: {
    path: "/tools/user-agent-parser",
    description: "Break down a User-Agent string into browser, OS and device.",
    auth: "public",
  },
  toolsSubnetCalculator: {
    path: "/tools/subnet-calculator",
    description: "Calculate network range, broadcast address and host count for a CIDR block.",
    auth: "public",
  },
  toolsRandomNumber: {
    path: "/tools/random-number",
    description: "Cryptographically random integers within a range.",
    auth: "public",
  },
  toolsDiceRoller: {
    path: "/tools/dice-roller",
    description: "Flip a coin or roll dice with any number of sides.",
    auth: "public",
  },
  toolsDedupeLines: {
    path: "/tools/dedupe-lines",
    description: "Remove duplicate lines from a block of text.",
    auth: "public",
  },
  toolsSortLines: {
    path: "/tools/sort-lines",
    description: "Sort lines alphabetically or numerically.",
    auth: "public",
  },
  toolsAgeCalculator: {
    path: "/tools/age-calculator",
    description: "Calculate exact age in years, months and days from a birth date.",
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

const SKELETON_CSS = `<style>
:root{--sk-base:rgba(255,255,255,.09);--sk-hi:rgba(255,255,255,.22)}
:root[data-theme="light"]{--sk-base:rgba(20,20,28,.08);--sk-hi:rgba(20,20,28,.17)}
@keyframes skWave{0%{background-position:100% 0}100%{background-position:0 0}}
.sk,.sk-line,.sk-title,.sk-avatar,.sk-avatar-lg,.sk-avatar-xl,.sk-thumb,.sk-btn,.sk-chip,.sk-input,.sk-pill{
  background-image:linear-gradient(90deg,var(--sk-base) 25%,var(--sk-hi) 50%,var(--sk-base) 75%);
  background-size:200% 100%;background-repeat:no-repeat;
  animation:skWave 1.6s linear infinite;border-radius:8px;flex-shrink:0;
}
.sk-line{height:11px;width:100%;border-radius:6px}
.sk-line.w80{width:80%}.sk-line.w60{width:60%}.sk-line.w45{width:45%}.sk-line.w30{width:30%}
.sk-title{height:15px;width:55%;border-radius:6px}
.sk-avatar{width:42px;height:42px;border-radius:50%}
.sk-avatar-lg{width:52px;height:52px;border-radius:50%}
.sk-avatar-xl{width:86px;height:86px;border-radius:50%}
.sk-thumb{width:100%;aspect-ratio:16/9;border-radius:12px}
.sk-btn{height:34px;width:88px;border-radius:10px}
.sk-btn.full{width:100%}
.sk-chip{height:26px;width:74px;border-radius:20px}
.sk-input{height:38px;width:100%;border-radius:10px}
.sk-pill{height:30px;width:100%;border-radius:20px}
.sk-row{display:flex;align-items:center;gap:12px;padding:12px 0}
.sk-row-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.sk-stack{display:flex;flex-direction:column;gap:10px}
.sk-card{
  border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:11px;
  background:linear-gradient(155deg,rgba(255,255,255,.06),rgba(255,255,255,.02) 60%);
  border:1px solid rgba(255,255,255,.08);
}
:root[data-theme="light"] .sk-card{background:rgba(255,255,255,.5);border-color:rgba(20,20,28,.07)}
.sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.sk-hero{display:flex;align-items:center;gap:14px}
.sk-hero-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:9px}
.sk-field{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}
.sk-field:last-child{margin-bottom:0}
.sk-field-row{display:flex;gap:10px}
.sk-field-row .sk-field{flex:1;min-width:0}
.sk-cols{display:flex;gap:10px}
.sk-cols > *{flex:1;min-width:0}
.sk-center{display:flex;flex-direction:column;align-items:center;gap:11px}
.sk-inline{display:flex;align-items:center;gap:10px}
@media(prefers-reduced-motion:reduce){
  .sk,.sk-line,.sk-title,.sk-avatar,.sk-avatar-lg,.sk-avatar-xl,.sk-thumb,.sk-btn,.sk-chip,.sk-input,.sk-pill{animation:none;background-position:0 0}
}
</style>`;

export function siteHead({ title, description, path = "/", image = "/og.png", type = "website" } = {}) {
  const origin = siteOrigin();
  const url = origin + (path.startsWith("/") ? path : `/${path}`);
  const finalTitle = title || SITE.name;
  const finalDescription = description || SITE.description;
  const absoluteImage = image.startsWith("http") ? image : origin + image;

  return `${ICON_TAGS}
<meta name="theme-color" id="themeColorMeta" content="${SITE.themeColor}">
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
<meta property="og:image:alt" content="${escapeAttr(SITE.name)}: ${escapeAttr(SITE.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeAttr(finalTitle)}">
<meta name="twitter:description" content="${escapeAttr(finalDescription)}">
<meta name="twitter:image" content="${escapeAttr(absoluteImage)}">
${SKELETON_CSS}`;
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
