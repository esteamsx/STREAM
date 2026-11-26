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
  assert.match(html, /capLevelToPlayerSize:\s*true/);
  assert.match(html, /maxBufferLength:\s*45/);
  assert.match(html, /maxMaxBufferLength:\s*90/);
  assert.match(html, /backBufferLength:\s*30/);
});

test("page-level progress watchdog and automatic channel reload ladder are absent", () => {
  assert.doesNotMatch(html, /_pbTimer|_autoReload|checkProgress|_lastProgress|_lastT|_ladder/);
  assert.match(html, /\}, 30000\);/);
});

test("HLS network recovery state resets only after actual playback resumes", () => {
  assert.match(html, /hls\.on\(HlsPlayer\.Events\.ERROR/);
  assert.match(html, /onVideo\('playing',[\s\S]*?_netRetries = 0;[\s\S]*?setStatus\('Playing'/);
});

test("page boot animation does not leave a permanent filter on the body", () => {
  assert.match(html, /animation:bootFlicker \.9s var\(--ease\) backwards;/);
  assert.doesNotMatch(html, /animation:bootFlicker[^;]*\bboth\b/);
});

test("channel buttons carry no backdrop-filter and media buttons blur only while controls are visible", () => {
  const chBtnRules = html.match(/\.ch-btn(?::hover|\.active)?\{[^}]*\}/g) || [];
  assert.ok(chBtnRules.length > 0);
  for (const rule of chBtnRules) assert.doesNotMatch(rule, /backdrop-filter/);
  const mcBtn = html.match(/\n\.mc-btn\{[^}]*\}/)[0];
  assert.doesNotMatch(mcBtn, /backdrop-filter/);
  assert.match(html, /\.video-wrap\.controls-visible \.mc-btn\{backdrop-filter:blur\(8px\)\}/);
});
