import express from "express";
import QRCode from "qrcode";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { extractTextFromImageUrl } from "../services/ocr.js";
import { fetchSongByQuery, analyzeImage } from "../services/davidcyril.js";
import { resolveFacebookVideo } from "../services/facebook.js";
import { searchAudiomackTrack } from "../services/audiomack.js";
import { askFreeAI } from "../services/ai.js";
import { createShortLink, resolveShortLink } from "../services/shortener.js";
import { getWeatherForLocation } from "../services/weather.js";
import {
  getLyrics,
  getBibleVerse,
  getQuranVerse,
  getTopTechNews,
  getCurrencyRate,
  getDictionaryDefinition,
  lookupIp,
  getCountryInfo,
  getTriviaQuestion,
  getRandomJoke,
  getRandomAdvice,
  getCatFact,
  getPublicHolidays,
  getGithubUser,
  getRandomDogImage,
} from "../services/lookup.js";
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
  redeemBonusCode,
} from "../services/auth.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const DL_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_PROMO_NOTICE = "Visit our Channel: https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29";

const rpsLimitersByRate = new Map();
function getRpsLimiter(requestsPerSecond) {
  if (!rpsLimitersByRate.has(requestsPerSecond)) {
    rpsLimitersByRate.set(requestsPerSecond, new SimpleRateLimiter(requestsPerSecond, 1000));
  }
  return rpsLimitersByRate.get(requestsPerSecond);
}

async function requireDevApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) return res.status(401).json({ error: "Missing API key. Pass it in the x-api-key header." });
  if (req.query.key && !req.headers["x-api-key"]) {
    res.set("Warning", '299 - "Passing the API key as ?key= is deprecated and less safe than the x-api-key header; it gets logged in more places. Please switch to the header."');
  }
  try {
    const found = await findDevApiKeyByRawKey(String(key));
    if (!found) return res.status(401).json({ error: "Invalid or revoked API key." });
    req.apiKeyId = found.id;
    req.apiKeyUid = found.uid;

    const ownerProfile = await getUserProfile(found.uid).catch(() => null);
    const plan = getDevApiPlanConfig(ownerProfile);

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 400 && body && typeof body === "object" && !Array.isArray(body)) {
        if (!plan.noAds) {
          body = { ...body, notice: DEFAULT_PROMO_NOTICE };
        } else if (ownerProfile && ownerProfile.devApiCustomAdsUrl) {
          body = { ...body, notice: ownerProfile.devApiCustomAdsUrl };
        }
      }
      return originalJson(body);
    };

    if (!getRpsLimiter(plan.requestsPerSecond).check(found.id)) {
      return res.status(429).json({ error: "Too many requests per second for your plan." });
    }

    const monthlyLimit = plan.monthlyRequests + ((ownerProfile && ownerProfile.bonusDevApiRequests) || 0);
    const usage = await checkAndIncrementAccountDevApiUsage(found.uid, monthlyLimit);
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Monthly request limit reached for this account.",
        requests_this_month: usage.requestsThisMonth,
        monthly_limit: usage.monthlyLimit,
      });
    }
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
    const bonusRequests = (req.userProfile && req.userProfile.bonusDevApiRequests) || 0;
    const monthlyLimit = plan.monthlyRequests + bonusRequests;
    const [keys, usage] = await Promise.all([
      listDevApiKeysForUser(req.uid),
      getAccountDevApiUsage(req.uid, monthlyLimit),
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
        bonusRequests,
      },
      plan: {
        key: planKey,
        name: plan.name,
        apiKeys: plan.apiKeys,
        requestsPerSecond: plan.requestsPerSecond,
        monthlyRequests: Number.isFinite(plan.monthlyRequests) ? plan.monthlyRequests : null,
        noAds: plan.noAds,
        customAdsLink: plan.customAdsLink,
        expiresAt: planExpiresAt,
      },
      devApiCustomAdsUrl: req.userProfile.devApiCustomAdsUrl || null,
    });
  } catch (err) {
    console.error("list dev api keys error:", err.message);
    res.status(500).json({ error: "Could not load API keys." });
  }
});

const devApiBonusRedeemLimiter = new SimpleRateLimiter(10, 60 * 1000, (req) => req.uid).middleware();

router.post("/api/devapi/bonus-redeem", requireAuth, devApiBonusRedeemLimiter, async (req, res) => {
  try {
    const code = String((req.body && req.body.code) || "").trim();
    const result = await redeemBonusCode(req.uid, code, "devapi");
    res.json({ ok: true, amount: result.amount });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not redeem that code." });
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
const imgscanLimiter = new SimpleRateLimiter(15, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const currencyLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const dictionaryLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const iplookupLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const countryLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const triviaLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const jokeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const adviceLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const catfactLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const holidaysLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const githubuserLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
const dogimageLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();
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

router.get("/api/v1/dev/imgscan", requireDevApiKey, imgscanLimiter, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url query parameter." });

  try {
    const result = await analyzeImage(url);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not analyze that image." });
  }
});

router.get("/api/v1/dev/currency", requireDevApiKey, currencyLimiter, async (req, res) => {
  const from = String(req.query.from || "").trim().toUpperCase();
  const to = String(req.query.to || "").trim().toUpperCase();
  const amount = Number(req.query.amount) || 1;
  if (!from || !to) return res.status(400).json({ error: "Missing from and/or to query parameter." });

  try {
    const result = await getCurrencyRate(from, to, amount);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch that exchange rate." });
  }
});

router.get("/api/v1/dev/dictionary", requireDevApiKey, dictionaryLimiter, async (req, res) => {
  const word = String(req.query.word || "").trim();
  if (!word) return res.status(400).json({ error: "Missing word query parameter." });

  try {
    const result = await getDictionaryDefinition(word);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch a definition for that word." });
  }
});

router.get("/api/v1/dev/iplookup", requireDevApiKey, iplookupLimiter, async (req, res) => {
  const ip = String(req.query.ip || "").trim();
  if (!ip) return res.status(400).json({ error: "Missing ip query parameter." });

  try {
    const result = await lookupIp(ip);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not look up that IP address." });
  }
});

router.get("/api/v1/dev/country", requireDevApiKey, countryLimiter, async (req, res) => {
  const name = String(req.query.name || "").trim();
  if (!name) return res.status(400).json({ error: "Missing name query parameter." });

  try {
    const result = await getCountryInfo(name);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not find that country." });
  }
});

router.get("/api/v1/dev/trivia", requireDevApiKey, triviaLimiter, async (req, res) => {
  const category = String(req.query.category || "").trim();
  const difficulty = String(req.query.difficulty || "").trim();

  try {
    const result = await getTriviaQuestion(category, difficulty);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch a trivia question." });
  }
});

router.get("/api/v1/dev/joke", requireDevApiKey, jokeLimiter, async (req, res) => {
  try {
    const result = await getRandomJoke();
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch a joke." });
  }
});

router.get("/api/v1/dev/advice", requireDevApiKey, adviceLimiter, async (req, res) => {
  try {
    const result = await getRandomAdvice();
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch advice." });
  }
});

router.get("/api/v1/dev/catfact", requireDevApiKey, catfactLimiter, async (req, res) => {
  try {
    const result = await getCatFact();
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch a cat fact." });
  }
});

router.get("/api/v1/dev/holidays", requireDevApiKey, holidaysLimiter, async (req, res) => {
  const year = String(req.query.year || "").trim();
  const country = String(req.query.country || "").trim();
  if (!year || !country) return res.status(400).json({ error: "Missing year and/or country query parameter." });
  try {
    const result = await getPublicHolidays(year, country);
    res.json({ holidays: result });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch public holidays." });
  }
});

router.get("/api/v1/dev/githubuser", requireDevApiKey, githubuserLimiter, async (req, res) => {
  const username = String(req.query.username || "").trim();
  if (!username) return res.status(400).json({ error: "Missing username query parameter." });
  try {
    const result = await getGithubUser(username);
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not find that GitHub user." });
  }
});

router.get("/api/v1/dev/dogimage", requireDevApiKey, dogimageLimiter, async (req, res) => {
  try {
    const result = await getRandomDogImage();
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not fetch a dog image." });
  }
});

router.get("/api/v1/dev/dl/:token", dlLimiter, async (req, res) => {
  const payload = verifyDownloadToken(req.params.token);
  if (!payload) return res.status(403).type("text/plain").send("Invalid or expired download link.");
  await streamProxiedFile(payload, req, res);
});

export { router as devApiRouter };
