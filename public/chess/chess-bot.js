import { Chess, WHITE, BLACK, P, N, B, R, Q, K, moveFrom, moveTo, movePromo, moveFlags, F_CAPTURE, sqName } from "./chess-engine.js";

export const LEVELS = {
  easy:   { depth: 1, timeMs: 400,  noise: 150, blunder: 0.22 },
  medium: { depth: 3, timeMs: 1200, noise: 22,  blunder: 0 },
  hard:   { depth: 9, timeMs: 2600, noise: 0,   blunder: 0 },
};

const VALUE = [0, 100, 320, 330, 500, 900, 0];
const MATE = 100000;

const PST = {
  [P]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [N]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [B]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [R]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [Q]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  KMID: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  KEND: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50],
};

function evaluate(g) {
  const b = g.board;
  let score = 0, material = 0, wBishops = 0, bBishops = 0;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p) continue;
    const type = p & 7;
    if (type !== K && type !== P) material += VALUE[type];
  }
  const endgame = material <= 2600;
  for (let sq = 0; sq < 128; sq++) {
    if (sq & 0x88) { sq += 7; continue; }
    const p = b[sq];
    if (!p) continue;
    const type = p & 7, white = !(p & 8);
    const file = sq & 7, rank = sq >> 4;
    const idx = white ? (7 - rank) * 8 + file : rank * 8 + file;
    const table = type === K ? (endgame ? PST.KEND : PST.KMID) : PST[type];
    const v = (type === K ? 0 : VALUE[type]) + table[idx];
    if (white) { score += v; if (type === B) wBishops++; }
    else { score -= v; if (type === B) bBishops++; }
  }
  if (wBishops >= 2) score += 30;
  if (bBishops >= 2) score -= 30;
  return g.turn === WHITE ? score : -score;
}

class Search {
  constructor(game, deadline) {
    this.g = game;
    this.deadline = deadline;
    this.nodes = 0;
    this.stopped = false;
    this.killers = Array.from({ length: 64 }, () => [0, 0]);
    this.history = new Int32Array(128 * 128);
  }

  timeUp() {
    if ((this.nodes & 1023) === 0 && Date.now() >= this.deadline) this.stopped = true;
    return this.stopped;
  }

  orderScore(m, ply) {
    const g = this.g, b = g.board;
    const flags = moveFlags(m), promo = movePromo(m);
    if (flags & F_CAPTURE) {
      const victim = (flags & 4) ? P : (b[moveTo(m)] & 7);
      return 10000 + VALUE[victim] * 10 - VALUE[b[moveFrom(m)] & 7] / 10 + (promo ? 800 : 0);
    }
    if (promo) return 9000 + VALUE[promo];
    const k = this.killers[ply];
    if (m === k[0]) return 8000;
    if (m === k[1]) return 7000;
    return this.history[moveFrom(m) * 128 + moveTo(m)];
  }

  sortMoves(moves, ply, first) {
    const scored = moves.map((m) => [m === first ? 1e9 : this.orderScore(m, ply), m]);
    scored.sort((a, b) => b[0] - a[0]);
    return scored.map((x) => x[1]);
  }

  quiesce(alpha, beta, ply) {
    this.nodes++;
    if (this.timeUp()) return 0;
    const g = this.g;
    const stand = evaluate(g);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 24) return alpha;
    const us = g.turn;
    const moves = this.sortMoves(g.generate(true), ply, 0);
    for (const m of moves) {
      const flags = moveFlags(m);
      const victim = (flags & 4) ? P : (g.board[moveTo(m)] & 7);
      if (!movePromo(m) && stand + VALUE[victim] + 200 < alpha) continue;   // cannot catch up
      g.makeMove(m);
      if (g.isAttacked(g.kingSq[us], us ^ 1)) { g.unmakeMove(); continue; }
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      g.unmakeMove();
      if (this.stopped) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(depth, alpha, beta, ply) {
    this.nodes++;
    if (this.timeUp()) return 0;
    const g = this.g;
    if (g.halfmove >= 100) return 0;
    const us = g.turn;
    const inCheck = g.isAttacked(g.kingSq[us], us ^ 1);
    if (inCheck && ply < 40) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);
    const moves = this.sortMoves(g.generate(), ply, 0);
    let legal = 0;
    for (const m of moves) {
      g.makeMove(m);
      if (g.isAttacked(g.kingSq[us], us ^ 1)) { g.unmakeMove(); continue; }
      legal++;
      const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      g.unmakeMove();
      if (this.stopped) return 0;
      if (score >= beta) {
        if (!(moveFlags(m) & F_CAPTURE) && !movePromo(m)) {
          const k = this.killers[ply];
          if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
          this.history[moveFrom(m) * 128 + moveTo(m)] += depth * depth;
        }
        return beta;
      }
      if (score > alpha) alpha = score;
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    return alpha;
  }
}

export function chooseMove(game, level = "medium", opts = {}) {
  const cfg = LEVELS[level] || LEVELS.medium;
  const rng = opts.rng || Math.random;
  const legals = game.legalMoves();
  if (!legals.length) return null;
  const describe = (m, score, depth, nodes) => ({ move: m, uci: sqName(moveFrom(m)) + sqName(moveTo(m)) + (movePromo(m) ? "nbrq"[movePromo(m) - 2] : ""), score, depth, nodes });
  if (legals.length === 1) return describe(legals[0], 0, 0, 0);
  if (cfg.blunder && rng() < cfg.blunder) return describe(legals[Math.floor(rng() * legals.length)], 0, 0, 0);

  const deadline = Date.now() + (opts.timeMs || cfg.timeMs);
  const s = new Search(game, deadline);
  const us = game.turn;
  let ranked = legals.map((m) => ({ m, score: 0 }));
  let bestDepth = 0;
  const earlyNoise = cfg.noise || (game.fullmove <= 3 && level === "hard" ? 10 : 0);

  for (let depth = 1; depth <= cfg.depth; depth++) {
    const results = [];
    let best = -MATE * 2;
    for (const r of ranked) {
      const m = r.m;
      const floor = earlyNoise || best === -MATE * 2 ? -MATE * 2 : best - 1;
      game.makeMove(m);
      const score = -s.negamax(depth - 1, -MATE * 2, -floor, 1);
      game.unmakeMove();
      if (s.stopped) break;
      results.push({ m, score });
      if (score > best) best = score;
    }
    if (s.stopped) break;
    results.sort((a, b) => b.score - a.score);
    ranked = results;
    bestDepth = depth;
    if (Math.abs(results[0].score) > MATE - 100 && !earlyNoise) break;   // forced mate found
  }

  for (const r of ranked) {
    game.makeMove(r.m);
    if ((game.counts.get(game.positionKey()) || 0) >= 2) r.score = 0;
    game.unmakeMove();
  }
  ranked.sort((a, b) => b.score - a.score);

  let pick = ranked[0];
  const forcedMate = Math.abs(ranked[0].score) > MATE - 1000;
  if (earlyNoise && !forcedMate) {
    const noisy = ranked.map((r) => ({ r, v: r.score + (rng() * 2 - 1) * earlyNoise }));
    noisy.sort((a, b) => b.v - a.v);
    pick = noisy[0].r;
  } else {
    const top = ranked[0].score;
    const ties = ranked.filter((r) => r.score === top);
    pick = ties[Math.floor(rng() * ties.length)];
  }
  return describe(pick.m, pick.score, bestDepth, s.nodes);
}

export function chooseFromMoves(startFen, uciMoves, level, opts) {
  const g = new Chess(startFen);
  for (const u of uciMoves) {
    if (!g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) return null;
  }
  return chooseMove(g, level, opts);
}
