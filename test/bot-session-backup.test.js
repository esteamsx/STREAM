import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSessionBackupIntervalMs } from "../bot-service/runtime-config.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

test("bot service uses the existing shared Firebase service-account environment variable", () => {
  const firebase = read("../bot-service/bot-firebase.js");
  assert.match(firebase, /process\.env\.FIREBASE_SERVICE_ACCOUNT_KEY/);
  assert.doesNotMatch(firebase, /BOT_FIREBASE_SERVICE_ACCOUNT_KEY/);
  assert.match(firebase, /admin\.initializeApp\(/);
  assert.match(firebase, /admin\.firestore\(\)/);
});

test("bot API-key settings and connected-bot lookup remain on the site's existing Firestore path", () => {
  const site = read("../server.js");
  const botService = read("../bot-service/bot-server.js");
  assert.match(site, /const BOT_DEPLOY_API_KEY_SETTINGS = db\.collection\("botServiceSettings"\)\.doc\("deploy"\)/);
  assert.match(site, /BOT_DEPLOY_API_KEY_SETTINGS\.get\(\)/);
  assert.match(site, /BOT_DEPLOY_API_KEY_SETTINGS\.set\(\{ esTeamsApiKey: apiKey/);
  assert.match(site, /db\.collection\("botDeployments"\)\.where\("status", "==", "connected"\)/);
  assert.doesNotMatch(botService, /\/internal\/bots\/connected|\/internal\/admin\/deploy-api-key/);
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
  assert.match(bots, /setInterval\(\(\) => backupSessionFiles\(workDir, botId, entry\)\.catch\(\(\) => \{\}\), SESSION_BACKUP_INTERVAL_MS\)/);
});

test("session backups coalesce overlapping snapshots and take a fresh snapshot on process exit", () => {
  const bots = read("../bot-service/bots.js");
  assert.match(bots, /if \(entry\.backupInFlight\) return entry\.backupInFlight/);
  assert.match(bots, /backupSessionFilesOnExit\(workDir, botId, entry\)\.finally\(\(\) =>/);
  const exitBackup = bots.slice(bots.indexOf("async function backupSessionFilesOnExit"), bots.indexOf("async function runDeployment"));
  assert.match(exitBackup, /attempt < 2/);
  assert.match(exitBackup, /await backupSessionFiles\(workDir, botId, entry\)/);
  const backup = bots.slice(bots.indexOf("async function backupSessionFilesOnce"), bots.indexOf("function backupSessionFiles("));
  assert.doesNotMatch(backup, /collection\("botDeployments"\)\.doc\(botId\)\.update/);
});

test("a failed session-file batch is not marked as successfully backed up", () => {
  const bots = read("../bot-service/bots.js");
  const backup = bots.slice(bots.indexOf("async function backupSessionFilesOnce"), bots.indexOf("function backupSessionFiles("));
  assert.match(backup, /await batch\.commit\(\)/);
  assert.match(backup, /catch \(err\) \{\s*console\.error\(`Session backup failed for \$\{botId\}:`, err\.message\);\s*return;\s*\}/);
  const failureAt = backup.indexOf("Session backup failed for");
  assert.ok(backup.indexOf("return;", failureAt) < backup.indexOf("entry.lastBackupSignature = signature", failureAt));
});
