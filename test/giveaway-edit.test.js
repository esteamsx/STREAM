import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync(new URL("../services/giveaway.js", import.meta.url), "utf8");
const routes = readFileSync(new URL("../routes/giveaway.js", import.meta.url), "utf8");
const admin = readFileSync(new URL("../views/admin.js", import.meta.url), "utf8");

test("admin giveaway editing changes only the active schedule and PIN", () => {
  assert.match(routes, /editGiveaway/);
  assert.match(routes, /\/api\/admin\/giveaway\/edit/);
  assert.match(service, /export async function editGiveaway\(\{ pin, endsAt, drawAt \}\)/);
  assert.match(service, /current\.status !== "open"/);
  assert.match(service, /tx\.update\(CONFIG_REF, \{/);
  assert.match(service, /pin: cleanPin/);
  assert.match(service, /endsAt: nextEndsAt/);
  assert.match(service, /drawAt: nextDrawAt/);
  assert.match(service, /drawDelayMinutes/);
  assert.doesNotMatch(service, /status: "open".*editGiveaway/);
  assert.match(admin, /id="gvEditBtn"/);
  assert.match(admin, /\/api\/admin\/giveaway\/edit/);
  assert.match(admin, /gvEditCloseAt/);
  assert.match(admin, /gvEditDrawAt/);
  assert.match(admin, /gvRun\(this, \(\) => postJSON\('\/api\/admin\/giveaway\/edit'/);
  assert.match(admin, /<span class="btn-spinner"><\/span>Please wait\.\.\./);
  assert.match(admin, /giveawayEditClose/);
  assert.match(admin, /giveawayEditDraw/);
});
