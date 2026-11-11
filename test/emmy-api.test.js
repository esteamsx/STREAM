import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let server;
let handlers = {};
let calls = [];
const realFetch = globalThis.fetch;
let externalHandler = () => new Response("not stubbed", { status: 599 });

before(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const name = url.pathname.replace(/^\/api\//, "");
    const query = Object.fromEntries(url.searchParams);
    calls.push({ name, query, apiKey: req.headers["x-api-key"] || null });
    const handler = handlers[name];
    const out = handler ? handler(query) : { code: 404, body: { status: false, error: `no endpoint ${name}` } };
    res.writeHead(out.code || 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out.body));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.EMMY_API_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = (input, init) => {
    const target = typeof input === "string" ? input : input.url || String(input);
    if (target.startsWith(process.env.EMMY_API_BASE_URL)) return realFetch(input, init);
    return Promise.resolve(externalHandler(target, init));
  };
});

after(async () => {
  globalThis.fetch = realFetch;
  delete process.env.EMMY_API_BASE_URL;
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  handlers = {};
  calls = [];
  delete process.env.EMMY_API_KEY;
  externalHandler = (url) => {
    if (url.startsWith("https://dl.test/")) {
      return new Response("xx", { status: 206, headers: { "content-type": url.includes("audio") ? "audio/mpeg" : "video/mp4" } });
    }
    return new Response("not stubbed", { status: 599 });
  };
});

const ok = (result) => ({ body: { status: true, creator: "EmmyHenz", took: "10ms", result } });

test("emmyGet unwraps result, skips empty params and sends the key only when configured", async () => {
  const { emmyGet } = await import("../services/emmy-api.js");
  handlers["demo"] = () => ok({ hello: "world" });

  assert.deepEqual(await emmyGet("demo", { url: "https://x.test/a b", format: "", skip: undefined }), { hello: "world" });
  assert.equal(calls[0].query.url, "https://x.test/a b");
  assert.ok(!("format" in calls[0].query));
  assert.equal(calls[0].apiKey, null);

  process.env.EMMY_API_KEY = "secret-test-key";
  await emmyGet("demo", {});
  assert.equal(calls[1].apiKey, "secret-test-key");
});

test("emmyGet maps provider errors to useful statuses", async () => {
  const { emmyGet } = await import("../services/emmy-api.js");
  handlers["missing"] = () => ({ code: 400, body: { status: false, error: "url is required" } });
  handlers["busy"] = () => ({ code: 429, body: { status: false, error: "slow down" } });
  handlers["denied"] = () => ({ code: 403, body: { status: false, error: "premium only" } });
  handlers["soft"] = () => ({ code: 200, body: { status: false, error: "could not resolve" } });
  handlers["empty"] = () => ({ code: 200, body: { status: true } });

  await assert.rejects(emmyGet("missing"), (e) => e.status === 404 && /url is required/.test(e.message));
  await assert.rejects(emmyGet("busy"), (e) => e.status === 503);
  await assert.rejects(emmyGet("denied"), (e) => e.status === 502 && !/premium only/.test(e.message));
  await assert.rejects(emmyGet("soft"), (e) => e.status === 502 && /could not resolve/.test(e.message));
  await assert.rejects(emmyGet("empty"), (e) => e.status === 502);
});

test("pickMediaUrl prefers no-watermark video, ignores covers, music and the echoed source link", async () => {
  const { pickMediaUrl } = await import("../services/emmy-api.js");
  const input = "https://www.tiktok.com/@user/video/123";
  const result = {
    url: input,
    cover: "https://cdn.test/cover.jpg",
    music: "https://cdn.test/sound.mp3",
    video: { watermark: "https://cdn.test/wm.mp4", noWatermark: "https://cdn.test/clean.mp4" },
  };
  assert.equal(pickMediaUrl(result, "video", input), "https://cdn.test/clean.mp4");
  assert.equal(pickMediaUrl(result, "audio", input), "https://cdn.test/sound.mp3");
  assert.equal(pickMediaUrl({ url: input, thumbnail: "https://cdn.test/t.jpg" }, "video", input), null);
  assert.equal(pickMediaUrl({ title: "x", download: "https://dl.test/file?id=1" }, "thumb", input), null);
});

test("parseDuration and parseCount handle common provider formats", async () => {
  const { parseDuration, parseCount } = await import("../services/emmy-api.js");
  assert.equal(parseDuration("03:30"), 210);
  assert.equal(parseDuration("1:02:03"), 3723);
  assert.equal(parseDuration("PT2M5S"), 125);
  assert.equal(parseDuration(95), 95);
  assert.equal(parseCount("1.2M"), 1200000);
  assert.equal(parseCount("12,345"), 12345);
  assert.equal(parseCount("n/a"), null);
});

test("MP3 falls through to the next Emmy provider and keeps the adapter contract", async () => {
  const yt = await import("../services/youtube-downloader.js");
  yt.__setDirectFallbackForTests(async () => { throw new Error("direct fallback must not run"); });
  handlers["savetube"] = () => ({ code: 500, body: { status: false, error: "upstream down" } });
  handlers["ytshortdown"] = () => ok({ title: "Great Song", thumbnail: "https://img.test/t.jpg", duration: "03:30", download: "https://dl.test/audio/abc?token=1" });

  const out = await yt.fetchYoutubeMp3("https://youtu.be/dQw4w9WgXcQ");
  assert.deepEqual(calls.map((c) => c.name), ["savetube", "ytshortdown"]);
  assert.equal(calls[0].query.format, "mp3");
  assert.equal(calls[1].query.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(out.title, "Great Song");
  assert.equal(out.thumbnail, "https://img.test/t.jpg");
  assert.equal(out.duration, 210);
  assert.equal(out.audioUrl, "https://dl.test/audio/abc?token=1");
  assert.equal(out.directAudioUrl, null);
});

test("MP4 requests the chosen quality and reports it", async () => {
  const yt = await import("../services/youtube-downloader.js");
  yt.__setDirectFallbackForTests(async () => { throw new Error("direct fallback must not run"); });
  handlers["savetube"] = (q) => ok({ title: "Clip", download: `https://dl.test/video/${q.format}.mp4` });

  const out = await yt.fetchYoutubeMp4("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "360");
  assert.equal(calls[0].query.format, "360");
  assert.equal(out.quality, "360");
  assert.equal(out.videoUrl, "https://dl.test/video/360.mp4");
  assert.equal(out.fallbackVideoUrl, null);
  assert.equal(out.fallbackAudioUrl, null);

  const def = await yt.fetchYoutubeMp4("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(def.quality, "720");
});

test("unprobed providers are skipped when their link is not downloadable", async () => {
  const yt = await import("../services/youtube-downloader.js");
  yt.__setDirectFallbackForTests(async () => { throw new Error("direct"); });
  handlers["clipto"] = () => ok({ audio: "https://dead.test/audio.mp3" });
  externalHandler = () => new Response("nope", { status: 404 });
  await assert.rejects(yt.fetchYoutubeMp3("https://youtu.be/dQw4w9WgXcQ"));
  assert.ok(calls.some((c) => c.name === "clipto"));
});

test("direct ytdl fallback is the last resort, and errors keep a status", async () => {
  const yt = await import("../services/youtube-downloader.js");
  let used = 0;
  yt.__setDirectFallbackForTests(async () => { used += 1; return { title: "Direct", thumbnail: null, duration: 5, download: "https://dl.test/direct.mp4" }; });
  const out = await yt.fetchYoutubeMp4("https://youtu.be/dQw4w9WgXcQ");
  assert.equal(used, 1);
  assert.equal(out.videoUrl, "https://dl.test/direct.mp4");

  yt.__setDirectFallbackForTests(async () => { throw new Error("blocked"); });
  await assert.rejects(yt.fetchYoutubeMp3("https://youtu.be/dQw4w9WgXcQ"), (e) => [404, 502, 503].includes(e.status));
});

test("invalid YouTube links are rejected with 400 before any provider call", async () => {
  const yt = await import("../services/youtube-downloader.js");
  await assert.rejects(yt.fetchYoutubeMp3("not a url"), (e) => e.status === 400);
  await assert.rejects(yt.fetchYoutubeMp4("https://example.com/video"), (e) => e.status === 400);
  assert.equal(calls.length, 0);
  assert.equal(yt.normalizeVideoQuality("1000"), "1080");
  assert.equal(yt.normalizeVideoQuality("abc"), "720");
});

test("TikTok video: later Emmy provider is used when the first has no link", async () => {
  const { resolveTikTokMedia } = await import("../services/tiktok.js");
  handlers["savetik"] = () => ok({ title: "no media here" });
  handlers["vibetik-tiktokdl"] = () => ok({ title: "Dance", author: { nickname: "Dancer" }, cover: "https://cdn.test/c.jpg", video: "https://cdn.test/nowm.mp4", music: "https://cdn.test/m.mp3" });

  const out = await resolveTikTokMedia("https://www.tiktok.com/@dancer/video/1");
  assert.deepEqual(calls.map((c) => c.name), ["savetik", "vibetik-tiktokdl"]);
  assert.equal(out.type, "video");
  assert.equal(out.title, "Dance");
  assert.equal(out.author, "Dancer");
  assert.equal(out.videoUrl, "https://cdn.test/nowm.mp4");
  assert.equal(out.audioUrl, "https://cdn.test/m.mp3");
  assert.deepEqual(out.images, []);
});

test("TikTok photo posts return an image set", async () => {
  const { resolveTikTokMedia } = await import("../services/tiktok.js");
  handlers["savetik"] = () => ok({ title: "Photos", images: ["https://cdn.test/1.jpg", "https://cdn.test/2.jpg"], cover: "https://cdn.test/c.jpg" });
  const out = await resolveTikTokMedia("https://vm.tiktok.com/abc/");
  assert.equal(out.type, "images");
  assert.deepEqual(out.images, ["https://cdn.test/1.jpg", "https://cdn.test/2.jpg"]);
  assert.equal(out.videoUrl, null);
});

test("TikTok falls back to the existing tikwm path when every Emmy provider fails", async () => {
  const { resolveTikTokMedia } = await import("../services/tiktok.js");
  externalHandler = (url) => url.includes("tikwm.com")
    ? new Response(JSON.stringify({ code: 0, data: { title: "Legacy", play: "https://tikwm.test/v.mp4", music: "https://tikwm.test/m.mp3", author: { unique_id: "u" } } }), { status: 200 })
    : new Response("x", { status: 599 });
  const out = await resolveTikTokMedia("https://www.tiktok.com/@u/video/9");
  assert.equal(calls.length, 4);
  assert.equal(out.title, "Legacy");
  assert.equal(out.videoUrl, "https://tikwm.test/v.mp4");
});

test("TikTok rejects non-TikTok links without calling any provider", async () => {
  const { resolveTikTokMedia } = await import("../services/tiktok.js");
  await assert.rejects(resolveTikTokMedia("https://example.com/x"), (e) => e.status === 400);
  assert.equal(calls.length, 0);
});

test("TikTok profile maps the Emmy inspector payload to the existing shape", async () => {
  const { getTikTokProfile } = await import("../services/tiktok.js");
  handlers["tiktok-inspector"] = () => ok({
    user: { uniqueId: "someone", nickname: "Some One", verified: true, signature: "hi", avatarLarger: "https://cdn.test/a.jpg" },
    stats: { followerCount: "1.2M", followingCount: 10, heartCount: 5000, videoCount: 42 },
  });
  const out = await getTikTokProfile("@someone");
  assert.equal(calls[0].query.username, "someone");
  assert.deepEqual(out, {
    uniqueId: "someone", nickname: "Some One", verified: true, bio: "hi",
    avatar: "https://cdn.test/a.jpg", followers: 1200000, following: 10, likes: 5000, videos: 42,
  });
});

test("Instagram reel resolves through Emmy and keeps the existing response shape", async () => {
  const { resolveInstagramMedia } = await import("../services/instagram.js");
  handlers["snapsave"] = () => ok([{ thumbnail: "https://cdn.test/t.jpg", url: "https://cdn.test/reel.mp4" }]);
  const out = await resolveInstagramMedia("https://www.instagram.com/reel/ABC123/");
  assert.equal(out.type, "video");
  assert.equal(out.videoUrl, "https://cdn.test/reel.mp4");
  assert.equal(out.imageUrl, null);
  assert.ok(out.title);
});

test("Instagram photo post returns an image and later providers are tried", async () => {
  const { resolveInstagramMedia } = await import("../services/instagram.js");
  handlers["snapsave"] = () => ({ code: 500, body: { status: false, error: "down" } });
  handlers["igexport"] = () => ok({ caption: "Sunset", media: [{ type: "photo", image: "https://cdn.test/p.jpg" }] });
  const out = await resolveInstagramMedia("https://www.instagram.com/p/XYZ/");
  assert.deepEqual(calls.map((c) => c.name), ["snapsave", "igexport"]);
  assert.equal(out.type, "image");
  assert.equal(out.imageUrl, "https://cdn.test/p.jpg");
  assert.equal(out.caption, "Sunset");
});

test("Instagram falls back to the existing page scrape when Emmy fails, and validates links", async () => {
  const { resolveInstagramMedia } = await import("../services/instagram.js");
  externalHandler = (url) => url.includes("instagram.com")
    ? new Response('<meta property="og:video" content="https://ig.test/v.mp4"><meta property="og:title" content="Legacy title • IG">', { status: 200 })
    : new Response("x", { status: 599 });
  const out = await resolveInstagramMedia("https://www.instagram.com/reel/ABC123/");
  assert.equal(out.videoUrl, "https://ig.test/v.mp4");
  assert.equal(out.title, "Legacy title");
  await assert.rejects(resolveInstagramMedia("https://example.com/reel/1"), (e) => e.status === 400);
});

test("Facebook video maps HD and SD links from Emmy", async () => {
  const { resolveFacebookVideo } = await import("../services/facebook.js");
  handlers["fbdown"] = () => ok({ title: "FB clip", thumbnail: "https://cdn.test/t.jpg", hd: "https://cdn.test/hd.mp4", sd: "https://cdn.test/sd.mp4" });
  const out = await resolveFacebookVideo("https://www.facebook.com/watch/?v=123456");
  assert.equal(out.hd, "https://cdn.test/hd.mp4");
  assert.equal(out.sd, "https://cdn.test/sd.mp4");
  assert.equal(out.title, "FB clip");
});

async function buildRoutes() {
  const { registerEmmyDevRoutes } = await import("../routes/dev-api-emmy.js");
  const routes = new Map();
  const router = { get: (path, ...fns) => routes.set(path, fns) };
  const requireDevApiKey = () => {};
  const signed = [];
  class FakeLimiter { middleware() { return () => {}; } }
  registerEmmyDevRoutes(router, {
    requireDevApiKey,
    SimpleRateLimiter: FakeLimiter,
    signDownloadToken: (payload) => { signed.push(payload); return "TOKEN"; },
    sanitizeFilename: (name) => String(name).replace(/[^\w\s.-]/g, "").trim() || "download",
    publicBase: "https://site.test",
    dlTtlMs: 1000,
  });
  const call = async (path, query = {}, req = {}) => {
    const fns = routes.get(`/api/v1/dev/${path}`);
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
    await fns[fns.length - 1]({ query, ...req }, res);
    return res;
  };
  return { routes, requireDevApiKey, signed, call };
}

test("all 16 new developer routes are registered behind the API-key middleware", async () => {
  const { routes, requireDevApiKey } = await buildRoutes();
  const expected = ["ytdl", "spotify", "soundcloud", "pinterest", "websearch", "imagesearch", "ytsearch", "tiktoksearch",
    "pinterestsearch", "githubsearch", "ytchannel", "livescore", "forecast", "pastquestions", "tts", "ytsummary"];
  for (const name of expected) {
    const fns = routes.get(`/api/v1/dev/${name}`);
    assert.ok(fns, `missing route ${name}`);
    assert.equal(fns[0], requireDevApiKey, `${name} must require an API key`);
  }
  assert.equal(routes.size, expected.length);
});

test("ytdl returns branded links and honours format", async () => {
  const yt = await import("../services/youtube-downloader.js");
  yt.__setDirectFallbackForTests(async () => { throw new Error("direct"); });
  handlers["savetube"] = (q) => ok({ title: "Song: Live!", thumbnail: "https://img.test/t.jpg", download: q.format === "mp3" ? "https://dl.test/audio/a" : "https://dl.test/video/v.mp4" });
  const { call, signed } = await buildRoutes();

  const mp3 = await call("ytdl", { url: "https://youtu.be/dQw4w9WgXcQ", format: "mp3" }, { devApiNoAds: false });
  assert.equal(mp3.body.format, "mp3");
  assert.equal(mp3.body.download_url, "https://site.test/api/v1/dev/dl/TOKEN");
  assert.equal(signed[0].mime, "audio/mpeg");
  assert.equal(signed[0].filename, "Song Live.mp3");
  assert.equal(signed[0].watermark, true);

  const mp4 = await call("ytdl", { url: "https://youtu.be/dQw4w9WgXcQ", format: "1080" }, { devApiNoAds: true });
  assert.equal(mp4.body.quality, "1080");
  assert.equal(signed[1].mime, "video/mp4");
  assert.equal(signed[1].watermark, false);

  assert.equal((await call("ytdl", { url: "https://youtu.be/dQw4w9WgXcQ", format: "wav" })).statusCode, 400);
  assert.equal((await call("ytdl", {})).statusCode, 400);
});

test("downloader routes: spotify, soundcloud and pinterest sign the provider media", async () => {
  handlers["spotidown"] = () => ok({ title: "Track", artist: "Band", cover: "https://img.test/c.jpg", download: "https://dl.test/audio/s.mp3" });
  handlers["soundcloud-download"] = () => ok({ title: "SC", url: "https://dl.test/audio/sc.mp3" });
  handlers["pinterest-dl"] = () => ok({ title: "Pin", image: "https://img.test/pin.png" });
  const { call, signed } = await buildRoutes();

  const sp = await call("spotify", { url: "https://open.spotify.com/track/1" });
  assert.equal(sp.body.artist, "Band");
  assert.equal(signed[0].url, "https://dl.test/audio/s.mp3");

  const sc = await call("soundcloud", { url: "https://soundcloud.com/a/b" });
  assert.equal(sc.body.download_url, "https://site.test/api/v1/dev/dl/TOKEN");

  const pin = await call("pinterest", { url: "https://pin.it/abc" });
  assert.equal(pin.body.type, "image");
  assert.equal(signed[2].mime, "image/png");
  assert.equal(calls.find((c) => c.name === "pinterest-dl").query.pinUrl, "https://pin.it/abc");

  handlers["spotidown"] = () => ok({ title: "No file" });
  assert.equal((await call("spotify", { url: "x" })).statusCode, 404);
});

test("search and lookup routes pass provider results through with clamped inputs", async () => {
  handlers["google-search"] = () => ({ code: 500, body: { status: false, error: "google down" } });
  handlers["bing-search"] = (q) => ok([{ title: "r", limit: q.limit }]);
  handlers["bing-images"] = () => ok([{ image: "https://img.test/1.jpg" }]);
  handlers["getdl-search"] = () => ok([]);
  handlers["livescore"] = () => ok([{ competition: "NPFL" }]);
  const { call } = await buildRoutes();

  const web = await call("websearch", { query: "lagos", limit: "999" });
  assert.equal(web.body.engine, "bing");
  assert.equal(calls.find((c) => c.name === "bing-search").query.limit, "30");
  assert.equal((await call("websearch", { query: "x", engine: "google" })).statusCode, 502);
  assert.equal((await call("websearch", { query: "x", engine: "yahoo" })).statusCode, 400);

  assert.deepEqual((await call("imagesearch", { query: "cats" })).body.results, [{ image: "https://img.test/1.jpg" }]);
  await call("tiktoksearch", { query: "dance", count: "0", region: "ng" });
  const t = calls.find((c) => c.name === "getdl-search").query;
  assert.equal(t.count, "1");
  assert.equal(t.region, "NG");
  assert.deepEqual((await call("livescore", {})).body.matches, [{ competition: "NPFL" }]);
});

test("pastquestions walks exams, subjects, years, questions and explanations", async () => {
  handlers["pastq-exams"] = () => ok(["jamb"]);
  handlers["pastq-subjects"] = () => ok(["english-language"]);
  handlers["pastq-years"] = () => ok([2019]);
  handlers["pastq-questions"] = () => ok([{ id: 1, answer: "A" }]);
  handlers["pastq-explain"] = () => ok("because");
  const { call } = await buildRoutes();

  assert.equal((await call("pastquestions", {})).body.step, "exams");
  assert.equal((await call("pastquestions", { exam: "JAMB" })).body.step, "subjects");
  assert.equal((await call("pastquestions", { exam: "jamb", subject: "english-language" })).body.step, "years");
  const q = await call("pastquestions", { exam: "jamb", subject: "english-language", year: "2019" });
  assert.equal(q.body.step, "questions");
  assert.equal(q.body.year, 2019);
  assert.equal((await call("pastquestions", { subject: "english-language", explain: "1" })).body.step, "explanation");

  assert.equal((await call("pastquestions", { exam: "sat" })).statusCode, 400);
  assert.equal((await call("pastquestions", { exam: "jamb", subject: "../etc" })).statusCode, 400);
  assert.equal((await call("pastquestions", { exam: "jamb", subject: "maths", year: "99" })).statusCode, 400);
});

test("tts brands an audio link when one is returned and otherwise passes the result through", async () => {
  const { call, signed } = await buildRoutes();
  handlers["edgetts"] = () => ok({ audio: "https://dl.test/audio/tts.mp3" });
  const a = await call("tts", { text: "hello", voice: "aria" });
  assert.equal(a.body.download_url, "https://site.test/api/v1/dev/dl/TOKEN");
  assert.equal(signed[0].mime, "audio/mpeg");

  handlers["edgetts"] = () => ok({ base64: "AAAA" });
  const b = await call("tts", { text: "hello" });
  assert.deepEqual(b.body.result, { base64: "AAAA" });

  assert.equal((await call("tts", { text: "x".repeat(1001) })).statusCode, 400);
});

test("ytsummary only accepts YouTube links", async () => {
  handlers["gitmind-ytsummerizer"] = () => ok({ title: "Talk", summary: "short" });
  const { call } = await buildRoutes();
  assert.equal((await call("ytsummary", { url: "https://youtu.be/dQw4w9WgXcQ" })).body.title, "Talk");
  assert.equal((await call("ytsummary", { url: "https://example.com/v" })).statusCode, 400);
  assert.equal((await call("ytsummary", { url: "javascript:alert(1)" })).statusCode, 400);
});
