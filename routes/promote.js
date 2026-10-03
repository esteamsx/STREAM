import express from "express";
import { requireAuth, getUserProfile, isAdminEmail } from "../services/auth.js";
import { initializeTransaction, verifyTransaction } from "../services/paystack.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import {
  AD_PRICE_PER_DAY_NGN,
  createAdDraft,
  deleteAdDraft,
  validateDays,
  assertAdPayable,
  createAdPayment,
  getAdPayment,
  finalizeAdPayment,
  nextAdFor,
  recordImpression,
  resolveClick,
  listAdsWithStats,
  getAdImage,
  adminListAds,
  adminAdDetail,
  adminRemoveAd,
} from "../services/ads.js";

const router = express.Router();

const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || "";

const byIp = (req) => req.ip;
const byUid = (req) => req.uid;

const nextLimiter = new SimpleRateLimiter(45, 60 * 1000, byIp).middleware();
const seenLimiter = new SimpleRateLimiter(90, 60 * 1000, byIp).middleware();
const clickLimiter = new SimpleRateLimiter(30, 60 * 1000, byIp).middleware();
const imageLimiter = new SimpleRateLimiter(240, 60 * 1000, byIp).middleware();
const readLimiter = new SimpleRateLimiter(400, 60 * 60 * 1000, byUid, "Too many requests. Please slow down.").middleware();
const createLimiter = new SimpleRateLimiter(12, 60 * 60 * 1000, byUid, "Too many ads created. Please try again in a bit.").middleware();
const payInitLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, byUid, "Too many payment attempts. Please try again in a bit.").middleware();
const payConfirmLimiter = new SimpleRateLimiter(30, 60 * 60 * 1000, byUid, "Too many payment confirmation attempts. Please try again in a bit.").middleware();

router.get("/api/sp/next", nextLimiter, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const last = String(req.query.last || "").slice(0, 40);
    const ad = await nextAdFor(req, last);
    res.json({ ad: ad || null });
  } catch (err) {
    console.error("promote next failed:", err && err.stack ? err.stack : err);
    res.json({ ad: null });
  }
});

router.post("/api/sp/seen", seenLimiter, async (req, res) => {
  try {
    await recordImpression(req, req.body && req.body.t);
  } catch (err) {
    console.error("promote seen failed:", err && err.message);
  }
  res.status(204).end();
});

router.get("/api/sp/go/:token", clickLimiter, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const url = await resolveClick(req, req.params.token);
    if (url) return res.redirect(302, url);
  } catch (err) {
    console.error("promote click failed:", err && err.message);
  }
  res.redirect(302, "/");
});

router.get("/api/sp/img/:id", imageLimiter, async (req, res) => {
  try {
    const image = await getAdImage(req.params.id);
    if (!image) return res.status(404).end();
    res.set({ "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400, immutable" });
    res.send(image);
  } catch (err) {
    console.error("promote image failed:", err && err.message);
    res.status(404).end();
  }
});

router.get("/api/promote/mine", requireAuth, readLimiter, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await listAdsWithStats(req.uid));
  } catch (err) {
    console.error("promote mine failed:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Could not load your ads." });
  }
});

router.post("/api/promote/create", requireAuth, createLimiter, async (req, res) => {
  try {
    const result = await createAdDraft(req.uid, req.body || {});
    res.json(result);
  } catch (err) {
    if (!err.status) console.error("promote create failed:", err && err.stack ? err.stack : err);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not create that ad." });
  }
});

router.post("/api/promote/:id/delete", requireAuth, createLimiter, async (req, res) => {
  try {
    await deleteAdDraft(req.uid, String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that ad." });
  }
});

router.post("/api/promote/pay/init", requireAuth, payInitLimiter, async (req, res) => {
  try {
    const adId = String((req.body && req.body.adId) || "");
    const days = validateDays(req.body && req.body.days);
    await assertAdPayable(req.uid, adId);

    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if (!profile.email) return res.status(400).json({ error: "Add an email to your account before paying." });

    const priceNgn = AD_PRICE_PER_DAY_NGN * days;
    const amountKobo = priceNgn * 100;
    const data = await initializeTransaction({
      email: profile.email,
      amountKobo,
      metadata: { uid: req.uid, purpose: "ad_campaign", adId, days },
    });
    await createAdPayment(req.uid, data.reference, amountKobo, adId, days);

    res.json({
      reference: data.reference,
      accessCode: data.access_code,
      publicKey: PAYSTACK_PUBLIC_KEY,
      email: profile.email,
      amountKobo,
      priceNgn,
      days,
    });
  } catch (err) {
    if (!err.status) console.error("promote pay init failed:", err && err.stack ? err.stack : err);
    res.status(err.status || 400).json({ error: err.message || "Could not start payment." });
  }
});

router.post("/api/promote/pay/confirm", requireAuth, payConfirmLimiter, async (req, res) => {
  try {
    const reference = String((req.body && req.body.reference) || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing payment reference." });

    const record = await getAdPayment(reference);
    if (!record || record.uid !== req.uid) return res.status(404).json({ error: "Payment not found." });
    if (record.status === "success") return res.json({ live: true });

    const paystackData = await verifyTransaction(reference);
    const result = await finalizeAdPayment(reference, paystackData);
    res.json({ live: !!result.endsAt || !!result.alreadyProcessed, endsAt: result.endsAt || null });
  } catch (err) {
    console.error("promote pay confirm failed:", err && err.message);
    res.status(400).json({ error: err.message || "Could not confirm payment." });
  }
});

async function requireAdminUser(req, res, next) {
  try {
    const profile = req.userProfile || (await getUserProfile(req.uid));
    if (!profile || !isAdminEmail(profile.email)) return res.status(404).json({ error: "Not found." });
    next();
  } catch {
    res.status(404).json({ error: "Not found." });
  }
}

router.get("/api/promote/admin/list", requireAuth, requireAdminUser, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await adminListAds());
  } catch (err) {
    console.error("promote admin list failed:", err && err.message);
    res.status(500).json({ error: "Could not load ads." });
  }
});

router.get("/api/promote/admin/ad/:id", requireAuth, requireAdminUser, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await adminAdDetail(req.params.id));
  } catch (err) {
    if (!err.status) console.error("promote admin detail failed:", err && err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : "Could not load that ad." });
  }
});

router.post("/api/promote/admin/:id/remove", requireAuth, requireAdminUser, async (req, res) => {
  try {
    await adminRemoveAd(String(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not remove that ad." });
  }
});

export { router as promoteRouter };
