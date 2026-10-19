import { Worker } from "worker_threads";

let worker = null;
let nextId = 1;
const waiting = new Map();
let chain = Promise.resolve();

function getWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./chess-adjudicate-worker.js", import.meta.url));
  worker.on("message", (m) => { const w = waiting.get(m.id); if (w) { waiting.delete(m.id); w(m); } });
  worker.on("error", () => { for (const [, w] of waiting) w({ error: "worker" }); waiting.clear(); worker = null; });
  worker.on("exit", () => { worker = null; });
  return worker;
}

export function adjudicatePosition(fen) {
  const task = chain.then(() => new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => { waiting.delete(id); resolve(null); }, 15000);
    waiting.set(id, (m) => { clearTimeout(timer); resolve(typeof m.cp === "number" ? m.cp : null); });
    try { getWorker().postMessage({ id, fen }); } catch { clearTimeout(timer); waiting.delete(id); resolve(null); }
  }));
  chain = task.catch(() => {});
  return task;
}
