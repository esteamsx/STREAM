import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  isFirstPremiumPayment,
  planPremiumReferralAwards,
} from "../services/premium-referral-rewards.js";
import { renderAccount } from "../views/account.js";

const auth = readFileSync(new URL("../services/auth.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");
const rewardsRoute = readFileSync(new URL("../routes/rewards.js", import.meta.url), "utf8");
const indexes = JSON.parse(readFileSync(new URL("../firestore.indexes.json", import.meta.url), "utf8"));

test("first Premium payment awards ₦350, ₦150, and ₦50 through at most three eligible generations", () => {
  const awards = planPremiumReferralAwards([
    { uid: "direct", eligible: true },
    { uid: "upstream-2", eligible: true },
    { uid: "upstream-3", eligible: true },
    { uid: "upstream-4", eligible: true },
  ], true);
  assert.deepEqual(awards.map(({ uid, generation, rewardType, amountNgn }) => ({ uid, generation, rewardType, amountNgn })), [
    { uid: "direct", generation: 1, rewardType: "cash", amountNgn: 350 },
    { uid: "upstream-2", generation: 2, rewardType: "cash", amountNgn: 150 },
    { uid: "upstream-3", generation: 3, rewardType: "cash", amountNgn: 50 },
  ]);
});

test("ineligible referrers are skipped independently at every generation", () => {
  const awards = planPremiumReferralAwards([
    { uid: "direct", eligible: false },
    { uid: "upstream-2", eligible: true },
    { uid: "upstream-3", eligible: false },
  ], true);
  assert.deepEqual(awards.map((award) => [award.uid, award.rewardType, award.amountNgn, award.reason]), [
    ["direct", "none", 0, "referrer_not_active_premium"],
    ["upstream-2", "cash", 150, "first_successful_premium_payment"],
    ["upstream-3", "none", 0, "referrer_not_active_premium"],
  ]);
});

test("subsequent payments award only five coins to an eligible direct referrer", () => {
  const awards = planPremiumReferralAwards([
    { uid: "direct", eligible: true },
    { uid: "upstream-2", eligible: true },
    { uid: "upstream-3", eligible: true },
  ], false);
  assert.deepEqual(awards.map((award) => [award.rewardType, award.amountNgn, award.coins]), [
    ["coins", 0, 5],
    ["none", 0, 0],
    ["none", 0, 0],
  ]);
});

test("first-payment classification excludes markers, prior payments, and forced renewals", () => {
  assert.equal(isFirstPremiumPayment(), true);
  assert.equal(isFirstPremiumPayment({ hasFirstPaymentMarker: true }), false);
  assert.equal(isFirstPremiumPayment({ verifiedVia: "payment" }), false);
  assert.equal(isFirstPremiumPayment({ hasPriorSuccessfulPayment: true }), false);
  assert.equal(isFirstPremiumPayment({ forceRenewal: true }), false);
});

test("Premium reward settlement is transactionally deduplicated and tracks legacy payment history", () => {
  assert.match(auth, /collection\("premiumReferralRewards"\)\.doc\(eventId\)/);
  assert.match(auth, /where\("uid", "==", uid\)[\s\S]*where\("status", "==", "success"\)[\s\S]*\.limit\(1\)/);
  assert.match(auth, /tx\.get\(eventRef\)/);
  assert.match(auth, /if \(eventSnap\.exists\)/);
  assert.match(auth, /status: "success", confirmedAt: now, referralRewardsProcessedAt: now/);
  assert.match(auth, /premiumFirstPaymentAt: markerAt/);
  assert.match(auth, /eligible: isVerificationActive\(data\)/);
  assert.match(auth, /tx\.update\(ancestor\.ref, \{ nairaBalance: admin\.firestore\.FieldValue\.increment\(planned\.amountNgn\) \}\)/);
  assert.match(auth, /appendCoinLedger\(tx, ancestor\.ref, ancestor\.data, planned\.coins, "premium_referral_renewal"/);
  assert.match(auth, /eventKey: `auto-renew:verification:\$\{uid\}:\$\{claimed\.expiresAt\}`/);
  assert.match(auth, /forceRenewal: true/);
  assert.match(auth, /creditReferralCommission\(record\.uid, record\.amountKobo \/ 100, "account verification"\)/);
  assert.match(auth, /creditReferralCommission\(uid, priceNgn, config\.commissionLabel\)/);
});

test("cash prize uses the existing notification collection and Account VIEW action", () => {
  assert.match(auth, /type: "premium_referral_cash"/);
  assert.match(auth, /You've received a cash prize of ₦\$\{planned\.amountNgn\}!/);
  assert.match(account, /n\.type === 'premium_referral_cash'/);
  assert.match(account, /n\.type === 'premium_referral_cash' \? 'VIEW'/);
});

test("withdrawal minimum is ₦3,500 in the server summary, backend enforcement, and Account UI", () => {
  assert.match(auth, /const MIN_WITHDRAWAL_NGN = 3500/);
  assert.match(auth, /if \(amount < MIN_WITHDRAWAL_NGN\)/);
  assert.match(rewardsRoute, /minWithdrawalNgn: MIN_WITHDRAWAL_NGN/);
  assert.match(account, /placeholder="3500" min="3500"/);
  assert.match(account, /Number\(rewardsSummary && rewardsSummary\.minWithdrawalNgn\) \|\| 3500/);
  assert.match(account, /Minimum withdrawal is ' \+ fmtNgn\(minimumWithdrawalNgn\)/);
});

test("bounded prior-payment lookup has its composite index", () => {
  assert.ok(indexes.indexes.some((index) => index.collectionGroup === "verificationPayments" &&
    index.fields.some((field) => field.fieldPath === "uid") &&
    index.fields.some((field) => field.fieldPath === "status")));
});

test("all rendered Account inline scripts compile for the browser", () => {
  const html = renderAccount({});
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0);
  scripts.forEach((match, index) => {
    new vm.Script(match[1], { filename: `account-inline-${index + 1}.js` });
  });
});
