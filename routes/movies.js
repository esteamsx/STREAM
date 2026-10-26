import { getStatus, getHome, getCatalog, getSearch, getSuggest, getDetail, MovieError } from "../services/moviebox.js";

/* Movies API for the /movies page. Everything needs a signed-in account, and the data comes from the Moviebox-API
   through services/moviebox.js (see that file for the one setting it needs: MOVIEBOX_API_URL). */
export function registerMovieRoutes(router, { requireAuth, SimpleRateLimiter }) {
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
  router.get("/api/movies/detail/:slug", requireAuth, limiter, (req, res) => send(res, () => getDetail(String(req.params.slug))));
}
