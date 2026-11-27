import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url);
const worker = fs.readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const offlinePage = fs.readFileSync(new URL("../public/offline.html", import.meta.url), "utf8");
const registration = fs.readFileSync(new URL("../public/offline-register.js", import.meta.url), "utf8");
const site = fs.readFileSync(new URL("../config/site.js", import.meta.url), "utf8");
const home = fs.readFileSync(new URL("../views/home.js", import.meta.url), "utf8");

assert.ok(root.pathname.endsWith("/STREAM/"));

test("service worker precaches the custom offline page and branded logo", () => {
  assert.match(worker, /cache\.addAll\(\[OFFLINE_PAGE, OFFLINE_LOGO\]\)/);
  assert.match(worker, /const OFFLINE_PAGE = "\/offline\.html"/);
  assert.match(worker, /const OFFLINE_LOGO = "\/icon-32\.png"/);
});

test("only failed same-origin page navigations use the cached offline response", () => {
  assert.match(worker, /if \(request\.mode !== "navigate"\) return/);
  assert.match(worker, /fetch\(request\)\.catch\(async \(\) =>/);
  assert.match(worker, /cache\.match\(OFFLINE_PAGE\)/);
  assert.match(worker, /if \(url\.origin !== self\.location\.origin\) return/);
  assert.match(worker, /self\.addEventListener\("push"/);
  assert.match(worker, /self\.addEventListener\("notificationclick"/);
});

test("offline page uses the site's logo, glass card, retry link, and reduced-motion rules", () => {
  assert.match(offlinePage, /src="\/icon-32\.png"/);
  assert.match(offlinePage, /backdrop-filter:blur\(26px\)/);
  assert.match(offlinePage, /href="" aria-label="Try loading this page again"/);
  assert.match(offlinePage, /prefers-reduced-motion:reduce/);
  assert.match(offlinePage, /You're offline/);
});

test("shared pages register the worker and the home reload button retains it", () => {
  assert.match(site, /src="\/offline-register\.js" defer/);
  assert.match(registration, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.doesNotMatch(home, /getRegistrations\(\)/);
  assert.doesNotMatch(home, /caches\.delete\(/);
});
