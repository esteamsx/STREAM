import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/claim-face.js", import.meta.url), "utf8");

test("daily coin face check uses a full-height vertical scan sweep instead of a spinner", () => {
  assert.match(source, /animation:cfSweep 1\.55s ease-in-out infinite alternate/);
  assert.match(source, /@keyframes cfSweep\{from\{top:4px\}to\{top:calc\(100% - 7px\)\}\}/);
  assert.match(source, /\.cf-sweep::before/);
  assert.match(source, /setStatus\('Scanning your face — hold still'\)/);
  assert.doesNotMatch(source, /cfRoll|cfBob|cf-ring/);
  assert.match(source, /prefers-reduced-motion:reduce[^`]*\.cf-sweep\{animation:none/);
});
