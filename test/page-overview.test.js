import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("overview derives page cards from visible shared-menu links and only falls back to the built-in list when no menu exists", () => {
  const motion = read("../public/ios-motion.js");
  const siteUi = read("../public/site-ui.js");
  assert.match(motion, /querySelectorAll\('#esMenuList a\[data-es-href\],#esBottomNav a\[data-es-href\]'\)/);
  assert.match(motion, /if \(anchor\.hidden \|\| anchor\.closest\('\[hidden\]'\)\) return/);
  assert.match(motion, /url\.origin !== window\.location\.origin/);
  assert.match(motion, /seenPaths\[key\]/);
  assert.match(motion, /if \(!pages\.length\) \{\s*OVERVIEW_FALLBACK_PAGES\.forEach/);
  assert.match(motion, /Page overview/);
  assert.match(siteUi, /document\.dispatchEvent\(new Event\("es-site-ui-ready"\)\)/);
  const setup = motion.slice(motion.indexOf("function initPageOverview()"), motion.indexOf("function getDistance"));
  assert.doesNotMatch(setup, /\bfetch\s*\(|collection\s*\(/);
});

test("overview runs on every page and adds nothing to the shared menu list", () => {
  const motion = read("../public/ios-motion.js");
  assert.doesNotMatch(motion, /es-page-overview-launch|menu\.insertBefore|getElementById\('esMenuList'\)/);
  assert.doesNotMatch(motion, /addEventListener\('es-site-ui-ready'/);
  assert.match(motion, /\n  initPageOverview\(\);\n/);
  assert.match(motion, /window\.ESIOSPageOverview = \{ open:/);
});

test("the built-in fallback list covers every page link in the shared menu", () => {
  const motion = read("../public/ios-motion.js");
  const siteUi = read("../public/site-ui.js");
  const fallback = [...motion.slice(motion.indexOf("var OVERVIEW_FALLBACK_PAGES"), motion.indexOf("function initPageOverview()")).matchAll(/href: '([^']+)', label: '([^']+)'/g)].map((m) => [m[1], m[2]]);
  const menuStart = siteUi.indexOf("function esBuildMenu()");
  const menu = siteUi.slice(menuStart, siteUi.indexOf("const admin = item(", menuStart));
  const links = new Map([...siteUi.matchAll(/\{ href: "([^"]+)", label: "([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const expected = new Map();
  for (const m of menu.matchAll(/list\.appendChild\(link\("([^"]+)"\)\)/g)) expected.set(m[1], links.get(m[1]));
  for (const m of menu.matchAll(/item\(\{ href: "([^"]+)", label: "([^"]+)"/g)) expected.set(m[1], m[2]);
  assert.ok(expected.size >= 18, "menu parsing found " + expected.size + " pages");
  assert.deepEqual(new Map(fallback).size, fallback.length);
  for (const [href, label] of expected) {
    assert.ok(fallback.some(([h, l]) => h === href && l === label), "fallback list is missing " + href + " (" + label + ")");
  }
  assert.equal(fallback.length, expected.size);
});

test("overview has a scrollable three-column glass grid with lightweight skeleton-only previews", () => {
  const motion = read("../public/ios-motion.js");
  assert.match(motion, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(motion, /overflow-y:auto;overscroll-behavior:contain/);
  assert.match(motion, /es-overview-preview/);
  assert.match(motion, /es-overview-skeleton/);
  assert.match(motion, /backdrop-filter:blur\(/);
  assert.match(motion, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?#esPageOverview/);
  assert.doesNotMatch(motion, /es-overview-preview[\s\S]{0,240}<img/);
});

test("the home feed's generic scroll marker no longer suppresses the overview pinch", () => {
  const motion = read("../public/ios-motion.js");
  const home = read("../views/home.js");
  const physics = read("../middleware/ios-physics-scroll.js");
  assert.match(home, /class="hm-glass hm-feed-card"/);
  assert.match(physics, /comments\?\|feed\|messages\?/);
  assert.match(motion, /var homeFeed = target\.closest\('\.hm-feed-card'\)/);
  assert.match(motion, /nestedNoSmooth && nestedNoSmooth !== homeFeed/);
  assert.match(motion, /\[data-no-smooth\],\[class\*="feed"\]/);
  assert.match(motion, /\[class\*="comment"\],\[class\*="map"\]/);
});

test("pinch gestures skip interactive and immersive zones; zoom is constrained only while overview is open", () => {
  const motion = read("../public/ios-motion.js");
  assert.match(motion, /function excluded\(target\)[\s\S]*?video,iframe,canvas,input,textarea,select,\[contenteditable\]/);
  const excludedBody = motion.slice(motion.indexOf("function excluded(target)"), motion.indexOf("function touchesWithinOverview"));
  assert.doesNotMatch(excludedBody, /select,button|,a,/);
  assert.match(motion, /function touchesWithinOverview\(touches\)[\s\S]*?overlay\.contains\(touches\[i\]\.target\)/);
  assert.match(motion, /function touchesEnterExcludedSurface\(touches\)[\s\S]*?excluded\(pointTarget\)/);
  assert.match(motion, /document\.elementFromPoint\(touch\.clientX, touch\.clientY\)/);
  assert.doesNotMatch(motion, /card\.setAttribute\('role', 'listitem'\)/);
  assert.match(motion, /OPEN_PINCH_RATIO = 0\.72/);
  assert.match(motion, /CLOSE_PINCH_RATIO = 1\.28/);
  assert.match(motion, /if \(distance < pinch\.distance - 2 && event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(motion, /if \(open && event\.cancelable\) event\.preventDefault\(\)/);
  assert.match(motion, /touch-action:pan-y/);
  assert.match(motion, /\.page-overlay\.show/);
  assert.doesNotMatch(motion, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1|visualViewport\.scale\s*=/i);
});

test("overview navigation uses same-origin menu links and restores the active page on exit", () => {
  const motion = read("../public/ios-motion.js");
  assert.match(motion, /window\.location\.assign\(destination\.href\)/);
  assert.match(motion, /closeOverview\(true\)/);
  assert.match(motion, /event\.key === 'Escape'/);
  assert.match(motion, /if \(event\.target === overlay\) closeOverview\(false\)/);
  assert.match(motion, /aria-current', 'page'/);
  assert.match(motion, /focusBeforeOpen/);
});
