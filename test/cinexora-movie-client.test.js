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
  assert.match(client, /sourceQuery\.push\("detailPath=" \+ encodeURIComponent\(d\.detailPath\)\)/);
  assert.match(client, /if \(d\.kind === "tv"\) sourceQuery\.push\("season="/);
  assert.match(client, /filename=" \+ encodeURIComponent\(filename\)/);
  assert.ok(client.includes('if (/^\\d+$/.test(q)) title += " " + q + "p";'));
  assert.match(client, /link\.download = filename/);
  assert.match(client, /Download requested\. Chrome may take a moment to begin/);
  assert.match(client, /path\.indexOf\("\/watch-later"\) !== 0/);
  assert.doesNotMatch(client, /referrerpolicy:\s*["']no-referrer["']/i);
});

test("seasonal decoration stays behind movie content", () => {
  const christmas = readFileSync(new URL("../public/christmas-theme.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../public/movies/movies.css", import.meta.url), "utf8");
  assert.match(christmas, /\.esxmas-layer\{[^}]*z-index:0/);
  assert.match(css, /\.mv-main\{[^}]*z-index:2/);
});
