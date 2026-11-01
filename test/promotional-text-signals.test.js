import test from "node:test";
import assert from "node:assert/strict";
import { isFollowSitePromotion, isFollowSiteRuleBlock, legacyTextLooksPromotional } from "../services/promotional-text-signals.js";

test("direct requests to follow a site are classified for restricted-view handling", () => {
  const text = "Give me one reason why you won't follow this site";
  assert.equal(isFollowSitePromotion(text), true);
  assert.equal(legacyTextLooksPromotional(text), false);
});

test("site-follow promotion detection covers common destinations", () => {
  for (const text of ["Follow our website", "Follow my page", "Follow the channel", "Follow this profile"]) {
    assert.equal(isFollowSitePromotion(text), true, text);
  }
});

test("ordinary discussion about following people is not classified by the new signal", () => {
  for (const text of ["Why should I follow this person?", "I follow a few creators", "How do I follow a conversation?"]) {
    assert.equal(isFollowSitePromotion(text), false, text);
  }
});

test("only the previous automated follow-site block is treated as a restricted promotion", () => {
  const post = {
    text: "Give me one reason why you won't follow this site",
    moderationStatus: "blocked",
    moderationReasons: ["post text asks users to follow a site or account"],
  };
  assert.equal(isFollowSiteRuleBlock(post), true);
  assert.equal(isFollowSiteRuleBlock({ ...post, moderationReviewedAt: Date.now() }), false);
  assert.equal(isFollowSiteRuleBlock({ ...post, moderationReasons: ["Contains an unrelated prohibited signal"] }), false);
});
