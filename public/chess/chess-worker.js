import { chooseFromMoves } from "./chess-bot.js";

self.onmessage = (e) => {
  const { id, startFen, moves, level } = e.data || {};
  try {
    const r = chooseFromMoves(startFen, Array.isArray(moves) ? moves : [], level);
    self.postMessage({ id, uci: r ? r.uci : null });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
