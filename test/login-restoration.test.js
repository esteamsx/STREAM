import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loginSource = await readFile(new URL("../views/login.js", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");

test("login page no longer displays the obsolete OTP-unavailable warning", () => {
  assert.doesNotMatch(loginSource, /Manual OTP Verification is Currently Unavailable/i);
  assert.match(loginSource, /id="loginForm"/);
  assert.match(loginSource, /id="loginAltcha"/);
});

test("existing password session and authenticator 2FA protections remain enabled", () => {
  assert.match(loginSource, /firebaseSignInResilient/);
  assert.match(loginSource, /\/api\/session/);
  assert.match(loginSource, /\/api\/2fa\/login-verify/);
  assert.match(serverSource, /app\.post\("\/api\/session", requireSiteOrigin, passwordLoginLimiter/);
  assert.match(serverSource, /firebaseAuth\.verifyIdToken\(idToken\)/);
  assert.match(serverSource, /getTwoFactorPendingLogin\(pendingToken\)/);
  assert.match(serverSource, /verifyTwoFactorCode\(pending\.uid, code\)/);
});
