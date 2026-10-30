import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import { Writable } from "node:stream";
import { getStatus, getHome, getCatalog, getSearch, getSuggest, getDetail, getStreams, proxyStream, normalizeItem, normalizeDetail, apiBase, resetCache, MovieError } from "../services/moviebox.js";
import { registerMovieRoutes } from "../routes/movies.js";
import { VERIFICATION_PRICE_NGN, VERIFICATION_ROLLOVER_PRICE_NGN } from "../services/paystack.js";
import { injectPromoSlot } from "../middleware/promo-slot.js";

/* a stand-in for the Moviebox-API that answers in the shapes its README documents */
const img = (n) => "https://img.example.test/" + n + ".jpg";
const mk = (n, extra = {}) => ({ name: "Title " + n, poster_url: img(n), slug: "title-" + n + "-abc" + n, subject_id: "100" + n, badge: null, rating: "7." + (n % 10), year: String(2000 + (n % 25)), ...extra });
const many = (from, count) => Array.from({ length: count }, (_, i) => mk(from + i));
const state = { calls: [], fail: {}, delay: 0, lastProxyRange: null };
const HOME = () => ({
  status: "success",
  sections: [
    { section: "Banner", count: 3, items: [mk(1, { badge: "TOP" }), mk(2), mk(3, { poster_url: "http://insecure.test/x.jpg" })] },
    { section: "Weekend Picks", count: 5, items: many(10, 5) },
    { section: "Action", count: 5, items: many(20, 5) },
    { section: "Trending Now", count: 5, items: [...many(30, 4), mk(30), { name: "No link", poster_url: img(99) }, null, 7] },
    { section: "Tiny", count: 2, items: many(40, 2) },
  ],
});
const DETAIL = {
  data: {
    subject: { subjectId: "6207982430134357800", subjectType: 2, title: "Breaking Bad", description: "A chemistry teacher turns to crime.", releaseDate: "2008-01-20", genre: "Crime, Drama, Thriller", imdbRatingValue: "9.5", countryName: "United States", duration: 2880, cover: { url: img("bb") } },
    stars: [{ name: "Bryan Cranston", character: "Walter White", avatarUrl: img("bc") }, { name: "" }],
    resource: { seasons: [{ se: 1, maxEp: 7 }, { se: 2, maxEp: 13 }, { se: 3, maxEp: 0 }] },
    stills: [{ url: img("still") }],
  },
};
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  state.calls.push(u.pathname + (u.search || ""));
  const send = (status, body) => setTimeout(() => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(typeof body === "string" ? body : JSON.stringify(body)); }, state.delay);
  if (state.fail[u.pathname]) return send(state.fail[u.pathname].status || 500, state.fail[u.pathname].body || "{}");
  if (u.pathname === "/home") return send(200, HOME());
  if (["/movies", "/tv-series", "/animation"].includes(u.pathname)) {
    const page = Number(u.searchParams.get("page") || 1);
    return send(200, { page, per_page: 24, total: 100, items: many(1000 * page + (u.pathname.length * 10), 24) });
  }
  if (u.pathname === "/search") return send(200, { query: u.searchParams.get("q"), page: 1, total: 3, items: many(70, 3) });
  if (u.pathname === "/search/suggest") return send(200, { suggestions: [...Array.from({ length: 10 }, (_, i) => ({ title: "Match " + i, slug: "match-" + i + "-xx", subject_id: "9" + i })), { title: "Bad", slug: "../etc/passwd" }] });
  if (u.pathname === "/api/stream/6207982430134357800/proxy") {
    const body = Buffer.from("000000206674797069736f6d", "hex");
    const range = req.headers.range || "";
    state.lastProxyRange = range || null;
    const match = /^bytes=(\d+)-(\d*)$/i.exec(range);
    if (match) {
      const start = Number(match[1]), end = Math.min(Number(match[2] || body.length - 1), body.length - 1);
      const partial = body.subarray(start, end + 1);
      res.writeHead(206, { "Content-Type": "video/mp4", "Content-Length": partial.length, "Content-Range": `bytes ${start}-${end}/${body.length}`, "Accept-Ranges": "bytes" });
      return res.end(partial);
    }
    res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": body.length, "Accept-Ranges": "bytes" });
    return res.end(body);
  }
  if (u.pathname === "/api/stream/6207982430134357800") return send(200, { has_resource: true, sources: [{ resolution: "1080p", format: "MP4", url: "https://cdn.example.test/breaking-bad.mp4", size: "2414667149", duration: 2880 }, { resolution: "720p", format: "MP4", url: "http://insecure.example.test/bad.mp4" }, { resolution: "HLS", format: "m3u8", url: "https://cdn.example.test/bad.m3u8" }] });
  if (u.pathname.startsWith("/detail/")) { const slug = decodeURIComponent(u.pathname.slice(8)); return slug === "missing-one" ? send(404, { detail: "nope" }) : slug === "empty-one" ? send(200, { data: {} }) : send(200, DETAIL); }
  send(404, {});
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_BASE = "http://127.0.0.1:" + server.address().port;
const reset = () => { resetCache(); state.calls = []; state.fail = {}; state.delay = 0; state.lastProxyRange = null; process.env.MOVIEBOX_API_URL = URL_BASE; };
test.after(() => server.close());

test("with no API address set, everything says so and nothing is called", async () => {
  delete process.env.MOVIEBOX_API_URL; resetCache(); state.calls = [];
  assert.deepEqual(getStatus(), { configured: false });
  for (const call of [() => getHome(), () => getCatalog("movies", 1), () => getSearch("a"), () => getSuggest("a"), () => getDetail("some-title-ab")]) {
    await assert.rejects(call, (e) => e instanceof MovieError && e.status === 503 && e.code === "not_configured");
  }
  assert.equal(state.calls.length, 0);
});

test("the API address is cleaned up, and anything that is not an http(s) address is refused", () => {
  process.env.MOVIEBOX_API_URL = "https://movies.example.com/";
  assert.equal(apiBase(), "https://movies.example.com");
  process.env.MOVIEBOX_API_URL = "http://localhost:8000//";
  assert.equal(apiBase(), "http://localhost:8000");
  process.env.MOVIEBOX_API_URL = "https://host.example.com/prefix/";
  assert.equal(apiBase(), "https://host.example.com/prefix");
  for (const bad of ["ftp://x.test", "javascript:alert(1)", "not a url", "  "]) { process.env.MOVIEBOX_API_URL = bad; assert.equal(apiBase(), null, bad); }
  reset();
  assert.deepEqual(getStatus(), { configured: true });
});

test("home: banner from the Banner section, rows in a sensible order, then the catalog rows", async () => {
  reset();
  const home = await getHome();
  assert.deepEqual(home.banner.map((b) => b.title), ["Title 1", "Title 2"], "the banner with an insecure poster is dropped");
  assert.equal(home.banner[0].badge, "TOP");
  assert.deepEqual(home.rows.map((r) => r.title), ["Trending Now", "Action", "Weekend Picks", "Movies", "TV Series", "Animation"]);
  assert.equal(home.rows.find((r) => r.title === "Tiny"), undefined, "rows with fewer than 3 titles are not shown");
  assert.deepEqual(home.rows.filter((r) => r.kind).map((r) => r.kind), ["movies", "tv-series", "animation"]);
  const trending = home.rows[0].items;
  assert.equal(trending.length, 4, "duplicates, junk and items with no link are removed");
  assert.ok(trending.every((i) => i.slug && i.title && i.poster.startsWith("https://")));
  assert.deepEqual(Object.keys(home.banner[0]).sort(), ["badge", "id", "poster", "rating", "slug", "title", "year"]);
  assert.equal(home.banner[0].rating, 7.1);
  assert.equal(typeof home.banner[0].year, "string");
});

test("home still works if one part of the API is down, and only fails if all of it is", async () => {
  reset(); state.fail["/home"] = { status: 500 };
  const partial = await getHome();
  assert.ok(partial.banner.length > 0 && partial.rows.map((r) => r.title).join() === "Movies,TV Series,Animation");
  reset(); state.fail["/tv-series"] = { status: 500 };
  assert.equal((await getHome()).rows.some((r) => r.title === "TV Series"), false);
  reset(); for (const p of ["/home", "/movies", "/tv-series", "/animation"]) state.fail[p] = { status: 500 };
  await assert.rejects(getHome(), (e) => e.code === "upstream" && e.status === 502);
});

test("results are cached, a burst of the same request makes one call, and an old result stands in while the API is down", async () => {
  reset();
  await getHome(); const first = state.calls.length;
  await getHome(); assert.equal(state.calls.length, first, "second read comes from the cache");
  reset(); state.delay = 40;
  await Promise.all([1, 2, 3, 4, 5].map(() => getSearch("matrix")));
  assert.equal(state.calls.filter((c) => c.startsWith("/search?")).length, 1);
  reset();
  const realNow = Date.now;
  await getSearch("dune");
  Date.now = () => realNow() + 4 * 60 * 1000;               // past the 3 minute search cache
  state.fail["/search"] = { status: 500 };
  try {
    const stale = await getSearch("dune");
    assert.equal(stale.items.length, 3, "served the old copy instead of an error");
    Date.now = () => realNow() + 2 * 60 * 60 * 1000;        // far too old to trust
    await assert.rejects(getSearch("dune"), (e) => e.code === "upstream");
  } finally { Date.now = realNow; }
});

test("catalogs: paging, sort and unknown categories", async () => {
  reset();
  const a = await getCatalog("movies", "2", "NEWEST");
  assert.equal(a.page, 2); assert.equal(a.kind, "movies"); assert.equal(a.title, "Movies"); assert.equal(a.items.length, 24); assert.equal(a.hasMore, true);
  assert.ok(state.calls.includes("/movies?page=2&sort=NEWEST"));
  state.calls = [];
  await getCatalog("tv-series", "-5", "DROP TABLE");
  assert.ok(state.calls.includes("/tv-series?page=1&sort=RECOMMEND"), "page and sort are clamped to safe values");
  const last = await getCatalog("animation", 99999, "RATING");
  assert.equal(last.page, 50);
  await assert.rejects(getCatalog("../admin", 1), (e) => e.status === 400);
  await assert.rejects(getCatalog("constructor", 1), (e) => e.status === 400);
});

test("search and suggestions", async () => {
  reset();
  const r = await getSearch("  matrix  ", "1");
  assert.equal(r.query, "matrix"); assert.equal(r.items.length, 3); assert.equal(r.total, 3); assert.equal(r.hasMore, false);
  assert.ok(state.calls.includes("/search?q=matrix&page=1"));
  await assert.rejects(getSearch("   "), (e) => e.status === 400);
  await getSearch("x".repeat(500));
  assert.ok(state.calls.some((c) => c.startsWith("/search?q=" + "x".repeat(60) + "&")), "queries are cut to 60 characters");
  const s = await getSuggest("mat");
  assert.equal(s.suggestions.length, 8, "at most 8");
  assert.ok(s.suggestions.every((x) => /^match-/.test(x.slug)), "a suggestion with a bad link is dropped");
  assert.deepEqual(await getSuggest("  "), { suggestions: [] });
});

test("detail: the parts that are recognised are kept and tidied", async () => {
  reset();
  const d = await getDetail("breaking-bad-ej6Bp0MCAo7");
  assert.equal(d.title, "Breaking Bad");
  assert.equal(d.year, "2008"); assert.equal(d.rating, 9.5); assert.equal(d.kind, "tv"); assert.equal(d.minutes, 48);
  assert.deepEqual(d.genres, ["Crime", "Drama", "Thriller"]);
  assert.deepEqual(d.seasons, [{ season: 1, episodes: 7 }, { season: 2, episodes: 13 }]);
  assert.deepEqual(d.cast, [{ name: "Bryan Cranston", role: "Walter White", photo: img("bc") }]);
  assert.equal(d.poster, img("bb")); assert.equal(d.backdrop, img("still")); assert.equal(d.country, "United States");
  assert.ok(!("raw" in d));
});

test("detail copes with a different layout, missing data and unknown titles", () => {
  const d = normalizeDetail({ title: "Plain Movie", overview: "Short.", year: 2019, genres: ["Action", { name: "Comedy" }], rating: 6.4, poster: img("p") }, "plain-movie-xx");
  assert.deepEqual([d.title, d.description, d.year, d.rating, d.kind], ["Plain Movie", "Short.", "2019", 6.4, "movie"]);
  assert.deepEqual(d.genres, ["Action", "Comedy"]);
  assert.deepEqual([d.seasons, d.cast, d.backdrop, d.minutes], [[], [], null, null]);
  assert.throws(() => normalizeDetail({ data: {} }, "x-y"), (e) => e.status === 404);
  assert.throws(() => normalizeDetail(null, "x-y"), (e) => e.status === 404);
});

test("detail rejects odd links before anything is called, and passes real errors through", async () => {
  reset();
  for (const bad of ["../../etc/passwd", "a/b", "a b", "x", "<script>", "a".repeat(200), "title?x=1", "..%2f"]) {
    await assert.rejects(getDetail(bad), (e) => e.status === 400, bad);
  }
  assert.equal(state.calls.length, 0);
  await assert.rejects(getDetail("missing-one"), (e) => e.status === 404 && e.code === "not_found");
  await assert.rejects(getDetail("empty-one"), (e) => e.status === 404);
});

test("streams expose only explicit HTTPS MP4 sources and reject unsafe references", async () => {
  reset();
  const streams = await getStreams("6207982430134357800", "breaking-bad-ej6Bp0MCAo7");
  assert.equal(streams.hasResource, true);
  assert.deepEqual(streams.sources.map((x) => [x.resolution, x.format, x.url, x.size]), [["1080p", "MP4", "https://cdn.example.test/breaking-bad.mp4", 2414667149]]);
  await assert.rejects(getStreams("../../x", "breaking-bad-ej6Bp0MCAo7"), (e) => e.status === 400);
  await assert.rejects(getStreams("6207982430134357800", "../x"), (e) => e.status === 400);
});

test("download proxy forwards safe byte ranges and preserves partial MP4 responses", async () => {
  reset();
  const response = await proxyStream("6207982430134357800", "breaking-bad-ej6Bp0MCAo7", 1, 1, "360", "bytes=0-7");
  assert.equal(state.lastProxyRange, "bytes=0-7");
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("content-range"), "bytes 0-7/12");
  assert.equal((await response.arrayBuffer()).byteLength, 8);
  await assert.rejects(
    proxyStream("6207982430134357800", "breaking-bad-ej6Bp0MCAo7", 1, 1, "360", "bytes=0-7\r\nX-Injected: yes"),
    (e) => e instanceof MovieError && e.status === 400
  );
  assert.equal(state.calls.filter((x) => x.includes("/proxy")).length, 1, "invalid ranges are rejected before making an API request");
});

test("a broken or unreachable API becomes a clean 502", async () => {
  reset(); state.fail["/search"] = { status: 200, body: "<html>nope</html>" };
  await assert.rejects(getSearch("q"), (e) => e.status === 502 && e.code === "upstream");
  reset(); state.fail["/search"] = { status: 503 };
  await assert.rejects(getSearch("q2"), (e) => e.status === 502);
  resetCache(); process.env.MOVIEBOX_API_URL = "http://127.0.0.1:1";
  await assert.rejects(getSearch("q3"), (e) => e.status === 502 && /Could not reach/.test(e.message));
  reset();
});

test("items are tidied: only https posters, no junk, ratings and years made sensible", () => {
  assert.equal(normalizeItem(null), null);
  assert.equal(normalizeItem({ name: "No id or slug" }), null);
  assert.equal(normalizeItem({ slug: "has-slug-1" }), null, "no title");
  const a = normalizeItem({ name: "X", slug: "x-slug-1", poster_url: "javascript:alert(1)", rating: "11", year: "abcd" });
  assert.deepEqual([a.poster, a.rating, a.year], [null, null, null]);
  const b = normalizeItem({ title: "Y", subject_id: 5, cover: { url: "https://c.test/y.jpg" }, imdbRatingValue: "8.26", releaseDate: "2021-05-04" });
  assert.deepEqual([b.id, b.slug, b.poster, b.rating, b.year], ["5", "", "https://c.test/y.jpg", 8.3, "2021"]);
  assert.equal(normalizeItem({ name: "Z", slug: "bad slug/..", subject_id: "9" }).slug, "", "an unsafe link is never passed on");
});

test("the routes hand the right data and status codes to the page", async () => {
  reset();
  const handlers = {};
  const router = { get: (path, ...fns) => { handlers[path] = fns[fns.length - 1]; }, post: () => {}, delete: () => {} };
  class Limiter { middleware() { return (q, s, n) => n(); } }
  registerMovieRoutes(router, { requireAuth: (q, s, n) => n(), requireSiteOrigin: (q, s, n) => n(), SimpleRateLimiter: Limiter, listMovieWatchLater: async () => [], getMovieWatchLater: async () => false, saveMovieWatchLater: async () => ({}), removeMovieWatchLater: async () => {} });
  const call = async (path, { params = {}, query = {} } = {}) => {
    const out = { status: 200, body: null, headers: {} };
    const res = { set(k, v) { out.headers[k] = v; return res; }, status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    await handlers[path]({ params, query, uid: "u1" }, res);
    await new Promise((r) => setTimeout(r, 5));
    return out;
  };
  assert.deepEqual((await call("/api/movies/status")).body, { configured: true });
  const home = await call("/api/movies/home");
  assert.equal(home.status, 200); assert.ok(home.body.banner.length && home.body.rows.length);
  assert.equal((await call("/api/movies/catalog/:kind", { params: { kind: "movies" }, query: { page: "1" } })).body.items.length, 24);
  assert.equal((await call("/api/movies/catalog/:kind", { params: { kind: "nope" } })).status, 400);
  assert.equal((await call("/api/movies/search", { query: { q: "dune" } })).body.items.length, 3);
  assert.equal((await call("/api/movies/search", { query: {} })).status, 400);
  assert.equal((await call("/api/movies/suggest", { query: { q: "ma" } })).body.suggestions.length, 8);
  assert.equal((await call("/api/movies/detail/:slug", { params: { slug: "breaking-bad-ej6Bp0MCAo7" } })).body.title, "Breaking Bad");
  const streams = await call("/api/movies/streams/:subjectId", { params: { subjectId: "6207982430134357800" }, query: { slug: "breaking-bad-ej6Bp0MCAo7" } });
  assert.equal(streams.status, 200); assert.equal(streams.body.sources.length, 1);
  assert.equal((await call("/api/movies/detail/:slug", { params: { slug: "missing-one" } })).status, 404);
  assert.equal((await call("/api/movies/detail/:slug", { params: { slug: "../../x" } })).status, 400);
  delete process.env.MOVIEBOX_API_URL; resetCache();
  const off = await call("/api/movies/home");
  assert.equal(off.status, 503); assert.equal(off.body.code, "not_configured");
  assert.deepEqual((await call("/api/movies/status")).body, { configured: false });
  reset();
});

test("the shared bottom navigation script is added to the movies pages, like the other pages that have it", () => {
  const run = (path) => {
    let sent = null;
    const req = { method: "GET", path };
    const res = { statusCode: 200, locals: {}, getHeader: () => "text/html", send(b) { sent = b; return this; } };
    injectPromoSlot(req, res, () => {});
    res.send("<html><head></head><body>hi</body></html>");
    return sent;
  };
  for (const p of ["/movies", "/movies/title/breaking-bad-ej6Bp0MCAo7"]) assert.match(run(p), /\/site-ui\.js/, p);
  assert.doesNotMatch(run("/chess") || "", /\/site-ui\.js/, "games keep their own full-screen layout");
});

test("signed-in free accounts can browse movie lists without gaining premium downloads", async () => {
  reset();
  const handlers = {};
  const profile = { verified: false, email: "free@example.test" };
  const requireAuth = (req, res, next) => next();
  class Limiter { middleware() { return (req, res, next) => next(); } }
  const router = { get: (path, ...fns) => { handlers[path] = fns; }, post: (path, ...fns) => { handlers[path] = fns; }, delete: (path, ...fns) => { handlers[path] = fns; } };
  registerMovieRoutes(router, {
    requireAuth,
    requireSiteOrigin: (req, res, next) => next(),
    SimpleRateLimiter: Limiter,
    getUserProfile: async () => profile,
    isVerificationActive: (user) => !!user.verified,
    isAdminEmail: () => false,
  });
  const call = async (path, { params = {}, query = {} } = {}) => {
    assert.equal(handlers[path][0], requireAuth, "browsing remains sign-in protected");
    const out = { status: 200, body: null, headers: {} };
    const res = { set(k, v) { out.headers[k] = v; return res; }, status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    await handlers[path].at(-1)({ params, query, uid: "free-user", userProfile: profile }, res);
    return out;
  };
  const home = await call("/api/movies/home");
  assert.equal(home.status, 200);
  assert.ok(home.body.rows.length > 0);
  const catalog = await call("/api/movies/catalog/:kind", { params: { kind: "movies" } });
  assert.equal(catalog.status, 200);
  assert.ok(catalog.body.items.length > 0);
  const streams = await call("/api/movies/streams/:subjectId", { params: { subjectId: "6207982430134357800" }, query: { slug: "breaking-bad-ej6Bp0MCAo7" } });
  assert.equal(streams.status, 200);
  assert.equal(streams.body.premium, false);
  assert.equal(streams.body.sources[0].available, false, "non-360p sources remain locked for free accounts");
});

test("Watch Later endpoints save, read and remove entries only for the authenticated account", async () => {
  reset();
  const handlers = {};
  const saved = new Map();
  const profile = { verified: false, email: "free@example.test" };
  const requireAuth = (req, res, next) => next();
  class Limiter { middleware() { return (req, res, next) => next(); } }
  const router = {
    get: (path, ...fns) => { handlers["GET " + path] = fns; },
    post: (path, ...fns) => { handlers["POST " + path] = fns; },
    delete: (path, ...fns) => { handlers["DELETE " + path] = fns; },
  };
  registerMovieRoutes(router, {
    requireAuth, requireSiteOrigin: (req, res, next) => next(), SimpleRateLimiter: Limiter, getUserProfile: async () => profile,
    isVerificationActive: (user) => !!user.verified, isAdminEmail: () => false,
    listMovieWatchLater: async (uid) => Array.from(saved.entries()).filter(([key]) => key.startsWith(uid + ":")).map(([, item]) => item),
    getMovieWatchLater: async (uid, slug) => saved.has(uid + ":" + slug),
    saveMovieWatchLater: async (uid, movie) => { const item = { ...movie, savedAt: 123 }; saved.set(uid + ":" + movie.slug, item); return item; },
    removeMovieWatchLater: async (uid, slug) => { saved.delete(uid + ":" + slug); },
  });
  const call = async (method, path, req = {}) => {
    const fn = handlers[method + " " + path].at(-1);
    const out = { status: 200, body: null, headers: {} };
    const res = { set(k, v) { out.headers[k] = v; return res; }, status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    await fn({ uid: req.uid || "free-user", params: req.params || {}, query: {}, body: req.body || {} }, res);
    return out;
  };
  const movie = { slug: "breaking-bad-ej6Bp0MCAo7", title: "Breaking Bad", kind: "tv" };
  const savedResponse = await call("POST", "/api/movies/watch-later", { body: { movie } });
  assert.equal(savedResponse.body.ok, true);
  assert.equal((await call("GET", "/api/movies/watch-later")).body.items[0].title, "Breaking Bad");
  assert.equal((await call("GET", "/api/movies/watch-later/:slug", { params: { slug: movie.slug } })).body.saved, true);
  assert.equal((await call("GET", "/api/movies/watch-later", { uid: "other-user" })).body.items.length, 0);
  assert.equal((await call("DELETE", "/api/movies/watch-later/:slug", { params: { slug: movie.slug } })).body.ok, true);
  assert.equal((await call("GET", "/api/movies/watch-later/:slug", { params: { slug: movie.slug } })).body.saved, false);
  assert.equal((await call("GET", "/api/movies/watch-later")).headers["Cache-Control"], "no-store");
});

test("download route forwards Range and preserves HTTP 206 for a signed-in free 360p download", async () => {
  reset();
  const handlers = {};
  const profile = { verified: false, email: "free@example.test" };
  class Limiter { middleware() { return (req, res, next) => next(); } }
  const router = { get: (path, ...fns) => { handlers[path] = fns; }, post: (path, ...fns) => { handlers[path] = fns; }, delete: (path, ...fns) => { handlers[path] = fns; } };
  registerMovieRoutes(router, {
    requireAuth: (req, res, next) => next(),
    requireSiteOrigin: (req, res, next) => next(),
    SimpleRateLimiter: Limiter,
    getUserProfile: async () => profile,
    isVerificationActive: (user) => !!user.verified,
    isAdminEmail: () => false,
  });
  const chunks = [];
  const headers = {};
  const res = new Writable({ write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  res.statusCode = 200;
  res.status = (code) => { res.statusCode = code; return res; };
  res.set = (key, value) => { headers[key.toLowerCase()] = value; return res; };
  res.json = (body) => { res.body = body; res.end(); return res; };
  const finished = new Promise((resolve, reject) => { res.once("finish", resolve); res.once("error", reject); });
  await handlers["/api/movies/download/:subjectId"].at(-1)({
    uid: "free-user",
    userProfile: profile,
    params: { subjectId: "6207982430134357800" },
    query: { slug: "breaking-bad-ej6Bp0MCAo7", se: "1", ep: "1", res: "360" },
    headers: { range: "bytes=0-7" },
    get(name) { return this.headers[String(name).toLowerCase()]; },
  }, res);
  await finished;
  assert.equal(state.lastProxyRange, "bytes=0-7");
  assert.equal(res.statusCode, 206);
  assert.equal(headers["content-range"], "bytes 0-7/12");
  assert.equal(Buffer.concat(chunks).length, 8);
});

test("Movies is in the home page menu and in the shared More menu, and opens /movies", async () => {
  const { renderHome } = await import("../views/home.js");
  const html = renderHome({ DOMAIN_LOCK_SCRIPT: "", siteHeadFor: () => "" });
  assert.match(html, /href="\/movies"/, "home side menu");
  assert.match(html, /Movies/);
  const fs = await import("node:fs");
  const ui = fs.readFileSync(new URL("../public/site-ui.js", import.meta.url), "utf8");
  assert.match(ui, /href: "\/movies", label: "Movies"/, "shared More menu");
  assert.ok(!/id="esBottomNav"|bnav-item/.test(fs.readFileSync(new URL("../views/movies.js", import.meta.url), "utf8")), "the Movies page has no navigation bar of its own");
});

test("Movies uses the shared ES Teams favicon and branded social-preview thumbnail", async () => {
  const { renderMovies } = await import("../views/movies.js");
  const { siteHeadFor } = await import("../config/site.js");
  const html = renderMovies({ DOMAIN_LOCK_SCRIPT: "", siteHeadFor });
  assert.match(html, /<link rel="icon" href="\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html, /<link rel="icon" href="\/favicon\.ico" sizes="32x32">/);
  assert.match(html, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/);
  assert.match(html, /<meta property="og:image" content="[^"]*\/og\.png">/);
  assert.match(html, /<meta name="twitter:image" content="[^"]*\/og\.png">/);
});

test("Movies detail pages use icon-only Share and Bookmark controls with canonical sharing and copy fallback", () => {
  const template = fs.readFileSync(new URL("../views/movies.js", import.meta.url), "utf8");
  const frontend = fs.readFileSync(new URL("../public/movies/movies.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../public/movies/movies.css", import.meta.url), "utf8");
  assert.match(template, /data-tab="my-list">My List/);
  assert.match(frontend, /\/watch-later/);
  assert.match(frontend, /new URL\(detailUrl\(d\.slug\), window\.location\.origin\)/);
  assert.match(frontend, /navigator\.clipboard\.writeText\(url\)/);
  assert.match(frontend, /document\.execCommand\("copy"\)/);
  assert.match(frontend, /class: "mv-btn ghost mv-icon-action mv-share-button"/);
  assert.match(frontend, /classList\.add\("mv-icon-action", "mv-detail-bookmark"\)/);
  assert.match(frontend, /setTimeout\(function \(\) \{[\s\S]{0,120}wrap\.classList\.add\("bookmark-revealed"\)/);
  assert.match(frontend, /520\)/);
  assert.match(frontend, /Saved to List/);
  assert.match(frontend, /5000\)/);
  assert.match(frontend, /Your Watch Later list is empty\. Save a movie or series to find it here\./);
  assert.match(css, /\.mv-tab\[data-tab="my-list"\]\.on\{[^}]*text-decoration:underline/);
  assert.match(css, /\.mv-grid \.mv-empty\{[^}]*grid-column:1\/-1[^}]*text-align:center/);
});

test("premium offer uses the verification payment price, existing benefits and account purchase flow", () => {
  const root = new URL("..", import.meta.url);
  const read = (p) => fs.readFileSync(new URL(p, root), "utf8");
  const account = read("views/account.js");
  const payments = read("routes/payments.js");
  const popup = read("public/site-ui.js");
  const auth = read("services/auth.js");
  const server = read("server.js");
  assert.equal(VERIFICATION_PRICE_NGN, 4990);
  assert.equal(VERIFICATION_ROLLOVER_PRICE_NGN, 3990);
  assert.match(payments, /rollover \? VERIFICATION_ROLLOVER_PRICE_NGN : VERIFICATION_PRICE_NGN/);
  for (const benefit of ["Verified badge on your profile", "Unlimited use of every free tool", "+3 Daily Coins Claim", "A downloadable verification certificate", "No ads on your account", "Free bot deployment", "Earn ₦600+ daily from successful Premium referrals"]) assert.ok(account.includes(benefit), benefit);
  assert.match(account, /VERIFICATION_PRICE_NGN\.toLocaleString/);
  assert.match(account, /id="verifyOverlayTitle"[^>]*>Get Account Premium<\/div>/);
  assert.match(account, /class="overlay-sub"[^>]*>What You Get\?<\/div>/);
  assert.match(account, /id="getVerifiedLabel">Get Verified<\/span>/);
  assert.match(account, /rollover \? 'ROLL OVER' : 'Get Verified'/);
  assert.match(account, /id="verifyPricePeriod">\/ 30 days/);
  assert.match(account, /\.verify-benefits\{[^}]*max-height:[^}]*overflow-y:auto/);
  assert.match(account, /#verifyOverlay \.overlay-card\{[^}]*overflow:hidden/);
  assert.match(account, /\.verify-sticky-actions\{[^}]*flex-shrink:0/);
  assert.match(account, /verifyPayBtn[\s\S]*ROLL OVER/);
  assert.match(account, /get\('premium'\) === '1'/);
  assert.match(popup, /offer\.priceNgn/);
  assert.match(popup, /\.gp-premium-card\{max-width:440px;padding:36px 32px 30px/);
  assert.match(popup, /Verified badge, unlimited use of every free tool, a downloadable certificate, no ads, free bot deployment, and 15% off paid services and coin charges while verified\./);
  assert.match(popup, /function showLiquidToast\(message, type, durationMs\)/);
  assert.match(popup, /toast: showLiquidToast/);
  assert.match(popup, /\/account\?premium=1/);
  assert.match(server, /\/api\/premium-promotion\/shown/);
  assert.match(server, /\/api\/premium-promotion\/dismissed/);
  assert.match(auth, /3 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(auth, /db\.runTransaction\(async \(tx\)/);
});
