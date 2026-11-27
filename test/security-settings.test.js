import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const routes = fs.readFileSync(`${root}/routes/devices.js`, "utf8");
const auth = fs.readFileSync(`${root}/services/auth.js`, "utf8");
const mailer = fs.readFileSync(`${root}/services/mailer.js`, "utf8");
const server = fs.readFileSync(`${root}/server.js`, "utf8");
const account = fs.readFileSync(`${root}/views/account.js`, "utf8");
const siteUi = fs.readFileSync(`${root}/public/site-ui.js`, "utf8");

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

test("trusting or untrusting the current device requires an email OTP", () => {
  assert.match(routes, /\/api\/devices\/trust\/request[\s\S]*?issueCode\(req\.uid, email, req\.body\.trusted \? "trust_device_add" : "trust_device_remove"\)/);
  assert.match(routes, /\/api\/devices\/trust\/confirm[\s\S]*?checkCode\(req\.uid, trusted \? "trust_device_add" : "trust_device_remove", req\.body\?\.code\)/);
  assert.match(routes, /\/api\/devices\/trust", requireAuth[\s\S]*?status\(410\)[\s\S]*?OTP_REQUIRED/);
  assert.match(account, /\/api\/devices\/trust\/request/);
  assert.match(account, /\/api\/devices\/trust\/confirm/);
  assert.match(account, /Verify & trust device/);
  assert.match(account, /Verify & remove trust/);
  assert.match(siteUi, /\/api\/devices\/trust\/request/);
  assert.match(siteUi, /window\.ESTEmailVerification\.require/);
});
