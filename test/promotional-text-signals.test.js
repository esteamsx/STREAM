import test from "node:test";
import assert from "node:assert/strict";
import { analyzePromotionalText, legacyTextLooksPromotional } from "../services/promotional-text-signals.js";

test("direct requests to follow a site are classified as promotional and blocked", () => {
  const text = "Give me one reason why you won't follow this site";
  const result = analyzePromotionalText(text);
  assert.equal(result.score >= 70, true);
  assert.equal(legacyTextLooksPromotional(text), true);
  assert.match(result.reasons.join(" "), /asks users to follow a site or account/);
});

test("site-follow promotion detection covers common destinations", () => {
  for (const text of ["Follow our website", "Follow my page", "Follow the channel", "Follow this profile"]) {
    assert.equal(legacyTextLooksPromotional(text), true, text);
  }
});

test("ordinary discussion about following people is not classified by the new signal", () => {
  for (const text of ["Why should I follow this person?", "I follow a few creators", "How do I follow a conversation?"]) {
    assert.equal(legacyTextLooksPromotional(text), false, text);
  }
});
