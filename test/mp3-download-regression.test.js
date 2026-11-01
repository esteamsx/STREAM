import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const silvatech = readFileSync(new URL("../services/silvatech.js", import.meta.url), "utf8");
const song = readFileSync(new URL("../services/song.js", import.meta.url), "utf8");
const route = readFileSync(new URL("../routes/dev-api.js", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../services/download-proxy.js", import.meta.url), "utf8");
const avMux = readFileSync(new URL("../services/av-mux.js", import.meta.url), "utf8");

test("MP3 downloads preserve a direct audio fallback and normalize chunked provider streams", () => {
  assert.match(silvatech, /directAudioUrl: result\.direct_audio_url \|\| null/);
  assert.match(song, /audioFallbackUrl: result\.directAudioUrl \|\| null/);
  assert.match(route, /audioFallbackUrl: song\.audioFallbackUrl \|\| null/);
  assert.match(proxy, /!upstream\.headers\.get\("content-length"\)/);
  assert.match(proxy, /transcodeRemoteAudioToMp3\(payload\.audioFallbackUrl\)/);
  assert.match(proxy, /res\.set\("Content-Length", String\(out\.length\)\)/);
  assert.match(avMux, /audioCodec\("libmp3lame"\)/);
  assert.match(avMux, /if \(!output\.length\) throw new Error\("FFmpeg produced an empty MP3\."\)/);
});
