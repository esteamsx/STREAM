import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const weeklyClient = readFileSync(new URL("../public/weekly-rewards.js", import.meta.url), "utf8");
const weeklyRoute = readFileSync(new URL("../routes/weekly-activity.js", import.meta.url), "utf8");
const rewardsRoute = readFileSync(new URL("../routes/rewards.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");

test("Weekly Rewards is independent of Daily Face ID and uses ALTCHA", () => {
  assert.doesNotMatch(weeklyClient, /claim-face|face-scan|facescan|requestMedia|getUserMedia|camera/i);
  assert.match(weeklyClient, /weekly-activity\/claim/);
  assert.match(weeklyClient, /altcha/);
  assert.doesNotMatch(weeklyRoute, /verifyFaceId|faceDescriptor|facescan/i);
  assert.match(weeklyRoute, /verifyCaptcha\(req\.body\?\.altcha\)/);
  assert.doesNotMatch(rewardsRoute, /verifyWeeklyActivityFace/);
  assert.match(weeklyClient, /location\.pathname === "\/account"/);
  assert.match(weeklyClient, /accountPage \? null : buildUi\(\)/);
  assert.doesNotMatch(account, /weekly-rewards\.js.*getUserMedia|weekly-rewards\.js.*requestMedia/i);
});
