import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const downloader = readFileSync(new URL("../services/youtube-downloader.js", import.meta.url), "utf8");
const capcut = readFileSync(new URL("../services/capcut.js", import.meta.url), "utf8");
const song = readFileSync(new URL("../services/song.js", import.meta.url), "utf8");
const route = readFileSync(new URL("../routes/dev-api.js", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../services/download-proxy.js", import.meta.url), "utf8");
const avMux = readFileSync(new URL("../services/av-mux.js", import.meta.url), "utf8");

test("MP3 and MP4 downloads use the Emmy API providers without changing their adapter contract", () => {
  assert.match(downloader, /emmyGet\(endpoint/);
  assert.match(downloader, /endpoint: "savetube"/);
  assert.match(downloader, /endpoint: "ytshortdown"/);
  assert.match(downloader, /async function runDirectYoutubeFallback/);
  assert.match(downloader, /audioUrl: result\.download/);
  assert.match(downloader, /videoUrl: result\.download/);
  assert.doesNotMatch(downloader, /silvatech|media\.savetube\.vip/i);
  assert.match(song, /audioFallbackUrl: result\.directAudioUrl \|\| null/);
  assert.match(route, /audioFallbackUrl: song\.audioFallbackUrl \|\| null/);
  assert.match(route, /"\/api\/v1\/dev\/mp3"/);
  assert.match(route, /"\/api\/v1\/dev\/mp4"/);
  assert.match(capcut, /BASE_URL.*snapvideotools\.com/);
  assert.match(capcut, /BASE_URL}\/id\/api\/snap/);
  assert.match(route, /"\/api\/v1\/dev\/capcut"/);
  assert.match(proxy, /!upstream\.headers\.get\("content-length"\)/);
  assert.match(proxy, /transcodeRemoteAudioToMp3\(payload\.audioFallbackUrl\)/);
  assert.match(proxy, /res\.set\("Content-Length", String\(out\.length\)\)/);
  assert.ok(proxy.indexOf("transcodeRemoteAudioToMp3(payload.audioFallbackUrl)") < proxy.indexOf("if (!upstream.ok && upstream.status !== 416)"));
  assert.match(avMux, /audioCodec\("libmp3lame"\)/);
  assert.match(avMux, /if \(!output\.length\) throw new Error\("FFmpeg produced an empty MP3\."\)/);
});
