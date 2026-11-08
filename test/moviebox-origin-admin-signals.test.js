import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { registerMovieRoutes } from "../routes/movies.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("Stream Moviebox calls identify the site and support the private shared key", () => {
  const client = read("../services/moviebox.js");
  assert.match(client, /MOVIEBOX_SITE_ORIGIN = "https:\/\/esteamstv\.devs\.surf"/);
  assert.match(client, /process\.env\.MOVIEBOX_API_KEY/);
  assert.match(client, /headers: movieboxHeaders\("application\/json"\)/);
  assert.match(client, /const headers = movieboxHeaders\("video\/mp4"\)/);
});

test("Stream movie API rejects off-site origins and accepts same-origin browser GETs", () => {
  const routes = new Map();
  class Limiter { middleware() { return (_req, _res, next) => next(); } }
  const pass = (_req, _res, next) => next();
  const router = {
    get(path, ...handlers) { routes.set(path, handlers); },
    post(path, ...handlers) { routes.set(path, handlers); },
    delete(path, ...handlers) { routes.set(path, handlers); },
  };
  registerMovieRoutes(router, { requireAuth: pass, requireSiteOrigin: pass, SimpleRateLimiter: Limiter });
  const guard = routes.get("/api/movies/home")[1];
  function invoke(headers) {
    let allowed = false, status = 200;
    const req = { get: (name) => headers[name.toLowerCase()] };
    const res = { status(code) { status = code; return res; }, json() { return res; } };
    guard(req, res, () => { allowed = true; });
    return { allowed, status };
  }
  assert.deepEqual(invoke({ origin: "https://attacker.example" }), { allowed: false, status: 403 });
  assert.deepEqual(invoke({}), { allowed: false, status: 403 });
  assert.deepEqual(invoke({ origin: "https://esteamstv.devs.surf" }), { allowed: true, status: 200 });
  assert.deepEqual(invoke({ host: "esteamstv.devs.surf", referer: "https://esteamstv.devs.surf/movies", "sec-fetch-site": "same-origin" }), { allowed: true, status: 200 });
  assert.deepEqual(invoke({ host: "esteamstv.devs.surf", "sec-fetch-site": "same-origin" }), { allowed: true, status: 200 });
});

test("movie search keeps a full-title search action available when suggestions are empty or unavailable", () => {
  const page = read("../public/movies/movies.js");
  assert.match(page, /function showSearchFallback\(q\)[\s\S]*?Search all titles for/);
  assert.match(page, /if \(!suggestions\.length\) \{ showSearchFallback\(q\); return; \}/);
  assert.match(page, /if \(n !== sugToken \|\| els\.input\.value\.trim\(\) !== q\) return;\s*showSearchFallback\(q\);/);
});

test("weekly activity signals display in a bounded three-column scroll area", () => {
  const admin = read("../views/admin.js");
  assert.match(admin, /id="weeklyActivitySignalList" class="weekly-signal-list"/);
  assert.match(admin, /\.weekly-signal-list\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*max-height:252px[^}]*overflow-y:auto/);
  assert.match(admin, /@media\(max-width:720px\)\{\.weekly-signal-list\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("admin dashboard gains responsive navigation without removing existing cards or bindings", () => {
  const admin = read("../views/admin.js");
  assert.match(admin, /<div class="ad-dashboard">[\s\S]*?<nav class="ad-sidebar" aria-label="Admin sections">[\s\S]*?<main class="ad-dashboard-main">[\s\S]*?<div class="ad-wrap">/);
  for (const [id, label] of [["adminOverview", "Overview"], ["adminPlatform", "Platform"], ["adminFinance", "Finance &amp; Rewards"], ["adminModeration", "Users &amp; Moderation"], ["adminBots", "Bot Deployments"]]) {
    assert.match(admin, new RegExp(`href="#${id}"`));
    if (id !== "adminOverview") assert.match(admin, new RegExp(`id="${id}">${label}<`));
  }
  const existingCards = ["maintenanceCard", "coinsCard", "fakeCoinsCard", "weeklyActivityReviewCard", "pageLocksCard", "pushCard", "bonusCard", "tpCodeCard", "withdrawalsCard", "cryptoDepositsCard", "faceIdsCard", "giveawayCard", "deviceBansCard", "crlogCard", "csCard", "adsCard", "promoReviewsCard", "usersCard", "bannedCard", "verifyCard", "botsCard", "storageCard", "dbUsageCard"];
  for (const id of existingCards) assert.equal((admin.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `${id} remains exactly once`);
  for (const id of ["adBackBtn", "weeklyActivitySignalList", "userSearchInput", "adsSearch", "dbUsageOverlay"]) assert.match(admin, new RegExp(`id="${id}"`));
  assert.match(admin, /@media\(max-width:620px\)/);
  assert.match(admin, /\.ad-wrap\{grid-template-columns:minmax\(0,1fr\)/);
});

test("site-wide liquid glass refinements use theme-aware, page-specific surfaces", () => {
  const shared = read("../config/site.js");
  assert.match(shared, /--es-glass-sheen/);
  assert.match(shared, /:root\[data-theme="light"\]\{\s*--es-glass-sheen/);
  for (const selector of [".hm-feed-card.hm-glass", ".acc-card", ".mv-state", ".tool-card", ".cx-card", ".cr-card", ".auth-card"]) {
    assert.ok(shared.includes(selector), `${selector} receives the shared finish`);
  }
  const start = shared.indexOf("/* Site-wide liquid-glass finish");
  const end = shared.indexOf("</style>`", start);
  const glassRules = shared.slice(start, end);
  assert.doesNotMatch(glassRules, /\.cx-board\s*,|\.cx-sq\s*,|\.mv-card\s*,|\.music-player\s*,|(?:^|[ ,])input\s*,|(?:^|[ ,])textarea\s*,/);
  const overlayCss = shared.slice(shared.indexOf("const GLASS_OVERLAY_CSS"), start);
  assert.match(overlayCss, /background:rgba\(7,10,18,\.18\)!important/);
  assert.match(overlayCss, /backdrop-filter:blur\(2px\)!important/);
  assert.match(overlayCss, /backdrop-filter:none!important/);
  const blurFilters = overlayCss.match(/(?:-webkit-)?backdrop-filter:[^;]*blur\([^)]*\)[^;]*/g) || [];
  assert.ok(blurFilters.length > 0);
  assert.ok(blurFilters.every((filter) => filter.includes("blur(2px)")));
  assert.match(overlayCss, /transparent!important/);
  assert.match(glassRules, /--es-glass-fill:transparent/);
  assert.match(glassRules, /\.nav,\.hm-nav,\.mv-nav,\.acc-nav[\s\S]*?background-color:transparent!important/);
  assert.doesNotMatch(glassRules, /backdrop-filter:blur\(/);
  assert.match(glassRules, /Buttons and form fields intentionally retain their original visual styles/);
  assert.doesNotMatch(glassRules, /(?:^|\n)button\s*,|(?:^|\n)input\s*\{/);
  assert.match(glassRules, /prefers-reduced-transparency:reduce/);
});
