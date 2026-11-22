import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSessionBackupIntervalMs } from "../bot-service/runtime-config.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("bot Firebase Admin uses a required bot-project credential, not the site's credential", () => {
  const firebase = read("../bot-service/bot-firebase.js");
  assert.match(firebase, /process\.env\.BOT_FIREBASE_SERVICE_ACCOUNT_KEY/);
  assert.match(firebase, /admin\.initializeApp\([\s\S]*?"es-teams-bot-database"/);
  assert.match(firebase, /admin\.firestore\(app\)/);
  assert.doesNotMatch(firebase, /process\.env\.FIREBASE_SERVICE_ACCOUNT_KEY/);
});

test("main-site bot API-key and connected-bot lookups are relayed to the bot service", () => {
  const site = read("../server.js");
  const botService = read("../bot-service/bot-server.js");
  assert.match(site, /botServiceFetch\("\/internal\/admin\/deploy-api-key"\)/);
  assert.match(site, /method: "PUT"[\s\S]*?body: JSON\.stringify\(\{ apiKey, updatedBy: req\.uid \}\)/);
  assert.match(site, /botServiceFetch\("\/internal\/bots\/connected"\)/);
  assert.doesNotMatch(site, /db\.collection\("botDeployments"\)|db\.collection\("botServiceSettings"\)/);
  assert.match(botService, /app\.get\("\/internal\/bots\/connected"/);
  assert.match(botService, /app\.get\("\/internal\/admin\/deploy-api-key"/);
  assert.match(botService, /app\.put\("\/internal\/admin\/deploy-api-key"/);
  assert.match(botService, /esTeamsApiKey: apiKey/);
});

test("bot Firestore migration copies only bot deployments, session files, and the deploy-key setting", () => {
  const migration = read("../bot-service/scripts/migrate-bot-firestore.js");
  assert.match(migration, /collection\("botDeployments"\)/);
  assert.match(migration, /collection\("sessionFiles"\)/);
  assert.match(migration, /collection\("botServiceSettings"\)\.doc\("deploy"\)/);
  assert.match(migration, /refusing to overwrite it/);
  assert.doesNotMatch(migration, /writer\.delete\(|targetDb[\s\S]{0,80}\.delete\(/);
});

test("session backup defaults to 15 minutes and accepts only 1 minute to 1 hour", () => {
  assert.equal(parseSessionBackupIntervalMs(undefined), 15 * 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("900000"), 15 * 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("60000"), 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("3600000"), 60 * 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("59999"), 15 * 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("3600001"), 15 * 60 * 1000);
  assert.equal(parseSessionBackupIntervalMs("not-a-number"), 15 * 60 * 1000);
});

test("bot session backup timer uses the configurable interval", () => {
  const bots = read("../bot-service/bots.js");
  assert.match(bots, /parseSessionBackupIntervalMs\(process\.env\.BOT_SESSION_BACKUP_INTERVAL_MS\)/);
  assert.match(bots, /setInterval\(\(\) => backupSessionFiles\(workDir, botId, entry\), SESSION_BACKUP_INTERVAL_MS\)/);
});
