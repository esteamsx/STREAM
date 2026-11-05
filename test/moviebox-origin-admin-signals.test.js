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
