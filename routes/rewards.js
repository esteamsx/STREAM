import express from "express";
import { verifySolution } from "altcha-lib";
import {
  requireAuth,
  getUserProfile,
  claimDailyCoins,
  redeemCoinsForLimit,
  redeemCoinsForVerification,
  getReferralsForUser,
  setBankDetails,
  deleteBankDetails,
  requestWithdrawal,
  listWithdrawalRequestsForUser,
  ensureReferralCode,
  isAdminEmail,
  isVerificationActive,
  COIN_STORE_ITEMS,
  COIN_PACKAGES,
  MIN_WITHDRAWAL_NGN,
  MAX_WITHDRAWAL_NGN,
  WITHDRAWAL_TAX_RATE,
  MIN_COIN_TRANSFER,
  MAX_COIN_TRANSFER,
  findUserByAnyUsername,
  transferCoins,
  createCoinRequestLink,
  COIN_REQUEST_NGN_PER_COIN,
  MIN_COIN_REQUEST,
  MAX_COIN_REQUEST,
  COIN_REQUEST_LINK_TTL_MS,
} from "../services/auth.js";
import { findBankCode, resolveAccountNumber } from "../services/paystack.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const ALTCHA_HMAC_KEY = process.env.ALTCHA_SECRET;

async function verifyCaptcha(payload) {
  if (!payload) return false;
  try {
    return !!(await verifySolution(payload, ALTCHA_HMAC_KEY));
  } catch {
    return false;
  }
}

const summaryLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();
const claimLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid).middleware();
const redeemLimiter = new SimpleRateLimiter(20, 60 * 60 * 1000, (req) => req.uid).middleware();
const bankLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();
const bankDeleteLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();
const resolveAccountLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
const withdrawLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();
const transferLookupLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();
const transferLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid).middleware();
const paymentLinkLimiter = new SimpleRateLimiter(
  6,
  60 * 60 * 1000,
  (req) => req.uid,
  "You've generated too many payment links. Please try again in a bit."
).middleware();

const TRANSFER_USERNAME_RE = /^[a-z0-9_]{3,20}$/;

router.get("/api/rewards/summary", requireAuth, summaryLimiter, async (req, res) => {
  try {
    const profile = req.userProfile;
    const [referralCode, referrals, withdrawals] = await Promise.all([
      ensureReferralCode(req.uid, profile),
      getReferralsForUser(req.uid),
      listWithdrawalRequestsForUser(req.uid),
    ]);
    res.json({
      referralCode,
      referralLink: `${PUBLIC_BASE}/?ref=${referralCode}`,
      coinBalance: profile.coinBalance || 0,
      nairaBalance: profile.nairaBalance || 0,
      lastDailyCoinClaimDay: profile.lastDailyCoinClaimDay || null,
      bankDetails: profile.bankDetails || null,
      verified: isAdminEmail(profile.email) || isVerificationActive(profile),
      minWithdrawalNgn: MIN_WITHDRAWAL_NGN,
      maxWithdrawalNgn: MAX_WITHDRAWAL_NGN,
      withdrawalTaxRate: WITHDRAWAL_TAX_RATE,
      minCoinTransfer: MIN_COIN_TRANSFER,
      maxCoinTransfer: MAX_COIN_TRANSFER,
      coinRequestRateNgn: COIN_REQUEST_NGN_PER_COIN,
      minCoinRequest: MIN_COIN_REQUEST,
      maxCoinRequest: MAX_COIN_REQUEST,
      coinRequestTtlMs: COIN_REQUEST_LINK_TTL_MS,
      referrals: referrals.map((r) => ({
        referredUsername: r.referredUsername,
        referredAt: r.referredAt,
        totalCommissionNgn: r.totalCommissionNgn || 0,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        amountNgn: w.amountNgn,
        payoutAmountNgn: w.payoutAmountNgn || Math.round(w.amountNgn * (1 - WITHDRAWAL_TAX_RATE)),
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
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const result = await claimDailyCoins(req.uid, req.body?.faceDescriptor);
    res.json({ ok: true, amount: result.amount });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not claim daily coins." });
  }
});

router.post("/api/rewards/payment-link", requireAuth, paymentLinkLimiter, async (req, res) => {
  try {
    const result = await createCoinRequestLink(req.uid, req.body?.coins);
    res.json({
      ok: true,
      url: `${PUBLIC_BASE}/pay/${result.token}`,
      coins: result.coins,
      amountNgn: result.amountNgn,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not generate that payment link." });
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
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const result = await setBankDetails(req.uid, {
      bankName: req.body?.bankName,
      accountNumber: req.body?.accountNumber,
      accountName: req.body?.accountName,
    });
    res.json({ ok: true, bankDetails: result });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not save bank details." });
  }
});

router.post("/api/rewards/bank-details/delete", requireAuth, bankDeleteLimiter, async (req, res) => {
  try {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    await deleteBankDetails(req.uid);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that card." });
  }
});

router.get("/api/rewards/resolve-account", requireAuth, resolveAccountLimiter, async (req, res) => {
  try {
    const bankName = String(req.query.bankName || "").trim();
    const accountNumber = String(req.query.accountNumber || "").trim();
    if (!bankName || !/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ error: "Provide a bank name and 10-digit account number." });
    }
    const bankCode = await findBankCode(bankName);
    if (!bankCode) return res.status(404).json({ error: "Could not match that bank for verification." });
    const result = await resolveAccountNumber(accountNumber, bankCode);
    res.json({ accountName: result.account_name });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not verify that account number." });
  }
});

router.post("/api/rewards/withdraw", requireAuth, withdrawLimiter, async (req, res) => {
  try {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const result = await requestWithdrawal(req.uid, req.body?.amountNgn);
    res.json({ ok: true, id: result.id });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not submit withdrawal request." });
  }
});

router.get("/api/rewards/lookup-user", requireAuth, transferLookupLimiter, async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!TRANSFER_USERNAME_RE.test(username)) {
      return res.json({ exists: false, error: "3-20 characters: letters, numbers, underscore only." });
    }
    if (username === String(req.userProfile?.username || "").toLowerCase()) {
      return res.json({ exists: false, self: true, error: "You cannot send coins to yourself." });
    }
    const target = await findUserByAnyUsername(username);
    if (!target) return res.json({ exists: false });
    if (target.uid === req.uid) {
      return res.json({ exists: false, self: true, error: "You cannot send coins to yourself." });
    }
    res.json({ exists: true, username: target.username || username });
  } catch (err) {
    console.error("lookup-user error:", err.message);
    res.status(500).json({ error: "Could not check that username." });
  }
});

router.post("/api/rewards/transfer", requireAuth, transferLimiter, async (req, res) => {
  try {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const result = await transferCoins(req.uid, req.body?.username, req.body?.amount);
    res.json({ ok: true, amount: result.amount, toUsername: result.toUsername, newBalance: result.newBalance });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not send those coins." });
  }
});

export { router as rewardsRouter };
