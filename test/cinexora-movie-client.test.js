import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../public/movies/movies.js", import.meta.url), "utf8");

test("movie page uses Cinexora directly for data and signed downloads", () => {
  assert.match(client, /var CINEXORA = "https:\/\/cinexora\.name\.ng"/);
  assert.match(client, /\/api\/homepage/);
  assert.match(client, /\/api\/trending/);
  assert.match(client, /\/api\/search\//);
  assert.match(client, /\/api\/info\//);
  assert.match(client, /\/api\/sources\//);
  assert.match(client, /downloadUrl: x\.proxyUrl \|\| null/);
  assert.match(client, /streamUrl: x\.streamUrl \|\| null/);
  assert.match(client, /path\.indexOf\("\/watch-later"\) !== 0/);
  assert.doesNotMatch(client, /referrerpolicy:\s*["']no-referrer["']/i);
});
