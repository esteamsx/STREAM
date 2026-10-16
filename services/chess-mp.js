import crypto from "crypto";
import { Chess } from "../public/chess/chess-engine.js";


export const TIME_OPTIONS = [3, 5, 10, 15, 30];     // minutes per side
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
};

const err = (code) => new HubError(code, MESSAGES[code]);

export function createChessHub({ now = () => Date.now(), randomHex = (n) => crypto.randomBytes(n).toString("hex"), randomBit = () => crypto.randomInt(2) } = {}) {
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
  let onGameOver = null;

  function emit(uid, event, data) {
    const u = users.get(uid);
    if (!u) return;
    for (const [id, sink] of [...u.conns]) {
      try { sink.send(event, data); } catch { u.conns.delete(id); }
    }
  }

  const isOnline = (uid) => { const u = users.get(uid); return !!(u && u.conns.size); };
  const isBusy = (uid) => { const u = users.get(uid); return !!(u && u.gameId && games.get(u.gameId) && games.get(u.gameId).status === "active"); };
  const presenceOf = (uid) => (!isOnline(uid) ? "offline" : isBusy(uid) ? "playing" : "available");

  function clocksNow(game, at = now()) {
    const c = { w: game.clocks.w, b: game.clocks.b };
    if (game.status === "active") {
      const turn = game.chess.turnColor();
      c[turn] = Math.max(0, c[turn] - (at - game.turnStartedAt));
    }
    return c;
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
      clocks: clocksNow(game),
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
    u.offlineSince = null;
    const game = u.gameId ? games.get(u.gameId) : null;
    const { incoming, outgoing } = challengesOf(uid);
    sink.send("hello", { me: u.profile, incoming, outgoing, game: game ? gameView(game, uid, true) : null, serverTime: now() });
    if (wasOffline && game && game.status === "active") {
      const oppUid = game.players[colorOf(game, uid) === "w" ? "b" : "w"];
      emit(oppUid, "opponent_status", { gameId: game.id, online: true });
    }
    return connId;
  }

  function disconnect(uid, connId) {
    const u = users.get(uid);
    if (!u) return;
    u.conns.delete(connId);
    if (u.conns.size) return;
    u.offlineSince = now();
    cancelAllChallengesOf(uid, "cancelled");
    const game = u.gameId ? games.get(u.gameId) : null;
    if (game && game.status === "active") {
      const oppUid = game.players[colorOf(game, uid) === "w" ? "b" : "w"];
      emit(oppUid, "opponent_status", { gameId: game.id, online: false, forfeitAt: now() + DISCONNECT_FORFEIT_MS });
    }
  }

  function online(viewerUid, query = "", limit = 50) {
    const q = String(query || "").trim().toLowerCase();
    const out = [];
    for (const [uid, u] of users) {
      if (uid === viewerUid || !u.conns.size || isGuestUid(uid)) continue;
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
    if (!TIME_OPTIONS.includes(Number(minutes))) throw err("bad_time");
    if (!["white", "black", "random"].includes(color)) color = "random";
    if (!isOnline(toUid)) throw err("offline");
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

  function createGame(fromUid, toUid, fromIsWhite, minutes) {
    if (games.size >= MAX_GAMES) throw err("server_full");
    const players = fromIsWhite ? { w: fromUid, b: toUid } : { w: toUid, b: fromUid };
    const ms = minutes * 60 * 1000;
    const game = {
      id: randomHex(16),
      players,
      keys: { w: randomHex(16), b: randomHex(16) },
      profiles: { [fromUid]: users.get(fromUid).profile, [toUid]: users.get(toUid).profile },
      chess: new Chess(),
      minutes,
      clocks: { w: ms, b: ms },
      turnStartedAt: now(),
      moves: [],
      status: "active",
      result: null,
      drawOffer: null,
      drawOffers: { w: 0, b: 0 },
      createdAt: now(),
      endedAt: null,
    };
    games.set(game.id, game);
    users.get(fromUid).gameId = game.id;
    users.get(toUid).gameId = game.id;
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
    if (!TIME_OPTIONS.includes(Number(minutes))) throw err("bad_time");
    const hostIsWhite = color === "white" ? true : color === "black" ? false : randomBit() === 0;
    const game = createGame(hostUid, guestUid, hostIsWhite, Number(minutes));
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
    if (onGameOver) { try { onGameOver(game); } catch { /* never block the game */ } }
  }

  function move(uid, gameId, key, mv) {
    const { game, color } = playerGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (game.chess.turnColor() !== color) throw err("not_your_turn");
    if (!mv || typeof mv !== "object" || !SQUARE.test(String(mv.from)) || !SQUARE.test(String(mv.to))) throw err("bad_move");
    const promotion = mv.promotion == null || mv.promotion === "" ? undefined : String(mv.promotion).toLowerCase();
    if (promotion !== undefined && !["q", "r", "b", "n"].includes(promotion)) throw err("bad_move");

    const remaining = clocksNow(game)[color];
    if (remaining <= 0) {
      flag(game, color);
      throw err("timeout");
    }
    const played = game.chess.move({ from: String(mv.from), to: String(mv.to), promotion });
    if (!played) throw err("illegal_move");

    game.clocks[color] = remaining;
    game.turnStartedAt = now();
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
      drawOfferCleared: !!hadOffer,
    };
    emit(game.players.w, "move", payload);
    emit(game.players.b, "move", payload);
    const res = game.chess.result();
    if (res.over) finish(game, res.winner, res.reason);
    return { ok: true };
  }

  function flag(game, loserColor) {
    const winnerColor = loserColor === "w" ? "b" : "w";
    if (!game.chess.hasMatingMaterial(winnerColor === "w" ? 0 : 1)) finish(game, null, "timeout_insufficient");
    else finish(game, winnerColor, "timeout");
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

  function sweep() {
    const t = now();
    for (const ch of [...challenges.values()]) if (ch.expiresAt <= t) endChallenge(ch, "expired");
    for (const [k, until] of cooldowns) if (until <= t) cooldowns.delete(k);

    for (const game of [...games.values()]) {
      if (game.status === "active") {
        const turn = game.chess.turnColor();
        if (clocksNow(game, t)[turn] <= 0) { flag(game, turn); continue; }
        const offline = ["w", "b"].map((c) => {
          const u = users.get(game.players[c]);
          return !u || !u.conns.size ? (u && u.offlineSince) || game.createdAt : null;
        });
        const gone = offline.map((since) => since !== null && t - since >= DISCONNECT_FORFEIT_MS);
        if (gone[0] && gone[1]) finish(game, null, "abandoned_both");
        else if (gone[0]) finish(game, "b", "abandoned");
        else if (gone[1]) finish(game, "w", "abandoned");
      } else if (game.endedAt && t - game.endedAt > GAME_KEEP_MS) {
        games.delete(game.id);
      }
    }
    for (const [uid, u] of users) {
      if (!u.conns.size && !u.gameId && u.offlineSince && t - u.offlineSince > OFFLINE_FORGET_MS) users.delete(uid);
    }
  }

  return {
    connect, disconnect, online, annotate, presenceOf, challenge, cancelChallenge, respond,
    move, resign, offerDraw, respondDraw, myGame, sweep, startDirect, isOnline, isBusy,
    setOnGameOver: (fn) => { onGameOver = typeof fn === "function" ? fn : null; },
    gameIdOf: (uid) => { const u = users.get(uid); return u && u.gameId ? u.gameId : null; },
    connectionCount: (uid) => (users.get(uid) ? users.get(uid).conns.size : 0),
    stats: () => ({ users: users.size, games: games.size, challenges: challenges.size }),
    HubError,
  };
}
