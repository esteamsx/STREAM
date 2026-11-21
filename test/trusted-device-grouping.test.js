import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [sessions, routes, account] = await Promise.all([
  read("../services/device-sessions.js"),
  read("../routes/devices.js"),
  read("../views/account.js"),
]);

test("trusted phone profiles group by reported model and OS, not browser", () => {
  const start = sessions.indexOf("function trustedDeviceGroupKey(device)");
  const end = sessions.indexOf("export async function setTrusted", start);
  const groupKey = sessions.slice(start, end);
  assert.match(groupKey, /device\.model/);
  assert.match(groupKey, /device\.os/);
  assert.doesNotMatch(groupKey, /device\.browser/);
  assert.match(sessions, /Browser profiles are separate security contexts/);
  assert.match(sessions, /doc\(uid \+ "_" \+ deviceId\)/);
});

test("grouped phone rows list browser profiles and allow friendly names and group revocation", () => {
  assert.match(sessions, /browsers: \[\]/);
  assert.match(sessions, /deviceIds: \[\]/);
  assert.match(account, /Name this phone/);
  assert.match(account, /trusted-group\/remove/);
  assert.match(account, /deviceIds\.length \+ \(deviceIds\.length === 1 \? ' browser profile' : ' browser profiles'\)/);
});

test("trusted group updates are authenticated and limited to the account's own trusted records", () => {
  assert.match(routes, /devicesRouter\.post\("\/api\/devices\/trusted-group\/name", requireAuth/);
  assert.match(routes, /devicesRouter\.post\("\/api\/devices\/trusted-group\/remove", requireAuth/);
  assert.match(sessions, /snap\.data\(\)\.uid !== uid \|\| snap\.data\(\)\.trusted !== true/);
  assert.match(sessions, /cleanLabel = clip\(label, 48\)/);
});

test("trusted-device accordion contains its scrollable lists without overflowing adjacent cards", () => {
  assert.match(account, /\.tfa-card\.open \.tfa-body\{max-height:500px;overflow:visible\}[\s\S]*?#devicesCard\.open \.tfa-body\{max-height:1200px\}/);
  assert.match(account, /\.dev-scroll\{max-height:260px;overflow-y:auto/);
});
