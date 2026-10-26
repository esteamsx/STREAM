import crypto from "crypto";
import { Chess } from "../public/chess/chess-engine.js";
import { withoutTransientGameState } from "./game-persistence.js";


export const TIME_OPTIONS = [3, 5, 10, 15, 30];     // kept only so older callers keep working
export const MOVE_MS = 60 * 1000;
export const GAME_MAX_MS = 40 * 60 * 1000;
const RESUME_MIN_MS = 30 * 1000;         // a player who comes back (a refresh, a reconnect) always gets at least this long to move
const ACK_MAX_MS = 45 * 1000;           // a player whose phone has not yet confirmed the last move gets up to this much extra
const ADJUDICATE_CP = 120;              // about a pawn and a bit: the side ahead by this much (or more) is likely to win
const CHALLENGE_TTL_MS = 60 * 1000;
const DECLINE_COOLDOWN_MS = 15 * 1000;
const CHALLENGE_GAP_MS = 2000;
const DISCONNECT_FORFEIT_MS = 3 * 60 * 1000;   // long enough to switch apps and come back
const GAME_KEEP_MS = 15 * 60 * 1000;
const OFFLINE_FORGET_MS = 60 * 1000;
const MAX_OUTGOING = 3;
const MAX_INCOMING = 10;
const MAX_GAMES = 2000;
const MAX_DRAW_OFFERS = 3;
const SQUARE = /^[a-h][1-8]$/;

class HubError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

const MESSAGES = {
  not_connected: "Reconnecting, please try again.",
  self: "You cannot challenge yourself.",
  offline: "That player is not online right now.",
  busy: "Finish your current game first.",
  target_busy: "That player is in a game.",
  bad_time: "Pick a valid time.",
  too_many_out: "You already have 3 open challenges.",
  too_many_in: "That player has too many requests right now.",
  pending: "You already have a request open with that player.",
  pending_from_them: "That player already challenged you. Check your requests.",
  cooldown: "Please wait a moment before asking that player again.",
  slow_down: "Slow down a little.",
  no_challenge: "That request is no longer open.",
  unavailable: "One of you is no longer available.",
  no_game: "Game not found.",
  bad_key: "Game session is not valid. Refresh the page.",
  game_over: "The game is over.",
  not_your_turn: "It is not your turn.",
  illegal_move: "That move is not allowed.",
  bad_move: "That move is not allowed.",
  timeout: "Your time ran out.",
  too_many_offers: "You have offered too many draws.",
  no_offer: "There is no draw offer to answer.",
  server_full: "The game server is full. Try again in a few minutes.",
  host_offline: "The host is not online right now. Try again in a moment.",
  host_busy: "The host is in another game right now. Try again in a moment.",
  no_room: "No game found with that room code.",
  room_closed: "This room is not open for spectators.",
  pin_required: "This room needs a 4 digit PIN.",
  bad_pin: "That PIN is not right.",
  pin_locked: "Too many wrong PINs. Try again in a few minutes.",
  room_full: "This room is full.",
  not_host: "Only the host can change the room.",
  bad_max: "Pick between 1 and 20 spectators.",
  spec_busy: "Leave your current game before you watch another.",
  spec_guest: "Sign in to watch a game.",
  spec_over: "That game has already finished.",
  bad_signal: "Voice message was not valid.",
};
const ROOM_MAX_CAP = 20;
const SPECTATOR_OFFLINE_MS = 2 * 60 * 1000;
const PIN_TRIES = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const err = (code) => new HubError(code, MESSAGES[code]);

export function createChessHub({ now = () => Date.now(), randomHex = (n) => crypto.randomBytes(n).toString("hex"), randomBit = () => crypto.randomInt(2), adjudicate = null, persistence = null } = {}) {
  const users = new Map();       // uid -> { profile, conns: Map(connId -> sink), gameId, offlineSince, lastChallengeAt }
  const challenges = new Map();  // id -> challenge
  const games = new Map();       // id -> game
  const cooldowns = new Map();   // "from>to" -> until

  const publicProfile = (p) => ({
    uid: p.uid,
    username: String(p.username || "").slice(0, 40),
    name: String(p.name || "").slice(0, 80),
    photo: p.photo ? String(p.photo) : null,
    verified: !!p.verified,
    guest: !!p.guest,
  });
  const isGuestUid = (uid) => String(uid || "").startsWith("guest_");
  const rooms = new Map();      // room code -> game id
  const pinTries = new Map();   // "uid|code" -> { n, lockUntil }
  let onGameOver = null;
  const STALE_MS = 150 * 1000;  // a page that stops sending its heartbeat this long is gone
  const PRESENCE_GRACE_MS = 25 * 1000;   // moving between pages drops the stream for a second: still show them as online
  const connectHooks = [];   // other games (Ludo) use the same stream, so they get told when a connection opens

  function emit(uid, event, data) {
    const u = users.get(uid);
    if (!u) return;
    for (const [id, sink] of [...u.conns]) {
      try { sink.send(event, data); } catch { u.conns.delete(id); }
    }
  }

  const isOnline = (uid) => { const u = users.get(uid); return !!(u && u.conns.size); };
  const presentUser = (u) => !!(u && (u.conns.size || (u.droppedAt && now() - u.droppedAt < PRESENCE_GRACE_MS)));
  const isPresent = (uid) => presentUser(users.get(uid));
  const isBusy = (uid) => { const u = users.get(uid); return !!(u && u.gameId && games.get(u.gameId) && games.get(u.gameId).status === "active"); };
  const presenceOf = (uid) => (!isPresent(uid) ? "offline" : isBusy(uid) ? "playing" : "available");

  function clocksNow(game, at = now()) {
    const c = { w: MOVE_MS, b: MOVE_MS };
    if (game.status === "active") {
      c[game.chess.turnColor()] = game.paused ? game.pausedLeft : Math.max(0, Math.min(MOVE_MS + ACK_MAX_MS, game.moveDeadline - at));
    }
    return c;
  }
  function hardDeadline(game) {
    return game.acked ? game.moveDeadline : Math.max(game.moveDeadline, game.turnStartedAt + ACK_MAX_MS + MOVE_MS);
  }

  const moverUid = (game) => game.players[game.chess.turnColor()];
  function broadcastTimer(game) {
    const payload = { gameId: game.id, clocks: clocksNow(game), serverTime: now(), ply: game.moves.length, paused: !!game.paused };
    emit(game.players.w, "timer", payload);
    emit(game.players.b, "timer", payload);
    emitSpectators(game, "timer", payload);
  }
  function pauseClock(game) {
    if (game.status !== "active" || game.paused) return;
    game.pausedLeft = Math.max(RESUME_MIN_MS, Math.min(MOVE_MS, hardDeadline(game) - now()));
    game.paused = true;
    broadcastTimer(game);
  }
  function resumeClock(game) {
    if (!game.paused) return;
    game.paused = false;
    game.turnStartedAt = now();
    game.moveDeadline = now() + game.pausedLeft;
    game.acked = true;
    broadcastTimer(game);
  }

  function colorOf(game, uid) {
    return game.players.w === uid ? "w" : game.players.b === uid ? "b" : null;
  }

  function gameView(game, uid, withKey) {
    const color = colorOf(game, uid);
    const oppUid = game.players[color === "w" ? "b" : "w"];
    const opp = users.get(oppUid);
    const view = {
      id: game.id,
      color,
      fen: game.chess.fen(),
      turn: game.chess.turnColor(),
      moves: game.moves.map((m) => ({ san: m.san, uci: m.uci })),
      clocks: clocksNow(game), paused: !!game.paused, endsAt: game.endsAt, moveMs: MOVE_MS,
      minutes: game.minutes,
      opponent: opp ? publicProfile(opp.profile) : game.profiles[oppUid],
      opponentOnline: isOnline(oppUid),
      status: game.status,
      result: game.result,
      drawOffer: game.drawOffer,
      check: game.chess.isCheck(),
      serverTime: now(),
    };
    if (withKey) view.key = game.keys[color];
    return view;
  }

  function keyOk(game, color, key) {
    const expected = Buffer.from(game.keys[color]);
    const given = Buffer.from(String(key || ""));
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  }

  function playerGame(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const color = colorOf(game, uid);
    if (!color) throw err("no_game");
    if (!keyOk(game, color, key)) throw err("bad_key");
    return { game, color };
  }

  function endChallenge(ch, status, notify = true) {
    if (!challenges.delete(ch.id)) return;
    if (!notify) return;
    emit(ch.from, "challenge_update", { id: ch.id, status });
    emit(ch.to, "challenge_update", { id: ch.id, status });
  }

  function challengesOf(uid) {
    const incoming = [], outgoing = [];
    for (const ch of challenges.values()) {
      if (ch.to === uid) incoming.push({ id: ch.id, from: publicProfile(users.get(ch.from).profile), color: ch.color, minutes: ch.minutes, expiresAt: ch.expiresAt });
      if (ch.from === uid) outgoing.push({ id: ch.id, to: publicProfile(users.get(ch.to).profile), color: ch.color, minutes: ch.minutes, expiresAt: ch.expiresAt });
    }
    return { incoming, outgoing };
  }

  function cancelAllChallengesOf(uid, status) {
    for (const ch of [...challenges.values()]) if (ch.from === uid || ch.to === uid) endChallenge(ch, status);
  }

  function connect(uid, profile, sink) {
    let u = users.get(uid);
    if (!u) {
      u = { profile: publicProfile(profile), conns: new Map(), gameId: null, offlineSince: null, lastChallengeAt: 0 };
      users.set(uid, u);
    } else {
      u.profile = publicProfile(profile);
    }
    const connId = randomHex(6);
    const wasOffline = u.conns.size === 0;
    u.conns.set(connId, sink);
    if (u.hb) u.hbAt = now();
    u.droppedAt = 0;
    u.offlineSince = null;
    const game = u.gameId ? games.get(u.gameId) : null;
    const { incoming, outgoing } = challengesOf(uid);
    const watching = u.watching ? games.get(u.watching) : null;
    sink.send("hello", { me: u.profile, incoming, outgoing, game: game ? gameView(game, uid, true) : null, spectate: watching && watching.spectators.has(uid) ? spectatorView(watching) : null, serverTime: now() });
    if (wasOffline && game && game.status === "active") {
      const oppUid = game.players[colorOf(game, uid) === "w" ? "b" : "w"];
      emit(oppUid, "opponent_status", { gameId: game.id, online: true });
      if (game.paused && moverUid(game) === uid) resumeClock(game);
    }
    for (const fn of connectHooks) { try { fn(uid, sink); } catch { /* a hook must never break a connection */ } }
    return connId;
  }

  function touch(uid) {
    const u = users.get(uid);
    if (!u) return false;
    u.hb = true;
    u.hbAt = now();
    return true;
  }
  function dropStale() {
    const t = now();
    for (const [uid, u] of users) {
      if (!u.conns.size || !u.hb || t - (u.hbAt || 0) <= STALE_MS) continue;
      for (const [connId, sink] of [...u.conns]) {
        try { if (typeof sink.close === "function") sink.close(); } catch { /* ignore */ }
        disconnect(uid, connId);
      }
      u.hb = false;
    }
  }

  function disconnect(uid, connId) {
    const u = users.get(uid);
    if (!u) return;
    if (!u.conns.delete(connId)) return;   // already gone (the stream's own close handler can follow a forced close)
    if (u.conns.size) return;
    u.offlineSince = now();
    u.droppedAt = now();
    cancelAllChallengesOf(uid, "cancelled");
    const game = u.gameId ? games.get(u.gameId) : null;
    if (game && game.status === "active") {
      const oppUid = game.players[colorOf(game, uid) === "w" ? "b" : "w"];
      emit(oppUid, "opponent_status", { gameId: game.id, online: false, forfeitAt: now() + DISCONNECT_FORFEIT_MS });
      if (moverUid(game) === uid) pauseClock(game);
    }
  }

  function online(viewerUid, query = "", limit = 50) {
    const q = String(query || "").trim().toLowerCase();
    const out = [];
    for (const [uid, u] of users) {
      if (uid === viewerUid || !presentUser(u) || isGuestUid(uid)) continue;
      const p = u.profile;
      if (q && !p.username.toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) continue;
      out.push({ ...p, status: isBusy(uid) ? "playing" : "available" });
    }
    out.sort((a, b) => (a.status === b.status ? a.username.localeCompare(b.username) : a.status === "available" ? -1 : 1));
    return out.slice(0, limit);
  }

  function annotate(list) {
    return list.map((p) => ({ ...p, status: presenceOf(p.uid) }));
  }

  function challenge(fromUid, { toUid, color = "random", minutes = 10 } = {}) {
    if (!isOnline(fromUid)) throw err("not_connected");
    toUid = String(toUid || "");
    if (!toUid || toUid === fromUid) throw err("self");
    if (isGuestUid(toUid) || isGuestUid(fromUid)) throw err("offline");
    if (!["white", "black", "random"].includes(color)) color = "random";
    if (!isPresent(toUid)) throw err("offline");
    const from = users.get(fromUid);
    if (isBusy(fromUid)) throw err("busy");
    if (isBusy(toUid)) throw err("target_busy");
    if (now() - from.lastChallengeAt < CHALLENGE_GAP_MS) throw err("slow_down");
    let outgoing = 0, incoming = 0;
    for (const ch of challenges.values()) {
      if (ch.from === fromUid) outgoing++;
      if (ch.to === toUid) incoming++;
      if (ch.from === fromUid && ch.to === toUid) throw err("pending");
      if (ch.from === toUid && ch.to === fromUid) throw err("pending_from_them");
    }
    if (outgoing >= MAX_OUTGOING) throw err("too_many_out");
    if (incoming >= MAX_INCOMING) throw err("too_many_in");
    if ((cooldowns.get(`${fromUid}>${toUid}`) || 0) > now()) throw err("cooldown");

    const ch = { id: randomHex(8), from: fromUid, to: toUid, color, minutes: Number(minutes), createdAt: now(), expiresAt: now() + CHALLENGE_TTL_MS };
    challenges.set(ch.id, ch);
    from.lastChallengeAt = now();
    const to = users.get(toUid);
    emit(toUid, "challenge", { id: ch.id, from: publicProfile(from.profile), color, minutes: ch.minutes, expiresAt: ch.expiresAt });
    emit(fromUid, "challenge_sent", { id: ch.id, to: publicProfile(to.profile), color, minutes: ch.minutes, expiresAt: ch.expiresAt });
    return { id: ch.id };
  }

  function cancelChallenge(uid, id) {
    const ch = challenges.get(String(id));
    if (!ch || ch.from !== uid) throw err("no_challenge");
    endChallenge(ch, "cancelled");
    return { ok: true };
  }

  function respond(uid, id, accept) {
    const ch = challenges.get(String(id));
    if (!ch || ch.to !== uid) throw err("no_challenge");
    if (ch.expiresAt <= now()) { endChallenge(ch, "expired"); throw err("no_challenge"); }
    if (!accept) {
      cooldowns.set(`${ch.from}>${ch.to}`, now() + DECLINE_COOLDOWN_MS);
      endChallenge(ch, "declined");
      return { ok: true };
    }
    if (!isOnline(ch.from) || !isOnline(ch.to) || isBusy(ch.from) || isBusy(ch.to)) {
      endChallenge(ch, "cancelled");
      throw err("unavailable");
    }
    const fromIsWhite = ch.color === "white" ? true : ch.color === "black" ? false : randomBit() === 0;
    const game = createGame(ch.from, ch.to, fromIsWhite, ch.minutes);
    challenges.delete(ch.id);
    emit(ch.from, "challenge_update", { id: ch.id, status: "accepted" });
    emit(ch.to, "challenge_update", { id: ch.id, status: "accepted" });
    cancelAllChallengesOf(ch.from, "cancelled");
    cancelAllChallengesOf(ch.to, "cancelled");
    startGameFor(game);
    return { gameId: game.id };
  }

  function newRoomCode() {
    for (;;) {
      let c = "";
      for (let i = 0; i < 6; i++) c += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
      if (!rooms.has(c)) return c;
    }
  }

  function createGame(fromUid, toUid, fromIsWhite, minutes) {
    if (games.size >= MAX_GAMES) throw err("server_full");
    const players = fromIsWhite ? { w: fromUid, b: toUid } : { w: toUid, b: fromUid };
    const game = {
      id: randomHex(16),
      players,
      keys: { w: randomHex(16), b: randomHex(16) },
      profiles: { [fromUid]: users.get(fromUid).profile, [toUid]: users.get(toUid).profile },
      chess: new Chess(),
      minutes: 0,
      clocks: { w: MOVE_MS, b: MOVE_MS },
      turnStartedAt: now(),
      moveDeadline: now() + MOVE_MS,
      acked: false,
      paused: false,
      pausedLeft: MOVE_MS,
      endsAt: now() + GAME_MAX_MS,
      moves: [],
      status: "active",
      result: null,
      drawOffer: null,
      drawOffers: { w: 0, b: 0 },
      createdAt: now(),
      endedAt: null,
      room: { code: newRoomCode(), host: fromUid, open: false, pin: null, max: 5 },
      spectators: new Map(),    // uid -> { joinedAt }
    };
    rooms.set(game.room.code, game.id);
    games.set(game.id, game);
    users.get(fromUid).gameId = game.id;
    users.get(toUid).gameId = game.id;
    persist(game);
    return game;
  }

  function startGameFor(game) {
    emit(game.players.w, "game_start", gameView(game, game.players.w, true));
    emit(game.players.b, "game_start", gameView(game, game.players.b, true));
  }

  function startDirect(hostUid, guestUid, { color = "random", minutes = 10 } = {}) {
    if (!isOnline(hostUid)) throw err("host_offline");
    if (!isOnline(guestUid)) throw err("not_connected");
    if (isBusy(hostUid)) throw err("host_busy");
    if (isBusy(guestUid)) throw err("busy");
    const hostIsWhite = color === "white" ? true : color === "black" ? false : randomBit() === 0;
    const game = createGame(hostUid, guestUid, hostIsWhite, 0);
    cancelAllChallengesOf(hostUid, "cancelled");
    startGameFor(game);
    return game.id;
  }

  function finish(game, winner, reason) {
    if (game.status !== "active") return;
    game.status = "over";
    game.result = { winner, reason };
    game.endedAt = now();
    game.drawOffer = null;
    game.clocks = clocksNow({ ...game, status: "active" });   // freeze the clocks as they were
    for (const c of ["w", "b"]) {
      const u = users.get(game.players[c]);
      if (u && u.gameId === game.id) u.gameId = null;
    }
    const payload = { gameId: game.id, winner, reason, fen: game.chess.fen(), clocks: game.clocks, moveCount: game.moves.length };
    emit(game.players.w, "game_over", payload);
    emit(game.players.b, "game_over", payload);
    emitSpectators(game, "game_over", payload);
    if (onGameOver) { try { onGameOver(game); } catch { /* never block the game */ } }
    persist(game);
  }

  function move(uid, gameId, key, mv) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (game.chess.turnColor() !== color) throw err("not_your_turn");
    if (!mv || typeof mv !== "object" || !SQUARE.test(String(mv.from)) || !SQUARE.test(String(mv.to))) throw err("bad_move");
    const promotion = mv.promotion == null || mv.promotion === "" ? undefined : String(mv.promotion).toLowerCase();
    if (promotion !== undefined && !["q", "r", "b", "n"].includes(promotion)) throw err("bad_move");

    if (game.paused) resumeClock(game);     // their move arrived, so they are here
    if (now() >= hardDeadline(game)) {
      flag(game, color);
      throw err("timeout");
    }
    const played = game.chess.move({ from: String(mv.from), to: String(mv.to), promotion });
    if (!played) throw err("illegal_move");

    game.turnStartedAt = now();
    game.moveDeadline = now() + MOVE_MS;
    game.acked = false;
    game.moves.push({ san: played.san, uci: played.uci });
    const hadOffer = game.drawOffer;
    game.drawOffer = null;
    const payload = {
      gameId: game.id,
      move: { san: played.san, uci: played.uci, from: played.from, to: played.to, promotion: played.promotion || null, color },
      fen: game.chess.fen(),
      turn: game.chess.turnColor(),
      clocks: { ...game.clocks },
      check: game.chess.isCheck(),
      serverTime: now(),
      paused: false,
      drawOfferCleared: !!hadOffer,
    };
    emit(game.players.w, "move", payload);
    emit(game.players.b, "move", payload);
    emitSpectators(game, "move", payload);
    const res = game.chess.result();
    if (res.over) finish(game, res.winner, res.reason);
    else if (!isOnline(moverUid(game))) pauseClock(game);   // the next player is away: their clock waits for them
    persist(game);
    return { ok: true };
  }

  function flag(game, loserColor) {
    const winnerColor = loserColor === "w" ? "b" : "w";
    if (!game.chess.hasMatingMaterial(winnerColor === "w" ? 0 : 1)) finish(game, null, "timeout_insufficient");
    else finish(game, winnerColor, "move_timeout");
  }

  function materialCp(game) {
    const val = { p: 100, n: 320, b: 330, r: 500, q: 900 };
    let cp = 0;
    for (const ch of game.chess.fen().split(" ")[0]) {
      const v = val[ch.toLowerCase()];
      if (v) cp += ch === ch.toUpperCase() ? v : -v;
    }
    return cp;
  }

  async function adjudicateGame(game) {
    if (game.adjudicating) return;
    game.adjudicating = true;
    let cp = null;
    try { if (adjudicate) cp = await adjudicate(game.chess.fen()); } catch { cp = null; }
    if (game.status !== "active") return;
    if (cp === null) cp = materialCp(game);
    finish(game, cp >= ADJUDICATE_CP ? "w" : cp <= -ADJUDICATE_CP ? "b" : null, "adjudicated");
  }

  function ack(uid, gameId, key, ply) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active" || game.acked || game.paused) return { ok: true };
    if (game.chess.turnColor() !== color || Number(ply) !== game.moves.length) return { ok: true };
    game.acked = true;
    const at = now();
    const lateBy = Math.min(Math.max(0, at - game.turnStartedAt), ACK_MAX_MS);
    if (lateBy > 1500) {
      game.moveDeadline = game.turnStartedAt + lateBy + MOVE_MS;
      const payload = { gameId: game.id, clocks: clocksNow(game), serverTime: now(), ply: game.moves.length };
      emit(game.players.w, "timer", payload);
      emit(game.players.b, "timer", payload);
      emitSpectators(game, "timer", payload);
    }
    persist(game);
    return { ok: true };
  }

  function syncState(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const role = participant(game, uid, key);
    return role === "player" ? gameView(game, uid, true) : spectatorView(game);
  }

  function resign(uid, gameId, key) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    finish(game, color === "w" ? "b" : "w", "resign");
    return { ok: true };
  }

  function offerDraw(uid, gameId, key) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (game.drawOffers[color] >= MAX_DRAW_OFFERS) throw err("too_many_offers");
    if (game.drawOffer) return { ok: true };
    game.drawOffer = color;
    game.drawOffers[color]++;
    emit(game.players[color === "w" ? "b" : "w"], "draw_offer", { gameId: game.id, from: color });
    emit(game.players[color], "draw_offer", { gameId: game.id, from: color });
    return { ok: true };
  }

  function respondDraw(uid, gameId, key, accept) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (!game.drawOffer || game.drawOffer === color) throw err("no_offer");
    if (accept) {
      finish(game, null, "agreement");
    } else {
      const offerer = game.drawOffer;
      game.drawOffer = null;
      emit(game.players[offerer], "draw_declined", { gameId: game.id });
      emit(game.players[color], "draw_declined", { gameId: game.id });
    }
    return { ok: true };
  }

  function myGame(uid) {
    const u = users.get(uid);
    const game = u && u.gameId ? games.get(u.gameId) : null;
    return game ? gameView(game, uid, true) : null;
  }


  function emitSpectators(game, event, data) {
    for (const uid of game.spectators.keys()) emit(uid, event, data);
  }

  const profileOf = (game, uid) => { const u = users.get(uid); return publicProfile(u ? u.profile : (game.profiles[uid] || { uid })); };
  const persist = (game) => {
    if (!persistence) return;
    const { chess, ...plain } = game;
    persistence.save(withoutTransientGameState(plain, { chessFen: chess.fen() })).catch((e) => console.error("[chess] game persistence", e && e.message));
  };
  async function restore() {
    if (!persistence) return;
    try {
      for (const raw of await persistence.load()) {
        if (!raw || !raw.id || !raw.room || !raw.chessFen || !raw.players) continue;
        const game = { ...raw, chess: new Chess(raw.chessFen), spectators: new Map() };
        delete game.chessFen;
        games.set(game.id, game); rooms.set(game.room.code, game.id);
        for (const color of ["w", "b"]) {
          const uid = game.players[color];
          users.set(uid, { profile: game.profiles[uid] || { uid }, conns: new Map(), gameId: game.id, offlineSince: now(), lastChallengeAt: 0 });
        }
      }
    } catch (e) { console.error("[chess] game restore", e && e.message); }
  }

  function spectatorView(game) {
    return {
      id: game.id, spectator: true, color: null,
      fen: game.chess.fen(), turn: game.chess.turnColor(),
      moves: game.moves.map((m) => ({ san: m.san, uci: m.uci })),
      clocks: clocksNow(game), paused: !!game.paused, minutes: game.minutes, endsAt: game.endsAt, moveMs: MOVE_MS,
      players: { w: profileOf(game, game.players.w), b: profileOf(game, game.players.b) },
      status: game.status, result: game.result, check: game.chess.isCheck(), serverTime: now(),
      room: { count: game.spectators.size, max: game.room.max },
    };
  }

  function roomState(game) {
    return {
      code: game.room.code, open: game.room.open, pinSet: !!game.room.pin, max: game.room.max,
      count: game.spectators.size,
      spectators: [...game.spectators.keys()].map((uid) => { const p = profileOf(game, uid); return { uid, name: p.name, username: p.username, photo: p.photo, verified: !!p.verified }; }),
    };
  }

  function broadcastRoom(game) {
    const st = roomState(game);
    for (const c of ["w", "b"]) emit(game.players[c], "room_update", { gameId: game.id, ...st, isHost: game.room.host === game.players[c] });
    for (const uid of game.spectators.keys()) emit(uid, "room_update", { gameId: game.id, count: st.count, max: st.max, spectators: st.spectators, open: st.open, spectator: true });
  }

  function dropSpectator(game, uid, reason) {
    if (!game.spectators.delete(uid)) return;
    const u = users.get(uid);
    if (u && u.watching === game.id) u.watching = null;
    emit(uid, "spectate_end", { gameId: game.id, reason });
  }

  function participant(game, uid, key) {
    const color = colorOf(game, uid);
    if (color) { if (!keyOk(game, color, key)) throw err("bad_key"); return "player"; }
    if (game.spectators.has(uid)) return "spectator";
    throw err("no_game");
  }

  function getRoom(uid, gameId, key) {
    const { game } = playerGame(uid, gameId, key);
    return { ...roomState(game), isHost: game.room.host === uid };
  }

  function setRoom(uid, gameId, key, opts = {}) {
    const { game } = playerGame(uid, gameId, key);
    if (game.room.host !== uid) throw err("not_host");
    if (typeof opts.open === "boolean") game.room.open = opts.open;
    if (opts.pin !== undefined) {
      if (opts.pin === null || opts.pin === "") game.room.pin = null;
      else if (/^\d{4}$/.test(String(opts.pin))) game.room.pin = String(opts.pin);
      else throw err("bad_pin");
    }
    if (opts.max !== undefined) {
      const m = Number(opts.max);
      if (!Number.isInteger(m) || m < 1 || m > ROOM_MAX_CAP) throw err("bad_max");
      game.room.max = m;
    }
    if (!game.room.open) for (const uid2 of [...game.spectators.keys()]) dropSpectator(game, uid2, "closed");
    else while (game.spectators.size > game.room.max) dropSpectator(game, [...game.spectators.keys()].pop(), "full");
    broadcastRoom(game);
    persist(game);
    return { ...roomState(game), isHost: true };
  }

  function activeMatches() {
    return [...games.values()]
      .filter((game) => game.status === "active")
      .map((game) => ({
        id: game.id, code: game.room.code, hostUid: game.room.host,
        host: profileOf(game, game.players[game.room.host === game.players.w ? "w" : "b"]),
      }));
  }

  function spectate(uid, rawCode, pin, admin = false) {
    if (!admin && isGuestUid(uid)) throw err("spec_guest");
    const u = users.get(uid);
    if (!admin && (!u || !u.conns.size)) throw err("not_connected");
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tryKey = uid + "|" + code;
    const tries = pinTries.get(tryKey) || { n: 0, lockUntil: 0 };
    if (tries.lockUntil > now()) throw err("pin_locked");
    const game = games.get(rooms.get(code));
    if (!game) throw err("no_room");
    if (game.status !== "active") throw err("spec_over");
    if (!admin && colorOf(game, uid)) throw err("spec_busy");
    if (!admin && !game.room.open) throw err("room_closed");
    if (!admin && isBusy(uid)) throw err("spec_busy");
    if (!admin && game.room.pin) {
      if (pin === undefined || pin === null || pin === "") throw err("pin_required");
      const a = Buffer.from(String(pin)), b = Buffer.from(game.room.pin);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        tries.n++;
        if (tries.n >= PIN_TRIES) { tries.lockUntil = now() + PIN_LOCK_MS; tries.n = 0; }
        pinTries.set(tryKey, tries);
        throw err(tries.lockUntil > now() ? "pin_locked" : "bad_pin");
      }
    }
    pinTries.delete(tryKey);
    if (!admin && !game.spectators.has(uid) && game.spectators.size >= game.room.max) throw err("room_full");
    if (u.watching && u.watching !== game.id) { const old = games.get(u.watching); if (old) dropSpectator(old, uid, "left"); }
    game.spectators.set(uid, { joinedAt: now() });
    u.watching = game.id;
    broadcastRoom(game);
    persist(game);
    return { view: spectatorView(game) };
  }

  function leaveSpectate(uid) {
    const u = users.get(uid);
    const game = u && u.watching ? games.get(u.watching) : null;
    if (u) u.watching = null;
    if (!game) return;
    game.spectators.delete(uid);
    broadcastRoom(game);
  }

  function voiceJoin(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const role = participant(game, uid, key);
    const others = [game.players.w, game.players.b, ...game.spectators.keys()].filter((x) => x !== uid);
    const color = colorOf(game, uid);
    for (const to of others) emit(to, "voice_peer", { gameId: game.id, uid, role, color });
    return { ok: true, role, color, players: { w: game.players.w, b: game.players.b } };
  }

  function voiceSignal(uid, gameId, key, to, data) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const role = participant(game, uid, key);
    const target = String(to || "");
    const toIsPlayer = target === game.players.w || target === game.players.b;
    const toIsSpectator = game.spectators.has(target);
    if (!toIsPlayer && !toIsSpectator) throw err("no_game");
    if (role === "spectator" && !toIsPlayer) throw err("bad_signal");     // spectators only talk to the players
    if (!data || typeof data !== "object" || !["offer", "answer", "ice", "bye"].includes(data.kind)) throw err("bad_signal");
    if (JSON.stringify(data).length > 12000) throw err("bad_signal");
    emit(target, "voice_signal", { gameId: game.id, from: uid, role, data });
    return { ok: true };
  }

  function sweep() {
    dropStale();
    const t = now();
    for (const ch of [...challenges.values()]) if (ch.expiresAt <= t) endChallenge(ch, "expired");
    for (const [k, until] of cooldowns) if (until <= t) cooldowns.delete(k);

    for (const game of [...games.values()]) {
      if (game.status === "active") {
        const turn = game.chess.turnColor();
        if (!game.paused && !isOnline(moverUid(game))) pauseClock(game);
        if (!game.paused && t >= hardDeadline(game)) { flag(game, turn); continue; }
        if (t >= game.endsAt) { adjudicateGame(game); continue; }
        const offline = ["w", "b"].map((c) => {
          const u = users.get(game.players[c]);
          return !u || !u.conns.size ? (u && u.offlineSince) || game.createdAt : null;
        });
        const gone = offline.map((since) => since !== null && t - since >= DISCONNECT_FORFEIT_MS);
        if (gone[0] && gone[1]) finish(game, null, "abandoned_both");
        else if (gone[0]) finish(game, "b", "abandoned");
        else if (gone[1]) finish(game, "w", "abandoned");
      } else if (game.endedAt && t - game.endedAt > GAME_KEEP_MS) {
        for (const sUid of [...game.spectators.keys()]) dropSpectator(game, sUid, "ended");
        rooms.delete(game.room.code);
        games.delete(game.id);
        if (persistence) persistence.remove(game.id).catch(() => {});
      }
      for (const sUid of [...game.spectators.keys()]) {
        const su = users.get(sUid);
        if (!su || (!su.conns.size && su.offlineSince && t - su.offlineSince > SPECTATOR_OFFLINE_MS)) { dropSpectator(game, sUid, "left"); broadcastRoom(game); }
      }
    }
    for (const [uid, u] of users) {
      if (!u.conns.size && !u.gameId && u.offlineSince && t - u.offlineSince > OFFLINE_FORGET_MS) users.delete(uid);
    }
  }

  return {
    restore,
    flush: () => persistence ? persistence.flush() : Promise.resolve(),
    isPresent, touch, emit, onConnect: (fn) => { if (typeof fn === "function") connectHooks.push(fn); },
    profileOf: (uid) => { const u = users.get(uid); return u ? u.profile : null; },
    connect, disconnect, online, annotate, presenceOf, challenge, cancelChallenge, respond,
    move, resign, offerDraw, respondDraw, myGame, sweep, startDirect, isOnline, isBusy,
    getRoom, setRoom, spectate, adminSpectate: (uid, code) => spectate(uid, code, undefined, true), activeMatches, leaveSpectate, voiceJoin, voiceSignal, ack, syncState,
    setOnGameOver: (fn) => { onGameOver = typeof fn === "function" ? fn : null; },
    gameIdOf: (uid) => { const u = users.get(uid); return u && u.gameId ? u.gameId : null; },
    connectionCount: (uid) => (users.get(uid) ? users.get(uid).conns.size : 0),
    stats: () => ({ users: users.size, games: games.size, challenges: challenges.size }),
    HubError,
  };
}
