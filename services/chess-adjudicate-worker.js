import { parentPort } from "worker_threads";
import { Chess } from "../public/chess/chess-engine.js";
import { chooseMove } from "../public/chess/chess-bot.js";

parentPort.on("message", ({ id, fen }) => {
  try {
    const g = new Chess(fen);
    const r = chooseMove(g, "hard", { timeMs: 1800, rng: () => 0 });
    if (!r) { parentPort.postMessage({ id, cp: 0 }); return; }
    const whiteView = g.turnColor() === "w" ? r.score : -r.score;
    parentPort.postMessage({ id, cp: Math.max(-2000, Math.min(2000, whiteView)) });
  } catch (err) {
    parentPort.postMessage({ id, error: String((err && err.message) || err) });
  }
});
