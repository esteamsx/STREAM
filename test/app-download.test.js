import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderHome } from "../views/home.js";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");

test("main page exposes the ES TEAMS TV APK download beside notifications", () => {
  const html = renderHome({ DOMAIN_LOCK_SCRIPT: "", siteHeadFor: () => "" });
  assert.match(html, /id="hmBell"/);
  assert.match(html, /id="hmAppDownload" href="\/ES%20TEAMS%20TV\.apk" download="ES TEAMS TV\.apk"/);
  assert.match(html, /M12 3v12m0 0 5-5m-5 5-5-5M5 21h14/);
  assert.match(serverSource, /const APP_APK_PATH = path\.join\(__dirname, "ES TEAMS TV\.apk"\)/);
  assert.match(serverSource, /app\.get\(\/\^\\\/ES\(\?:%20\| \)TEAMS\(\?:%20\| \)TV\\\.apk\$\/i/);
  assert.match(serverSource, /res\.download\(APP_APK_PATH, "ES TEAMS TV\.apk"/);
});
