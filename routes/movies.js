import { Readable } from "node:stream";
import { getStatus, getHome, getCatalog, getSearch, getSuggest, getDetail, getStreams, proxyStream, MovieError } from "../services/moviebox.js";

/* Movies API for the /movies page. Everything needs a signed-in account, and the data comes from the Moviebox-API
   through services/moviebox.js (see that file for the one setting it needs: MOVIEBOX_API_URL). */
export function registerMovieRoutes(router, { requireAuth, SimpleRateLimiter, getUserProfile, isVerificationActive, isAdminEmail }) {
  const limiter = new SimpleRateLimiter(90, 60 * 1000, (req) => req.uid || req.ip).middleware();

  const send = async (res, work) => {
    try {
      res.set("Cache-Control", "private, max-age=60").json(await work());
    } catch (e) {
      if (e instanceof MovieError) return res.status(e.status).json({ error: e.message, code: e.code });
      console.error("[movies]", e && e.message);
      res.status(500).json({ error: "Something went wrong. Please try again.", code: "server" });
    }
  };

  router.get("/api/movies/status", requireAuth, limiter, (req, res) => res.set("Cache-Control", "no-store").json(getStatus()));
  router.get("/api/movies/home", requireAuth, limiter, (req, res) => send(res, () => getHome()));
  router.get("/api/movies/catalog/:kind", requireAuth, limiter, (req, res) => send(res, () => getCatalog(String(req.params.kind), req.query.page, String(req.query.sort || ""))));
  router.get("/api/movies/search", requireAuth, limiter, (req, res) => send(res, () => getSearch(req.query.q, req.query.page)));
  router.get("/api/movies/suggest", requireAuth, limiter, (req, res) => send(res, () => getSuggest(req.query.q)));
  async function premiumFor(req) {
    const profile = req.userProfile || (getUserProfile ? await getUserProfile(req.uid) : null);
    return !!(profile && ((isVerificationActive && isVerificationActive(profile)) || (isAdminEmail && isAdminEmail(profile.email))));
  }
  router.get("/api/movies/detail/:slug", requireAuth, limiter, (req, res) => send(res, () => getDetail(String(req.params.slug))));
  router.get("/api/movies/streams/:subjectId", requireAuth, limiter, async (req, res) => {
    try {
      const premium = await premiumFor(req);
      const subjectId = String(req.params.subjectId), slug = String(req.query.slug || "");
      const se = req.query.se, ep = req.query.ep;
      const data = await getStreams(subjectId, slug, se, ep);
      const sources = (data.sources || []).map((source) => {
        const resolution = String(source.resolution || "").replace(/p$/i, "");
        const free = resolution === "360";
        const allowed = premium || free;
        return {
          resolution: source.resolution, format: source.format, size: source.size,
          premium: !free, available: allowed,
          downloadUrl: allowed ? "/api/movies/download/" + encodeURIComponent(subjectId) + "?slug=" + encodeURIComponent(slug) + "&se=" + encodeURIComponent(se || data.season || 1) + "&ep=" + encodeURIComponent(ep || data.episode || 1) + "&res=" + encodeURIComponent(resolution) : null,
        };
      });
      res.set("Cache-Control", "private, max-age=30").json({ ...data, premium, sources });
    } catch (e) { return send(res, () => Promise.reject(e)); }
  });
  router.get("/api/movies/download/:subjectId", requireAuth, limiter, async (req, res) => {
    try {
      const premium = await premiumFor(req);
      const resolution = String(req.query.res || "").replace(/p$/i, "");
      if (!premium && resolution !== "360") return res.status(403).json({ error: "Higher resolutions require Premium.", code: "premium_required" });
      const response = await proxyStream(String(req.params.subjectId), String(req.query.slug || ""), req.query.se, req.query.ep, resolution);
      ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"].forEach((key) => { const value = response.headers.get(key); if (value) res.set(key, value); });
      res.set("Content-Disposition", 'attachment; filename="es-teams-movie-' + resolution + 'p.mp4"');
      if (!response.body) return res.end();
      return Readable.fromWeb(response.body).pipe(res);
    } catch (e) {
      if (e instanceof MovieError) {
        if (e.code === "rate_limited") return res.status(429).json({ error: "ES Teams TV is preparing your download. Please try again shortly.", code: "download_busy" });
        if (e.code === "upstream" || e.code === "upstream_unavailable" || e.code === "not_configured") return res.status(e.code === "upstream_unavailable" ? 503 : 502).json({ error: "ES Teams TV could not prepare this download right now. Please try again shortly.", code: "download_unavailable" });
        if (e.code === "bad_request") return res.status(400).json({ error: "That download selection is not available.", code: "download_unavailable" });
      }
      return res.status(502).json({ error: "ES Teams TV could not prepare this download right now. Please try again shortly.", code: "download_unavailable" });
    }
  });
}
