import express from "express";
import {
  listCollections,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  parseEnvText,
  listProviderTargets,
  compareCollection,
  syncCollection,
} from "../services/env-manager.js";

export function registerEnvManagerRoutes({ app, requireAuth, requireSiteOrigin, requireAdmin }) {
  const router = express.Router();
  const guard = [requireAuth, requireAdmin];
  const writeGuard = [requireAuth, requireSiteOrigin, requireAdmin];
  const safe = (handler) => async (req, res) => {
    try { await handler(req, res); }
    catch (err) {
      const status = Number(err?.status) || (err?.code === "env-manager/not-configured" ? 503 : 400);
      res.status(status).set("Cache-Control", "no-store").json({ error: err?.message || "ENV Manager request failed." });
    }
  };

  router.get("/collections", ...guard, safe(async (req, res) => {
    res.set("Cache-Control", "no-store").json({ collections: await listCollections(req.uid) });
  }));
  router.post("/collections", ...writeGuard, safe(async (req, res) => {
    const result = await createCollection(req.uid, req.body || {});
    res.status(201).set("Cache-Control", "no-store").json({ collection: result });
  }));
  router.get("/collections/:id", ...guard, safe(async (req, res) => {
    res.set("Cache-Control", "no-store").json({ collection: await getCollection(req.uid, req.params.id) });
  }));
  router.patch("/collections/:id", ...writeGuard, safe(async (req, res) => {
    if (req.body?.mode === "replace" && req.body?.confirm !== true) return res.status(400).json({ error: "Explicit replacement approval is required." });
    res.set("Cache-Control", "no-store").json({ collection: await updateCollection(req.uid, req.params.id, req.body || {}) });
  }));
  router.delete("/collections/:id", ...writeGuard, safe(async (req, res) => {
    if (req.body?.confirm !== true) return res.status(400).json({ error: "Explicit deletion approval is required." });
    await deleteCollection(req.uid, req.params.id);
    res.set("Cache-Control", "no-store").json({ ok: true });
  }));
  router.post("/collections/:id/upload", ...writeGuard, safe(async (req, res) => {
    const content = String(req.body?.content || "");
    const variables = parseEnvText(content);
    const mode = req.body?.mode === "replace" ? "replace" : "merge";
    if (mode === "replace" && req.body?.confirm !== true) return res.status(400).json({ error: "Explicit replacement approval is required." });
    res.set("Cache-Control", "no-store").json({ collection: await updateCollection(req.uid, req.params.id, { mode, variables }) });
  }));
  router.get("/providers/:provider/targets", ...guard, safe(async (req, res) => {
    res.set("Cache-Control", "no-store").json({ provider: req.params.provider, targets: await listProviderTargets(req.params.provider) });
  }));
  router.post("/collections/:id/compare", ...writeGuard, safe(async (req, res) => {
    const result = await compareCollection(req.uid, req.params.id, req.body?.provider, req.body?.target, { replace: req.body?.replace === true });
    res.set("Cache-Control", "no-store").json(result);
  }));
  router.post("/sync", ...writeGuard, safe(async (req, res) => {
    res.set("Cache-Control", "no-store").json(await syncCollection(req.uid, req.body?.planToken, { confirm: req.body?.confirm === true, productionConfirm: req.body?.productionConfirm === true }));
  }));
  app.use("/api/admin/env", router);
}
