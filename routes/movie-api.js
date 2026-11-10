import express from "express";
import { Readable, pipeline } from "node:stream";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { getStatus, getHome, getCatalog, getSearch, getSuggest, getDetail, getStreams, proxyStream, MovieError } from "../services/moviebox.js";
import { createMovieDownload, listMovieDownloads, getMovieDownload, retryMovieDownload, pauseMovieDownload, resumeMovieDownload, cancelMovieDownload, streamMovieDownload } from "../services/movie-download-manager.js";
import {
  requireAuth,
  createMovieApiKey,
  listMovieApiKeysForUser,
  revokeMovieApiKey,
  findMovieApiKeyByRawKey,
  getUserProfile,
  getEffectiveMovieApiPlan,
  getMovieApiPlanConfig,
  MOVIE_API_PLANS,
  getMovieApiUsage,
  checkAndIncrementMovieApiUsage,
  setMovieApiCustomAds,
  getEffectiveBonusRequests,
  redeemMovieApiCode,
  isVerificationActive,
  isAdminEmail,
} from "../services/auth.js";

const router = express.Router();
const PUBLIC_BASE = "https://esteamstv.devs.surf";
const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29";
const DEFAULT_AD_NAME = "ES TEAMS TV";
const DEFAULT_AD_LINK = WHATSAPP_CHANNEL_URL;
const rpsLimiters = new Map();
const bonusRedeemLimiter = new SimpleRateLimiter(10, 60 * 1000, (req) => req.uid).middleware();
function rpsLimiter(rate) {
  if (!rpsLimiters.has(rate)) rpsLimiters.set(rate, new SimpleRateLimiter(rate, 1000));
  return rpsLimiters.get(rate);
}
function brandingFor(profile, plan) {
  if (plan.noAds) return { enabled: false, name: null, link: null };
  return {
    enabled: true,
    name: plan.customAdsName && profile?.movieApiCustomAdsName ? profile.movieApiCustomAdsName : DEFAULT_AD_NAME,
    link: plan.customAdsLink && profile?.movieApiCustomAdsUrl ? profile.movieApiCustomAdsUrl : DEFAULT_AD_LINK,
    defaultName: DEFAULT_AD_NAME,
    defaultLink: DEFAULT_AD_LINK,
    adsterra: { enabled: true, placement: "client-side", note: "Use your Adsterra placement on pages that consume this API." },
  };
}
function movieError(res, e, fallback = "Movie API request failed.") {
  if (e instanceof MovieError) return res.status(e.status).json({ error: e.message, code: e.code });
  if (e && Number.isInteger(e.status) && e.status >= 400 && e.status < 500) return res.status(e.status).json({ error: e.message || fallback, code: e.status === 429 ? "rate_limited" : "bad_request" });
  console.error("[movie-api]", e?.message || e);
  return res.status(500).json({ error: fallback, code: "server" });
}
function addBranding(body, req) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return { ...body, branding: req.movieApiBranding, api: { name: "ES TEAMS TV Movie API", docs: `${PUBLIC_BASE}/developers/movie-api` } };
}
async function requireMovieApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) return res.status(401).json({ error: "Missing API key. Pass it in the x-api-key header." });
  try {
    const found = await findMovieApiKeyByRawKey(String(key));
    if (!found) return res.status(401).json({ error: "Invalid or revoked Movie API key." });
    const profile = await getUserProfile(found.uid).catch(() => null);
    const admin = isAdminEmail(profile?.email);
    const plan = admin ? MOVIE_API_PLANS.max : getMovieApiPlanConfig(profile);
    if (!admin && !rpsLimiter(plan.dailyRequests).check(found.id)) return res.status(429).json({ error: "Too many requests. Please slow down." });
    const bonusRequests = getEffectiveBonusRequests(profile, "movieapi");
    const usage = await checkAndIncrementMovieApiUsage(found.uid, plan, bonusRequests, { enforceQuota: !admin });
    if (!admin && !usage.allowed) return res.status(429).json({ error: "Movie API request quota reached for this period.", daily_requests: usage.dailyRequests, daily_limit: usage.dailyRequestsLimit || plan.dailyRequests, weekly_requests: usage.weeklyRequests, weekly_limit: usage.weeklyRequestsLimit || plan.weeklyRequests, monthly_requests: usage.monthlyRequests, monthly_limit: usage.monthlyRequestsLimit || plan.monthlyRequests, bonus_requests: bonusRequests });
    req.movieApiQuotaConsumed = true;
    req.apiKeyId = found.id; req.apiKeyUid = found.uid; req.movieApiProfile = profile; req.movieApiPlan = plan; req.movieApiPlanKey = admin ? "max" : getEffectiveMovieApiPlan(profile); req.movieApiBranding = brandingFor(profile, plan);
    const originalJson = res.json.bind(res);
    res.json = (body) => originalJson(addBranding(body, req));
    next();
  } catch (e) {
    console.error("movie api key check error", e?.message || e);
    res.status(500).json({ error: "Could not verify Movie API key." });
  }
}

router.post("/api/movieapi/keys", requireAuth, async (req, res) => {
  try {
    const plan = getMovieApiPlanConfig(req.userProfile); const keys = await listMovieApiKeysForUser(req.uid);
    if (keys.length >= plan.apiKeys) return res.status(400).json({ error: `Your ${plan.name} plan allows up to ${plan.apiKeys} Movie API key${plan.apiKeys === 1 ? "" : "s"}.` });
    const label = String(req.body?.label || "").trim(); if (!label) return res.status(400).json({ error: "Give the key a name first." });
    const { id, rawKey } = await createMovieApiKey(req.uid, label); res.json({ id, key: rawKey });
  } catch (e) { res.status(500).json({ error: "Could not create Movie API key." }); }
});
router.get("/api/movieapi/keys", requireAuth, async (req, res) => {
  try {
    const planKey = getEffectiveMovieApiPlan(req.userProfile); const plan = MOVIE_API_PLANS[planKey];
    const bonusRequests = getEffectiveBonusRequests(req.userProfile, "movieapi");
    const [keys, usage] = await Promise.all([listMovieApiKeysForUser(req.uid), getMovieApiUsage(req.uid, plan, bonusRequests)]);
    res.set("Cache-Control", "no-store").json({ premiumDiscountRate: isVerificationActive(req.userProfile) ? 0.15 : 0, keys: keys.map((k) => ({ id: k.id, label: k.label, last4: k.last4, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt })), usage, plan: { key: planKey, name: plan.name, apiKeys: plan.apiKeys, dailyRequests: plan.dailyRequests, weeklyRequests: plan.weeklyRequests, monthlyRequests: plan.monthlyRequests, noAds: plan.noAds, customAdsName: plan.customAdsName, customAdsLink: plan.customAdsLink, expiresAt: req.userProfile.movieApiPlanGranted === planKey ? req.userProfile.movieApiPlanGrantExpiresAt || null : planKey === "starter" ? req.userProfile.verifiedExpiresAt || null : req.userProfile.movieApiPlanExpiresAt || null }, movieApiCustomAdsName: req.userProfile.movieApiCustomAdsName || null, movieApiCustomAdsUrl: req.userProfile.movieApiCustomAdsUrl || null });
  } catch (e) { res.status(500).json({ error: "Could not load Movie API keys." }); }
});
router.delete("/api/movieapi/keys/:id", requireAuth, async (req, res) => { try { await revokeMovieApiKey(req.uid, req.params.id); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message || "Could not revoke key." }); } });
router.post("/api/movieapi/custom-ads", requireAuth, async (req, res) => { try { res.json({ ok: true, ...(await setMovieApiCustomAds(req.uid, { name: req.body?.name, url: req.body?.url })) }); } catch (e) { res.status(400).json({ error: e.message || "Could not save custom ads settings." }); } });
router.post("/api/movieapi/bonus-redeem", requireAuth, bonusRedeemLimiter, async (req, res) => {
  try { res.json({ ok: true, ...(await redeemMovieApiCode(req.uid, req.body?.code)) }); }
  catch (e) { res.status(e.status || 400).json({ error: e.message || "Could not redeem bonus code." }); }
});

const api = "/api/v1/movie";
router.get(`${api}/status`, requireMovieApiKey, (req, res) => res.set("Cache-Control", "no-store").json(getStatus()));
router.get(`${api}/home`, requireMovieApiKey, async (req, res) => { try { res.json(await getHome()); } catch (e) { movieError(res, e); } });
router.get(`${api}/catalog/:kind`, requireMovieApiKey, async (req, res) => { try { res.json(await getCatalog(String(req.params.kind), req.query.page, String(req.query.sort || ""))); } catch (e) { movieError(res, e); } });
router.get(`${api}/search`, requireMovieApiKey, async (req, res) => { try { res.json(await getSearch(req.query.q, req.query.page)); } catch (e) { movieError(res, e); } });
router.get(`${api}/suggest`, requireMovieApiKey, async (req, res) => { try { res.json(await getSuggest(req.query.q)); } catch (e) { movieError(res, e); } });
router.get(`${api}/detail/:slug`, requireMovieApiKey, async (req, res) => { try { res.json(await getDetail(String(req.params.slug))); } catch (e) { movieError(res, e); } });
router.get(`${api}/streams/:subjectId`, requireMovieApiKey, async (req, res) => {
  try {
    const subjectId = String(req.params.subjectId); const slug = String(req.query.slug || ""); const se = req.query.se; const ep = req.query.ep;
    const data = await getStreams(subjectId, slug, se, ep);
    const sources = (data.sources || []).map((source) => { const resolution = String(source.resolution || "").replace(/p$/i, ""); const base = `${PUBLIC_BASE}${api}`; const qs = `?slug=${encodeURIComponent(slug)}&se=${encodeURIComponent(se || data.season || 1)}&ep=${encodeURIComponent(ep || data.episode || 1)}&res=${encodeURIComponent(resolution)}`; return { ...source, resolution: source.resolution, playUrl: `${base}/play/${encodeURIComponent(subjectId)}${qs}`, downloadUrl: `${base}/download/${encodeURIComponent(subjectId)}${qs}` }; });
    res.json({ ...data, sources });
  } catch (e) { movieError(res, e); }
});
async function stream(req, res, attachment) {
  try {
    const resolution = String(req.query.res || "").replace(/p$/i, ""); const response = await proxyStream(String(req.params.subjectId), String(req.query.slug || ""), req.query.se, req.query.ep, resolution, req.get("range"));
    res.status(response.status); ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"].forEach((k) => { const v = response.headers.get(k); if (v) res.set(k, v); });
    res.set("X-ES-Teams-TV-Name", req.movieApiBranding.name || DEFAULT_AD_NAME); res.set("X-ES-Teams-TV-Link", req.movieApiBranding.link || DEFAULT_AD_LINK); res.set("Content-Disposition", `${attachment ? "attachment" : "inline"}; filename="es-teams-movie-${resolution}p.mp4"`);
    if (!response.body) return res.end(); return pipeline(Readable.fromWeb(response.body), res, () => {});
  } catch (e) { return movieError(res, e, "Could not start the movie stream."); }
}
router.get(`${api}/play/:subjectId`, requireMovieApiKey, (req, res) => stream(req, res, false));
router.get(`${api}/download/:subjectId`, requireMovieApiKey, (req, res) => stream(req, res, true));
router.post(`${api}/download-jobs`, requireMovieApiKey, async (req, res) => { try { res.status(202).json(await createMovieDownload(req.apiKeyUid, { ...req.body, resolution: String(req.body?.res || req.body?.resolution || "360").replace(/p$/i, "") })); } catch (e) { movieError(res, e, "Could not start that download."); } });
router.get(`${api}/download-jobs`, requireMovieApiKey, async (req, res) => { try { res.json({ jobs: await listMovieDownloads(req.apiKeyUid) }); } catch (e) { movieError(res, e); } });
router.get(`${api}/download-jobs/:id`, requireMovieApiKey, async (req, res) => { const job = await getMovieDownload(req.apiKeyUid, req.params.id); return job ? res.json(job) : res.status(404).json({ error: "Download job not found.", code: "not_found" }); });
router.post(`${api}/download-jobs/:id/retry`, requireMovieApiKey, async (req, res) => { const job = await retryMovieDownload(req.apiKeyUid, req.params.id); return job ? res.json(job) : res.status(404).json({ error: "Download job not found.", code: "not_found" }); });
router.post(`${api}/download-jobs/:id/pause`, requireMovieApiKey, async (req, res) => { const job = await pauseMovieDownload(req.apiKeyUid, req.params.id); return job ? res.json(job) : res.status(404).json({ error: "Download job not found.", code: "not_found" }); });
router.post(`${api}/download-jobs/:id/resume`, requireMovieApiKey, async (req, res) => { const job = await resumeMovieDownload(req.apiKeyUid, req.params.id); return job ? res.json(job) : res.status(404).json({ error: "Download job not found.", code: "not_found" }); });
router.delete(`${api}/download-jobs/:id`, requireMovieApiKey, async (req, res) => { const job = await cancelMovieDownload(req.apiKeyUid, req.params.id); return job ? res.json(job) : res.status(404).json({ error: "Download job not found.", code: "not_found" }); });
router.get(`${api}/download-jobs/:id/file`, requireMovieApiKey, async (req, res) => { const ok = await streamMovieDownload(req.apiKeyUid, req.params.id, res, req.get("range")); if (!ok && !res.headersSent) res.status(409).json({ error: "That download is not ready yet.", code: "download_not_ready" }); });

export { router as movieApiRouter };
