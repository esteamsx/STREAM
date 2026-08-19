import { parentPort, workerData } from "node:worker_threads";
import JavaScriptObfuscator from "javascript-obfuscator";

try {
  const result = JavaScriptObfuscator.obfuscate(workerData.code, workerData.options);
  parentPort.postMessage({ ok: true, code: result.getObfuscatedCode() });
} catch (err) {
  parentPort.postMessage({ ok: false, error: err?.message || "Obfuscation failed." });
}
