import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [loginView, server, auth, deviceSessions, deviceBans, otpDialog] = await Promise.all([
  read("../views/login.js"),
  read("../server.js"),
  read("../services/auth.js"),
  read("../services/device-sessions.js"),
  read("../routes/device-bans.js"),
  read("../public/email-verification.js"),
]);

test("email/password account creation is available without the old blur lock", () => {
  assert.doesNotMatch(loginView, /signup-blur-target|signup-lock-overlay|signupGoogleBtn|signupGithubBtn|signupTelegramBtn/);
  assert.match(loginView, /id="signupForm"/);
  assert.match(loginView, /id="signupVerifyOverlay"/);
  assert.match(loginView, /promptSignupVerification\(email\)/);
});

test("a new browser must pass Face ID and then email OTP before a session is created", () => {
  assert.match(deviceBans, /await verifyLoginFace\(uid, probe\);[\s\S]*?req\.deviceFaceVerified = true/);
  const sessionStart = server.indexOf('app.post("/api/session"');
  const otpRouteStart = server.indexOf('app.post("/api/device-login/email/request"');
  const sessionFlow = server.slice(sessionStart, otpRouteStart);
  const positions = [
    sessionFlow.indexOf("enforceLoginDevice(req, decoded.uid)"),
    sessionFlow.indexOf("if (req.deviceFaceVerified === true)"),
    sessionFlow.indexOf("issueDeviceEmailLogin(decoded.uid, remember, authTimeMs)"),
    sessionFlow.indexOf("if (profile?.twoFactorEnabled)"),
    sessionFlow.indexOf("createDeviceSession(decoded.uid"),
  ];
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(loginView, /requiresDeviceEmailVerification/);
  assert.match(loginView, /allowAddEmail: true/);
});

test("pre-login OTP endpoints are origin-protected and email addition preserves the account UID", () => {
  const requestStart = server.indexOf('app.post("/api/device-login/email/request"');
  const confirmStart = server.indexOf('app.post("/api/device-login/email/confirm"');
  const exchangeStart = server.indexOf('app.post("/api/session/exchange"');
  const request = server.slice(requestStart, confirmStart);
  const confirm = server.slice(confirmStart, exchangeStart);
  assert.match(request, /requireSiteOrigin, emailCodeLimiter/);
  assert.match(request, /EMAIL_REQUIRED/);
  assert.match(request, /assertEmailAvailableForUid/);
  assert.match(request, /issueCode\(pending\.uid, email, "new_device_login"\)/);
  assert.match(confirm, /requireSiteOrigin, emailCodeLimiter/);
  assert.ok(confirm.indexOf('checkCode(pending.uid, "new_device_login"') < confirm.indexOf("firebaseAuth.updateUser(pending.uid"));
  assert.match(confirm, /assertEmailAvailableForUid/);
  assert.match(confirm, /firebaseAuth\.updateUser\(pending\.uid, \{ email, emailVerified: true \}\)/);
  assert.match(confirm, /updateUserProfile\(pending\.uid,\s*\{[\s\S]*?emailVerificationSource: "otp"/);
  assert.match(confirm, /createDeviceSession\(pending\.uid, req, res, \{ trustedOverride: true/);
  assert.match(auth, /device_email_logins/);
  assert.match(auth, /issueDeviceEmailLogin,\s*getDeviceEmailLogin,\s*setDeviceEmailLoginEmail,\s*deleteDeviceEmailLogin/);
});

test("each browser receives its own trust cookie only after completing the Face ID and email checks", () => {
  assert.match(deviceSessions, /DEVICE_COOKIE = "es_did"/);
  assert.match(deviceSessions, /TRUSTED\)\.doc\(uid \+ "_" \+ deviceId\)/);
  assert.match(deviceSessions, /Browser profiles are separate security contexts/);
  assert.match(otpDialog, /allowAddEmail/);
  assert.match(otpDialog, /EMAIL_REQUIRED/);
  assert.match(otpDialog, /esVerifyEmailInput/);
});
