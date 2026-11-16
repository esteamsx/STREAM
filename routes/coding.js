import express from "express";
import path from "node:path";
import { isAdminEmail, isVerificationActive, getEffectiveCodingPlan, PREMIUM_DISCOUNT_RATE } from "../services/auth.js";
import { buildCodingPayload, createCoarenaRequest, readCoarenaStream, safeCodingError, verifyCodingModelAvailability, isCodingModelUnavailableError } from "../services/coarena-coding.js";
import { getCodingModel, DEFAULT_CODING_MODEL_ID } from "../services/coding-models.js";
import {
  CODING_PLAN_ORDER, CODING_PLAN_DEFS, CODING_PREMIUM_MODEL_IDS, CODING_FREE_DEFAULT_MODEL_ID, CODING_COMMAND_CREDITS, CODING_MODEL_CREDIT_MULTIPLIER,
  calculateCodingCredits, getCodingPlanLimits, getCodingUsage, isPremiumCodingModel, reserveCodingCredits, settleCodingCredits,
} from "../services/coding-usage.js";
import { CODING_FILE_CLEANUP_INTERVAL_MS, CODING_FILE_MAX_BYTES, createCodingTemporaryFiles, extractGeneratedCodingFiles } from "../services/coding-temporary-files.js";
import { formatRepositoryStatusAnswer, getCodingChatContext } from "../services/coding-chat-context.js";
import { getConnectionStatus, getRepositoryContext } from "../services/github-agent.js";
import { createCodingActivity, getCodingActivity } from "../services/coding-activity.js";
import { executeCodingCommand } from "../services/coding-command.js";
import { cleanupExpiredCodingWorkspaceFiles, writeCodingWorkspaceArchives } from "../services/coding-workspace.js";

export function isCodingPremium(profile) {
  return !!(profile && (isAdminEmail(profile.email) || isVerificationActive(profile)));
}

export function registerCodingRoutes({ requireAuth, requireSiteOrigin, SimpleRateLimiter, db }) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, private"); next(); });
  const limiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const uploadLimiter = new SimpleRateLimiter(8, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const modelLimiter = new SimpleRateLimiter(8, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const temporaryFiles = createCodingTemporaryFiles({ db });
  temporaryFiles.startCleanupSchedule();
  const cleanupWorkspaceUploads = () => cleanupExpiredCodingWorkspaceFiles().catch((error) => console.error("[COD\\NG] workspace upload cleanup failed", error?.code || error?.message));
  void cleanupWorkspaceUploads();
  const workspaceCleanupTimer = setInterval(cleanupWorkspaceUploads, CODING_FILE_CLEANUP_INTERVAL_MS);
  workspaceCleanupTimer.unref?.();
  const fileError = (res, error) => {
    const status = Number(error?.status) || 500;
    return res.status(status).json({ error: status >= 500 ? "Temporary file storage is temporarily unavailable." : error?.message || "Temporary file operation failed.", code: error?.code || "coding_file_error" });
  };
  // COD\NG is open to every signed-in user. Only premium models (Claude Fable) are
  // restricted; all usage is limited by the plan credits in services/coding-usage.js.
  const premiumOnly = (req, res, modelId) => {
    if (!isPremiumCodingModel(modelId) || isCodingPremium(req.userProfile)) return false;
    const model = getCodingModel(modelId);
    res.status(403).json({ error: `${model?.label || "This model"} is available to Premium members only.`, code: "premium_required" });
    return true;
  };
  const codingPlanFor = (profile) => getEffectiveCodingPlan(profile);
  const codingUnlimited = (profile) => !!(profile && isAdminEmail(profile.email));
  const planCatalog = () => CODING_PLAN_ORDER.map((key) => ({ key, ...CODING_PLAN_DEFS[key], ...getCodingPlanLimits(key) }));
  const writeUsage = (res, snapshot) => { if (snapshot && !res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "usage", usage: snapshot })}\n\n`); };
  // One running COD\NG request per user: prevents parallel requests from draining credits.
  const activeRuns = new Map();
  const acquireRun = (req, res) => {
    const key = String(req.uid);
    const startedAt = activeRuns.get(key);
    if (startedAt && Date.now() - startedAt < 10 * 60 * 1000) {
      res.status(429).json({ error: "Wait for your current COD\\NG request to finish.", code: "coding_request_in_progress", retryable: true });
      return false;
    }
    activeRuns.set(key, Date.now());
    res.once("close", () => activeRuns.delete(key));
    return true;
  };
  const reserveOrReject = async (req, res, credits) => {
    const profile = req.userProfile;
    const planKey = codingPlanFor(profile);
    const enforce = !codingUnlimited(profile);
    try {
      const reservation = await reserveCodingCredits(db, req.uid, planKey, credits, { enforce });
      if (reservation.allowed) return { ...reservation, planKey, enforce };
      const left = reservation.snapshot[reservation.blockedBy].remaining;
      activeRuns.delete(String(req.uid));
      res.status(429).json({ error: `Not enough ${reservation.blockedBy} credits (${left} left, ${credits} needed).`, code: "coding_quota_exceeded", blockedBy: reservation.blockedBy, resetAt: reservation.snapshot.resetsAt?.[reservation.blockedBy] || null, needed: credits, usage: reservation.snapshot });
      return null;
    } catch (error) {
      console.error("[COD\\NG] usage reservation failed", error?.code || error?.message);
      activeRuns.delete(String(req.uid));
      res.status(503).json({ error: "Usage tracking is temporarily unavailable. Please try again shortly.", code: "coding_usage_unavailable", retryable: true });
      return null;
    }
  };
  const settleUsage = async (req, reservation, delta, options = {}) => {
    try { return await settleCodingCredits(db, req.uid, reservation.planKey, reservation, delta, { enforce: reservation.enforce, ...options }); }
    catch (error) { console.error("[COD\\NG] usage settlement failed", error?.code || error?.message); return null; }
  };

  // This is a read-only same-origin session lookup used to select the user's
  // private browser-storage key. Do not apply the state-changing origin/CSRF
  // guard here: some browsers omit Origin on same-origin GET requests, which
  // would make the page fall back to a blank, non-persistent chat view.
  router.get("/api/coding/session", requireAuth, (req, res) => res.json({ uid: String(req.uid) }));
  router.get("/api/coding/usage", requireAuth, limiter, async (req, res) => {
    try {
      const profile = req.userProfile;
      const planKey = codingPlanFor(profile);
      const usage = await getCodingUsage(db, req.uid, planKey, { unlimited: codingUnlimited(profile) });
      const current = planCatalog().find((plan) => plan.key === planKey);
      return res.json({ usage, plan: current, plans: planCatalog(), codingPlanExpiresAt: profile.codingPlanExpiresAt || null, premium: isCodingPremium(profile), premiumDiscountRate: isVerificationActive(profile) ? PREMIUM_DISCOUNT_RATE : 0, premiumModelIds: CODING_PREMIUM_MODEL_IDS, freeDefaultModelId: CODING_FREE_DEFAULT_MODEL_ID, modelMultipliers: CODING_MODEL_CREDIT_MULTIPLIER, commandCredits: CODING_COMMAND_CREDITS });
    } catch (error) {
      console.error("[COD\\NG] usage lookup failed", error?.code || error?.message);
      return res.status(503).json({ error: "Usage is temporarily unavailable.", code: "coding_usage_unavailable", retryable: true });
    }
  });
  router.post("/api/coding/model", requireAuth, requireSiteOrigin, modelLimiter, async (req, res) => {
    if (premiumOnly(req, res, req.body?.modelId)) return;
    try {
      const model = await verifyCodingModelAvailability(req.body?.modelId);
      return res.json({ model, available: true });
    } catch (error) {
      const chosen = getCodingModel(req.body?.modelId);
      if (chosen && error?.code === "coding_model_check_failed" && error?.retryable === true) {
        return res.json({ model: { id: chosen.id, label: chosen.label, toastLabel: chosen.toastLabel, available: true }, available: true, verified: false });
      }
      return res.status(Number(error?.status) || 503).json({ error: error?.message || "Could not confirm model availability. Your current model has not changed.", code: error?.code || "coding_model_check_failed", retryable: error?.retryable === true });
    }
  });
  router.put("/api/coding/files", requireAuth, requireSiteOrigin, uploadLimiter, async (req, res) => {
    try {
      let filename;
      try { filename = decodeURIComponent(String(req.get("x-coding-file-name") || "")); }
      catch { return res.status(400).json({ error: "The uploaded filename is invalid.", code: "unsafe_filename" }); }
      const length = req.get("content-length");
      const file = await temporaryFiles.storeStream(req.uid, { filename, mime: req.get("content-type"), stream: req, contentLength: length === undefined ? undefined : Number(length) });
      return res.status(201).json({ file });
    } catch (error) { return fileError(res, error); }
  });
  router.get("/api/coding/files", requireAuth, limiter, async (req, res) => {
    try { return res.json({ files: await temporaryFiles.listForOwner(req.uid) }); }
    catch (error) { return fileError(res, error); }
  });
  router.get("/api/coding/files/:id/download", requireAuth, limiter, async (req, res) => {
    try {
      const file = await temporaryFiles.getDownload(req.uid, req.params.id);
      return res.download(file.path, path.basename(file.filename), (error) => {
        if (error && !res.headersSent) {
          void temporaryFiles.getDownload(req.uid, req.params.id).then(
            () => fileError(res, error),
            (unavailableError) => fileError(res, unavailableError),
          );
        }
      });
    } catch (error) { return fileError(res, error); }
  });
  router.get("/api/coding/activity/:runId", requireAuth, async (req, res) => {
    try {
      const result = await getCodingActivity(req.uid, req.params.runId, req.query.after);
      if (!result) return res.status(404).json({ error: "Activity run not found.", code: "coding_activity_not_found" });
      return res.json(result);
    } catch (error) {
      console.error(`[COD\\NG] activity history failed uid=${req.uid} code=${error?.code || "unknown"}`);
      return res.status(500).json({ error: "Activity history is temporarily unavailable.", code: "coding_activity_unavailable" });
    }
  });
  router.post("/api/coding/command", requireAuth, requireSiteOrigin, limiter, async (req, res) => {
    const controller = new AbortController();
    let finished = false;
    let reservation = null;
    const request = req.body || {};
    const activity = createCodingActivity({ uid: req.uid, conversationId: request.conversationId, onEvent: async (event) => {
      if (!res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "activity", activity: event })}\n\n`);
    } });
    res.once("close", () => { if (!res.writableEnded && !finished) { controller.abort(); void activity.finish("cancelled"); } });
    try {
      if (!acquireRun(req, res)) { finished = true; return; }
      reservation = await reserveOrReject(req, res, CODING_COMMAND_CREDITS);
      if (!reservation) { finished = true; return; }
      res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.flushHeaders?.();
      writeUsage(res, reservation.snapshot);
      await activity.initialize();
      const result = await executeCodingCommand({ uid: req.uid, input: request, approved: request.approved === true, activity, signal: controller.signal });
      await activity.emit({ type: "command.output", status: "completed", description: "Received the command output.", details: { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr } });
      finished = true;
      await activity.finish("completed");
      res.write(`data: ${JSON.stringify({ type: "command_result", runId: activity.runId, result })}\n\n`);
      res.write("data: [DONE]\n\n");
      return res.end();
    } catch (error) {
      if (res.headersSent) {
        if (error?.output) await activity.emit({ type: "command.output", status: "failed", description: "Received output from the failed command.", details: { exitCode: error.output.exitCode, stdout: error.output.stdout, stderr: error.output.stderr } });
        finished = true;
        await activity.finish(controller.signal.aborted ? "cancelled" : "failed", error);
        if (!res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "error", error: error?.userMessage || error?.message || "The command could not be completed.", retryable: error?.code === "coding_command_timeout" })}\n\n`);
        return res.end();
      }
      if (reservation) await settleUsage(req, reservation, -reservation.credits, { refundRequest: true });
      return res.status(Number(error?.status) || 400).json({ error: error?.message || "The command could not be completed.", code: error?.code || "coding_command_error" });
    }
  });

  router.post("/api/coding/chat", requireAuth, requireSiteOrigin, limiter, async (req, res) => {
    const controller = new AbortController();
    let finished = false;
    const request = req.body || {};
    // Free accounts default to the cheapest model; Claude Fable stays Premium-only.
    if (!request.modelId && !isCodingPremium(req.userProfile)) request.modelId = CODING_FREE_DEFAULT_MODEL_ID;
    if (premiumOnly(req, res, request.modelId)) return;
    const requestedModel = request.modelId ? getCodingModel(request.modelId) : null;
    let reservation = null;
    let creditInput = null;
    let usageSettled = false;
    let streamedChars = 0;
    const activity = createCodingActivity({ uid: req.uid, conversationId: request.conversationId, onEvent: async (event) => {
      if (!res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "activity", activity: event })}\n\n`);
    } });
    res.once("close", () => { if (!res.writableEnded && !finished) { controller.abort(); void activity.finish("cancelled"); } });
    try {
      const requestAttachments = Array.isArray(request.attachments) ? request.attachments : [];
      const chatContext = getCodingChatContext(request.messages, { repositoryContextEnabled: request.includeRepositoryContext === true, currentRequestHasAttachments: requestAttachments.length > 0 });
      if (chatContext.repositoryStatusRequested && requestAttachments.length === 0) {
        let status;
        try { status = await getConnectionStatus(req.uid); }
        catch {
          finished = true;
          return res.status(503).json({ error: "GitHub connection status is temporarily unavailable. Please retry.", code: "github_status_unavailable" });
        }
        const answer = formatRepositoryStatusAnswer(status);
        finished = true;
        res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
        res.flushHeaders?.();
        res.write(`data: ${JSON.stringify({ type: "text", text: answer })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      const attachments = requestAttachments;
      if (attachments.length > 6) throw Object.assign(new Error("You can attach up to 6 files per message."), { status: 413, code: "too_many_attachments" });
      const resolvedAttachments = [];
      let storedAttachmentBytes = 0;
      for (const attachment of attachments) {
        if (!attachment || !(attachment.id || attachment.fileId)) { resolvedAttachments.push(attachment); continue; }
        const stored = await temporaryFiles.readForProcessing(req.uid, attachment.id || attachment.fileId, { maxBytes: CODING_FILE_MAX_BYTES - storedAttachmentBytes });
        storedAttachmentBytes += stored.bytes.length;
        resolvedAttachments.push({ name: stored.filename, mime: attachment.mime || "application/octet-stream", bytes: stored.bytes });
      }
      const lastUser = [...(chatContext.messages || [])].reverse().find((message) => message?.role === "user");
      const messageChars = String(lastUser?.content || "").length;
      const contextChars = (chatContext.messages || []).reduce((total, message) => total + String(message?.content || "").length, 0);
      creditInput = {
        modelId: request.modelId || DEFAULT_CODING_MODEL_ID,
        messageChars,
        historyChars: Math.max(0, contextChars - messageChars),
        attachmentCount: resolvedAttachments.length,
        attachmentBytes: resolvedAttachments.reduce((total, item) => total + (item?.bytes?.length || Number(item?.size) || 0), 0),
        hasArchive: resolvedAttachments.some((item) => /\.zip$/i.test(String(item?.name || ""))),
        repositoryContext: chatContext.includeRepositoryContext === true,
      };
      if (!acquireRun(req, res)) { finished = true; return; }
      reservation = await reserveOrReject(req, res, calculateCodingCredits(creditInput).credits);
      if (!reservation) { finished = true; return; }
      res.status(200).set({ "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      res.flushHeaders?.();
      writeUsage(res, reservation.snapshot);
      await activity.initialize();
      let repositoryContext = null;
      if (chatContext.includeRepositoryContext) {
        try {
          repositoryContext = await getRepositoryContext(req.uid, {}, { operation: activity.operation });
        } catch (error) {
          if (error?.code !== "github_repository_required" && error?.code !== "github_not_connected") throw error;
        }
      }
      const payload = buildCodingPayload({ ...request, messages: chatContext.messages, attachments: resolvedAttachments, repositoryContext });
      if (payload.workspaceArchives?.length) {
        const extracted = await writeCodingWorkspaceArchives(req.uid, request.conversationId, payload.workspaceArchives);
        await activity.emit({ type: "workspace.extract", status: "completed", description: `Extracted ${extracted.files.length} source files into your private conversation workspace.`, details: { fileCount: extracted.files.length, bytes: extracted.bytes } });
      }
      const startedAt = Date.now();
      let chunkCount = 0;
      let textChars = 0;
      let generatedText = "";
      console.info(`[COD\\NG] Coarena stream start uid=${req.uid} messages=${payload.messages.length} model=${payload.model}`);
      const upstream = await activity.operation("ai.request", "Waiting for the AI response.", { model: payload.model }, () => createCoarenaRequest(payload, { signal: controller.signal }));
      for await (const event of readCoarenaStream(upstream)) {
        if (event.type === "text") { chunkCount += 1; textChars += event.text.length; streamedChars = textChars; if (generatedText.length < 30 * 1024 * 1024) generatedText += event.text; }
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      for (const generated of extractGeneratedCodingFiles(generatedText)) {
        try {
          const file = await temporaryFiles.saveBytes(req.uid, generated.filename, generated.bytes);
          res.write(`data: ${JSON.stringify({ type: "file_artifact", file: { id: file.id, filename: file.filename, createdAt: file.createdAt, expiresAt: file.expiresAt, status: file.status } })}\n\n`);
        } catch (error) {
          console.warn(`[COD\\NG] generated file could not be retained uid=${req.uid} code=${error?.code || "unknown"}`);
        }
      }
      if (reservation && !usageSettled) {
        usageSettled = true;
        const finalCredits = calculateCodingCredits({ ...creditInput, outputChars: textChars }).credits;
        const settled = await settleUsage(req, reservation, Math.max(0, finalCredits - reservation.credits));
        writeUsage(res, settled || reservation.snapshot);
      }
      await activity.emit({ type: "ai.response", status: "completed", description: "Generated the response.", details: { chunks: chunkCount, characters: textChars }, durationMs: Date.now() - startedAt });
      finished = true;
      await activity.finish("completed");
      res.write("data: [DONE]\n\n");
      res.end();
      console.info(`[COD\\NG] Coarena stream complete uid=${req.uid} chunks=${chunkCount} chars=${textChars} ms=${Date.now() - startedAt}`);
    } catch (error) {
      console.warn(`[COD\\NG] AI stream failed uid=${req.uid} code=${error?.code || "unknown"} status=${error?.status || "unknown"} detail=${error?.message || "unknown"}`);
      if (reservation && !usageSettled) {
        usageSettled = true;
        // Nothing generated: refund in full. Partial output (stopped / dropped): keep the reservation, plus any extra for long output.
        const settled = streamedChars === 0
          ? await settleUsage(req, reservation, -reservation.credits, { refundRequest: true })
          : await settleUsage(req, reservation, Math.max(0, calculateCodingCredits({ ...creditInput, outputChars: streamedChars }).credits - reservation.credits));
        if (res.headersSent) writeUsage(res, settled);
      }
      const safeError = requestedModel && isCodingModelUnavailableError(error)
        ? Object.assign(new Error(`${requestedModel.label} is currently unavailable through the AI service. Please choose another model or retry later.`), { status: 422, code: "coding_model_unavailable", retryable: false })
        : safeCodingError(error);
      if (res.headersSent) {
        finished = true;
        await activity.finish(controller.signal.aborted ? "cancelled" : "failed", safeError);
        if (!res.destroyed && res.writable) res.write(`data: ${JSON.stringify({ type: "error", error: safeError.message, code: safeError.code || "coding_error", retryable: safeError.retryable !== false })}\n\n`);
        return res.end();
      }
      finished = true;
      await activity.finish("failed", safeError);
      const status = Number(safeError?.status) || 502;
      res.status(status).json({ error: safeError.message, code: safeError.code || "coding_error", retryable: safeError.retryable === true });
    }
  });
  return router;
}
