import crypto from "crypto";
import { createChessHub } from "../services/chess-mp.js";
import { adjudicatePosition } from "../services/chess-adjudicate.js";
import { replayBotGame, analyzeBotGame } from "../services/chess-anticheat.js";

const MAX_TABS = 4;

export function registerChessRoutes(router, { requireAuth, requireSiteOrigin, SimpleRateLimiter, getUserProfile, searchUsersByUsername, isVerificationActive, isAdminEmail, creditChessBotWin, recordChessReview, hub = createChessHub({ adjudicate: adjudicatePosition }) }) {
  const readLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();
  const challengeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
  const moveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => req.uid).middleware();
  const streamLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();

  const photoFor = (uid, p) => {
    if (!p || p.showProfilePhoto === false || !p.photoURL) return null;
    const url = String(p.photoURL);
    if (url.startsWith("data:")) {
      const v = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);
      return `/api/chess/avatar/${encodeURIComponent(uid)}?v=${v}`;
    }
    return /^https:\/\//i.test(url) ? url : null;
  };
  const profileFor = (uid, p) => ({
    uid,
    username: p.username || "",
    name: [p.firstName, p.lastName].filter(Boolean).join(" "),
    photo: photoFor(uid, p),
    verified: !!((isVerificationActive && isVerificationActive(p)) || (isAdminEmail && isAdminEmail(p.email))),
  });

  const guests = new Map();   // guestUid -> { secret, name, token, createdAt }
  const links = new Map();    // token -> guest game link
  const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;      // a link nobody plays on stops working after a day
  const LINK_AFTER_END_MS = 5 * 60 * 1000;           // after the game it stays for 5 more minutes, then expires
  const MAX_OPEN_LINKS = 3;
  const GUEST_COOKIE = "cx_guest";
  const guestIpLimiter = new SimpleRateLimiter(40, 60 * 1000, (req) => req.ip).middleware();
  const guestJoinLimiter = new SimpleRateLimiter(8, 10 * 60 * 1000, (req) => req.ip, "Too many tries. Give it a few minutes.").middleware();
  const guestMoveLimiter = new SimpleRateLimiter(40, 10 * 1000, (req) => (req.guest && req.guest.uid) || req.ip).middleware();
  const avatarLimiter = new SimpleRateLimiter(400, 60 * 1000, (req) => req.uid || req.ip).middleware();

  const linkStatus = (l) => {
    if (l.status === "open" && Date.now() > l.expiresAt) return "expired";
    if (l.status === "ended") return l.endedAt && Date.now() - l.endedAt <= LINK_AFTER_END_MS && l.result ? "finished" : "expired";
    return l.status;
  };
  const linkView = (l) => ({ token: l.token, status: linkStatus(l), color: l.color, expiresAt: l.expiresAt, createdAt: l.createdAt });
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

  function openStream(req, res, uid, profile, maxTabs, onOpen) {
    if (hub.connectionCount(uid) >= maxTabs) return res.status(429).json({ error: "Too many open chess tabs. Close one and try again." });
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
    const connId = hub.connect(uid, profile, sink);
    if (onOpen) { try { onOpen(sink); } catch (e) { console.error("[chess] open", e && e.message); } }
    const ping = setInterval(() => { try { sink.send("ping", { t: Date.now() }); } catch { /* the close handler cleans up */ } }, 8000);
    let closed = false;
    const done = () => { if (closed) return; closed = true; clearInterval(ping); hub.disconnect(uid, connId); };
    req.on("close", () => { if (res.destroyed || res.writableEnded || req.destroyed || (req.socket && req.socket.destroyed)) done(); });
    res.on("close", done);
    res.on("error", done);
    if (req.socket) req.socket.on("close", done);
  }

  router.get("/api/chess/stream", requireAuth, streamLimiter, async (req, res) => {
    try {
      const profile = await getUserProfile(req.uid);
      if (!profile) return res.status(401).json({ error: "not_authenticated" });
      openStream(req, res, req.uid, profileFor(req.uid, profile), MAX_TABS);
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: "Could not connect." });
    }
  });

  router.get("/api/chess/me", requireAuth, readLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const profile = await getUserProfile(req.uid);
      if (!profile) return res.status(401).json({ error: "not_authenticated" });
      res.json({ me: profileFor(req.uid, profile) });
    } catch {
      res.status(500).json({ error: "Could not load your profile." });
    }
  });

  function sendPhoto(res, p) {
    const m = p && p.showProfilePhoto !== false && /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(p.photoURL || ""));
    if (!m) return res.status(404).end();
    res.set({ "Content-Type": m[1], "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
    res.send(Buffer.from(m[2], "base64"));
  }

  router.get("/api/chess/avatar/:uid", requireAuth, avatarLimiter, async (req, res) => {
    try {
      sendPhoto(res, await getUserProfile(String(req.params.uid || "")));
    } catch {
      res.status(404).end();
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
        const extra = found.filter((u) => !seen.has(u.uid)).map((u) => ({ uid: u.uid, username: u.username || "", name: [u.firstName, u.lastName].filter(Boolean).join(" "), photo: photoFor(u.uid, u), verified: !!u.verified }));
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

  const botSessions = new Map();   // token -> { uid, startedAt, used }
  const rewardLimiter = new SimpleRateLimiter(12, 10 * 60 * 1000, (req) => req.uid, "Slow down a little.").middleware();

  router.post("/api/chess/bot/start", requireAuth, requireSiteOrigin, rewardLimiter, (req, res) => {
    const level = String((req.body || {}).level || "");
    if (level !== "hard") return res.json({ token: null });
    if (botSessions.size > 5000) for (const [k, v] of botSessions) if (Date.now() - v.startedAt > 3 * 3600 * 1000) botSessions.delete(k);
    const token = crypto.randomBytes(12).toString("hex");
    botSessions.set(token, { uid: req.uid, startedAt: Date.now(), used: false });
    res.set("Cache-Control", "no-store").json({ token });
  });

  router.post("/api/chess/bot/finish", requireAuth, requireSiteOrigin, rewardLimiter, async (req, res) => {
    const b = req.body || {};
    const token = String(b.token || "");
    const sess = botSessions.get(token);
    if (!sess || sess.uid !== req.uid || sess.used) return res.status(400).json({ error: "This game can no longer be rewarded." });
    sess.used = true;
    const humanColor = b.humanColor === "b" ? "b" : "w";
    try {
      if (b.undone) return res.json({ rewarded: false, message: "No coin this time because Undo was used." });
      const replay = replayBotGame(b.moves, humanColor);
      if (!replay.ok) return res.json({ rewarded: false, message: "This game could not be verified." });
      if (!replay.humanWon) return res.json({ rewarded: false, message: "Win by checkmate on Hard to earn a coin." });
      const verdict = await analyzeBotGame({
        moves: b.moves, humanColor,
        timings: Array.isArray(b.timings) ? b.timings.slice(0, 400) : [],
        serverDurationMs: Date.now() - sess.startedAt,
        blurCount: b.blurCount, blurMs: b.blurMs,
      });
      const review = { verdict: verdict.verdict, score: verdict.score, reasons: verdict.reasons, humanMoves: verdict.humanMoves, agreement: verdict.agreement == null ? null : Math.round(verdict.agreement * 100), avgMs: verdict.avgMs || 0, rewarded: false };
      if (verdict.verdict === "too_short") {
        return res.json({ rewarded: false, message: "That game was too short to earn a coin." });
      }
      if (verdict.verdict !== "human") {
        await recordChessReview(req.uid, review).catch(() => {});
        return res.json({ rewarded: false, message: "We could not confirm this win was played by you, so no coin was given." });
      }
      const paid = await creditChessBotWin(req.uid, token);
      review.rewarded = true;
      await recordChessReview(req.uid, review).catch(() => {});
      res.json({ rewarded: true, coins: paid.coins, balance: paid.balance, message: "+1 coin for beating the computer on Hard!" });
    } catch (e) {
      res.status(e.status || 400).json({ error: e.message || "Could not check this game." });
    }
  });

  const voiceLimiter = new SimpleRateLimiter(900, 60 * 1000, (req) => req.uid || (req.guest && req.guest.uid) || req.ip).middleware();
  const specLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid || req.ip, "Slow down a little.").middleware();

  let turnLogged = false;
  function turnServer() {
    const raw = String(process.env.CHESS_TURN_URL || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!raw.length) return null;
    const username = String(process.env.CHESS_TURN_USER || "").trim();
    const credential = String(process.env.CHESS_TURN_PASS || "").trim();
    if (!username || !credential) {
      if (!turnLogged) { turnLogged = true; console.warn("[chess] CHESS_TURN_URL is set but CHESS_TURN_USER or CHESS_TURN_PASS is missing, so voice has no relay."); }
      return null;
    }
    const urls = [];
    const extraStun = [];
    for (const entry of raw) {
      if (/^(turns?|stun):/i.test(entry)) { urls.push(entry); continue; }
      const host = entry.replace(/^[a-z]+:\/\//i, "").replace(/[:/?].*$/, "");
      if (!host) continue;
      urls.push(`turn:${host}:80`, `turn:${host}:80?transport=tcp`, `turn:${host}:443`, `turns:${host}:443?transport=tcp`);
      if (/\.relay\.metered\.ca$/i.test(host)) extraStun.push("stun:stun.relay.metered.ca:80");
    }
    if (!urls.length) return null;
    if (!turnLogged) { turnLogged = true; console.log(`[chess] TURN relay enabled for voice (${new Set(urls).size} urls)`); }
    return { stun: [...new Set(extraStun)], turn: { urls: [...new Set(urls)], username, credential } };
  }
  function iceServers() {
    const list = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
    const t = turnServer();
    if (t) {
      for (const u of t.stun) list.push({ urls: u });
      list.push(t.turn);
    }
    return list;
  }
  router.get("/api/chess/ice", requireAuth, voiceLimiter, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: iceServers() }));

  const roomRoutes = (prefix, uidOf, guard) => {
    router.post(prefix + "/room", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.getRoom(uidOf(req), b.gameId, b.key));
    });
    router.post(prefix + "/room/settings", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.setRoom(uidOf(req), b.gameId, b.key, { open: b.open, pin: b.pin, max: b.max }));
    });
    router.post(prefix + "/game/:id/ack", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.ack(uidOf(req), req.params.id, b.key, b.ply));
    });
    router.post(prefix + "/game/:id/state", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.syncState(uidOf(req), req.params.id, b.key));
    });
    router.post(prefix + "/voice/join", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.voiceJoin(uidOf(req), b.gameId, b.key));
    });
    router.post(prefix + "/voice/signal", ...guard, (req, res) => {
      const b = req.body || {};
      act(res, () => hub.voiceSignal(uidOf(req), b.gameId, b.key, b.to, b.data));
    });
  };
  roomRoutes("/api/chess", (req) => req.uid, [requireAuth, requireSiteOrigin, voiceLimiter]);
  roomRoutes("/api/chess/guest", (req) => req.guest.uid, [requireSiteOrigin, voiceLimiter, requireGuest]);
  router.get("/api/chess/guest/ice", voiceLimiter, requireGuest, (req, res) => res.set("Cache-Control", "no-store").json({ iceServers: iceServers() }));

  router.post("/api/chess/spectate", requireAuth, requireSiteOrigin, specLimiter, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.spectate(req.uid, b.code, b.pin));
  });
  router.post("/api/chess/spectate/leave", requireAuth, requireSiteOrigin, specLimiter, (req, res) => {
    act(res, () => { hub.leaveSpectate(req.uid); return { ok: true }; });
  });

  router.post("/api/chess/guest/links", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const b = req.body || {};
    const color = ["white", "black", "random"].includes(b.color) ? b.color : "random";
    let open = 0;
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) open++;
    if (open >= MAX_OPEN_LINKS) return res.status(400).json({ error: "You already have " + MAX_OPEN_LINKS + " active guest links. Cancel one first." });
    const token = crypto.randomBytes(9).toString("base64url");
    const now = Date.now();
    const link = { token, hostUid: req.uid, color, createdAt: now, expiresAt: now + LINK_LIFETIME_MS, status: "open", guestUid: null, gameId: null, endedAt: null, result: null };
    links.set(token, link);
    res.set("Cache-Control", "no-store").json({ link: linkView(link) });
  });

  router.get("/api/chess/guest/links", requireAuth, readLimiter, (req, res) => {
    const mine = [];
    for (const l of links.values()) if (l.hostUid === req.uid && ["open", "playing"].includes(linkStatus(l))) mine.push(linkView(l));
    mine.sort((a, b) => b.createdAt - a.createdAt);
    res.set("Cache-Control", "no-store").json({ links: mine });
  });

  router.post("/api/chess/guest/links/:token/cancel", requireAuth, requireSiteOrigin, challengeLimiter, (req, res) => {
    const l = links.get(String(req.params.token));
    if (!l || l.hostUid !== req.uid) return res.status(404).json({ error: "That link was not found." });
    if (l.status === "open") { l.status = "ended"; l.endedAt = Date.now(); }
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  router.get("/api/chess/guest/info/:token", guestIpLimiter, async (req, res) => {
    res.set("Cache-Control", "no-store");
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.json({ status: "ended" });
    const status = linkStatus(l);
    const me = readGuest(req);
    const you = !!(me && l.guestUid === me.uid);
    const out = { status, expiresAt: l.expiresAt, you };
    if (status === "finished") out.result = l.result;
    if (status === "open" || (status === "playing" && you)) {
      try {
        const host = await getUserProfile(l.hostUid);
        if (host) out.host = { name: [host.firstName, host.lastName].filter(Boolean).join(" ") || host.username || "", username: host.username || "", photo: photoFor(l.hostUid, host) ? `/api/chess/guest/avatar/${encodeURIComponent(l.token)}` : null };
      } catch { /* the page still works without the host details */ }
    }
    res.json(out);
  });

  router.get("/api/chess/guest/avatar/:token", guestIpLimiter, async (req, res) => {
    try {
      const l = links.get(String(req.params.token || ""));
      if (!l) return res.status(404).end();
      sendPhoto(res, await getUserProfile(l.hostUid));
    } catch {
      res.status(404).end();
    }
  });

  router.post("/api/chess/guest/join/:token", requireSiteOrigin, guestJoinLimiter, (req, res) => {
    const l = links.get(String(req.params.token || ""));
    if (!l) return res.status(404).json({ error: "This game session has ended.", code: "ended" });
    const status = linkStatus(l);
    const existing = readGuest(req);
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
    res.cookie(GUEST_COOKIE, uid + "." + secret, { httpOnly: true, sameSite: "lax", secure, maxAge: 12 * 60 * 60 * 1000, path: "/api/chess/guest" });
    res.set("Cache-Control", "no-store").json({ ok: true });
  });

  function startGuestGame(guest) {
    const l = links.get(guest.token);
    if (!l || l.guestUid !== guest.uid || l.status === "ended") return;
    if (hub.gameIdOf(guest.uid)) return;
    l.gameId = hub.startDirect(l.hostUid, guest.uid, { color: l.color });
  }

  router.get("/api/chess/guest/stream", guestIpLimiter, requireGuest, (req, res) => {
    try {
      const g = req.guest;
      const l = links.get(g.token);
      if (!l || l.status === "ended") return res.status(410).json({ error: "This game session has ended.", code: "ended" });
      openStream(req, res, g.uid, { uid: g.uid, username: g.name, name: g.name, photo: null, verified: false, guest: true }, 2, (sink) => {
        if (l.gameId) return;
        try { startGuestGame(g); } catch (e) { sink.send("guest_wait", { message: (e && e.message) || "Waiting for the host." }); }
      });
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: "Could not connect." });
    }
  });

  router.post("/api/chess/guest/start", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => {
    act(res, () => { startGuestGame(req.guest); return { ok: true }; });
  });

  router.post("/api/chess/guest/game/:id/move", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.move(req.guest.uid, req.params.id, b.key, { from: b.from, to: b.to, promotion: b.promotion }));
  });
  router.post("/api/chess/guest/game/:id/resign", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => {
    act(res, () => hub.resign(req.guest.uid, req.params.id, (req.body || {}).key));
  });
  router.post("/api/chess/guest/game/:id/draw", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => {
    act(res, () => hub.offerDraw(req.guest.uid, req.params.id, (req.body || {}).key));
  });
  router.post("/api/chess/guest/game/:id/draw/respond", requireSiteOrigin, guestMoveLimiter, requireGuest, (req, res) => {
    const b = req.body || {};
    act(res, () => hub.respondDraw(req.guest.uid, req.params.id, b.key, !!b.accept));
  });

  const timer = setInterval(() => {
    try { hub.sweep(); } catch (e) { console.error("[chess] sweep", e && e.message); }
    const t = Date.now();
    for (const [token, l] of links) {
      const status = linkStatus(l);
      if (status === "playing" && l.gameId === null && l.guestUid && !hub.isOnline(l.guestUid) && t - l.createdAt > LINK_LIFETIME_MS) { l.status = "ended"; l.endedAt = t; }
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
