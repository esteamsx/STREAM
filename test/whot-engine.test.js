import test from "node:test";
import assert from "node:assert/strict";
import {
  DECK, SHAPES, cardOf, newState, play, draw, callLast, legalPlays, canPlay, removeSeat, finishByMarket,
  chooseAction, viewOf, summary, seatOfTurn, liveSeats, handPoints, HAND_SIZE,
} from "../public/whot/whot-engine.js";

const find = (shape, n) => DECK.find((c) => c.shape === shape && c.n === n).id;
const whotIds = () => DECK.filter((c) => c.shape === "whot").map((c) => c.id);

/* a hand-built table so each rule can be checked on its own */
function table(hands, top, shape, seats = [0, 1, 2, 3].slice(0, hands.length)) {
  const used = new Set([...hands.flat(), top]);
  const hs = {};
  seats.forEach((s, i) => { hs[s] = [...hands[i]]; });
  return {
    seats, hands: hs, market: DECK.map((c) => c.id).filter((id) => !used.has(id)), pile: [top], shape: shape || cardOf(top).shape,
    turn: 0, pending: null, winner: null, reason: null, out: [], lastCall: null, lastEvent: null,
  };
}
const total = (s) => Object.values(s.hands).flat().length + s.market.length + s.pile.length;

test("the pack has 54 cards with the right makeup", () => {
  assert.equal(DECK.length, 54);
  assert.equal(DECK.filter((c) => c.shape === "circle").length, 12);
  assert.equal(DECK.filter((c) => c.shape === "triangle").length, 12);
  assert.equal(DECK.filter((c) => c.shape === "cross").length, 9);
  assert.equal(DECK.filter((c) => c.shape === "square").length, 9);
  assert.equal(DECK.filter((c) => c.shape === "star").length, 7);
  assert.equal(DECK.filter((c) => c.shape === "whot" && c.n === 20).length, 5);
  assert.equal(new Set(DECK.map((c) => c.id)).size, 54);
});

test("a new game deals 6 cards each and starts on a plain card", () => {
  for (let i = 0; i < 200; i++) {
    const s = newState([0, 1, 2, 3]);
    for (const seat of s.seats) assert.equal(s.hands[seat].length, HAND_SIZE);
    assert.ok(![1, 2, 5, 8, 14, 20].includes(cardOf(s.pile[0]).n));
    assert.equal(total(s), 54);
    assert.equal(new Set([...Object.values(s.hands).flat(), ...s.market, ...s.pile]).size, 54);
  }
});

test("a card must match the shape or the number; Whot goes on anything", () => {
  const s = table([[find("circle", 3), find("circle", 7), find("cross", 3), find("square", 10), whotIds()[0]], [find("star", 1)]], find("circle", 4));
  assert.ok(canPlay(s, cardOf(find("circle", 7))));       // same shape
  assert.ok(canPlay(s, cardOf(whotIds()[0])));            // Whot
  assert.ok(!canPlay(s, cardOf(find("cross", 3))));       // 3 on a 4 of circle: no match
  assert.ok(!canPlay(s, cardOf(find("square", 10))));
  const t = table([[find("triangle", 4), find("square", 10)], [find("star", 1)]], find("circle", 4));
  assert.ok(canPlay(t, cardOf(find("triangle", 4))));     // same number
  assert.equal(play(t, 0, find("square", 10)).error, "bad_card");
});

test("playing out of turn or with a card you do not hold is refused", () => {
  const s = table([[find("circle", 3), find("circle", 7)], [find("circle", 10), find("circle", 11)]], find("circle", 4));
  assert.equal(play(s, 1, find("circle", 10)).error, "not_your_turn");
  assert.equal(play(s, 0, find("circle", 10)).error, "no_card");
  assert.equal(draw(s, 1).error, "not_your_turn");
});

test("Pick Two: the next player picks two, or answers with another 2 and it grows", () => {
  const s = table([[find("circle", 2), find("circle", 3)], [find("cross", 2), find("star", 3)], [find("circle", 10), find("circle", 11)]], find("circle", 4));
  const ev = play(s, 0, find("circle", 2));
  assert.equal(ev.effect, "pick");
  assert.equal(seatOfTurn(s), 1);
  assert.deepEqual(s.pending, { n: 2, count: 2 });
  assert.deepEqual(legalPlays(s, 1), [find("cross", 2)]);   // only a 2 can answer
  assert.equal(play(s, 1, find("star", 3)).error, "bad_card");
  play(s, 1, find("cross", 2));
  assert.deepEqual(s.pending, { n: 2, count: 4 });
  assert.equal(seatOfTurn(s), 2);
  const before = s.hands[2].length;
  const d = draw(s, 2);
  assert.equal(d.cards.length, 4);
  assert.equal(s.hands[2].length, before + 4);
  assert.equal(s.pending, null);
  assert.equal(seatOfTurn(s), 0);
});

test("Pick Three works the same way, and a Pick Two cannot answer it", () => {
  const s = table([[find("circle", 5), find("circle", 3)], [find("circle", 2), find("star", 5)], [find("circle", 10), find("cross", 11)]], find("circle", 4));
  play(s, 0, find("circle", 5));
  assert.deepEqual(s.pending, { n: 5, count: 3 });
  assert.deepEqual(legalPlays(s, 1), [find("star", 5)]);
  const d = draw(s, 1);
  assert.equal(d.cards.length, 3);
});

test("Hold On: the same player plays again", () => {
  const s = table([[find("circle", 1), find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 3)]], find("circle", 4));
  const ev = play(s, 0, find("circle", 1));
  assert.equal(ev.effect, "hold");
  assert.equal(seatOfTurn(s), 0);
});

test("Suspension: the next player misses a turn (with 2 players you go again)", () => {
  const s = table([[find("circle", 8), find("circle", 3), find("cross", 3)], [find("star", 3), find("cross", 7)], [find("star", 4), find("star", 7)]], find("circle", 4));
  const ev = play(s, 0, find("circle", 8));
  assert.equal(ev.effect, "skip");
  assert.equal(ev.skipped, 1);
  assert.equal(seatOfTurn(s), 2);
  const two = table([[find("circle", 8), find("circle", 3), find("cross", 3)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  play(two, 0, find("circle", 8));
  assert.equal(seatOfTurn(two), 0);
});

test("General Market: everyone else picks one and the player plays again", () => {
  const s = table([[find("circle", 14), find("circle", 3), find("cross", 3)], [find("star", 3), find("cross", 7)], [find("star", 4), find("star", 7)], [find("square", 3), find("square", 7)]], find("circle", 4));
  const ev = play(s, 0, find("circle", 14));
  assert.equal(ev.effect, "market");
  assert.equal(s.hands[0].length, 2);
  assert.equal(s.hands[1].length, 3);
  assert.equal(s.hands[2].length, 3);
  assert.equal(s.hands[3].length, 3);
  assert.equal(ev.draws.length, 3);
  assert.equal(seatOfTurn(s), 0);
  assert.equal(total(s), 54);
});

test("Whot: needs a shape, sets it, and the next card must follow it", () => {
  const w = whotIds()[0];
  const s = table([[w, find("circle", 3), find("cross", 3)], [find("star", 3), find("cross", 7), find("circle", 7)]], find("circle", 4));
  assert.equal(play(s, 0, w).error, "need_shape");
  assert.equal(play(s, 0, w, { shape: "nope" }).error, "need_shape");
  const ev = play(s, 0, w, { shape: "star" });
  assert.equal(ev.effect, "whot");
  assert.equal(s.shape, "star");
  assert.equal(seatOfTurn(s), 1);
  assert.deepEqual(legalPlays(s, 1), [find("star", 3)]);   // the number on a Whot never matches, only the shape
});

test("a Hold On cannot be played to dodge a pending pick", () => {
  const s = table([[find("circle", 2), find("circle", 3)], [find("circle", 1), find("cross", 7)], [find("star", 4)]], find("circle", 4));
  play(s, 0, find("circle", 2));
  assert.equal(play(s, 1, find("circle", 1)).error, "bad_card");
});

test("last card: calling in time is safe, forgetting costs two cards", () => {
  const forgot = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  play(forgot, 0, find("circle", 3));
  assert.deepEqual(forgot.lastCall, { seat: 0, called: false });
  const ev = draw(forgot, 1);
  assert.equal(ev.penalty.seat, 0);
  assert.equal(ev.penalty.cards.length, 2);
  assert.equal(forgot.hands[0].length, 3);
  assert.equal(forgot.lastCall, null);

  const called = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  play(called, 0, find("circle", 3), { call: true });
  draw(called, 1);
  assert.equal(called.hands[0].length, 1);

  const late = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  play(late, 0, find("circle", 3));
  assert.ok(callLast(late, 0));                             // calling after playing, before the next player acts
  draw(late, 1);
  assert.equal(late.hands[0].length, 1);
  assert.ok(!callLast(late, 1));
});

test("playing your last card wins and the winner collects the others' points", () => {
  const s = table([[find("circle", 3)], [find("star", 3), find("cross", 14)], [find("square", 10)]], find("circle", 4));
  const ev = play(s, 0, find("circle", 3));
  assert.ok(ev.win);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, "out");
  const sum = summary(s);
  assert.equal(sum.points[1], 17);
  assert.equal(sum.points[2], 10);
  assert.equal(sum.collect, 27);
  assert.equal(play(s, 1, find("star", 3)).error, "game_over");
});

test("the market is reshuffled from the pile when it runs out", () => {
  const s = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  s.pile = [find("cross", 1), find("cross", 2), find("cross", 3), find("circle", 4)];
  s.market = [find("square", 1)];
  const got = draw(s, 0);
  assert.equal(got.cards.length, 1);
  seatOfTurn(s);
  const next = draw(s, 1);                                   // market is empty: pile minus the top is shuffled back in
  assert.equal(next.cards.length, 1);
  assert.equal(s.pile.length, 1);
  assert.equal(cardOf(s.pile[0]).shape, "circle");
});

test("when nothing is left to pick the lowest hand wins", () => {
  const s = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)], [find("star", 4), find("square", 10)]], find("circle", 4));
  s.market = []; s.pile = [find("circle", 4)];
  const ev = draw(s, 0);
  assert.ok(ev.over);
  assert.equal(s.reason, "market");
  assert.equal(s.winner, null);                              // seats 0 and 1 both hold 10 points in 2 cards, seat 2 holds 14: a dead heat
  assert.equal(handPoints(s, 0), 10);
  const t = table([[find("circle", 3)], [find("star", 3), find("cross", 7)]], find("circle", 4));
  t.hands[0] = [find("circle", 3), find("star", 1)];
  t.market = []; t.pile = [find("circle", 4)];
  finishByMarket(t);
  assert.equal(t.winner, 0);
});

test("a player who leaves hands back their cards and the game goes on", () => {
  const s = table([[find("circle", 3), find("circle", 7)], [find("star", 3), find("cross", 7)], [find("star", 4), find("square", 10)]], find("circle", 4));
  const before = total(s);
  removeSeat(s, 0);
  assert.deepEqual(liveSeats(s), [1, 2]);
  assert.equal(seatOfTurn(s), 1);
  assert.equal(total(s), before);
  assert.equal(s.hands[0].length, 0);
});

test("a player's view hides other hands until the round is over", () => {
  const s = newState([0, 1, 2]);
  const v = viewOf(s, 1);
  assert.equal(v.hand.length, 6);
  assert.equal(v.counts[0], 6);
  assert.equal(v.reveal, null);
  assert.equal(JSON.stringify(v).includes(JSON.stringify(s.hands[0])), v.hand.join() === s.hands[0].join());
  assert.deepEqual(viewOf(s, null).hand, []);
});

test("computer players of every level finish thousands of 2, 3 and 4 player games without losing a card", () => {
  const levels = ["easy", "medium", "hard"];
  let wins = 0, ties = 0, longest = 0;
  for (let g = 0; g < 3000; g++) {
    const n = 2 + (g % 3);
    const s = newState([0, 1, 2, 3].slice(0, n));
    const lv = [0, 1, 2, 3].map((i) => levels[(g + i) % 3]);
    let steps = 0;
    while (s.winner == null && s.reason == null) {
      const seat = seatOfTurn(s);
      const a = chooseAction(s, seat, lv[seat]);
      const r = a.kind === "draw" ? draw(s, seat) : play(s, seat, a.card, { shape: a.shape, call: a.call });
      assert.ok(r.ok !== false, "the computer made an illegal move: " + JSON.stringify(r));
      assert.equal(total(s), 54);
      assert.equal(new Set([...Object.values(s.hands).flat(), ...s.market, ...s.pile]).size, 54);
      if (++steps > 4000) assert.fail("a game ran on far too long");
    }
    longest = Math.max(longest, steps);
    if (s.winner != null) wins++; else ties++;
  }
  assert.equal(wins + ties, 3000);
  assert.ok(wins > 2900, "almost every game should end with a winner (wins " + wins + ", ties " + ties + ")");
});

test("the hard computer beats the easy one most of the time", () => {
  let hard = 0, games = 600;
  for (let g = 0; g < games; g++) {
    const s = newState([0, 1]);
    const lv = g % 2 ? ["hard", "easy"] : ["easy", "hard"];
    let steps = 0;
    while (s.winner == null && s.reason == null && steps++ < 4000) {
      const seat = seatOfTurn(s);
      const a = chooseAction(s, seat, lv[seat]);
      if (a.kind === "draw") draw(s, seat); else play(s, seat, a.card, { shape: a.shape, call: a.call });
    }
    if (s.winner != null && lv[s.winner] === "hard") hard++;
  }
  assert.ok(hard / games > 0.52, "hard won " + hard + " of " + games);
});
