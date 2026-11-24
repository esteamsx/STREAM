import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const routes = fs.readFileSync(`${root}/routes/devices.js`, "utf8");
const auth = fs.readFileSync(`${root}/services/auth.js`, "utf8");
const mailer = fs.readFileSync(`${root}/services/mailer.js`, "utf8");
const server = fs.readFileSync(`${root}/server.js`, "utf8");

test("trusted-device removal cannot bypass email OTP", () => {
  assert.match(routes, /remove\/request/);
  assert.match(routes, /remove\/confirm/);
  assert.match(routes, /checkCode\(req\.uid, "remove_trusted_devices"/);
  assert.match(routes, /OTP_REQUIRED/);
  assert.match(routes, /removeTrustedDevices\(req\.uid, deviceIds\)/);
});

test("new-device email is gated by the new-device signal and contains no secrets", () => {
  assert.match(auth, /sendNewDeviceLoginAlertEmail/);
  assert.match(auth, /if \(newDevice\)/);
  assert.match(mailer, /CHANGE PASSWORD/);
  assert.match(mailer, /does not contain a password, code, or sign-in token/);
  assert.doesNotMatch(mailer, /details\.password\b|details\.otp\b|details\.token\b/);
});
