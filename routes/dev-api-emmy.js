import { emmyGet, pickMediaUrl, pickText, deepFind, parseDuration, TITLE_KEYS, DURATION_KEYS } from "../services/emmy-api.js";
import { fetchYoutubeMp3, fetchYoutubeMp4, normalizeVideoQuality } from "../services/youtube-downloader.js";

const YT_HOST = /(^|\.)(youtube\.com|youtu\.be)$/i;
const EXAMS = new Set(["jamb", "waec", "neco"]);

function bad(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function param(req, name, { required = true, max = 500 } = {}) {
  const value = String(req.query[name] || "").trim();
  if (!value) {
    if (required) throw bad(`Missing ${name} query parameter.`);
    return "";
  }
  if (value.length > max) throw bad(`${name} is too long (max ${max} characters).`);
  return value;
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function requireHttpUrl(value, label = "url") {
  let parsed;
  try { parsed = new URL(value); } catch { throw bad(`${label} must be a valid link.`); }
  if (!/^https?:$/.test(parsed.protocol)) throw bad(`${label} must be an http(s) link.`);
  return parsed;
}

function mimeFor(url, fallback) {
  let pathname = "";
  try { pathname = new URL(url).pathname.toLowerCase(); } catch { pathname = ""; }
  if (/\.png$/.test(pathname)) return "image/png";
  if (/\.webp$/.test(pathname)) return "image/webp";
  if (/\.gif$/.test(pathname)) return "image/gif";
  if (/\.jpe?g$/.test(pathname)) return "image/jpeg";
  if (/\.webm$/.test(pathname)) return "video/webm";
  if (/\.mp4$/.test(pathname)) return "video/mp4";
  return fallback;
}

export function registerEmmyDevRoutes(router, deps) {
  const { requireDevApiKey, SimpleRateLimiter, signDownloadToken, sanitizeFilename, publicBase, dlTtlMs } = deps;

  const limiter = (max) => new SimpleRateLimiter(max, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();

  function brandedUrl(req, { url, mime, filename }) {
    const token = signDownloadToken({ url, mime, filename, watermark: !req.devApiNoAds }, dlTtlMs);
    return `${publicBase}/api/v1/dev/dl/${token}`;
  }

  const expiresAt = () => new Date(Date.now() + dlTtlMs).toISOString();

  function route(path, limit, handler) {
    router.get(`/api/v1/dev/${path}`, requireDevApiKey, limiter(limit), async (req, res) => {
      try {
        await handler(req, res);
      } catch (err) {
        res.status(err.status || 502).json({ error: err.message || "Could not complete that request." });
      }
    });
  }

  route("ytdl", 10, async (req, res) => {
    const url = param(req, "url");
    const wanted = param(req, "format", { required: false, max: 8 }).toLowerCase() || "mp4";
    if (wanted !== "mp3" && wanted !== "mp4" && !/^\d{3,4}$/.test(wanted)) {
      throw bad("format must be mp3, mp4, or a quality such as 360, 480, 720 or 1080.");
    }
    if (wanted === "mp3") {
      const song = await fetchYoutubeMp3(url);
      if (!song.audioUrl) throw bad("No audio found for that video.", 404);
      return res.json({
        title: song.title,
        thumbnail: song.thumbnail,
        duration: song.duration,
        format: "mp3",
        download_url: brandedUrl(req, { url: song.audioUrl, mime: "audio/mpeg", filename: `${sanitizeFilename(song.title)}.mp3` }),
        expires_at: expiresAt(),
      });
    }
    const video = await fetchYoutubeMp4(url, wanted === "mp4" ? "720" : normalizeVideoQuality(wanted));
    if (!video.videoUrl) throw bad("No video found for that link.", 404);
    res.json({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      format: "mp4",
      quality: video.quality,
      download_url: brandedUrl(req, { url: video.videoUrl, mime: "video/mp4", filename: `${sanitizeFilename(video.title)}.mp4` }),
      expires_at: expiresAt(),
    });
  });

  async function audioDownload(req, res, endpoint, params, input) {
    const result = await emmyGet(endpoint, params);
    const audio = pickMediaUrl(result, "audio", input);
    if (!audio) throw bad("No downloadable audio found for that link.", 404);
    const title = pickText(result, TITLE_KEYS) || "track";
    res.json({
      title,
      artist: pickText(result, ["artist", "artists", "singer", "author", "user"]),
      thumbnail: pickMediaUrl(result, "thumb", input),
      download_url: brandedUrl(req, { url: audio, mime: "audio/mpeg", filename: `${sanitizeFilename(title)}.mp3` }),
      expires_at: expiresAt(),
    });
  }

  route("spotify", 10, (req, res) => {
    const url = param(req, "url");
    return audioDownload(req, res, "spotidown", { url }, url);
  });

  route("soundcloud", 10, (req, res) => {
    const url = param(req, "url");
    requireHttpUrl(url);
    return audioDownload(req, res, "soundcloud-download", { url }, url);
  });

  route("pinterest", 15, async (req, res) => {
    const url = param(req, "url");
    requireHttpUrl(url);
    const result = await emmyGet("pinterest-dl", { pinUrl: url });
    const video = pickMediaUrl(result, "video", url);
    const image = video ? null : pickMediaUrl(result, "image", url);
    const media = video || image;
    if (!media) throw bad("No downloadable media found on that pin.", 404);
    const title = pickText(result, TITLE_KEYS) || "pinterest-media";
    const mime = mimeFor(media, video ? "video/mp4" : "image/jpeg");
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : video ? "mp4" : "jpg";
    res.json({
      type: video ? "video" : "image",
      title,
      download_url: brandedUrl(req, { url: media, mime, filename: `${sanitizeFilename(title)}.${ext}` }),
      expires_at: expiresAt(),
    });
  });

  route("websearch", 20, async (req, res) => {
    const query = param(req, "query", { max: 300 });
    const engine = param(req, "engine", { required: false, max: 10 }).toLowerCase();
    if (engine && engine !== "google" && engine !== "bing") throw bad("engine must be google or bing.");
    const limit = clampInt(req.query.limit, 1, 30, 10);
    if (engine !== "bing") {
      try {
        const results = await emmyGet("google-search", { q: query });
        return res.json({ engine: "google", query, results });
      } catch (err) {
        if (engine === "google") throw err;
      }
    }
    res.json({ engine: "bing", query, results: await emmyGet("bing-search", { query, limit }) });
  });

  route("imagesearch", 20, async (req, res) => {
    const query = param(req, "query", { max: 200 });
    const limit = clampInt(req.query.limit, 1, 30, 10);
    res.json({ query, results: await emmyGet("bing-images", { query, limit }) });
  });

  route("ytsearch", 20, async (req, res) => {
    const query = param(req, "query", { max: 200 });
    res.json({ query, results: await emmyGet("y2mate-search", { query }) });
  });

  route("tiktoksearch", 15, async (req, res) => {
    const query = param(req, "query", { max: 200 });
    const count = clampInt(req.query.count, 1, 30, 10);
    const region = param(req, "region", { required: false, max: 4 }).toUpperCase();
    res.json({ query, results: await emmyGet("getdl-search", { query, count, region }) });
  });

  route("pinterestsearch", 15, async (req, res) => {
    const query = param(req, "query", { max: 200 });
    res.json({ query, results: await emmyGet("pinterest-search", { query }) });
  });

  route("githubsearch", 15, async (req, res) => {
    const query = param(req, "query", { max: 200 });
    res.json({ query, results: await emmyGet("github-search", { query }) });
  });

  route("ytchannel", 15, async (req, res) => {
    const channel = param(req, "channel", { max: 200 });
    const limit = clampInt(req.query.limit, 1, 30, 10);
    res.json({ channel, result: await emmyGet("ytstalk", { channel, limit }) });
  });

  route("livescore", 20, async (req, res) => {
    const edition = param(req, "edition", { required: false, max: 20 });
    res.json({ matches: await emmyGet("livescore", { edition }) });
  });

  route("forecast", 20, async (req, res) => {
    const city = param(req, "city", { max: 100 });
    res.json({ city, forecast: await emmyGet("accuweather", { city }) });
  });

  route("pastquestions", 20, async (req, res) => {
    const exam = param(req, "exam", { required: false, max: 10 }).toLowerCase();
    const subject = param(req, "subject", { required: false, max: 60 }).toLowerCase();
    const year = param(req, "year", { required: false, max: 4 });
    const explain = param(req, "explain", { required: false, max: 10 });

    if (exam && !EXAMS.has(exam)) throw bad("exam must be jamb, waec or neco.");
    if (subject && !/^[a-z0-9-]{2,60}$/.test(subject)) throw bad("subject must be a slug such as english-language.");
    if (year && !/^(19|20)\d{2}$/.test(year)) throw bad("year must be a 4-digit year.");
    if (explain && !/^\d{1,10}$/.test(explain)) throw bad("explain must be a question id from the questions step.");

    if (explain) {
      if (!subject) throw bad("Missing subject query parameter.");
      return res.json({ step: "explanation", result: await emmyGet("pastq-explain", { subject, id: explain }) });
    }
    if (!exam) return res.json({ step: "exams", result: await emmyGet("pastq-exams") });
    if (!subject) return res.json({ step: "subjects", exam, result: await emmyGet("pastq-subjects", { exam }) });
    if (!year) return res.json({ step: "years", exam, subject, result: await emmyGet("pastq-years", { exam, subject }) });
    res.json({ step: "questions", exam, subject, year: Number(year), result: await emmyGet("pastq-questions", { exam, subject, year }) });
  });

  route("tts", 10, async (req, res) => {
    const text = param(req, "text", { max: 1000 });
    const voice = param(req, "voice", { required: false, max: 60 });
    const result = await emmyGet("edgetts", { text, voice });
    const audio = pickMediaUrl(result, "audio", null);
    if (audio) {
      return res.json({
        voice: voice || "default",
        download_url: brandedUrl(req, { url: audio, mime: "audio/mpeg", filename: "speech.mp3" }),
        expires_at: expiresAt(),
      });
    }
    res.json({ voice: voice || "default", result });
  });

  route("ytsummary", 8, async (req, res) => {
    const url = param(req, "url");
    const parsed = requireHttpUrl(url);
    if (!YT_HOST.test(parsed.hostname)) throw bad("url must be a YouTube link.");
    const lang = param(req, "lang", { required: false, max: 10 });
    const result = await emmyGet("gitmind-ytsummerizer", { url, lang }, { timeoutMs: 60000 });
    res.json({
      title: pickText(result, TITLE_KEYS),
      duration: parseDuration(deepFind(result, DURATION_KEYS)) || null,
      result,
    });
  });
}
