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
} from "../services/auth.js";
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, VERIFICATION_PRICE_NGN } from "../services/paystack.js";

const router = express.Router();

const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";

router.post("/api/verification/initialize", requireAuth, async (req, res) => {
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

router.post("/api/verification/confirm", requireAuth, async (req, res) => {
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

router.post("/api/plan/initialize", requireAuth, async (req, res) => {
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

router.post("/api/plan/confirm", requireAuth, async (req, res) => {
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

router.post("/api/plan/custom-visit-url", requireAuth, async (req, res) => {
  try {
    const result = await setCustomVisitPageUrl(req.uid, req.body?.url);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save that link." });
  }
});

router.post("/api/paystack/webhook", async (req, res) => {
  try {
    const signature = req.get("x-paystack-signature");
    if (!verifyWebhookSignature(req.rawBody, signature)) return res.status(401).end();

    const event = req.body;
    if (event?.event === "charge.success" && event.data?.reference) {
      const paystackData = await verifyTransaction(event.data.reference);
      await finalizeVerificationPayment(event.data.reference, paystackData);
      await finalizeApiPlanPayment(event.data.reference, paystackData);
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Paystack webhook error:", err.message);
    res.status(200).json({ received: true });
  }
});

export { router as paymentsRouter };
