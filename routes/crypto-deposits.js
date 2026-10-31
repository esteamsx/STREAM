import express from "express";
import { requireAuth, getUserProfile, isAdminEmail } from "../services/auth.js";
import { SimpleRateLimiter, requireSiteOrigin } from "../middleware/security-middleware.js";
import {
  listCryptoNetworks,
  getCryptoQuote,
  createCryptoDeposit,
  getCryptoDeposit,
  listCryptoDeposits,
  submitCryptoDepositHash,
  verifyCryptoDeposit,
  adminListCryptoDeposits,
  adminDecideCryptoDeposit,
} from "../services/crypto-deposits.js";

const router = express.Router();
const quoteLimiter = new SimpleRateLimiter(30, 60 * 60 * 1000, (req) => req.uid, "Too many crypto quote requests. Please try again later.").middleware();
const createLimiter = new SimpleRateLimiter(10, 60 * 60 * 1000, (req) => req.uid, "Too many crypto deposits started. Please try again later.").middleware();
const verifyLimiter = new SimpleRateLimiter(20, 60 * 60 * 1000, (req) => req.uid, "Too many verification attempts. Please try again later.").middleware();

router.get("/api/crypto/networks", requireAuth, async (req, res) => {
  res.set("Cache-Control", "no-store").json({ networks: listCryptoNetworks() });
});

router.post("/api/crypto/quote", requireAuth, quoteLimiter, async (req, res) => {
  try {
    const quote = await getCryptoQuote(req.body?.coins, req.body?.networkId, await getUserProfile(req.uid, 0));
    res.set("Cache-Control", "no-store").json(quote);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not calculate that crypto amount." });
  }
});

router.post("/api/crypto/deposits", requireAuth, requireSiteOrigin, createLimiter, async (req, res) => {
  try {
    res.status(201).json({ deposit: await createCryptoDeposit(req.uid, req.body?.coins, req.body?.networkId) });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not start that crypto deposit." });
  }
});

router.get("/api/crypto/deposits", requireAuth, async (req, res) => {
  res.set("Cache-Control", "no-store").json({ deposits: await listCryptoDeposits(req.uid) });
});

router.get("/api/crypto/deposits/:id", requireAuth, async (req, res) => {
  const deposit = await getCryptoDeposit(req.uid, req.params.id);
  if (!deposit) return res.status(404).json({ error: "Deposit not found." });
  res.set("Cache-Control", "no-store").json({ deposit });
});

router.post("/api/crypto/deposits/:id/hash", requireAuth, requireSiteOrigin, verifyLimiter, async (req, res) => {
  try {
    res.json({ deposit: await submitCryptoDepositHash(req.uid, req.params.id, req.body?.txHash) });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not save that transaction hash." });
  }
});

router.post("/api/crypto/deposits/:id/verify", requireAuth, requireSiteOrigin, verifyLimiter, async (req, res) => {
  try {
    res.json({ deposit: await verifyCryptoDeposit(req.uid, req.params.id) });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not verify that deposit yet." });
  }
});

router.get("/api/admin/crypto-deposits", requireAuth, async (req, res, next) => {
  try {
    const profile = req.userProfile || await getUserProfile(req.uid);
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    res.set("Cache-Control", "no-store").json({ deposits: await adminListCryptoDeposits() });
  } catch (err) {
    next(err);
  }
});

router.post("/api/admin/crypto-deposits/:id/decision", requireAuth, requireSiteOrigin, async (req, res) => {
  try {
    const profile = req.userProfile || await getUserProfile(req.uid);
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    const deposit = await adminDecideCryptoDeposit(req.uid, req.params.id, req.body?.decision);
    res.json({ deposit });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not update that crypto deposit." });
  }
});

export { router as cryptoDepositsRouter };
