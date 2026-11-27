import express from "express";
import {
  requireAuth,
  getUserProfile,
  isVerificationActive,
  createVerificationPayment,
  getVerificationPayment,
  finalizeVerificationPayment,
  createApiPlanPayment,
  getApiPlanPayment,
  finalizeApiPlanPayment,
  getEffectiveApiPlan,
  API_PLANS,
  PURCHASABLE_API_PLANS,
  setCustomVisitPageUrl,
  createDevApiPlanPayment,
  getDevApiPlanPayment,
  finalizeDevApiPlanPayment,
  getEffectiveDevApiPlan,
  DEV_API_PLANS,
  PURCHASABLE_DEV_API_PLANS,
  setDevApiCustomAdsUrl,
  createMovieApiPlanPayment,
  getMovieApiPlanPayment,
  finalizeMovieApiPlanPayment,
  createCodingPlanPayment,
  getCodingPlanPayment,
  finalizeCodingPlanPayment,
  getEffectiveCodingPlan,
  getEffectiveMovieApiPlan,
  MOVIE_API_PLANS,
  PURCHASABLE_MOVIE_API_PLANS,
  COIN_PACKAGES,
  createCoinPurchasePayment,
  getCoinPurchasePayment,
  finalizeCoinPurchasePayment,
  finalizeCoinRequestPayment,
  billingCardSummary,
  removeBillingAuthorization,
  setAutoRenew,
  RENEWABLE_PRODUCTS,
  TRADING_PLANS,
  PURCHASABLE_TRADING_PLANS,
  getEffectiveTradingPlan,
  createTradingPlanPayment,
  getTradingPlanPayment,
  finalizeTradingPlanPayment,
  isAdminEmail,
  discountedCashPrice,
  PREMIUM_DISCOUNT_RATE,
  DAILY_CLAIM_FEE_NGN,
  hasClaimedDailyToday,
  createClaimPayment,
  getClaimPayment,
  findUnusedClaimPayment,
  finalizeClaimPayment,
  checkCode,
  consumeVerifiedOtpAction,
  sessionSid,
} from "../services/auth.js";
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, VERIFICATION_PRICE_NGN, VERIFICATION_ROLLOVER_PRICE_NGN, normalizePaymentMethod, ngnToUsd, NGN_PER_USD } from "../services/paystack.js";
import { SimpleRateLimiter, requireSiteOrigin } from "../middleware/security-middleware.js";
import { createAltchaVerifier } from "../services/altcha-security.js";
import { db } from "../config/firebase.js";
import { finalizeAdPayment } from "../services/ads.js";
import { CODING_PLAN_DEFS, CODING_PURCHASABLE_PLAN_KEYS } from "../services/coding-usage.js";

const router = express.Router();

const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";
const verifyCaptcha = createAltchaVerifier({ database: db, key: process.env.ALTCHA_SECRET });

const initLimiter = new SimpleRateLimiter(
  5,
  60 * 60 * 1000,
  (req) => req.uid,
  "Too many payment attempts. Please try again in a bit."
).middleware();
const confirmLimiter = new SimpleRateLimiter(
  20,
  60 * 60 * 1000,
  (req) => req.uid,
  "Too many payment confirmation attempts. Please try again in a bit."
).middleware();
const codingPlanInitLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid, "Too many COD\\NG payment attempts. Please try again in a bit.").middleware();
const codingPlanConfirmLimiter = new SimpleRateLimiter(20, 60 * 60 * 1000, (req) => req.uid, "Too many COD\\NG confirmation attempts. Please try again in a bit.").middleware();
const visitUrlLimiter = new SimpleRateLimiter(
  10,
  60 * 60 * 1000,
  (req) => req.uid,
  "Too many changes to that link. Please try again in a bit."
).middleware();
const webhookLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.ip).middleware();

router.post("/api/verification/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const profile = req.userProfile;
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before verifying." });

    const rollover = isVerificationActive(profile);
    const priceNgn = rollover ? VERIFICATION_ROLLOVER_PRICE_NGN : VERIFICATION_PRICE_NGN;
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "verification", rollover },
    });
    await createVerificationPayment(req.uid, data.reference, amountKobo, rollover);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(amountKobo / 100),
      email: profile.email,
      amountKobo,
      priceNgn,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start verification payment." });
  }
});

router.post("/api/verification/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getVerificationPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status === "success") {
      const profile = await getUserProfile(req.uid);
      return res.json({ verified: true, expiresAt: profile?.verifiedExpiresAt || null, rolledOver: !!record.rollover });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeVerificationPayment(reference, paystackData);
    res.json({ verified: true, expiresAt: result.expiresAt || null, rolledOver: !!result.rollover });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/plan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_API_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });

    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveApiPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${API_PLANS[plan].name} plan.` });

    const priceNgn = discountedCashPrice(API_PLANS[plan].priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "api_plan", plan },
    });
    await createApiPlanPayment(req.uid, data.reference, amountKobo, plan);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(amountKobo / 100),
      email: profile.email,
      amountKobo,
      priceNgn,
      plan,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start plan payment." });
  }
});

router.post("/api/plan/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getApiPlanPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status === "success") {
      const profile = await getUserProfile(req.uid);
      return res.json({ plan: profile?.apiPlanPaid || record.plan, expiresAt: profile?.apiPlanExpiresAt || null });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeApiPlanPayment(reference, paystackData);
    res.json({ plan: result.plan || record.plan, expiresAt: result.expiresAt || null });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/plan/custom-visit-url", requireAuth, visitUrlLimiter, async (req, res) => {
  try {
    const result = await setCustomVisitPageUrl(req.uid, req.body?.url);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save that link." });
  }
});

router.post("/api/trading-plan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_TRADING_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });

    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveTradingPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${TRADING_PLANS[plan].name} plan.` });

    const priceNgn = discountedCashPrice(TRADING_PLANS[plan].priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "trading_plan", plan },
    });
    await createTradingPlanPayment(req.uid, data.reference, amountKobo, plan);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(amountKobo / 100),
      email: profile.email,
      amountKobo,
      priceNgn,
      plan,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start plan payment." });
  }
});

router.post("/api/trading-plan/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getTradingPlanPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status === "success") {
      const profile = await getUserProfile(req.uid);
      return res.json({ plan: profile?.tradingPlanPaid || record.plan, expiresAt: profile?.tradingPlanExpiresAt || null, instantBonusNgn: 0 });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeTradingPlanPayment(reference, paystackData);
    res.json({ plan: result.plan || record.plan, expiresAt: result.expiresAt || null, instantBonusNgn: result.instantBonusNgn || 0 });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.get("/api/trading-plan/status", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    const effectivePlan = getEffectiveTradingPlan(profile);
    res.set("Cache-Control", "no-store");
    res.json({
      plan: effectivePlan,
      config: TRADING_PLANS[effectivePlan],
      expiresAt: profile.tradingPlanExpiresAt || null,
      tradesUsed: profile.tradingWeekCount || 0,
      tradesWindowStart: profile.tradingWeekStart || null,
      username: profile.username || "",
      premiumDiscountRate: isVerificationActive(profile) ? PREMIUM_DISCOUNT_RATE : 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load plan status." });
  }
});

router.post("/api/movieplan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_MOVIE_API_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });
    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveMovieApiPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${MOVIE_API_PLANS[plan].name} plan.` });
    const priceNgn = discountedCashPrice(MOVIE_API_PLANS[plan].priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({ method: normalizePaymentMethod(req.body?.method), email: profile.email, amountKobo, metadata: { uid: req.uid, purpose: "movie_api_plan", plan } });
    await createMovieApiPlanPayment(req.uid, data.reference, amountKobo, plan);
    res.json({ reference: data.reference, accessCode: data.access_code, publicKey: PAYSTACK_PUBLIC_KEY, method: normalizePaymentMethod(req.body?.method), ngnPerUsd: NGN_PER_USD, amountUsd: ngnToUsd(amountKobo / 100), email: profile.email, amountKobo, priceNgn, plan });
  } catch (err) { console.error(err); res.status(err.status || 400).json({ error: err.message || "Could not start plan payment." }); }
});
router.post("/api/movieplan/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });
    const record = await getMovieApiPlanPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });
    if (record.status === "success") { const profile = await getUserProfile(req.uid); return res.json({ plan: profile?.movieApiPlanPaid || record.plan, expiresAt: profile?.movieApiPlanExpiresAt || null }); }
    const result = await finalizeMovieApiPlanPayment(reference, await verifyTransaction(reference));
    res.json({ plan: result.plan || record.plan, expiresAt: result.expiresAt || null });
  } catch (err) { console.error(err); res.status(err.status || 400).json({ error: err.message || "Could not confirm payment." }); }
});

router.post("/api/codingplan/initialize", requireAuth, codingPlanInitLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!CODING_PURCHASABLE_PLAN_KEYS.includes(plan)) return res.status(400).json({ error: "Unknown COD\\NG plan." });
    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    const planDef = CODING_PLAN_DEFS[plan];
    if (getEffectiveCodingPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${planDef.name} COD\\NG plan.` });
    const priceNgn = discountedCashPrice(planDef.priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const method = normalizePaymentMethod(req.body?.method);
    const data = await initializeTransaction({
      method,
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "coding_plan", plan },
    });
    await createCodingPlanPayment(req.uid, data.reference, amountKobo, plan);
    res.json({ reference: data.reference, accessCode: data.access_code, publicKey: PAYSTACK_PUBLIC_KEY, method, ngnPerUsd: NGN_PER_USD, amountUsd: ngnToUsd(amountKobo / 100), email: profile.email, amountKobo, priceNgn, plan });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start COD\\NG plan payment." });
  }
});

router.post("/api/codingplan/confirm", requireAuth, codingPlanConfirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });
    const record = await getCodingPlanPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });
    if (record.status === "success") {
      const profile = await getUserProfile(req.uid);
      return res.json({ plan: record.plan, expiresAt: profile?.codingPlanPaid === record.plan ? profile?.codingPlanExpiresAt || null : null });
    }
    const result = await finalizeCodingPlanPayment(reference, await verifyTransaction(reference));
    res.json({ plan: result.plan || record.plan, expiresAt: result.expiresAt || null });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not confirm COD\\NG plan payment." });
  }
});

router.post("/api/devplan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_DEV_API_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });

    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveDevApiPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${DEV_API_PLANS[plan].name} plan.` });

    const priceNgn = discountedCashPrice(DEV_API_PLANS[plan].priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "dev_api_plan", plan },
    });
    await createDevApiPlanPayment(req.uid, data.reference, amountKobo, plan);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(amountKobo / 100),
      email: profile.email,
      amountKobo,
      priceNgn,
      plan,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start plan payment." });
  }
});

router.post("/api/devplan/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getDevApiPlanPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status === "success") {
      const profile = await getUserProfile(req.uid);
      return res.json({ plan: profile?.devApiPlanPaid || record.plan, expiresAt: profile?.devApiPlanExpiresAt || null });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeDevApiPlanPayment(reference, paystackData);
    res.json({ plan: result.plan || record.plan, expiresAt: result.expiresAt || null });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/devplan/custom-ads-url", requireAuth, visitUrlLimiter, async (req, res) => {
  try {
    const result = await setDevApiCustomAdsUrl(req.uid, req.body?.url);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save that link." });
  }
});

router.post("/api/coins/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const packageKey = String(req.body?.packageKey || "").trim();
    const pkg = COIN_PACKAGES[packageKey];
    if (!pkg) return res.status(400).json({ error: "Unknown coin package." });

    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before buying coins." });

    const priceNgn = discountedCashPrice(pkg.priceNgn, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "coin_purchase", packageKey },
    });
    await createCoinPurchasePayment(req.uid, data.reference, amountKobo, packageKey);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(amountKobo / 100),
      email: profile.email,
      amountKobo,
      priceNgn,
      coins: pkg.coins,
      packageKey,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start coin purchase." });
  }
});

router.post("/api/coins/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getCoinPurchasePayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status === "success") {
      const pkg = COIN_PACKAGES[record.packageKey];
      return res.json({ coins: pkg ? pkg.coins : 0 });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeCoinPurchasePayment(reference, paystackData);
    res.json({ coins: result.coins || 0 });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/rewards/claim-pay/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (isAdminEmail(profile.email) || DAILY_CLAIM_FEE_NGN <= 0) return res.json({ free: true });
    if (hasClaimedDailyToday(profile)) return res.status(400).json({ error: "You've already claimed today's coins. Come back tomorrow." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before claiming." });

    const existing = await findUnusedClaimPayment(req.uid);
    if (existing) return res.json({ paid: true, reference: existing });

    const priceNgn = discountedCashPrice(DAILY_CLAIM_FEE_NGN, profile);
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      method: normalizePaymentMethod(req.body?.method),
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "daily_claim" },
    });
    await createClaimPayment(req.uid, data.reference, amountKobo);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      method: normalizePaymentMethod(req.body?.method),
      ngnPerUsd: NGN_PER_USD,
      amountUsd: ngnToUsd(priceNgn),
      email: profile.email,
      amountKobo,
      priceNgn,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 400).json({ error: err.message || "Could not start claim payment." });
  }
});

router.post("/api/rewards/claim-pay/confirm", requireAuth, confirmLimiter, async (req, res) => {
  try {
    const reference = String(req.body?.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getClaimPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });

    if (record.status !== "success") {
      const paystackData = await verifyTransaction(reference);
      await finalizeClaimPayment(reference, paystackData);
    }
    res.json({ reference, paid: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/paystack/webhook", webhookLimiter, async (req, res) => {
  try {
    const signature = req.get("x-paystack-signature");
    if (!verifyWebhookSignature(req.rawBody, signature)) return res.status(401).end();

    const event = req.body;
    if (event?.event === "charge.success" && event.data?.reference) {
      const paystackData = await verifyTransaction(event.data.reference);
      await finalizeVerificationPayment(event.data.reference, paystackData);
      await finalizeApiPlanPayment(event.data.reference, paystackData);
      await finalizeDevApiPlanPayment(event.data.reference, paystackData);
      await finalizeCodingPlanPayment(event.data.reference, paystackData);
      await finalizeCoinPurchasePayment(event.data.reference, paystackData);
      await finalizeCoinRequestPayment(event.data.reference, paystackData);
      await finalizeTradingPlanPayment(event.data.reference, paystackData);
      await finalizeClaimPayment(event.data.reference, paystackData);
      await finalizeAdPayment(event.data.reference, paystackData);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err.message);
    res.status(500).json({ received: false });
  }
});

const billingLimiter = new SimpleRateLimiter(30, 60 * 60 * 1000, (req) => req.uid).middleware();

router.get("/api/billing", requireAuth, billingLimiter, async (req, res) => {
  try {
    const profile = req.userProfile;
    const subscriptions = {};
    for (const key of Object.keys(RENEWABLE_PRODUCTS)) {
      const config = RENEWABLE_PRODUCTS[key];
      subscriptions[key] = {
        label: config.label,
        autoRenew: !!profile[config.autoField],
        expiresAt: profile[config.expiryField] || null,
        active: !!(profile[config.expiryField] && Date.now() < profile[config.expiryField]),
      };
    }
    res.json({ card: billingCardSummary(profile), subscriptions });
  } catch (err) {
    console.error("billing summary error:", err.message);
    res.status(500).json({ error: "Could not load billing details." });
  }
});

router.post("/api/billing/auto-renew", requireAuth, billingLimiter, async (req, res) => {
  try {
    const result = await setAutoRenew(req.uid, String(req.body?.product || ""), !!req.body?.enabled);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not update auto-renew." });
  }
});

router.post("/api/billing/card/remove", requireAuth, requireSiteOrigin, billingLimiter, async (req, res) => {
  try {
    const payload = req.body?.altcha;
    if (!(await verifyCaptcha.verifyOnly(payload))) return res.status(400).json({ error: "Captcha not completed." });
    const email = String(req.userProfile?.email || "").trim().toLowerCase();
    if (!email) return res.status(403).json({ code: "EMAIL_REQUIRED", error: "Add and verify an email address before managing a card." });
    if (req.body?.emailOtp) {
      const result = await checkCode(req.uid, "card_action", req.body.emailOtp);
      if (!result.ok || String(result.email || "").trim().toLowerCase() !== email) {
        const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", locked: "Too many incorrect attempts. Request a new code.", not_found: "Code expired. Request a new one." };
        return res.status(400).json({ error: messages[result.reason] || "Invalid security code." });
      }
    }
    if (!(await verifyCaptcha.consumeVerified(payload))) return res.status(400).json({ error: "This anti-bot check has expired or was already used. Complete it again." });
    if (!req.body?.emailOtp && !(await consumeVerifiedOtpAction(req.uid, "card_action", sessionSid(req.cookies?.session)))) return res.status(400).json({ error: "Email verification expired. Verify again, then retry this action with a fresh anti-bot check." });
    await removeBillingAuthorization(req.uid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not remove that card." });
  }
});

export { router as paymentsRouter };
