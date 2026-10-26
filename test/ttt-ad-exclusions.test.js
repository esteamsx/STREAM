import test from "node:test";
import assert from "node:assert/strict";
import { injectPromoSlot } from "../middleware/promo-slot.js";
import { readFileSync } from "node:fs";

const client = readFileSync(new URL("../public/tictactoe/ttt-page.js", import.meta.url), "utf8");
const sponsor = readFileSync(new URL("../public/sponsor.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/tictactoe/ttt.css", import.meta.url), "utf8");

function render(path) {
  const res = {
    statusCode: 200,
    locals: {},
    body: "",
    getHeader(name) { return name === "Content-Type" ? "text/html; charset=utf-8" : ""; },
    send(body) { this.body = body; return this; },
  };
  let nextCalled = false;
  injectPromoSlot({ method: "GET", path }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  res.send("<!doctype html><html><head></head><body></body></html>");
  return res.body;
}

test("TTT guest invite pages receive no sponsor, social, popunder, or native-banner scripts", () => {
  const html = render("/tictactoe/guest/abc123XYZ_09");
  for (const adScript of ["sponsor.js", "social-bar.js", "popunder.js", "native-banner.js"]) {
    assert.doesNotMatch(html, new RegExp(adScript.replaceAll(".", "\\.")));
  }
  assert.doesNotMatch(html, /chess-presence\.js/);
});

test("TTT active matches pause sponsor cards and home ad placements remain unchanged", () => {
  const memberPage = render("/tictactoe");
  assert.match(memberPage, /sponsor\.js/);
  assert.match(memberPage, /chess-presence\.js/);
  assert.doesNotMatch(memberPage, /social-bar\.js|popunder\.js|native-banner\.js/);
  assert.match(client, /setTttGameAdState\(true\)/);
  assert.match(client, /setTttGameAdState\(false\)/);
  assert.match(client, /window\.dispatchEvent\(new Event\("es-game-session-change"\)\)/);
  assert.match(sponsor, /if \(stopped \|\| tttGameActive\(\)\)/);
  assert.match(sponsor, /if \(tttGameActive\(\)\) teardown\(\)/);
  assert.match(css, /\.tx-game-active \.pn-card\{display:none!important\}/);

  const homePage = render("/");
  assert.match(homePage, /sponsor\.js/);
  assert.match(homePage, /social-bar\.js/);
  assert.match(homePage, /popunder\.js/);
  assert.match(homePage, /native-banner\.js/);
});
