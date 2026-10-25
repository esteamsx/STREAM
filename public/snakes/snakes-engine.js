/* Snakes and Ladders rules. One pure module shared by the server (online games) and the browser (computer games).

   The board has 100 squares, numbered from the bottom left and snaking up (1 to 10 left to right, 11 to 20 right to left, and so on).
   Everyone starts off the board (square 0) and takes turns to roll one die.
     - Move forward by the number rolled.
     - Land on the foot of a ladder and you climb to its top. Land on a snake's head and you slide to its tail.
     - You must reach square 100 with an exact roll. If the roll is too big you stay where you are.
     - Roll a 6 and you roll again. Three 6s in a row and that turn is lost.
     - Any number of players can share a square. The first player to reach 100 wins.
   Seats go 0 to 3 (the same four seat colours Ludo and Whot use). */

export const SEAT_COLORS = ["red", "green", "yellow", "blue"];
export const SEAT_NAMES = { red: "Red", green: "Green", yellow: "Yellow", blue: "Blue" };
export const SIZE = 100;
export const MAX_SIXES = 3;

export const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
export const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
export const JUMPS = { ...LADDERS, ...SNAKES };

const defaultRng = (n) => Math.floor(Math.random() * n);
export const rollValue = (rng = defaultRng) => rng(6) + 1;

export function newState(seatIds) {
  const seats = [...seatIds].sort((a, b) => a - b);
  const pos = {};
  for (const s of seats) pos[s] = 0;
  return { seats, pos, turn: 0, sixes: 0, winner: null, out: [], lastMove: null };
}

export const seatOfTurn = (s) => s.seats[s.turn];
export const liveSeats = (s) => s.seats.filter((x) => !s.out.includes(x));

export function passTurn(s) {
  for (let i = 0; i < s.seats.length; i++) {
    s.turn = (s.turn + 1) % s.seats.length;
    if (!s.out.includes(s.seats[s.turn])) break;
  }
  s.sixes = 0;
}

/* Roll the die for the player whose turn it is and play the whole move.
   Returns { ok:false, error } or what happened, so the screen can animate it:
   { seat, value, from, landed, to, effect: null | "ladder" | "snake", bounced, skipped, extra, win } */
export function roll(s, seat, value) {
  if (s.winner != null) return { ok: false, error: "game_over" };
  if (seatOfTurn(s) !== seat) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(value) || value < 1 || value > 6) return { ok: false, error: "bad_roll" };
  const from = s.pos[seat];
  const ev = { type: "roll", seat, value, from, landed: from, to: from, effect: null, bounced: false, skipped: null, extra: false, win: false };
  s.sixes = value === 6 ? s.sixes + 1 : 0;
  if (s.sixes >= MAX_SIXES) {
    ev.skipped = "three_sixes";
    passTurn(s);
    s.lastMove = ev;
    return ev;
  }
  const target = from + value;
  if (target > SIZE) {
    ev.bounced = true;                                     // too big to finish: stay put
  } else {
    ev.landed = target;
    const jump = JUMPS[target];
    ev.to = jump != null ? jump : target;
    ev.effect = jump == null ? null : jump > target ? "ladder" : "snake";
    s.pos[seat] = ev.to;
  }
  if (s.pos[seat] === SIZE) {
    s.winner = seat;
    ev.win = true;
    s.lastMove = ev;
    return ev;
  }
  if (value === 6) ev.extra = true;                        // a 6 means roll again
  else passTurn(s);
  s.lastMove = ev;
  return ev;
}

/* a player who leaves is taken off the board; the game goes on for everyone else */
export function removeSeat(s, seat) {
  if (s.out.includes(seat)) return;
  const wasTurn = seatOfTurn(s) === seat;
  s.out.push(seat);
  s.pos[seat] = 0;
  if (wasTurn) passTurn(s);
}

/* Everything on the board is public, so players and spectators all get the same view. */
export function viewOf(s) {
  return { seats: [...s.seats], pos: { ...s.pos }, turn: s.winner == null ? seatOfTurn(s) : null, sixes: s.sixes, winner: s.winner, out: [...s.out] };
}

/* Where square n sits on the board: column and row counted from the bottom left, both 0 to 9. Square 0 is off the board. */
export function cellOf(n) {
  const i = n - 1;
  const row = Math.floor(i / 10);
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10);
  return { col, row };
}

/* The squares a piece passes over when it walks from a to b */
export function walkOf(a, b) {
  const out = [];
  for (let p = a + 1; p <= b; p++) out.push(p);
  return out;
}
