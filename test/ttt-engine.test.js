import test from "node:test";
import assert from "node:assert/strict";
import { MARKS, LINES, newState, move, resign, viewOf, lineOf, emptyCells, chooseMove, bestMoves, isOver, seatOfTurn } from "../public/tictactoe/ttt-engine.js";

const play = (cells) => { const s = newState(); cells.forEach((c) => { const r = move(s, seatOfTurn(s), c); assert.ok(r.ok !== false, "move " + c); }); return s; };

test("X always goes first and the players take turns", () => {
  const s = newState();
  assert.equal(seatOfTurn(s), 0);
  assert.equal(move(s, 0, 4).mark, "X");
  assert.equal(seatOfTurn(s), 1);
  assert.equal(move(s, 1, 0).mark, "O");
  assert.equal(seatOfTurn(s), 0);
});

test("you cannot move out of turn, on a taken square, or off the board", () => {
  const s = newState();
  assert.equal(move(s, 1, 0).error, "not_your_turn");
  move(s, 0, 0);
  assert.equal(move(s, 1, 0).error, "taken");
  assert.equal(move(s, 1, 9).error, "bad_cell");
  assert.equal(move(s, 1, -1).error, "bad_cell");
  assert.equal(move(s, 1, 1.5).error, "bad_cell");
  assert.equal(move(s, 1, "1").error, "bad_cell");
  assert.equal(seatOfTurn(s), 1);
});

test("all 8 lines win: three rows, three columns and both diagonals", () => {
  assert.equal(LINES.length, 8);
  for (const line of LINES) {
    const others = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => !line.includes(c));
    const s = newState();
    // X plays the line while O plays two squares that are not on it (two marks can never make a line)
    const oMoves = others.slice(0, 2);
    const order = [line[0], oMoves[0], line[1], oMoves[1], line[2]];
    let ev;
    for (const c of order) ev = move(s, seatOfTurn(s), c);
    assert.ok(ev.win, "line " + line);
    assert.equal(s.winner, 0);
    assert.deepEqual(s.line, line);
    assert.deepEqual(ev.line, line);
  }
});

test("O can win too, and the game stops once someone has won", () => {
  const s = play([0, 3, 1, 4, 8, 5]);                     // O takes the middle row 3 4 5
  assert.equal(s.winner, 1);
  assert.deepEqual(s.line, [3, 4, 5]);
  assert.equal(move(s, 0, 2).error, "game_over");
  assert.equal(viewOf(s).turn, null);
});

test("a full board with no line is a draw", () => {
  const s = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(s.winner, null); assert.ok(s.draw); assert.equal(lineOf(s.board), null);
  assert.equal(move(s, 0, 0).error, "game_over");
  assert.ok(isOver(s));
});

test("every possible game ends correctly: 255,168 games, 131,184 X wins, 77,904 O wins, 46,080 draws", () => {
  let games = 0, xWins = 0, oWins = 0, draws = 0, lastSquareWins = 0;
  const walk = (s) => {
    if (isOver(s)) {
      games++;
      if (s.winner === 0) xWins++; else if (s.winner === 1) oWins++; else draws++;
      assert.equal(s.draw, s.winner == null);
      if (s.winner != null && emptyCells(s.board).length === 0) { lastSquareWins++; assert.ok(!s.draw); }
      return;
    }
    for (const c of emptyCells(s.board)) {
      const t = { ...s, board: [...s.board] };
      assert.ok(move(t, seatOfTurn(t), c).ok !== false);
      walk(t);
    }
  };
  walk(newState());
  assert.equal(games, 255168);
  assert.equal(xWins, 131184);
  assert.equal(oWins, 77904);
  assert.equal(draws, 46080);
  assert.ok(lastSquareWins > 0, "X can win with the very last square, and that is a win, not a draw");
});

test("resigning gives the win to the other player", () => {
  const s = newState();
  assert.ok(resign(s, 0));
  assert.equal(s.winner, 1);
  assert.ok(!resign(s, 1));
});

test("the view shows the board and whose turn it is", () => {
  const s = newState();
  move(s, 0, 4);
  assert.deepEqual(viewOf(s), { board: [null, null, null, null, 0, null, null, null, null], turn: 1, winner: null, line: null, draw: false });
});

test("the computer only plays on empty squares at every level", () => {
  for (const level of ["easy", "medium", "hard"]) {
    for (let g = 0; g < 400; g++) {
      const s = newState();
      while (!isOver(s)) {
        const c = chooseMove(s, seatOfTurn(s), level);
        assert.ok(c >= 0 && s.board[c] == null, level + " picked a taken square");
        move(s, seatOfTurn(s), c);
      }
    }
  }
});

test("the computer always takes a win when it can and blocks when it must (medium and hard)", () => {
  const rng0 = () => 1;                                    // never the 1-in-8 slip for medium
  const win = newState(); [0, 3, 1, 4].forEach((c) => move(win, seatOfTurn(win), c));   // X to move, X can win at 2, O threatens 5
  assert.equal(chooseMove(win, 0, "hard"), 2);
  assert.equal(chooseMove(win, 0, "medium", rng0), 2);
  const block = newState(); [0, 4, 1].forEach((c) => move(block, seatOfTurn(block), c));  // O to move, X threatens 2
  assert.equal(chooseMove(block, 1, "hard"), 2);
  assert.equal(chooseMove(block, 1, "medium", rng0), 2);
});

test("hard never loses: 2,000 games against a random player and against itself", () => {
  let hardWins = 0, hardLosses = 0, draws = 0;
  for (let g = 0; g < 2000; g++) {
    const hardSeat = g % 2;
    const s = newState();
    while (!isOver(s)) {
      const seat = seatOfTurn(s);
      const c = seat === hardSeat ? chooseMove(s, seat, "hard") : chooseMove(s, seat, "easy");
      move(s, seat, c);
    }
    if (s.winner === hardSeat) hardWins++; else if (s.winner === 1 - hardSeat) hardLosses++; else draws++;
  }
  assert.equal(hardLosses, 0);
  assert.ok(hardWins > 1500, "hard should beat a random player almost every time: " + hardWins);
  for (let g = 0; g < 50; g++) {
    const s = newState();
    while (!isOver(s)) { const seat = seatOfTurn(s); move(s, seat, chooseMove(s, seat, "hard")); }
    assert.ok(s.draw, "perfect play against perfect play is always a draw");
  }
});

test("hard takes the first move at a corner or the centre, and answers a corner opening in the centre", () => {
  const s = newState();
  const first = bestMoves(s.board, 0);
  assert.equal(first.length, 9);                           // every opening draws with best play
  const t = newState(); move(t, 0, 0);
  assert.deepEqual(bestMoves(t.board, 1), [4]);
});

test("levels are ordered: medium beats easy, and hard beats medium or draws", () => {
  const tally = (a, b, n) => {
    let aw = 0, bw = 0;
    for (let g = 0; g < n; g++) {
      const aSeat = g % 2, s = newState();
      while (!isOver(s)) { const seat = seatOfTurn(s); move(s, seat, chooseMove(s, seat, seat === aSeat ? a : b)); }
      if (s.winner === aSeat) aw++; else if (s.winner === 1 - aSeat) bw++;
    }
    return [aw, bw];
  };
  const [mw, ml] = tally("medium", "easy", 1000);
  assert.ok(mw > ml * 3, "medium " + mw + " vs easy " + ml);
  const [hw, hl] = tally("hard", "medium", 1000);
  assert.equal(hl, 0);
  assert.ok(hw > 0, "hard should win some games against medium's slips");
});

test("empty cells are reported in order", () => {
  const s = newState(); move(s, 0, 4);
  assert.deepEqual(emptyCells(s.board), [0, 1, 2, 3, 5, 6, 7, 8]);
  assert.deepEqual(MARKS, ["X", "O"]);
});
