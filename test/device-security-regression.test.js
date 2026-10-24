import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const auth = fs.readFileSync(new URL("../services/auth.js", import.meta.url), "utf8");
const sessions = fs.readFileSync(new URL("../services/device-sessions.js", import.meta.url), "utf8");
const login = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
const bans = fs.readFileSync(new URL("../routes/device-bans.js", import.meta.url), "utf8");
const devices = fs.readFileSync(new URL("../routes/devices.js", import.meta.url), "utf8");
const navigation = fs.readFileSync(new URL("../middleware/navigation.js", import.meta.url), "utf8");

assert.ok(root.endsWith("/STREAM/"));

test("new devices with enrolled Face ID require a probe before login", () => {
  assert.match(bans, /isTrustedDevice\(uid, deviceId\)/);
  assert.match(bans, /userHasFaceId\(uid\)/);
  assert.match(bans, /device\/face-required/);
  assert.match(bans, /verifyLoginFace\(uid, probe\)/);
  assert.match(login, /trustedOverride: req\.deviceFaceVerified === true/);
});

test("successful login Face ID promotes only the current device session", () => {
  assert.match(sessions, /trustedOverride = false/);
  assert.match(sessions, /trustedOverride/);
  assert.match(sessions, /uid \+ "_" \+ deviceId/);
  assert.match(auth, /deviceFaceVerified: deviceFaceVerified === true/);
});

test("session replay is bound to the HttpOnly device cookie and failures fail closed", () => {
  assert.match(auth, /checkDeviceSession\(payload\.sid, payload\.uid, req\?\.cookies\?\.es_did \?\? null\)/);
  assert.match(sessions, /rec\.deviceId !== deviceId/);
  assert.match(sessions, /check failed; rejecting session/);
  assert.doesNotMatch(auth, /could not record device, using plain session/);
});

test("protected pages and APIs use request-bound session verification", () => {
  assert.match(auth, /verifySession\(sessionId, req\)/);
  assert.match(navigation, /verifySession\(sessionId, req\)/);
  assert.match(login, /const uid = await verifySession\(sessionId, req\);/);
});

test("an existing session cannot elevate to trusted without Face ID", () => {
  assert.match(devices, /userHasFaceId\(req\.uid\)/);
  assert.match(devices, /device\/face-required/);
  assert.match(devices, /verifyLoginFace\(req\.uid, probe\)/);
});

test("2FA preserves the Face ID decision and uses same-origin protection", () => {
  assert.match(login, /issueTwoFactorPendingLogin\(decoded\.uid, remember, req\.deviceFaceVerified === true\)/);
  assert.match(login, /app\.post\("\/api\/2fa\/login-verify", requireSiteOrigin/);
  assert.match(login, /trustedOverride: pending\.deviceFaceVerified === true/);
});
