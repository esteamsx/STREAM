export function registerWeeklyActivityRoutes(router, {
  requireAuth,
  requireSiteOrigin,
  SimpleRateLimiter,
  getSummary,
  verifyCaptcha,
  emailVerifiedOrRespond,
  claimReward,
}) {
  const summaryLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();
  const claimLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid).middleware();

  router.get("/api/rewards/weekly-activity/summary", requireAuth, summaryLimiter, async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      res.json(await getSummary(req.uid, req.userProfile?.coinBalance || 0));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Could not load weekly activity." });
    }
  });

  router.post(
    "/api/rewards/weekly-activity/claim",
    requireAuth,
    requireSiteOrigin,
    claimLimiter,
    async (req, res) => {
      try {
        res.set("Cache-Control", "no-store");
        const payload = req.body?.altcha;
        const validCaptcha = typeof verifyCaptcha.verifyOnly === "function"
          ? await verifyCaptcha.verifyOnly(payload)
          : await verifyCaptcha(payload);
        if (!validCaptcha) {
          return res.status(400).json({ error: "Captcha not completed." });
        }
        if (emailVerifiedOrRespond && !(await emailVerifiedOrRespond(req, res))) return;
        if (typeof verifyCaptcha.consumeVerified === "function" && !(await verifyCaptcha.consumeVerified(payload))) {
          return res.status(400).json({ error: "This anti-bot check has expired or was already used. Complete it again." });
        }
        res.json(await claimReward(req.uid));
      } catch (err) {
        res.status(err.status || 500).json({ error: err.message || "Could not claim this week's reward." });
      }
    },
  );
}
