import crypto from "crypto";
import { withoutTransientGameState } from "./game-persistence.js";
import { newState, move as engineMove, resign as engineResign, chooseMove, viewOf, seatOfTurn, MARKS } from "../public/tictactoe/ttt-engine.js";

/* Online Tic-Tac-Toe for exactly 2 players. Like Ludo, Whot and Tic-Tac-Toe it shares the chess stream for presence
   (so people are "online" on every page) and sends its own events (ttt_*) down that same stream. Every game has a room code
   so people can watch it, and the two players can talk by voice. The server keeps the board, so nobody can cheat. */

export const TURN_MS = 30 * 1000;        // time to place a mark
const MAX_TIMEOUTS = 3;                  // this many missed turns in a row and the player is out
const CHALLENGE_TTL_MS = 60 * 1000;
const DECLINE_COOLDOWN_MS = 15 * 1000;
const CHALLENGE_GAP_MS = 2000;
const DISCONNECT_FORFEIT_MS = 3 * 60 * 1000;
const RESUME_MIN_MS = 5 * 1000;
const GAME_KEEP_MS = 15 * 60 * 1000;
const SPECTATOR_OFFLINE_MS = 2 * 60 * 1000;
const PIN_TRIES = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_MAX_CAP = 20;
const MAX_OUTGOING = 6;
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
  too_many_out: "You already have too many open invites.",
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
  bad_cell: "That square is not valid.",
  taken: "That square is already taken.",
  server_full: "The game server is full. Try again in a few minutes.",
  no_room: "No game found with that room code.",
  room_closed: "This room is not open for spectators.",
  pin_required: "This room needs a 4 digit PIN.",
  bad_pin: "That PIN is not right.",
  pin_locked: "Too many wrong PINs. Try again in a few minutes.",
  room_full: "This room is full.",
  not_host: "Only the host can do that.",
  bad_max: "Pick between 1 and 20 spectators.",
  spec_busy: "Leave your current game before you watch another.",
  spec_guest: "Sign in to watch a game.",
  spec_over: "That game has already finished.",
  bad_signal: "Voice message was not valid.",
};
const err = (code) => new HubError(code, MESSAGES[code]);

export function createTttHub({ chess, now = () => Date.now(), randomHex = (n) => crypto.randomBytes(n).toString("hex"), randomInt = (n) => crypto.randomInt(n), persistence = null } = {}) {
  const challenges = new Map();   // id -> challenge (a request to a player)
  const games = new Map();        // id -> game
  const byUid = new Map();        // uid -> active game id
  const rooms = new Map();        // room code -> game id
  const watching = new Map();     // spectator uid -> game id
  const cooldowns = new Map();    // "from>to" -> until
  const lastAsk = new Map();      // uid -> time of the last challenge sent
  const pinTries = new Map();     // "uid|code" -> { n, lockUntil }
  let onGameOver = null;

  const isGuestUid = (uid) => String(uid || "").startsWith("guest_");
  const emit = (uid, event, data) => chess.emit(uid, event, data);
  const isOnline = (uid) => chess.isOnline(uid);
  const isPresent = (uid) => (chess.isPresent ? chess.isPresent(uid) : chess.isOnline(uid));
  const activeGameOf = (uid) => { const g = games.get(byUid.get(uid)); return g && g.status === "active" ? g : null; };
  const isBusy = (uid) => !!activeGameOf(uid);
  const fallbackProfile = (uid) => ({ uid, username: "", name: "Player", photo: null, verified: false, guest: isGuestUid(uid) });
  const profileOf = (uid, game) => chess.profileOf(uid) || (game && game.profiles && game.profiles[uid]) || fallbackProfile(uid);
  const playerOf = (game, uid) => game.players.find((p) => p.uid === uid) || null;
  const livePlayers = (game) => game.players.filter((p) => !p.out);
  const persist = (game) => {
    if (persistence) persistence.save(withoutTransientGameState(game)).catch((e) => console.error(`[ttt] game persistence`, e && e.message));
  };
  async function restore() {
    if (!persistence) return;
    try {
      for (const raw of await persistence.load()) {
        if (!raw || !raw.id || !raw.room || !raw.state || !Array.isArray(raw.players)) continue;
        const game = { ...raw, spectators: new Map(), offSpec: new Map() };
        games.set(game.id, game); rooms.set(game.room.code, game.id);
        for (const player of game.players) byUid.set(player.uid, game.id);
      }
    } catch (e) { console.error(`[ttt] game restore`, e && e.message); }
  }

  const rng = (n) => randomInt(n);

  /* ---- views ---- */
  function playersView(game) {
    return game.players.map((p) => ({ seat: p.seat, mark: MARKS[p.seat], ...profileOf(p.uid, game), online: isOnline(p.uid), out: !!p.out }));
  }
  function roomState(game) {
    return {
      code: game.room.code, open: game.room.open, pinSet: !!game.room.pin, max: game.room.max, count: game.spectators.size,
      spectators: [...game.spectators.keys()].map((uid) => { const p = profileOf(uid, game); return { uid, name: p.name, username: p.username, photo: p.photo, verified: !!p.verified }; }),
    };
  }
  function gameView(game, uid, withKey) {
    const me = playerOf(game, uid);
    return {
      id: game.id, status: game.status, seq: game.seq,
      you: me ? me.seat : null, key: withKey && me ? me.key : undefined,
      players: playersView(game), state: viewOf(game.state),
      deadline: game.deadline, serverTime: now(), result: game.result || null,
      room: me && withKey ? { ...roomState(game), isHost: game.room.host === uid } : undefined,
    };
  }
  function spectatorView(game) {
    return {
      id: game.id, spectator: true, status: game.status, seq: game.seq, you: null,
      players: playersView(game), state: viewOf(game.state), deadline: game.deadline, serverTime: now(), result: game.result || null,
      room: { count: game.spectators.size, max: game.room.max },
    };
  }
  const viewFor = (game, uid) => (playerOf(game, uid) ? gameView(game, uid, false) : spectatorView(game));
  function toAll(game, event, data) {
    for (const p of game.players) emit(p.uid, event, data(p.uid));
    for (const uid of game.spectators.keys()) emit(uid, event, data(uid));
  }
  function broadcastRoom(game) {
    const st = roomState(game);
    for (const p of game.players) emit(p.uid, "ttt_room_update", { gameId: game.id, ...st, isHost: game.room.host === p.uid });
    for (const uid of game.spectators.keys()) emit(uid, "ttt_room_update", { gameId: game.id, count: st.count, max: st.max, open: st.open, spectator: true });
  }
  function broadcast(game, ev) {
    game.seq += 1;
    toAll(game, "ttt_state", (uid) => {
      return { gameId: game.id, event: ev, ...viewFor(game, uid) };
    });
    persist(game);
  }
  function dropSpectator(game, uid, reason) {
    if (!game.spectators.delete(uid)) return;
    if (watching.get(uid) === game.id) watching.delete(uid);
    emit(uid, "ttt_spectate_end", { gameId: game.id, reason });
  }

  const setDeadline = (game) => {
    const mover = game.players.find((p) => p.seat === seatOfTurn(game.state));
    game.pausedForUid = null;
    game.pausedLeft = 0;
    if (mover && mover.offlineSince && !isOnline(mover.uid)) {
      game.pausedForUid = mover.uid;
      game.pausedLeft = TURN_MS;
      game.deadline = 0;
    } else game.deadline = now() + TURN_MS;
  };
  function pauseTurnClock(game, player) {
    if (game.status !== "active" || seatOfTurn(game.state) !== player.seat || game.pausedForUid === player.uid) return false;
    game.pausedForUid = player.uid;
    game.pausedLeft = Math.max(0, Math.min(TURN_MS, game.deadline - now()));
    game.deadline = 0;
    broadcast(game, { type: "pause", seat: player.seat });
    return true;
  }
  function resumeTurnClock(game, player, notify = true) {
    if (game.pausedForUid !== player.uid) return false;
    game.pausedForUid = null;
    game.deadline = now() + Math.max(RESUME_MIN_MS, Math.min(TURN_MS, game.pausedLeft || 0));
    game.pausedLeft = 0;
    if (notify) broadcast(game, { type: "resume", seat: player.seat });
    return true;
  }

  function finish(game, winnerSeat, reason) {
    if (game.status !== "active") return;
    game.status = "over";
    game.endedAt = now();
    game.pausedForUid = null;
    game.pausedLeft = 0;
    game.deadline = 0;
    game.result = { winner: winnerSeat, reason, line: game.state.line ? [...game.state.line] : null };
    for (const p of game.players) if (byUid.get(p.uid) === game.id) byUid.delete(p.uid);
    toAll(game, "ttt_over", (uid) => ({ gameId: game.id, ...viewFor(game, uid) }));
    if (onGameOver) { try { onGameOver(game); } catch { /* never break the game */ } }
    persist(game);
  }

  /* a player leaves (resigned, missed turns, gone for too long): the other player wins */
  function eliminate(game, player, reason) {
    if (game.status !== "active" || player.out) return;
    player.out = true;
    if (byUid.get(player.uid) === game.id) byUid.delete(player.uid);
    engineResign(game.state, player.seat);
    setDeadline(game);
    broadcast(game, { type: "out", seat: player.seat, reason });
    finish(game, game.state.winner, reason);
  }

  function newRoomCode() {
    for (;;) {
      let c = "";
      for (let i = 0; i < 6; i++) c += ROOM_ALPHABET[crypto.randomInt(ROOM_ALPHABET.length)];
      if (!rooms.has(c)) return c;
    }
  }

  function createGame(entries, hostUid) {
    if (games.size >= MAX_GAMES) throw err("server_full");
    const id = randomHex(8);
    const profiles = {};
    for (const e of entries) profiles[e.uid] = profileOf(e.uid);
    const game = {
      id, status: "active", seq: 0, createdAt: now(), endedAt: null, result: null, profiles,
      players: entries.map((e) => ({ uid: e.uid, seat: e.seat, key: randomHex(12), timeouts: 0, offlineSince: null, out: false })),
      state: newState(entries.map((e) => e.seat)), deadline: 0, pausedForUid: null, pausedLeft: 0,
      room: { code: newRoomCode(), host: hostUid || entries[0].uid, open: false, pin: null, max: 5 },
      spectators: new Map(), offSpec: new Map(),
    };
    setDeadline(game);
    games.set(id, game);
    rooms.set(game.room.code, id);
    for (const e of entries) byUid.set(e.uid, id);
    persist(game);
    return game;
  }
  function startGame(entries, hostUid) {
    const game = createGame(entries, hostUid);
    for (const p of game.players) emit(p.uid, "ttt_game_start", gameView(game, p.uid, true));
    return game;
  }

  /* a coin flip decides who plays X (and so moves first) */
  function startDirect(hostUid, guestUid) {
    if (isBusy(hostUid) || isBusy(guestUid)) throw err("busy");
    const order = randomInt(2) === 0 ? [hostUid, guestUid] : [guestUid, hostUid];
    return startGame([{ uid: order[0], seat: 0 }, { uid: order[1], seat: 1 }], hostUid).id;
  }

  /* ---- challenges ---- */
  const challengeView = (c) => ({ id: c.id, from: c.fromProfile, to: c.toProfile, expiresAt: c.expiresAt });

  function challengesOf(uid) {
    const incoming = [], outgoing = [];
    for (const c of challenges.values()) {
      if (c.expiresAt <= now()) continue;
      if (c.toUid === uid) incoming.push(challengeView(c));
      if (c.fromUid === uid) outgoing.push(challengeView(c));
    }
    return { incoming, outgoing };
  }

  function dropChallenge(c, status) {
    challenges.delete(c.id);
    emit(c.toUid, "ttt_challenge_update", { id: c.id, status });
    emit(c.fromUid, "ttt_challenge_update", { id: c.id, status });
  }

  function challenge(fromUid, { toUid } = {}) {
    if (!isOnline(fromUid)) throw err("not_connected");
    if (fromUid === toUid) throw err("self");
    if (!isPresent(toUid)) throw err("offline");
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
    const c = { id: randomHex(8), fromUid, toUid, fromProfile: profileOf(fromUid), toProfile: profileOf(toUid), expiresAt: now() + CHALLENGE_TTL_MS };
    challenges.set(c.id, c);
    lastAsk.set(fromUid, now());
    emit(toUid, "ttt_challenge", challengeView(c));
    emit(fromUid, "ttt_challenge_sent", challengeView(c));
    return { id: c.id };
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
    for (const o of [...challenges.values()]) if ((o.fromUid === c.fromUid || o.toUid === c.fromUid || o.fromUid === c.toUid || o.toUid === c.toUid)) dropChallenge(o, "cancelled");
    emit(c.fromUid, "ttt_challenge_update", { id: c.id, status: "accepted" });
    emit(c.toUid, "ttt_challenge_update", { id: c.id, status: "accepted" });
    const gameId = startDirect(c.fromUid, c.toUid);
    return { ok: true, gameId };
  }

  /* ---- playing ---- */
  function loadGame(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const me = playerOf(game, uid);
    if (!me || typeof key !== "string" || key.length !== me.key.length || !crypto.timingSafeEqual(Buffer.from(me.key), Buffer.from(key))) throw err("bad_key");
    return { game, me };
  }
  function live(game, me) {
    if (game.status !== "active" || me.out) throw err("game_over");
  }
  /* shared by a real move and by the clock running out */
  function doMove(game, seat, cell, auto) {
    const ev = engineMove(game.state, seat, cell);
    if (ev.ok === false) throw err(ev.error === "taken" ? "taken" : ev.error === "bad_cell" ? "bad_cell" : ev.error);
    setDeadline(game);
    broadcast(game, auto ? { ...ev, auto: true } : ev);
    if (ev.win) finish(game, seat, "line");
    else if (ev.draw) finish(game, null, "draw");
  }
  function move(uid, gameId, key, cell) {
    const { game, me } = loadGame(uid, gameId, key);
    live(game, me);
    if (seatOfTurn(game.state) !== me.seat) throw err("not_your_turn");
    doMove(game, me.seat, Number(cell), false);
    me.timeouts = 0;
    return { ok: true };
  }
  function resign(uid, gameId, key) {
    const { game, me } = loadGame(uid, gameId, key);
    live(game, me);
    eliminate(game, me, "resigned");
    return { ok: true };
  }
  function syncState(uid, gameId, key) {
    const { game } = loadGame(uid, gameId, key);
    return { game: gameView(game, uid, true) };
  }

  /* ---- rooms: watching a game ---- */
  function getRoom(uid, gameId, key) {
    const { game } = loadGame(uid, gameId, key);
    return { ...roomState(game), isHost: game.room.host === uid };
  }
  function setRoom(uid, gameId, key, opts = {}) {
    const { game } = loadGame(uid, gameId, key);
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
    if (!game.room.open) for (const u of [...game.spectators.keys()]) dropSpectator(game, u, "closed");
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
        host: profileOf(game.room.host, game),
      }));
  }

  function spectate(uid, rawCode, pin, admin = false) {
    if (!admin && isGuestUid(uid)) throw err("spec_guest");
    if (!admin && !isOnline(uid)) throw err("not_connected");
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tryKey = uid + "|" + code;
    const tries = pinTries.get(tryKey) || { n: 0, lockUntil: 0 };
    if (tries.lockUntil > now()) throw err("pin_locked");
    const game = games.get(rooms.get(code));
    if (!game) throw err("no_room");
    if (game.status !== "active") throw err("spec_over");
    if (!admin && (playerOf(game, uid) || isBusy(uid))) throw err("spec_busy");
    if (!admin && !game.room.open) throw err("room_closed");
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
    const was = games.get(watching.get(uid));
    if (was && was.id !== game.id) { was.spectators.delete(uid); broadcastRoom(was); }
    game.spectators.set(uid, { joinedAt: now() });
    watching.set(uid, game.id);
    broadcastRoom(game);
    persist(game);
    return { view: spectatorView(game), code };
  }
  function leaveSpectate(uid) {
    const game = games.get(watching.get(uid));
    watching.delete(uid);
    if (!game) return { ok: true };
    game.spectators.delete(uid);
    broadcastRoom(game);
    return { ok: true };
  }

  /* ---- voice: players talk, spectators listen ---- */
  function participant(game, uid, key) {
    const p = playerOf(game, uid);
    if (p) { if (p.key !== key) throw err("bad_key"); return "player"; }
    if (game.spectators.has(uid)) return "spectator";
    throw err("no_game");
  }
  function voiceJoin(uid, gameId, key) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const role = participant(game, uid, key);
    const me = playerOf(game, uid);
    const players = {};
    for (const p of livePlayers(game)) players[p.seat] = p.uid;
    const others = [...livePlayers(game).map((p) => p.uid), ...game.spectators.keys()].filter((x) => x !== uid);
    for (const to of others) emit(to, "ttt_voice_peer", { gameId: game.id, uid, role, color: me ? me.seat : null });
    return { ok: true, role, color: me ? me.seat : null, players };
  }
  function voiceSignal(uid, gameId, key, to, data) {
    const game = games.get(String(gameId));
    if (!game) throw err("no_game");
    const role = participant(game, uid, key);
    const target = String(to || "");
    const toIsPlayer = livePlayers(game).some((p) => p.uid === target);
    if (!toIsPlayer && !game.spectators.has(target)) throw err("no_game");
    if (role === "spectator" && !toIsPlayer) throw err("bad_signal");
    if (!data || typeof data !== "object" || !["offer", "answer", "ice", "bye"].includes(data.kind)) throw err("bad_signal");
    if (JSON.stringify(data).length > 12000) throw err("bad_signal");
    emit(target, "ttt_voice_signal", { gameId: game.id, from: uid, role, data });
    return { ok: true };
  }

  /* what a freshly opened stream needs to know about Tic-Tac-Toe (this is also how a player gets back into a game after a reconnect) */
  function hello(uid, sink) {
    const g = activeGameOf(uid);
    const { incoming, outgoing } = challengesOf(uid);
    const w = games.get(watching.get(uid));
    let resumed = false;
    const p = g && playerOf(g, uid);
    if (p) {
      const wasOffline = !!p.offlineSince;
      p.offlineSince = null;
      if (wasOffline) for (const o of g.players) if (o !== p) emit(o.uid, "ttt_opponent", { gameId: g.id, uid, online: true });
      resumed = resumeTurnClock(g, p, false);
    }
    sink.send("ttt_hello", {
      incoming, outgoing, serverTime: now(),
      game: g ? gameView(g, uid, true) : null,
      spectate: w && w.status === "active" && w.spectators.has(uid) ? spectatorView(w) : null,
    });
    if (resumed) broadcast(g, { type: "resume", seat: p.seat });
  }
  chess.onConnect(hello);

  function sweep() {
    const t = now();
    for (const c of [...challenges.values()]) {
      if (c.expiresAt <= t) dropChallenge(c, "expired");
      else if (!isOnline(c.fromUid)) dropChallenge(c, "cancelled");
    }
    for (const [k, until] of cooldowns) if (until <= t) cooldowns.delete(k);
    for (const [id, game] of [...games]) {
      if (game.status !== "active") {
        if (t - (game.endedAt || t) > GAME_KEEP_MS) {
          for (const u of [...game.spectators.keys()]) dropSpectator(game, u, "ended");
          rooms.delete(game.room.code);
          games.delete(id);
          if (persistence) persistence.remove(id).catch(() => {});
        }
        continue;
      }
      for (const p of livePlayers(game)) {
        if (isOnline(p.uid)) {
          if (p.offlineSince) {
            p.offlineSince = null;
            for (const o of game.players) if (o !== p) emit(o.uid, "ttt_opponent", { gameId: game.id, uid: p.uid, online: true });
            resumeTurnClock(game, p);
          }
        } else if (!p.offlineSince) {
          p.offlineSince = t;
          for (const o of game.players) if (o !== p) emit(o.uid, "ttt_opponent", { gameId: game.id, uid: p.uid, online: false });
          pauseTurnClock(game, p);
        } else if (t - p.offlineSince > DISCONNECT_FORFEIT_MS) {
          eliminate(game, p, "left");
          if (game.status !== "active") break;
        }
      }
      if (game.status !== "active") continue;
      for (const sUid of [...game.spectators.keys()]) {
        if (isOnline(sUid)) { game.offSpec.delete(sUid); continue; }
        if (!game.offSpec.has(sUid)) game.offSpec.set(sUid, t);
        else if (t - game.offSpec.get(sUid) > SPECTATOR_OFFLINE_MS) { game.offSpec.delete(sUid); dropSpectator(game, sUid, "left"); broadcastRoom(game); }
      }
      if (game.pausedForUid || t < game.deadline) continue;
      /* the clock ran out: a move is made for them, and three misses in a row puts them out */
      const seat = seatOfTurn(game.state);
      const p = game.players.find((x) => x.seat === seat);
      p.timeouts += 1;
      if (p.timeouts >= MAX_TIMEOUTS) { eliminate(game, p, "timeout"); continue; }
      try { doMove(game, seat, chooseMove(game.state, seat, "medium", rng), true); } catch { setDeadline(game); }
    }
  }

  return {
    restore, flush: () => persistence ? persistence.flush() : Promise.resolve(), challenge, cancelChallenge, respond, startDirect, move, resign, syncState, sweep, hello,
    getRoom, setRoom, spectate, adminSpectate: (uid, code) => spectate(uid, code, undefined, true), activeMatches, leaveSpectate, voiceJoin, voiceSignal,
    isBusy, isOnline, activeGameOf,
    setOnGameOver: (fn) => { onGameOver = typeof fn === "function" ? fn : null; },
    stats: () => ({ games: games.size, challenges: challenges.size }),
    HubError,
  };
}
