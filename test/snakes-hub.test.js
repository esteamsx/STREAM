import test from "node:test";
import assert from "node:assert/strict";
import { createSnakesHub, TURN_MS } from "../services/snakes-mp.js";
import { JUMPS } from "../public/snakes/snakes-engine.js";

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
  const hub = createSnakesHub({ chess, now: () => t, ...hubOpts });
  for (const u of users) chess.connect(u);
  return { chess, hub, advance: (ms) => { t += ms; }, clock: () => t };
}
function startFour(ctx) {
  const { hub, chess, advance } = ctx;
  hub.challenge("a", { toUid: "b", size: 4 });
  advance(500); hub.challenge("a", { toUid: "c", size: 4 });
  advance(500); hub.challenge("a", { toUid: "d", size: 4 });
  for (const u of ["b", "c", "d"]) hub.respond(u, chess.last(u, "snakes_challenge").id, true);
  const starts = {};
  for (const u of ["a", "b", "c", "d"]) starts[u] = chess.last(u, "snakes_game_start");
  return starts;
}
const uidAt = (starts, seat) => Object.keys(starts).find((u) => starts[u].you === seat);
const rollFor = (ctx, starts, uid) => ctx.hub.roll(uid, starts[uid].id, starts[uid].key);
const turnUid = (ctx, starts) => { const v = ctx.chess.last("a", "snakes_state") || starts.a; return uidAt(starts, v.state.turn); };


test("a 4 player table starts when every seat is taken", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  assert.deepEqual(Object.values(starts).map((g) => g.you).sort(), [0, 1, 2, 3]);
  for (const u of ["a", "b", "c", "d"]) {
    const g = starts[u];
    assert.equal(g.players.length, 4);
    assert.ok(g.key && g.room && g.room.code.length === 6);
    assert.deepEqual(g.state.pos, { 0: 0, 1: 0, 2: 0, 3: 0 });
  }
  assert.ok(ctx.hub.isBusy("a") && ctx.hub.isBusy("d"));
});

test("a 2 player challenge starts a game once accepted", () => {
  const ctx = setup(["a", "b"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  const out = ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  assert.ok(out.gameId);
  assert.equal(ctx.chess.last("a", "snakes_game_start").players.length, 2);
});

test("only the player whose turn it is can roll, and the wrong key is refused", () => {
  const ctx = setup(undefined, { randomInt: () => 0 });   // the die shows 1, so the turn always passes on
  const starts = startFour(ctx);
  const first = uidAt(starts, starts.a.state.turn);
  const other = ["a", "b", "c", "d"].find((u) => u !== first);
  assert.throws(() => rollFor(ctx, starts, other), /not your turn/i);
  assert.throws(() => ctx.hub.roll(first, starts[first].id, "wrong"), /session is not valid/i);
  rollFor(ctx, starts, first);
  assert.throws(() => rollFor(ctx, starts, first), /not your turn/i);
});

test("the server rolls the die: everyone sees the same roll and move, in the same order", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  const first = uidAt(starts, starts.a.state.turn);
  rollFor(ctx, starts, first);
  const seen = ["a", "b", "c", "d"].map((u) => ctx.chess.last(u, "snakes_state"));
  assert.ok(seen.every((s) => s.seq === 1));
  const ev = seen[0].event;
  assert.equal(ev.type, "roll");
  assert.ok(ev.value >= 1 && ev.value <= 6);
  assert.equal(ev.seat, starts[first].you);
  for (const s of seen) { assert.deepEqual(s.event, ev); assert.deepEqual(s.state.pos, seen[0].state.pos); }
  assert.equal(seen[0].state.pos[ev.seat], ev.to);
  if (!ev.extra) assert.notEqual(seen[0].state.turn, ev.seat);
});

test("a whole 4 player game can be played through the hub to a winner", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.advance(3 * 60 * 1000 + 1);
  let over = null;
  for (let i = 0; i < 6000 && !over; i++) {
    const v = ctx.chess.last("a", "snakes_state") || starts.a;
    rollFor(ctx, starts, uidAt(starts, v.state.turn));
    over = ctx.chess.last("a", "snakes_over");
    ctx.advance(500);
  }
  assert.ok(over, "the game should finish");
  assert.equal(over.status, "over");
  assert.equal(over.result.reason, "home");
  assert.equal(over.state.pos[over.result.winner], 100);
  assert.equal(over.state.winner, over.result.winner);
  assert.ok(!ctx.hub.isBusy("a"));
  const winnerUid = uidAt(starts, over.result.winner);
  assert.ok(ctx.hub.rewardableWin(winnerUid, starts[winnerUid].id));
  assert.equal(ctx.hub.rewardableWin("not-the-winner", starts[winnerUid].id), null);
  assert.equal(ctx.hub.rewardableWin(winnerUid, "not-a-server-game"), null);
  assert.throws(() => rollFor(ctx, starts, uidAt(starts, over.result.winner)), /over/i);
  for (const u of ["b", "c", "d"]) assert.equal(ctx.chess.last(u, "snakes_over").result.winner, over.result.winner);
});

test("a player who reconnects is put straight back into their game", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  rollFor(ctx, starts, uidAt(starts, starts.a.state.turn));
  ctx.chess.online.delete("b");
  const sink = ctx.chess.connect("b");
  const hello = sink.sent.find((m) => m.event === "snakes_hello");
  assert.ok(hello);
  assert.equal(hello.data.game.id, starts.b.id);
  assert.equal(hello.data.game.key, starts.b.key);
  assert.equal(hello.data.game.seq, 1);
  assert.deepEqual(hello.data.game.state.pos, ctx.chess.last("a", "snakes_state").state.pos);
  const sync = ctx.hub.syncState("b", starts.b.id, starts.b.key);
  assert.equal(sync.game.seq, 1);
});

test("others are told when a player drops and returns; leaving for good puts them out and the rest play on", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.chess.online.delete("c");
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("a", "snakes_opponent").online, false);
  ctx.chess.online.add("c");
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("a", "snakes_opponent").online, true);
  ctx.chess.online.delete("c");
  ctx.hub.sweep();
  ctx.advance(3 * 60 * 1000 + 1000);
  ctx.hub.sweep();
  const st = ctx.chess.last("a", "snakes_state");
  assert.ok(st.state.out.includes(starts.c.you));
  assert.equal(ctx.hub.activeGameOf("c"), null);
  assert.ok(ctx.hub.activeGameOf("a"));
});

test("a missed turn is rolled for you, and three misses in a row put you out", () => {
  const ctx = setup(["a", "b"], { randomInt: () => 0 });   // the die always shows 1, so nobody can win during the test
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  const starts = { a: ctx.chess.last("a", "snakes_game_start"), b: ctx.chess.last("b", "snakes_game_start") };
  const idle = uidAt(starts, starts.a.state.turn);
  const other = idle === "a" ? "b" : "a";
  ctx.advance(TURN_MS + 10);
  ctx.hub.sweep();
  const s1 = ctx.chess.last("a", "snakes_state");
  assert.ok(s1.event.auto, "the clock rolled the die");
  let guard = 0;
  while (ctx.hub.activeGameOf(idle) && guard++ < 60) {
    const v = ctx.chess.last(other, "snakes_state");
    if (v.state.turn === starts[other].you) rollFor(ctx, starts, other);
    ctx.advance(TURN_MS + 10);
    ctx.hub.sweep();
  }
  assert.equal(ctx.hub.activeGameOf(idle), null);
  assert.equal(ctx.chess.last(other, "snakes_over").result.winner, starts[other].you);
});

test("resigning in a 4 player game puts only that player out", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.hub.resign("d", starts.d.id, starts.d.key);
  assert.deepEqual(ctx.chess.last("a", "snakes_state").state.out, [starts.d.you]);
  assert.equal(ctx.chess.last("a", "snakes_over"), null);
  ctx.hub.resign("c", starts.c.id, starts.c.key);
  ctx.hub.resign("b", starts.b.id, starts.b.key);
  assert.equal(ctx.chess.last("a", "snakes_over").result.winner, starts.a.you);
  assert.equal(ctx.hub.rewardableWin("a", starts.a.id), null);
});

test("a player whose turn it is resigns: the turn moves on", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  const first = uidAt(starts, starts.a.state.turn);
  ctx.hub.resign(first, starts[first].id, starts[first].key);
  const st = ctx.chess.last(first === "a" ? "b" : "a", "snakes_state");
  assert.notEqual(st.state.turn, starts[first].you);
  assert.ok(!st.state.out.includes(st.state.turn));
});

test("room: spectators need the code and PIN, and the host controls who watches", () => {
  const ctx = setup(["a", "b", "w"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  const g = ctx.chess.last("a", "snakes_game_start"), gb = ctx.chess.last("b", "snakes_game_start");
  const code = g.room.code;
  assert.throws(() => ctx.hub.spectate("w", code), /not open/i);
  const hostUid = g.room.isHost ? "a" : "b";
  const host = hostUid === "a" ? g : gb, guest = hostUid === "a" ? gb : g;
  ctx.hub.setRoom(hostUid, host.id, host.key, { open: true, pin: "1234" });
  assert.throws(() => ctx.hub.spectate("w", code), /PIN/);
  assert.throws(() => ctx.hub.spectate("w", code, "0000"), /not right/);
  const out = ctx.hub.spectate("w", code, "1234");
  assert.deepEqual(out.view.state.pos, { 0: 0, 1: 0 });
  assert.throws(() => ctx.hub.setRoom(hostUid === "a" ? "b" : "a", guest.id, guest.key, { open: false }), /host/i);
  rollFor(ctx, { a: g, b: gb }, ctx.chess.last("a", "snakes_game_start").state.turn === g.you ? "a" : "b");
  assert.ok(ctx.chess.last("w", "snakes_state"), "spectators get every move");
  ctx.hub.setRoom(hostUid, host.id, host.key, { open: false });
  assert.equal(ctx.chess.last("w", "snakes_spectate_end").reason, "closed");
  assert.throws(() => ctx.hub.setRoom(hostUid, host.id, host.key, { pin: "12" }), /PIN/);
});

test("voice: players and spectators exchange signals, spectators can only talk to players", () => {
  const ctx = setup(["a", "b", "w"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  const g = ctx.chess.last("a", "snakes_game_start"), gb = ctx.chess.last("b", "snakes_game_start");
  const hostUid = g.room.isHost ? "a" : "b";
  const host = hostUid === "a" ? g : gb;
  ctx.hub.setRoom(hostUid, host.id, host.key, { open: true });
  ctx.hub.spectate("w", g.room.code);
  assert.equal(ctx.hub.voiceJoin("a", g.id, g.key).role, "player");
  assert.ok(ctx.chess.last("b", "snakes_voice_peer"));
  ctx.hub.voiceSignal("a", g.id, g.key, "b", { kind: "offer", sdp: "x" });
  assert.equal(ctx.chess.last("b", "snakes_voice_signal").from, "a");
  ctx.hub.voiceSignal("b", gb.id, gb.key, "w", { kind: "offer", sdp: "y" });
  assert.throws(() => ctx.hub.voiceSignal("w", g.id, null, "x-nobody", { kind: "offer" }), /not found/i);
  assert.throws(() => ctx.hub.voiceSignal("a", g.id, g.key, "b", { kind: "nonsense" }), /not valid/i);
});

test("one game at a time", () => {
  const ctx = setup(["a", "b", "c"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "a", size: 2 }), /in a game/i);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "c", size: 2 }), /Finish your current game/i);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "c", size: 2 }), /yourself/i);
});

test("a table can be started early with 2 players, and the host closing it ends it for everyone", () => {
  const ctx = setup();
  ctx.hub.challenge("a", { toUid: "b", size: 4 });
  ctx.hub.respond("b", ctx.chess.last("b", "snakes_challenge").id, true);
  assert.equal(ctx.chess.last("a", "snakes_table").seats.length, 2);
  assert.throws(() => ctx.hub.startTableNow("b"), /no longer open/i);
  ctx.hub.startTableNow("a");
  assert.equal(ctx.chess.last("a", "snakes_game_start").players.length, 2);
  const other = setup();
  other.hub.challenge("a", { toUid: "b", size: 3 });
  other.hub.respond("b", other.chess.last("b", "snakes_challenge").id, true);
  other.hub.leaveTable("a");
  assert.equal(other.chess.last("b", "snakes_table_end").reason, "cancelled");
});

test("declined and expired requests are cleaned up", () => {
  const ctx = setup(["a", "b"]);
  const { id } = ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", id, false);
  assert.equal(ctx.chess.last("a", "snakes_challenge_update").status, "declined");
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "b", size: 2 }), /wait a moment/i);
  ctx.advance(16000);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.advance(61000);
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("b", "snakes_challenge_update").status, "expired");
});
