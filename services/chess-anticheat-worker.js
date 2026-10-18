import { parentPort } from "worker_threads";
import { Chess } from "../public/chess/chess-engine.js";
import { chooseMove } from "../public/chess/chess-bot.js";

parentPort.on("message", ({ id, moves, humanColor, maxPositions, timeMs }) => {
  try {
    const humanPlies = [];
    for (let i = 0; i < moves.length; i++) {
      const isWhitePly = i % 2 === 0;
      if ((humanColor === "w") === isWhitePly) humanPlies.push(i);
    }
    const candidates = humanPlies.slice(6);
    const step = Math.max(1, Math.ceil(candidates.length / maxPositions));
    const picked = candidates.filter((_, k) => k % step === 0).slice(0, maxPositions);
    let analyzed = 0;
    let matches = 0;
    for (const ply of picked) {
      const g = new Chess();
      let ok = true;
      for (let j = 0; j < ply; j++) {
        const u = moves[j];
        if (!g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) { ok = false; break; }
      }
      if (!ok || g.legalMoves().length <= 1) continue;
      const best = chooseMove(g, "hard", { timeMs, rng: () => 0 });
      if (!best) continue;
      analyzed++;
      if (best.uci === moves[ply]) matches++;
    }
    parentPort.postMessage({ id, analyzed, matches });
  } catch (err) {
    parentPort.postMessage({ id, error: String((err && err.message) || err) });
  }
});
