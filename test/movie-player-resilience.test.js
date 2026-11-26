import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/movies/movies.js", import.meta.url), "utf8");

test("movie player debounces transient buffering feedback", () => {
  assert.match(source, /var bufferingTimer = null/);
  assert.match(source, /Buffering video…"; \}, 3000\)/);
  assert.match(source, /playing\", function \(\) \{ clearBufferingTimer\(\); status\.textContent = \"\"; \}/);
});

test("movie playback accepts valid media responses when a mobile range probe is not honored", () => {
  assert.match(source, /action === \"playback\" && media && \(response\.status === 200 \|\| response\.status === 206\)/);
  assert.match(source, /if \(response\.status === 206 && media && oneByteRange\)/);
});
