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

// Without these, ANY unexpected error anywhere (not just the spawn one
// fixed in bots.js) crashes this whole process — which kills every
// currently-running bot at once and forces a full restart, exactly the
// "one deploy takes everyone else offline" problem. Log and keep running
// instead of going down.
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (service kept running):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (service kept running):", err);
});

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

// df on a shared host reports the WHOLE machine's disk, not this
// container's slice — that's why it showed ~84% full on both services
// regardless of how many bots were deployed. This measures the one thing
// that actually matters: how much space your bot deployments themselves
// are using (their downloaded template + session files).
function getBotDeploymentsUsage() {
  return new Promise((resolve) => {
    exec("du -sk .bot-deployments", (err, stdout) => {
      if (err) return resolve(0); // folder doesn't exist yet — nothing deployed
      const kb = parseInt(stdout.trim().split(/\s+/)[0], 10);
      resolve(Number.isFinite(kb) ? +(kb / 1024).toFixed(1) : 0);
    });
  });
}

app.get("/internal/system/storage", async (req, res) => {
  try {
    const [usedMB, active] = await Promise.all([getBotDeploymentsUsage(), countActiveBots()]);
    res.json({ usedMB, activeDeployments: active });
  } catch (err) {
    res.status(500).json({ error: "Could not read bot deployment storage." });
  }
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

  // Render tracks inactivity PER service — the main site staying awake
  // doesn't keep this one awake too. Set SELF_URL to this service's own
  // public Render URL (same idea as the main site's keep-alive) so it
  // doesn't spin down and cause the first bot deploy/action after a nap
  // to fail or time out.
  const SELF_URL = process.env.SELF_URL || `http://localhost:${PORT}`;
  setInterval(() => {
    fetch(`${SELF_URL}/internal/health`)
      .then(() => console.log("✅ Bot service self-ping OK"))
      .catch((err) => console.error("❌ Bot service self-ping failed:", err.message));
  }, 240000); // every 4 minutes
});
