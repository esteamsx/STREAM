/* Ludo rules. One pure module shared by the server (online games) and the browser (computer games).
   Colours go clockwise: 0 red, 1 green, 2 yellow, 3 blue.
   A token's position is relative to its own colour:
     -1 = in the yard, 0..50 = on the main track (0 is its own start square),
     51..55 = home lane, 56 = home (finished). */

export const COLORS = ["red", "green", "yellow", "blue"];
export const COLOR_NAMES = { red: "Red", green: "Green", yellow: "Yellow", blue: "Blue" };
export const TRACK_LEN = 52;
export const START = [0, 13, 26, 39];
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const HOME = 56;
export const MAX_SIXES = 3;

export function newState(seatColors) {
  const seats = [...seatColors].sort((a, b) => a - b);
  const tokens = [null, null, null, null];
  for (const c of seats) tokens[c] = [-1, -1, -1, -1];
  return { seats, tokens, turn: 0, roll: null, sixes: 0, winner: null, lastMove: null };
}

export const colorOfTurn = (s) => s.seats[s.turn];
export const absSquare = (color, rel) => (rel < 0 || rel > 50 ? -1 : (START[color] + rel) % TRACK_LEN);

export function legalTokens(s, roll = s.roll) {
  if (s.winner != null || !roll) return [];
  const c = colorOfTurn(s);
  const out = [];
  for (let t = 0; t < 4; t++) {
    const p = s.tokens[c][t];
    if (p === -1) { if (roll === 6) out.push(t); continue; }
    if (p < HOME && p + roll <= HOME) out.push(t);
  }
  return out;
}

export function passTurn(s) {
  s.turn = (s.turn + 1) % s.seats.length;
  s.roll = null;
  s.sixes = 0;
}

/* Apply a rolled value. Returns { skipped: null | "no_move" | "three_sixes" } */
export function applyRoll(s, value) {
  s.roll = value;
  s.lastMove = null;
  if (value === 6) s.sixes += 1; else s.sixes = 0;
  if (s.sixes >= MAX_SIXES) { passTurn(s); return { skipped: "three_sixes", value }; }
  if (!legalTokens(s).length) { const v = s.roll; passTurn(s); return { skipped: "no_move", value: v }; }
  return { skipped: null, value };
}

/* Move one token with the current roll. Returns the details so the screen can animate it. */
export function applyMove(s, t) {
  const c = colorOfTurn(s);
  if (!legalTokens(s).includes(t)) return null;
  const roll = s.roll;
  const from = s.tokens[c][t];
  const to = from === -1 ? 0 : from + roll;
  s.tokens[c][t] = to;
  const captured = [];
  const sq = absSquare(c, to);
  if (sq >= 0 && !SAFE.has(sq)) {
    for (const o of s.seats) {
      if (o === c) continue;
      for (let j = 0; j < 4; j++) {
        const q = s.tokens[o][j];
        if (q >= 0 && q <= 50 && absSquare(o, q) === sq) { s.tokens[o][j] = -1; captured.push({ color: o, token: j }); }
      }
    }
  }
  const finished = to === HOME;
  if (s.tokens[c].every((p) => p === HOME)) s.winner = c;
  const extra = s.winner == null && (roll === 6 || captured.length > 0 || finished);
  const move = { color: c, token: t, from, to, roll, captured, finished, extra };
  s.lastMove = move;
  if (s.winner != null) { s.roll = null; return move; }
  if (extra) { s.roll = null; }
  else passTurn(s);
  return move;
}

/* Squares a token walks through (for animation), including the start and end. */
export function pathOf(from, to) {
  if (from === -1) return [-1, 0];
  const out = [];
  for (let p = from; p <= to; p++) out.push(p);
  return out;
}

const rollValue = () => {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    for (;;) { crypto.getRandomValues(a); if (a[0] < 4294967292) return (a[0] % 6) + 1; }
  }
  return Math.floor(Math.random() * 6) + 1;
};
export { rollValue };

function danger(s, color, rel) {
  const sq = absSquare(color, rel);
  if (sq < 0 || SAFE.has(sq)) return 0;
  let n = 0;
  for (const o of s.seats) {
    if (o === color) continue;
    for (let j = 0; j < 4; j++) {
      const q = s.tokens[o][j];
      if (q < 0 || q > 50) continue;
      const back = (sq - absSquare(o, q) + TRACK_LEN) % TRACK_LEN;
      if (back >= 1 && back <= 6) n++;
    }
  }
  return n;
}

/* The computer picks a token. level: "easy" | "medium" | "hard" */
export function chooseToken(s, level = "medium") {
  const legal = legalTokens(s);
  if (legal.length <= 1) return legal[0];
  if (level === "easy") return legal[Math.floor(Math.random() * legal.length)];
  const c = colorOfTurn(s);
  const roll = s.roll;
  let best = legal[0], bestScore = -Infinity;
  for (const t of legal) {
    const p = s.tokens[c][t];
    const to = p === -1 ? 0 : p + roll;
    let score = Math.random() * 3;
    if (to === HOME) score += 100;
    const sq = absSquare(c, to);
    if (sq >= 0 && !SAFE.has(sq)) {
      for (const o of s.seats) {
        if (o === c) continue;
        for (let j = 0; j < 4; j++) {
          const q = s.tokens[o][j];
          if (q >= 0 && q <= 50 && absSquare(o, q) === sq) score += 70 + q;
        }
      }
    }
    if (p === -1) score += 45;
    if (to >= 51 && p < 51) score += 22;
    if (sq >= 0 && SAFE.has(sq)) score += 14;
    if (level === "hard") {
      if (p >= 0 && p <= 50) score += danger(s, c, p) * 26;          // run away from a token that could catch us
      if (to <= 50) score -= danger(s, c, to) * 24;                    // do not step into danger
      score += to * 0.25;
    } else {
      score += to * 0.1;
    }
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best;
}

export const cloneState = (s) => JSON.parse(JSON.stringify(s));
