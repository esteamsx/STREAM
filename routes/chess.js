import { createChessHub } from "../services/chess-mp.js";

const MAX_TABS = 4;

export function registerChessRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, searchUsersByUsername, isVerificationActive, hub = createChessHub() }) {
  const readLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();
  const challengeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const moveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => req.uid).middleware();
  const streamLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();

  const cleanPhoto = (url) => (url && !(String(url).startsWith("data:") && String(url).length > 4000) ? String(url) : null);
  const profileFor = (uid, p) => ({
    uid,
    username: p.username || "",
    name: [p.firstName, p.lastName].filter(Boolean).join(" "),
    photo: p.showProfilePhoto === false ? null : cleanPhoto(p.photoURL),
    verified: !!(isVerificationActive && isVerificationActive(p)),
  });

  const act = (res, fn) => {
    try {
      res.set("Cache-Control", "no-store").json(fn() || { ok: true });
    } catch (e) {
      if (e && e.code && hub.HubError && e instanceof hub.HubError) {
        const status = e.code === "no_game" || e.code === "no_challenge" ? 404 : e.code === "bad_key" ? 403 : 400;
        return res.status(status).json({ error: e.message, code: e.code });
      }
      console.error("[chess]", e && e.message);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };

  router.get("/api/chess/stream", requireAuth, streamLimiter, async (req, res) => {
    try {
      const profile = await getUserProfile(req.uid);
      if (!profile) return res.status(401).json({ error: "not_authenticated" });
      if (hub.connectionCount(req.uid) >= MAX_TABS) return res.status(429).json({ error: "Too many open chess tabs. Close one and try again." });
      res.status(200).set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      if (res.flushHeaders) res.flushHeaders();
      res.write("retry: 3000\n\n");
      const write = (text) => { res.write(text); if (typeof res.flush === "function") res.flush(); };
      const sink = { send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) };
      const connId = hub.connect(req.uid, profileFor(req.uid, profile), sink);
      const ping = setInterval(() => { try { write(": ping\n\n"); } catch { /* the close handler cleans up */ } }, 20000);
      let closed = false;
      const done = () => { if (closed) return; closed = true; clearInterval(ping); hub.disconnect(req.uid, connId); };
      req.on("close", () => { if (res.destroyed || res.writableEnded || req.destroyed || (req.socket && req.socket.destroyed)) done(); });
      res.on("close", done);
      res.on("error", done);
      if (req.socket) req.socket.on("close", done);
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: "Could not connect." });
    }
  });

  router.get("/api/chess/online", requireAuth, readLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const q = String(req.query.q || "").trim().slice(0, 30);
      const list = hub.online(req.uid, q);
      if (q.length >= 2 && list.length < 20) {
        const found = await searchUsersByUsername(q, req.uid, 10).catch(() => []);
        const seen = new Set(list.map((p) => p.uid));
        const extra = found.filter((u) => !seen.has(u.uid)).map((u) => ({ uid: u.uid, username: u.username || "", name: [u.firstName, u.lastName].filter(Boolean).join(" "), photo: u.showProfilePhoto === false ? null : cleanPhoto(u.photoURL), verified: !!u.verified }));
        list.push(...hub.annotate(extra));
      }
      res.json({ players: list.slice(0, 50) });
    } catch {
      res.status(500).json({ error: "Could not load players." });
    }
  });

  router.post("/api/chess/challenge", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.challenge(req.uid, { toUid: b.toUid, color: b.color, minutes: b.minutes }));
  });
  router.post("/api/chess/challenge/:id/respond", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.respond(req.uid, req.params.id, !!(req.body && req.body.accept)));
  });
  router.post("/api/chess/challenge/:id/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.cancelChallenge(req.uid, req.params.id));
  });

  router.post("/api/chess/game/:id/move", requireAuth, requireSiteOrigin, moveLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.move(req.uid, req.params.id, b.key, { from: b.from, to: b.to, promotion: b.promotion }));
  });
  router.post("/api/chess/game/:id/resign", requireAuth, requireSiteOrigin, moveLimiter, (req, res) => {
    act(res, () => hub.resign(req.uid, req.params.id, (req.body || {}).key));
  });
  router.post("/api/chess/game/:id/draw", requireAuth, requireSiteOrigin, moveLimiter, (req, res) => {
    act(res, () => hub.offerDraw(req.uid, req.params.id, (req.body || {}).key));
  });
  router.post("/api/chess/game/:id/draw/respond", requireAuth, requireSiteOrigin, moveLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.respondDraw(req.uid, req.params.id, b.key, !!b.accept));
  });

  const timer = setInterval(() => { try { hub.sweep(); } catch (e) { console.error("[chess] sweep", e && e.message); } }, 1000);
  if (timer.unref) timer.unref();
  return hub;
}
