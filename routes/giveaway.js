import express from "express";
import { requireAuth, getUserProfile, isAdminEmail } from "../services/auth.js";
import { SimpleRateLimiter, requireSiteOrigin } from "../middleware/security-middleware.js";
import {
  getPublicStatus,
  enterGiveaway,
  startGiveaway,
  closeEntriesNow,
  pickWinnerNow,
  cancelGiveaway,
  getAdminState,
  getHistoryPhoto,
  runDueDraw,
} from "../services/giveaway.js";

export function createGiveawayRouter({ verifyCaptcha }) {
  const router = express.Router();
  const enterLimiter = new SimpleRateLimiter(10, 10 * 60 * 1000, (req) => req.uid, "Too many attempts. Give it a few minutes.").middleware();

  async function requireAdmin(req, res, next) {
    try {
      const profile = req.userProfile || (await getUserProfile(req.uid));
      if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
      next();
    } catch {
      res.status(403).json({ error: "Not authorized." });
    }
  }

  const fail = (res, err, fallback) => res.status(err.status || 500).json({ error: err.message || fallback });

  router.get("/api/giveaway/status", requireAuth, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await runDueDraw();
      res.json(await getPublicStatus(req.uid));
    } catch (err) {
      fail(res, err, "Could not load the giveaway.");
    }
  });

  router.post("/api/giveaway/enter", requireAuth, requireSiteOrigin, enterLimiter, async (req, res) => {
    try {
      if (!(await verifyCaptcha(req.body?.altcha))) return res.status(400).json({ error: "Captcha not completed." });
      res.json(await enterGiveaway(req.uid, req.body));
    } catch (err) {
      fail(res, err, "Could not enter the giveaway.");
    }
  });

  router.get("/api/admin/giveaway", requireAuth, requireAdmin, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      await runDueDraw();
      res.json(await getAdminState());
    } catch (err) {
      fail(res, err, "Could not load the giveaway.");
    }
  });

  router.post("/api/admin/giveaway/start", requireAuth, requireAdmin, requireSiteOrigin, async (req, res) => {
    try {
      res.json(await startGiveaway(req.body || {}));
    } catch (err) {
      fail(res, err, "Could not start the giveaway.");
    }
  });

  router.post("/api/admin/giveaway/close", requireAuth, requireAdmin, requireSiteOrigin, async (req, res) => {
    try {
      res.json(await closeEntriesNow());
    } catch (err) {
      fail(res, err, "Could not close entries.");
    }
  });

  router.post("/api/admin/giveaway/draw", requireAuth, requireAdmin, requireSiteOrigin, async (req, res) => {
    try {
      res.json(await pickWinnerNow());
    } catch (err) {
      fail(res, err, "Could not pick a winner.");
    }
  });

  router.post("/api/admin/giveaway/cancel", requireAuth, requireAdmin, requireSiteOrigin, async (req, res) => {
    try {
      res.json(await cancelGiveaway());
    } catch (err) {
      fail(res, err, "Could not cancel the giveaway.");
    }
  });

  router.get("/api/admin/giveaway/history/:id/photo", requireAuth, requireAdmin, async (req, res) => {
    try {
      const photo = await getHistoryPhoto(req.params.id);
      if (!photo) return res.status(404).end();
      res.set({ "Content-Type": photo.type, "Cache-Control": "private, max-age=86400" });
      res.send(photo.buffer);
    } catch {
      res.status(500).end();
    }
  });

  return router;
}
