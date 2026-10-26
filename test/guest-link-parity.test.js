import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

function loadShareFunction(source, name) {
  const match = source.match(new RegExp(`async function ${name}\\(url, fresh\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} exists`);
  return match[0];
}

for (const game of [
  {
    name: "Ludo",
    slug: "ludo",
    file: "../public/ludo/ludo-page.js",
    shareFunction: "shareLink",
    panel: null,
    heading: "invited you to play Ludo",
    joinId: "cxGuestJoin",
    view: "../views/ludo.js",
    guestPath: "/ludo/guest/:token",
    initCall: /await api\("\/api\/ludo\/guest\/info\//,
    entryPoint: /if \(GUEST_TOKEN\) \{ initGuest\(\); return; \}/,
  },
  {
    name: "Snakes and Ladders",
    slug: "snakes",
    file: "../public/snakes/snakes-page.js",
    shareFunction: "shareSnakesLink",
    panel: ["card.appendChild(watchBox());", "card.appendChild(guestLinkBox());"],
    heading: "invited you to play Snakes and Ladders",
    joinId: "sxGuestJoin",
    view: "../views/snakes.js",
    guestPath: "/snakes/guest/:token",
    initCall: /await refreshGuestInfo\(\)/,
    entryPoint: /if \(GUEST_TOKEN\) \{ initGuest\(\); return; \}/,
  },
  {
    name: "Whot",
    slug: "whot",
    file: "../public/whot/whot-page.js",
    shareFunction: "shareLink",
    panel: ["card.appendChild(watchBox());", "card.appendChild(guestBox());"],
    heading: "invited you to play Whot",
    joinId: "cxGuestJoin",
    view: "../views/whot.js",
    guestPath: "/whot/guest/:token",
    initCall: /await refreshGuestInfo\(\)/,
    entryPoint: /if \(GUEST_TOKEN\) \{ initGuest\(\); \} else \{/,
  },
  {
    name: "Tic-Tac-Toe",
    slug: "tictactoe",
    file: "../public/tictactoe/ttt-page.js",
    shareFunction: "shareTttLink",
    panel: ["card.appendChild(watchBox());", "card.appendChild(guestLinkBox());"],
    heading: "invited you to play Tic-Tac-Toe",
    joinId: "cxGuestJoin",
    view: "../views/tictactoe.js",
    guestPath: "/tictactoe/guest/:token",
    initCall: /await refreshGuestInfo\(\)/,
    entryPoint: /if \(GUEST_TOKEN\) \{ initGuest\(\); return; \}/,
    photoAssertion: /img\.src = p\.photo/,
  },
]) {
  const source = read(game.file);

  test(`${game.name} guest link creation copies directly instead of opening share first`, async () => {
    const calls = { share: 0, copy: [], toast: [], prompt: [] };
    const context = {
      navigator: {
        share: async () => { calls.share++; },
        clipboard: { writeText: async (url) => { calls.copy.push(url); } },
      },
      toast: (message) => calls.toast.push(message),
      window: { prompt: (...args) => calls.prompt.push(args) },
    };
    const share = vm.runInNewContext(`(${loadShareFunction(source, game.shareFunction)})`, context);
    await share("https://example.test/invite", true);
    assert.equal(calls.share, 0);
    assert.deepEqual(calls.copy, ["https://example.test/invite"]);
    assert.match(calls.toast[0], /copied/i);
  });

  test(`${game.name} existing guest links still use the native share sheet when available`, async () => {
    const calls = { share: 0, copy: [] };
    const context = {
      navigator: {
        share: async () => { calls.share++; },
        clipboard: { writeText: async (url) => { calls.copy.push(url); } },
      },
      toast() {},
      window: { prompt() {} },
    };
    const share = vm.runInNewContext(`(${loadShareFunction(source, game.shareFunction)})`, context);
    await share("https://example.test/invite", false);
    assert.equal(calls.share, 1);
    assert.deepEqual(calls.copy, []);
  });

  test(`${game.name} public invite resolves to a name prompt and Join game action`, () => {
    const view = read(game.view);
    const server = read("../server.js");
    assert.match(view, /id="cxGuest" class="cx-menu" hidden/);
    assert.ok(server.includes(`"${game.guestPath}"`), "public invitation route is registered");
    assert.ok(source.includes(`const GUEST_MATCH = /^\\/${game.slug}\\/guest\\/`), "guest token is parsed from the invite URL");
    assert.ok(source.includes(game.heading));
    assert.match(source, /id: "cxGuestName"[\s\S]*placeholder: "Your name"/);
    assert.match(source, new RegExp(`id: "${game.joinId}"[\\s\\S]*\\["Join game"\\]`));
    if (game.photoAssertion) assert.match(source, game.photoAssertion);
    else {
      assert.match(source, /function photoSrc\(url\)/);
      assert.match(source, /img\.src = photoSrc\(p\.photo\)/);
    }
    assert.match(source, game.entryPoint);
    const initGuest = source.match(/async function initGuest\(\) \{[\s\S]*?\n\}/);
    assert.ok(initGuest, "guest initialization exists");
    assert.match(initGuest[0], game.initCall, "guest initialization loads invitation info");
  });

  test(`${game.name} expired guest CTA uses the Chess arrow-out icon without underline`, () => {
    const ended = source.match(/function (?:endedCard|guestEndedCard)\(title, text\) \{[\s\S]*?\n\}/);
    assert.ok(ended, "expired/finished guest card exists");
    assert.match(source, /const GUEST_CREATE_GAME_ICON = '[^']*M10 14L21 3[^']*';/);
    assert.match(ended[0], /style: "text-decoration:none"/);
    assert.match(ended[0], /btn\.innerHTML = 'CREATE GAME <span class="ico" aria-hidden="true">' \+ GUEST_CREATE_GAME_ICON/);
    assert.match(ended[0], new RegExp(`location\\.href = "/${game.slug}"`));
    assert.doesNotMatch(ended[0], /h\("a"/);
    if (game.slug === "whot") assert.match(source, /info\.status === "finished"\) \{ root\.appendChild\(endedCard\(/);
  });

  if (game.panel) {
    test(`${game.name} Watch a game stays above Play with a guest`, () => {
      const start = source.indexOf("function renderOnlinePanel");
      const watch = source.indexOf(game.panel[0], start);
      const guest = source.indexOf(game.panel[1], start);
      assert.ok(watch >= 0 && guest > watch);
    });
  }
}
