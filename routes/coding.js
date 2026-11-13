import express from "express";
import { isAdminEmail, isVerificationActive } from "../services/auth.js";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream } from "../services/coarena-coding.js";

export function isCodingPremium(profile) {
  return !!(profile && (isAdminEmail(profile.email) || isVerificationActive(profile)));
}

export function registerCodingRoutes({ requireAuth, requireSiteOrigin, SimpleRateLimiter }) {
  const router = express.Router();
  const limiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const premiumOnly = (req, res, next) => {
    const profile = req.userProfile;
    if (isCodingPremium(profile)) return next();
    return res.status(403).json({ error: "COD/NG is available to Premium members only.", code: "premium_required" });
  };

  router.post("/api/coding/chat", requireAuth, requireSiteOrigin, limiter, premiumOnly, async (req, res) => {
    const controller = new AbortController();
    res.once("close", () => { if (!res.writableEnded) controller.abort(); });
    try {
      const payload = buildCodingPayload(req.body || {});
      const startedAt = Date.now();
      let chunkCount = 0;
      let textChars = 0;
      console.info(`[COD/NG] Coarena stream start uid=${req.uid} messages=${payload.messages.length} model=${payload.model}`);
      const upstream = await createCoarenaRequest(payload, { signal: controller.signal });
      res.status(200).set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders?.();
      for await (const event of readCoarenaStream(upstream)) {
        if (event.type === "text") { chunkCount += 1; textChars += event.text.length; }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
      console.info(`[COD/NG] Coarena stream complete uid=${req.uid} chunks=${chunkCount} chars=${textChars} ms=${Date.now() - startedAt}`);
    } catch (error) {
      console.warn(`[COD/NG] Coarena stream failed uid=${req.uid} code=${error?.code || "unknown"} message=${error?.message || "unknown"}`);
      if (res.headersSent) return res.end();
      const status = Number(error?.status) || 502;
      res.status(status).json({ error: error?.message || "COD/NG could not reach the AI service.", code: error?.code || "coding_error" });
    }
  });
  return router;
}
