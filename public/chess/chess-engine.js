
export const WHITE = 0;
export const BLACK = 1;
export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

export const F_CAPTURE = 1, F_DOUBLE = 2, F_EP = 4, F_KCASTLE = 8, F_QCASTLE = 16;
const C_WK = 1, C_WQ = 2, C_BK = 4, C_BQ = 8;

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const KNIGHT = [-33, -31, -18, -14, 14, 18, 31, 33];
const KING = [-17, -16, -15, -1, 1, 15, 16, 17];
const BISHOP = [-17, -15, 15, 17];
const ROOK = [-16, -1, 1, 16];

const PIECE_LETTER = ["", "p", "n", "b", "r", "q", "k"];
const FILES = "abcdefgh";

const CASTLE_MASK = new Uint8Array(128).fill(15);
CASTLE_MASK[0] = 15 & ~C_WQ;
CASTLE_MASK[7] = 15 & ~C_WK;
CASTLE_MASK[4] = 15 & ~(C_WK | C_WQ);
CASTLE_MASK[112] = 15 & ~C_BQ;
CASTLE_MASK[119] = 15 & ~C_BK;
CASTLE_MASK[116] = 15 & ~(C_BK | C_BQ);

export const sqName = (sq) => FILES[sq & 7] + ((sq >> 4) + 1);
export const nameSq = (name) => (name.charCodeAt(1) - 49) * 16 + (name.charCodeAt(0) - 97);
const isSquare = (name) => typeof name === "string" && /^[a-h][1-8]$/.test(name);

export const moveFrom = (m) => m & 127;
export const moveTo = (m) => (m >> 7) & 127;
export const movePromo = (m) => (m >> 14) & 7;
export const moveFlags = (m) => m >> 17;
const mk = (from, to, promo, flags) => from | (to << 7) | (promo << 14) | (flags << 17);

export class Chess {
  constructor(fen = START_FEN) {
    this.board = new Int8Array(128);
    this.kingSq = [4, 116];
    this.turn = WHITE;
    this.castling = 15;
    this.ep = -1;
    this.halfmove = 0;
    this.fullmove = 1;
    this.stack = [];       // undo records
    this.sanList = [];
    this.uciList = [];
    this.counts = new Map();
    this.startFen = fen;
    this.load(fen);
  }

  load(fen) {
    const parts = String(fen).trim().split(/\s+/);
    if (parts.length < 4) throw new Error("bad fen");
    this.board.fill(0);
    const rows = parts[0].split("/");
    if (rows.length !== 8) throw new Error("bad fen");
    const map = { p: P, n: N, b: B, r: R, q: Q, k: K };
    let kings = [0, 0];
    for (let r = 0; r < 8; r++) {
      let file = 0;
      for (const ch of rows[r]) {
        if (ch >= "1" && ch <= "8") { file += Number(ch); continue; }
        const lower = ch.toLowerCase();
        if (!map[lower] || file > 7) throw new Error("bad fen");
        const color = ch === lower ? BLACK : WHITE;
        const sq = (7 - r) * 16 + file;
        this.board[sq] = map[lower] | (color << 3);
        if (map[lower] === K) { this.kingSq[color] = sq; kings[color]++; }
        file++;
      }
      if (file !== 8) throw new Error("bad fen");
    }
    if (kings[0] !== 1 || kings[1] !== 1) throw new Error("bad fen");
    this.turn = parts[1] === "b" ? BLACK : WHITE;
    this.castling = 0;
    if (parts[2].includes("K")) this.castling |= C_WK;
    if (parts[2].includes("Q")) this.castling |= C_WQ;
    if (parts[2].includes("k")) this.castling |= C_BK;
    if (parts[2].includes("q")) this.castling |= C_BQ;
    this.ep = parts[3] !== "-" && isSquare(parts[3]) ? nameSq(parts[3]) : -1;
    this.halfmove = Number(parts[4]) || 0;
    this.fullmove = Number(parts[5]) || 1;
    this.stack = [];
    this.sanList = [];
    this.uciList = [];
    this.counts = new Map();
    this.startFen = fen;
    this.noteRepetition();
  }

  fen() {
    let out = "";
    for (let r = 7; r >= 0; r--) {
      let empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.board[r * 16 + f];
        if (!p) { empty++; continue; }
        if (empty) { out += empty; empty = 0; }
        const letter = PIECE_LETTER[p & 7];
        out += p & 8 ? letter : letter.toUpperCase();
      }
      if (empty) out += empty;
      if (r) out += "/";
    }
    let c = "";
    if (this.castling & C_WK) c += "K";
    if (this.castling & C_WQ) c += "Q";
    if (this.castling & C_BK) c += "k";
    if (this.castling & C_BQ) c += "q";
    return `${out} ${this.turn === WHITE ? "w" : "b"} ${c || "-"} ${this.ep >= 0 ? sqName(this.ep) : "-"} ${this.halfmove} ${this.fullmove}`;
  }

  positionKey() {
    let epPart = "-";
    if (this.ep >= 0) {
      const dir = this.turn === WHITE ? -16 : 16;
      const mine = P | (this.turn << 3);
      for (const d of [-1, 1]) {
        const from = this.ep + dir + d;
        if (!(from & 0x88) && this.board[from] === mine) epPart = sqName(this.ep);
      }
    }
    let s = "";
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      s += this.board[sq] ? String.fromCharCode(64 + (this.board[sq] & 15)) : ".";
    }
    return `${s}${this.turn}${this.castling}${epPart}`;
  }

  noteRepetition() {
    const key = this.positionKey();
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
    return key;
  }

  isAttacked(sq, by) {
    const b = this.board;
    const pawn = P | (by << 3);
    const back = by === WHITE ? -16 : 16;
    let s = sq + back - 1;
    if (!(s & 0x88) && b[s] === pawn) return true;
    s = sq + back + 1;
    if (!(s & 0x88) && b[s] === pawn) return true;
    const knight = N | (by << 3);
    for (let i = 0; i < 8; i++) {
      s = sq + KNIGHT[i];
      if (!(s & 0x88) && b[s] === knight) return true;
    }
    const king = K | (by << 3);
    for (let i = 0; i < 8; i++) {
      s = sq + KING[i];
      if (!(s & 0x88) && b[s] === king) return true;
    }
    const bishop = B | (by << 3), rook = R | (by << 3), queen = Q | (by << 3);
    for (let i = 0; i < 4; i++) {
      const d = BISHOP[i];
      s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === bishop || p === queen) return true; break; }
        s += d;
      }
    }
    for (let i = 0; i < 4; i++) {
      const d = ROOK[i];
      s = sq + d;
      while (!(s & 0x88)) {
        const p = b[s];
        if (p) { if (p === rook || p === queen) return true; break; }
        s += d;
      }
    }
    return false;
  }

  inCheck(color = this.turn) {
    return this.isAttacked(this.kingSq[color], color ^ 1);
  }

  generate(captureOnly = false) {
    const b = this.board, us = this.turn, them = us ^ 1, moves = [];
    const colorBit = us << 3;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const piece = b[sq];
      if (!piece || (piece & 8) !== colorBit) continue;
      const type = piece & 7;
      if (type === P) {
        const dir = us === WHITE ? 16 : -16;
        const startRank = us === WHITE ? 1 : 6;
        const promoRank = us === WHITE ? 7 : 0;
        const one = sq + dir;
        if (!(one & 0x88) && !b[one]) {
          if ((one >> 4) === promoRank) {
            for (let pr = Q; pr >= N; pr--) moves.push(mk(sq, one, pr, 0));
          } else if (!captureOnly) {
            moves.push(mk(sq, one, 0, 0));
            const two = one + dir;
            if ((sq >> 4) === startRank && !b[two]) moves.push(mk(sq, two, 0, F_DOUBLE));
          }
        }
        for (const side of [-1, 1]) {
          const to = sq + dir + side;
          if (to & 0x88) continue;
          const target = b[to];
          if (target && (target & 8) === (them << 3)) {
            if ((to >> 4) === promoRank) {
              for (let pr = Q; pr >= N; pr--) moves.push(mk(sq, to, pr, F_CAPTURE));
            } else moves.push(mk(sq, to, 0, F_CAPTURE));
          } else if (to === this.ep) {
            moves.push(mk(sq, to, 0, F_CAPTURE | F_EP));
          }
        }
      } else if (type === N || type === K) {
        const offsets = type === N ? KNIGHT : KING;
        for (let i = 0; i < 8; i++) {
          const to = sq + offsets[i];
          if (to & 0x88) continue;
          const target = b[to];
          if (!target) { if (!captureOnly) moves.push(mk(sq, to, 0, 0)); }
          else if ((target & 8) === (them << 3)) moves.push(mk(sq, to, 0, F_CAPTURE));
        }
        if (type === K && !captureOnly) this.genCastling(sq, moves);
      } else {
        const dirs = type === B ? BISHOP : type === R ? ROOK : null;
        const list = dirs || KING;
        for (let i = 0; i < list.length; i++) {
          const d = list[i];
          let to = sq + d;
          while (!(to & 0x88)) {
            const target = b[to];
            if (!target) { if (!captureOnly) moves.push(mk(sq, to, 0, 0)); }
            else {
              if ((target & 8) === (them << 3)) moves.push(mk(sq, to, 0, F_CAPTURE));
              break;
            }
            to += d;
          }
        }
      }
    }
    return moves;
  }

  genCastling(sq, moves) {
    const us = this.turn, them = us ^ 1, b = this.board;
    const base = us === WHITE ? 0 : 112;
    if (sq !== base + 4) return;
    const kRight = us === WHITE ? C_WK : C_BK, qRight = us === WHITE ? C_WQ : C_BQ;
    if (!(this.castling & (kRight | qRight))) return;
    if (this.isAttacked(sq, them)) return;
    const rook = R | (us << 3);
    if ((this.castling & kRight) && b[base + 7] === rook && !b[base + 5] && !b[base + 6]
      && !this.isAttacked(base + 5, them) && !this.isAttacked(base + 6, them)) {
      moves.push(mk(sq, base + 6, 0, F_KCASTLE));
    }
    if ((this.castling & qRight) && b[base] === rook && !b[base + 1] && !b[base + 2] && !b[base + 3]
      && !this.isAttacked(base + 3, them) && !this.isAttacked(base + 2, them)) {
      moves.push(mk(sq, base + 2, 0, F_QCASTLE));
    }
  }

  makeMove(m) {
    const b = this.board;
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = m >> 17;
    const piece = b[from];
    const us = this.turn;
    let captured = b[to];
    this.stack.push({ m, captured, castling: this.castling, ep: this.ep, halfmove: this.halfmove });
    b[to] = promo ? (promo | (us << 3)) : piece;
    b[from] = 0;
    if (flags & F_EP) {
      const capSq = to + (us === WHITE ? -16 : 16);
      this.stack[this.stack.length - 1].captured = b[capSq];
      b[capSq] = 0;
      captured = 1;
    }
    if (flags & F_KCASTLE) { b[to - 1] = b[to + 1]; b[to + 1] = 0; }
    if (flags & F_QCASTLE) { b[to + 1] = b[to - 2]; b[to - 2] = 0; }
    if ((piece & 7) === K) this.kingSq[us] = to;
    this.castling &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.ep = flags & F_DOUBLE ? (from + to) >> 1 : -1;
    this.halfmove = (piece & 7) === P || captured ? 0 : this.halfmove + 1;
    if (us === BLACK) this.fullmove++;
    this.turn = us ^ 1;
  }

  unmakeMove() {
    const rec = this.stack.pop();
    const m = rec.m;
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = m >> 17;
    const b = this.board;
    const us = this.turn ^ 1;
    this.turn = us;
    if (us === BLACK) this.fullmove--;
    const moved = promo ? (P | (us << 3)) : b[to];
    b[from] = moved;
    if (flags & F_EP) {
      b[to] = 0;
      b[to + (us === WHITE ? -16 : 16)] = rec.captured;
    } else {
      b[to] = rec.captured;
    }
    if (flags & F_KCASTLE) { b[to + 1] = b[to - 1]; b[to - 1] = 0; }
    if (flags & F_QCASTLE) { b[to - 2] = b[to + 1]; b[to + 1] = 0; }
    if ((moved & 7) === K) this.kingSq[us] = from;
    this.castling = rec.castling;
    this.ep = rec.ep;
    this.halfmove = rec.halfmove;
  }

  legalMoves(captureOnly = false) {
    const out = [];
    const us = this.turn;
    for (const m of this.generate(captureOnly)) {
      this.makeMove(m);
      if (!this.isAttacked(this.kingSq[us], us ^ 1)) out.push(m);
      this.unmakeMove();
    }
    return out;
  }

  turnColor() { return this.turn === WHITE ? "w" : "b"; }

  pieceAt(name) {
    const p = this.board[nameSq(name)];
    return p ? { type: PIECE_LETTER[p & 7], color: p & 8 ? "b" : "w" } : null;
  }

  grid() {
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      const row = [];
      for (let f = 0; f < 8; f++) {
        const p = this.board[r * 16 + f];
        row.push(p ? { type: PIECE_LETTER[p & 7], color: p & 8 ? "b" : "w" } : null);
      }
      rows.push(row);
    }
    return rows;
  }

  describe(m, legals) {
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = m >> 17;
    const piece = this.board[from];
    const type = piece & 7;
    const uci = sqName(from) + sqName(to) + (promo ? PIECE_LETTER[promo] : "");
    let san;
    if (flags & F_KCASTLE) san = "O-O";
    else if (flags & F_QCASTLE) san = "O-O-O";
    else {
      san = "";
      const capture = (flags & F_CAPTURE) !== 0;
      if (type === P) {
        if (capture) san += FILES[from & 7];
      } else {
        san += PIECE_LETTER[type].toUpperCase();
        let sameFile = false, sameRank = false, ambiguous = false;
        for (const o of legals || this.legalMoves()) {
          const of = o & 127;
          if (o === m || ((o >> 7) & 127) !== to || of === from || this.board[of] !== piece) continue;
          ambiguous = true;
          if ((of & 7) === (from & 7)) sameFile = true;
          if ((of >> 4) === (from >> 4)) sameRank = true;
        }
        if (ambiguous) {
          if (!sameFile) san += FILES[from & 7];
          else if (!sameRank) san += (from >> 4) + 1;
          else san += FILES[from & 7] + ((from >> 4) + 1);
        }
      }
      if (capture) san += "x";
      san += sqName(to);
      if (promo) san += "=" + PIECE_LETTER[promo].toUpperCase();
    }
    return { from: sqName(from), to: sqName(to), promotion: promo ? PIECE_LETTER[promo] : undefined, uci, san, capture: (flags & F_CAPTURE) !== 0, piece: PIECE_LETTER[type], color: this.turn === WHITE ? "w" : "b", flags };
  }

  moves() {
    const legals = this.legalMoves();
    return legals.map((m) => this.describe(m, legals));
  }

  move(input) {
    if (!input || !isSquare(input.from) || !isSquare(input.to)) return null;
    const from = nameSq(input.from), to = nameSq(input.to);
    let promo = 0;
    if (input.promotion != null && input.promotion !== "") {
      promo = { n: N, b: B, r: R, q: Q }[String(input.promotion).toLowerCase()] || -1;
      if (promo < 0) return null;
    }
    const legals = this.legalMoves();
    let found = null;
    for (const m of legals) {
      if ((m & 127) !== from || ((m >> 7) & 127) !== to) continue;
      const mp = (m >> 14) & 7;
      if (mp !== promo) {
        continue;
      }
      found = m;
      break;
    }
    if (found === null) return null;
    const info = this.describe(found, legals);
    this.makeMove(found);
    this.noteRepetition();
    const mate = this.inCheck() && this.legalMoves().length === 0;
    info.san += mate ? "#" : this.inCheck() ? "+" : "";
    info.fen = this.fen();
    this.sanList.push(info.san);
    this.uciList.push(info.uci);
    return info;
  }

  undo() {
    if (!this.uciList.length) return false;
    const key = this.positionKey();
    this.counts.set(key, (this.counts.get(key) || 1) - 1);
    this.unmakeMove();
    this.sanList.pop();
    this.uciList.pop();
    return true;
  }

  history() { return this.sanList.slice(); }
  uciHistory() { return this.uciList.slice(); }

  isCheck() { return this.inCheck(); }
  hasLegalMove() { return this.legalMoves().length > 0; }
  isCheckmate() { return this.inCheck() && !this.hasLegalMove(); }
  isStalemate() { return !this.inCheck() && !this.hasLegalMove(); }

  isThreefold() {
    return (this.counts.get(this.positionKey()) || 0) >= 3;
  }

  isFiftyMove() { return this.halfmove >= 100; }

  isInsufficientMaterial() {
    const minors = [];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const t = this.board[sq] & 7;
      if (!t || t === K) continue;
      if (t === P || t === R || t === Q) return false;
      minors.push({ t, sq });
    }
    if (minors.length <= 1) return true;
    if (minors.every((x) => x.t === B)) {
      const shade = (x) => ((x.sq & 7) + (x.sq >> 4)) & 1;
      return minors.every((x) => shade(x) === shade(minors[0]));
    }
    return false;
  }

  hasMatingMaterial(color) {
    let minors = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.board[sq];
      if (!p || ((p & 8) >> 3) !== color) continue;
      const t = p & 7;
      if (t === P || t === R || t === Q) return true;
      if (t === N || t === B) minors++;
    }
    return minors >= 2;
  }

  result() {
    const legal = this.hasLegalMove();
    if (!legal) {
      if (this.inCheck()) return { over: true, winner: this.turn === WHITE ? "b" : "w", reason: "checkmate" };
      return { over: true, winner: null, reason: "stalemate" };
    }
    if (this.isInsufficientMaterial()) return { over: true, winner: null, reason: "insufficient" };
    if (this.isThreefold()) return { over: true, winner: null, reason: "repetition" };
    if (this.isFiftyMove()) return { over: true, winner: null, reason: "fifty" };
    return { over: false, winner: null, reason: null };
  }

  perft(depth) {
    if (depth === 0) return 1;
    const moves = this.legalMoves();
    if (depth === 1) return moves.length;
    let nodes = 0;
    for (const m of moves) {
      this.makeMove(m);
      nodes += this.perft(depth - 1);
      this.unmakeMove();
    }
    return nodes;
  }
}

export function replay(uciMoves, fen = START_FEN) {
  const g = new Chess(fen);
  for (const u of uciMoves) {
    if (typeof u !== "string" || u.length < 4 || u.length > 5) return null;
    if (!g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) return null;
  }
  return g;
}
