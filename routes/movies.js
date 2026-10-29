import { Readable } from "node:stream";
import { getStatus, getHome, getCatalog, getSearch, getSuggest, getDetail, getStreams, proxyStream, MovieError } from "../services/moviebox.js";

/* Movies API for the /movies page. Browsing needs a signed-in account, but not verification; verification only gates
   higher-resolution downloads below. Data comes from the Moviebox-API through services/moviebox.js. */
export function registerMovieRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, isVerificationActive, isAdminEmail, listMovieWatchLater, getMovieWatchLater, saveMovieWatchLater, removeMovieWatchLater }) {
  if (typeof requireSiteOrigin !== "function") throw new TypeError("The Movies routes require the site's origin guard.");
  const limiter = new SimpleRateLimiter(90, 60 * 1000, (req) => req.uid || req.ip).middleware();

  const send = async (res, work, cache = "private, max-age=60") => {
    try {
      res.set("Cache-Control", cache).json(await work());
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
  router.get("/api/movies/watch-later", requireAuth, limiter, (req, res) => send(res, async () => ({ items: await listMovieWatchLater(req.uid) }), "no-store"));
  router.get("/api/movies/watch-later/:slug", requireAuth, limiter, (req, res) => send(res, async () => ({ saved: await getMovieWatchLater(req.uid, String(req.params.slug || "")) }), "no-store"));
  router.post("/api/movies/watch-later", requireAuth, requireSiteOrigin, limiter, async (req, res) => {
    try {
      const item = await saveMovieWatchLater(req.uid, req.body?.movie || {});
      res.set("Cache-Control", "no-store").json({ ok: true, item });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message || "Could not save that title." });
      console.error("[movies-watch-later] save failed", e && e.message);
      res.status(500).json({ error: "Could not save that title." });
    }
  });
  router.delete("/api/movies/watch-later/:slug", requireAuth, requireSiteOrigin, limiter, async (req, res) => {
    try {
      await removeMovieWatchLater(req.uid, String(req.params.slug || ""));
      res.set("Cache-Control", "no-store").json({ ok: true });
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message || "Could not remove that title." });
      console.error("[movies-watch-later] remove failed", e && e.message);
      res.status(500).json({ error: "Could not remove that title." });
    }
  });
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
      const response = await proxyStream(String(req.params.subjectId), String(req.query.slug || ""), req.query.se, req.query.ep, resolution, req.get("range"));
      res.status(response.status);
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
