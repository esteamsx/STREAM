import crypto from "crypto";
import { createWhotHub } from "../services/whot-mp.js";

/* Whot API. Presence and the event stream are shared with chess (/api/chess/stream), so a signed-in
   player is online for Whot on every page. Whot has no guest links: you need an account to play online. */
export function registerWhotRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, searchUsersByUsername, chessHub, hub = createWhotHub({ chess: chessHub }) }) {
  const photoFor = (uid, p) => {
    if (!p || p.showProfilePhoto === false || !p.photoURL) return null;
    const url = String(p.photoURL);
    if (url.startsWith("data:")) {
      const v = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
      return `/api/chess/avatar/${encodeURIComponent(uid)}?v=${v}`;
    }
    return /^https:\/\//i.test(url) ? url : null;
  };
  const voiceLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const specLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const readLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();
  const challengeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const moveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => req.uid).middleware();

  const act = (res, fn) => {
    try {
      res.set("Cache-Control", "no-store").json(fn() || { ok: true });
    } catch (e) {
      if (e && e.code && e instanceof hub.HubError) {
        const status = e.code === "no_game" || e.code === "no_challenge" ? 404 : e.code === "bad_key" ? 403 : 400;
        return res.status(status).json({ error: e.message, code: e.code });
      }
      console.error("[whot]", e && e.message);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };

  /* ---- who is online ---- */
  router.get("/api/whot/online", requireAuth, readLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const q = String(req.query.q || "").trim().slice(0, 30);
      let list = chessHub.online(req.uid, q);
      if (q.length >= 2 && list.length < 20) {
        const found = await searchUsersByUsername(q, req.uid, 10).catch(() => []);
        const seen = new Set(list.map((p) => p.uid));
        const extra = found.filter((u) => !seen.has(u.uid)).map((u) => ({ uid: u.uid, username: u.username || "", name: [u.firstName, u.lastName].filter(Boolean).join(" "), photo: photoFor(u.uid, u), verified: !!u.verified }));
        list.push(...chessHub.annotate(extra));
      }
      list = list.map((p) => ({ ...p, status: p.status === "offline" ? "offline" : hub.isBusy(p.uid) ? "playing" : "available" }));
      res.json({ players: list.slice(0, 50) });
    } catch {
      res.status(500).json({ error: "Could not load players." });
    }
  });

  router.post("/api/whot/challenge", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.challenge(req.uid, { toUid: String(b.toUid || ""), size: b.size }));
  });
  router.post("/api/whot/table/start", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.startTableNow(req.uid)));
  router.post("/api/whot/table/leave", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.leaveTable(req.uid)));
  router.post("/api/whot/challenge/:id/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.cancelChallenge(req.uid, req.params.id));
  });
  router.post("/api/whot/challenge/:id/respond", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.respond(req.uid, req.params.id, !!(req.body || {}).accept));
  });

  const guard = [requireAuth, requireSiteOrigin, moveLimiter];
  const prefix = "/api/whot";
  router.post(prefix + "/game/:id/play", ...guard, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.play(req.uid, req.params.id, b.key, b.card, typeof b.shape === "string" ? b.shape : undefined, !!b.call));
  });
  router.post(prefix + "/game/:id/draw", ...guard, (req, res) => act(res, () => hub.draw(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/call", ...guard, (req, res) => act(res, () => hub.call(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/resign", ...guard, (req, res) => act(res, () => hub.resign(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/state", ...guard, (req, res) => act(res, () => hub.syncState(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/room", ...guard, (req, res) => act(res, () => hub.getRoom(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/room/settings", ...guard, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.setRoom(req.uid, req.params.id, b.key, { open: b.open, pin: b.pin, max: b.max }));
  });
  router.post(prefix + "/game/:id/voice/join", ...guard, voiceLimiter, (req, res) => act(res, () => hub.voiceJoin(req.uid, req.params.id, (req.body || {}).key)));
  router.post(prefix + "/game/:id/voice/signal", ...guard, voiceLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.voiceSignal(req.uid, req.params.id, b.key, b.to, b.data));
  });

  router.get("/api/whot/ice", requireAuth, voiceLimiter, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.post("/api/whot/spectate", requireAuth, requireSiteOrigin, specLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.spectate(req.uid, b.code, b.pin));
  });
  router.post("/api/whot/spectate/leave", requireAuth, requireSiteOrigin, specLimiter, (req, res) => act(res, () => hub.leaveSpectate(req.uid)));

  const timer = setInterval(() => {
    try { hub.sweep(); } catch (e) { console.error("[whot] sweep", e && e.message); }
  }, 1000);
  if (timer.unref) timer.unref();
  return hub;
}
