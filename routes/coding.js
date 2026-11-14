import express from "express";
import { isAdminEmail, isVerificationActive } from "../services/auth.js";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream, safeCodingError } from "../services/coarena-coding.js";
import { getRepositoryContext } from "../services/github-agent.js";

export function isCodingPremium(profile) {
  return !!(profile && (isAdminEmail(profile.email) || isVerificationActive(profile)));
}

export function registerCodingRoutes({ requireAuth, requireSiteOrigin, SimpleRateLimiter }) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, private"); next(); });
  const limiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const premiumOnly = (req, res, next) => {
    const profile = req.userProfile;
    if (isCodingPremium(profile)) return next();
    return res.status(403).json({ error: "COD\\NG is available to Premium members only.", code: "premium_required" });
  };

  // This is a read-only same-origin session lookup used to select the user's
  // private browser-storage key. Do not apply the state-changing origin/CSRF
  // guard here: some browsers omit Origin on same-origin GET requests, which
  // would make the page fall back to a blank, non-persistent chat view.
  router.get("/api/coding/session", requireAuth, (req, res) => res.json({ uid: String(req.uid) }));

  router.post("/api/coding/chat", requireAuth, requireSiteOrigin, limiter, premiumOnly, async (req, res) => {
    const controller = new AbortController();
    res.once("close", () => { if (!res.writableEnded) controller.abort(); });
    try {
      const request = req.body || {};
      let repositoryContext = null;
      if (request.includeRepositoryContext === true) {
        try {
          repositoryContext = await getRepositoryContext(req.uid);
        } catch (error) {
          if (error?.code !== "github_repository_required" && error?.code !== "github_not_connected") throw error;
        }
      }
      const payload = buildCodingPayload({ ...request, repositoryContext });
      const startedAt = Date.now();
      let chunkCount = 0;
      let textChars = 0;
      console.info(`[COD\\NG] Coarena stream start uid=${req.uid} messages=${payload.messages.length} model=${payload.model}`);
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
      console.info(`[COD\\NG] Coarena stream complete uid=${req.uid} chunks=${chunkCount} chars=${textChars} ms=${Date.now() - startedAt}`);
    } catch (error) {
      console.warn(`[COD\\NG] AI stream failed uid=${req.uid} code=${error?.code || "unknown"} status=${error?.status || "unknown"} detail=${error?.message || "unknown"}`);
      const safeError = safeCodingError(error);
      if (res.headersSent) {
        if (!res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "error", error: safeError.message, retryable: safeError.retryable !== false })}\n\n`);
        return res.end();
      }
      const status = Number(safeError?.status) || 502;
      res.status(status).json({ error: safeError.message, code: safeError.code || "coding_error", retryable: safeError.retryable === true });
    }
  });
  return router;
}
