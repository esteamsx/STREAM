import * as ch from "../services/channel-service.js";

/* Channel react and poll votes. Everything here runs on the server: the browser only talks to /api/wa/*
   and never learns who the provider is, which tokens exist, or how much they hold. */

export function registerChannelRoutes(router, deps) {
  const {
    requireAuth, requireSiteOrigin, SimpleRateLimiter, verifyCaptcha, spendCoins, refundCoins, addNotification,
    notifyAdminOfCoinSpend, checkAndIncrementDailyLimit, releaseDailyLimit, logChannelJob, getUserProfile, getAdminUid,
    isAdminEmail, isVerificationActive, reactPrice,
  } = deps;

  const PRICE = { react: reactPrice, vote: Math.max(1, Number(process.env.WA_VOTE_PRICE) || reactPrice) };
  const DAILY_LIMIT = 3;
  const MAX_AMOUNT = Number(process.env.WA_MAX_AMOUNT || 0);   // 0 = no cap, empty amount means "as many as possible"
  const LABEL = { react: "Channel Reactions", vote: "Poll Votes" };

  const readLimiter = new SimpleRateLimiter(40, 60 * 1000, (req) => req.uid).middleware();
  const jobLimiter = new SimpleRateLimiter(12, 60 * 1000, (req) => req.uid).middleware();
  const adminLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();

  const fail = (res, status, code, message) => res.status(status).json({ ok: false, code, error: message });
  const httpFor = { REQUEST: 400, NO_COINS: 503, BUSY: 429, UNAVAILABLE: 503, BAD_KEY: 503, NO_KEYS: 503, NO_SETUP: 503 };
  const isAdmin = (req) => isAdminEmail(req.userProfile && req.userProfile.email);
  const requireAdmin = (req, res, next) => (isAdmin(req) ? next() : res.status(403).json({ error: "Not authorized." }));

  const lastHit = new Map();
  const inFlight = new Set();
  const tooFast = (uid, action, ms) => {
    const k = uid + ":" + action, now = Date.now();
    if (now - (lastHit.get(k) || 0) < ms) return true;
    lastHit.set(k, now);
    return false;
  };
  const sweep = setInterval(() => { const c = Date.now() - 60 * 1000; for (const [k, t] of lastHit) if (t < c) lastHit.delete(k); }, 60 * 1000);
  if (sweep.unref) sweep.unref();

  let lastAlertAt = 0;
  async function alertOwner(message) {
    if (Date.now() - lastAlertAt < 60 * 60 * 1000) return;
    lastAlertAt = Date.now();
    try {
      const adminUid = await getAdminUid();
      if (adminUid) await addNotification(adminUid, "channel_service_alert", message, { link: "/admin" });
    } catch { /* an alert must never break a request */ }
  }
  ch.startDailyClaim((bad) => alertOwner("Channel service: the daily claim failed for " + bad.length + " token(s). A token may have been revoked."));

  const looksLikeEmoji = (e) => typeof e === "string" && e.length > 0 && e.length <= 16 && /\p{Extended_Pictographic}/u.test(e);
  const readAmount = (v) => {
    if (v === undefined || v === null || v === "") return undefined;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) return undefined;
    return MAX_AMOUNT ? Math.min(n, MAX_AMOUNT) : n;
  };

  /* ---- what the page needs to draw itself ---- */
  router.get("/api/wa/config", requireAuth, readLimiter, async (req, res) => {
    const profile = req.userProfile;
    const admin = isAdmin(req);
    res.set("Cache-Control", "no-store").json({
      ok: true, isAdmin: admin, free: admin,
      unlimited: !!(profile && (admin || isVerificationActive(profile))),
      coinBalance: Number(profile && profile.coinBalance) || 0,
      reactCost: PRICE.react, voteCost: PRICE.vote, dailyLimit: DAILY_LIMIT,
      ready: await ch.isReady(),
    });
  });

  /* ---- the channel's name and picture ---- */
  router.get("/api/wa/preview", requireAuth, readLimiter, async (req, res) => {
    const p = ch.parseLink(req.query.link);
    if (!p) return fail(res, 400, "REQUEST", "Paste a full channel post link.");
    const prev = await ch.getChannelPreview(p.channelId);
    res.json({
      ok: true, postId: p.postId, name: (prev && prev.name) || "",
      image: prev && prev.imageUrl ? `/api/wa/preview-img?c=${p.channelId}` : null,
    });
  });
  router.get("/api/wa/preview-img", requireAuth, readLimiter, (req, res) => ch.pipeChannelImage(String(req.query.c || ""), res));

  /* ---- poll options (free) ---- */
  router.post("/api/wa/poll-info", requireAuth, requireSiteOrigin, readLimiter, async (req, res) => {
    if (tooFast(req.uid, "pollinfo", 1200)) return fail(res, 429, "BUSY", "Slow down a little.");
    const r = await ch.getPollInfo(req.body && req.body.link);
    if (!r.ok) return fail(res, httpFor[r.code] || 500, r.code, r.message);
    if (!r.isPoll) return fail(res, 422, "NOT_POLL", "This post is not a poll.");
    res.json({ ok: true, question: r.question, options: r.options, multiSelect: r.multiSelect });
  });

  /* ---- charge, run, and give the coins back if it did not work ---- */
  async function paidJob(req, res, type, execute) {
    const uid = req.uid;
    const profile = req.userProfile;
    if (!(await verifyCaptcha(req.body && req.body.altcha))) return fail(res, 400, "CAPTCHA", "Captcha not completed.");
    const p = ch.parseLink(req.body && req.body.link);
    if (!p) return fail(res, 400, "REQUEST", "That link is missing the post number at the end, like /5749.");
    if (tooFast(uid, type, 4000)) return fail(res, 429, "BUSY", "Please wait a few seconds between requests.");
    const lock = `${uid}:${type}:${p.link}`;
    if (inFlight.has(lock)) return fail(res, 409, "BUSY", "This request is already running.");
    inFlight.add(lock);

    const admin = isAdmin(req);
    const quotaKey = `tool:channel-${type === "vote" ? "poll" : "react"}:${uid}`;
    const price = PRICE[type];
    let quotaTaken = false, charged = 0;
    try {
      if (!(await ch.isReady())) return fail(res, 503, "UNAVAILABLE", "This service is not available right now.");

      if (!admin && !isVerificationActive(profile)) {
        const q = await checkAndIncrementDailyLimit(quotaKey, DAILY_LIMIT);
        if (!q.allowed) return fail(res, 429, "LIMIT", `You've used this tool ${DAILY_LIMIT} times today. Verified accounts get unlimited use, otherwise, try again in 24 hours.`);
        quotaTaken = true;
      }
      if (!admin) {
        try { await spendCoins(uid, price, type === "vote" ? "channel-poll" : "channel-react"); charged = price; }
        catch (e) {
          if (quotaTaken) await releaseDailyLimit(quotaKey);
          return fail(res, 402, "NO_USER_COINS", (e && e.message) || `You need ${price} coins for this.`);
        }
      }

      const result = await execute(p);
      if (!result.ok) {
        if (charged) await refundCoins(uid, charged).catch(() => {});
        if (quotaTaken) await releaseDailyLimit(quotaKey);
        if (result.code === "BAD_KEY" || result.code === "NO_KEYS" || result.code === "NO_COINS") alertOwner("Channel service problem: " + result.code + ". Check the tokens in the admin page.");
        return fail(res, httpFor[result.code] || 500, result.code, result.message);
      }

      const sent = Number(result.reactionsSent ?? result.votesSent ?? 0) || 0;
      await logChannelJob(uid, profile && profile.username, p.link, charged, { kind: type, sent, detail: type === "vote" ? result.option : (result.emojis || []).join(" ") });
      if (charged) {
        await addNotification(uid, "coin_spend", `You were charge -${charged} coins for ${LABEL[type]}`, { tool: type === "vote" ? "channel-poll" : "channel-react" }).catch(() => {});
        notifyAdminOfCoinSpend(profile && profile.username, charged, LABEL[type]).catch(() => {});
      }
      const after = await getUserProfile(uid).catch(() => null);
      return res.json({
        ok: true, charged, sent, processing: !!result.processing, option: result.option || undefined,
        emojis: result.emojis || undefined, coinBalance: Number(after && after.coinBalance) || 0,
      });
    } catch (err) {
      console.error(`[channel-${type}] ${err && err.message}`);
      if (charged) await refundCoins(uid, charged).catch(() => {});
      if (quotaTaken) await releaseDailyLimit(quotaKey);
      return fail(res, 500, "ERROR", "Something went wrong. Your coins were returned if they were taken.");
    } finally {
      inFlight.delete(lock);
    }
  }

  router.post("/api/wa/react", requireAuth, requireSiteOrigin, jobLimiter, (req, res) => {
    const emojis = (Array.isArray(req.body && req.body.emojis) ? req.body.emojis : []).filter(looksLikeEmoji).slice(0, 5);
    return paidJob(req, res, "react", (p) => ch.sendReact(p.link, { emojis, random: !emojis.length, amount: readAmount(req.body.amount) }));
  });
  router.post("/api/wa/vote", requireAuth, requireSiteOrigin, jobLimiter, (req, res) =>
    paidJob(req, res, "vote", (p) => ch.sendVote(p.link, req.body && req.body.option, { amount: readAmount(req.body && req.body.amount) })));

  /* ---- admin: base URL, tokens, pool, manual claim ---- */
  const adminRead = [requireAuth, requireAdmin, adminLimiter];
  const adminWrite = [requireAuth, requireAdmin, requireSiteOrigin, adminLimiter];
  const wrap = (fn) => async (req, res) => {
    try { res.set("Cache-Control", "no-store").json({ ok: true, ...(await fn(req)) }); }
    catch (e) { res.status(e.status || 500).json({ ok: false, error: e.status ? e.message : "Could not do that." }); }
  };
  router.get("/api/wa/admin/settings", ...adminRead, wrap(async () => ({ settings: await ch.adminSettings() })));
  router.post("/api/wa/admin/base-url", ...adminWrite, wrap(async (req) => ({ settings: await ch.adminSetBaseUrl(req.body && req.body.baseUrl) })));
  router.post("/api/wa/admin/tokens", ...adminWrite, wrap(async (req) => ({ settings: await ch.adminAddToken({ label: req.body && req.body.label, token: req.body && req.body.token }) })));
  router.post("/api/wa/admin/tokens/:id", ...adminWrite, wrap(async (req) => ({ settings: await ch.adminUpdateToken(String(req.params.id), { label: req.body && req.body.label, token: req.body && req.body.token, enabled: req.body && typeof req.body.enabled === "boolean" ? req.body.enabled : undefined }) })));
  router.post("/api/wa/admin/tokens/:id/delete", ...adminWrite, wrap(async (req) => ({ settings: await ch.adminDeleteToken(String(req.params.id)) })));
  router.get("/api/wa/admin/pool", ...adminRead, wrap(async () => ({ accounts: await ch.poolStatus() })));
  router.post("/api/wa/admin/claim", ...adminWrite, wrap(async () => ({ results: await ch.claimAll() })));
}
