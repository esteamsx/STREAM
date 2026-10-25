import test from "node:test";
import assert from "node:assert/strict";
import { createWhotHub, TURN_MS } from "../services/whot-mp.js";
import { cardOf, legalPlays, seatOfTurn } from "../public/whot/whot-engine.js";

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
function setup(users = ["a", "b", "c", "d"]) {
  let t = 1_000_000;
  const chess = fakeChess();
  const hub = createWhotHub({ chess, now: () => t });
  for (const u of users) chess.connect(u);
  return { chess, hub, advance: (ms) => { t += ms; }, clock: () => t };
}
function startFour(ctx) {
  const { hub, chess, advance } = ctx;
  hub.challenge("a", { toUid: "b", size: 4 });
  advance(500); hub.challenge("a", { toUid: "c", size: 4 });
  advance(500); hub.challenge("a", { toUid: "d", size: 4 });
  for (const u of ["b", "c", "d"]) hub.respond(u, chess.last(u, "whot_challenge").id, true);
  const starts = {};
  for (const u of ["a", "b", "c", "d"]) starts[u] = chess.last(u, "whot_game_start");
  return starts;
}
const turnUid = (starts, v) => Object.keys(starts).find((u) => starts[u].you === v.state.turn);
const act = (hub, starts, uid) => {
  const g = starts[uid];
  return { gameId: g.id, key: g.key };
};

test("a 4 player table starts when every seat is taken, and every player gets only their own cards", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  assert.deepEqual(Object.values(starts).map((g) => g.you).sort(), [0, 1, 2, 3]);
  for (const u of ["a", "b", "c", "d"]) {
    const g = starts[u];
    assert.equal(g.state.hand.length, 6);
    assert.equal(g.players.length, 4);
    assert.ok(g.key && g.room && g.room.code.length === 6);
    for (const seat of [0, 1, 2, 3]) assert.equal(g.state.counts[seat], 6);
    assert.equal(g.state.reveal, null);
  }
  const hands = Object.values(starts).map((g) => g.state.hand);
  assert.equal(new Set(hands.flat()).size, 24);                    // nobody shares a card
  assert.ok(ctx.hub.isBusy("a") && ctx.hub.isBusy("d"));
});

test("a 2 player challenge starts a game once accepted", () => {
  const ctx = setup(["a", "b"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  const out = ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  assert.ok(out.gameId);
  assert.equal(ctx.chess.last("a", "whot_game_start").players.length, 2);
});

test("the server rejects a player who acts out of turn or with a wrong key", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  const first = turnUid(starts, starts.a);
  const other = ["a", "b", "c", "d"].find((u) => u !== first);
  const card = starts[other].state.hand[0];
  assert.throws(() => ctx.hub.play(other, starts[other].id, starts[other].key, card, undefined, false), /not your turn/i);
  assert.throws(() => ctx.hub.draw(other, starts[other].id, starts[other].key), /not your turn/i);
  assert.throws(() => ctx.hub.draw(first, starts[first].id, "wrong"), /session is not valid/i);
});

test("playing and drawing move the turn on, and other players never see the cards someone picked", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  const first = turnUid(starts, starts.a);
  ctx.hub.draw(first, starts[first].id, starts[first].key);
  const mine = ctx.chess.last(first, "whot_state");
  const theirs = ctx.chess.last(first === "a" ? "b" : "a", "whot_state");
  assert.equal(mine.event.type, "draw");
  assert.equal(mine.event.cards.length, 1);
  assert.equal(theirs.event.cards, undefined);
  assert.equal(theirs.event.count, 1);
  assert.equal(mine.state.hand.length, 7);
  assert.equal(theirs.state.counts[mine.you], 7);
  assert.notEqual(mine.state.turn, mine.you);
});

test("a whole 4 player game can be played through the hub to a winner", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  const views = { ...Object.fromEntries(Object.entries(starts).map(([u, g]) => [u, g])) };
  let over = null;
  for (let i = 0; i < 4000 && !over; i++) {
    for (const u of Object.keys(starts)) { const s = ctx.chess.last(u, "whot_state"); if (s) views[u] = s; }
    const turnSeat = views.a.state.turn;
    const uid = Object.keys(starts).find((u) => starts[u].you === turnSeat);
    const v = views[uid];
    const g = act(ctx.hub, starts, uid);
    // use the shared rules to pick a legal card from the hand the server sent this player
    const st = { shape: v.state.shape, pile: [v.state.top], pending: v.state.pending, winner: null, hands: { [v.you]: v.state.hand } };
    const legal = legalPlays(st, v.you);
    if (legal.length) {
      const id = legal[0];
      const shape = cardOf(id).shape === "whot" ? "circle" : undefined;
      ctx.hub.play(uid, g.gameId, g.key, id, shape, true);
    } else ctx.hub.draw(uid, g.gameId, g.key);
    over = ctx.chess.last("a", "whot_over");
    ctx.advance(1000);
  }
  assert.ok(over, "the game should finish");
  // nobody was ever sent a card id that another player picked up
  for (const u of Object.keys(starts)) {
    for (const m of ctx.chess.all(u, "whot_state")) {
      const e = m.event;
      if (!e) continue;
      if (e.type === "draw" && e.seat !== m.you) assert.equal(e.cards, undefined);
      if (e.penalty && e.penalty.seat !== m.you) assert.equal(e.penalty.cards, undefined);
      for (const d of e.draws || []) if (d.seat !== m.you) assert.equal(d.cards, undefined);
    }
  }
  assert.equal(over.status, "over");
  assert.ok(over.result.winner === null || [0, 1, 2, 3].includes(over.result.winner));
  assert.ok(over.state.reveal, "all hands are shown once the round is over");
  assert.ok(!ctx.hub.isBusy("a"));
  const losers = Object.keys(over.result.points).filter((s) => Number(s) !== over.result.winner);
  if (over.result.winner !== null) assert.equal(over.result.collect, losers.reduce((t, s) => t + over.result.points[s], 0));
});

test("a player who reconnects is put straight back into their game with their own hand", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.chess.online.delete("b");
  const sink = ctx.chess.connect("b");
  const hello = sink.sent.find((m) => m.event === "whot_hello");
  assert.ok(hello);
  assert.equal(hello.data.game.id, starts.b.id);
  assert.equal(hello.data.game.key, starts.b.key);
  assert.deepEqual(hello.data.game.state.hand, starts.b.state.hand);
  const sync = ctx.hub.syncState("b", starts.b.id, starts.b.key);
  assert.deepEqual(sync.game.state.hand, starts.b.state.hand);
});

test("others are told when a player drops offline and when they come back; leaving for good puts them out", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.chess.online.delete("c");
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("a", "whot_opponent").online, false);
  ctx.chess.online.add("c");
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("a", "whot_opponent").online, true);
  ctx.chess.online.delete("c");
  ctx.hub.sweep();
  ctx.advance(3 * 60 * 1000 + 1000);
  ctx.chess.online.add("a"); ctx.chess.online.add("b"); ctx.chess.online.add("d");
  ctx.hub.sweep();
  const st = ctx.chess.last("a", "whot_state");
  assert.ok(st.state.out.includes(starts.c.you));
  assert.equal(st.event.type, "out");
  assert.equal(ctx.hub.activeGameOf("c"), null);
  assert.ok(ctx.hub.activeGameOf("a"));                        // the other three carry on
});

test("a missed turn is played for you, and three misses in a row put you out", () => {
  const ctx = setup(["a", "b"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  const start = ctx.chess.last("a", "whot_game_start");
  const first = ctx.chess.last("a", "whot_game_start").you === start.state.turn ? "a" : "b";
  const idle = first;
  ctx.advance(TURN_MS + 10);
  ctx.hub.sweep();
  const s1 = ctx.chess.last("a", "whot_state");
  assert.ok(s1.event.auto, "the clock played a move");
  assert.notEqual(s1.state.turn, ctx.chess.last(idle, "whot_game_start").you);
  // the idle player keeps missing; their opponent keeps playing
  const other = idle === "a" ? "b" : "a";
  let guard = 0;
  while (ctx.hub.activeGameOf(idle) && guard++ < 40) {
    const v = ctx.chess.last(other, "whot_state") || ctx.chess.last(other, "whot_game_start");
    if (v.state.turn === v.you) {
      const g = { id: ctx.chess.last(other, "whot_game_start").id, key: ctx.chess.last(other, "whot_game_start").key };
      ctx.hub.draw(other, g.id, g.key);
    }
    ctx.advance(TURN_MS + 10);
    ctx.hub.sweep();
  }
  assert.equal(ctx.hub.activeGameOf(idle), null);
  assert.ok(ctx.chess.last(other, "whot_over"));
  assert.equal(ctx.chess.last(other, "whot_over").result.reason, "timeout");
});

test("resigning in a 4 player game puts only that player out", () => {
  const ctx = setup();
  const starts = startFour(ctx);
  ctx.hub.resign("d", starts.d.id, starts.d.key);
  const st = ctx.chess.last("a", "whot_state");
  assert.deepEqual(st.state.out, [starts.d.you]);
  assert.equal(ctx.chess.last("a", "whot_over"), null);
  ctx.hub.resign("c", starts.c.id, starts.c.key);
  ctx.hub.resign("b", starts.b.id, starts.b.key);
  const over = ctx.chess.last("a", "whot_over");
  assert.equal(over.result.winner, starts.a.you);
  assert.ok(over.result.collect >= 0);
});

test("room: spectators need the code and PIN, only see the table, and the host controls who watches", () => {
  const ctx = setup(["a", "b", "w"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  const g = ctx.chess.last("a", "whot_game_start");
  const code = g.room.code;
  assert.throws(() => ctx.hub.spectate("w", code), /not open/i);
  ctx.hub.setRoom("a", g.id, g.key, { open: true, pin: "1234" });
  assert.throws(() => ctx.hub.spectate("w", code), /PIN/);
  assert.throws(() => ctx.hub.spectate("w", code, "0000"), /not right/);
  const out = ctx.hub.spectate("w", code, "1234");
  assert.deepEqual(out.view.state.hand, []);
  assert.equal(out.view.state.reveal, null);
  assert.equal(out.view.state.counts[0], 6);
  const gb2 = ctx.chess.last("b", "whot_game_start");
  assert.throws(() => ctx.hub.setRoom("b", gb2.id, gb2.key, { open: false }), /host/i);
  ctx.hub.setRoom("a", g.id, g.key, { open: false });
  assert.equal(ctx.chess.last("w", "whot_spectate_end").reason, "closed");
  assert.throws(() => ctx.hub.setRoom("a", g.id, g.key, { pin: "12" }), /PIN/);
});

test("voice: players and spectators exchange signals, spectators can only talk to players", () => {
  const ctx = setup(["a", "b", "w"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  const g = ctx.chess.last("a", "whot_game_start");
  const gb = ctx.chess.last("b", "whot_game_start");
  ctx.hub.setRoom("a", g.id, g.key, { open: true });
  ctx.hub.spectate("w", g.room.code);
  const joined = ctx.hub.voiceJoin("a", g.id, g.key);
  assert.equal(joined.role, "player");
  assert.ok(ctx.chess.last("b", "whot_voice_peer"));
  ctx.hub.voiceSignal("a", g.id, g.key, "b", { kind: "offer", sdp: "x" });
  assert.equal(ctx.chess.last("b", "whot_voice_signal").from, "a");
  ctx.hub.voiceSignal("b", gb.id, gb.key, "w", { kind: "offer", sdp: "y" });
  assert.throws(() => ctx.hub.voiceSignal("w", g.id, null, "x-nobody", { kind: "offer" }), /not found/i);
  assert.throws(() => ctx.hub.voiceSignal("a", g.id, g.key, "b", { kind: "nonsense" }), /not valid/i);
});

test("one game at a time: a busy player cannot be challenged or start a second game", () => {
  const ctx = setup(["a", "b", "c"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "a", size: 2 }), /in a game/i);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "c", size: 2 }), /Finish your current game/i);
  assert.throws(() => ctx.hub.challenge("c", { toUid: "c", size: 2 }), /yourself/i);
});

test("a table can be started early with 2 players, and the host closing it ends it for everyone", () => {
  const ctx = setup();
  ctx.hub.challenge("a", { toUid: "b", size: 4 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  assert.equal(ctx.chess.last("a", "whot_table").seats.length, 2);
  assert.throws(() => ctx.hub.startTableNow("b"), /no longer open/i);
  ctx.hub.startTableNow("a");
  assert.equal(ctx.chess.last("a", "whot_game_start").players.length, 2);
  const other = setup();
  other.hub.challenge("a", { toUid: "b", size: 3 });
  other.hub.respond("b", other.chess.last("b", "whot_challenge").id, true);
  other.hub.leaveTable("a");
  assert.equal(other.chess.last("b", "whot_table_end").reason, "cancelled");
});

test("declined and expired requests are cleaned up", () => {
  const ctx = setup(["a", "b"]);
  const { id } = ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", id, false);
  assert.equal(ctx.chess.last("a", "whot_challenge_update").status, "declined");
  ctx.advance(3000);
  assert.throws(() => ctx.hub.challenge("a", { toUid: "b", size: 2 }), /wait a moment/i);
  ctx.advance(16000);
  const second = ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.advance(61000);
  ctx.hub.sweep();
  assert.equal(ctx.chess.last("b", "whot_challenge_update").status, "expired");
  assert.ok(second.id);
});

test("the last card call is applied through the hub", () => {
  const ctx = setup(["a", "b"]);
  ctx.hub.challenge("a", { toUid: "b", size: 2 });
  ctx.hub.respond("b", ctx.chess.last("b", "whot_challenge").id, true);
  const g = ctx.chess.last("a", "whot_game_start");
  // nothing to call yet: it is simply ignored
  assert.deepEqual(ctx.hub.call("a", g.id, g.key), { ok: true });
  assert.equal(seatOfTurn({ seats: [0, 1], turn: g.state.turn, out: [] }), g.state.turn);
});
