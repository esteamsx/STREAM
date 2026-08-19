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
  COIN_PACKAGES,
  createCoinPurchasePayment,
  getCoinPurchasePayment,
  finalizeCoinPurchasePayment,
  finalizeCoinRequestPayment,
  billingCardSummary,
  removeBillingAuthorization,
  setAutoRenew,
  RENEWABLE_PRODUCTS,
} from "../services/auth.js";
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, VERIFICATION_PRICE_NGN } from "../services/paystack.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

const router = express.Router();

const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";

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
const visitUrlLimiter = new SimpleRateLimiter(
  10,
  60 * 60 * 1000,
  (req) => req.uid,
  "Too many changes to that link. Please try again in a bit."
).middleware();
const webhookLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.ip).middleware();

router.post("/api/verification/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (isVerificationActive(profile)) return res.status(400).json({ error: "You're already verified." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before verifying." });

    const amountKobo = VERIFICATION_PRICE_NGN * 100;
    const data = await initializeTransaction({
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "verification" },
    });
    await createVerificationPayment(req.uid, data.reference, amountKobo);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amountKobo,
      priceNgn: VERIFICATION_PRICE_NGN,
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
      return res.json({ verified: true, expiresAt: profile?.verifiedExpiresAt || null });
    }

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeVerificationPayment(reference, paystackData);
    res.json({ verified: true, expiresAt: result.expiresAt || null });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

router.post("/api/plan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_API_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });

    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveApiPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${API_PLANS[plan].name} plan.` });

    const amountKobo = API_PLANS[plan].priceNgn * 100;
    const data = await initializeTransaction({
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "api_plan", plan },
    });
    await createApiPlanPayment(req.uid, data.reference, amountKobo, plan);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amountKobo,
      priceNgn: API_PLANS[plan].priceNgn,
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

router.post("/api/devplan/initialize", requireAuth, initLimiter, async (req, res) => {
  try {
    const plan = String(req.body?.plan || "").trim();
    if (!PURCHASABLE_DEV_API_PLANS.includes(plan)) return res.status(400).json({ error: "Unknown plan." });

    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before upgrading." });
    if (getEffectiveDevApiPlan(profile) === plan) return res.status(400).json({ error: `You're already on the ${DEV_API_PLANS[plan].name} plan.` });

    const amountKobo = DEV_API_PLANS[plan].priceNgn * 100;
    const data = await initializeTransaction({
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "dev_api_plan", plan },
    });
    await createDevApiPlanPayment(req.uid, data.reference, amountKobo, plan);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amountKobo,
      priceNgn: DEV_API_PLANS[plan].priceNgn,
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

    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before buying coins." });

    const amountKobo = pkg.priceNgn * 100;
    const data = await initializeTransaction({
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "coin_purchase", packageKey },
    });
    await createCoinPurchasePayment(req.uid, data.reference, amountKobo, packageKey);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amountKobo,
      priceNgn: pkg.priceNgn,
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
      await finalizeCoinPurchasePayment(event.data.reference, paystackData);
      await finalizeCoinRequestPayment(event.data.reference, paystackData);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err.message);
    res.status(200).json({ received: true });
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

router.post("/api/billing/card/remove", requireAuth, billingLimiter, async (req, res) => {
  try {
    await removeBillingAuthorization(req.uid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not remove that card." });
  }
});

export { router as paymentsRouter };
