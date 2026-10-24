import crypto from "crypto";
import { createWhotHub } from "../services/whot-mp.js";

export function registerWhotRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, chessHub, hub = createWhotHub({ presence: chessHub }) }) {
  const actionLimiter = new SimpleRateLimiter(80, 10 * 1000, (req) => req.uid).middleware();
  const streamLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const voiceLimiter = new SimpleRateLimiter(900, 60 * 1000, (req) => req.uid).middleware();
  const act = (res, fn) => { try { res.set("Cache-Control", "no-store").json(fn() || { ok: true }); } catch (e) { if (e?.code) return res.status(e.code === "no_game" || e.code === "no_room" ? 404 : 400).json({ error: e.message, code: e.code }); console.error("[whot]", e); res.status(500).json({ error: "Something went wrong. Please try again." }); } };
  async function profile(req) { const p = await getUserProfile(req.uid); return { uid: req.uid, username: p?.username || "", name: [p?.firstName, p?.lastName].filter(Boolean).join(" ") || p?.username || "Player", photo: null, verified: false }; }
  router.get("/api/whot/stream", requireAuth, streamLimiter, async (req, res) => { const p = await profile(req); res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" }); res.flushHeaders?.(); res.write("retry: 3000\n\n"); const write = (s) => { res.write(s); res.flush?.(); }; const sink = { send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`), close: () => { try { res.end(); } catch {} } }; const conn = chessHub.connect(req.uid, p, sink); hub.connect(req.uid); const ping = setInterval(() => { try { sink.send("ping", { t: Date.now() }); } catch {} }, 8000); let done = false; const close = () => { if (done) return; done = true; clearInterval(ping); chessHub.disconnect(req.uid, conn); }; req.on("close", close); res.on("close", close); });
  router.post("/api/whot/room", requireAuth, requireSiteOrigin, actionLimiter, async (req, res) => { if (hub.isBusy(req.uid)) return res.status(400).json({ error: "Finish your current Whot game first." }); act(res, () => hub.room(req.uid)); });
  router.post("/api/whot/join", requireAuth, requireSiteOrigin, actionLimiter, (req, res) => act(res, () => hub.join(req.uid, req.body?.code)));
  router.post("/api/whot/game/:id/start", requireAuth, requireSiteOrigin, actionLimiter, (req, res) => act(res, () => hub.start(req.uid, req.params.id, req.body?.key)));
  router.post("/api/whot/game/:id/play", requireAuth, requireSiteOrigin, actionLimiter, (req, res) => act(res, () => hub.play(req.uid, req.params.id, req.body?.key, req.body?.cardId, req.body?.suit)));
  router.post("/api/whot/game/:id/draw", requireAuth, requireSiteOrigin, actionLimiter, (req, res) => act(res, () => hub.draw(req.uid, req.params.id, req.body?.key)));
  router.post("/api/whot/game/:id/state", requireAuth, actionLimiter, (req, res) => act(res, () => hub.view(req.uid, req.params.id, req.body?.key)));
  router.get("/api/whot/ice", requireAuth, voiceLimiter, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.post("/api/whot/game/:id/voice/join", requireAuth, requireSiteOrigin, voiceLimiter, (req, res) => act(res, () => hub.voiceJoin(req.uid, req.params.id, req.body?.key)));
  router.post("/api/whot/game/:id/voice/signal", requireAuth, requireSiteOrigin, voiceLimiter, (req, res) => act(res, () => hub.onSignal(req.uid, req.params.id, req.body?.key, req.body?.to, req.body?.data)));
  return hub;
}
