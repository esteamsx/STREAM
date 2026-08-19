import { parentPort, workerData } from "node:worker_threads";

const MAX_MATCHES = 500;

try {
  const { pattern, flags, testString } = workerData;
  const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
  const matches = [];
  let match;
  let guard = 0;
  while ((match = re.exec(testString)) !== null && matches.length < MAX_MATCHES) {
    matches.push({
      match: match[0],
      index: match.index,
      groups: match.slice(1),
    });
    if (match[0] === "") re.lastIndex++;
    if (++guard > 100000) break;
  }
  parentPort.postMessage({ ok: true, matches, truncated: matches.length >= MAX_MATCHES });
} catch (err) {
  parentPort.postMessage({ ok: false, error: err?.message || "Invalid regular expression." });
}
