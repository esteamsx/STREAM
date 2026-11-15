import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { injectPromoSlot } from "../middleware/promo-slot.js";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const sponsor = read("public/sponsor.js");
const socialBar = read("public/social-bar.js");
const nativeBanner = read("public/native-banner.js");
const popunder = read("public/popunder.js");
const adScripts = ["sponsor.js", "social-bar.js", "popunder.js", "native-banner.js"];
const gameRoutes = [
  "/chess", "/chess/guest/invite",
  "/ludo", "/ludo/guest/invite",
  "/whot", "/whot/guest/invite",
  "/snakes", "/snakes/guest/invite",
  "/tictactoe", "/tictactoe/guest/invite",
];

function render(path, noAds = false) {
  const res = {
    statusCode: 200,
    locals: { noAds },
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

function assertNoAds(html, context) {
  for (const adScript of adScripts) {
    assert.doesNotMatch(html, new RegExp(adScript.replaceAll(".", "\\.")), `${context} must not load ${adScript}`);
  }
}

test("every game and guest-invite route receives no sponsor, social, popunder, or native-banner script", () => {
  for (const path of gameRoutes) assertNoAds(render(path), path);
  assert.match(socialBar, /(?:chess\|ludo\|whot\|snakes\|tictactoe)/);
  assert.match(sponsor, /(?:chess\|ludo\|whot\|snakes\|tictactoe)/);
  assert.match(nativeBanner, /tictactoe/);
  assert.match(popunder, /\^\\\/tictactoe\(\\\/\|\$\)/);
});

test("no-ads responses suppress every injected ad script while eligible home placements remain intact", () => {
  assertNoAds(render("/", true), "a no-ads response");

  const guestHome = render("/");
  for (const adScript of adScripts) assert.match(guestHome, new RegExp(adScript.replaceAll(".", "\\.")));
});

test("the sponsor popup waits for confirmed guest or unverified status and fails closed", () => {
  assert.match(sponsor, /\/api\/ads\/eligibility/);
  assert.match(sponsor, /eligibility\.status !== "guest"/);
  assert.match(sponsor, /eligibility\.status !== "unverified"/);
  assert.match(sponsor, /if \(!eligibility \|\|/);
});
