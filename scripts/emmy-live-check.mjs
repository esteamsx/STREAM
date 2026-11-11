import { emmyGet, pickMediaUrl } from "../services/emmy-api.js";

const YT = process.env.TEST_YOUTUBE_URL || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const TT = process.env.TEST_TIKTOK_URL || "https://www.tiktok.com/@scout2015/video/6718335390845095173";
const IG = process.env.TEST_INSTAGRAM_URL || "";
const FB = process.env.TEST_FACEBOOK_URL || "";

const groups = [
  { feature: "MP3 (YouTube)", kind: "audio", input: YT, providers: [
    ["savetube", { url: YT, format: "mp3" }], ["ytshortdown", { url: YT, format: "mp3" }], ["clipto", { url: YT }] ] },
  { feature: "MP4 (YouTube)", kind: "video", input: YT, providers: [
    ["savetube", { url: YT, format: "720" }], ["ytshortdown", { url: YT, format: "720" }], ["clipto", { url: YT }],
    ["ssvid", { url: YT }], ["ytdl-rapidapi", { url: YT }] ] },
  { feature: "TikTok", kind: "video", input: TT, providers: [
    ["savetik", { url: TT }], ["vibetik-tiktokdl", { url: TT }], ["tiktokdl-rapidapi", { url: TT }], ["aio-rapidapi", { url: TT }] ] },
  { feature: "Instagram", kind: "video", input: IG, skip: !IG, providers: [
    ["snapsave", { url: IG }], ["igexport", { url: IG }], ["aio-rapidapi", { url: IG }] ] },
  { feature: "Facebook", kind: "video", input: FB, skip: !FB, providers: [["fbdown", { url: FB }]] },
];

let failed = 0;
for (const group of groups) {
  console.log(`\n== ${group.feature}`);
  if (group.skip) { console.log("   skipped (set TEST_INSTAGRAM_URL / TEST_FACEBOOK_URL to a public post to test)"); continue; }
  let working = 0;
  for (const [endpoint, params] of group.providers) {
    const started = Date.now();
    try {
      const result = await emmyGet(endpoint, params, { timeoutMs: 45000 });
      const link = pickMediaUrl(result, group.kind, group.input);
      const fields = result && typeof result === "object" ? Object.keys(result).slice(0, 8).join(", ") : typeof result;
      console.log(`   ${link ? "OK  " : "WARN"} ${endpoint.padEnd(18)} ${Date.now() - started}ms  fields: ${fields}${link ? "" : "  (no media link recognised)"}`);
      if (link) working += 1;
    } catch (err) {
      console.log(`   FAIL ${endpoint.padEnd(18)} ${Date.now() - started}ms  ${err.message}`);
    }
  }
  if (!working) { failed += 1; console.log("   -> no working provider for this feature"); }
}

console.log(failed ? `\n${failed} feature(s) have no working provider.` : "\nEvery tested feature has at least one working provider.");
process.exit(failed ? 1 : 0);
