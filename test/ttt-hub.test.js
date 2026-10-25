import test from "node:test";
import assert from "node:assert/strict";
import { createTttHub, TURN_MS } from "../services/ttt-mp.js";

/* a stand-in for the chess hub: it only has to carry events and say who is online */
function fakeChess() {
  const inbox = new Map(), online = new Set(), hooks = [];
  return {
    inbox, online, hooks,
    emit: (uid, event, data) => { if (!inbox.has(uid)) inbox.set(uid, []); inbox.get(uid).push({ event, data: JSON.parse(JSON.stringify(data)) }); },
    isOnline: (uid) => online.has(uid),
    isPresent: (uid) => online.has(uid),
    profileOf: (uid) => ({ uid, username: uid, name: uid.toUpperCase(), photo: null, verified: false }),
    onConnect: (fn) => hooks.push(fn),
    connect(uid) { online.add(uid); const sink = { sent: [], send(e, d) { this.sent.push({ event: e, data: d }); } }; for (const h of hooks) h(uid, sink); return sink; },
    last: (uid, event) => { const l = (inbox.get(uid) || []).filter((m) => m.event === event); return l.length ? l[l.length - 1].data : null; },
    all: (uid, event) => (inbox.get(uid) || []).filter((m) => m.event === event).map((m) => m.data),
  };
}
function setup(users = ["a", "b", "c", "d"], hubOpts = {}) {
  let t = 1_000_000;
  const chess = fakeChess();
  const hub = createTttHub({ chess, now: () => t, ...hubOpts });
  for (const u of users) chess.connect(u);
  return { chess, hub, advance: (ms) => { t += ms; }, clock: () => t };
}

/* starts a game between a and b; who is X is decided by the coin (the die in the hub), so tests ask the game */
function startPair(ctx, a = "a", b = "b") {
  ctx.hub.challenge(a, { toUid: b });
  ctx.hub.respond(b, ctx.chess.last(b, "ttt_challenge").id, true);
  const s = { [a]: ctx.chess.last(a, "ttt_game_start"), [b]: ctx.chess.last(b, "ttt_game_start") };
  s.x = s[a].you === 0 ? a : b;
  s.o = s.x === a ? b : a;
  return s;
}
const mv = (ctx, s, uid, cell) => ctx.hub.move(uid, s[uid].id, s[uid].key, cell);
const last = (ctx, uid, ev = "ttt_state") => ctx.chess.last(uid, ev);

test("accepting a challenge starts a 2 player game with an empty board, X to move", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  assert.equal(s.a.players.length, 2);
  assert.deepEqual(s.a.players.map((p) => p.mark).sort(), ["O", "X"]);
  assert.deepEqual(s.a.state.board, Array(9).fill(null));
  assert.equal(s.a.state.turn, 0);
  assert.equal(s[s.x].you, 0);
  assert.ok(s.a.key && s.a.room && s.a.room.code.length === 6);
  assert.notEqual(s.a.key, s.b.key);
  assert.ok(ctx.hub.isBusy("a") && ctx.hub.isBusy("b"));
});

test("a coin flip decides who plays X, and both outcomes happen", () => {
  const first = setup(["a", "b"], { randomInt: () => 0 }), second = setup(["a", "b"], { randomInt: () => 1 });
  assert.equal(startPair(first).x, "a");
  assert.equal(startPair(second).x, "b");
});

test("the server enforces turn order, empty squares, real squares and the game key", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  assert.throws(() => mv(ctx, s, s.o, 4), /not your turn/i);
  assert.throws(() => mv(ctx, s, s.x, 9), /not valid/i);
  assert.throws(() => mv(ctx, s, s.x, -1), /not valid/i);
  assert.throws(() => mv(ctx, s, s.x, "x"), /not valid/i);
  assert.throws(() => ctx.hub.move(s.x, s[s.x].id, "wrong", 4), /session is not valid/i);
  mv(ctx, s, s.x, 4);
  assert.throws(() => mv(ctx, s, s.x, 0), /not your turn/i);
  assert.throws(() => mv(ctx, s, s.o, 4), /already taken/i);
  mv(ctx, s, s.o, 0);
  assert.deepEqual(last(ctx, "a").state.board, [1, null, null, null, 0, null, null, null, null]);
});

test("both players see the same move, in the same order, with matching sequence numbers", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  mv(ctx, s, s.x, 4); mv(ctx, s, s.o, 0); mv(ctx, s, s.x, 8);
  const a = ctx.chess.all("a", "ttt_state"), b = ctx.chess.all("b", "ttt_state");
  assert.deepEqual(a.map((m) => m.seq), [1, 2, 3]);
  assert.deepEqual(b.map((m) => m.seq), [1, 2, 3]);
  assert.deepEqual(a.map((m) => m.event), b.map((m) => m.event));
  assert.deepEqual(a.map((m) => m.event.cell), [4, 0, 8]);
  assert.deepEqual(a.map((m) => m.event.mark), ["X", "O", "X"]);
  assert.deepEqual(a[2].state.board, b[2].state.board);
  assert.equal(a[2].state.turn, 1);
});

test("three in a row ends the game with a winner and the winning line", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  mv(ctx, s, s.x, 0); mv(ctx, s, s.o, 3); mv(ctx, s, s.x, 1); mv(ctx, s, s.o, 4); mv(ctx, s, s.x, 2);
  for (const u of ["a", "b"]) {
    const over = last(ctx, u, "ttt_over");
    assert.equal(over.status, "over");
    assert.equal(over.result.winner, 0);
    assert.equal(over.result.reason, "line");
    assert.deepEqual(over.result.line, [0, 1, 2]);
    assert.deepEqual(over.state.line, [0, 1, 2]);
  }
  assert.ok(last(ctx, "a").event.win);
  assert.ok(!ctx.hub.isBusy("a") && !ctx.hub.isBusy("b"));
  assert.throws(() => mv(ctx, s, s.o, 5), /over/i);
});

test("O can win as well", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  mv(ctx, s, s.x, 0); mv(ctx, s, s.o, 3); mv(ctx, s, s.x, 1); mv(ctx, s, s.o, 4); mv(ctx, s, s.x, 8); mv(ctx, s, s.o, 5);
  assert.equal(last(ctx, "a", "ttt_over").result.winner, 1);
  assert.deepEqual(last(ctx, "b", "ttt_over").result.line, [3, 4, 5]);
});

test("a full board with no line is a draw and both players are told", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  const cells = [0, 1, 2, 4, 3, 5, 7, 6, 8];
  cells.forEach((c, i) => mv(ctx, s, i % 2 === 0 ? s.x : s.o, c));
  for (const u of ["a", "b"]) {
    const over = last(ctx, u, "ttt_over");
    assert.equal(over.result.winner, null);
    assert.equal(over.result.reason, "draw");
    assert.ok(over.state.draw);
  }
  assert.ok(last(ctx, "a").event.draw);
  assert.ok(!ctx.hub.isBusy("a"));
});

test("a player who reconnects is put straight back into their game with the board as it is", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  mv(ctx, s, s.x, 4); mv(ctx, s, s.o, 0);
  ctx.chess.online.delete("b");
  const sink = ctx.chess.connect("b");
  const hello = sink.sent.find((m) => m.event === "ttt_hello");
  assert.equal(hello.data.game.id, s.b.id);
  assert.equal(hello.data.game.key, s.b.key);
  assert.equal(hello.data.game.seq, 2);
  assert.deepEqual(hello.data.game.state.board, last(ctx, "a").state.board);
  assert.equal(hello.data.game.you, s.b.you);
  const sync = ctx.hub.syncState("b", s.b.id, s.b.key);
  assert.deepEqual(sync.game.state.board, hello.data.game.state.board);
  mv(ctx, s, s.x, 8);                                       // and the game carries on normally
  assert.equal(last(ctx, "b").seq, 3);
});

test("a disconnected player’s turn clock pauses through the reconnect grace and resumes safely", () => {
  const ctx = setup(["a", "b"], { randomInt: () => 0 });
  const s = startPair(ctx);
  mv(ctx, s, "a", 4);
  ctx.chess.online.delete("b");
  ctx.hub.sweep();
  const paused = ctx.hub.syncState("b", s.b.id, s.b.key).game;
  assert.equal(paused.deadline, 0);
  assert.equal(paused.state.board.filter((cell) => cell != null).length, 1);
  ctx.advance(TURN_MS + 10_000);
  ctx.hub.sweep();
  const waiting = ctx.hub.syncState("b", s.b.id, s.b.key).game;
  assert.equal(waiting.deadline, 0);
  assert.equal(waiting.state.board.filter((cell) => cell != null).length, 1, "offline turn was not auto-played");
  const sink = ctx.chess.connect("b");
  const hello = sink.sent.find((m) => m.event === "ttt_hello");
  assert.ok(hello.data.game.deadline >= ctx.clock() + 5_000, "reconnect restores at least five seconds");
  assert.ok(ctx.chess.last("a", "ttt_state").deadline >= ctx.clock() + 5_000, "opponent receives the resumed deadline");
  mv(ctx, s, "b", 0);
  assert.equal(last(ctx, "a").state.board[0], 1);
});

test("the opponent is told when someone drops and comes back; staying away too long forfeits", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  ctx.chess.online.delete("b");
  ctx.hub.sweep();
  assert.equal(last(ctx, "a", "ttt_opponent").online, false);
  ctx.chess.online.add("b");
  ctx.hub.sweep();
  assert.equal(last(ctx, "a", "ttt_opponent").online, true);
  ctx.chess.online.delete("b");
  ctx.hub.sweep();
  ctx.advance(3 * 60 * 1000 + 1000);
  ctx.hub.sweep();
  const over = last(ctx, "a", "ttt_over");
  assert.equal(over.result.winner, s.a.you);
  assert.equal(over.result.reason, "left");
  assert.ok(!ctx.hub.isBusy("a"));
});

test("a move is made for you when the clock runs out, and three misses in a row lose the game", () => {
  const ctx = setup(["a", "b"], { randomInt: () => 0 });
  const s = startPair(ctx);
  const idle = s.x, other = s.o;
  ctx.advance(TURN_MS + 10);
  ctx.hub.sweep();
  const st = last(ctx, "a");
  assert.ok(st.event.auto, "the clock played a move");
  assert.equal(st.event.seat, 0);
  assert.equal(st.state.board.filter((x) => x != null).length, 1);
  mv(ctx, s, other, st.state.board[8] == null ? 8 : 7);
  ctx.advance(TURN_MS + 10);
  ctx.hub.sweep();
  const cell = [1, 2, 3, 5, 6, 7, 8].find((c) => last(ctx, other).state.board[c] == null);
  mv(ctx, s, other, cell);
  ctx.advance(TURN_MS + 10);
  ctx.hub.sweep();
  const over = last(ctx, other, "ttt_over");
  assert.equal(over.result.reason, "timeout");
  assert.equal(over.result.winner, s[other].you);
  assert.equal(ctx.hub.activeGameOf(idle), null);
});

test("making a move resets your missed-turn count: four misses in total are fine if they are never three in a row", () => {
  const ctx = setup(["a", "b"], { randomInt: () => 0 });  // a plays X; a missed turn is played on the lowest free square
  const s = startPair(ctx);
  const clock = () => { ctx.advance(TURN_MS + 10); ctx.hub.sweep(); };
  clock();                       mv(ctx, s, "b", 1);        // X misses (square 0), O plays 1
  clock();                       mv(ctx, s, "b", 3);        // X misses (square 2), O plays 3
  mv(ctx, s, "a", 4);                                       // X plays for real: the count starts again
  mv(ctx, s, "b", 6);
  clock();                       mv(ctx, s, "b", 7);        // X misses (square 5), O plays 7
  assert.equal(last(ctx, "a", "ttt_over"), null, "three misses were never in a row, so nobody is out yet");
  clock();                                                  // X misses again (square 8) and that completes 0 4 8
  const over = last(ctx, "b", "ttt_over");
  assert.equal(over.result.reason, "line");
  assert.equal(over.result.winner, 0);
  assert.equal(ctx.chess.all("a", "ttt_state").filter((m) => m.event && m.event.auto).length, 4);
});

test("resigning gives the win to the other player", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  mv(ctx, s, s.x, 4);
  ctx.hub.resign(s.x, s[s.x].id, s[s.x].key);
  const over = last(ctx, s.o, "ttt_over");
  assert.equal(over.result.winner, 1);
  assert.equal(over.result.reason, "resigned");
  assert.ok(!ctx.hub.isBusy("a") && !ctx.hub.isBusy("b"));
  assert.throws(() => ctx.hub.resign(s.o, s[s.o].id, s[s.o].key), /over/i);
});

test("a rematch is just a new challenge once the game is over", () => {
  const ctx = setup(["a", "b"]);
  const s = startPair(ctx);
  ctx.hub.resign(s.x, s[s.x].id, s[s.x].key);
  ctx.advance(3000);
  ctx.hub.challenge(s.o, { toUid: s.x });
  ctx.hub.respond(s.x, ctx.chess.last(s.x, "ttt_challenge").id, true);
  const again = ctx.chess.last("a", "ttt_game_start");
  assert.notEqual(again.id, s.a.id);
  assert.deepEqual(again.state.board, Array(9).fill(null));
});

test("room: spectators need the code and PIN, watch every move, and cannot play", () => {
  const ctx = setup(["a", "b", "w"]);
  const s = startPair(ctx);
  const code = s.a.room.code;
  const host = s[s.a.room.isHost ? "a" : "b"].room.isHost ? (s.a.room.isHost ? "a" : "b") : "a";
  assert.throws(() => ctx.hub.spectate("w", code), /not open/i);
  ctx.hub.setRoom(host, s[host].id, s[host].key, { open: true, pin: "1234" });
  assert.throws(() => ctx.hub.spectate("w", code), /PIN/);
  assert.throws(() => ctx.hub.spectate("w", code, "0000"), /not right/);
  const joined = ctx.hub.spectate("w", code, "1234");
  assert.deepEqual(joined.view.state.board, Array(9).fill(null));
  mv(ctx, s, s.x, 4);
  assert.equal(last(ctx, "w").state.board[4], 0);
  assert.throws(() => ctx.hub.move("w", s.a.id, s.a.key, 0), /session is not valid/i);
  const guest = host === "a" ? "b" : "a";
  assert.throws(() => ctx.hub.setRoom(guest, s[guest].id, s[guest].key, { open: false }), /host/i);
  ctx.hub.setRoom(host, s[host].id, s[host].key, { open: false });
  assert.equal(last(ctx, "w", "ttt_spectate_end").reason, "closed");
});

test("voice: the players exchange signals, and spectators can only talk to players", () => {
  const ctx = setup(["a", "b", "w"]);
  const s = startPair(ctx);
  const host = s.a.room.isHost ? "a" : "b";
  ctx.hub.setRoom(host, s[host].id, s[host].key, { open: true });
  ctx.hub.spectate("w", s.a.room.code);
  assert.equal(ctx.hub.voiceJoin("a", s.a.id, s.a.key).role, "player");
  assert.ok(ctx.chess.last("b", "ttt_voice_peer"));
  ctx.hub.voiceSignal("a", s.a.id, s.a.key, "b", { kind: "offer", sdp: "x" });
  assert.equal(ctx.chess.last("b", "ttt_voice_signal").from, "a");
  ctx.hub.voiceSignal("b", s.b.id, s.b.key, "w", { kind: "offer", sdp: "y" });
  assert.throws(() => ctx.hub.voiceSignal("a", s.a.id, s.a.key, "b", { kind: "nonsense" }), /not valid/i);
});

test("one game at a time, and you cannot challenge yourself", () => {
  const ctx = setup(["a", "b", "c"]);
  startPair(ctx);
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "a" }), /in a game/i);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "c" }), /Finish your current game/i);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "c" }), /yourself/i);
});

test("an offline player cannot be challenged, and duplicate requests are refused", () => {
  const ctx = setup(["a", "b"]);
  ctx.chess.online.delete("b");
  assert.throws(() => ctx.hub.challenge("a", { toUid: "b" }), /not online/i);
  ctx.chess.online.add("b");
  ctx.hub.challenge("a", { toUid: "b" });
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "b" }), /already have a request/i);
  assert.throws(() => ctx.hub.challenge("b", { toUid: "a" }), /already challenged you/i);
});

test("declined requests start a cooldown, expired ones are cleaned up, and the sender can cancel", () => {
  const ctx = setup(["a", "b"]);
  const { id } = ctx.hub.challenge("a", { toUid: "b" });
  ctx.hub.respond("b", id, false);
  assert.equal(ctx.chess.last("a", "ttt_challenge_update").status, "declined");
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "b" }), /wait a moment/i);
  ctx.advance(16000);
  const second = ctx.hub.challenge("a", { toUid: "b" });
  ctx.hub.cancelChallenge("a", second.id);
  assert.equal(ctx.chess.last("b", "ttt_challenge_update").status, "cancelled");
  ctx.advance(3000);
  ctx.hub.challenge("a", { toUid: "b" });
  ctx.advance(61000);
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("b", "ttt_challenge_update").status, "expired");
});

test("accepting while the challenger went offline is refused cleanly", () => {
  const ctx = setup(["a", "b"]);
  const { id } = ctx.hub.challenge("a", { toUid: "b" });
  ctx.chess.online.delete("a");
  assert.throws(() => ctx.hub.respond("b", id, true), /no longer available/i);
  assert.ok(!ctx.hub.isBusy("b"));
});
