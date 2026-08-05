import express from "express";
import QRCode from "qrcode";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { extractTextFromImageUrl } from "../services/ocr.js";
import { fetchSongByQuery } from "../services/davidcyril.js";
import { resolveFacebookVideo } from "../services/facebook.js";
import { searchAudiomackTrack } from "../services/audiomack.js";
import { askFreeAI } from "../services/ai.js";
import { createShortLink, resolveShortLink } from "../services/shortener.js";
import { getWeatherForLocation } from "../services/weather.js";
import { getLyrics, getBibleVerse, getQuranVerse, getTopTechNews } from "../services/lookup.js";
import { signDownloadToken, verifyDownloadToken, streamProxiedFile, sanitizeFilename } from "../services/download-proxy.js";
import {
  requireAuth,
  createDevApiKey,
  listDevApiKeysForUser,
  revokeDevApiKey,
  findDevApiKeyByRawKey,
  getAccountDevApiUsage,
  checkAndIncrementAccountDevApiUsage,
  getUserProfile,
  getEffectiveDevApiPlan,
  getDevApiPlanConfig,
  DEV_API_PLANS,
} from "../services/auth.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const DL_TTL_MS = 6 * 60 * 60 * 1000;

async function requireDevApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) return res.status(401).json({ error: "Missing API key. Pass it in the x-api-key header." });
  if (req.query.key && !req.headers["x-api-key"]) {
    res.set("Warning", '299 - "Passing the API key as ?key= is deprecated and less safe than the x-api-key header; it gets logged in more places. Please switch to the header."');
  }
  try {
    const found = await findDevApiKeyByRawKey(String(key));
    if (!found) return res.status(401).json({ error: "Invalid or revoked API key." });
    const ownerProfile = await getUserProfile(found.uid).catch(() => null);
    const monthlyLimit = getDevApiPlanConfig(ownerProfile).monthlyRequests;
    const usage = await checkAndIncrementAccountDevApiUsage(found.uid, monthlyLimit);
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Monthly request limit reached for this account.",
        requests_this_month: usage.requestsThisMonth,
        monthly_limit: usage.monthlyLimit,
      });
    }
    req.apiKeyId = found.id;
    req.apiKeyUid = found.uid;
    next();
  } catch (err) {
    console.error("dev api key check error:", err.message);
    res.status(500).json({ error: "Could not verify API key." });
  }
}

router.post("/api/devapi/keys", requireAuth, async (req, res) => {
  try {
    const label = ((req.body && req.body.label) || "").trim();
    if (!label) return res.status(400).json({ error: "Give the key a name first." });
    const plan = getDevApiPlanConfig(req.userProfile);
    const existing = await listDevApiKeysForUser(req.uid);
    if (existing.length >= plan.apiKeys) {
      return res.status(400).json({ error: `Your ${plan.name} plan allows up to ${plan.apiKeys} API key${plan.apiKeys === 1 ? "" : "s"}. Revoke one, or upgrade your plan.` });
    }
    const { id, rawKey } = await createDevApiKey(req.uid, label);
    res.json({ id, key: rawKey });
  } catch (err) {
    console.error("create dev api key error:", err.message);
    res.status(500).json({ error: "Could not create API key." });
  }
});

router.get("/api/devapi/keys", requireAuth, async (req, res) => {
  try {
    const planKey = getEffectiveDevApiPlan(req.userProfile);
    const plan = DEV_API_PLANS[planKey];
    const [keys, usage] = await Promise.all([
      listDevApiKeysForUser(req.uid),
      getAccountDevApiUsage(req.uid, plan.monthlyRequests),
    ]);
    let planExpiresAt = null;
    if (planKey !== "free" && planKey !== "starter") planExpiresAt = req.userProfile.devApiPlanExpiresAt || null;
    else if (planKey === "starter") planExpiresAt = req.userProfile.verifiedExpiresAt || null;
    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        label: k.label,
        last4: k.last4,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      })),
      usage: {
        requestsThisMonth: usage.requestsThisMonth,
        monthlyLimit: Number.isFinite(usage.monthlyLimit) ? usage.monthlyLimit : null,
      },
      plan: {
        key: planKey,
        name: plan.name,
        apiKeys: plan.apiKeys,
        expiresAt: planExpiresAt,
      },
    });
  } catch (err) {
    console.error("list dev api keys error:", err.message);
    res.status(500).json({ error: "Could not load API keys." });
  }
});

router.delete("/api/devapi/keys/:id", requireAuth, async (req, res) => {
  try {
    await revokeDevApiKey(req.uid, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not revoke key." });
  }
});

const ocrLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const mp3Limiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const mp4Limiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const facebookLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const audiomackLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const aiLimiter = new SimpleRateLimiter(15, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const qrcodeLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const shortenLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const redirectLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.ip).middleware();
const weatherLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const lyricsLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const bibleLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const quranLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const technewsLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const dlLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.ip).middleware();

router.get("/api/v1/dev/ocr", requireDevApiKey, ocrLimiter, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url query parameter." });

  try {
    const result = await extractTextFromImageUrl(url);
    res.json({ text: result.text, confidence: result.confidence });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not extract text from that image." });
  }
});

router.get("/api/v1/dev/mp3", requireDevApiKey, mp3Limiter, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const song = await fetchSongByQuery(query);
    if (!song.audioUrl) throw Object.assign(new Error("No audio found for that search."), { status: 404 });
    const filename = `${sanitizeFilename(song.title)}.mp3`;
    const token = signDownloadToken({ url: song.audioUrl, mime: "audio/mpeg", filename }, DL_TTL_MS);
    res.json({
      title: song.title,
      thumbnail: song.thumbnail,
      download_url: `${PUBLIC_BASE}/api/v1/dev/dl/${token}`,
      expires_at: new Date(Date.now() + DL_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that track." });
  }
});

router.get("/api/v1/dev/mp4", requireDevApiKey, mp4Limiter, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const song = await fetchSongByQuery(query);
    if (!song.videoUrl) throw Object.assign(new Error("No video found for that search."), { status: 404 });
    const filename = `${sanitizeFilename(song.title)}.mp4`;
    const token = signDownloadToken({ url: song.videoUrl, mime: "video/mp4", filename }, DL_TTL_MS);
    res.json({
      title: song.title,
      thumbnail: song.thumbnail,
      download_url: `${PUBLIC_BASE}/api/v1/dev/dl/${token}`,
      expires_at: new Date(Date.now() + DL_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that video." });
  }
});

router.get("/api/v1/dev/facebook", requireDevApiKey, facebookLimiter, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url query parameter." });

  try {
    const video = await resolveFacebookVideo(url);
    const filename = sanitizeFilename(video.title);
    const out = { title: video.title };
    if (video.hd) {
      out.hd_download_url = `${PUBLIC_BASE}/api/v1/dev/dl/${signDownloadToken({ url: video.hd, mime: "video/mp4", filename: `${filename}.mp4` }, DL_TTL_MS)}`;
    }
    if (video.sd) {
      out.sd_download_url = `${PUBLIC_BASE}/api/v1/dev/dl/${signDownloadToken({ url: video.sd, mime: "video/mp4", filename: `${filename}-sd.mp4` }, DL_TTL_MS)}`;
    }
    out.expires_at = new Date(Date.now() + DL_TTL_MS).toISOString();
    res.json(out);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that video." });
  }
});

router.get("/api/v1/dev/audiomack", requireDevApiKey, audiomackLimiter, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const track = await searchAudiomackTrack(query);
    const filename = `${sanitizeFilename(track.title)}.mp3`;
    const token = signDownloadToken({ url: track.streamUrl, mime: "audio/mpeg", filename }, DL_TTL_MS);
    res.json({
      title: track.title,
      artist: track.artist,
      duration_seconds: track.durationSeconds,
      download_url: `${PUBLIC_BASE}/api/v1/dev/dl/${token}`,
      expires_at: new Date(Date.now() + DL_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that track." });
  }
});

router.post("/api/v1/dev/ai", requireDevApiKey, aiLimiter, async (req, res) => {
  const prompt = String((req.body && req.body.prompt) || "").trim();
  if (!prompt) return res.status(400).json({ error: "Missing prompt in request body." });
  if (prompt.length > 4000) return res.status(400).json({ error: "Prompt is too long (4000 character limit)." });

  try {
    const response = await askFreeAI(prompt);
    res.json({ response });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not get a response right now." });
  }
});

router.get("/api/v1/dev/qrcode", requireDevApiKey, qrcodeLimiter, async (req, res) => {
  const text = String(req.query.text || "").trim();
  if (!text) return res.status(400).json({ error: "Missing text query parameter." });
  if (text.length > 2000) return res.status(400).json({ error: "Text is too long (2000 character limit)." });
  const size = Math.min(1000, Math.max(100, parseInt(req.query.size, 10) || 400));

  try {
    const buffer = await QRCode.toBuffer(text, { errorCorrectionLevel: "M", margin: 2, width: size });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: "Could not generate a QR code for that input." });
  }
});

router.post("/api/v1/dev/shorten", requireDevApiKey, shortenLimiter, async (req, res) => {
  const url = String((req.body && req.body.url) || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url in request body." });

  try {
    const code = await createShortLink(req.apiKeyUid, url);
    res.json({ short_url: `${PUBLIC_BASE}/s/${code}`, original_url: url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not shorten that URL." });
  }
});

router.get("/s/:code", redirectLimiter, async (req, res) => {
  try {
    const url = await resolveShortLink(req.params.code);
    if (!url) return res.status(404).type("text/plain").send("Short link not found.");
    res.redirect(302, url);
  } catch (err) {
    res.status(500).type("text/plain").send("Could not resolve that link.");
  }
});

router.get("/api/v1/dev/weather", requireDevApiKey, weatherLimiter, async (req, res) => {
  const location = String(req.query.location || "").trim();
  if (!location) return res.status(400).json({ error: "Missing location query parameter." });

  try {
    const weather = await getWeatherForLocation(location);
    res.json(weather);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch weather for that location." });
  }
});

router.get("/api/v1/dev/lyrics", requireDevApiKey, lyricsLimiter, async (req, res) => {
  const artist = String(req.query.artist || "").trim();
  const title = String(req.query.title || "").trim();
  if (!artist || !title) return res.status(400).json({ error: "Missing artist and/or title query parameter." });

  try {
    const result = await getLyrics(artist, title);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch lyrics." });
  }
});

router.get("/api/v1/dev/bible", requireDevApiKey, bibleLimiter, async (req, res) => {
  const reference = String(req.query.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "Missing reference query parameter." });

  try {
    const result = await getBibleVerse(reference);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that Bible reference." });
  }
});

router.get("/api/v1/dev/quran", requireDevApiKey, quranLimiter, async (req, res) => {
  const reference = String(req.query.reference || "").trim();
  if (!reference) return res.status(400).json({ error: "Missing reference query parameter." });

  try {
    const result = await getQuranVerse(reference);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that Quran reference." });
  }
});

router.get("/api/v1/dev/technews", requireDevApiKey, technewsLimiter, async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));

  try {
    const stories = await getTopTechNews(limit);
    res.json({ stories });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch tech news." });
  }
});

router.get("/api/v1/dev/dl/:token", dlLimiter, async (req, res) => {
  const payload = verifyDownloadToken(req.params.token);
  if (!payload) return res.status(403).type("text/plain").send("Invalid or expired download link.");
  await streamProxiedFile(payload, req, res);
});

export { router as devApiRouter };
