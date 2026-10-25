/* Tic-Tac-Toe rules and the computer player. One pure module shared by the server (online games) and the browser (computer games).

   The board is 3x3, squares 0 to 8 reading left to right, top to bottom:  0 1 2 / 3 4 5 / 6 7 8
   Seat 0 plays X and always moves first. Seat 1 plays O.
   Three in a row (across, down or corner to corner) wins. A full board with no line is a draw. */

export const MARKS = ["X", "O"];
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const LEVELS = ["easy", "medium", "hard"];

const defaultRng = (n) => Math.floor(Math.random() * n);

export function newState() {
  return { board: Array(9).fill(null), turn: 0, winner: null, line: null, draw: false, lastMove: null };
}
export const seatOfTurn = (s) => s.turn;
export const isOver = (s) => s.winner != null || s.draw;
export const emptyCells = (board) => board.map((v, i) => (v == null ? i : -1)).filter((i) => i >= 0);

/* the line of three (or null) for a board */
export function lineOf(board) {
  for (const l of LINES) if (board[l[0]] != null && board[l[0]] === board[l[1]] && board[l[1]] === board[l[2]]) return l;
  return null;
}

/* Place a mark for the seat whose turn it is. Returns { ok:false, error } or what happened, so the screen can show it. */
export function move(s, seat, cell) {
  if (isOver(s)) return { ok: false, error: "game_over" };
  if (s.turn !== seat) return { ok: false, error: "not_your_turn" };
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return { ok: false, error: "bad_cell" };
  if (s.board[cell] != null) return { ok: false, error: "taken" };
  s.board[cell] = seat;
  const ev = { type: "move", seat, cell, mark: MARKS[seat], line: null, win: false, draw: false };
  const line = lineOf(s.board);
  if (line) { s.winner = seat; s.line = line; ev.win = true; ev.line = line; }
  else if (emptyCells(s.board).length === 0) { s.draw = true; ev.draw = true; }
  else s.turn = 1 - seat;
  s.lastMove = ev;
  return ev;
}

/* A player who leaves loses. */
export function resign(s, seat) {
  if (isOver(s)) return false;
  s.winner = 1 - seat;
  s.line = null;
  return true;
}

export function viewOf(s) {
  return { board: [...s.board], turn: isOver(s) ? null : s.turn, winner: s.winner, line: s.line ? [...s.line] : null, draw: s.draw };
}

/* ------------------------------------------------------------------ the computer */
/* Perfect play: the score of a position for `me`. A win is worth more the sooner it comes (more empty squares left),
   a loss is worth less the later it comes. Positions repeat a lot, so each one is only worked out once. */
const memo = new Map();
function minimax(board, toMove, me) {
  const key = board.map((v) => (v == null ? "-" : v)).join("") + toMove + me;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let result;
  const empty = emptyCells(board);
  const line = lineOf(board);
  if (line) result = board[line[0]] === me ? empty.length + 1 : -(empty.length + 1);
  else if (!empty.length) result = 0;
  else {
    result = toMove === me ? -Infinity : Infinity;
    for (const c of empty) {
      board[c] = toMove;
      const v = minimax(board, 1 - toMove, me);
      board[c] = null;
      result = toMove === me ? Math.max(result, v) : Math.min(result, v);
    }
  }
  memo.set(key, result);
  return result;
}
export function bestMoves(board, seat) {
  const b = [...board];
  let top = -Infinity, list = [];
  for (const c of emptyCells(b)) {
    b[c] = seat;
    const v = minimax(b, 1 - seat, seat);
    b[c] = null;
    if (v > top) { top = v; list = [c]; } else if (v === top) list.push(c);
  }
  return list;
}
function winningCell(board, seat) {
  for (const c of emptyCells(board)) {
    const b = [...board]; b[c] = seat;
    if (lineOf(b)) return c;
  }
  return -1;
}

/* easy:   plays anywhere (and only notices a win or a block about a third of the time).
   medium: always takes a win and blocks, otherwise plays a sensible square, and now and then slips up.
   hard:   never loses: it plays perfectly. */
export function chooseMove(s, seat, level = "medium", rng = defaultRng) {
  const empty = emptyCells(s.board);
  if (!empty.length) return -1;
  const random = () => empty[rng(empty.length)];
  if (level === "easy") {
    if (rng(3) === 0) {
      const w = winningCell(s.board, seat); if (w >= 0) return w;
      const b = winningCell(s.board, 1 - seat); if (b >= 0) return b;
    }
    return random();
  }
  if (level === "medium") {
    if (rng(8) === 0) return random();                    // an occasional slip
    const w = winningCell(s.board, seat); if (w >= 0) return w;
    const b = winningCell(s.board, 1 - seat); if (b >= 0) return b;
    if (s.board[4] == null) return 4;
    const corners = [0, 2, 6, 8].filter((c) => s.board[c] == null);
    if (corners.length) return corners[rng(corners.length)];
    return random();
  }
  const best = bestMoves(s.board, seat);
  return best[rng(best.length)];
}
