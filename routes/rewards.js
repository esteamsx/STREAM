import express from "express";
import {
  requireAuth,
  getUserProfile,
  claimDailyCoins,
  redeemCoinsForLimit,
  redeemCoinsForVerification,
  getReferralsForUser,
  setBankDetails,
  requestWithdrawal,
  listWithdrawalRequestsForUser,
  COIN_STORE_ITEMS,
  COIN_PACKAGES,
} from "../services/auth.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";

const summaryLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();
const claimLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid).middleware();
const redeemLimiter = new SimpleRateLimiter(20, 60 * 60 * 1000, (req) => req.uid).middleware();
const bankLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();
const withdrawLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();

router.get("/api/rewards/summary", requireAuth, summaryLimiter, async (req, res) => {
  try {
    const profile = req.userProfile;
    const [referrals, withdrawals] = await Promise.all([
      getReferralsForUser(req.uid),
      listWithdrawalRequestsForUser(req.uid),
    ]);
    res.json({
      referralCode: profile.referralCode || null,
      referralLink: profile.referralCode ? `${PUBLIC_BASE}/?ref=${profile.referralCode}` : null,
      coinBalance: profile.coinBalance || 0,
      nairaBalance: profile.nairaBalance || 0,
      lastDailyCoinClaimDay: profile.lastDailyCoinClaimDay || null,
      bankDetails: profile.bankDetails || null,
      referrals: referrals.map((r) => ({
        referredUsername: r.referredUsername,
        referredAt: r.referredAt,
        totalCommissionNgn: r.totalCommissionNgn || 0,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountNgn: w.amountNgn,
        status: w.status,
        requestedAt: w.requestedAt,
        completedAt: w.completedAt || null,
        certificateSerial: w.certificateSerial || null,
      })),
      coinStoreItems: COIN_STORE_ITEMS,
      coinPackages: COIN_PACKAGES,
    });
  } catch (err) {
    console.error("rewards summary error:", err.message);
    res.status(500).json({ error: "Could not load rewards." });
  }
});

router.post("/api/rewards/daily-claim", requireAuth, claimLimiter, async (req, res) => {
  try {
    const result = await claimDailyCoins(req.uid);
    res.json({ ok: true, amount: result.amount });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not claim daily coins." });
  }
});

router.post("/api/rewards/redeem", requireAuth, redeemLimiter, async (req, res) => {
  try {
    const itemKey = String(req.body?.itemKey || "").trim();
    const product = req.body?.product === "devapi" ? "devapi" : "livetv";
    if (itemKey === "verify3d") {
      const result = await redeemCoinsForVerification(req.uid);
      return res.json({ ok: true, verifiedExpiresAt: result.expiresAt });
    }
    const result = await redeemCoinsForLimit(req.uid, itemKey, product);
    res.json({ ok: true, amount: result.amount, coinCost: result.coinCost });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not redeem that reward." });
  }
});

router.post("/api/rewards/bank-details", requireAuth, bankLimiter, async (req, res) => {
  try {
    const result = await setBankDetails(req.uid, {
      bankName: req.body?.bankName,
      accountNumber: req.body?.accountNumber,
      accountName: req.body?.accountName,
    });
    res.json({ ok: true, bankDetails: result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save bank details." });
  }
});

router.post("/api/rewards/withdraw", requireAuth, withdrawLimiter, async (req, res) => {
  try {
    const result = await requestWithdrawal(req.uid, req.body?.amountNgn);
    res.json({ ok: true, id: result.id });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not submit withdrawal request." });
  }
});

export { router as rewardsRouter };
