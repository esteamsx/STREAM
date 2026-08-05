import express from "express";
import { requireApiKey } from "./api.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { extractTextFromImageUrl } from "../services/ocr.js";
import { searchYoutubeVideo, getYoutubeDownload } from "../services/youtube.js";
import { resolveFacebookVideo } from "../services/facebook.js";
import { searchAudiomackTrack } from "../services/audiomack.js";
import { askFreeAI } from "../services/ai.js";
import { signDownloadToken, verifyDownloadToken, streamProxiedFile, mimeToExt, sanitizeFilename } from "../services/download-proxy.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const DL_TTL_MS = 6 * 60 * 60 * 1000;

const ocrLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const mp3Limiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const mp4Limiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const facebookLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const audiomackLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const aiLimiter = new SimpleRateLimiter(15, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const dlLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.ip).middleware();

router.get("/api/v1/dev/ocr", requireApiKey, ocrLimiter, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url query parameter." });

  try {
    const result = await extractTextFromImageUrl(url);
    res.json({ text: result.text, confidence: result.confidence });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not extract text from that image." });
  }
});

router.get("/api/v1/dev/mp3", requireApiKey, mp3Limiter, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const video = await searchYoutubeVideo(query);
    const dl = await getYoutubeDownload(video.videoId, { audioOnly: true });
    const filename = `${sanitizeFilename(video.title)}.${mimeToExt(dl.mimeType, "m4a")}`;
    const token = signDownloadToken({ url: dl.url, mime: dl.mimeType, filename }, DL_TTL_MS);
    res.json({
      title: video.title,
      artist: video.author,
      duration_seconds: video.durationSeconds,
      download_url: `${PUBLIC_BASE}/api/v1/dev/dl/${token}`,
      expires_at: new Date(Date.now() + DL_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that track." });
  }
});

router.get("/api/v1/dev/mp4", requireApiKey, mp4Limiter, async (req, res) => {
  const query = String(req.query.query || "").trim();
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const video = await searchYoutubeVideo(query);
    const dl = await getYoutubeDownload(video.videoId, { audioOnly: false });
    const filename = `${sanitizeFilename(video.title)}.${mimeToExt(dl.mimeType, "mp4")}`;
    const token = signDownloadToken({ url: dl.url, mime: dl.mimeType, filename }, DL_TTL_MS);
    res.json({
      title: video.title,
      channel: video.author,
      duration_seconds: video.durationSeconds,
      download_url: `${PUBLIC_BASE}/api/v1/dev/dl/${token}`,
      expires_at: new Date(Date.now() + DL_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that video." });
  }
});

router.get("/api/v1/dev/facebook", requireApiKey, facebookLimiter, async (req, res) => {
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

router.get("/api/v1/dev/audiomack", requireApiKey, audiomackLimiter, async (req, res) => {
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

router.post("/api/v1/dev/ai", requireApiKey, aiLimiter, async (req, res) => {
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

router.get("/api/v1/dev/dl/:token", dlLimiter, async (req, res) => {
  const payload = verifyDownloadToken(req.params.token);
  if (!payload) return res.status(403).type("text/plain").send("Invalid or expired download link.");
  await streamProxiedFile(payload, req, res);
});

export { router as devApiRouter };
