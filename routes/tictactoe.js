import crypto from "crypto";
import { createTttHub } from "../services/ttt-mp.js";

/* Tic-Tac-Toe API. Presence and the event stream are shared with chess (/api/chess/stream), so a signed-in
   player is online for Tic-Tac-Toe on every page. Guests join through one-use, scoped invitation links. */
export function registerTttRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, searchUsersByUsername, chessHub, hub = createTttHub({ chess: chessHub }) }) {
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
  const guestIpLimiter = new SimpleRateLimiter(40, 60 * 1000, (req) => req.ip).middleware();
  const guestJoinLimiter = new SimpleRateLimiter(8, 10 * 60 * 1000, (req) => req.ip, "Too many tries. Give it a few minutes.").middleware();
  const guestMoveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => (req.guest && req.guest.uid) || req.ip).middleware();
  const guestCookieName = (token) => "ttt_guest_" + String(token || "");
  const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
  const LINK_AFTER_END_MS = 5 * 60 * 1000;
  const MAX_OPEN_LINKS = 3;
  const guests = new Map();
  const links = new Map();
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

  function readGuest(req, token = req.query && req.query.invite) {
    token = String(token || "");
    if (!/^[A-Za-z0-9_-]{6,40}$/.test(token)) return null;
    const raw = String((req.cookies && req.cookies[guestCookieName(token)]) || "");
    const at = raw.indexOf(".");
    if (at < 1) return null;
    const uid = raw.slice(0, at), secret = raw.slice(at + 1);
    const guest = guests.get(uid);
    if (!guest || guest.token !== token) return null;
    const a = Buffer.from(guest.secret), b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    return { uid, ...guest };
  }
  function requireGuest(req, res, next) {
    const guest = readGuest(req);
    if (!guest) return res.status(401).json({ error: "This game session is not valid. Open the game link again.", code: "no_guest" });
    req.guest = guest;
    next();
  }

  const act = (res, fn) => {
    try {
      res.set("Cache-Control", "no-store").json(fn() || { ok: true });
    } catch (e) {
      if (e && e.code && e instanceof hub.HubError) {
        const status = e.code === "no_game" || e.code === "no_challenge" ? 404 : e.code === "bad_key" ? 403 : 400;
        return res.status(status).json({ error: e.message, code: e.code });
      }
      console.error("[ttt]", e && e.message);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  };

  /* ---- who is online ---- */
  router.get("/api/tictactoe/online", requireAuth, readLimiter, async (req, res) => {
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

  router.post("/api/tictactoe/challenge", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.challenge(req.uid, { toUid: String(b.toUid || "") }));
  });
  router.post("/api/tictactoe/challenge/:id/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.cancelChallenge(req.uid, req.params.id));
  });
  router.post("/api/tictactoe/challenge/:id/respond", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    act(res, () => hub.respond(req.uid, req.params.id, !!(req.body || {}).accept));
  });

  function gameRoutes(prefix, uidOf, guards) {
    router.post(prefix + "/game/:id/move", ...guards, (req, res) => act(res, () => hub.move(uidOf(req), req.params.id, (req.body || {}).key, (req.body || {}).cell)));
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
  gameRoutes("/api/tictactoe", (req) => req.uid, [requireAuth, requireSiteOrigin, moveLimiter]);
  gameRoutes("/api/tictactoe/guest", (req) => req.guest.uid, [requireSiteOrigin, requireGuest, guestMoveLimiter]);

  router.post("/api/tictactoe/guest/links", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    let open = 0;
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) open++;
    if (open >= MAX_OPEN_LINKS) return res.status(400).json({ error: "You already have " + MAX_OPEN_LINKS + " active guest links. Cancel one first." });
    const token = crypto.randomBytes(9).toString("base64url");
    const now = Date.now();
    const link = { token, hostUid: req.uid, createdAt: now, expiresAt: now + LINK_LIFETIME_MS, status: "open", guestUid: null, gameId: null, endedAt: null, result: null };
    links.set(token, link);
    res.set("Cache-Control", "no-store").json({ link: linkView(link) });
  });

  router.get("/api/tictactoe/guest/links", requireAuth, readLimiter, (req, res) => {
    const mine = [];
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) mine.push(linkView(l));
    mine.sort((a, b) => b.createdAt - a.createdAt);
    res.set("Cache-Control", "no-store").json({ links: mine });
  });

  router.post("/api/tictactoe/guest/links/:token/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const l = links.get(String(req.params.token));
    if (!l || l.hostUid !== req.uid) return res.status(404).json({ error: "That link was not found." });
    if (l.status === "open") { l.status = "ended"; l.endedAt = Date.now(); }
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  function sendPhoto(res, profile) {
    const m = profile && profile.showProfilePhoto !== false && /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(profile.photoURL || ""));
    if (!m) return res.status(404).end();
    res.set({ "Content-Type": m[1], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(m[2], "base64"));
  }

  router.get("/api/tictactoe/guest/info/:token", guestIpLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.json({ status: "ended" });
    const status = linkStatus(l);
    const guest = readGuest(req, l.token);
    const you = !!(guest && l.guestUid === guest.uid);
    const out = { status, expiresAt: l.expiresAt, you };
    if (you) out.youName = guest.name;
    if (status === "finished") out.result = l.result;
    if (status === "open" || (status === "playing" && you)) {
      try {
        const host = await getUserProfile(l.hostUid);
        if (host) {
          const profilePhoto = photoFor(l.hostUid, host);
          const photo = profilePhoto && profilePhoto.startsWith("/api/chess/avatar/")
            ? `/api/tictactoe/guest/avatar/${encodeURIComponent(l.token)}`
            : profilePhoto;
          out.host = { name: [host.firstName, host.lastName].filter(Boolean).join(" ") || host.username || "", username: host.username || "", photo };
        }
      } catch { /* the name prompt still works without profile details */ }
    }
    res.json(out);
  });

  router.get("/api/tictactoe/guest/avatar/:token", guestIpLimiter, async (req, res) => {
    try {
      const l = links.get(String(req.params.token || ""));
      if (!l) return res.status(404).end();
      sendPhoto(res, await getUserProfile(l.hostUid));
    } catch { res.status(404).end(); }
  });

  router.post("/api/tictactoe/guest/join/:token", requireSiteOrigin, guestJoinLimiter, (req, res) => {
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.status(404).json({ error: "This game session has ended.", code: "ended" });
    const status = linkStatus(l);
    const existing = readGuest(req, l.token);
    if (existing && l.guestUid === existing.uid && status === "playing") return res.json({ ok: true });
    if (status !== "open") return res.status(409).json({ error: status === "playing" ? "Someone is already playing on this link." : "This game session has ended.", code: status });
    const name = String((req.body || {}).name || "").replace(/[^\p{L}\p{N} _.-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 20);
    if (name.length < 2) return res.status(400).json({ error: "Enter a name (at least 2 letters)." });
    if (!hub.isOnline(l.hostUid)) return res.status(409).json({ error: "The host is not online right now. Try again in a moment.", code: "host_offline" });
    if (hub.isBusy(l.hostUid)) return res.status(409).json({ error: "The host is in another game right now. Try again in a moment.", code: "host_busy" });
    const uid = "guest_" + crypto.randomBytes(8).toString("hex");
    const secret = crypto.randomBytes(18).toString("hex");
    guests.set(uid, { secret, name, token: l.token, createdAt: Date.now() });
    l.guestUid = uid;
    l.status = "playing";
    const secure = req.secure || String(req.get("x-forwarded-proto") || "").split(",")[0].trim() === "https";
    res.cookie(guestCookieName(l.token), uid + "." + secret, { httpOnly: true, sameSite: "lax", secure, maxAge: 12 * 60 * 60 * 1000, path: "/api/tictactoe/guest" });
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  function startGuestGame(guest) {
    const l = links.get(guest.token);
    if (!l || l.guestUid !== guest.uid || l.status === "ended") return;
    if (hub.activeGameOf(guest.uid)) return;
    if (!hub.isOnline(l.hostUid)) throw new hub.HubError("not_connected", "The host is not online right now. Try again in a moment.");
    if (hub.isBusy(l.hostUid)) throw new hub.HubError("busy", "The host is in another game right now. Try again in a moment.");
    l.gameId = hub.startDirect(l.hostUid, guest.uid);
  }

  function openGuestStream(req, res, guest) {
    if (chessHub.connectionCount && chessHub.connectionCount(guest.uid) >= 2) return res.status(429).json({ error: "Too many open tabs." });
    res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    if (res.flushHeaders) res.flushHeaders();
    res.write("retry: 3000\n\n");
    const write = (text) => { res.write(text); if (typeof res.flush === "function") res.flush(); };
    const sink = { send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) };
    const profile = { uid: guest.uid, username: guest.name, name: guest.name, photo: null, verified: false, guest: true };
    const connId = chessHub.connect(guest.uid, profile, sink);
    const l = links.get(guest.token);
    if (l && !l.gameId) {
      try { startGuestGame(guest); }
      catch (e) { sink.send("ttt_guest_wait", { message: (e && e.message) || "Waiting for the host." }); }
    }
    const ping = setInterval(() => { try { sink.send("ping", { t: Date.now() }); } catch { /* close handler cleans up */ } }, 8000);
    let closed = false;
    const done = () => { if (closed) return; closed = true; clearInterval(ping); chessHub.disconnect(guest.uid, connId); };
    req.on("close", () => { if (res.destroyed || res.writableEnded || req.destroyed || (req.socket && req.socket.destroyed)) done(); });
    res.on("close", done);
    res.on("error", done);
    if (req.socket) req.socket.on("close", done);
  }

  router.get("/api/tictactoe/guest/stream", guestIpLimiter, requireGuest, (req, res) => {
    try {
      const l = links.get(req.guest.token);
      if (!l || l.status === "ended") return res.status(410).json({ error: "This game session has ended.", code: "ended" });
      openGuestStream(req, res, req.guest);
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: "Could not connect." });
    }
  });

  router.post("/api/tictactoe/guest/start", requireSiteOrigin, requireGuest, guestMoveLimiter, (req, res) => act(res, () => { startGuestGame(req.guest); return { ok: true }; }));
  router.get("/api/tictactoe/ice", requireAuth, voiceLimiter, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.get("/api/tictactoe/guest/ice", guestIpLimiter, requireGuest, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: chessHub.iceServers ? chessHub.iceServers() : [] }));
  router.post("/api/tictactoe/spectate", requireAuth, requireSiteOrigin, specLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.spectate(req.uid, b.code, b.pin));
  });
  router.post("/api/tictactoe/spectate/leave", requireAuth, requireSiteOrigin, specLimiter, (req, res) => act(res, () => hub.leaveSpectate(req.uid)));

  const timer = setInterval(() => {
    try { hub.sweep(); } catch (e) { console.error("[ttt] sweep", e && e.message); }
    const t = Date.now();
    for (const [token, l] of links) {
      const status = linkStatus(l);
      const doneAt = l.status === "ended" ? l.endedAt || t : status === "expired" ? l.expiresAt : 0;
      if (doneAt && t - doneAt > 60 * 60 * 1000) {
        links.delete(token);
        if (l.guestUid) guests.delete(l.guestUid);
      }
    }
  }, 1000);
  if (timer.unref) timer.unref();
  return hub;
}
