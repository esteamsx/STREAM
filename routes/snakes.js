import crypto from "crypto";
import { createSnakesHub } from "../services/snakes-mp.js";

/* Snakes and Ladders API. Presence and the event stream are shared with chess (/api/chess/stream), so a signed-in
   player is online for Snakes and Ladders on every page. Guest links are single-use and guests get a scoped session. */
export function registerSnakesRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, searchUsersByUsername, creditCompetitiveGameWin, chessHub, persistence = null, hub = createSnakesHub({ chess: chessHub, persistence }) }) {
  const photoFor = (uid, p) => {
    if (!p || p.showProfilePhoto === false || !p.photoURL) return null;
    const url = String(p.photoURL);
    if (url.startsWith("data:")) {
      const v = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
      return `/api/chess/avatar/${encodeURIComponent(uid)}?v=${v}`;
    }
    return /^https:\/\//i.test(url) ? url : null;
  };
  const voiceLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.uid || (req.guest && req.guest.uid) || req.ip).middleware();
  const specLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const readLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();
  const challengeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const moveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => req.uid).middleware();
  const rewardLimiter = new SimpleRateLimiter(8, 10 * 60 * 1000, (req) => req.uid, "Slow down a little.").middleware();

  const guests = new Map();   // guestUid -> { secret, name, token, createdAt }
  const links = new Map();    // token -> guest game link
  const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
  const LINK_AFTER_END_MS = 5 * 60 * 1000;
  const MAX_OPEN_LINKS = 3;
  const GUEST_COOKIE = "sx_guest";
  const guestIpLimiter = new SimpleRateLimiter(40, 60 * 1000, (req) => req.ip).middleware();
  const guestJoinLimiter = new SimpleRateLimiter(8, 10 * 60 * 1000, (req) => req.ip, "Too many tries. Give it a few minutes.").middleware();
  const guestMoveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => (req.guest && req.guest.uid) || req.ip).middleware();

  const linkStatus = (l) => {
    if (l.status === "open" && Date.now() > l.expiresAt) return "expired";
    if (l.status === "ended") return l.endedAt && Date.now() - l.endedAt <= LINK_AFTER_END_MS && l.result ? "finished" : "expired";
    return l.status;
  };
  const linkView = (l) => ({ token: l.token, status: linkStatus(l), expiresAt: l.expiresAt, createdAt: l.createdAt });
  const linkByGame = (gameId) => { for (const l of links.values()) if (l.gameId === gameId) return l; return null; };
  hub.setOnGameOver((game) => {
    const l = linkByGame(game.id);
    if (l) { l.status = "ended"; l.endedAt = Date.now(); l.result = { winner: game.result ? game.result.winner : null, reason: game.result ? game.result.reason : null }; }
  });

  function readGuest(req) {
    const raw = String((req.cookies && req.cookies[GUEST_COOKIE]) || "");
    const at = raw.indexOf(".");
    if (at < 1) return null;
    const uid = raw.slice(0, at), secret = raw.slice(at + 1);
    const g = guests.get(uid);
    if (!g) return null;
    const a = Buffer.from(g.secret), b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { uid, ...g };
  }
  function requireGuest(req, res, next) {
    const g = readGuest(req);
    if (!g) return res.status(401).json({ error: "This game session is not valid. Open the game link again.", code: "no_guest" });
    req.guest = g;
    next();
  }
  const act = (res, fn) => {
    try { res.set("Cache-Control", "no-store").json(fn() || { ok: true }); }
    catch (e) {
      if (e && e.code && e instanceof hub.HubError) {
        const status = e.code === "no_game" || e.code === "no_challenge" ? 404 : e.code === "bad_key" ? 403 : 400;
        return res.status(status).json({ error: e.message, code: e.code });
      }
      console.error("[snakes]", e && e.message);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };

  router.get("/api/snakes/online", requireAuth, readLimiter, async (req, res) => {
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
    } catch { res.status(500).json({ error: "Could not load players." }); }
  });

  router.post("/api/snakes/challenge", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.challenge(req.uid, { toUid: String(b.toUid || ""), size: b.size }));
  });
  router.post("/api/snakes/table/start", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.startTableNow(req.uid)));
  router.post("/api/snakes/table/leave", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.leaveTable(req.uid)));
  router.post("/api/snakes/challenge/:id/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.cancelChallenge(req.uid, req.params.id)));
  router.post("/api/snakes/challenge/:id/respond", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => act(res, () => hub.respond(req.uid, req.params.id, !!(req.body || {}).accept)));

  function gameRoutes(prefix, uidOf, guards) {
    router.post(prefix + "/game/:id/roll", ...guards, (req, res) => act(res, () => hub.roll(uidOf(req), req.params.id, (req.body || {}).key)));
    router.post(prefix + "/game/:id/resign", ...guards, (req, res) => act(res, () => hub.resign(uidOf(req), req.params.id, (req.body || {}).key)));
    router.post(prefix + "/game/:id/state", ...guards, (req, res) => act(res, () => hub.syncState(uidOf(req), req.params.id, (req.body || {}).key)));
    router.post(prefix + "/game/:id/room", ...guards, (req, res) => act(res, () => hub.getRoom(uidOf(req), req.params.id, (req.body || {}).key)));
    router.post(prefix + "/game/:id/room/settings", ...guards, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.setRoom(uidOf(req), req.params.id, b.key, { open: b.open, pin: b.pin, max: b.max }));
    });
    router.post(prefix + "/game/:id/voice/join", ...guards, voiceLimiter, (req, res) => act(res, () => hub.voiceJoin(uidOf(req), req.params.id, (req.body || {}).key)));
    router.post(prefix + "/game/:id/voice/signal", ...guards, voiceLimiter, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.voiceSignal(uidOf(req), req.params.id, b.key, b.to, b.data));
    });
  }
  gameRoutes("/api/snakes", (req) => req.uid, [requireAuth, requireSiteOrigin, moveLimiter]);
  gameRoutes("/api/snakes/guest", (req) => req.guest.uid, [requireSiteOrigin, guestMoveLimiter, requireGuest]);

  router.post("/api/snakes/game/:id/reward", requireAuth, requireSiteOrigin, rewardLimiter, async (req, res) => {
    const proof = hub.rewardableWin(req.uid, req.params.id);
    if (!proof) return res.set("Cache-Control", "no-store").json({ rewarded: false, coins: 0 });
    try {
      const paid = await creditCompetitiveGameWin(req.uid, "snakes_ladders", proof.gameId, proof.participantUids);
      res.set("Cache-Control", "no-store").json({ ...paid, message: paid.rewarded ? "+1 coin for your Snakes and Ladders win!" : "This match is not eligible for another coin reward." });
    } catch (e) {
      console.error("[snakes] reward", e && e.message);
      res.status(e.status || 500).set("Cache-Control", "no-store").json({ error: e.message || "Could not credit this reward." });
    }
  });

  router.get("/api/snakes/ice", requireAuth, voiceLimiter, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.get("/api/snakes/guest/ice", guestIpLimiter, requireGuest, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.post("/api/snakes/spectate", requireAuth, requireSiteOrigin, specLimiter, (req, res) => act(res, () => (chessHub.isAdminEmail && chessHub.isAdminEmail(req.userProfile?.email) ? hub.adminSpectate(req.uid, (req.body || {}).code) : hub.spectate(req.uid, (req.body || {}).code, (req.body || {}).pin))));
  router.post("/api/snakes/spectate/leave", requireAuth, requireSiteOrigin, specLimiter, (req, res) => act(res, () => hub.leaveSpectate(req.uid)));

  router.post("/api/snakes/guest/links", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    let open = 0;
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) open++;
    if (open >= MAX_OPEN_LINKS) return res.status(400).json({ error: "You already have " + MAX_OPEN_LINKS + " active guest links. Cancel one first." });
    const token = crypto.randomBytes(9).toString("base64url");
    const now = Date.now();
    const link = { token, hostUid: req.uid, createdAt: now, expiresAt: now + LINK_LIFETIME_MS, status: "open", guestUid: null, gameId: null, endedAt: null, result: null };
    links.set(token, link);
    res.set("Cache-Control", "no-store").json({ link: linkView(link) });
  });
  router.get("/api/snakes/guest/links", requireAuth, readLimiter, (req, res) => {
    const mine = [];
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) mine.push(linkView(l));
    mine.sort((a, b) => b.createdAt - a.createdAt);
    res.set("Cache-Control", "no-store").json({ links: mine });
  });
  router.post("/api/snakes/guest/links/:token/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const l = links.get(String(req.params.token));
    if (!l || l.hostUid !== req.uid) return res.status(404).json({ error: "That link was not found." });
    if (l.status === "open") { l.status = "ended"; l.endedAt = Date.now(); }
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  function sendPhoto(res, p) {
    const m = p && p.showProfilePhoto !== false && /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(p.photoURL || ""));
    if (!m) return res.status(404).end();
    res.set({ "Content-Type": m[1], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(m[2], "base64"));
  }
  router.get("/api/snakes/guest/info/:token", guestIpLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.json({ status: "ended" });
    const status = linkStatus(l), me = readGuest(req), you = !!(me && l.guestUid === me.uid);
    const out = { status, expiresAt: l.expiresAt, you };
    if (status === "finished") out.result = l.result;
    if (status === "open" || (status === "playing" && you)) {
      try {
        const host = await getUserProfile(l.hostUid);
        if (host) {
          const profilePhoto = photoFor(l.hostUid, host);
          const photo = profilePhoto && profilePhoto.startsWith("/api/chess/avatar/")
            ? `/api/snakes/guest/avatar/${encodeURIComponent(l.token)}`
            : profilePhoto;
          out.host = { name: [host.firstName, host.lastName].filter(Boolean).join(" ") || host.username || "", username: host.username || "", photo };
        }
      } catch { /* game remains available without host details */ }
    }
    res.json(out);
  });
  router.get("/api/snakes/guest/avatar/:token", guestIpLimiter, async (req, res) => {
    try {
      const l = links.get(String(req.params.token || ""));
      if (!l) return res.status(404).end();
      sendPhoto(res, await getUserProfile(l.hostUid));
    } catch { res.status(404).end(); }
  });
  router.post("/api/snakes/guest/join/:token", requireSiteOrigin, guestJoinLimiter, (req, res) => {
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.status(404).json({ error: "This game session has ended.", code: "ended" });
    const status = linkStatus(l), existing = readGuest(req);
    if (existing && l.guestUid === existing.uid && status === "playing") return res.json({ ok: true });
    if (status !== "open") return res.status(409).json({ error: status === "playing" ? "Someone is already playing on this link." : "This game session has ended.", code: status });
    const name = String((req.body || {}).name || "").replace(/[^\p{L}\p{N} _.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
    if (name.length < 2) return res.status(400).json({ error: "Enter a name (at least 2 letters)." });
    if (!hub.isOnline(l.hostUid)) return res.status(409).json({ error: "The host is not online right now. Try again in a moment.", code: "host_offline" });
    if (hub.isBusy(l.hostUid)) return res.status(409).json({ error: "The host is in another game right now. Try again in a moment.", code: "host_busy" });
    const uid = "guest_" + crypto.randomBytes(8).toString("hex"), secret = crypto.randomBytes(18).toString("hex");
    guests.set(uid, { secret, name, token: l.token, createdAt: Date.now() });
    l.guestUid = uid; l.status = "playing";
    const secure = req.secure || String(req.get("x-forwarded-proto") || "").split(",")[0].trim() === "https";
    res.cookie(GUEST_COOKIE, uid + "." + secret, { httpOnly: true, sameSite: "lax", secure, maxAge: 12 * 60 * 60 * 1000, path: "/api/snakes/guest" });
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  function startGuestGame(guest) {
    const l = links.get(guest.token);
    if (!l || l.guestUid !== guest.uid || l.status === "ended" || l.gameId) return;
    if (hub.isBusy(guest.uid)) return;
    l.gameId = hub.startDirect(l.hostUid, guest.uid);
  }
  router.get("/api/snakes/guest/stream", guestIpLimiter, requireGuest, (req, res) => {
    try {
      const g = req.guest, l = links.get(g.token);
      if (!l || !["playing", "ended"].includes(l.status)) return res.status(410).json({ error: "This game session has ended.", code: "ended" });
      if (chessHub.connectionCount(g.uid) >= 2) return res.status(429).json({ error: "Too many open tabs." });
      res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      if (res.flushHeaders) res.flushHeaders();
      res.write("retry: 3000\n\n");
      const write = (text) => { res.write(text); if (typeof res.flush === "function") res.flush(); };
      const sink = { send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) };
      const profile = { uid: g.uid, username: g.name, name: g.name, photo: null, verified: false, guest: true };
      const connId = chessHub.connect(g.uid, profile, sink);
      if (!l.gameId) {
        try { startGuestGame(g); }
        catch (e) { sink.send("snakes_guest_wait", { message: (e && e.message) || "Waiting for the host." }); }
      }
      const ping = setInterval(() => { try { sink.send("ping", { t: Date.now() }); } catch { /* close handler cleans up */ } }, 8000);
      let closed = false;
      const done = () => { if (closed) return; closed = true; clearInterval(ping); chessHub.disconnect(g.uid, connId); };
      req.on("close", () => { if (res.destroyed || res.writableEnded || req.destroyed || (req.socket && req.socket.destroyed)) done(); });
      res.on("close", done); res.on("error", done);
      if (req.socket) req.socket.on("close", done);
    } catch (e) { if (!res.headersSent) res.status(500).json({ error: "Could not connect." }); }
  });
  router.post("/api/snakes/guest/start", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => act(res, () => { startGuestGame(req.guest); return { ok: true }; }));

  const timer = setInterval(() => {
    try { hub.sweep(); } catch (e) { console.error("[snakes] sweep", e && e.message); }
    const t = Date.now();
    for (const [token, l] of links) {
      const status = linkStatus(l);
      const doneAt = l.status === "ended" ? l.endedAt || t : status === "expired" ? l.expiresAt : 0;
      if (doneAt && t - doneAt > 60 * 60 * 1000) { links.delete(token); if (l.guestUid) guests.delete(l.guestUid); }
    }
  }, 1000);
  if (timer.unref) timer.unref();
  return hub;
}
