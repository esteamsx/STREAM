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

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (service kept running):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (service kept running):", err);
});

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
if (!INTERNAL_API_KEY) {
  console.error("FATAL: INTERNAL_API_KEY is not set. Refusing to start with an unprotected bot service.");
  process.exit(1);
}

app.use((req, res, next) => {
  if (req.path === "/internal/health") return next();
  if (req.get("x-internal-key") !== INTERNAL_API_KEY) return res.status(401).json({ error: "Unauthorized." });
  next();
});

app.get("/internal/health", (req, res) => res.status(200).send("ok"));

function getBotDeploymentsUsage() {
  return new Promise((resolve) => {
    exec("du -sk .bot-deployments", (err, stdout) => {
      if (err) return resolve(0);
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
