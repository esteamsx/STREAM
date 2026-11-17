import test from "node:test";
import assert from "node:assert/strict";
import { renderDevelopersLiveTv } from "../views/developers-live-tv.js";

const html = renderDevelopersLiveTv({});
const liveTvDocs = html.slice(html.indexOf("<h1>Live Tv Apis</h1>"), html.indexOf('<div class="note">'));

test("Live TV API docs describe the site-owned catalog and stream endpoints", () => {
  assert.match(liveTvDocs, /Use the ES TEAMS TV Live TV API/);
  assert.match(liveTvDocs, /GET<\/span> <code>\/api\/v1\/channels<\/code>/);
  assert.match(liveTvDocs, /GET<\/span> <code>\/api\/v1\/stream\/:channel<\/code>/);
  assert.match(liveTvDocs, /"total": 11543/);
  assert.match(liveTvDocs, /"id": "6c00b1b4bbfb06"/);
  assert.match(liveTvDocs, /stream_url/);
  assert.match(liveTvDocs, /HLS-compatible player/);
  assert.match(liveTvDocs, /does not need a third-party stream URL or source credential/);
});

test("Live TV docs no longer use stale IDs or claim links are single-use", () => {
  assert.doesNotMatch(liveTvDocs, /nickelodeon|single-use|grouped by category/);
  assert.match(liveTvDocs, /cinexora|\.m3u8|\/api\/hls/i);
  assert.doesNotMatch(liveTvDocs, /embed_url|<iframe|Embed URL|Embed link/i);
});
