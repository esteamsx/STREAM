import express from "express";
import { createAltchaVerifier } from "../services/altcha-security.js";
import { db } from "../config/firebase.js";
import {
  requireAuth,
  getUserProfile,
  claimDailyCoins,
  DAILY_CLAIM_FEE_NGN,
  findUnusedClaimPayment,
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
  isEmailVerifiedForUser,
  maskEmailAddress,
  COIN_STORE_ITEMS,
  COIN_PACKAGES,
  discountedCashPrice,
  discountedCoinCost,
  PREMIUM_DISCOUNT_RATE,
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
  getWeeklyActivitySummary,
  claimWeeklyActivity,
  checkCode,
  consumeVerifiedOtpAction,
  sessionSid,
} from "../services/auth.js";
import { findBankCode, resolveAccountNumber } from "../services/paystack.js";
import { SimpleRateLimiter, requireSiteOrigin } from "../middleware/security-middleware.js";
import { registerWeeklyActivityRoutes } from "./weekly-activity.js";
import { listCryptoDeposits } from "../services/crypto-deposits.js";

const router = express.Router();

const PUBLIC_BASE = "https://esteamstv.devs.surf";
const verifyCaptcha = createAltchaVerifier({ database: db, key: process.env.ALTCHA_SECRET });

async function emailVerifiedOrRespond(req, res) {
  try {
    if (await isEmailVerifiedForUser(req.uid, req.userProfile)) return true;
  } catch {
    res.status(503).json({ error: "Email verification status is temporarily unavailable. Please try again." });
    return false;
  }
  res.status(403).json({
    code: "EMAIL_VERIFICATION_REQUIRED",
    error: "Verify your registered email address to continue. Complete a fresh anti-bot check after verification.",
    email: maskEmailAddress(req.userProfile?.email),
  });
  return false;
}

async function verifyProtectedAction(req, res) {
  const payload = req.body?.altcha;
  if (!(await verifyCaptcha.verifyOnly(payload))) {
    res.status(400).json({ error: "Captcha not completed." });
    return false;
  }
  if (!(await emailVerifiedOrRespond(req, res))) return false;
  if (!(await verifyCaptcha.consumeVerified(payload))) {
    res.status(400).json({ error: "This anti-bot check has expired or was already used. Complete it again." });
    return false;
  }
  return true;
}

async function verifyCardAction(req, res) {
  const payload = req.body?.altcha;
  if (!(await verifyCaptcha.verifyOnly(payload))) {
    res.status(400).json({ error: "Captcha not completed." });
    return false;
  }
  const email = String(req.userProfile?.email || "").trim().toLowerCase();
  if (!email) {
    res.status(403).json({ code: "EMAIL_REQUIRED", error: "Add and verify an email address before managing a card." });
    return false;
  }
  if (req.body?.emailOtp) {
    const result = await checkCode(req.uid, "card_action", req.body.emailOtp);
    if (!result.ok || String(result.email || "").trim().toLowerCase() !== email) {
      const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", locked: "Too many incorrect attempts. Request a new code.", not_found: "Code expired. Request a new one." };
      res.status(400).json({ error: messages[result.reason] || "Invalid security code." });
      return false;
    }
  }
  if (!(await verifyCaptcha.consumeVerified(payload))) {
    res.status(400).json({ error: "This anti-bot check has expired or was already used. Complete it again." });
    return false;
  }
  if (!req.body?.emailOtp && !(await consumeVerifiedOtpAction(req.uid, "card_action", sessionSid(req.cookies?.session)))) {
    res.status(400).json({ error: "Email verification expired. Verify again, then retry this action with a fresh anti-bot check." });
    return false;
  }
  return true;
}

registerWeeklyActivityRoutes(router, {
  requireAuth,
  requireSiteOrigin,
  SimpleRateLimiter,
  getSummary: getWeeklyActivitySummary,
  verifyCaptcha,
  emailVerifiedOrRespond,
  claimReward: claimWeeklyActivity,
});

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
    const profile = await getUserProfile(req.uid, 0);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    res.set("Cache-Control", "no-store");
    const activePremium = isVerificationActive(profile);
    const coinPackages = Object.fromEntries(Object.entries(COIN_PACKAGES).map(([key, pkg]) => [key, {
      ...pkg,
      priceNgn: discountedCashPrice(pkg.priceNgn, profile),
    }]));
    const coinStoreItems = Object.fromEntries(Object.entries(COIN_STORE_ITEMS).map(([key, item]) => [key, {
      ...item,
      coinCost: key === "verify3d" ? item.coinCost : discountedCoinCost(item.coinCost, profile),
    }]));
    const [referralCode, referrals, withdrawals, claimCreditRef, deposits] = await Promise.all([
      ensureReferralCode(req.uid, profile),
      getReferralsForUser(req.uid),
      listWithdrawalRequestsForUser(req.uid),
      findUnusedClaimPayment(req.uid).catch(() => null),
      listCryptoDeposits(req.uid),
    ]);
    res.json({
      referralCode,
      referralLink: `${PUBLIC_BASE}/?ref=${referralCode}`,
      coinBalance: profile.coinBalance || 0,
      nairaBalance: profile.nairaBalance || 0,
      lastDailyCoinClaimDay: profile.lastDailyCoinClaimDay || null,
      dailyClaimFeeNgn: discountedCashPrice(DAILY_CLAIM_FEE_NGN, profile),
      dailyClaimFree: isAdminEmail(profile.email) || DAILY_CLAIM_FEE_NGN <= 0,
      claimCreditRef: claimCreditRef || null,
      bankDetails: profile.bankDetails || null,
      verified: isAdminEmail(profile.email) || isVerificationActive(profile),
      premiumDiscountRate: activePremium ? PREMIUM_DISCOUNT_RATE : 0,
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
        referredName: r.referredName || "",
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
      deposits,
      coinStoreItems,
      coinPackages,
    });
  } catch (err) {
    console.error("rewards summary error:", err.message);
    res.status(500).json({ error: "Could not load rewards." });
  }
});

router.post("/api/rewards/daily-claim", requireAuth, requireSiteOrigin, claimLimiter, async (req, res) => {
  try {
    if (!(await verifyProtectedAction(req, res))) return;
    const result = await claimDailyCoins(req.uid, req.body?.faceDescriptor, req.body?.paymentReference);
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
    if (!(await verifyCardAction(req, res))) return;
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
    if (!(await verifyCardAction(req, res))) return;
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
    if (!(await verifyProtectedAction(req, res))) return;
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
    if (!(await verifyProtectedAction(req, res))) return;
    const result = await transferCoins(req.uid, req.body?.username, req.body?.amount);
    res.json({ ok: true, amount: result.amount, toUsername: result.toUsername, newBalance: result.newBalance });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not send those coins." });
  }
});

export { router as rewardsRouter };
