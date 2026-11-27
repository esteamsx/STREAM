import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = async (path) => readFile(new URL(path, import.meta.url), "utf8");
const [verifyView, accountView, server, auth, devices, payments, rewards, sharedVerifier, loginView, channelView, giveawayView] = await Promise.all([
  read("../views/verify.js"),
  read("../views/account.js"),
  read("../server.js"),
  read("../services/auth.js"),
  read("../routes/devices.js"),
  read("../routes/payments.js"),
  read("../routes/rewards.js"),
  read("../public/email-verification.js"),
  read("../views/login.js"),
  read("../views/channel-react.js"),
  read("../views/giveaway.js"),
]);

test("dedicated verifier maps each non-login email OTP purpose to its existing backend verifier", () => {
  const map = verifyView.match(/const flowConfig = \{([\s\S]*?)\n\};/)?.[1] || "";
  for (const purpose of ["protected_action_email", "add_email", "delete_account", "card_action", "trust_device_add", "trust_device_remove", "remove_trusted_devices", "password_reset"]) {
    assert.match(map, new RegExp(`${purpose}:`));
  }
  for (const endpoint of ["/api/email-verification/confirm", "/api/account/confirm-email", "/api/confirm-account-deletion", "/api/card-security/verify-otp", "/api/devices/trust/confirm", "/api/devices/trusted-group/remove/confirm", "/api/verify-email"]) {
    assert.ok(map.includes(endpoint), `missing endpoint mapping: ${endpoint}`);
  }
  assert.match(verifyView, /purpose === 'signup'/);
  assert.match(verifyView, /purpose === 'password_reset'/);
});

test("verification return navigation accepts only a same-origin relative path and callers return for an intentional retry", () => {
  assert.match(verifyView, /value\.startsWith\('\/'\) && !value\.startsWith\('\/\/'\) && !value\.includes\(String\.fromCharCode\(92\)\)/);
  assert.match(verifyView, /window\.location\.assign\(safeReturnTo\)/);
  assert.match(accountView, /currentOtpReturnPath\(\)/);
  assert.match(accountView, /window\.location\.assign\(await makeOtpVerifyUrl\(purpose/);
  assert.match(channelView, /purpose: 'protected_action_email'/);
  assert.match(giveawayView, /purpose: 'protected_action_email'/);
  assert.doesNotMatch(giveawayView, /onVerified: submitEntry/);
  assert.doesNotMatch(channelView, /onVerified: submit/);
});

test("verification URLs use session-bound 15-minute tokens and reject expired, consumed, or other-user links", () => {
  assert.match(auth, /OTP_LINK_TTL_MS = 15 \* 60 \* 1000/);
  assert.match(auth, /async function issueOtpVerificationLink/);
  assert.match(auth, /async function validateOtpVerificationLink/);
  assert.match(auth, /async function consumeOtpVerificationLink/);
  assert.match(auth, /data\.sid !== sid/);
  assert.match(server, /\/api\/otp-verification-link\/issue[\s\S]*?requireAuth, requireSiteOrigin/);
  assert.match(server, /\/api\/otp-verification-link\/validate[\s\S]*?OTP_LINK_EXPIRED/);
  assert.match(server, /\/api\/otp-verification-link\/consume/);
  assert.match(server, /app\.get\("\/verify", scrapeGate, async[\s\S]*?if \(!uid \|\| String\(req\.query\.uid/);
  assert.match(server, /const notFound = \(\) => notFoundHandler\(req, res\)/);
  assert.match(server, /if \(!valid\) return notFound\(\)/);
  assert.match(verifyView, /\/api\/otp-verification-link\/validate/);
  assert.match(verifyView, /\/api\/otp-verification-link\/consume/);
  assert.match(verifyView, /if \(!email && linkInfo\.email\)/);
  assert.match(verifyView, /label\.textContent = linkInfo\.email/);
  assert.match(verifyView, /Verification link expired/);
});

test("sensitive card, bank, CAPTCHA, and face payloads are not carried in verifier query parameters", () => {
  const helper = accountView.match(/function makeOtpVerifyUrl\([\s\S]*?\n\}/)?.[0] || "";
  assert.match(helper, /\/api\/otp-verification-link\/issue/);
  for (const secret of ["accountNumber", "bankName", "altcha", "faceDescriptor", "snapshot", "captcha"]) assert.doesNotMatch(helper, new RegExp(secret, "i"));
  assert.match(verifyView, /body\.faceDescriptor = capture/);
  assert.doesNotMatch(helper, /sessionStorage|localStorage/);
});

test("card and bank mutations require fresh CAPTCHA plus a one-use session-bound card-action grant", () => {
  assert.match(server, /app\.post\("\/api\/card-security\/verify-otp", requireAuth, requireSiteOrigin/);
  assert.match(server, /authorizeVerifiedOtpAction\(req\.uid, "card_action", sessionSid\(req\.cookies\?\.session\)\)/);
  assert.match(auth, /data\.sid !== sid/);
  assert.match(auth, /expiresAt = Date\.now\(\) \+ 5 \* 60 \* 1000/);
  assert.match(payments, /verifyCaptcha\.verifyOnly\(payload\)/);
  assert.match(payments, /consumeVerifiedOtpAction\(req\.uid, "card_action", sessionSid/);
  assert.match(rewards, /verifyCaptcha\.verifyOnly\(payload\)/);
  assert.match(rewards, /consumeVerifiedOtpAction\(req\.uid, "card_action", sessionSid/);
});

test("trusted device and group OTPs retain action-specific backend confirmation and Face ID checks", () => {
  assert.match(devices, /trust\/face-required/);
  assert.match(devices, /await verifyLoginFace\(req\.uid, probe\)/);
  assert.match(devices, /checkCode\(req\.uid, trusted \? "trust_device_add" : "trust_device_remove"/);
  assert.match(devices, /checkCode\(req\.uid, "remove_trusted_devices"/);
  assert.match(accountView, /purpose: 'remove_trusted_devices'/);
  assert.match(verifyView, /params\.get\('deviceIds'\)/);
});

test("login's new-device OTP remains on its existing callback-driven overlay flow", () => {
  assert.match(loginView, /ESTEmailVerification\.require\(\{[\s\S]*?requestCode: \(email\) => postJSON\('\/api\/device-login\/email\/request'/);
  assert.match(loginView, /confirmCode: \(code\) => postJSON\('\/api\/device-login\/email\/confirm'/);
  assert.match(sharedVerifier, /if \(options\.allowAddEmail \|\| options\.requestCode \|\| options\.confirmCode\)/);
  assert.match(sharedVerifier, /active = \{ resolve, reject, onVerified, requestCode: requestCodeHandler/);
  assert.doesNotMatch(loginView, /\/verify\?/);
});
