import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderLiveTv } from "../views/live-tv.js";

const html = renderLiveTv({
  liveTV: [],
  categoryIcon: () => "",
  DOMAIN_LOCK_SCRIPT: "",
  siteHeadFor: () => "",
});

function inlineScripts(markup) {
  return [...markup.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1]);
}

test("live page inline scripts remain syntactically valid", () => {
  const scripts = inlineScripts(html);
  assert.ok(scripts.length > 0);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test("HLS configuration targets ordinary live playlists rather than low-latency HLS", () => {
  assert.match(html, /lowLatencyMode:\s*false/);
  assert.match(html, /liveSyncDurationCount:\s*4/);
  assert.match(html, /liveMaxLatencyDurationCount:\s*12/);
  assert.match(html, /maxBufferLength:\s*45/);
  assert.match(html, /maxMaxBufferLength:\s*90/);
});

test("custom recovery ladder does not restart loading before first video progress", () => {
  assert.match(html, /if\(_lastT === -1\) return;[\s\S]*?hlsInstance\.startLoad\(\)[\s\S]*?hlsInstance\.recoverMediaError\(\)/);
  assert.match(html, /\}, 30000\);/);
});

test("transient network retry count and recovery timer reset only on actual playing events", () => {
  assert.match(html, /onVideo\('playing',[\s\S]*?_netRetries = 0;[\s\S]*?_ladder = 0;[\s\S]*?_lastProgress = Date\.now\(\)/);
});
