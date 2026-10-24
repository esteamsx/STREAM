import crypto from "crypto";
import { newState, applyRoll, applyMove, chooseToken, rollValue, colorOfTurn, removeSeat } from "../public/ludo/ludo-engine.js";

/* Online Ludo for 2 to 4 players. It shares the chess stream for presence (so people are "online"
   on every page) and sends its own events (ludo_*) down that same stream. Like chess, every game
   has a room code so people can watch it, and players can talk by voice. */

export const ROLL_MS = 30 * 1000;       // time to roll the dice
export const MOVE_MS = 25 * 1000;       // time to pick a token after rolling
const MAX_TIMEOUTS = 3;                  // this many missed turns in a row and the player is out
const CHALLENGE_TTL_MS = 60 * 1000;
const TABLE_TTL_MS = 10 * 60 * 1000;
const DECLINE_COOLDOWN_MS = 15 * 1000;
const CHALLENGE_GAP_MS = 2000;
const TABLE_INVITE_GAP_MS = 400;     // inviting several friends to one table should not feel slow
const DISCONNECT_FORFEIT_MS = 3 * 60 * 1000;
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
  already_rolled: "You already rolled. Pick a token to move.",
  must_roll: "Roll the dice first.",
  bad_move: "That token cannot move.",
  server_full: "The game server is full. Try again in a few minutes.",
  host_offline: "The host is not online right now. Try again in a moment.",
  host_busy: "The host is in another game right now. Try again in a moment.",
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
  bad_size: "A Ludo game has 2 to 4 players.",
  in_table: "You already have a table open.",
  no_table: "That table is no longer open.",
  table_full: "That table is full.",
  few_players: "You need at least 2 players to start.",
};
const err = (code) => new HubError(code, MESSAGES[code]);
const COLOR_IDS = ["red", "green", "yellow", "blue"];

export function createLudoHub({ chess, now = () => Date.now(), randomHex = (n) => crypto.randomBytes(n).toString("hex"), randomInt = (n) => crypto.randomInt(n) } = {}) {
  const challenges = new Map();   // id -> challenge (a request to a player, or an invite to a table)
  const tables = new Map();       // id -> pre-game table
  const tableOf = new Map();      // uid -> table id
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
  const isPresent = (uid) => (chess.isPresent ? chess.isPresent(uid) : chess.isOnline(uid));   // includes a short gap while someone changes page
  const activeGameOf = (uid) => { const g = games.get(byUid.get(uid)); return g && g.status === "active" ? g : null; };
  const isBusy = (uid) => !!activeGameOf(uid);
  const fallbackProfile = (uid) => ({ uid, username: "", name: "Player", photo: null, verified: false, guest: isGuestUid(uid) });
  const profileOf = (uid, game) => chess.profileOf(uid) || (game && game.profiles && game.profiles[uid]) || fallbackProfile(uid);
  const playerOf = (game, uid) => game.players.find((p) => p.uid === uid) || null;
  const livePlayers = (game) => game.players.filter((p) => !p.out);

  /* ---- views ---- */
  function stateView(game) {
    const st = game.state;
    return { seats: st.seats, tokens: st.tokens, turn: colorOfTurn(st), roll: st.roll, sixes: st.sixes, winner: st.winner, lastMove: st.lastMove, out: st.out || [] };
  }
  function playersView(game) {
    return game.players.map((p) => ({ color: p.color, ...profileOf(p.uid, game), online: isOnline(p.uid), out: !!p.out }));
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
      you: me ? me.color : null, key: withKey && me ? me.key : undefined,
      players: playersView(game), state: stateView(game),
      deadline: game.deadline, serverTime: now(), result: game.result || null,
      room: me && withKey ? { ...roomState(game), isHost: game.room.host === uid } : undefined,
    };
  }
  function spectatorView(game) {
    return {
      id: game.id, spectator: true, status: game.status, seq: game.seq, you: null,
      players: playersView(game), state: stateView(game), deadline: game.deadline, serverTime: now(), result: game.result || null,
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
    for (const p of game.players) emit(p.uid, "ludo_room_update", { gameId: game.id, ...st, isHost: game.room.host === p.uid });
    for (const uid of game.spectators.keys()) emit(uid, "ludo_room_update", { gameId: game.id, count: st.count, max: st.max, open: st.open, spectator: true });
  }
  function broadcast(game, event) {
    game.seq += 1;
    toAll(game, "ludo_state", (uid) => ({ gameId: game.id, event, ...viewFor(game, uid) }));
  }
  function dropSpectator(game, uid, reason) {
    if (!game.spectators.delete(uid)) return;
    if (watching.get(uid) === game.id) watching.delete(uid);
    emit(uid, "ludo_spectate_end", { gameId: game.id, reason });
  }

  const setDeadline = (game) => { game.deadline = now() + (game.state.roll ? MOVE_MS : ROLL_MS); };

  function finish(game, winnerColor, reason) {
    if (game.status !== "active") return;
    game.status = "over";
    game.endedAt = now();
    game.result = { winner: winnerColor, reason };
    for (const p of game.players) if (byUid.get(p.uid) === game.id) byUid.delete(p.uid);
    toAll(game, "ludo_over", (uid) => ({ gameId: game.id, ...viewFor(game, uid) }));
    if (onGameOver) { try { onGameOver(game); } catch { /* never break the game */ } }
  }

  /* a player leaves (resigned, missed turns, gone for too long): everyone else carries on */
  function eliminate(game, player, reason) {
    if (game.status !== "active" || player.out) return;
    player.out = true;
    removeSeat(game.state, player.color);
    const left = livePlayers(game);
    setDeadline(game);
    broadcast(game, { type: "out", color: player.color, reason });
    if (left.length <= 1) finish(game, left.length ? left[0].color : null, reason);
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
      players: entries.map((e) => ({ uid: e.uid, color: e.color, key: randomHex(12), timeouts: 0, offlineSince: null, out: false })),
      state: newState(entries.map((e) => e.color)), deadline: 0,
      room: { code: newRoomCode(), host: hostUid || entries[0].uid, open: false, pin: null, max: 5 },
      spectators: new Map(), offSpec: new Map(),
    };
    setDeadline(game);
    games.set(id, game);
    rooms.set(game.room.code, id);
    for (const e of entries) byUid.set(e.uid, id);
    return game;
  }
  function startGame(entries, hostUid) {
    const game = createGame(entries, hostUid);
    for (const p of game.players) emit(p.uid, "ludo_game_start", gameView(game, p.uid, true));
    return game;
  }

  const pickColor = (pref) => { const i = COLOR_IDS.indexOf(pref); return i >= 0 ? i : randomInt(4); };

  function startDirect(hostUid, guestUid, { color } = {}) {
    if (isBusy(hostUid) || isBusy(guestUid)) throw err("busy");
    const c = pickColor(color);
    return startGame([{ uid: hostUid, color: c }, { uid: guestUid, color: (c + 2) % 4 }], hostUid).id;
  }

  /* ---- tables: 3 and 4 player games wait here until everyone has joined ---- */
  const tableView = (t) => ({
    id: t.id, size: t.size, host: t.hostUid, expiresAt: t.expiresAt,
    seats: t.seats.map((s) => ({ color: s.color, ...profileOf(s.uid) })),
    invited: [...challenges.values()].filter((c) => c.tableId === t.id && c.expiresAt > now()).map((c) => ({ id: c.id, to: c.toProfile })),
  });
  function pushTable(t) { const v = tableView(t); for (const s of t.seats) emit(s.uid, "ludo_table", v); }
  function dropTable(t, reason) {
    tables.delete(t.id);
    for (const s of t.seats) { if (tableOf.get(s.uid) === t.id) tableOf.delete(s.uid); emit(s.uid, "ludo_table_end", { id: t.id, reason }); }
    for (const c of [...challenges.values()]) if (c.tableId === t.id) dropChallenge(c, "cancelled");
  }
  function nextColor(t) {
    const host = t.seats[0].color;
    for (const c of [(host + 2) % 4, (host + 1) % 4, (host + 3) % 4]) if (!t.seats.some((s) => s.color === c)) return c;
    return null;
  }
  function createTable(hostUid, { size, color } = {}) {
    size = Number(size);
    if (![2, 3, 4].includes(size)) throw err("bad_size");
    if (!isOnline(hostUid)) throw err("not_connected");
    if (isBusy(hostUid)) throw err("busy");
    if (tableOf.has(hostUid)) throw err("in_table");
    const t = { id: randomHex(6), hostUid, size, seats: [{ uid: hostUid, color: pickColor(color) }], expiresAt: now() + TABLE_TTL_MS };
    tables.set(t.id, t);
    tableOf.set(hostUid, t.id);
    pushTable(t);
    return { id: t.id };
  }
  function startTable(t) {
    if (t.seats.length < 2) throw err("few_players");
    tables.delete(t.id);
    for (const c of [...challenges.values()]) if (c.tableId === t.id) dropChallenge(c, "cancelled");
    for (const s of t.seats) tableOf.delete(s.uid);
    startGame(t.seats.map((s) => ({ uid: s.uid, color: s.color })), t.hostUid);
    for (const s of t.seats) emit(s.uid, "ludo_table_end", { id: t.id, reason: "started" });
  }
  function startTableNow(uid) {
    const t = tables.get(tableOf.get(uid));
    if (!t || t.hostUid !== uid) throw err("no_table");
    startTable(t);
    return { ok: true };
  }
  function leaveTable(uid) {
    const t = tables.get(tableOf.get(uid));
    if (!t) return { ok: true };
    if (t.hostUid === uid) { dropTable(t, "cancelled"); return { ok: true }; }
    t.seats = t.seats.filter((s) => s.uid !== uid);
    tableOf.delete(uid);
    emit(uid, "ludo_table_end", { id: t.id, reason: "left" });
    pushTable(t);
    return { ok: true };
  }
  const myTable = (uid) => { const t = tables.get(tableOf.get(uid)); return t ? tableView(t) : null; };

  /* ---- challenges ---- */
  const challengeView = (c) => ({ id: c.id, from: c.fromProfile, to: c.toProfile, color: c.color, size: c.size, expiresAt: c.expiresAt });

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
    emit(c.toUid, "ludo_challenge_update", { id: c.id, status });
    emit(c.fromUid, "ludo_challenge_update", { id: c.id, status });
    const t = c.tableId ? tables.get(c.tableId) : null;
    if (t) pushTable(t);
  }

  function challenge(fromUid, { toUid, color, size } = {}) {
    size = [2, 3, 4].includes(Number(size)) ? Number(size) : 2;
    if (!isOnline(fromUid)) throw err("not_connected");
    if (fromUid === toUid) throw err("self");
    if (!isPresent(toUid)) throw err("offline");
    if (isBusy(fromUid)) throw err("busy");
    if (isBusy(toUid) || tableOf.has(toUid)) throw err("target_busy");
    const gap = size > 2 || tableOf.has(fromUid) ? TABLE_INVITE_GAP_MS : CHALLENGE_GAP_MS;
    if (now() - (lastAsk.get(fromUid) || 0) < gap) throw err("slow_down");
    if ((cooldowns.get(fromUid + ">" + toUid) || 0) > now()) throw err("cooldown");
    let table = tables.get(tableOf.get(fromUid)) || null;
    if (size > 2 || table) {
      if (!table) { createTable(fromUid, { size, color }); table = tables.get(tableOf.get(fromUid)); }
      if (table.hostUid !== fromUid) throw err("in_table");
      const pending = [...challenges.values()].filter((c) => c.tableId === table.id && c.expiresAt > now()).length;
      if (table.seats.length + pending >= table.size) throw err("table_full");
    }
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
      id: randomHex(8), fromUid, toUid, color: COLOR_IDS.includes(color) ? color : "random", size: table ? table.size : 2, tableId: table ? table.id : null,
      fromProfile: profileOf(fromUid), toProfile: profileOf(toUid), expiresAt: now() + CHALLENGE_TTL_MS,
    };
    challenges.set(c.id, c);
    lastAsk.set(fromUid, now());
    emit(toUid, "ludo_challenge", challengeView(c));
    emit(fromUid, "ludo_challenge_sent", challengeView(c));
    if (table) pushTable(table);
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
    if (c.tableId) {
      const t = tables.get(c.tableId);
      if (!t || !isOnline(c.fromUid)) { dropChallenge(c, "expired"); throw err("no_table"); }
      if (isBusy(uid) || tableOf.has(uid)) throw err("busy");
      if (t.seats.length >= t.size) { dropChallenge(c, "expired"); throw err("table_full"); }
      challenges.delete(c.id);
      emit(c.fromUid, "ludo_challenge_update", { id: c.id, status: "accepted" });
      emit(c.toUid, "ludo_challenge_update", { id: c.id, status: "accepted" });
      for (const o of [...challenges.values()]) if (o.toUid === uid && !o.tableId) dropChallenge(o, "cancelled");
      t.seats.push({ uid, color: nextColor(t) });
      tableOf.set(uid, t.id);
      pushTable(t);
      if (t.seats.length >= t.size) startTable(t);
      return { ok: true, table: true };
    }
    if (!isOnline(c.fromUid) || !isOnline(c.toUid) || isBusy(c.fromUid) || isBusy(c.toUid)) { dropChallenge(c, "expired"); throw err("unavailable"); }
    challenges.delete(c.id);
    for (const o of [...challenges.values()]) if (!o.tableId && (o.fromUid === c.fromUid || o.toUid === c.fromUid || o.fromUid === c.toUid || o.toUid === c.toUid)) dropChallenge(o, "cancelled");
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
  function doRoll(game, color) {
    const res = applyRoll(game.state, rollValue());
    setDeadline(game);
    broadcast(game, { type: "roll", color, value: res.value, skipped: res.skipped });
  }
  function doMove(game, token) {
    const mv = applyMove(game.state, token);
    if (!mv) throw err("bad_move");
    setDeadline(game);
    broadcast(game, { type: "move", move: mv });
    if (game.state.winner != null) finish(game, game.state.winner, "home");
  }
  function roll(uid, gameId, key) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active" || me.out) throw err("game_over");
    if (colorOfTurn(game.state) !== me.color) throw err("not_your_turn");
    if (game.state.roll) throw err("already_rolled");
    me.timeouts = 0;
    doRoll(game, me.color);
    return { ok: true };
  }
  function move(uid, gameId, key, token) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active" || me.out) throw err("game_over");
    if (colorOfTurn(game.state) !== me.color) throw err("not_your_turn");
    if (!game.state.roll) throw err("must_roll");
    me.timeouts = 0;
    doMove(game, Number(token));
    return { ok: true };
  }
  function resign(uid, gameId, key) {
    const { game, me } = loadGame(uid, gameId, key);
    if (game.status !== "active" || me.out) throw err("game_over");
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
    return { ...roomState(game), isHost: true };
  }
  function spectate(uid, rawCode, pin) {
    if (isGuestUid(uid)) throw err("spec_guest");
    if (!isOnline(uid)) throw err("not_connected");
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tryKey = uid + "|" + code;
    const tries = pinTries.get(tryKey) || { n: 0, lockUntil: 0 };
    if (tries.lockUntil > now()) throw err("pin_locked");
    const game = games.get(rooms.get(code));
    if (!game) throw err("no_room");
    if (game.status !== "active") throw err("spec_over");
    if (playerOf(game, uid) || isBusy(uid)) throw err("spec_busy");
    if (!game.room.open) throw err("room_closed");
    if (game.room.pin) {
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
    if (!game.spectators.has(uid) && game.spectators.size >= game.room.max) throw err("room_full");
    const was = games.get(watching.get(uid));
    if (was && was.id !== game.id) { was.spectators.delete(uid); broadcastRoom(was); }
    game.spectators.set(uid, { joinedAt: now() });
    watching.set(uid, game.id);
    broadcastRoom(game);
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
    for (const p of livePlayers(game)) players[p.color] = p.uid;
    const others = [...livePlayers(game).map((p) => p.uid), ...game.spectators.keys()].filter((x) => x !== uid);
    for (const to of others) emit(to, "ludo_voice_peer", { gameId: game.id, uid, role, color: me ? me.color : null });
    return { ok: true, role, color: me ? me.color : null, players };
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
    emit(target, "ludo_voice_signal", { gameId: game.id, from: uid, role, data });
    return { ok: true };
  }

  /* what a freshly opened stream needs to know about Ludo */
  function hello(uid, sink) {
    const g = activeGameOf(uid);
    const { incoming, outgoing } = challengesOf(uid);
    const w = games.get(watching.get(uid));
    sink.send("ludo_hello", {
      incoming, outgoing, table: myTable(uid), serverTime: now(),
      game: g ? gameView(g, uid, true) : null,
      spectate: w && w.status === "active" && w.spectators.has(uid) ? spectatorView(w) : null,
    });
    if (g) { const p = playerOf(g, uid); if (p) p.offlineSince = null; }
  }
  chess.onConnect(hello);

  function sweep() {
    const t = now();
    for (const c of [...challenges.values()]) {
      if (c.expiresAt <= t) dropChallenge(c, "expired");
      else if (!isOnline(c.fromUid)) dropChallenge(c, "cancelled");
    }
    for (const tb of [...tables.values()]) {
      if (tb.expiresAt <= t || !isOnline(tb.hostUid)) { dropTable(tb, tb.expiresAt <= t ? "expired" : "cancelled"); continue; }
      const gone = tb.seats.filter((s) => s.uid !== tb.hostUid && !isOnline(s.uid));
      if (gone.length) {
        tb.seats = tb.seats.filter((s) => !gone.includes(s));
        for (const s of gone) { tableOf.delete(s.uid); emit(s.uid, "ludo_table_end", { id: tb.id, reason: "left" }); }
        pushTable(tb);
      }
    }
    for (const [k, until] of cooldowns) if (until <= t) cooldowns.delete(k);
    for (const [id, game] of [...games]) {
      if (game.status !== "active") {
        if (t - (game.endedAt || t) > GAME_KEEP_MS) {
          for (const u of [...game.spectators.keys()]) dropSpectator(game, u, "ended");
          rooms.delete(game.room.code);
          games.delete(id);
        }
        continue;
      }
      for (const p of livePlayers(game)) {
        if (isOnline(p.uid)) {
          if (p.offlineSince) { p.offlineSince = null; for (const o of game.players) emit(o.uid, "ludo_opponent", { gameId: game.id, uid: p.uid, online: true }); }
        } else if (!p.offlineSince) {
          p.offlineSince = t;
          for (const o of game.players) if (o !== p) emit(o.uid, "ludo_opponent", { gameId: game.id, uid: p.uid, online: false });
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
      if (t < game.deadline) continue;
      const color = colorOfTurn(game.state);
      const p = game.players.find((x) => x.color === color);
      p.timeouts += 1;
      if (p.timeouts >= MAX_TIMEOUTS) { eliminate(game, p, "timeout"); continue; }
      try {
        if (!game.state.roll) doRoll(game, color);
        if (game.status === "active" && colorOfTurn(game.state) === color && game.state.roll) doMove(game, chooseToken(game.state, "medium"));
      } catch { setDeadline(game); }
    }
  }

  return {
    challenge, cancelChallenge, respond, startDirect, roll, move, resign, syncState, sweep, hello,
    createTable, startTableNow, leaveTable, myTable,
    getRoom, setRoom, spectate, leaveSpectate, voiceJoin, voiceSignal,
    isBusy, isOnline, activeGameOf,
    setOnGameOver: (fn) => { onGameOver = typeof fn === "function" ? fn : null; },
    stats: () => ({ games: games.size, challenges: challenges.size, tables: tables.size }),
    HubError,
  };
}
