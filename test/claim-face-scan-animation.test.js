import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/claim-face.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");

test("daily coin face check preserves the original center-face flow", () => {
  assert.match(source, /animation:cfSweep 2s ease-in-out infinite/);
  assert.match(source, /@keyframes cfSweep\{0%\{transform:translateY\(6px\)\}50%\{transform:translateY\(190px\)\}100%\{transform:translateY\(6px\)\}\}/);
  assert.match(source, /setStatus\('Center your face and hold still'\)/);
  assert.match(source, /setStatus\('Hold still'\)/);
  assert.match(source, /cfRoll|cfBob|cf-ring|cf-coin/);
  assert.equal((account.match(/import\('\/claim-face\.js\?v=\$\{ASSET_VERSION\}'\)/g) || []).length, 2);
  assert.doesNotMatch(source, /setStatus\('Scanning your face — hold still'\)/);
});
