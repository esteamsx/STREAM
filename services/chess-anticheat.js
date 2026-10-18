import { Worker } from "worker_threads";
import { Chess } from "../public/chess/chess-engine.js";


const MIN_HUMAN_MOVES = 8;
const MIN_DURATION_MS = 60 * 1000;

let worker = null;
let nextId = 1;
const waiting = new Map();
let chain = Promise.resolve();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./chess-anticheat-worker.js", import.meta.url));
  worker.on("message", (m) => { const w = waiting.get(m.id); if (w) { waiting.delete(m.id); w(m); } });
  worker.on("error", () => { for (const [, w] of waiting) w({ error: "worker" }); waiting.clear(); worker = null; });
  worker.on("exit", () => { worker = null; });
  return worker;
}

function runEngine(job) {
  const task = chain.then(() => new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiting.delete(id); resolve({ error: "timeout" }); }, 25000);
    waiting.set(id, (m) => { clearTimeout(timer); resolve(m); });
    try { getWorker().postMessage({ id, ...job }); } catch { clearTimeout(timer); waiting.delete(id); resolve({ error: "worker" }); }
  }));
  chain = task.catch(() => {});
  return task;
}

function stats(arr) {
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { mean, cv: mean ? sd / mean : 0 };
}

export function replayBotGame(uciMoves, humanColor) {
  if (!Array.isArray(uciMoves) || uciMoves.length < 4 || uciMoves.length > 600) return { ok: false, reason: "bad_moves" };
  const g = new Chess();
  for (const u of uciMoves) {
    if (typeof u !== "string" || !/^[a-h][1-8][a-h][1-8][nbrq]?$/.test(u)) return { ok: false, reason: "bad_moves" };
    if (!g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) return { ok: false, reason: "illegal" };
  }
  const res = g.result();
  const humanMoves = uciMoves.filter((_, i) => (humanColor === "w") === (i % 2 === 0)).length;
  return { ok: true, humanWon: !!(res.over && res.winner === humanColor && res.reason === "checkmate"), humanMoves };
}

export async function analyzeBotGame({ moves, humanColor, timings, serverDurationMs, blurCount, blurMs }) {
  const reasons = [];
  let score = 0;
  const humanPlyCount = moves.filter((_, i) => (humanColor === "w") === (i % 2 === 0)).length;

  if (humanPlyCount < MIN_HUMAN_MOVES) return { verdict: "too_short", score: 0, reasons: ["Game was too short"], humanMoves: humanPlyCount };
  if (serverDurationMs < MIN_DURATION_MS) return { verdict: "too_short", score: 0, reasons: ["Game was over too quickly"], humanMoves: humanPlyCount };

  const times = (Array.isArray(timings) ? timings : []).map(Number).filter((x) => Number.isFinite(x) && x >= 0 && x < 600000);
  const avgFromServer = serverDurationMs / humanPlyCount;
  if (avgFromServer < 1500) { score += 2; reasons.push("Moves were played extremely fast"); }
  else if (avgFromServer < 3500) { score += 1; reasons.push("Moves were played very fast"); }
  if (times.length >= 10) {
    const { mean, cv } = stats(times);
    if (cv < 0.22 && mean < 20000) { score += 1; reasons.push("Move times were unusually even"); }
    const fast = times.filter((t) => t < 1500).length / times.length;
    if (fast > 0.6) { score += 1; reasons.push("Most moves took under 1.5 seconds"); }
  }

  const bc = Number(blurCount) || 0;
  const bm = Number(blurMs) || 0;
  if (bm / serverDurationMs > 0.3 || bc >= Math.max(6, humanPlyCount * 0.5)) { score += 1; reasons.push("Left the game page many times during play"); }

  let agreement = null;
  let analyzed = 0;
  const eng = await runEngine({ moves, humanColor, maxPositions: 16, timeMs: 220 });
  if (!eng.error && eng.analyzed >= 8) {
    analyzed = eng.analyzed;
    agreement = eng.matches / eng.analyzed;
    const pct = Math.round(agreement * 100);
    if (agreement >= 0.8) { score += 4; reasons.push(`Matched the engine's top move ${pct}% of the time`); }
    else if (agreement >= 0.68) { score += 3; reasons.push(`Matched the engine's top move ${pct}% of the time`); }
    else if (agreement >= 0.55) { score += 1; reasons.push(`Matched the engine's top move ${pct}% of the time`); }
  }

  const verdict = score >= 4 ? "ai" : score >= 3 ? "suspicious" : "human";
  return { verdict, score, reasons, humanMoves: humanPlyCount, agreement, analyzed, avgMs: Math.round(avgFromServer) };
}
