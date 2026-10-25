/* Whot rules (Nigerian style). One pure module shared by the server (online games) and the browser (computer games).

   The pack has 54 cards:
     circle and triangle: 1 2 3 4 5 7 8 10 11 12 13 14   (12 each)
     cross and square:    1 2 3 5 7 10 11 13 14           (9 each)
     star:                1 2 3 4 5 7 8                   (7)
     five Whot cards numbered 20

   Special cards:
     1  Hold On        the player plays again
     2  Pick Two       the next player picks two, unless they answer with another 2 (then it grows)
     5  Pick Three     the next player picks three, unless they answer with another 5
     8  Suspension     the next player misses a turn
     14 General Market every other player picks one card, and the player plays again
     20 Whot           can be played on anything; the player names the shape that comes next

   A card can be played when its shape or its number matches the top card.
   If you cannot (or do not want to) play, you pick one card from the market and your turn ends.
   With one card left you must call "Last card" before the next player acts, or you pick two as a penalty.
   The first player to play their last card wins. If the market runs dry for good, the lowest hand total wins.
   Seats go 0 to 3 (the same four seat colours Ludo uses). */

export const SHAPES = ["circle", "triangle", "cross", "square", "star"];
export const SHAPE_NAMES = { circle: "Circle", triangle: "Triangle", cross: "Cross", square: "Square", star: "Star", whot: "Whot" };
export const SEAT_COLORS = ["red", "green", "yellow", "blue"];
export const SEAT_NAMES = { red: "Red", green: "Green", yellow: "Yellow", blue: "Blue" };
export const HAND_SIZE = 6;
export const PICK_FOR = { 2: 2, 5: 3 };
export const LAST_CARD_PENALTY = 2;

const NUMBERS = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
};
export const DECK = [];
for (const shape of SHAPES) for (const n of NUMBERS[shape]) DECK.push({ id: DECK.length, shape, n });
for (let i = 0; i < 5; i++) DECK.push({ id: DECK.length, shape: "whot", n: 20 });
export const cardOf = (id) => DECK[id];
export const isSpecial = (n) => [1, 2, 5, 8, 14, 20].includes(n);

const defaultRng = (n) => Math.floor(Math.random() * n);
export function shuffle(list, rng = defaultRng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function newState(seatIds, rng = defaultRng) {
  const seats = [...seatIds].sort((a, b) => a - b);
  const market = shuffle(DECK.map((c) => c.id), rng);
  const hands = {};
  for (const s of seats) hands[s] = [];
  for (let r = 0; r < HAND_SIZE; r++) for (const s of seats) hands[s].push(market.pop());
  // the first card turned up is a plain one, so nobody starts under a penalty
  let at = -1;
  for (let i = market.length - 1; i >= 0; i--) if (!isSpecial(cardOf(market[i]).n)) { at = i; break; }
  const first = market.splice(at, 1)[0];
  return {
    seats, hands, market, pile: [first], shape: cardOf(first).shape,
    turn: 0, pending: null, winner: null, reason: null, out: [], lastCall: null, lastEvent: null,
  };
}

export const seatOfTurn = (s) => s.seats[s.turn];
export const liveSeats = (s) => s.seats.filter((x) => !s.out.includes(x));
export const topCard = (s) => cardOf(s.pile[s.pile.length - 1]);
export const handPoints = (s, seat) => (s.hands[seat] || []).reduce((t, id) => t + cardOf(id).n, 0);

function advance(s, steps = 1) {
  for (let k = 0; k < steps; k++) {
    for (let i = 0; i < s.seats.length; i++) {
      s.turn = (s.turn + 1) % s.seats.length;
      if (!s.out.includes(s.seats[s.turn])) break;
    }
  }
}
export const nextSeat = (s, from = seatOfTurn(s)) => {
  let i = s.seats.indexOf(from);
  for (let k = 0; k < s.seats.length; k++) {
    i = (i + 1) % s.seats.length;
    if (!s.out.includes(s.seats[i])) return s.seats[i];
  }
  return from;
};

export function canPlay(s, card) {
  if (s.winner != null) return false;
  if (s.pending) return card.n === s.pending.n;           // only the same Pick card can answer a Pick card
  if (card.shape === "whot") return true;
  return card.shape === s.shape || card.n === topCard(s).n;
}
export const legalPlays = (s, seat) => (s.hands[seat] || []).filter((id) => canPlay(s, cardOf(id)));

function refill(s, rng) {
  if (s.market.length || s.pile.length <= 1) return;
  const top = s.pile.pop();
  s.market = shuffle(s.pile, rng);
  s.pile = [top];
}
function take(s, seat, n, rng) {
  const got = [];
  for (let i = 0; i < n; i++) {
    if (!s.market.length) refill(s, rng);
    if (!s.market.length) break;
    const id = s.market.pop();
    s.hands[seat].push(id);
    got.push(id);
  }
  return got;
}

/* Someone who reached one card without calling "Last card" picks two once the next player acts. */
function settleLast(s, actor, rng) {
  const lc = s.lastCall;
  if (!lc || lc.seat === actor) return null;
  s.lastCall = null;
  if (!lc.called && !s.out.includes(lc.seat) && s.hands[lc.seat].length === 1) {
    return { seat: lc.seat, cards: take(s, lc.seat, LAST_CARD_PENALTY, rng) };
  }
  return null;
}

export function callLast(s, seat) {
  if (!s.lastCall || s.lastCall.seat !== seat || s.winner != null) return false;
  s.lastCall.called = true;
  return true;
}

/* Play a card. Returns { ok:false, error } or the event the screen needs to animate. */
export function play(s, seat, id, opts = {}) {
  const rng = opts.rng || defaultRng;
  if (s.winner != null) return { ok: false, error: "game_over" };
  if (seatOfTurn(s) !== seat) return { ok: false, error: "not_your_turn" };
  const hand = s.hands[seat];
  if (!hand || !hand.includes(id)) return { ok: false, error: "no_card" };
  const card = cardOf(id);
  if (!canPlay(s, card)) return { ok: false, error: "bad_card" };
  if (card.shape === "whot" && !SHAPES.includes(opts.shape)) return { ok: false, error: "need_shape" };
  const penalty = settleLast(s, seat, rng);
  hand.splice(hand.indexOf(id), 1);
  s.pile.push(id);
  s.shape = card.shape === "whot" ? opts.shape : card.shape;
  const ev = { type: "play", seat, card: id, shape: s.shape, effect: null, penalty, draws: [], skipped: null, pick: null };
  if (!hand.length) {
    s.winner = seat; s.reason = "out"; s.lastCall = null; s.pending = null;
    ev.win = true;
    s.lastEvent = ev;
    return ev;
  }
  s.lastCall = hand.length === 1 ? { seat, called: !!opts.call } : null;
  switch (card.n) {
    case 1:
      ev.effect = "hold";
      break;
    case 2:
    case 5: {
      ev.effect = "pick";
      s.pending = { n: card.n, count: (s.pending ? s.pending.count : 0) + PICK_FOR[card.n] };
      ev.pick = s.pending.count;
      advance(s);
      break;
    }
    case 8:
      ev.effect = "skip";
      ev.skipped = nextSeat(s, seat);
      advance(s, 2);
      break;
    case 14:
      ev.effect = "market";
      for (const o of liveSeats(s)) if (o !== seat) ev.draws.push({ seat: o, cards: take(s, o, 1, rng) });
      break;
    case 20:
      ev.effect = "whot";
      advance(s);
      break;
    default:
      advance(s);
  }
  s.lastEvent = ev;
  return ev;
}

/* Pick from the market: the whole pending penalty if there is one, otherwise a single card. The turn then passes. */
export function draw(s, seat, opts = {}) {
  const rng = opts.rng || defaultRng;
  if (s.winner != null) return { ok: false, error: "game_over" };
  if (seatOfTurn(s) !== seat) return { ok: false, error: "not_your_turn" };
  const penalty = settleLast(s, seat, rng);
  const n = s.pending ? s.pending.count : 1;
  const wasPending = !!s.pending;
  s.pending = null;
  const cards = take(s, seat, n, rng);
  if (s.lastCall && s.lastCall.seat === seat) s.lastCall = null;
  const ev = { type: "draw", seat, cards, forced: wasPending, penalty };
  if (!cards.length) {
    // nothing left to pick, so the game ends on hand totals
    finishByMarket(s);
    ev.over = true;
    s.lastEvent = ev;
    return ev;
  }
  advance(s);
  s.lastEvent = ev;
  return ev;
}

export function finishByMarket(s) {
  let best = null, tie = false;
  for (const seat of liveSeats(s)) {
    const p = handPoints(s, seat), c = s.hands[seat].length;
    if (!best || p < best.p || (p === best.p && c < best.c)) { best = { seat, p, c }; tie = false; }
    else if (p === best.p && c === best.c) tie = true;
  }
  s.winner = best && !tie ? best.seat : null;
  s.reason = "market";
  s.pending = null;
  s.lastCall = null;
}

/* A player who leaves hands their cards back to the market; the game goes on for everyone else. */
export function removeSeat(s, seat) {
  if (s.out.includes(seat)) return;
  const wasTurn = seatOfTurn(s) === seat;
  s.out.push(seat);
  s.market.unshift(...s.hands[seat]);
  s.hands[seat] = [];
  if (s.lastCall && s.lastCall.seat === seat) s.lastCall = null;
  if (wasTurn) advance(s);
}

/* What everyone holds when the round ends. The winner collects what the others are left holding. */
export function summary(s) {
  const points = {};
  for (const seat of s.seats) points[seat] = handPoints(s, seat);
  const collect = s.winner == null ? 0 : s.seats.filter((x) => x !== s.winner).reduce((t, x) => t + points[x], 0);
  return { points, collect };
}

/* ------------------------------------------------------------------ the computer */
function bestShape(s, seat, ignoreId, rng) {
  const count = {};
  for (const id of s.hands[seat]) {
    if (id === ignoreId) continue;
    const c = cardOf(id);
    if (c.shape !== "whot") count[c.shape] = (count[c.shape] || 0) + 1;
  }
  let best = [], top = 0;
  for (const sh of SHAPES) { const n = count[sh] || 0; if (n > top) { top = n; best = [sh]; } else if (n === top && top > 0) best.push(sh); }
  return best.length ? best[rng(best.length)] : SHAPES[rng(SHAPES.length)];
}

function rate(s, seat, id, level, legalCount) {
  const c = cardOf(id);
  const next = nextSeat(s, seat);
  const nextHand = (s.hands[next] || []).length;
  const rest = s.hands[seat].filter((x) => x !== id);
  let v = c.n === 20 ? 0 : c.n * 0.4;                      // get rid of big numbers first: they cost the most if you lose
  if (c.n === 14) v += 6;
  if (c.n === 1) v += 4;
  if (c.n === 8) v += nextHand <= 2 ? 7 : 2;
  if (c.n === 2 || c.n === 5) v += nextHand <= 3 ? 8 : 3;
  if (c.n === 20) v += legalCount === 1 || s.hands[seat].length <= 3 ? 6 : -9;   // keep Whot for when it matters
  if (level === "hard") {
    const shape = c.shape === "whot" ? null : c.shape;
    if (shape) v += rest.filter((x) => cardOf(x).shape === shape).length * 1.4;     // stay on shapes we hold plenty of
    if (rest.length === 1) v += 3;                                                  // set up the last card
  }
  return v;
}

/* level: "easy" | "medium" | "hard". Returns { kind:"play", card, shape, call } or { kind:"draw" } */
export function chooseAction(s, seat, level = "medium", rng = defaultRng) {
  const legal = legalPlays(s, seat);
  if (!legal.length) return { kind: "draw" };
  if (level === "easy" && s.pending && rng(10) < 4) return { kind: "draw" };
  let pick;
  if (level === "easy") pick = legal[rng(legal.length)];
  else {
    let bestScore = -Infinity;
    for (const id of legal) {
      const v = rate(s, seat, id, level, legal.length) + (level === "medium" ? rng(30) / 10 : rng(8) / 10);
      if (v > bestScore) { bestScore = v; pick = id; }
    }
  }
  const card = cardOf(pick);
  return {
    kind: "play", card: pick,
    shape: card.shape === "whot" ? (level === "easy" ? SHAPES[rng(SHAPES.length)] : bestShape(s, seat, pick, rng)) : undefined,
    call: level === "easy" ? rng(10) >= 3 : true,           // an easy computer sometimes forgets to call
  };
}

/* What a player is allowed to see: their own cards, and only the number of cards everyone else holds. */
export function viewOf(s, seat) {
  const counts = {};
  for (const x of s.seats) counts[x] = s.hands[x].length;
  return {
    seats: s.seats, turn: s.winner == null ? seatOfTurn(s) : null,
    top: s.pile[s.pile.length - 1], shape: s.shape, pending: s.pending ? { ...s.pending } : null,
    market: s.market.length, counts, hand: seat != null && s.hands[seat] ? [...s.hands[seat]] : [],
    out: [...s.out], winner: s.winner, reason: s.reason,
    lastCall: s.lastCall ? { seat: s.lastCall.seat, called: s.lastCall.called } : null,
    next: nextSeat(s),
    reveal: s.winner != null || s.reason ? Object.fromEntries(s.seats.map((x) => [x, [...s.hands[x]]])) : null,
  };
}
