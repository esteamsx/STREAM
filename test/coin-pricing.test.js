import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const auth = readFileSync(new URL("../services/auth.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");
const channelTools = readFileSync(new URL("../routes/channel-tools.js", import.meta.url), "utf8");
const payments = readFileSync(new URL("../routes/payments.js", import.meta.url), "utf8");
const rewards = readFileSync(new URL("../routes/rewards.js", import.meta.url), "utf8");
const promote = readFileSync(new URL("../routes/promote.js", import.meta.url), "utf8");

test("coin package, store, reaction, and receiving prices follow the new pricing", () => {
  const expectedPackages = {
    pack25: [25, 550],
    pack50: [50, 1100],
    pack150: [150, 2750],
    pack350: [350, 4950],
    pack500: [500, 6600],
    pack1000: [1000, 11000],
    pack2000: [2000, 18700],
    pack3000: [3000, 28050],
  };
  for (const [key, [coins, priceNgn]] of Object.entries(expectedPackages)) {
    assert.match(auth, new RegExp(`${key}: \\{ coins: ${coins}, priceNgn: ${priceNgn} \\}`));
  }
  assert.match(auth, /boost30: \{ label: "\+30 request limit", coinCost: 90, bonusAmount: 30 \}/);
  assert.match(auth, /boost50: \{ label: "\+50 request limit", coinCost: 180, bonusAmount: 50 \}/);
  assert.match(auth, /boost100: \{ label: "\+100 request limit", coinCost: 360, bonusAmount: 100 \}/);
  assert.match(auth, /verify3d: \{ label: "3-day account verification", coinCost: 495 \}/);
  assert.match(auth, /const CHANNEL_REACT_COIN_COST = 8;/);
  assert.match(channelTools, /const PRICE = \{ react: reactPrice, vote: 10 \}/);
  assert.match(channelTools, /spendCoins\(uid, price, type === "vote" \? "channel-poll" : "channel-react"\)/);
  assert.match(auth, /const PREMIUM_DISCOUNT_RATE = 0\.15;/);
  assert.match(auth, /function discountedCashPrice\(priceNgn, profile\)/);
  assert.match(auth, /function discountedCoinCost\(cost, profile\)/);
  assert.match(auth, /cost = discountedCoinCost\(baseCost, data\)/);
  assert.match(auth, /creditAdminFromSpend\(uid, spenderData && spenderData.email, spenderData && spenderData.username, cost\)/);
  assert.match(auth, /cost = discountedCoinCost\(item\.coinCost, data\)/);
  assert.match(rewards, /key === "verify3d" \? item\.coinCost : discountedCoinCost\(item\.coinCost, profile\)/);
  assert.match(auth, /balance < item\.coinCost[\s\S]*appendCoinLedger\(tx, userRef, data, -item\.coinCost, "store_redeem", \{ itemKey: "verify3d" \}\)/);
  assert.match(auth, /product === "verification" \? basePriceNgn : discountedCashPrice\(basePriceNgn, data\)/);
  assert.match(channelTools, /voteCost: isVerificationActive\(profile\) \? Math\.round\(PRICE\.vote \* 0\.85\) : PRICE\.vote/);
  assert.match(payments, /const amountKobo = VERIFICATION_PRICE_NGN \* 100/);
  assert.match(payments, /discountedCashPrice\(API_PLANS\[plan\]\.priceNgn, profile\)/);
  assert.match(payments, /discountedCashPrice\(TRADING_PLANS\[plan\]\.priceNgn, profile\)/);
  assert.match(payments, /discountedCashPrice\(DEV_API_PLANS\[plan\]\.priceNgn, profile\)/);
  assert.match(payments, /discountedCashPrice\(pkg\.priceNgn, profile\)/);
  assert.match(rewards, /priceNgn: discountedCashPrice\(pkg\.priceNgn, profile\)/);
  assert.match(promote, /discountedCashPrice\(AD_PRICE_PER_DAY_NGN \* days, profile\)/);
  assert.match(account, /15% off paid services and coin charges while verified/);
  assert.match(auth, /const COIN_REQUEST_NGN_PER_COIN = 62\.5;/);
  assert.match(account, /coinRequestRateNgn\) \|\| 62\.5/);
});

test("Buy Coins stays two columns with an internal scroll area and highlighted Popular price", () => {
  assert.match(account, /\.rw-buy-grid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*max-height:410px[^}]*overflow-y:auto/);
  assert.match(account, /@media\(max-width:359px\)\{ \.rw-buy-grid\{grid-template-columns:1fr/);
  assert.match(account, /\.rw-buy-item-popular\{[^}]*box-shadow:[^}]*rgba\(124,92,255/);
  assert.doesNotMatch(account, /rw-buy-item-cost\.popular/);
  assert.match(account, /\.rw-buy-item-badge-row\{height:15px/);
  assert.match(account, /rw-buy-item-label\{[^}]*white-space:nowrap/);
  assert.match(account, /presentation\.badge === 'POPULAR'/);
  assert.match(account, /pack2000: \{ label: 'Mega Pack', badge: '15% OFF', badgeClass: ' best' \}/);
  assert.match(account, /pack3000: \{ label: 'Max Pack', badge: '15% OFF', badgeClass: ' best' \}/);
});
