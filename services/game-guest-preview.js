import { siteOrigin, WEB_MANIFEST } from "../config/site.js";

export const GAME_GUEST_PREVIEWS = Object.freeze({
  chess: Object.freeze({
    title: "Join my Chess game | ES TEAMS TV",
    description: "You have been invited to play Chess. No account needed, just pick a name and play.",
    image: "/game-previews/chess/og.png",
    iconBase: "/game-previews/chess",
  }),
  ludo: Object.freeze({
    title: "Join my Ludo game | ES TEAMS TV",
    description: "You have been invited to play Ludo. No account needed, just pick a name and play.",
    image: "/game-previews/ludo/og.png",
    iconBase: "/game-previews/ludo",
  }),
  tictactoe: Object.freeze({
    title: "Join my Tic-Tac-Toe game | ES TEAMS TV",
    description: "You have been invited to play Tic-Tac-Toe. No account needed, just pick a name and play.",
    image: "/game-previews/tictactoe/og.png",
    iconBase: "/game-previews/tictactoe",
  }),
  whot: Object.freeze({
    title: "Join my Whot game | ES TEAMS TV",
    description: "You have been invited to play Whot. No account needed, just pick a name and play.",
    image: "/game-previews/whot/og.png",
    iconBase: "/game-previews/whot",
  }),
  snakes: Object.freeze({
    title: "Join my Snakes and Ladders game | ES TEAMS TV",
    description: "You have been invited to play Snakes and Ladders. No account needed, just pick a name and play.",
    image: "/game-previews/snakes/og.png",
    iconBase: "/game-previews/snakes",
  }),
});

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function gameGuestPath(game, token) {
  if (!Object.hasOwn(GAME_GUEST_PREVIEWS, game)) throw new Error("Unknown guest game");
  const safeToken = String(token || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
  return `/${game}/guest/${safeToken}`;
}

export function gameGuestManifest(game) {
  const preview = GAME_GUEST_PREVIEWS[game];
  if (!preview) throw new Error("Unknown guest game");
  return {
    ...WEB_MANIFEST,
    icons: [
      { src: `${preview.iconBase}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${preview.iconBase}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${preview.iconBase}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export function retargetGameGuestHead(html, game, token, origin = siteOrigin()) {
  const preview = GAME_GUEST_PREVIEWS[game];
  if (!preview) throw new Error("Unknown guest game");
  const path = gameGuestPath(game, token);
  const base = String(origin).replace(/\/+$/, "");
  const url = base + path;
  const image = base + preview.image;
  const icon = preview.iconBase;
  const esc = escapeAttr;

  return String(html)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(preview.title)}</title>`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${esc(url)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${esc(url)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(preview.title)}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(preview.title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(preview.description)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(preview.description)}">`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(preview.description)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(image)}">`)
    .replace(/<meta property="og:image:type" content="[^"]*">/, '<meta property="og:image:type" content="image/png">')
    .replace(/<meta property="og:image:width" content="[^"]*">/, '<meta property="og:image:width" content="1200">')
    .replace(/<meta property="og:image:height" content="[^"]*">/, '<meta property="og:image:height" content="630">')
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="ES TEAMS TV ${esc(preview.title.split("|")[0].trim())}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${esc(image)}">`)
    .replace(/<link rel="icon" href="\/favicon\.svg"[^>]*>/, `<link rel="icon" href="${icon}/favicon.ico" sizes="16x16 32x32 48x48">`)
    .replace(/<link rel="icon" href="\/favicon\.ico"[^>]*>/, `<link rel="icon" type="image/png" href="${icon}/icon-32.png" sizes="32x32">`)
    .replace(/<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"[^>]*>/, `<link rel="apple-touch-icon" sizes="180x180" href="${icon}/apple-touch-icon.png">`)
    .replace(/<link rel="manifest" href="\/site\.webmanifest">/, `<link rel="icon" type="image/png" href="${icon}/icon-192.png" sizes="192x192">\n<link rel="manifest" href="${icon}/manifest.webmanifest">`);
}
