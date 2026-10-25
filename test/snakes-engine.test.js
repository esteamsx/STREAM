import test from "node:test";
import assert from "node:assert/strict";
import { SIZE, LADDERS, SNAKES, JUMPS, newState, roll, removeSeat, seatOfTurn, liveSeats, viewOf, cellOf, walkOf, rollValue, MAX_SIXES } from "../public/snakes/snakes-engine.js";

const at = (positions, seats = [0, 1]) => { const s = newState(seats); Object.assign(s.pos, positions); return s; };

test("the board is laid out the way a real one is", () => {
  assert.deepEqual(cellOf(1), { col: 0, row: 0 });
  assert.deepEqual(cellOf(10), { col: 9, row: 0 });
  assert.deepEqual(cellOf(11), { col: 9, row: 1 });
  assert.deepEqual(cellOf(20), { col: 0, row: 1 });
  assert.deepEqual(cellOf(21), { col: 0, row: 2 });
  assert.deepEqual(cellOf(100), { col: 0, row: 9 });
  const seen = new Set();
  for (let n = 1; n <= 100; n++) { const c = cellOf(n); seen.add(c.col + "," + c.row); }
  assert.equal(seen.size, 100);
  // consecutive squares are always neighbours
  for (let n = 1; n < 100; n++) { const a = cellOf(n), b = cellOf(n + 1); assert.equal(Math.abs(a.col - b.col) + Math.abs(a.row - b.row), 1, "square " + n); }
});

test("every ladder goes up, every snake goes down, and none of them chain or clash", () => {
  for (const [a, b] of Object.entries(LADDERS)) assert.ok(b > a, "ladder " + a);
  for (const [a, b] of Object.entries(SNAKES)) assert.ok(b < a, "snake " + a);
  assert.equal(Object.keys(JUMPS).length, Object.keys(LADDERS).length + Object.keys(SNAKES).length, "no square is both");
  for (const to of Object.values(JUMPS)) if (to !== SIZE) assert.equal(JUMPS[to], undefined, "a jump must not end on another jump (" + to + ")");
  for (const from of Object.keys(JUMPS)) assert.ok(Number(from) > 0 && Number(from) < SIZE);
});

test("a plain roll moves the piece and passes the turn", () => {
  const s = newState([0, 1, 2]);
  const ev = roll(s, 0, 3);
  assert.equal(ev.from, 0); assert.equal(ev.to, 3); assert.equal(ev.effect, null);
  assert.equal(s.pos[0], 3);
  assert.equal(seatOfTurn(s), 1);
});

test("landing on the foot of a ladder climbs it", () => {
  const s = at({ 0: 6 });
  const ev = roll(s, 0, 3);                                // 6 + 3 = 9, ladder 9 to 31
  assert.equal(ev.landed, 9); assert.equal(ev.to, 31); assert.equal(ev.effect, "ladder");
  assert.equal(s.pos[0], 31);
  assert.equal(seatOfTurn(s), 1);
});

test("landing on a snake's head slides down to its tail", () => {
  const s = at({ 0: 12 });
  const ev = roll(s, 0, 4);                                // 12 + 4 = 16, snake 16 to 6
  assert.equal(ev.landed, 16); assert.equal(ev.to, 6); assert.equal(ev.effect, "snake");
  assert.equal(s.pos[0], 6);
});

test("every ladder and snake does what the table says", () => {
  for (const [from, to] of Object.entries(JUMPS)) {
    const start = Number(from) - 3 >= 0 ? Number(from) - 3 : 0;
    const need = Number(from) - start;
    if (need < 1 || need > 6) continue;
    const s = at({ 0: start });
    const ev = roll(s, 0, need);
    assert.equal(s.pos[0], to, "square " + from);
    assert.equal(ev.effect, to > Number(from) ? "ladder" : "snake");
  }
});

test("a 6 gives another roll, and rolling anything else ends the turn", () => {
  const s = newState([0, 1]);
  const a = roll(s, 0, 6);
  assert.ok(a.extra); assert.equal(seatOfTurn(s), 0); assert.equal(s.pos[0], 6);
  roll(s, 0, 2);
  assert.equal(seatOfTurn(s), 1);
});

test("three 6s in a row lose the turn and the last move does not count", () => {
  const s = newState([0, 1]);
  roll(s, 0, 6); roll(s, 0, 6);
  const ev = roll(s, 0, 6);
  assert.equal(ev.skipped, "three_sixes");
  assert.equal(s.pos[0], 12);
  assert.equal(seatOfTurn(s), 1);
  assert.equal(s.sixes, 0);
  roll(s, 1, 6); roll(s, 1, 2);                           // the other player's count starts fresh
  assert.equal(seatOfTurn(s), 0);
});

test("a six that lands on a snake still rolls again", () => {
  const s = at({ 0: 10 });
  const ev = roll(s, 0, 6);                                // 16 is a snake head
  assert.equal(ev.effect, "snake"); assert.ok(ev.extra);
  assert.equal(s.pos[0], 6); assert.equal(seatOfTurn(s), 0);
});

test("you need an exact roll to finish: too big and you stay put", () => {
  const s = at({ 0: 97 });
  const miss = roll(s, 0, 4);
  assert.ok(miss.bounced); assert.equal(s.pos[0], 97); assert.equal(s.winner, null);
  assert.equal(seatOfTurn(s), 1);
  roll(s, 1, 1);
  const win = roll(s, 0, 3);
  assert.ok(win.win); assert.equal(s.winner, 0); assert.equal(s.pos[0], 100);
  assert.equal(roll(s, 1, 1).error, "game_over");
});

test("a ladder to 100 wins, and landing on the snake at 98 does not", () => {
  const s = at({ 0: 78 });
  const win = roll(s, 0, 2);                               // 80 is a ladder straight to 100
  assert.ok(win.win); assert.equal(win.effect, "ladder");
  const t = at({ 0: 95, 1: 94 });
  const slide = roll(t, 0, 3);                             // 98 is a snake head
  assert.equal(slide.to, 78); assert.equal(t.winner, null);
});

test("a 6 that wins ends the game with no extra roll", () => {
  const s = at({ 0: 94 });
  const ev = roll(s, 0, 6);
  assert.ok(ev.win); assert.equal(ev.extra, false);
});

test("players can share a square, nobody is captured", () => {
  const s = at({ 0: 5, 1: 8 });
  roll(s, 0, 3);
  assert.equal(s.pos[0], 8); assert.equal(s.pos[1], 8);
});

test("only the player whose turn it is can roll, and only with a real die value", () => {
  const s = newState([0, 1]);
  assert.equal(roll(s, 1, 3).error, "not_your_turn");
  assert.equal(roll(s, 0, 7).error, "bad_roll");
  assert.equal(roll(s, 0, 0).error, "bad_roll");
  assert.equal(roll(s, 0, 2.5).error, "bad_roll");
  assert.equal(s.pos[0], 0);
});

test("turns go round 2, 3 and 4 players in seat order", () => {
  const s = newState([3, 0, 2, 1]);
  const order = [];
  for (let i = 0; i < 8; i++) { order.push(seatOfTurn(s)); roll(s, seatOfTurn(s), 1 + (i % 4)); }
  assert.deepEqual(order, [0, 1, 2, 3, 0, 1, 2, 3]);
});

test("a player who leaves is skipped and the rest play on", () => {
  const s = newState([0, 1, 2]);
  removeSeat(s, 1);
  assert.deepEqual(liveSeats(s), [0, 2]);
  roll(s, 0, 2);
  assert.equal(seatOfTurn(s), 2);
  removeSeat(s, 2);
  assert.equal(seatOfTurn(s), 0);
  const t = newState([0, 1]);
  removeSeat(t, 0);
  assert.equal(seatOfTurn(t), 1);
});

test("the die gives 1 to 6 evenly", () => {
  const n = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 60000; i++) n[rollValue()]++;
  for (let v = 1; v <= 6; v++) assert.ok(n[v] > 9000 && n[v] < 11000, "face " + v + ": " + n[v]);
  assert.equal(n[0], 0);
});

test("walking from one square to another lists every square passed", () => {
  assert.deepEqual(walkOf(4, 7), [5, 6, 7]);
  assert.deepEqual(walkOf(7, 7), []);
});

test("thousands of 2, 3 and 4 player games all finish with one winner", () => {
  let total = 0, longest = 0, wins = [0, 0, 0, 0];
  for (let g = 0; g < 5000; g++) {
    const n = 2 + (g % 3);
    const s = newState([0, 1, 2, 3].slice(0, n));
    let turns = 0;
    while (s.winner == null) {
      const seat = seatOfTurn(s);
      const before = s.pos[seat];
      const ev = roll(s, seat, rollValue());
      assert.ok(ev.ok !== false);
      for (const x of s.seats) assert.ok(s.pos[x] >= 0 && s.pos[x] <= SIZE);
      assert.ok(s.pos[seat] === SIZE || s.pos[seat] === ev.to);
      if (++turns > 5000) assert.fail("a game ran on far too long");
    }
    total += turns; longest = Math.max(longest, turns); wins[s.winner]++;
    assert.equal(s.pos[s.winner], SIZE);
  }
  assert.ok(total / 5000 > 30 && total / 5000 < 400, "average length " + total / 5000);
  assert.ok(wins[0] > wins[3] * 0.8, "going first helps a little but not hugely: " + wins);
});

test("the view shows everyone's square and whose turn it is", () => {
  const s = newState([0, 1]);
  roll(s, 0, 3);
  assert.deepEqual(viewOf(s), { seats: [0, 1], pos: { 0: 3, 1: 0 }, turn: 1, sixes: 0, winner: null, out: [] });
});
