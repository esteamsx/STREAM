import crypto from "crypto";
import { newState, applyRoll, applyMove, legalTokens, chooseToken, rollValue, colorOfTurn, COLORS } from "../public/ludo/ludo-engine.js";

/* Online Ludo. It shares the chess stream for presence (so people are "online" on every page)
   and sends its own events (ludo_*) down that same stream. */

export const ROLL_MS = 30 * 1000;       // time to roll the dice
export const MOVE_MS = 25 * 1000;       // time to pick a token after rolling
const MAX_TIMEOUTS = 3;                  // this many missed turns in a row and the player forfeits
const CHALLENGE_TTL_MS = 60 * 1000;
const DECLINE_COOLDOWN_MS = 15 * 1000;
const CHALLENGE_GAP_MS = 2000;
const DISCONNECT_FORFEIT_MS = 3 * 60 * 1000;
const GAME_KEEP_MS = 15 * 60 * 1000;
const MAX_OUTGOING = 3;
const MAX_INCOMING = 10;
const MAX_GAMES = 2000;

class HubError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
const MESSAGES = {
  not_connected: "Reconnecting, please try again.",
  self: "You cannot challenge yourself.",
  offline: "That player is not online right now.",
  busy: "Finish your current game first.",
  target_busy: "That player is in a game.",
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
  already_rolled: "You already rolled. Pick a token to move.",
  must_roll: "Roll the dice first.",
  bad_move: "That token cannot move.",
  server_full: "The game server is full. Try again in a few minutes.",
  host_offline: "The host is not online right now. Try again in a moment.",
  host_busy: "The host is in another game right now. Try again in a moment.",
};
const err = (code) => new HubError(code, MESSAGES[code]);

export function createLudoHub({ chess, now = () => Date.now(), randomHex = (n) => crypto.randomBytes(n).toString("hex"), randomBit = () => crypto.randomInt(2) } = {}) {
  const challenges = new Map();   // id -> challenge
  const games = new Map();        // id -> game
  const byUid = new Map();        // uid -> active game id
  const cooldowns = new Map();    // "from>to" -> until
  const lastAsk = new Map();      // uid -> time of the last challenge sent
  let onGameOver = null;

  const emit = (uid, event, data) => chess.emit(uid, event, data);
  const isOnline = (uid) => chess.isOnline(uid);
  const activeGameOf = (uid) => { const g = games.get(byUid.get(uid)); return g && g.status === "active" ? g : null; };
  const isBusy = (uid) => !!activeGameOf(uid);
  const profileOf = (uid) => chess.profileOf(uid) || { uid, username: "", name: "Player", photo: null, verified: false, guest: String(uid).startsWith("guest_") };

  function playerOf(game, uid) { return game.players.find((p) => p.uid === uid) || null; }

  function gameView(game, uid, withKey) {
    const me = playerOf(game, uid);
    const st = game.state;
    return {
      id: game.id,
      status: game.status,
      seq: game.seq,
      you: me ? me.color : null,
      key: withKey && me ? me.key : undefined,
      players: game.players.map((p) => ({ color: p.color, ...profileOf(p.uid), online: isOnline(p.uid) })),
      state: { seats: st.seats, tokens: st.tokens, turn: colorOfTurn(st), roll: st.roll, sixes: st.sixes, winner: st.winner, lastMove: st.lastMove },
      deadline: game.deadline,
      serverTime: now(),
      result: game.result || null,
    };
  }

  function broadcast(game, event) {
    game.seq += 1;
    for (const p of game.players) emit(p.uid, "ludo_state", { gameId: game.id, event, ...gameView(game, p.uid, false) });
  }

  function setDeadline(game) {
    game.deadline = now() + (game.state.roll ? MOVE_MS : ROLL_MS);
  }

  function finish(game, winnerColor, reason) {
    if (game.status !== "active") return;
    game.status = "over";
    game.endedAt = now();
    game.result = { winner: winnerColor, reason };
    for (const p of game.players) if (byUid.get(p.uid) === game.id) byUid.delete(p.uid);
    for (const p of game.players) emit(p.uid, "ludo_over", { gameId: game.id, ...gameView(game, p.uid, false) });
    if (onGameOver) { try { onGameOver(game); } catch { /* never break the game */ } }
  }

  function createGame(aUid, bUid, aColorIdx) {
    if (games.size >= MAX_GAMES) throw err("server_full");
    const bColorIdx = (aColorIdx + 2) % 4;
    const id = randomHex(8);
    const mk = (uid, color) => ({ uid, color, key: randomHex(12), timeouts: 0, offlineSince: null });
    const game = {
      id, status: "active", seq: 0, createdAt: now(), endedAt: null, result: null,
      players: [mk(aUid, aColorIdx), mk(bUid, bColorIdx)],
      state: newState([aColorIdx, bColorIdx]), deadline: 0,
    };
    setDeadline(game);
    games.set(id, game);
    byUid.set(aUid, id);
    byUid.set(bUid, id);
    return game;
  }

  function pickColor(pref) {
    const i = COLORS.indexOf(pref);
    return i >= 0 ? i : randomBit() * 2 + randomBit();   // random: any of the four
  }

  function startDirect(hostUid, guestUid, { color } = {}) {
    if (isBusy(hostUid) || isBusy(guestUid)) throw err("busy");
    const game = createGame(hostUid, guestUid, pickColor(color));
    for (const p of game.players) emit(p.uid, "ludo_game_start", gameView(game, p.uid, true));
    return game.id;
  }

  /* ---- challenges ---- */
  const challengeView = (c) => ({ id: c.id, from: c.fromProfile, to: c.toProfile, color: c.color, expiresAt: c.expiresAt });

  function challengesOf(uid) {
    const incoming = [], outgoing = [];
    for (const c of challenges.values()) {
      if (c.expiresAt <= now()) continue;
      if (c.toUid === uid) incoming.push(challengeView(c));
      if (c.fromUid === uid) outgoing.push(challengeView(c));
    }
    return { incoming, outgoing };
  }

  function challenge(fromUid, { toUid, color } = {}) {
    if (!isOnline(fromUid)) throw err("not_connected");
    if (fromUid === toUid) throw err("self");
    if (!isOnline(toUid)) throw err("offline");
    if (isBusy(fromUid)) throw err("busy");
    if (isBusy(toUid)) throw err("target_busy");
    if (now() - (lastAsk.get(fromUid) || 0) < CHALLENGE_GAP_MS) throw err("slow_down");
    if ((cooldowns.get(fromUid + ">" + toUid) || 0) > now()) throw err("cooldown");
    let out = 0, inn = 0;
    for (const c of challenges.values()) {
      if (c.expiresAt <= now()) continue;
      if (c.fromUid === fromUid && c.toUid === toUid) throw err("pending");
      if (c.fromUid === toUid && c.toUid === fromUid) throw err("pending_from_them");
      if (c.fromUid === fromUid) out++;
      if (c.toUid === toUid) inn++;
    }
    if (out >= MAX_OUTGOING) throw err("too_many_out");
    if (inn >= MAX_INCOMING) throw err("too_many_in");
    const c = {
      id: randomHex(8), fromUid, toUid, color: ["red", "green", "yellow", "blue"].includes(color) ? color : "random",
      fromProfile: profileOf(fromUid), toProfile: profileOf(toUid), expiresAt: now() + CHALLENGE_TTL_MS,
    };
    challenges.set(c.id, c);
    lastAsk.set(fromUid, now());
    emit(toUid, "ludo_challenge", challengeView(c));
    emit(fromUid, "ludo_challenge_sent", challengeView(c));
    return { id: c.id };
  }

  function dropChallenge(c, status) {
    challenges.delete(c.id);
    emit(c.toUid, "ludo_challenge_update", { id: c.id, status });
    emit(c.fromUid, "ludo_challenge_update", { id: c.id, status });
  }

  function cancelChallenge(uid, id) {
    const c = challenges.get(id);
    if (!c || c.fromUid !== uid) throw err("no_challenge");
    dropChallenge(c, "cancelled");
    return { ok: true };
  }

  function respond(uid, id, accept) {
    const c = challenges.get(id);
    if (!c || c.toUid !== uid || c.expiresAt <= now()) throw err("no_challenge");
    if (!accept) {
      cooldowns.set(c.fromUid + ">" + c.toUid, now() + DECLINE_COOLDOWN_MS);
      dropChallenge(c, "declined");
      return { ok: true };
    }
    if (!isOnline(c.fromUid) || !isOnline(c.toUid) || isBusy(c.fromUid) || isBusy(c.toUid)) { dropChallenge(c, "expired"); throw err("unavailable"); }
    challenges.delete(c.id);
    for (const o of [...challenges.values()]) if (o.fromUid === c.fromUid || o.toUid === c.fromUid || o.fromUid === c.toUid || o.toUid === c.toUid) dropChallenge(o, "cancelled");
    emit(c.fromUid, "ludo_challenge_update", { id: c.id, status: "accepted" });
    emit(c.toUid, "ludo_challenge_update", { id: c.id, status: "accepted" });
    const gameId = startDirect(c.fromUid, c.toUid, { color: c.color });
    return { ok: true, gameId };
  }

  /* ---- playing ---- */
  function loadGame(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const me = playerOf(game, uid);
    if (!me || me.key !== key) throw err("bad_key");
    return { game, me };
  }

  function roll(uid, gameId, key) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (colorOfTurn(game.state) !== me.color) throw err("not_your_turn");
    if (game.state.roll) throw err("already_rolled");
    me.timeouts = 0;
    doRoll(game, me.color);
    return { ok: true };
  }

  function doRoll(game, color) {
    const res = applyRoll(game.state, rollValue());
    setDeadline(game);
    broadcast(game, { type: "roll", color, value: res.value, skipped: res.skipped });
  }

  function move(uid, gameId, key, token) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    if (colorOfTurn(game.state) !== me.color) throw err("not_your_turn");
    if (!game.state.roll) throw err("must_roll");
    me.timeouts = 0;
    doMove(game, Number(token));
    return { ok: true };
  }

  function doMove(game, token) {
    const mv = applyMove(game.state, token);
    if (!mv) throw err("bad_move");
    setDeadline(game);
    broadcast(game, { type: "move", move: mv });
    if (game.state.winner != null) finish(game, game.state.winner, "home");
  }

  function resign(uid, gameId, key) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active") throw err("game_over");
    const other = game.players.find((p) => p !== me);
    finish(game, other.color, "resigned");
    return { ok: true };
  }

  function syncState(uid, gameId, key) {
    const { game } = loadGame(uid, gameId, key);
    return { game: gameView(game, uid, true) };
  }

  /* what a freshly opened stream needs to know about Ludo */
  function hello(uid, sink) {
    const g = activeGameOf(uid);
    const { incoming, outgoing } = challengesOf(uid);
    sink.send("ludo_hello", { incoming, outgoing, game: g ? gameView(g, uid, true) : null, serverTime: now() });
    if (g) {
      const p = playerOf(g, uid);
      if (p) p.offlineSince = null;
    }
  }
  chess.onConnect(hello);

  function myGame(uid) { const g = activeGameOf(uid); return g ? gameView(g, uid, true) : null; }

  function sweep() {
    const t = now();
    for (const c of [...challenges.values()]) {
      if (c.expiresAt <= t) dropChallenge(c, "expired");
      else if (!isOnline(c.fromUid)) dropChallenge(c, "cancelled");
    }
    for (const [id, game] of games) {
      if (game.status !== "active") {
        if (t - (game.endedAt || t) > GAME_KEEP_MS) games.delete(id);
        continue;
      }
      for (const p of game.players) {
        const on = isOnline(p.uid);
        if (on) p.offlineSince = null;
        else if (!p.offlineSince) { p.offlineSince = t; const o = game.players.find((x) => x !== p); emit(o.uid, "ludo_opponent", { gameId: game.id, online: false }); }
        else if (t - p.offlineSince > DISCONNECT_FORFEIT_MS) {
          finish(game, game.players.find((x) => x !== p).color, "left");
          break;
        }
      }
      if (game.status !== "active" || t < game.deadline) continue;
      const color = colorOfTurn(game.state);
      const p = game.players.find((x) => x.color === color);
      p.timeouts += 1;
      if (p.timeouts >= MAX_TIMEOUTS) { finish(game, game.players.find((x) => x !== p).color, "timeout"); continue; }
      try {
        if (!game.state.roll) doRoll(game, color);
        if (game.status === "active" && colorOfTurn(game.state) === color && game.state.roll) doMove(game, chooseToken(game.state, "medium"));
      } catch { setDeadline(game); }
    }
  }

  return {
    challenge, cancelChallenge, respond, startDirect, roll, move, resign, syncState, myGame, sweep, hello,
    isBusy, isOnline, activeGameOf,
    setOnGameOver: (fn) => { onGameOver = typeof fn === "function" ? fn : null; },
    stats: () => ({ games: games.size, challenges: challenges.size }),
    HubError,
  };
}
