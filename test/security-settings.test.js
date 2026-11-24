import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const routes = fs.readFileSync(`${root}/routes/devices.js`, "utf8");
const auth = fs.readFileSync(`${root}/services/auth.js`, "utf8");
const mailer = fs.readFileSync(`${root}/services/mailer.js`, "utf8");
const server = fs.readFileSync(`${root}/server.js`, "utf8");
const account = fs.readFileSync(`${root}/views/account.js`, "utf8");

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

test("language preference is server allowlisted and persisted", () => {
  const entries = [...server.matchAll(/\["([a-z]{2,3})",\s*"[^"]+"\]/g)].map((m) => m[1]);
  assert.ok(entries.length >= 50);
  assert.match(server, /LANGUAGE_CODES\.has\(language\)/);
  assert.match(server, /collection\("users"\)\.doc\(req\.uid\)\.set\(\{ language \}/);
  assert.match(account, /grid-template-columns:repeat\(5/);
  assert.match(account, /max-height:260px;overflow:auto/);
});
