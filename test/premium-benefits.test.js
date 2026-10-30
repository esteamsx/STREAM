import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { channelCoinCost, dailyCoinClaimAmount, nextVerificationExpiry } from "../services/coin-pricing.js";
import { VERIFICATION_PRICE_NGN, VERIFICATION_ROLLOVER_PRICE_NGN } from "../services/paystack.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("free and Premium channel charges use the exact requested coin amounts", () => {
  assert.equal(channelCoinCost("react", false), 8);
  assert.equal(channelCoinCost("poll", false), 10);
  assert.equal(channelCoinCost("react", true), 5);
  assert.equal(channelCoinCost("poll", true), 5);
});

test("daily coin claims award one free, three Premium, and preserve the five-coin admin reward", () => {
  assert.equal(dailyCoinClaimAmount(), 1);
  assert.equal(dailyCoinClaimAmount({ isPremium: false }), 1);
  assert.equal(dailyCoinClaimAmount({ isPremium: true }), 3);
  assert.equal(dailyCoinClaimAmount({ isAdmin: true }), 5);
  assert.equal(dailyCoinClaimAmount({ isAdmin: true, isPremium: true }), 5);

  const auth = source("../services/auth.js");
  assert.match(auth, /amount = dailyCoinClaimAmount\(\{ isAdmin, isPremium: isVerificationActive\(data\) \}\)/);
  assert.match(auth, /appendCoinLedger\(tx, ref, data, amount, "daily_claim"/);
  assert.match(auth, /coinBalance: admin\.firestore\.FieldValue\.increment\(amount\)/);
});

test("active Premium rollover adds 30 days to the existing expiry; inactive accounts start from now", () => {
  const now = 2_000_000_000_000;
  const day = 24 * 60 * 60 * 1000;
  assert.equal(nextVerificationExpiry(now + 10 * day, now, 30, true), now + 40 * day);
  assert.equal(nextVerificationExpiry(now + 10 * day, now, 30, false), now + 30 * day);
  assert.equal(nextVerificationExpiry(now - day, now, 30, true), now + 30 * day);

  const auth = source("../services/auth.js");
  assert.match(auth, /async function settlePremiumReferralPayment\([\s\S]*?db\.runTransaction\(async \(tx\) =>/);
  assert.match(auth, /nextVerificationExpiry\(user\.verifiedExpiresAt, now, PAID_VERIFICATION_DAYS, isVerificationActive\(user\)\)/);
});

test("new verification is ₦4,800 and active-member rollover is ₦3,990, server-selected", () => {
  assert.equal(VERIFICATION_PRICE_NGN, 4800);
  assert.equal(VERIFICATION_ROLLOVER_PRICE_NGN, 3990);
  const payments = source("../routes/payments.js");
  const auth = source("../services/auth.js");
  assert.match(payments, /const profile = req\.userProfile/);
  assert.match(auth, /FRESH_PROFILE_PATHS = new Set\(\["\/api\/verification\/initialize"\]\)/);
  assert.match(auth, /const profileMaxAge = FRESH_PROFILE_PATHS\.has\(req\.path\) \? 0/);
  assert.match(auth, /const profile = await getUserProfile\(uid, profileMaxAge\)/);
  assert.match(payments, /const rollover = isVerificationActive\(profile\)/);
  assert.match(payments, /const priceNgn = rollover \? VERIFICATION_ROLLOVER_PRICE_NGN : VERIFICATION_PRICE_NGN/);
  assert.match(payments, /createVerificationPayment\(req\.uid, data\.reference, amountKobo, rollover\)/);
  assert.match(auth, /priceNgn: \(\) => VERIFICATION_ROLLOVER_PRICE_NGN/);
  assert.match(payments, /rolledOver: !!result\.rollover/);
  assert.match(source("../views/account.js"), /result\.rolledOver \? 'Premium Extended' : 'You are now Verified'/);
});

test("rollover explanation is tucked behind the existing Learn more disclosure", () => {
  const account = source("../views/account.js");
  assert.match(account, /<details class="verify-rollover-more">\s*<summary>Learn more<\/summary>\s*<div class="rw-hint" id="verifyRolloverHint"/);
  assert.match(account, /\.verify-rollover-more>summary\{cursor:pointer;color:var\(--accent\);font-weight:600\}/);
  assert.doesNotMatch(account, /verify-rollover-more>summary\{[^}]*list-style:none/);
  assert.match(account, /document\.getElementById\('verifyRolloverHint'\)\.textContent = rollover/);
});

test("free users see Premium benefits; CTA opens Account and auto-opens the verification overlay", () => {
  const view = source("../views/channel-react.js");
  const route = source("../routes/channel-tools.js");
  const account = source("../views/account.js");
  const pageBenefits = view.slice(view.indexOf('<div class="cr-premium-overlay"'), view.indexOf('<div class="cr-verify-overlay"'));
  assert.match(view, /PREMIUM BENEFITS/);
  assert.match(view, /5 coins instead of 8/);
  assert.match(view, /5 coins instead of 10/);
  assert.match(pageBenefits, /Unlimited channel reactions and poll votes/);
  assert.equal([...pageBenefits.matchAll(/class="cr-premium-benefit"/g)].length, 3);
  assert.doesNotMatch(pageBenefits, /daily coins|Verified badge|15% off/);
  assert.match(view, /\.cr-premium-overlay\{[^}]*background:rgba\(10,10,15,\.75\);backdrop-filter:blur\(8px\)/);
  assert.match(view, /\.cr-premium-card\{[^}]*rgba\(255,255,255,\.06\)/);
  assert.match(view, /\.cr-premium-kicker\{[^}]*color:var\(--accent\)/);
  assert.match(view, /\.cr-premium-cta\{[^}]*linear-gradient\(100deg,var\(--accent\),#4b78ff\)/);
  assert.match(view, /class="cr-premium-check" viewBox="0 0 24 24"/);
  assert.doesNotMatch(view, /<span class="cr-premium-check">/);
  assert.match(view, /href="\/account\?premium=1"/);
  assert.match(route, /isPremium: !!\(profile && isVerificationActive\(profile\)\)/);
  assert.match(view, /if \(!data\.isPremium && !data\.isAdmin\)/);
  assert.match(account, /get\('premium'\) === '1'/);
  assert.match(account, /id="getVerifiedLabel">Get Verified<\/span>/);
  assert.match(account, /rollover \? 'ROLL OVER' : 'Get Verified'/);
  assert.match(account, /id="verifyPriceLabel" data-new-price="\$\{VERIFICATION_PRICE_NGN\}" data-rollover-price="\$\{VERIFICATION_ROLLOVER_PRICE_NGN\}"/);
  assert.match(account, /class="overlay-sub"[^>]*>What You Get\?<\/div>/);
  assert.match(account, /#verifyOverlay \.verify-icon-wrap\{width:64px;height:64px/);
  assert.match(account, /#verifyOverlay \.verify-icon-wrap svg\{width:36px;height:36px/);
});

test("channel popup reuses the authenticated config response without another profile request or poll", () => {
  const view = source("../views/channel-react.js");
  const route = source("../routes/channel-tools.js");
  const configRoute = route.slice(route.indexOf('router.get("/api/wa/config"'), route.indexOf("/* ---- the channel's name"));
  const loadStart = view.indexOf("async function loadStatus()");
  const statusLoad = view.slice(loadStart, view.indexOf("document.querySelectorAll('.cr-tab')", loadStart));
  const verifyOpen = view.slice(view.indexOf("function openCrVerifyOverlay()"), view.indexOf("function closePremiumBenefits()"));
  assert.match(configRoute, /const profile = req\.userProfile/);
  assert.doesNotMatch(configRoute, /getUserProfile\(/);
  assert.equal((statusLoad.match(/getJSON\('\/api\/wa\/config'\)/g) || []).length, 1);
  assert.doesNotMatch(verifyOpen, /getJSON\('\/api\/profile'\)/);
  assert.match(statusLoad, /if \(!data\.isPremium && !data\.isAdmin\)/);

  const auth = source("../services/auth.js");
  const claim = auth.slice(auth.indexOf("async function claimDailyCoins"), auth.indexOf("const CHANNEL_REACT_COIN_COST"));
  assert.match(claim, /if \(DAILY_CLAIM_FEE_NGN > 0\) \{\s*const pre = await getUserProfile\(uid\)/);
  assert.equal((claim.match(/tx\.get\(ref\)/g) || []).length, 1);
});
