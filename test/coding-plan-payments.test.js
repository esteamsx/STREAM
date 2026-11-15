import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const auth = read("services/auth.js");
const payments = read("routes/payments.js");
const codingRoutes = read("routes/coding.js");
const codingPage = read("views/coding.js");
const accountPage = read("views/account.js");

test("COD\\NG has separate initialize and confirm routes with server-validated paid plans", () => {
  const initialize = payments.slice(payments.indexOf('router.post("/api/codingplan/initialize"'), payments.indexOf('router.post("/api/codingplan/confirm"'));
  const confirm = payments.slice(payments.indexOf('router.post("/api/codingplan/confirm"'), payments.indexOf('router.post("/api/devplan/initialize"'));
  assert.match(initialize, /CODING_PURCHASABLE_PLAN_KEYS\.includes\(plan\)/);
  assert.match(initialize, /getUserProfile\(req\.uid, 0\)/);
  assert.match(initialize, /if \(!profile\.email\)/);
  assert.match(initialize, /discountedCashPrice\(planDef\.priceNgn, profile\)/);
  assert.match(initialize, /const amountKobo = priceNgn \* 100/);
  assert.match(initialize, /purpose: "coding_plan"/);
  assert.match(initialize, /createCodingPlanPayment\(req\.uid, data\.reference, amountKobo, plan\)/);
  assert.match(confirm, /record\.uid !== req\.uid/);
  assert.match(confirm, /verifyTransaction\(reference\)/);
  assert.match(confirm, /finalizeCodingPlanPayment\(reference/);
});

test("COD\\NG fulfillment updates only COD\\NG entitlement fields for 30 days", () => {
  const service = auth.slice(auth.indexOf("async function createCodingPlanPayment"), auth.indexOf("async function createMovieApiKey"));
  const effective = auth.slice(auth.indexOf("function getEffectiveCodingPlan"), auth.indexOf("function getMovieApiPlanConfig"));
  assert.match(service, /collection\("codingPlanPayments"\)/);
  assert.match(service, /claimPendingPayment\(ref, paystackData\)/);
  assert.match(service, /CODING_PURCHASABLE_PLAN_KEYS\.includes\(record\.plan\)/);
  assert.match(service, /CODING_PLAN_DAYS \* 24 \* 60 \* 60 \* 1000/);
  assert.match(service, /codingPlanPaid: record\.plan/);
  assert.match(service, /codingPlanPurchasedAt/);
  assert.match(service, /codingPlanExpiresAt: expiresAt/);
  assert.doesNotMatch(service, /(?:movieApiPlan|devApiPlanPaid|apiPlanPaid|verifiedExpiresAt):/);
  assert.match(effective, /resolveCodingPlanForProfile/);
  assert.doesNotMatch(effective, /movieApiPlan|devApiPlanPaid/);
});

test("COD\\NG purchase webhook fulfillment and account auto-renew are product-specific", () => {
  assert.match(payments, /finalizeCodingPlanPayment\(event\.data\.reference, paystackData\)/);
  assert.match(auth, /coding: \{[\s\S]*autoField: "codingPlanAutoRenew"[\s\S]*expiryField: "codingPlanExpiresAt"[\s\S]*planField: "codingPlanPaid"/);
  assert.match(codingRoutes, /codingPlanExpiresAt: profile\.codingPlanExpiresAt/);
  assert.match(accountPage, /data-renew/);
  assert.match(codingPage, /Auto-renew stays off until you switch it on in Account settings/);
  assert.match(auth, /"\/api\/coding\/usage", "\/api\/billing"/);
});
