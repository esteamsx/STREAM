import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { registerTttRoutes } from "../routes/tictactoe.js";
import { renderTtt } from "../views/tictactoe.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const site = read("config/site.js");
const server = read("server.js");
const menu = read("public/site-ui.js");
const presence = read("public/chess-presence.js");
const promo = read("middleware/promo-slot.js");
const nativeBanner = read("public/native-banner.js");
const popunder = read("public/popunder.js");
const sponsor = read("public/sponsor.js");
const routes = read("routes/tictactoe.js");
const hub = read("services/ttt-mp.js");
const client = read("public/tictactoe/ttt-page.js");
const view = read("views/tictactoe.js");

test("the renderer and route registrar initialize with the shared site/game services", () => {
  const html = renderTtt({ devToolsBlock: "", protectionCSS: "" });
  assert.match(html, /<title>Tic-Tac-Toe \| ES TEAMS TV<\/title>/);
  assert.match(html, /src="\/tictactoe\/ttt-page\.js"/);
  const registered = [];
  const router = {
    get(path, ...handlers) { registered.push({ method: "GET", path, handlers }); },
    post(path, ...handlers) { registered.push({ method: "POST", path, handlers }); },
  };
  const requireAuth = () => {};
  const requireSiteOrigin = () => {};
  class SimpleRateLimiter { middleware() { return () => {}; } }
  const chessHub = {
    onConnect() {},
    isOnline() { return false; },
    isPresent() { return false; },
    profileOf(uid) { return { uid, username: uid, name: uid, photo: null }; },
    online() { return []; },
    annotate(players) { return players; },
    iceServers() { return []; },
  };
  registerTttRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile: async () => null, searchUsersByUsername: async () => [], chessHub });
  const challenge = registered.find((r) => r.method === "POST" && r.path === "/api/tictactoe/challenge");
  const move = registered.find((r) => r.method === "POST" && r.path === "/api/tictactoe/game/:id/move");
  const guestMove = registered.find((r) => r.method === "POST" && r.path === "/api/tictactoe/guest/game/:id/move");
  assert.ok(challenge && challenge.handlers.includes(requireAuth) && challenge.handlers.includes(requireSiteOrigin));
  assert.ok(move && move.handlers.includes(requireAuth) && move.handlers.includes(requireSiteOrigin));
  assert.ok(guestMove && guestMove.handlers.includes(requireSiteOrigin));
  assert.ok(registered.some((r) => r.method === "POST" && r.path === "/api/tictactoe/guest/links"));
  assert.ok(registered.some((r) => r.method === "POST" && r.path === "/api/tictactoe/spectate"));
});

test("Tic-Tac-Toe is registered after the existing games without replacing shared server behavior", () => {
  assert.match(site, /tictactoe:\s*\{\s*path: "\/tictactoe"/);
  assert.match(site, /export const ASSET_VERSION/);
  assert.match(server, /import \{ registerTttRoutes \} from "\.\/routes\/tictactoe\.js"/);
  assert.match(server, /registerTttRoutes\(tttRouter, \{ requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, searchUsersByUsername, chessHub \}\)/);
  assert.match(server, /import \{ renderTtt \} from "\.\/views\/tictactoe\.js"/);
  assert.match(server, /"ttt-page\.js", "ttt\.css"/);
  assert.match(server, /app\.get\("\/tictactoe", scrapeGate, requireUser/);
  assert.match(server, /"\/tictactoe\/guest\/:token"/);
  assert.match(server, /creditCompetitiveGameWin, chessHub/);
  assert.match(server, /\/snakes\/guest\/:token/);
  assert.match(server, /\/whot\/guest\/:token/);
  assert.match(server, /\/api\/verify-banner-state/);
});

test("Tic-Tac-Toe menu item follows Whot and Snakes, and cross-page challenges route correctly", () => {
  const games = menu.slice(menu.indexOf('section("Games")'), menu.indexOf('section("Build")'));
  assert.ok(games.indexOf('href: "/whot"') < games.indexOf('href: "/snakes"'));
  assert.ok(games.indexOf('href: "/snakes"') < games.indexOf('href: "/tictactoe"'));
  assert.ok(presence.includes('var onTtt = /^\\/tictactoe(\\/|$)/.test(location.pathname);'));
  for (const event of ["ttt_hello", "ttt_challenge", "ttt_challenge_update", "ttt_game_start"]) assert.ok(presence.includes('"' + event + '"'));
  assert.match(presence, /post\("\/api\/" \+ game \+ "\/challenge\/" \+ encodeURIComponent\(c\.id\) \+ "\/respond"/);
  assert.match(routes, /router\.post\("\/api\/tictactoe\/challenge\/:id\/respond"/);
});

test("Tic-Tac-Toe guest and active sessions suppress ads without changing native-banner routing", () => {
  assert.match(promo, /"\/snakes",\s*"\/tictactoe"/);
  assert.match(promo, /const SKIP_PATHS = \[[\s\S]*?"\/tictactoe\/guest"[\s\S]*?\];/);
  assert.match(promo, /const SOCIAL_SKIP_PATHS = \[[\s\S]*?"\/tictactoe"[\s\S]*?\];/);
  assert.doesNotMatch(nativeBanner, /tictactoe/);
  assert.match(popunder, /\^\\\/tictactoe\(\\\/\|\$\)/);
  assert.match(client, /setTttGameAdState\(true\)/);
  assert.match(client, /setTttGameAdState\(false\)/);
  assert.match(sponsor, /es-game-session-change/);
  assert.match(sponsor, /tttGameActive\(\)/);
});

test("online Tic-Tac-Toe is authenticated, server-authoritative, two-player, and reconnect-safe", () => {
  assert.match(routes, /router\.post\("\/api\/tictactoe\/challenge", requireAuth, requireSiteOrigin/);
  assert.match(routes, /gameRoutes\("\/api\/tictactoe", \(req\) => req\.uid/);
  assert.match(routes, /gameRoutes\("\/api\/tictactoe\/guest", \(req\) => req\.guest\.uid/);
  assert.match(routes, /function readGuest\(req, token = req\.query && req\.query\.invite\)/);
  assert.match(routes, /guestCookieName\(l\.token\)/);
  assert.match(client, /path\.startsWith\(BASE \+ "\/guest\/"\)[\s\S]*invite=/);
  assert.match(client, /BASE \+ "\/guest\/stream\?invite="/);
  assert.match(hub, /Online Tic-Tac-Toe for exactly 2 players/);
  assert.match(hub, /players: entries\.map/);
  assert.match(hub, /crypto\.timingSafeEqual/);
  assert.match(hub, /pauseTurnClock\(game, p\)/);
  assert.match(hub, /resumeTurnClock\(g, p, false\)/);
  assert.match(hub, /const DISCONNECT_FORFEIT_MS = 3 \* 60 \* 1000/);
});

test("Tic-Tac-Toe reuses common themes, Chess sound, shared voice, and result/challenge cues", () => {
  assert.match(view, /siteHeadFor\("tictactoe"\)/);
  assert.match(view, /\/chess\/chess\.css/);
  assert.match(client, /from "\/chess\/chess-sound\.js"/);
  assert.match(client, /createVoice\(/);
  assert.match(client, /function playGameStartPing\(gameId\)/);
  assert.match(client, /on\("ttt_challenge", \(c\) => \{ playPing\(\)/);
  assert.match(client, /on\("ttt_game_start", \(v\) => \{[^}]*playGameStartPing\(v\.id\)/);
  const finish = client.match(/function finishGame\([\s\S]*?\n\}/);
  assert.ok(finish, "game completion handler exists");
  assert.match(finish[0], /voice\.stop\(\)/);
  assert.match(client, /sound\.lose\(\)/);
  assert.match(client, /sound\.win\(\)/);
  assert.match(client, /sound\.draw\(\)/);
  assert.match(client, /sound\.move\(\)/);
});

test("expired Tic-Tac-Toe guest links offer CREATE GAME with the external-link icon", () => {
  const icon = client.match(/const GUEST_CREATE_GAME_ICON = '[^']+';/);
  const ended = client.match(/function guestEndedCard\(title, text\) \{[\s\S]*?\n\}/);
  assert.ok(icon, "the Chess-style external-link icon is defined");
  assert.ok(ended, "the guest ended/expired card exists");
  assert.doesNotMatch(ended[0], /GO TO ES TEAMS TV/);

  const calls = { busy: 0, href: "" };
  const context = {
    h(tag, attrs, kids) { return { tag, attrs, kids, innerHTML: "" }; },
    busy() { calls.busy++; },
    location: { set href(value) { calls.href = value; }, get href() { return calls.href; } },
  };
  vm.runInNewContext(`${icon[0]}\n${ended[0]}\nthis.icon = GUEST_CREATE_GAME_ICON; this.card = guestEndedCard("Game Link Expired", "Expired.");`, context);
  const button = context.card.kids[2];
  assert.equal(button.attrs.style, "text-decoration:none");
  assert.equal(button.innerHTML, 'CREATE GAME <span class="ico" aria-hidden="true">' + context.icon + "</span>");
  button.attrs.onclick({ currentTarget: button });
  assert.equal(calls.busy, 1);
  assert.equal(calls.href, "/tictactoe");
});
