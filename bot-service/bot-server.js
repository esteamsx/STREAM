import express from "express";
import "dotenv/config";
import { exec } from "child_process";
import {
  deployBot, listBotsForUser, getBotStatus, stopBot, restartBot, deleteBot,
  countActiveBots, MAX_ACTIVE_BOTS, countBotsForUser, MAX_INSTANCES_PER_USER,
  restoreBotsOnBoot, startBotUpdateChecker,
  adminStopBot, adminRestartBot, adminDeleteBot, adminListDeployingUsers, adminListBotsForUser,
  checkForUpdates, getTemplateStatus,
} from "./bots.js";

const app = express();
app.use(express.json());

// ── Shared-secret auth ──────────────────────────────────────────────────
// This service is never talked to directly by browsers — only by the main
// site's server, over the network, using this key. Set the SAME value for
// INTERNAL_API_KEY on both Render services' env vars. Generate it once
// with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  console.error("FATAL: INTERNAL_API_KEY is not set. Refusing to start with an unprotected bot service.");
  process.exit(1);
}

app.use((req, res, next) => {
  if (req.path === "/internal/health") return next(); // used by the main site's own health checks, no secret needed
  if (req.get("x-internal-key") !== INTERNAL_API_KEY) return res.status(401).json({ error: "Unauthorized." });
  next();
});

app.get("/internal/health", (req, res) => res.status(200).send("ok"));

function getDiskUsage() {
  return new Promise((resolve) => {
    exec("df -k .", (err, stdout) => {
      if (err) return resolve(null);
      const line = stdout.trim().split("\n")[1];
      if (!line) return resolve(null);
      const parts = line.split(/\s+/);
      const totalKB = parseInt(parts[1], 10);
      const usedKB = parseInt(parts[2], 10);
      const percent = parseInt(parts[4], 10);
      if (!Number.isFinite(totalKB) || !Number.isFinite(usedKB) || !Number.isFinite(percent)) return resolve(null);
      resolve({ usedGB: +(usedKB / 1024 / 1024).toFixed(2), totalGB: +(totalKB / 1024 / 1024).toFixed(2), percent });
    });
  });
}

app.get("/internal/system/storage", async (req, res) => {
  const usage = await getDiskUsage();
  if (!usage) return res.status(500).json({ error: "Could not read disk usage." });
  res.json(usage);
});

// ── Per-user bot management (uid supplied by the main site, which has
// already verified the caller's identity via its own requireAuth) ──────
app.get("/internal/bots/cap", async (req, res) => {
  try {
    const uid = req.query.uid;
    const isAdmin = req.query.isAdmin === "true";
    const [active, mine] = await Promise.all([countActiveBots(), countBotsForUser(uid)]);
    res.json({ active, max: MAX_ACTIVE_BOTS, mine, maxMine: isAdmin ? null : MAX_INSTANCES_PER_USER, isAdmin });
  } catch (err) {
    res.status(500).json({ error: "Could not load deployment capacity." });
  }
});

app.get("/internal/bots", async (req, res) => {
  try {
    const bots = await listBotsForUser(req.query.uid);
    res.json({ bots });
  } catch (err) {
    res.status(500).json({ error: "Could not load your deployments." });
  }
});

app.post("/internal/bots/deploy", async (req, res) => {
  try {
    const { uid, isAdmin, ...body } = req.body || {};
    const result = await deployBot(uid, body, isAdmin);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Deploy failed." });
  }
});

app.get("/internal/bots/:id/status", async (req, res) => {
  try {
    res.json(await getBotStatus(req.query.uid, req.params.id));
  } catch (err) {
    res.status(404).json({ error: err.message || "Deployment not found." });
  }
});

app.post("/internal/bots/:id/stop", async (req, res) => {
  try {
    res.json(await stopBot(req.body?.uid, req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not stop deployment." });
  }
});

app.post("/internal/bots/:id/restart", async (req, res) => {
  try {
    res.json(await restartBot(req.body?.uid, req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not restart deployment." });
  }
});

app.delete("/internal/bots/:id", async (req, res) => {
  try {
    res.json(await deleteBot(req.query.uid, req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not delete deployment." });
  }
});

// ── Admin (main site already verified the caller is an admin before
// calling any of these — this service just trusts the internal key) ────
app.get("/internal/admin/bots/users", async (req, res) => {
  try {
    res.json({ users: await adminListDeployingUsers() });
  } catch (err) {
    res.status(500).json({ error: "Could not load deploying users." });
  }
});

app.get("/internal/admin/bots/users/:uid", async (req, res) => {
  try {
    res.json({ bots: await adminListBotsForUser(req.params.uid) });
  } catch (err) {
    res.status(500).json({ error: "Could not load that user's deployments." });
  }
});

app.post("/internal/admin/bots/:id/stop", async (req, res) => {
  try {
    res.json(await adminStopBot(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not stop that deployment." });
  }
});

app.post("/internal/admin/bots/:id/restart", async (req, res) => {
  try {
    res.json(await adminRestartBot(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not restart that deployment." });
  }
});

app.delete("/internal/admin/bots/:id", async (req, res) => {
  try {
    res.json(await adminDeleteBot(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not delete that deployment." });
  }
});

app.get("/internal/admin/bots/template-status", async (req, res) => {
  try {
    res.json(await getTemplateStatus());
  } catch (err) {
    res.status(500).json({ error: "Could not check template status." });
  }
});

app.post("/internal/admin/bots/check-updates", async (req, res) => {
  try {
    res.json(await checkForUpdates());
  } catch (err) {
    res.status(500).json({ error: err.message || "Update check failed." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot service listening on port ${PORT}`);
  startBotUpdateChecker();
  restoreBotsOnBoot().catch((err) => console.error("Bot restore-on-boot failed:", err));
});
