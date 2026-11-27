import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assertEmailAvailableForUid,
  getVerifiedGithubEmail,
  getVerifiedGoogleEmail,
} from "../services/provider-email.js";
import { isRecentAuthentication, normalizeFirebaseAuthTime } from "../services/recent-auth.js";

const authSource = await readFile(new URL("../services/auth.js", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../server.js", import.meta.url), "utf8");
const adminSource = await readFile(new URL("../views/admin.js", import.meta.url), "utf8");
const accountSource = await readFile(new URL("../views/account.js", import.meta.url), "utf8");
const channelRouterSource = await readFile(new URL("../routes/channel-tools.js", import.meta.url), "utf8");
const giveawayRouterSource = await readFile(new URL("../routes/giveaway.js", import.meta.url), "utf8");
const channelViewSource = await readFile(new URL("../views/channel-react.js", import.meta.url), "utf8");
const giveawayViewSource = await readFile(new URL("../views/giveaway.js", import.meta.url), "utf8");
const rewardsRouterSource = await readFile(new URL("../routes/rewards.js", import.meta.url), "utf8");
const paymentsRouterSource = await readFile(new URL("../routes/payments.js", import.meta.url), "utf8");

test("Google email is trusted only from a non-empty server-verified email_verified claim", () => {
  assert.equal(getVerifiedGoogleEmail({ email: "  Person@Example.com ", email_verified: true }), "person@example.com");
  assert.equal(getVerifiedGoogleEmail({ email: "person@example.com", email_verified: false }), null);
  assert.equal(getVerifiedGoogleEmail({ email: "person@example.com", emailVerified: true }), null);
  assert.equal(getVerifiedGoogleEmail({ email: "not-an-email", email_verified: true }), null);
});

test("GitHub email selection requires verified API entries and prefers a verified primary", () => {
  assert.equal(getVerifiedGithubEmail([
    { email: "profile@example.com", primary: true, verified: false },
    { email: "other@example.com", primary: true, verified: true },
    { email: "verified@example.com", primary: false, verified: true },
  ]), "other@example.com");
  assert.equal(getVerifiedGithubEmail([
    { email: "public@example.com", primary: true, verified: false },
  ]), null);
  assert.equal(getVerifiedGithubEmail(null), null);
});

test("email association preserves the current UID and never silently assigns an address owned by another account", async () => {
  const lookup = async () => ({ uid: "current-account" });
  assert.equal((await assertEmailAvailableForUid(lookup, "person@example.com", "current-account")).uid, "current-account");
  await assert.rejects(
    assertEmailAvailableForUid(async () => ({ uid: "other-account" }), "person@example.com", "current-account"),
    (error) => error.code === "email-already-in-use" && error.status === 409,
  );
  assert.equal(await assertEmailAvailableForUid(async () => { throw { code: "auth/user-not-found" }; }, "person@example.com", "current-account"), null);
  await assert.rejects(
    assertEmailAvailableForUid(async () => { throw new Error("lookup unavailable"); }, "person@example.com", "current-account"),
    /lookup unavailable/,
  );
});

test("old Firebase auth_time cannot be made fresh by minting a new server session", () => {
  const now = 1_800_000_000_000;
  const oldAuthentication = { iat: now, authTimeMs: now - 11 * 60 * 1000 };
  const freshAuthentication = { iat: now, authTimeMs: now - 2 * 60 * 1000 };
  assert.equal(isRecentAuthentication(oldAuthentication, now), false);
  assert.equal(isRecentAuthentication(freshAuthentication, now), true);
  assert.equal(normalizeFirebaseAuthTime(now / 1000, now), now);
  assert.equal(normalizeFirebaseAuthTime(undefined, now), null);
  assert.equal(normalizeFirebaseAuthTime((now + 60_000) / 1000, now), null);
});

test("provider login and account email edits remain server-authoritative and keep the same UID", () => {
  assert.match(serverSource, /firebaseAuth\.verifyIdToken\(idToken\)/);
  assert.match(serverSource, /normalizeFirebaseAuthTime\(decoded\.auth_time\)/);
  assert.match(serverSource, /getVerifiedGithubEmail\(emails\)/);
  assert.doesNotMatch(serverSource, /let email = ghUser\.email/);
  assert.match(serverSource, /app\.post\("\/api\/account\/request-email", requireAuth, requireRecentAuthentication/);
  assert.match(serverSource, /app\.post\("\/api\/account\/confirm-email", requireAuth, requireRecentAuthentication/);
  assert.match(serverSource, /firebaseAuth\.updateUser\(req\.uid, \{ email, emailVerified: true \}\)/);
  assert.match(serverSource, /assertEmailAvailableForUid\(/);
  assert.match(authSource, /decodedToken\.uid/);
  assert.match(authSource, /emailVerificationSource: "otp"/);
  assert.match(authSource, /\["google", "github"\]\.includes\(provider\)/);
  assert.match(accountSource, /Change Email/);
  assert.match(accountSource, /\/api\/account\/request-email/);
  assert.match(accountSource, /\/api\/account\/confirm-email/);
});

test("Telegram and email/password login remain available without an email-verification gate", () => {
  const telegramStart = serverSource.indexOf('app.get("/api/telegram-auth/callback"');
  const githubStart = serverSource.indexOf("const GITHUB_CLIENT_ID", telegramStart);
  const telegramFlow = serverSource.slice(telegramStart, githubStart);
  const sessionStart = serverSource.indexOf('app.post("/api/session"');
  const sessionEnd = serverSource.indexOf('app.post("/api/session/exchange"', sessionStart);
  const sessionFlow = serverSource.slice(sessionStart, sessionEnd);
  assert.match(telegramFlow, /verifyTelegramIdToken\(tokenData\.id_token/);
  assert.match(telegramFlow, /createOrGetTelegramUser\(/);
  assert.match(telegramFlow, /createCustomToken\(uid\)/);
  assert.match(authSource, /provider: "telegram"[\s\S]*?emailVerified: false/);
  assert.match(sessionFlow, /decoded\.firebase\.sign_in_provider === "password"/);
  assert.match(sessionFlow, /createDeviceSession\(decoded\.uid/);
  assert.doesNotMatch(sessionFlow, /isEmailVerifiedForUser/);
});

test("high-value ALTCHA actions validate, verify email, then consume the proof before acting", () => {
  const channelStart = channelRouterSource.indexOf("async function paidJob(");
  const channelEnd = channelRouterSource.indexOf('router.post("/api/wa/react"', channelStart);
  const channelFlow = channelRouterSource.slice(channelStart, channelEnd);
  const giveawayStart = giveawayRouterSource.indexOf('router.post("/api/giveaway/enter"');
  const giveawayEnd = giveawayRouterSource.indexOf('router.get("/api/admin/giveaway"', giveawayStart);
  const giveawayFlow = giveawayRouterSource.slice(giveawayStart, giveawayEnd);
  const ordered = (source, first, second, third, fourth) => {
    const positions = [first, second, third, fourth].map((needle) => source.indexOf(needle));
    assert.ok(positions.every((position) => position >= 0));
    assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  };
  ordered(channelFlow, "const captchaValid = await verifyCaptcha.verifyOnly", "if (!(await isEmailVerifiedForUser", "if (!(await verifyCaptcha.consumeVerified", "checkAndIncrementDailyLimit");
  ordered(giveawayFlow, "const valid = await verifyCaptcha.verifyOnly", "if (!(await isEmailVerifiedForUser", "if (!(await verifyCaptcha.consumeVerified", "enterGiveaway(req.uid");
  assert.match(channelViewSource, /ESTEmailVerification\.require\(\{ email: err\.email, onVerified: submit \}\)/);
  assert.match(giveawayViewSource, /ESTEmailVerification\.require\(\{ email: err\.email, onVerified: submitEntry \}\)/);
});

test("card mutations require ALTCHA plus a fresh one-time email OTP", () => {
  for (const routeSource of [rewardsRouterSource, paymentsRouterSource]) {
    assert.match(routeSource, /verifyCaptcha\.verifyOnly\(payload\)/);
    assert.match(routeSource, /checkCode\(req\.uid, "card_action", req\.body\?\.emailOtp\)/);
    assert.match(routeSource, /verifyCaptcha\.consumeVerified\(payload\)/);
  }
  assert.match(rewardsRouterSource, /router\.post\("\/api\/rewards\/bank-details"[\s\S]*?verifyCardAction/);
  assert.match(rewardsRouterSource, /router\.post\("\/api\/rewards\/bank-details\/delete"[\s\S]*?verifyCardAction/);
  assert.match(paymentsRouterSource, /router\.post\("\/api\/billing\/card\/remove"[\s\S]*?requireSiteOrigin/);
  assert.match(serverSource, /app\.post\("\/api\/card-security\/request-otp"[\s\S]*?issueCode\(req\.uid, email, "card_action"\)/);
  assert.match(authSource, /tx\.delete\(ref\)[\s\S]*?result = \{ ok: true, email: data\.email \}/);
  assert.match(accountSource, /openFreshCardEmailVerificationOverlay/);
  assert.match(accountSource, /code === 'EMAIL_REQUIRED'/);
  assert.match(accountSource, /emailOtp: cardOtp/);
});

test("card OTP verification surfaces invalid or expired codes in the modal for retry", () => {
  assert.match(accountSource, /pending\.freshCardOtp && \/security code\|verification code\|code expired\|incorrect code\|invalid code\/i/);
  assert.match(accountSource, /That code could not be verified\. Request a new one and try again\./);
  assert.match(accountSource, /Verify code & continue/);
  assert.match(accountSource, /function runEmailOtpAction/);
  assert.match(accountSource, /30000, true/);
  assert.doesNotMatch(accountSource, /ESTEmailVerification\.require/);
});

test("Admin J is server-locked behind the current admin's Face ID", () => {
  assert.match(serverSource, /const cachedAdminLockHtml = renderAdminLock\(authPageConfig\)/);
  assert.match(serverSource, /res\.send\(await hasAdminFaceUnlock\(req\) \? cachedAdminHtml : cachedAdminLockHtml\)/);
  assert.match(serverSource, /app\.post\("\/api\/admin\/face-unlock", facescanVerifyLimiter, requireSiteOrigin, requireAuth, requireAdminIdentity/);
  assert.match(serverSource, /const matchedUid = await matchFaceScan\(req\.body\?\.descriptor\)/);
  assert.match(serverSource, /matchedUid !== req\.uid/);
  assert.match(serverSource, /tokenHash: hashAdminFaceUnlock\(token\)/);
  assert.match(serverSource, /sessionHash: hashAdminFaceUnlock\(sessionId\)/);
  assert.match(serverSource, /if \(\!\(await hasAdminFaceUnlock\(req\)\)\) return res\.status\(423\)/);
  assert.match(serverSource, /res\.set\("Cache-Control", "private, no-store"\)/);
  assert.match(adminSource, /const dashboard = renderAdmin\(cfg\)/);
  assert.match(adminSource, /captureFaceDescriptor\(\{/);
  assert.match(adminSource, /requireLiveness:false,[\s\S]*?showCamera:false,[\s\S]*?voice:false/);
  assert.match(adminSource, /window.location.replace\('\/admin'\)/);
  assert.doesNotMatch(adminSource, /localStorage\.setItem|sessionStorage\./);
});
