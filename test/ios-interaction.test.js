import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { enhanceIosPhysicsPage } from "../middleware/ios-physics-scroll.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

function rewrite(html) {
  let output = "";
  const req = {};
  const res = { statusCode: 200, send(body) { output = body; return res; } };
  enhanceIosPhysicsPage(req, res, () => {});
  res.send(html);
  return output;
}

test("global scroll middleware adds the physics script without duplicating motion script already in head", () => {
  const html = rewrite('<!doctype html><html><head><script src="/ios-motion.js" defer></script></head><body><main>Page</main></body></html>');
  assert.equal((html.match(/src="\/ios-motion\.js"/g) || []).length, 1);
  assert.equal((html.match(/src="\/ios-physics-scroll\.js"/g) || []).length, 1);
});

test("global scroll middleware preserves existing script references and still marks page surfaces", () => {
  const html = rewrite('<!doctype html><html><body><main><video></video></main><script src="/ios-motion.js"></script><script src="/ios-physics-scroll.js"></script></body></html>');
  assert.equal((html.match(/src="\/ios-motion\.js"/g) || []).length, 1);
  assert.equal((html.match(/src="\/ios-physics-scroll\.js"/g) || []).length, 1);
  assert.match(html, /<main data-ios-rubber>/);
  assert.match(html, /<video data-no-smooth>/);
});

test("shared motion has one guarded, optional, reduced-motion-aware haptic tap delegate", () => {
  const motion = read("../public/ios-motion.js");
  assert.match(motion, /if \(window\.__ESIOSMotion\) return/);
  assert.match(motion, /typeof navigator\.vibrate !== 'function'/);
  assert.match(motion, /if \(reduceMotion/);
  assert.match(motion, /document\.addEventListener\('click',[\s\S]*?event\.isTrusted[\s\S]*?window\.ESIOSFeedback\.tap\(\)/);
  assert.match(motion, /\[data-no-haptic\]/);
  assert.match(motion, /55\) return false/);
});

test("pull-to-refresh is distance-based, releases to refresh, and cancels interrupted gestures", () => {
  const motion = read("../public/ios-motion.js");
  assert.match(motion, /var PULL_REFRESH_PX = 112/);
  assert.match(motion, /pullLabel\.textContent = 'Release to refresh'/);
  assert.match(motion, /document\.addEventListener\('touchend',[\s\S]*?if \(pullComplete\)[\s\S]*?window\.location\.reload\(\)/);
  assert.match(motion, /document\.addEventListener\('touchcancel',[\s\S]*?resetPull\(\)/);
  assert.doesNotMatch(motion, /PULL_HOLD_MS|Hold to refresh/);
});

test("status-panel swipes skip game/media surfaces and only close from inside the panel", () => {
  const status = read("../public/status-ui.js");
  assert.match(status, /startTarget = e\.target/);
  assert.match(status, /video,iframe,canvas,\[data-no-status-swipe\]/);
  assert.match(status, /state\.panel\.contains\(start\)/);
  assert.match(status, /document\.addEventListener\("touchcancel"/);
  assert.match(status, /@media\(prefers-reduced-motion:reduce\).*?animation:none!important/);
});

test("success/error outcome haptics use existing message presenters only", () => {
  const channelReact = read("../views/channel-react.js");
  const liveTv = read("../views/live-tv.js");
  const account = read("../views/account.js");
  assert.match(channelReact, /window\.ESIOSFeedback\.result\(kind === 'ok' \? 'success' : 'error'\)/);
  assert.match(liveTv, /window\.ESIOSFeedback\.result\(kind\)/);
  assert.match(account, /window\.ESIOSFeedback\.result\(ok \? 'success' : 'error'\)/);
});

test("dialog transitions are progressive and reduced-motion-aware while page transitions remain CSS-native", () => {
  const site = read("../config/site.js");
  const motion = read("../public/ios-motion.js");
  assert.match(site, /@supports \(transition-behavior:allow-discrete\)/);
  assert.match(site, /@starting-style/);
  assert.match(site, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?transition:none!important/);
  assert.match(motion, /@view-transition\{navigation:auto;\}/);
  assert.match(motion, /@media\(prefers-reduced-motion:reduce\)/);
});
