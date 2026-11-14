import express from "express";
import {
  createOAuthState, consumeOAuthState, exchangeOAuthCode, getGithubUser, saveConnection, getConnectionStatus, disconnect,
  listRepositories, selectRepository, getTree, readFile, searchCode, stageChanges, getWorkspace, approveWorkspace, commitWorkspace,
  getHistory, detectTests,
} from "../services/github-agent.js";
import { getCodingGithubOAuthConfig } from "../services/github-agent-config.js";

function jsonError(res, error) {
  const status = Number(error?.status) || 500;
  return res.status(status).json({ error: error?.message || "GitHub Agent request failed.", code: error?.code || "github_agent_error" });
}

export function registerGithubAgentRoutes({ requireAuth, requireSiteOrigin, SimpleRateLimiter }) {
  const router = express.Router();
  router.use((req, res, next) => { res.set("Cache-Control", "no-store, no-cache, must-revalidate, private"); next(); });
  const readLimiter = new SimpleRateLimiter(90, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const writeLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid || req.ip).middleware();
  const oauthLimiter = new SimpleRateLimiter(10, 10 * 60 * 1000, (req) => req.uid || req.ip).middleware();
  const protectedApi = [requireAuth, requireSiteOrigin];

  router.get("/api/coding/github/status", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await getConnectionStatus(req.uid)); } catch (error) { jsonError(res, error); }
  });

  router.get("/api/coding/github/connect", ...protectedApi, oauthLimiter, async (req, res) => {
    try {
      const { clientId, clientSecret, redirectUri } = getCodingGithubOAuthConfig();
      if (!clientId || !clientSecret) return res.status(503).json({ error: "GitHub Agent OAuth is not configured.", code: "github_oauth_unavailable" });
      const state = await createOAuthState(req.uid, req.query.returnTo || "/coding");
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", "repo read:user user:email");
      url.searchParams.set("state", state);
      res.redirect(url.toString());
    } catch (error) { jsonError(res, error); }
  });

  router.get("/api/coding/github/callback", requireAuth, oauthLimiter, async (req, res) => {
    const fallback = "/coding";
    try {
      const state = await consumeOAuthState(req.query.state);
      if (!state || !req.cookies?.session) return res.redirect(`${fallback}?github_error=${encodeURIComponent("This GitHub authorization link expired or the sign-in session changed.")}`);
      if (req.query.error || !req.query.code) return res.redirect(`${state.returnTo || fallback}?github_error=${encodeURIComponent("GitHub authorization was cancelled.")}`);
      const sessionUid = req.uid;
      if (!sessionUid || String(sessionUid) !== String(state.uid)) return res.redirect(`${state.returnTo || fallback}?github_error=${encodeURIComponent("Your signed-in session could not be verified.")}`);
      const { token, scopes } = await exchangeOAuthCode(req.query.code);
      const githubUser = await getGithubUser(token);
      await saveConnection(sessionUid, { token, githubUser, scopes });
      res.redirect(`${state.returnTo || fallback}?github_connected=1`);
    } catch (error) {
      console.error("[github-agent] oauth callback failed", error);
      res.redirect(`${fallback}?github_error=${encodeURIComponent(error?.message || "Could not connect GitHub.")}`);
    }
  });

  router.post("/api/coding/github/disconnect", ...protectedApi, writeLimiter, async (req, res) => {
    try { await disconnect(req.uid); res.json({ ok: true }); } catch (error) { jsonError(res, error); }
  });

  router.get("/api/coding/github/repos", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json({ repositories: await listRepositories(req.uid) }); } catch (error) { jsonError(res, error); }
  });
  router.post("/api/coding/github/repo", ...protectedApi, writeLimiter, async (req, res) => {
    try { res.json({ repository: await selectRepository(req.uid, req.body || {}) }); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/tree", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await getTree(req.uid, req.query || {})); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/file", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await readFile(req.uid, req.query || {})); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/search", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await searchCode(req.uid, req.query || {})); } catch (error) { jsonError(res, error); }
  });
  router.post("/api/coding/github/changes", ...protectedApi, writeLimiter, async (req, res) => {
    try { res.json(await stageChanges(req.uid, req.body || {})); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/changes/:id", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await getWorkspace(req.uid, req.params.id)); } catch (error) { jsonError(res, error); }
  });
  router.post("/api/coding/github/changes/:id/approve", ...protectedApi, writeLimiter, async (req, res) => {
    try { res.json(await approveWorkspace(req.uid, req.params.id)); } catch (error) { jsonError(res, error); }
  });
  router.post("/api/coding/github/changes/:id/commit", ...protectedApi, writeLimiter, async (req, res) => {
    try { res.json(await commitWorkspace(req.uid, req.params.id, req.body || {})); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/history", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json({ commits: await getHistory(req.uid, req.query || {}) }); } catch (error) { jsonError(res, error); }
  });
  router.get("/api/coding/github/tests", ...protectedApi, readLimiter, async (req, res) => {
    try { res.json(await detectTests(req.uid, req.query || {})); } catch (error) { jsonError(res, error); }
  });

  return router;
}
