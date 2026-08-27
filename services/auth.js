import crypto from "crypto";
import admin from "firebase-admin";
import * as OTPAuth from "otpauth";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { db, auth } from "../config/firebase.js";
import { VERIFICATION_PRICE_NGN } from "./paystack.js";
import { sendVerificationCode, sendBanNotificationEmail, sendWithdrawalRequestEmail } from "./mailer.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const ADMIN_EMAIL = "etimpaschal95@gmail.com";
function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

function isVerificationActive(data) {
  if (!data || !data.verified) return false;
  if (!data.verifiedExpiresAt) return true;
  return Date.now() < data.verifiedExpiresAt;
}

async function autoFollowAdmin(newUid, newUserEmail) {
  try {
    if (isAdminEmail(newUserEmail)) return;
    const snap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    if (snap.empty) return;
    const adminUid = snap.docs[0].id;
    await followUser(newUid, adminUid);
  } catch {
  }
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function issueCode(uid, contact, purpose, channel = "email") {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  await db.collection("verification_codes").doc(`${uid}_${purpose}`).set({
    code,
    email: channel === "email" ? contact : null,
    expiresAt,
  });
  if (channel === "telegram") return sendTelegramCode(contact, code, purpose);
  return sendVerificationCode(contact, code, purpose);
}

async function sendTelegramCode(telegramId, code, purpose) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    const err = new Error("Telegram sign-in isn't configured.");
    err.userFacing = true;
    throw err;
  }
  const actions = { delete_account: "delete your account" };
  const action = actions[purpose] || "verify this request";
  const minutes = Math.round(CODE_TTL_MS / 60000);
  const text = `Your ES TEAMS TV verification code is ${code}\n\nUse this to ${action}. It expires in ${minutes} minutes. If you didn't request this, you can ignore this message.`;
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: telegramId, text }),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  if (!data || !data.ok) {
    const err = new Error("Could not send the code via Telegram. Make sure you've started a chat with our bot, then try again.");
    err.userFacing = true;
    throw err;
  }
  return { provider: "telegram" };
}

async function checkCode(uid, purpose, code) {
  const ref = db.collection("verification_codes").doc(`${uid}_${purpose}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" };
  const data = snap.data();
  if (Date.now() > data.expiresAt) {
    await ref.delete();
    return { ok: false, reason: "expired" };
  }
  if (data.code !== code) return { ok: false, reason: "mismatch" };
  await ref.delete();
  return { ok: true, email: data.email };
}

async function createUserAccount({ firstName, lastName, email, password, username }) {
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: `${firstName} ${lastName}`,
    emailVerified: false,
  });
  const referralCode = await generateReferralCode();
  await db.collection("users").doc(userRecord.uid).set({
    firstName,
    lastName,
    email,
    username: username || "",
    provider: "password",
    emailVerified: false,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    createdAt: Date.now(),
    referralCode,
  });
  await autoFollowAdmin(userRecord.uid, email);
  return userRecord.uid;
}

async function findUserByUsername(username) {
  if (!username) return null;
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

async function isUsernameAvailable(username, excludeUid) {
  if (!username) return false;
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  if (!snap.empty) {
    const doc = snap.docs[0];
    if (doc.id !== excludeUid && !doc.data().pendingDeletion) return false;
  }
  const altSnap = await db.collection("users").where("altUsernames", "array-contains", username).limit(1).get();
  if (!altSnap.empty && altSnap.docs[0].id !== excludeUid) return false;
  return true;
}

async function isUsernamePending(username, excludeEmail) {
  if (!username) return false;
  const snap = await db.collection("pending_signups").where("username", "==", username).limit(1).get();
  if (snap.empty) return false;
  const doc = snap.docs[0];
  if (doc.id === excludeEmail) return false;
  const data = doc.data();
  if (Date.now() > data.expiresAt) {
    await doc.ref.delete().catch(() => {});
    return false;
  }
  return true;
}

async function generateUniqueUsername(base) {
  let clean = String(base || "user").toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!clean) clean = "user";
  if (clean.length > 15) clean = clean.slice(0, 15);
  if (clean.length < 3) clean = clean.padEnd(3, "0");

  if ((await isUsernameAvailable(clean)) && !(await isUsernamePending(clean))) {
    return clean;
  }
  for (let i = 2; i <= 999; i++) {
    const candidate = (clean + i).slice(0, 20);
    if ((await isUsernameAvailable(candidate)) && !(await isUsernamePending(candidate))) {
      return candidate;
    }
  }
  return (clean.slice(0, 14) + Math.floor(1000 + Math.random() * 9000)).slice(0, 20);
}

async function upsertUserProfile(uid, data) {
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (snap.exists) await ref.update(data);
  else await ref.set({ ...data, createdAt: Date.now() });
}

async function issuePendingSignup({ firstName, lastName, email, username, password, referredByCode }) {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  await db.collection("pending_signups").doc(email).set({ firstName, lastName, email, username, password, referredByCode: referredByCode || null, code, expiresAt });
  await sendVerificationCode(email, code, "signup");
}

async function resendPendingSignupCode(email) {
  const ref = db.collection("pending_signups").doc(email);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("No pending signup found for this email.");
  const data = snap.data();
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  await ref.set({ ...data, code, expiresAt });
  await sendVerificationCode(email, code, "signup");
}

async function checkPendingSignupCode(email, code) {
  const ref = db.collection("pending_signups").doc(email);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, reason: "not_found" };
  const data = snap.data();
  if (Date.now() > data.expiresAt) {
    await ref.delete();
    return { ok: false, reason: "expired" };
  }
  if (data.code !== code) return { ok: false, reason: "mismatch" };
  await ref.delete();
  return { ok: true, data };
}

async function getUserProfile(uid) {
  const snap = await db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function updateUserProfile(uid, data) {
  await db.collection("users").doc(uid).update(data);
}

const MAX_ALT_USERNAMES = 10;

async function addAltUsername(uid, rawUsername) {
  const username = String(rawUsername || "").trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error("Username must be 3-20 characters (letters, numbers, underscore only).");
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (username === (profile.username || "").toLowerCase()) throw new Error("That's already your main username.");
  const current = Array.isArray(profile.altUsernames) ? profile.altUsernames : [];
  if (current.includes(username)) throw new Error("That username is already added.");
  if (current.length >= MAX_ALT_USERNAMES) throw new Error(`You can add up to ${MAX_ALT_USERNAMES} extra usernames.`);
  if (!(await isUsernameAvailable(username, uid))) throw new Error("That username is already taken.");
  const updated = [...current, username];
  await db.collection("users").doc(uid).update({ altUsernames: updated });
  return updated;
}

async function removeAltUsername(uid, rawUsername) {
  const username = String(rawUsername || "").trim().toLowerCase();
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  const current = Array.isArray(profile.altUsernames) ? profile.altUsernames : [];
  const updated = current.filter((u) => u !== username);
  await db.collection("users").doc(uid).update({ altUsernames: updated });
  return updated;
}

const PRIVACY_FIELDS = {
  showActiveStatus: (v) => typeof v === "boolean",
  showLastSeen: (v) => typeof v === "boolean",
  lockProfile: (v) => typeof v === "boolean",
  showProfilePhoto: (v) => typeof v === "boolean",
  followersVisibility: (v) => v === "everyone" || v === "only_me" || v === "friends",
  followingVisibility: (v) => v === "everyone" || v === "only_me" || v === "friends",
};

async function updatePrivacySettings(uid, updates) {
  const data = {};
  for (const key of Object.keys(updates || {})) {
    const validator = PRIVACY_FIELDS[key];
    if (validator && validator(updates[key])) data[key] = updates[key];
  }
  if (Object.keys(data).length === 0) throw new Error("No valid privacy settings provided.");
  await db.collection("users").doc(uid).update(data);
  return data;
}

const MAX_WATCH_SYNC_SECONDS = 300;

async function getWatchSeconds(uid) {
  const profile = await getUserProfile(uid);
  return Math.max(0, Math.floor(profile?.watchSeconds || 0));
}

async function addWatchSeconds(uid, deltaSeconds) {
  const delta = Math.max(0, Math.min(MAX_WATCH_SYNC_SECONDS, Math.floor(Number(deltaSeconds) || 0)));
  if (delta === 0) return getWatchSeconds(uid);
  const ref = db.collection("users").doc(uid);
  await ref.set({ watchSeconds: admin.firestore.FieldValue.increment(delta) }, { merge: true });
  const snap = await ref.get();
  return Math.max(0, Math.floor(snap.data()?.watchSeconds || 0));
}

async function seedWatchSecondsIfEmpty(uid, seedSeconds) {
  const seed = Math.max(0, Math.floor(Number(seedSeconds) || 0));
  const profile = await getUserProfile(uid);
  if (profile && (profile.watchSeconds === undefined || profile.watchSeconds === null)) {
    await db.collection("users").doc(uid).set({ watchSeconds: seed }, { merge: true });
    return seed;
  }
  return Math.max(0, Math.floor(profile?.watchSeconds || 0));
}

async function markEmailVerified(uid) {
  await auth.updateUser(uid, { emailVerified: true });
  await db.collection("users").doc(uid).update({ emailVerified: true });
}

async function ensureGoogleUserProfile(decodedToken) {
  const uid = decodedToken.uid;
  const existing = await getUserProfile(uid);
  if (existing) return { ...existing, isNew: false };
  const [firstName, ...rest] = (decodedToken.name || decodedToken.email).split(" ");
  const username = await generateUniqueUsername(firstName || decodedToken.email.split("@")[0]);
  const referralCode = await generateReferralCode();
  const profile = {
    firstName: firstName || "",
    lastName: rest.join(" ") || "",
    email: decodedToken.email,
    username,
    provider: "google",
    photoURL: decodedToken.picture || null,
    emailVerified: true,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    createdAt: Date.now(),
    referralCode,
  };
  await db.collection("users").doc(uid).set(profile);
  await autoFollowAdmin(uid, profile.email);
  return { ...profile, isNew: true };
}

function verifyTelegramLoginPayload(data, botToken) {
  if (!botToken || !data || !data.hash || !data.id) return false;
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  if (computedHash.length !== hash.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash))) return false;
  const authAge = Date.now() / 1000 - Number(data.auth_date || 0);
  if (!(authAge >= 0) || authAge > 86400) return false;
  return true;
}

function base64UrlToBuffer(b64url) {
  const b64 = String(b64url).replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

let telegramJwksCache = null;
let telegramJwksFetchedAt = 0;

async function getTelegramJwks() {
  if (telegramJwksCache && Date.now() - telegramJwksFetchedAt < 3600_000) return telegramJwksCache;
  const res = await fetch("https://oauth.telegram.org/.well-known/jwks.json");
  if (!res.ok) throw new Error("Could not fetch Telegram's signing keys.");
  const data = await res.json();
  telegramJwksCache = data.keys || [];
  telegramJwksFetchedAt = Date.now();
  return telegramJwksCache;
}

const TELEGRAM_JWT_ALGS = {
  RS256: { import: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, verify: { name: "RSASSA-PKCS1-v1_5" } },
  ES256: { import: { name: "ECDSA", namedCurve: "P-256" }, verify: { name: "ECDSA", hash: "SHA-256" } },
};

async function verifyTelegramIdToken(idToken, expectedBotId) {
  try {
    const parts = String(idToken).split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(base64UrlToBuffer(headerB64).toString("utf8"));
    const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8"));
    const algSpec = TELEGRAM_JWT_ALGS[header.alg];
    if (!algSpec) return null;

    const keys = await getTelegramJwks();
    const jwk = keys.find((k) => k.kid === header.kid) || keys.find((k) => k.alg === header.alg);
    if (!jwk) return null;

    const publicKey = await crypto.webcrypto.subtle.importKey("jwk", jwk, algSpec.import, false, ["verify"]);
    const signedData = Buffer.from(`${headerB64}.${payloadB64}`, "utf8");
    const signature = base64UrlToBuffer(sigB64);
    const valid = await crypto.webcrypto.subtle.verify(algSpec.verify, publicKey, signature, signedData);
    if (!valid) return null;

    if (payload.iss !== "https://oauth.telegram.org") return null;
    if (String(payload.aud) !== String(expectedBotId)) return null;
    if (!payload.exp || Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function findUserByTelegramId(telegramId) {
  const snap = await db.collection("users").where("telegramId", "==", String(telegramId)).limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

async function createOrGetTelegramUser({ id, first_name, last_name, username, photo_url }) {
  const telegramId = String(id);
  const existing = await findUserByTelegramId(telegramId);
  if (existing) return { uid: existing.uid, isNew: false };

  const uid = `tg_${telegramId}`;
  const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || "Telegram User";
  try {
    await auth.createUser({ uid, displayName });
  } catch (err) {
    if (err.code !== "auth/uid-already-exists") throw err;
  }

  const uniqueUsername = await generateUniqueUsername(username || first_name || "user");
  const referralCode = await generateReferralCode();
  const profile = {
    firstName: first_name || "",
    lastName: last_name || "",
    username: uniqueUsername,
    provider: "telegram",
    telegramId,
    telegramUsername: username || "",
    photoURL: photo_url || null,
    emailVerified: false,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    createdAt: Date.now(),
    referralCode,
  };
  await db.collection("users").doc(uid).set(profile, { merge: true });
  await autoFollowAdmin(uid, null);
  return { uid, isNew: true };
}

async function saveTelegramOAuthState(state, codeVerifier) {
  await db.collection("telegram_oauth_state").doc(state).set({
    codeVerifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

async function consumeTelegramOAuthState(state) {
  const ref = db.collection("telegram_oauth_state").doc(state);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const { codeVerifier, expiresAt } = snap.data();
  await ref.delete();
  if (Date.now() > expiresAt) return null;
  return codeVerifier;
}

async function saveGithubOAuthState(state) {
  await db.collection("github_oauth_state").doc(state).set({
    expiresAt: Date.now() + 10 * 60 * 1000,
  });
}

async function consumeGithubOAuthState(state) {
  const ref = db.collection("github_oauth_state").doc(state);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const { expiresAt } = snap.data();
  await ref.delete();
  return Date.now() <= expiresAt;
}

async function findUserByGithubId(githubId) {
  const snap = await db.collection("users").where("githubId", "==", String(githubId)).limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

async function createOrGetGithubUser({ id, login, name, email, avatar_url }) {
  const githubId = String(id);
  const existing = await findUserByGithubId(githubId);
  if (existing) return { uid: existing.uid, isNew: false };

  const uid = `gh_${githubId}`;
  const displayName = name || login || "GitHub User";
  try {
    await auth.createUser({ uid, displayName, email: email || undefined, emailVerified: !!email });
  } catch (err) {
    if (err.code !== "auth/uid-already-exists") throw err;
  }

  const uniqueUsername = await generateUniqueUsername(login || name || "user");
  const referralCode = await generateReferralCode();
  const profile = {
    firstName: name || login || "",
    lastName: "",
    email: email || "",
    username: uniqueUsername,
    provider: "github",
    githubId,
    githubLogin: login || "",
    githubLoginLower: (login || "").toLowerCase(),
    photoURL: avatar_url || null,
    emailVerified: !!email,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
    createdAt: Date.now(),
    referralCode,
  };
  await db.collection("users").doc(uid).set(profile, { merge: true });
  await autoFollowAdmin(uid, email || null);
  return { uid, isNew: true };
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function currentUsageMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function getAccountApiUsage(uid, monthlyLimit) {
  const nowMonth = currentUsageMonth();
  const snap = await db.collection("apiUsage").doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  const requestsThisMonth = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  return { requestsThisMonth, monthlyLimit };
}

async function checkAndIncrementAccountApiUsage(uid, monthlyLimit) {
  const nowMonth = currentUsageMonth();
  const ref = db.collection("apiUsage").doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const current = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  if (current >= monthlyLimit) {
    return { allowed: false, requestsThisMonth: current, monthlyLimit };
  }
  const requestsThisMonth = current + 1;
  await ref.set({ uid, requestsThisMonth, usageMonth: nowMonth }, { merge: true });
  return { allowed: true, requestsThisMonth, monthlyLimit };
}

function currentUsageDay() {
  return new Date().toISOString().slice(0, 10);
}

async function checkAndIncrementDailyLimit(key, limit) {
  const today = currentUsageDay();
  const docId = crypto.createHash("sha256").update(key).digest("hex");
  const ref = db.collection("dailyLimits").doc(docId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const current = data && data.day === today ? (data.count || 0) : 0;
  if (current >= limit) {
    return { allowed: false, count: current, limit };
  }
  const count = current + 1;
  await ref.set({ day: today, count, updatedAt: Date.now() }, { merge: true });
  return { allowed: true, count, limit };
}

async function createApiKey(uid, label) {
  const rawKey = "estv_" + crypto.randomBytes(24).toString("hex");
  const keyHash = hashApiKey(rawKey);
  await db.collection("apiKeys").doc(keyHash).set({
    uid,
    label: (label || "").slice(0, 60) || "Unnamed key",
    last4: rawKey.slice(-4),
    createdAt: Date.now(),
    lastUsedAt: null,
    revoked: false,
  });
  return { id: keyHash, rawKey };
}

async function listApiKeysForUser(uid) {
  const q = await db.collection("apiKeys").where("uid", "==", uid).get();
  return q.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((k) => !k.revoked)
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function revokeApiKey(uid, keyId) {
  const ref = db.collection("apiKeys").doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Key not found.");
  await ref.update({ revoked: true });
}

async function findApiKeyByRawKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  const keyHash = hashApiKey(rawKey);
  const ref = db.collection("apiKeys").doc(keyHash);
  const snap = await ref.get();
  if (!snap.exists || snap.data().revoked) return null;
  ref.update({ lastUsedAt: Date.now() }).catch(() => {});
  return { id: snap.id, uid: snap.data().uid };
}

async function getApiKeyOwnerUid(keyId) {
  if (!keyId) return null;
  const snap = await db.collection("apiKeys").doc(keyId).get();
  return snap.exists ? snap.data().uid : null;
}

const DEV_API_PLAN_DAYS = 30;

const DEV_API_PLANS = {
  free: { name: "Free", apiKeys: 1, requestsPerSecond: 3, monthlyRequests: 100, noAds: false, customAdsLink: false, priceNgn: 0 },
  starter: { name: "Starter", apiKeys: 3, requestsPerSecond: 10, monthlyRequests: 200, noAds: false, customAdsLink: false, priceNgn: 0 },
  standard: { name: "Standard", apiKeys: 5, requestsPerSecond: 20, monthlyRequests: 350, noAds: false, customAdsLink: false, priceNgn: 3000 },
  pro: { name: "Pro", apiKeys: 10, requestsPerSecond: 35, monthlyRequests: 500, noAds: true, customAdsLink: false, priceNgn: 5000 },
  max: { name: "Max", apiKeys: 15, requestsPerSecond: 50, monthlyRequests: 1000, noAds: true, customAdsLink: true, priceNgn: 10000 },
};

const PURCHASABLE_DEV_API_PLANS = ["standard", "pro", "max"];

function getEffectiveDevApiPlan(data) {
  if (!data) return "free";
  if (data.devApiPlanPaid && DEV_API_PLANS[data.devApiPlanPaid] && data.devApiPlanExpiresAt && Date.now() < data.devApiPlanExpiresAt) {
    return data.devApiPlanPaid;
  }
  if (isVerificationActive(data)) return "starter";
  return "free";
}

function getDevApiPlanConfig(data) {
  return DEV_API_PLANS[getEffectiveDevApiPlan(data)];
}

async function createDevApiPlanPayment(uid, reference, amountKobo, plan) {
  await db.collection("devApiPlanPayments").doc(reference).set({
    uid,
    plan,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });
}

async function getDevApiPlanPayment(reference) {
  const snap = await db.collection("devApiPlanPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function claimPendingPayment(ref, paystackData) {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { notOurs: true };
    const record = snap.data();
    if (record.status === "success") return { alreadyProcessed: true, uid: record.uid };
    if (record.status === "claimed") return { inProgress: true };
    if (paystackData.status !== "success" || paystackData.amount < record.amountKobo) {
      tx.update(ref, { status: "failed", failedAt: Date.now() });
      return { failed: true };
    }
    tx.update(ref, { status: "claimed" });
    return { claimed: true, record };
  });
}

async function finalizeDevApiPlanPayment(reference, paystackData) {
  const ref = db.collection("devApiPlanPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const expiresAt = Date.now() + DEV_API_PLAN_DAYS * 24 * 60 * 60 * 1000;
  await db.collection("users").doc(record.uid).update({
    devApiPlanPaid: record.plan,
    devApiPlanPurchasedAt: Date.now(),
    devApiPlanExpiresAt: expiresAt,
  });
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await saveBillingAuthorization(record.uid, paystackData);
  const planName = DEV_API_PLANS[record.plan]?.name || record.plan;
  await addNotification(record.uid, "dev_api_plan", `Your ${planName} Developer API plan is now active`, { plan: record.plan, expiresAt });
  await creditReferralCommission(record.uid, record.amountKobo / 100, "Developer API plan purchase");

  return { alreadyProcessed: false, uid: record.uid, plan: record.plan, expiresAt };
}

async function setDevApiCustomAdsUrl(uid, url) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (!getDevApiPlanConfig(profile).customAdsLink) throw new Error("The custom ads link is a Max plan feature.");
  const trimmed = String(url || "").trim();
  if (!trimmed) {
    await db.collection("users").doc(uid).update({ devApiCustomAdsUrl: admin.firestore.FieldValue.delete() });
    return { devApiCustomAdsUrl: null };
  }
  if (!/^https:\/\/[^\s"'<>]{3,300}$/i.test(trimmed)) throw new Error("Enter a valid https:// URL, without spaces or quote characters.");
  await db.collection("users").doc(uid).update({ devApiCustomAdsUrl: trimmed });
  return { devApiCustomAdsUrl: trimmed };
}

async function createDevApiKey(uid, label) {
  const rawKey = "estv_" + crypto.randomBytes(24).toString("hex");
  const keyHash = hashApiKey(rawKey);
  await db.collection("devApiKeys").doc(keyHash).set({
    uid,
    label: (label || "").slice(0, 60) || "Unnamed key",
    last4: rawKey.slice(-4),
    createdAt: Date.now(),
    lastUsedAt: null,
    revoked: false,
  });
  return { id: keyHash, rawKey };
}

async function listDevApiKeysForUser(uid) {
  const q = await db.collection("devApiKeys").where("uid", "==", uid).get();
  return q.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((k) => !k.revoked)
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function revokeDevApiKey(uid, keyId) {
  const ref = db.collection("devApiKeys").doc(keyId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Key not found.");
  await ref.update({ revoked: true });
}

async function findDevApiKeyByRawKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  const keyHash = hashApiKey(rawKey);
  const ref = db.collection("devApiKeys").doc(keyHash);
  const snap = await ref.get();
  if (!snap.exists || snap.data().revoked) return null;
  ref.update({ lastUsedAt: Date.now() }).catch(() => {});
  return { id: snap.id, uid: snap.data().uid };
}

async function getAccountDevApiUsage(uid, monthlyLimit) {
  const nowMonth = currentUsageMonth();
  const snap = await db.collection("devApiUsage").doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  const requestsThisMonth = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  return { requestsThisMonth, monthlyLimit };
}

async function checkAndIncrementAccountDevApiUsage(uid, monthlyLimit) {
  const nowMonth = currentUsageMonth();
  const ref = db.collection("devApiUsage").doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const current = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  if (current >= monthlyLimit) {
    return { allowed: false, requestsThisMonth: current, monthlyLimit };
  }
  const requestsThisMonth = current + 1;
  await ref.set({ uid, requestsThisMonth, usageMonth: nowMonth }, { merge: true });
  return { allowed: true, requestsThisMonth, monthlyLimit };
}

const MAX_ISSUED_LINKS_PER_ACCOUNT = 50;

async function recordIssuedStreamLink(uid, entry) {
  await db.collection("issuedStreamLinks").add({ uid, ...entry });
  db.collection("issuedStreamLinks").where("uid", "==", uid).get().then((snap) => {
    const docs = snap.docs
      .map((d) => ({ ref: d.ref, createdAt: d.data().createdAt || 0 }))
      .sort((a, b) => b.createdAt - a.createdAt);
    docs.slice(MAX_ISSUED_LINKS_PER_ACCOUNT).forEach((d) => d.ref.delete().catch(() => {}));
  }).catch(() => {});
}

async function getIssuedStreamLinks(uid) {
  const snap = await db.collection("issuedStreamLinks").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ISSUED_LINKS_PER_ACCOUNT);
}

async function issueResetToken(uid) {
  const token = crypto.randomBytes(24).toString("hex");
  await db.collection("reset_tokens").doc(token).set({
    uid,
    expiresAt: Date.now() + RESET_TOKEN_TTL_MS,
  });
  return token;
}

async function consumeResetToken(token) {
  const ref = db.collection("reset_tokens").doc(token);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  await ref.delete();
  if (Date.now() > data.expiresAt) return null;
  return data.uid;
}

const SESSION_SIGNING_KEY = (() => {
  const explicit = process.env.SESSION_SECRET;
  if (explicit) return crypto.createHash("sha256").update(`session-v1:${explicit}`).digest();
  const fallback = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!fallback) throw new Error("Set SESSION_SECRET so session cookies can be signed.");
  return crypto.createHash("sha256").update(`session-v1:${fallback}`).digest();
})();

const LEGACY_SESSION_ID = /^[a-f0-9]{64}$/;

function signSessionToken(payload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SIGNING_KEY).update(body).digest("base64url");
  return `v1.${body}.${sig}`;
}

function readSessionToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SIGNING_KEY).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && typeof payload.uid === "string" ? payload : null;
  } catch {
    return null;
  }
}

function sessionIssuedAt(token) {
  const payload = readSessionToken(token);
  return payload && typeof payload.iat === "number" ? payload.iat : null;
}

function isSessionRevoked(token, profile) {
  const validFrom = profile?.sessionsValidFrom;
  if (typeof validFrom !== "number") return false;
  const issuedAt = sessionIssuedAt(token);
  if (issuedAt === null) return true;
  return issuedAt < validFrom;
}

async function createSession(uid) {
  const now = Date.now();
  return signSessionToken({ uid, iat: now, exp: now + SESSION_TTL_MS });
}

async function verifySession(sessionId) {
  if (!sessionId) return null;

  const payload = readSessionToken(sessionId);
  if (payload) {
    if (typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    return payload.uid;
  }

  if (!LEGACY_SESSION_ID.test(sessionId)) return null;
  try {
    const snap = await db.collection("sessions").doc(sessionId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    if (Date.now() > data.expiresAt) return null;
    return data.uid;
  } catch {
    return null;
  }
}

async function refreshSession(sessionId) {
  if (!sessionId || !LEGACY_SESSION_ID.test(sessionId)) return;
  await db.collection("sessions").doc(sessionId).update({
    expiresAt: Date.now() + SESSION_TTL_MS,
  }).catch(() => {});
}

async function deleteSession(sessionId) {
  if (!sessionId || !LEGACY_SESSION_ID.test(sessionId)) return;
  await db.collection("sessions").doc(sessionId).delete().catch(() => {});
}

async function revokeAllSessions(uid) {
  await db.collection("users").doc(uid).update({ sessionsValidFrom: Date.now() }).catch(() => {});
  await db.collection("sessions").where("uid", "==", uid).get().then((snap) => {
    return Promise.all(snap.docs.map((d) => d.ref.delete()));
  }).catch(() => {});
}

const TWOFA_PENDING_TTL_MS = 5 * 60 * 1000;

function buildTotp(base32Secret, email) {
  return new OTPAuth.TOTP({
    issuer: "ES TEAMS TV",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
}

async function setupTwoFactor(uid, email) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = buildTotp(secret.base32, email);
  await db.collection("users").doc(uid).update({ twoFactorPendingSecret: secret.base32 });
  return { secretBase32: secret.base32, otpauthUrl: totp.toString() };
}

async function verifyTwoFactorSetup(uid, code) {
  const profile = await getUserProfile(uid);
  if (!profile?.twoFactorPendingSecret) return false;
  const totp = buildTotp(profile.twoFactorPendingSecret, profile.email);
  const delta = totp.validate({ token: String(code), window: 1 });
  if (delta === null) return false;
  await db.collection("users").doc(uid).update({
    twoFactorSecret: profile.twoFactorPendingSecret,
    twoFactorPendingSecret: null,
    twoFactorEnabled: true,
  });
  return true;
}

async function setTwoFactorEnabled(uid, enabled) {
  const profile = await getUserProfile(uid);
  if (!profile?.twoFactorSecret) throw new Error("Two-factor authentication isn't set up yet.");
  await db.collection("users").doc(uid).update({ twoFactorEnabled: !!enabled });
}

async function verifyTwoFactorCode(uid, code) {
  const profile = await getUserProfile(uid);
  if (!profile?.twoFactorSecret) return false;
  const totp = buildTotp(profile.twoFactorSecret, profile.email);
  const delta = totp.validate({ token: String(code), window: 1 });
  return delta !== null;
}

async function issueTwoFactorPendingLogin(uid, remember) {
  const token = crypto.randomBytes(24).toString("hex");
  await db.collection("twofa_pending_logins").doc(token).set({
    uid,
    remember: !!remember,
    expiresAt: Date.now() + TWOFA_PENDING_TTL_MS,
  });
  return token;
}

async function getTwoFactorPendingLogin(token) {
  const snap = await db.collection("twofa_pending_logins").doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (Date.now() > data.expiresAt) {
    await db.collection("twofa_pending_logins").doc(token).delete();
    return null;
  }
  return data;
}

async function deleteTwoFactorPendingLogin(token) {
  await db.collection("twofa_pending_logins").doc(token).delete().catch(() => {});
}

const DELETION_GRACE_MS = 24 * 60 * 60 * 1000;
const pendingDeletionTimers = new Map();

async function cleanupFollowRelationships(uid) {
  const [asFollower, asTarget] = await Promise.all([
    db.collection("follows").where("followerUid", "==", uid).get(),
    db.collection("follows").where("targetUid", "==", uid).get(),
  ]);

  const docs = [...asFollower.docs, ...asTarget.docs];
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      const { followerUid, targetUid } = doc.data();
      batch.delete(doc.ref);
      if (followerUid === uid) {
        batch.update(db.collection("users").doc(targetUid), {
          followersCount: admin.firestore.FieldValue.increment(-1),
        });
      } else {
        batch.update(db.collection("users").doc(followerUid), {
          followingCount: admin.firestore.FieldValue.increment(-1),
        });
      }
    }
    await batch.commit().catch(() => {});
  }
}

async function purgeUser(uid) {
  pendingDeletionTimers.delete(uid);
  await revokeAllSessions(uid);
  await cleanupFollowRelationships(uid).catch(() => {});
  await db.collection("users").doc(uid).delete().catch(() => {});
  await auth.deleteUser(uid).catch(() => {});
}

async function scheduleAccountDeletion(uid) {
  const deletionAt = Date.now() + DELETION_GRACE_MS;
  await auth.updateUser(uid, { disabled: true });
  await db.collection("users").doc(uid).update({ pendingDeletion: true, deletionAt });
  await revokeAllSessions(uid);
  if (pendingDeletionTimers.has(uid)) clearTimeout(pendingDeletionTimers.get(uid));
  const timer = setTimeout(() => purgeUser(uid), DELETION_GRACE_MS);
  pendingDeletionTimers.set(uid, timer);
}

async function sweepPendingDeletions() {
  const snap = await db.collection("users").where("pendingDeletion", "==", true).get().catch(() => null);
  if (!snap) return;
  const now = Date.now();
  for (const doc of snap.docs) {
    const { deletionAt } = doc.data();
    if (!deletionAt || now >= deletionAt) {
      await purgeUser(doc.id);
    } else {
      const timer = setTimeout(() => purgeUser(doc.id), deletionAt - now);
      pendingDeletionTimers.set(doc.id, timer);
    }
  }
}

async function sweepOrphanedUsers() {
  const snap = await db.collection("users").get().catch(() => null);
  if (!snap) return;
  for (const doc of snap.docs) {
    const uid = doc.id;
    try {
      await auth.getUser(uid);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        await cleanupFollowRelationships(uid).catch(() => {});
        await doc.ref.delete().catch(() => {});
      }
    }
  }
}

const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function getMaxPasskeysForUser(uid) {
  const profile = await getUserProfile(uid);
  return isVerificationActive(profile) ? MAX_PASSKEYS_VERIFIED : MAX_PASSKEYS_UNVERIFIED;
}

function toBase64url(value) {
  if (typeof value === "string") return value;
  if (value == null) return value;
  if (Buffer.isBuffer(value)) return value.toString("base64url");
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64url");
  if (value && value.type === "Buffer" && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString("base64url");
  }
  return value;
}

function toSafeCredentialDescriptor(c, label) {
  const id = toBase64url(c && c.id);
  if (!id || typeof id !== "string") {
    throw new Error(`Server produced an invalid ${label} entry, passkey data may be corrupted.`);
  }
  return { ...c, id };
}

function sanitizePasskeyOptions(options, { isRegistration } = {}) {
  const safe = { ...options };
  safe.challenge = toBase64url(safe.challenge);
  if (!safe.challenge || typeof safe.challenge !== "string") {
    throw new Error("Server failed to generate a valid passkey challenge.");
  }

  if (isRegistration) {
    if (!safe.user || typeof safe.user !== "object") {
      throw new Error("Server failed to generate valid passkey user info.");
    }
    safe.user = { ...safe.user, id: toBase64url(safe.user.id) };
    if (!safe.user.id || typeof safe.user.id !== "string") {
      throw new Error("Server failed to generate a valid passkey user ID.");
    }
    safe.excludeCredentials = Array.isArray(safe.excludeCredentials)
      ? safe.excludeCredentials.map((c) => toSafeCredentialDescriptor(c, "excludeCredentials"))
      : [];
  } else {
    safe.allowCredentials = Array.isArray(safe.allowCredentials)
      ? safe.allowCredentials.map((c) => toSafeCredentialDescriptor(c, "allowCredentials"))
      : [];
  }

  return safe;
}

async function getPasskeysForUser(uid) {
  const snap = await db.collection("passkey_credentials").where("uid", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function beginPasskeyRegistration(uid, email, displayName, rpID) {
  const existing = await getPasskeysForUser(uid);
  const maxPasskeys = await getMaxPasskeysForUser(uid);
  if (existing.length >= maxPasskeys) {
    throw new Error(`You can only have up to ${maxPasskeys} passkey${maxPasskeys === 1 ? "" : "s"}. Delete one to add another, or get verified for more.`);
  }
  const rawOptions = await generateRegistrationOptions({
    rpName: "ES TEAMS TV",
    rpID,
    userID: Buffer.from(uid, "utf8"),
    userName: email,
    userDisplayName: displayName || email,
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports || [] })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  const options = sanitizePasskeyOptions(rawOptions, { isRegistration: true });
  await db.collection("webauthn_challenges").doc(`reg_${uid}`).set({
    challenge: options.challenge,
    expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
  });
  return options;
}

async function finishPasskeyRegistration(uid, response, rpID, origin, name) {
  try {
    if (!response || typeof response !== 'object') {
      throw new Error("Invalid passkey response format.");
    }

    const ref = db.collection("webauthn_challenges").doc(`reg_${uid}`);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Passkey setup session expired. Try again.");
    const { challenge, expiresAt } = snap.data();
    await ref.delete();
    if (Date.now() > expiresAt) throw new Error("Passkey setup session expired. Try again.");

    const existing = await getPasskeysForUser(uid);
    const maxPasskeys = await getMaxPasskeysForUser(uid);
    if (existing.length >= maxPasskeys) {
      throw new Error(`You can only have up to ${maxPasskeys} passkey${maxPasskeys === 1 ? "" : "s"}. Delete one to add another, or get verified for more.`);
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (verifyErr) {
      throw new Error(`Passkey verification failed: ${verifyErr.message}`);
    }

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Could not verify passkey. Try again.");
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    if (!credential || !credential.id || !credential.publicKey) {
      throw new Error("Invalid credential data from browser.");
    }

    let credentialIdString;
    try {
      if (typeof credential.id === 'string') {
        credentialIdString = credential.id;
      } else if (credential.id instanceof Uint8Array || Buffer.isBuffer(credential.id)) {
        credentialIdString = Buffer.from(credential.id).toString("base64url");
      } else {
        throw new Error("Invalid credential ID format.");
      }
    } catch (idErr) {
      throw new Error(`Failed to process credential ID: ${idErr.message}`);
    }

    const existingCred = await db.collection("passkey_credentials").doc(credentialIdString).get();
    if (existingCred.exists) {
      throw new Error(existingCred.data().uid === uid
        ? "This passkey is already added to your account."
        : "This passkey is already registered to another account.");
    }

    try {
      const publicKeyBuffer = Buffer.isBuffer(credential.publicKey)
        ? credential.publicKey
        : Buffer.from(credential.publicKey);

      await db.collection("passkey_credentials").doc(credentialIdString).set({
        uid,
        name: String((name || "").trim().slice(0, 40)) || "Unnamed Passkey",
        publicKey: publicKeyBuffer.toString("base64url"),
        counter: Number(credential.counter) || 0,
        transports: Array.isArray(response.response?.transports)
          ? response.response.transports.filter(t => typeof t === 'string')
          : [],
        deviceType: credentialDeviceType || null,
        backedUp: !!credentialBackedUp,
        createdAt: Date.now(),
      });
    } catch (storeErr) {
      throw new Error(`Failed to save credential: ${storeErr.message}`);
    }
  } catch (err) {
    throw err;
  }
}

async function deletePasskey(uid, credentialId) {
  const ref = db.collection("passkey_credentials").doc(credentialId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Passkey not found.");
  await ref.delete();
}

async function beginPasskeyAuthentication(rpID) {
  const rawOptions = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });
  const options = sanitizePasskeyOptions(rawOptions, { isRegistration: false });
  const token = crypto.randomBytes(16).toString("hex");
  await db.collection("webauthn_challenges").doc(`auth_${token}`).set({
    challenge: options.challenge,
    expiresAt: Date.now() + PASSKEY_CHALLENGE_TTL_MS,
  });
  return { options, token };
}

async function finishPasskeyAuthentication(token, response, rpID, origin) {
  try {
    if (!response || typeof response !== 'object') {
      throw new Error("Invalid authentication response format.");
    }

    if (!response.id) {
      throw new Error("Missing credential ID in authentication response.");
    }

    const ref = db.collection("webauthn_challenges").doc(`auth_${token}`);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Passkey session expired. Try again.");
    const { challenge, expiresAt } = snap.data();
    await ref.delete();
    if (Date.now() > expiresAt) throw new Error("Passkey session expired. Try again.");

    let credentialIdString;
    try {
      if (typeof response.id === 'string') {
        credentialIdString = response.id;
      } else if (response.id instanceof Uint8Array || Buffer.isBuffer(response.id)) {
        credentialIdString = Buffer.from(response.id).toString("base64url");
      } else {
        throw new Error("Invalid credential ID type.");
      }
    } catch (idErr) {
      throw new Error(`Failed to process credential ID: ${idErr.message}`);
    }

    const credDoc = await db.collection("passkey_credentials").doc(credentialIdString).get();
    if (!credDoc.exists) {
      const err = new Error("No account found with that passkey.");
      err.code = "passkey/not-found";
      throw err;
    }

    const credData = credDoc.data();
    if (!credData || !credData.publicKey) {
      throw new Error("Corrupted credential data in database.");
    }

    let credentialIdBinary;
    try {
      credentialIdBinary = Buffer.from(credentialIdString, "base64url");
    } catch (err) {
      throw new Error(`Failed to decode credential ID: ${err.message}`);
    }

    let publicKeyBinary;
    try {
      publicKeyBinary = Buffer.from(credData.publicKey, "base64url");
    } catch (err) {
      throw new Error(`Failed to decode public key: ${err.message}`);
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credentialIdString,
          publicKey: publicKeyBinary,
          counter: Number(credData.counter) || 0,
          transports: Array.isArray(credData.transports) ? credData.transports : [],
        },
      });
    } catch (verifyErr) {
      throw new Error(`Authentication verification failed: ${verifyErr.message}`);
    }

    if (!verification.verified) {
      throw new Error("Could not verify passkey authentication.");
    }

    try {
      await credDoc.ref.update({ counter: verification.authenticationInfo.newCounter });
    } catch (updateErr) {
      console.error("Failed to update counter:", updateErr);
    }

    return credData.uid;
  } catch (err) {
    throw err;
  }
}


const FACE_DESCRIPTOR_LENGTH = 128;
const FACE_MATCH_THRESHOLD = 0.55;
const FACE_AMBIGUITY_MARGIN = 0.05;
const FACE_MAX_SAMPLES = 8;

function isValidFaceDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === FACE_DESCRIPTOR_LENGTH &&
    descriptor.every((n) => typeof n === "number" && Number.isFinite(n))
  );
}

function normalizeFaceSamples(input) {
  if (isValidFaceDescriptor(input)) return [input];
  if (!Array.isArray(input)) return [];
  const samples = [];
  for (const entry of input) {
    if (isValidFaceDescriptor(entry)) samples.push(entry);
    else if (entry && isValidFaceDescriptor(entry.v)) samples.push(entry.v);
    if (samples.length >= FACE_MAX_SAMPLES) break;
  }
  return samples;
}

function storedFaceSamples(data) {
  const samples = [];
  if (Array.isArray(data?.samples)) {
    for (const entry of data.samples) {
      if (entry && isValidFaceDescriptor(entry.v)) samples.push(entry.v);
    }
  }
  if (isValidFaceDescriptor(data?.descriptor)) samples.push(data.descriptor);
  return samples;
}

function faceEuclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < FACE_DESCRIPTOR_LENGTH; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

async function getFaceScanForUser(uid) {
  const snap = await db.collection("face_recognition_credentials").doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

const FACE_ENROLL_DUPLICATE_THRESHOLD = 0.55;

async function findAccountAlreadyUsingFace(uid, probes) {
  const snap = await db.collection("face_recognition_credentials").get();
  let matchedUid = null;
  let bestDistance = Infinity;
  let scanned = 0;
  snap.forEach((doc) => {
    if (doc.id === uid) return;
    const stored = storedFaceSamples(doc.data());
    if (!stored.length) return;
    scanned++;
    let distance = Infinity;
    for (const one of stored) {
      for (const probe of probes) {
        const d = faceEuclideanDistance(probe, one);
        if (d < distance) distance = d;
      }
    }
    if (distance < bestDistance) bestDistance = distance;
    if (!matchedUid && distance <= FACE_ENROLL_DUPLICATE_THRESHOLD) matchedUid = doc.id;
  });
  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a");
  console.log(
    `[facescan-enroll] uid=${uid} scanned=${scanned} best=${fmt(bestDistance)} threshold=${FACE_ENROLL_DUPLICATE_THRESHOLD} duplicateOf=${matchedUid || "none"}`
  );
  return matchedUid;
}

async function enrollFaceScan(uid, descriptor) {
  const samples = normalizeFaceSamples(descriptor);
  if (!samples.length) {
    throw new Error("Invalid face scan data. Try again.");
  }
  const existing = await getFaceScanForUser(uid);
  if (existing) {
    throw new Error("Face Scan is already set up for this account. Remove it first to set up a different one.");
  }
  const duplicateUid = await findAccountAlreadyUsingFace(uid, samples);
  if (duplicateUid) {
    throw Object.assign(new Error("Face already used in other account"), {
      status: 400,
      code: "facescan/duplicate",
    });
  }
  await db.collection("face_recognition_credentials").doc(uid).set({
    descriptor: samples[0],
    samples: samples.map((v) => ({ v })),
    createdAt: Date.now(),
  });
}

async function removeFaceScan(uid) {
  const existing = await getFaceScanForUser(uid);
  if (!existing) throw new Error("Face Scan not found.");
  await db.collection("face_recognition_credentials").doc(uid).delete();
}

async function matchFaceScan(descriptor) {
  const probes = normalizeFaceSamples(descriptor);
  if (!probes.length) {
    throw new Error("Invalid face scan data.");
  }
  const snap = await db.collection("face_recognition_credentials").get();
  let bestUid = null;
  let bestDistance = Infinity;
  let runnerUpDistance = Infinity;
  let enrolled = 0;
  snap.forEach((doc) => {
    const samples = storedFaceSamples(doc.data());
    if (!samples.length) return;
    enrolled++;
    let distance = Infinity;
    for (const stored of samples) {
      for (const probe of probes) {
        const d = faceEuclideanDistance(probe, stored);
        if (d < distance) distance = d;
      }
    }
    if (distance < bestDistance) {
      runnerUpDistance = bestDistance;
      bestDistance = distance;
      bestUid = doc.id;
    } else if (distance < runnerUpDistance) {
      runnerUpDistance = distance;
    }
  });

  if (!enrolled) {
    const err = new Error("No face has been set up yet. Add Face Scan from your account settings first.");
    err.code = "facescan/none-enrolled";
    throw err;
  }

  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a");
  console.log(
    `[facescan-match] accounts=${enrolled} probes=${probes.length} best=${fmt(bestDistance)} runnerUp=${fmt(runnerUpDistance)} threshold=${FACE_MATCH_THRESHOLD}`
  );

  if (bestUid && bestDistance <= FACE_MATCH_THRESHOLD) {
    if (runnerUpDistance - bestDistance < FACE_AMBIGUITY_MARGIN) {
      const err = new Error("Could not tell your face apart from another account. Please sign in with your password.");
      err.code = "facescan/ambiguous";
      throw err;
    }
    return bestUid;
  }
  const err = new Error("No matching face found.");
  err.code = "facescan/not-found";
  throw err;
}

const CLAIM_FACE_THRESHOLD = 0.55;
const CLAIM_FACE_COLLECTION = "claim_face_prints";
const CLAIM_FACE_BLOCK_COLLECTION = "claim_face_blocks";

function multipleFaceError() {
  return Object.assign(new Error("Multiple Face Detected. Try again after 24 hours"), {
    status: 400,
    code: "claim/multiple-face",
  });
}

function faceIdNotSetError() {
  return Object.assign(new Error("Face Id not Set. Go to Face Id and configure."), {
    status: 400,
    code: "claim/no-faceid",
  });
}

function bestDistanceBetween(probes, stored) {
  let best = Infinity;
  for (const one of stored) {
    for (const probe of probes) {
      const d = faceEuclideanDistance(probe, one);
      if (d < best) best = d;
    }
  }
  return best;
}

async function verifyOwnFaceId(uid, probes) {
  const own = await getFaceScanForUser(uid);
  if (!own) throw faceIdNotSetError();
  const enrolled = storedFaceSamples(own);
  if (!enrolled.length) throw faceIdNotSetError();
  const distance = bestDistanceBetween(probes, enrolled);
  console.log(
    `[claim-face] uid=${uid} own-faceid distance=${distance.toFixed(3)} threshold=${FACE_MATCH_THRESHOLD}`
  );
  if (distance > FACE_MATCH_THRESHOLD) {
    throw Object.assign(
      new Error("That face does not match the Face Id on this account."),
      { status: 400, code: "claim/face-mismatch" }
    );
  }
  return distance;
}

async function checkClaimFace(uid, descriptor) {
  const probes = normalizeFaceSamples(descriptor);
  if (!probes.length) {
    throw Object.assign(new Error("Face check failed. Please try again."), { status: 400 });
  }
  const today = currentUsageDay();

  await verifyOwnFaceId(uid, probes);

  const blockSnap = await db.collection(CLAIM_FACE_BLOCK_COLLECTION).doc(uid).get();
  if (blockSnap.exists && blockSnap.data().day === today) {
    console.log(`[claim-face] uid=${uid} blocked by stored decision for day=${today}`);
    throw multipleFaceError();
  }

  const snap = await db
    .collection(CLAIM_FACE_COLLECTION)
    .where("lastClaimDay", "==", today)
    .get();
  let matchedUid = null;
  let bestOther = Infinity;
  snap.forEach((doc) => {
    if (doc.id === uid) return;
    const stored = storedFaceSamples(doc.data());
    if (!stored.length) return;
    const distance = bestDistanceBetween(probes, stored);
    if (distance < bestOther) bestOther = distance;
    if (!matchedUid && distance <= CLAIM_FACE_THRESHOLD) matchedUid = doc.id;
  });

  const fmt = (n) => (Number.isFinite(n) ? n.toFixed(3) : "n/a");
  console.log(
    `[claim-face] uid=${uid} day=${today} claimedToday=${snap.size} bestOther=${fmt(bestOther)} threshold=${CLAIM_FACE_THRESHOLD} matched=${matchedUid || "none"}`
  );

  if (matchedUid) {
    await db.collection(CLAIM_FACE_BLOCK_COLLECTION).doc(uid).set({
      day: today,
      matchedUid,
      blockedAt: Date.now(),
    });
    throw multipleFaceError();
  }
  return probes;
}

async function saveClaimFace(uid, probes) {
  const now = Date.now();
  const today = currentUsageDay();
  await db.collection(CLAIM_FACE_COLLECTION).doc(uid).set(
    {
      descriptor: probes[0],
      samples: probes.slice(0, FACE_MAX_SAMPLES).map((v) => ({ v })),
      lastClaimDay: today,
      lastClaimAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
}

function followDocId(followerUid, targetUid) {
  return `${followerUid}_${targetUid}`;
}

async function addNotification(uid, type, message, meta = null) {
  try {
    await db.collection("notifications").add({ uid, type, message, meta, createdAt: Date.now(), read: false });
  } catch {
  }
}

async function broadcastNotification(message, meta = null) {
  const usersSnap = await db.collection("users").select().get();
  const uids = usersSnap.docs.map((d) => d.id);
  const createdAt = Date.now();
  const chunkSize = 400;
  let sent = 0;
  for (let i = 0; i < uids.length; i += chunkSize) {
    const chunk = uids.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((uid) => {
      const ref = db.collection("notifications").doc();
      batch.set(ref, { uid, type: "broadcast", message, meta, createdAt, read: false });
    });
    await batch.commit();
    sent += chunk.length;
  }
  return { sent, total: uids.length };
}

async function getNotifications(uid, limit = 50) {
  const snap = await db.collection("notifications").where("uid", "==", uid).limit(500).get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return docs.slice(0, limit);
}

async function hasUnreadNotifications(uid) {
  const snap = await db.collection("notifications")
    .where("uid", "==", uid)
    .where("read", "==", false)
    .limit(20)
    .get();
  return snap.docs.some((d) => d.data().type !== "comment");
}

async function markAllNotificationsRead(uid) {
  const snap = await db.collection("notifications")
    .where("uid", "==", uid)
    .where("read", "==", false)
    .limit(500)
    .get();
  const batch = db.batch();
  let any = false;
  snap.docs.forEach((d) => {
    if (!d.data().read) {
      batch.update(d.ref, { read: true });
      any = true;
    }
  });
  if (any) await batch.commit().catch(() => {});
}

async function toggleNotificationRead(uid, notifId) {
  const ref = db.collection("notifications").doc(notifId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Notification not found.");
  const next = !snap.data().read;
  await ref.update({ read: next });
  return { ok: true, read: next };
}

async function deleteNotification(uid, notifId) {
  const ref = db.collection("notifications").doc(notifId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Notification not found.");
  await ref.delete();
  return { ok: true };
}

const PROFILE_VIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function notifyProfileViewed(viewerUid, viewerProfile, targetUid) {
  if (!viewerProfile || viewerUid === targetUid) return;
  try {
    const ref = db.collection("profile_view_notifs").doc(`${viewerUid}_${targetUid}`);
    const snap = await ref.get();
    const now = Date.now();
    if (snap.exists && now - (snap.data().lastNotifiedAt || 0) < PROFILE_VIEW_COOLDOWN_MS) {
      return;
    }
    await ref.set({ viewerUid, targetUid, lastNotifiedAt: now });
    const name = ((viewerProfile.firstName || "") + " " + (viewerProfile.lastName || "")).trim() || `@${viewerProfile.username}`;
    await addNotification(targetUid, "profile_view", `${name} viewed your profile`, {
      viewerUid,
      viewerUsername: viewerProfile.username || "",
    });
  } catch {
  }
}

async function followUser(followerUid, targetUid) {
  if (!targetUid) throw new Error("User not found.");
  if (followerUid === targetUid) throw new Error("You can't follow yourself.");

  const targetProfile = await getUserProfile(targetUid);
  if (!targetProfile) throw new Error("User not found.");

  const ref = db.collection("follows").doc(followDocId(followerUid, targetUid));
  let created = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return;
    created = true;
    tx.set(ref, { followerUid, targetUid, createdAt: Date.now() });
    tx.update(db.collection("users").doc(targetUid), {
      followersCount: admin.firestore.FieldValue.increment(1),
    });
    tx.update(db.collection("users").doc(followerUid), {
      followingCount: admin.firestore.FieldValue.increment(1),
    });
  });
  if (created) {
    const followerProfile = await getUserProfile(followerUid).catch(() => null);
    const name = followerProfile ? `${followerProfile.firstName || ""} ${followerProfile.lastName || ""}`.trim() : "";
    const label = name || (followerProfile?.username ? `@${followerProfile.username}` : "Someone");
    await addNotification(targetUid, "follow", `${label} started following you.`, { followerUid });
  }
  return { following: true };
}

async function unfollowUser(followerUid, targetUid) {
  if (!targetUid) throw new Error("User not found.");

  const ref = db.collection("follows").doc(followDocId(followerUid, targetUid));
  const snap = await ref.get();
  if (!snap.exists) return { following: false };

  const batch = db.batch();
  batch.delete(ref);
  batch.update(db.collection("users").doc(targetUid), {
    followersCount: admin.firestore.FieldValue.increment(-1),
  });
  batch.update(db.collection("users").doc(followerUid), {
    followingCount: admin.firestore.FieldValue.increment(-1),
  });
  await batch.commit();
  return { following: false };
}

async function isFollowing(followerUid, targetUid) {
  if (!followerUid || !targetUid || followerUid === targetUid) return false;
  const snap = await db.collection("follows").doc(followDocId(followerUid, targetUid)).get();
  return snap.exists;
}

async function getFollowStats(uid) {
  const profile = await getUserProfile(uid);
  return {
    followers: profile?.followersCount || 0,
    following: profile?.followingCount || 0,
    likes: profile?.likesCount || 0,
  };
}

async function growAdminFollowerCount() {
  try {
    const snap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    if (snap.empty) return;
    await snap.docs[0].ref.update({ followersCount: admin.firestore.FieldValue.increment(7) });
  } catch {
  }
}

const MAX_POST_IMAGE_BYTES = 900 * 1024;

function decodeDataUrlPayload(dataUrl) {
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)[^,]*;base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  try {
    return { mime: match[1].toLowerCase(), buffer: Buffer.from(match[2], "base64") };
  } catch {
    return null;
  }
}

function bufferStartsWith(buf, bytes, offset = 0) {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

function sniffImageFormat(buf) {
  if (bufferStartsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (bufferStartsWith(buf, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bufferStartsWith(buf, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (bufferStartsWith(buf, [0x52, 0x49, 0x46, 0x46]) && bufferStartsWith(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

function sniffAudioFormat(buf) {
  if (bufferStartsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  if (bufferStartsWith(buf, [0x66, 0x74, 0x79, 0x70], 4)) return "mp4";
  return null;
}

function looksExecutableOrScript(buf) {
  if (bufferStartsWith(buf, [0x4d, 0x5a])) return true;
  if (bufferStartsWith(buf, [0x7f, 0x45, 0x4c, 0x46])) return true;
  if (bufferStartsWith(buf, [0x23, 0x21])) return true;
  const head = buf.slice(0, 512).toString("latin1").toLowerCase();
  if (/^\s*(<!doctype html|<html[\s>]|<\?php|<svg[\s>])/.test(head)) return true;
  return /<script[\s>]/.test(head);
}

function validateImageDataUrl(dataUrl, maxBytes) {
  if (typeof dataUrl !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(dataUrl)) return false;
  if (dataUrl.length > maxBytes) return false;
  const decoded = decodeDataUrlPayload(dataUrl);
  return !!(decoded && sniffImageFormat(decoded.buffer));
}

async function resolveTaggedUsers(uid, taggedUsernames) {
  const tagged = [];
  if (Array.isArray(taggedUsernames) && taggedUsernames.length) {
    const seen = new Set();
    for (const raw of taggedUsernames) {
      const uname = String(raw || "").toLowerCase();
      if (!uname || seen.has(uname)) continue;
      seen.add(uname);
      const target = await findUserByUsername(uname);
      if (target && target.uid !== uid) tagged.push(target);
    }
  }
  return tagged;
}

async function createPost(uid, { text, imageDataUrl, taggedUsernames }) {
  const cleanText = (text || "").toString().trim().slice(0, 2000);
  if (!cleanText && !imageDataUrl) throw new Error("Write something or add a photo first.");
  if (imageDataUrl && !validateImageDataUrl(imageDataUrl, MAX_POST_IMAGE_BYTES)) {
    throw new Error("Please attach a valid image.");
  }

  const author = await getUserProfile(uid);
  if (!author) throw new Error("Profile not found.");

  const tagged = await resolveTaggedUsers(uid, taggedUsernames);

  const post = {
    uid,
    text: cleanText,
    imageDataUrl: imageDataUrl || null,
    taggedUids: tagged.map((t) => t.uid),
    likedBy: [],
    visibility: "everyone",
    resharedFrom: null,
    commentsEnabled: true,
    reshareEnabled: true,
    linksEnabled: true,
    reshareCount: 0,
    pinnedAt: null,
    editedAt: null,
    createdAt: Date.now(),
  };
  if (isAdminEmail(author.email)) {
    post.bonusLikes = 50 + Math.floor(Math.random() * 51);
  }
  const ref = await db.collection("posts").add(post);
  if (post.bonusLikes) {
    await db.collection("users").doc(uid).update({
      likesCount: admin.firestore.FieldValue.increment(post.bonusLikes),
    }).catch(() => {});
  }

  const authorName = `${author.firstName || ""} ${author.lastName || ""}`.trim() || `@${author.username}`;
  const postUrl = `/u/${author.username}#post-${ref.id}`;
  for (const t of tagged) {
    await addNotification(t.uid, "tag", `${authorName} tagged you.`, { postId: ref.id, postUrl });
  }

  return { id: ref.id, ...post, likesCount: post.bonusLikes || 0, likedByViewer: false, commentsCount: 0 };
}

async function recalculateUserLikesCount(uid) {
  const [postsSnap, commentsSnap] = await Promise.all([
    db.collection("posts").where("uid", "==", uid).limit(500).get(),
    db.collection("comments").where("uid", "==", uid).limit(1000).get(),
  ]);
  let total = 0;
  postsSnap.forEach((d) => {
    const p = d.data();
    total += (p.likedBy || []).length + (p.bonusLikes || 0);
  });
  commentsSnap.forEach((d) => {
    total += (d.data().likedBy || []).length;
  });
  await db.collection("users").doc(uid).update({ likesCount: total }).catch(() => {});
  return { likesCount: total };
}

async function resolveEffectivePostStats(rawPosts) {
  const originalIds = [...new Set(
    rawPosts.filter((p) => p.resharedFrom && p.resharedFrom.postId).map((p) => p.resharedFrom.postId)
  )];
  const originalsById = new Map();
  for (let i = 0; i < originalIds.length; i += 30) {
    const chunk = originalIds.slice(i, i + 30);
    const snap = await db.collection("posts").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
    snap.forEach((d) => originalsById.set(d.id, d.data()));
  }
  const result = new Map();
  for (const p of rawPosts) {
    const src = (p.resharedFrom && p.resharedFrom.postId && originalsById.get(p.resharedFrom.postId)) || p;
    result.set(p.id, {
      likedBy: src.likedBy || [],
      commentsCount: src.commentsCount || 0,
      commentsEnabled: src.commentsEnabled !== false,
      bonusLikes: src.bonusLikes || 0,
    });
  }
  return result;
}

async function resolveCommentTargetPostId(postId) {
  const snap = await db.collection("posts").doc(postId).get();
  if (!snap.exists) return postId;
  const data = snap.data();
  return (data.resharedFrom && data.resharedFrom.postId) || postId;
}

async function getPostsByUser(targetUid, viewerUid) {
  const snap = await db.collection("posts").where("uid", "==", targetUid).limit(200).get();
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort((a, b) => (b.pinnedAt ? 1 : 0) - (a.pinnedAt ? 1 : 0) || b.createdAt - a.createdAt);

  const isOwner = viewerUid === targetUid;
  let mutualFollow = false;
  if (!isOwner && viewerUid) {
    const [a, b] = await Promise.all([isFollowing(viewerUid, targetUid), isFollowing(targetUid, viewerUid)]);
    mutualFollow = a && b;
  }

  const visiblePosts = posts.filter((p) => {
    if (isOwner) return true;
    const vis = p.visibility || "everyone";
    if (vis === "only_me") return false;
    if (vis === "friends") return mutualFollow;
    return true;
  });

  const statsMap = await resolveEffectivePostStats(visiblePosts);

  return visiblePosts.map((p) => {
    const stats = statsMap.get(p.id) || { likedBy: [], commentsCount: 0, commentsEnabled: true };
    return {
      id: p.id,
      text: p.text || "",
      imageDataUrl: p.imageDataUrl || null,
      taggedUids: p.taggedUids || [],
      visibility: p.visibility || "everyone",
      resharedFrom: p.resharedFrom || null,
      commentsEnabled: stats.commentsEnabled,
      reshareEnabled: p.reshareEnabled !== false,
      linksEnabled: p.linksEnabled !== false,
      reshareCount: p.reshareCount || 0,
      pinnedAt: p.pinnedAt || null,
      editedAt: p.editedAt || null,
      createdAt: p.createdAt,
      likesCount: stats.likedBy.length + (stats.bonusLikes || 0),
      likedByViewer: viewerUid ? stats.likedBy.includes(viewerUid) : false,
      commentsCount: stats.commentsCount,
    };
  });
}

async function updatePostVisibility(uid, postId, visibility) {
  if (!["everyone", "friends", "only_me"].includes(visibility)) throw new Error("Invalid option.");
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  if (snap.data().uid !== uid) throw new Error("You can only manage your own posts.");
  await ref.update({ visibility });
  return { visibility };
}

const POST_SETTINGS_FIELDS = {
  commentsEnabled: (v) => typeof v === "boolean",
  reshareEnabled: (v) => typeof v === "boolean",
  linksEnabled: (v) => typeof v === "boolean",
};

async function updatePostSettings(uid, postId, updates) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  if (snap.data().uid !== uid) throw new Error("You can only manage your own posts.");

  const data = {};
  for (const key of Object.keys(updates || {})) {
    const validator = POST_SETTINGS_FIELDS[key];
    if (validator && validator(updates[key])) data[key] = updates[key];
  }
  if (Object.keys(data).length === 0) throw new Error("No valid setting provided.");
  await ref.update(data);
  return data;
}

async function updatePost(uid, postId, { text, imageDataUrl, taggedUsernames }) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  const post = snap.data();
  if (post.uid !== uid) throw new Error("You can only edit your own posts.");

  const cleanText = (text || "").toString().trim().slice(0, 2000);
  const finalImage = imageDataUrl !== undefined ? imageDataUrl : post.imageDataUrl;
  if (!cleanText && !finalImage) throw new Error("Write something or add a photo first.");
  if (imageDataUrl && !validateImageDataUrl(imageDataUrl, MAX_POST_IMAGE_BYTES)) {
    throw new Error("Please attach a valid image.");
  }

  const author = await getUserProfile(uid);
  const tagged = await resolveTaggedUsers(uid, taggedUsernames);
  const newUids = tagged.map((t) => t.uid);
  const oldUids = new Set(post.taggedUids || []);
  const newlyTagged = tagged.filter((t) => !oldUids.has(t.uid));

  await ref.update({
    text: cleanText,
    imageDataUrl: finalImage || null,
    taggedUids: newUids,
    editedAt: Date.now(),
  });

  const authorName = author ? (`${author.firstName || ""} ${author.lastName || ""}`.trim() || `@${author.username}`) : "Someone";
  const postUrl = author ? `/u/${author.username}#post-${postId}` : null;
  for (const t of newlyTagged) {
    await addNotification(t.uid, "tag", `${authorName} tagged you.`, { postId, postUrl });
  }

  const updatedSnap = await ref.get();
  const updated = updatedSnap.data();
  return {
    id: postId,
    text: updated.text,
    imageDataUrl: updated.imageDataUrl || null,
    taggedUids: updated.taggedUids || [],
    visibility: updated.visibility || "everyone",
    resharedFrom: updated.resharedFrom || null,
    commentsEnabled: updated.commentsEnabled !== false,
    reshareEnabled: updated.reshareEnabled !== false,
    linksEnabled: updated.linksEnabled !== false,
    reshareCount: updated.reshareCount || 0,
    editedAt: updated.editedAt || null,
    createdAt: updated.createdAt,
    likesCount: (updated.likedBy || []).length + (updated.bonusLikes || 0),
    likedByViewer: (updated.likedBy || []).includes(uid),
    commentsCount: updated.commentsCount || 0,
  };
}

async function deletePost(uid, postId) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  const post = snap.data();
  if (post.uid !== uid) throw new Error("You can only delete your own posts.");

  const likeCount = (post.likedBy || []).length + (post.bonusLikes || 0);
  if (likeCount > 0) {
    await db.collection("users").doc(uid).update({
      likesCount: admin.firestore.FieldValue.increment(-likeCount),
    }).catch(() => {});
  }
  await ref.delete();
  return { ok: true };
}

async function togglePinPost(uid, postId) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  const post = snap.data();
  if (post.uid !== uid) throw new Error("You can only pin your own posts.");

  if (post.pinnedAt) {
    await ref.update({ pinnedAt: null });
    return { pinned: false };
  }

  const existingSnap = await db.collection("posts").where("uid", "==", uid).limit(200).get();
  const batch = db.batch();
  existingSnap.forEach((d) => {
    if (d.id !== postId && d.data().pinnedAt) batch.update(d.ref, { pinnedAt: null });
  });
  batch.update(ref, { pinnedAt: Date.now() });
  await batch.commit();
  return { pinned: true };
}

async function resharePost(uid, postId) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  const original = snap.data();
  if (original.uid === uid) throw new Error("You can't reshare your own post.");
  if (original.resharedFrom) throw new Error("You can't reshare a reshared post.");
  if (original.reshareEnabled === false) throw new Error("Reshare is turned off for this post.");

  const [author, resharer] = await Promise.all([getUserProfile(original.uid), getUserProfile(uid)]);
  if (!author || !resharer) throw new Error("Profile not found.");

  const newPost = {
    uid,
    text: original.text || "",
    imageDataUrl: original.imageDataUrl || null,
    taggedUids: [],
    likedBy: [],
    visibility: "everyone",
    resharedFrom: { postId, uid: original.uid, username: author.username },
    commentsEnabled: true,
    reshareEnabled: true,
    linksEnabled: true,
    reshareCount: 0,
    pinnedAt: null,
    editedAt: null,
    createdAt: Date.now(),
  };
  const newRef = await db.collection("posts").add(newPost);
  await ref.update({ reshareCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});

  const resharerName = `${resharer.firstName || ""} ${resharer.lastName || ""}`.trim() || `@${resharer.username}`;
  const postUrl = `/u/${resharer.username}#post-${newRef.id}`;
  await addNotification(original.uid, "reshare", `${resharerName} reshared your post.`, { postId: newRef.id, postUrl });

  return { id: newRef.id, ...newPost, likesCount: 0, likedByViewer: false, commentsCount: 0 };
}

async function fetchUsersByUid(uids) {
  const unique = [...new Set(uids)].filter(Boolean);
  const map = {};
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", chunk).get();
    snap.forEach((d) => { map[d.id] = d.data(); });
  }
  return map;
}

async function getPostOwner(postId) {
  const snap = await db.collection("posts").doc(postId).get();
  if (!snap.exists) return null;
  let data = snap.data();
  if (data.resharedFrom && data.resharedFrom.postId) {
    const origSnap = await db.collection("posts").doc(data.resharedFrom.postId).get();
    if (origSnap.exists) data = origSnap.data();
  }
  const owner = await getUserProfile(data.uid);
  return owner ? { uid: data.uid, username: owner.username } : { uid: data.uid, username: null };
}

async function getCommentAuthorUid(commentId) {
  const snap = await db.collection("comments").doc(commentId).get();
  if (!snap.exists) return null;
  return snap.data().uid || null;
}

async function addComment(uid, postId, text, taggedUsernames) {
  const cleanText = (text || "").toString().trim().slice(0, 500);
  if (!cleanText) throw new Error("Write something first.");
  const targetPostId = await resolveCommentTargetPostId(postId);
  const postRef = db.collection("posts").doc(targetPostId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) throw new Error("Post not found.");
  const postData = postSnap.data();
  if (postData.commentsEnabled === false) throw new Error("Comments are turned off for this post.");
  if (postData.linksEnabled === false && /https?:\/\//i.test(cleanText)) {
    throw new Error("Links are Disabled due to Users Privacy.");
  }

  const tagged = await resolveTaggedUsers(uid, taggedUsernames);
  const comment = { postId: targetPostId, uid, text: cleanText, taggedUids: tagged.map((t) => t.uid), likedBy: [], hidden: false, pinnedAt: null, createdAt: Date.now() };
  const ref = await db.collection("comments").add(comment);
  await postRef.update({ commentsCount: admin.firestore.FieldValue.increment(1) }).catch(() => {});

  const author = await getUserProfile(uid);
  if (tagged.length && author) {
    const authorName = `${author.firstName || ""} ${author.lastName || ""}`.trim() || `@${author.username}`;
    const postUrl = `/u/${author.username}#post-${targetPostId}`;
    for (const t of tagged) {
      if (t.uid === uid) continue;
      await addNotification(t.uid, "tag", `${authorName} tagged you in a comment.`, { postId: targetPostId, postUrl });
    }
  }

  return {
    id: ref.id,
    ...comment,
    likesCount: 0,
    likedByViewer: false,
    author: author ? {
      username: author.username, firstName: author.firstName || "", lastName: author.lastName || "",
      photoURL: author.showProfilePhoto === false ? null : (author.photoURL || null), isAdmin: isAdminEmail(author.email), verified: isVerificationActive(author),
    } : null,
  };
}

async function getComments(postId, viewerUid) {
  const targetPostId = await resolveCommentTargetPostId(postId);
  const postSnap = await db.collection("posts").doc(targetPostId).get();
  if (!postSnap.exists) throw new Error("Post not found.");
  const postOwnerUid = postSnap.data().uid;

  const snap = await db.collection("comments").where("postId", "==", targetPostId).limit(500).get();
  let comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  comments = comments.filter((c) => !c.hidden || c.uid === viewerUid || postOwnerUid === viewerUid);
  comments.sort((a, b) => {
    if (!!a.pinnedAt !== !!b.pinnedAt) return a.pinnedAt ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  const authors = await fetchUsersByUid(comments.map((c) => c.uid));
  return comments.map((c) => {
    const author = authors[c.uid];
    return {
      id: c.id,
      text: c.text,
      hidden: !!c.hidden,
      pinned: !!c.pinnedAt,
      createdAt: c.createdAt,
      isOwnComment: c.uid === viewerUid,
      likesCount: (c.likedBy || []).length,
      likedByViewer: (c.likedBy || []).includes(viewerUid),
      author: author ? {
        username: author.username, firstName: author.firstName || "", lastName: author.lastName || "",
        photoURL: author.showProfilePhoto === false ? null : (author.photoURL || null), isAdmin: isAdminEmail(author.email), verified: isVerificationActive(author),
      } : null,
    };
  }).map((c) => ({ ...c, canModerate: postOwnerUid === viewerUid }));
}

async function deleteComment(uid, commentId) {
  const ref = db.collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Comment not found.");
  const comment = snap.data();
  const postSnap = await db.collection("posts").doc(comment.postId).get();
  if (!postSnap.exists || postSnap.data().uid !== uid) throw new Error("Only the post owner can delete comments.");
  await ref.delete();
  await db.collection("posts").doc(comment.postId).update({ commentsCount: admin.firestore.FieldValue.increment(-1) }).catch(() => {});
  const likeCount = (comment.likedBy || []).length;
  if (likeCount > 0) {
    await db.collection("users").doc(comment.uid).update({
      likesCount: admin.firestore.FieldValue.increment(-likeCount),
    }).catch(() => {});
  }
  return { ok: true };
}

async function toggleCommentHide(uid, commentId) {
  const ref = db.collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Comment not found.");
  const comment = snap.data();
  const postSnap = await db.collection("posts").doc(comment.postId).get();
  if (!postSnap.exists || postSnap.data().uid !== uid) throw new Error("Only the post owner can hide comments.");
  const next = !comment.hidden;
  await ref.update({ hidden: next });
  return { hidden: next };
}

async function toggleCommentPin(uid, commentId) {
  const ref = db.collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Comment not found.");
  const comment = snap.data();
  const postSnap = await db.collection("posts").doc(comment.postId).get();
  if (!postSnap.exists || postSnap.data().uid !== uid) throw new Error("Only the post owner can pin comments.");
  const next = comment.pinnedAt ? null : Date.now();
  await ref.update({ pinnedAt: next });
  return { pinned: !!next };
}

async function toggleCommentLike(uid, commentId) {
  const ref = db.collection("comments").doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Comment not found.");
  const comment = snap.data();
  const likedBy = comment.likedBy || [];
  const alreadyLiked = likedBy.includes(uid);

  if (alreadyLiked) {
    await ref.update({ likedBy: admin.firestore.FieldValue.arrayRemove(uid) });
    await db.collection("users").doc(comment.uid).update({
      likesCount: admin.firestore.FieldValue.increment(-1),
    }).catch(() => {});
  } else {
    await ref.update({ likedBy: admin.firestore.FieldValue.arrayUnion(uid) });
    await db.collection("users").doc(comment.uid).update({
      likesCount: admin.firestore.FieldValue.increment(1),
    }).catch(() => {});
  }

  const updatedSnap = await ref.get();
  const updated = updatedSnap.data();
  return { likesCount: (updated.likedBy || []).length, likedByViewer: (updated.likedBy || []).includes(uid) };
}

async function togglePostLike(uid, postId) {
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Post not found.");
  const post = snap.data();

  const isReshare = !!(post.resharedFrom && post.resharedFrom.postId);
  const targetRef = isReshare ? db.collection("posts").doc(post.resharedFrom.postId) : ref;
  const targetSnap = isReshare ? await targetRef.get() : snap;
  if (!targetSnap.exists) throw new Error("Post not found.");
  const target = targetSnap.data();

  const likedBy = target.likedBy || [];
  const alreadyLiked = likedBy.includes(uid);

  if (alreadyLiked) {
    await targetRef.update({ likedBy: admin.firestore.FieldValue.arrayRemove(uid) });
    await db.collection("users").doc(target.uid).update({
      likesCount: admin.firestore.FieldValue.increment(-1),
    }).catch(() => {});
  } else {
    await targetRef.update({ likedBy: admin.firestore.FieldValue.arrayUnion(uid) });
    await db.collection("users").doc(target.uid).update({
      likesCount: admin.firestore.FieldValue.increment(1),
    }).catch(() => {});
    if (target.uid !== uid) {
      const [liker, author] = await Promise.all([getUserProfile(uid), getUserProfile(target.uid)]);
      const likerName = liker ? (`${liker.firstName || ""} ${liker.lastName || ""}`.trim() || `@${liker.username}`) : "Someone";
      const postUrl = author ? `/u/${author.username}#post-${targetRef.id}` : null;
      await addNotification(target.uid, "like", `${likerName} liked your post.`, { postId: targetRef.id, postUrl });
    }
  }

  const updatedSnap = await targetRef.get();
  const updated = updatedSnap.data();
  return { likesCount: (updated.likedBy || []).length + (updated.bonusLikes || 0), likedByViewer: (updated.likedBy || []).includes(uid) };
}

async function getFollowList(uid, type) {
  const field = type === "followers" ? "targetUid" : "followerUid";
  const otherField = type === "followers" ? "followerUid" : "targetUid";
  const snap = await db.collection("follows").where(field, "==", uid).limit(500).get();
  const otherUids = [...new Set(snap.docs.map((d) => d.data()[otherField]))];
  if (!otherUids.length) return [];

  const users = [];
  for (let i = 0; i < otherUids.length; i += 30) {
    const chunk = otherUids.slice(i, i + 30);
    const usnap = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();
    usnap.forEach((d) => {
      const data = d.data();
      if (data.pendingDeletion) return;
      users.push({
        uid: d.id,
        username: data.username || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        photoURL: data.showProfilePhoto === false ? null : (data.photoURL || null),
        isAdmin: isAdminEmail(data.email), verified: isVerificationActive(data),
      });
    });
  }
  return users;
}

async function getFollowingUids(uid) {
  const snap = await db.collection("follows").where("followerUid", "==", uid).limit(500).get();
  return [...new Set(snap.docs.map((d) => d.data().targetUid))];
}

async function getFollowingFeed(uid, { limit = 20, markSeen = false } = {}) {
  const followingUids = await getFollowingUids(uid);
  if (!followingUids.length) {
    if (markSeen) await updateUserProfile(uid, { lastSeenFeedAt: Date.now() }).catch(() => {});
    return [];
  }

  const rawPosts = [];
  for (let i = 0; i < followingUids.length; i += 30) {
    const chunk = followingUids.slice(i, i + 30);
    const snap = await db.collection("posts").where("uid", "in", chunk).limit(50).get();
    snap.docs.forEach((d) => rawPosts.push({ id: d.id, ...d.data() }));
  }
  rawPosts.sort((a, b) => b.createdAt - a.createdAt);

  const distinctAuthorUids = [...new Set(rawPosts.map((p) => p.uid))];
  const mutualChecks = await Promise.all(distinctAuthorUids.map((a) => isFollowing(a, uid)));
  const mutualSet = new Set(distinctAuthorUids.filter((_, i) => mutualChecks[i]));

  const visible = rawPosts
    .filter((p) => {
      const vis = p.visibility || "everyone";
      if (vis === "only_me") return false;
      if (vis === "friends") return mutualSet.has(p.uid);
      return true;
    })
    .slice(0, limit);

  const authorUids = [...new Set(visible.map((p) => p.uid))];
  const authorsByUid = new Map();
  for (let i = 0; i < authorUids.length; i += 30) {
    const chunk = authorUids.slice(i, i + 30);
    const usnap = await db.collection("users")
      .where(admin.firestore.FieldPath.documentId(), "in", chunk)
      .get();
    usnap.forEach((d) => {
      const data = d.data();
      authorsByUid.set(d.id, {
        uid: d.id,
        username: data.username || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        photoURL: data.showProfilePhoto === false ? null : (data.photoURL || null),
        isAdmin: isAdminEmail(data.email), verified: isVerificationActive(data),
      });
    });
  }

  const statsMap = await resolveEffectivePostStats(visible);

  const posts = visible.map((p) => {
    const stats = statsMap.get(p.id) || { likedBy: [], commentsCount: 0, commentsEnabled: true };
    return {
      id: p.id,
      author: authorsByUid.get(p.uid) || { uid: p.uid, username: "", firstName: "", lastName: "", photoURL: null },
      text: p.text || "",
      imageDataUrl: p.imageDataUrl || null,
      createdAt: p.createdAt,
      likesCount: stats.likedBy.length + (stats.bonusLikes || 0),
      likedByViewer: stats.likedBy.includes(uid),
      commentsCount: stats.commentsCount,
      commentsEnabled: stats.commentsEnabled,
    };
  });

  if (markSeen) await updateUserProfile(uid, { lastSeenFeedAt: Date.now() }).catch(() => {});
  return posts;
}

async function getFollowingFeedUnseenCount(uid, cachedProfile) {
  const followingUids = await getFollowingUids(uid);
  if (!followingUids.length) return 0;
  const profile = cachedProfile || (await getUserProfile(uid));
  const lastSeenFeedAt = profile?.lastSeenFeedAt || 0;

  let count = 0;
  for (let i = 0; i < followingUids.length; i += 30) {
    const chunk = followingUids.slice(i, i + 30);
    const snap = await db.collection("posts").where("uid", "in", chunk).limit(50)
      .select("createdAt", "visibility").get();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.createdAt <= lastSeenFeedAt) return;
      if ((data.visibility || "everyone") === "only_me") return;
      count++;
    });
  }
  return Math.min(count, 99);
}

async function searchUsersByUsername(query, excludeUid, limit = 15) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const [usernameSnap, altSnap] = await Promise.all([
    db.collection("users")
      .where("username", ">=", q)
      .where("username", "<=", q + "\uf8ff")
      .limit(limit)
      .get(),
    db.collection("users")
      .where("altUsernames", "array-contains", q)
      .limit(limit)
      .get(),
  ]);

  const byUid = new Map();
  for (const d of usernameSnap.docs) {
    if (d.id === excludeUid || !d.data().username || d.data().pendingDeletion) continue;
    byUid.set(d.id, { doc: d, matchedAltUsername: null });
  }
  for (const d of altSnap.docs) {
    if (d.id === excludeUid || d.data().pendingDeletion) continue;
    if (!byUid.has(d.id)) byUid.set(d.id, { doc: d, matchedAltUsername: q });
  }

  return Array.from(byUid.values())
    .slice(0, limit)
    .map(({ doc, matchedAltUsername }) => {
      const data = doc.data();
      return {
        uid: doc.id,
        username: data.username,
        matchedAltUsername,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        photoURL: data.showProfilePhoto === false ? null : (data.photoURL || null),
        isAdmin: isAdminEmail(data.email), verified: isVerificationActive(data),
      };
    });
}

const LAST_ACTIVE_UPDATE_THROTTLE_MS = 2 * 60 * 1000;

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session;
  verifySession(sessionId)
    .then(async (uid) => {
      if (!uid) return res.status(401).json({ error: "not_authenticated" });
      const profile = await getUserProfile(uid);
      if (!profile || profile.pendingDeletion || profile.banned || isSessionRevoked(sessionId, profile)) {
        await deleteSession(sessionId);
        return res.status(401).json({ error: "not_authenticated" });
      }
      req.uid = uid;
      req.userProfile = profile;
      if (!profile.lastActiveAt || Date.now() - profile.lastActiveAt > LAST_ACTIVE_UPDATE_THROTTLE_MS) {
        updateUserProfile(uid, { lastActiveAt: Date.now() }).catch(() => {});
      }
      next();
    })
    .catch(() => res.status(401).json({ error: "not_authenticated" }));
}

async function optionalAuth(req, res, next) {
  try {
    const sessionId = req.cookies?.session;
    const uid = sessionId ? await verifySession(sessionId) : null;
    if (uid) {
      const profile = await getUserProfile(uid);
      if (profile && !profile.pendingDeletion && !profile.banned && !isSessionRevoked(sessionId, profile)) {
        req.uid = uid;
        req.userProfile = profile;
      }
    }
  } catch {
  }
  next();
}

const ADMIN_PAGE_SIZE = 20;

function adminUserView(uid, data) {
  return {
    uid,
    username: data.username || "",
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    email: data.email || "",
    telegramId: data.telegramId || "",
    githubId: data.githubId || "",
    githubLogin: data.githubLogin || "",
    photoURL: data.showProfilePhoto === false ? null : (data.photoURL || null),
    isAdmin: isAdminEmail(data.email),
    banned: !!data.banned,
    verified: isVerificationActive(data),
    verifiedExpiresAt: data.verifiedExpiresAt || null,
    verifiedVia: data.verifiedVia || null,
  };
}

async function adminListUsers({ cursor } = {}) {
  let q = db.collection("users").orderBy("createdAt", "desc").limit(ADMIN_PAGE_SIZE);
  if (cursor) {
    const cursorSnap = await db.collection("users").doc(cursor).get();
    if (cursorSnap.exists) q = q.startAfter(cursorSnap);
  }
  const snap = await q.get();
  const results = snap.docs
    .filter((d) => !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
    .map((d) => adminUserView(d.id, d.data()));
  const last = snap.docs.length === ADMIN_PAGE_SIZE ? snap.docs[snap.docs.length - 1].id : null;
  return { results, nextCursor: last };
}

async function adminSearchUsers(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const usernameSnap = await db.collection("users")
    .where("username", ">=", q)
    .where("username", "<=", q + "\uf8ff")
    .limit(20)
    .get();
  const results = new Map();
  usernameSnap.docs
    .filter((d) => d.data().username && !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
    .forEach((d) => results.set(d.id, adminUserView(d.id, d.data())));

  if (/^\d+$/.test(q)) {
    const tgSnap = await db.collection("users").where("telegramId", "==", q).limit(5).get();
    tgSnap.docs
      .filter((d) => !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
      .forEach((d) => results.set(d.id, adminUserView(d.id, d.data())));
  }

  if (/^\d+$/.test(q)) {
    const ghIdSnap = await db.collection("users").where("githubId", "==", q).limit(5).get();
    ghIdSnap.docs
      .filter((d) => !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
      .forEach((d) => results.set(d.id, adminUserView(d.id, d.data())));
  }
  const ghLoginSnap = await db.collection("users").where("githubLoginLower", "==", q).limit(5).get();
  ghLoginSnap.docs
    .filter((d) => !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
    .forEach((d) => results.set(d.id, adminUserView(d.id, d.data())));

  return Array.from(results.values());
}

async function adminListBannedUsers() {
  const snap = await db.collection("users").where("banned", "==", true).limit(300).get();
  return snap.docs
    .filter((d) => !isAdminEmail(d.data().email))
    .map((d) => adminUserView(d.id, d.data()));
}

async function adminBanUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (isAdminEmail(profile.email)) throw new Error("You can't ban the admin account.");
  await auth.updateUser(uid, { disabled: true });
  await db.collection("users").doc(uid).update({ banned: true, bannedAt: Date.now() });
  await revokeAllSessions(uid);

  if (profile.email) {
    try {
      const name = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.username || "there";
      const logLines = [
        "[Write your appeal message above this line]",
        "",
        "",
        "──── logs.txt ────",
        `Name: ${name}`,
        `Username: ${profile.username || "None"}`,
        `Email address: ${profile.email || "None"}`,
        "Password: None available",
        `Verified: ${profile.verified ? "Yes" : "No"}`,
        `2FA: ${profile.twoFactorEnabled ? "Yes" : "No"}`,
      ];
      const appealMailto =
        `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent("Urgent : Account Deactivation Appeal")}` +
        `&body=${encodeURIComponent(logLines.join("\n"))}`;
      const logFileText = [
        `Name: ${name}`,
        `Username: ${profile.username || "None"}`,
        `Email address: ${profile.email || "None"}`,
        "Password: None available",
        `Verified: ${profile.verified ? "Yes" : "No"}`,
        `2FA: ${profile.twoFactorEnabled ? "Yes" : "No"}`,
      ].join("\n");
      await sendBanNotificationEmail(profile.email, name, appealMailto, logFileText);
    } catch {
    }
  }

  return adminUserView(uid, (await getUserProfile(uid)) || profile);
}

async function adminUnbanUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  await auth.updateUser(uid, { disabled: false });
  await db.collection("users").doc(uid).update({ banned: false, bannedAt: null });
  return adminUserView(uid, { ...profile, banned: false });
}

async function adminVerifyUser(uid, opts = {}) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  const verifiedExpiresAt = opts.expiresAt || null;
  const verifiedVia = opts.via || "admin";
  await db.collection("users").doc(uid).update({ verified: true, verifiedAt: Date.now(), verifiedExpiresAt, verifiedVia });
  return adminUserView(uid, { ...profile, verified: true, verifiedExpiresAt, verifiedVia });
}

async function adminUnverifyUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  await db.collection("users").doc(uid).update({ verified: false, verifiedAt: null, verifiedExpiresAt: null, verifiedVia: null });
  return adminUserView(uid, { ...profile, verified: false, verifiedExpiresAt: null, verifiedVia: null });
}

const PAID_VERIFICATION_DAYS = 30;

async function createVerificationPayment(uid, reference, amountKobo) {
  await db.collection("verificationPayments").doc(reference).set({
    uid,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });
}

async function getVerificationPayment(reference) {
  const snap = await db.collection("verificationPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function finalizeVerificationPayment(reference, paystackData) {
  const ref = db.collection("verificationPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const expiresAt = Date.now() + PAID_VERIFICATION_DAYS * 24 * 60 * 60 * 1000;
  await db.collection("users").doc(record.uid).update({
    verified: true,
    verifiedAt: Date.now(),
    verifiedExpiresAt: expiresAt,
    verifiedVia: "payment",
  });
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await saveBillingAuthorization(record.uid, paystackData);
  await addNotification(record.uid, "verified", "You are now Verified", { expiresAt });
  await creditReferralCommission(record.uid, record.amountKobo / 100, "account verification");

  return { alreadyProcessed: false, uid: record.uid, expiresAt };
}

const API_PLAN_DAYS = 30;

const API_PLANS = {
  free: { name: "Free", apiKeys: 1, streamHours: 6, watermark: true, customVisitPage: false, priceNgn: 0, monthlyRequests: 50 },
  starter: { name: "Starter", apiKeys: 3, streamHours: 12, watermark: true, customVisitPage: false, priceNgn: 0, monthlyRequests: 50 },
  standard: { name: "Standard", apiKeys: 5, streamHours: 24, watermark: true, customVisitPage: false, priceNgn: 3000, monthlyRequests: 100 },
  pro: { name: "Pro", apiKeys: 10, streamHours: 72, watermark: false, customVisitPage: false, priceNgn: 5000, monthlyRequests: 100 },
  max: { name: "Max", apiKeys: 15, streamHours: 168, watermark: false, customVisitPage: true, priceNgn: 10000, monthlyRequests: Infinity },
};

const MAX_PASSKEYS_VERIFIED = 3;
const MAX_PASSKEYS_UNVERIFIED = 1;

const PURCHASABLE_API_PLANS = ["standard", "pro", "max"];

const TRADING_PLAN_DAYS = 7;

const TRADING_PLANS = {
  free: { name: "Free", priceNgn: 0, requiresVerification: false, manualTradesPerWeek: 3, maxPositions: 2, aiTrading: false, community: false, coinsOnProfit: 0, instantBonusNgn: 0 },
  starter: { name: "Starter", priceNgn: 0, requiresVerification: true, manualTradesPerWeek: 5, maxPositions: 5, aiTrading: false, community: false, coinsOnProfit: 3, instantBonusNgn: 0 },
  standard: { name: "Standard", priceNgn: 5000, requiresVerification: false, manualTradesPerWeek: 7, maxPositions: 7, aiTrading: false, community: true, coinsOnProfit: 5, instantBonusNgn: 0 },
  pro: { name: "Pro", priceNgn: 10000, requiresVerification: false, manualTradesPerWeek: 15, maxPositions: 15, aiTrading: true, community: true, coinsOnProfit: 10, instantBonusNgn: 0 },
  max: { name: "Max", priceNgn: 15000, requiresVerification: false, manualTradesPerWeek: 20, maxPositions: 20, aiTrading: true, community: true, coinsOnProfit: 25, instantBonusNgn: 500 },
};

const PURCHASABLE_TRADING_PLANS = ["standard", "pro", "max"];
const TRADING_PROFIT_ROI_THRESHOLD = 100;

function getEffectiveTradingPlan(data) {
  if (!data) return "free";
  if (data.tradingPlanPaid && TRADING_PLANS[data.tradingPlanPaid] && data.tradingPlanExpiresAt && Date.now() < data.tradingPlanExpiresAt) {
    return data.tradingPlanPaid;
  }
  if (isVerificationActive(data)) return "starter";
  return "free";
}

function getTradingPlanConfig(data) {
  return TRADING_PLANS[getEffectiveTradingPlan(data)];
}

async function createTradingPlanPayment(uid, reference, amountKobo, plan) {
  await db.collection("tradingPlanPayments").doc(reference).set({
    uid,
    plan,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });
}

async function getTradingPlanPayment(reference) {
  const snap = await db.collection("tradingPlanPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function finalizeTradingPlanPayment(reference, paystackData) {
  const ref = db.collection("tradingPlanPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const plan = TRADING_PLANS[record.plan];
  const expiresAt = Date.now() + TRADING_PLAN_DAYS * 24 * 60 * 60 * 1000;
  await db.collection("users").doc(record.uid).update({
    tradingPlanPaid: record.plan,
    tradingPlanPurchasedAt: Date.now(),
    tradingPlanExpiresAt: expiresAt,
  });
  if (plan.instantBonusNgn) {
    await db.collection("users").doc(record.uid).set({ nairaBalance: admin.firestore.FieldValue.increment(plan.instantBonusNgn) }, { merge: true });
  }
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await saveBillingAuthorization(record.uid, paystackData);
  await addNotification(record.uid, "trading_plan", `Your ${plan.name} Trading plan is now active`, { plan: record.plan, expiresAt });
  await creditReferralCommission(record.uid, record.amountKobo / 100, "Trading plan purchase");

  return { alreadyProcessed: false, uid: record.uid, plan: record.plan, expiresAt, instantBonusNgn: plan.instantBonusNgn || 0 };
}

function tradingWeekWindow(profile) {
  const start = profile.tradingWeekStart || 0;
  const now = Date.now();
  if (!start || now - start > TRADING_PLAN_DAYS * 24 * 60 * 60 * 1000) {
    return { start: now, count: 0, resetNeeded: true };
  }
  return { start, count: profile.tradingWeekCount || 0, resetNeeded: false };
}

async function checkAndIncrementManualTradeQuota(uid) {
  const ref = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error("Account not found."), { status: 404 });
    const profile = snap.data();
    const plan = getTradingPlanConfig(profile);
    const window = tradingWeekWindow(profile);
    if (window.count >= plan.manualTradesPerWeek) {
      const resetAt = window.start + TRADING_PLAN_DAYS * 24 * 60 * 60 * 1000;
      throw Object.assign(
        new Error(`You've used all ${plan.manualTradesPerWeek} manual trades on the ${plan.name} plan this week. Resets ${new Date(resetAt).toLocaleString("en-NG")}.`),
        { status: 403 }
      );
    }
    tx.set(ref, { tradingWeekStart: window.start, tradingWeekCount: window.count + 1 }, { merge: true });
    return { remaining: plan.manualTradesPerWeek - (window.count + 1) };
  });
}

async function checkPositionLimit(uid, openPositionCount) {
  const profile = await getUserProfile(uid);
  if (!profile) throw Object.assign(new Error("Account not found."), { status: 404 });
  const plan = getTradingPlanConfig(profile);
  if (openPositionCount >= plan.maxPositions) {
    throw Object.assign(
      new Error(`Your ${plan.name} plan allows up to ${plan.maxPositions} open positions at a time.`),
      { status: 403 }
    );
  }
  return true;
}

async function requireAiTradingAccess(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw Object.assign(new Error("Account not found."), { status: 404 });
  const plan = getTradingPlanConfig(profile);
  if (!plan.aiTrading) {
    throw Object.assign(new Error(`Auto Trading is a Pro and Max plan feature. You're on the ${plan.name} plan.`), { status: 403 });
  }
  return true;
}

async function requireCommunityAccess(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw Object.assign(new Error("Account not found."), { status: 404 });
  const plan = getTradingPlanConfig(profile);
  if (!plan.community) {
    throw Object.assign(new Error(`The community chat is a Standard plan and above feature. You're on the ${plan.name} plan.`), { status: 403 });
  }
  return { profile, plan };
}

async function creditTradingProfitCoins(uid, roiPercent, isDemo) {
  if (isDemo || roiPercent < TRADING_PROFIT_ROI_THRESHOLD) return { credited: 0 };
  const profile = await getUserProfile(uid);
  if (!profile) return { credited: 0 };
  const plan = getTradingPlanConfig(profile);
  if (!plan.coinsOnProfit) return { credited: 0 };
  await db.collection("users").doc(uid).set({ coinBalance: admin.firestore.FieldValue.increment(plan.coinsOnProfit) }, { merge: true });
  await addNotification(uid, "trading_profit_coins", `You earned ${plan.coinsOnProfit} coins for a live trade closed at ${roiPercent.toFixed(0)}% ROI`, { coins: plan.coinsOnProfit, roiPercent });
  return { credited: plan.coinsOnProfit };
}

const COMMUNITY_CHAT_NAME = "ES TEAMS FT SIGNALS";
const COMMUNITY_CHAT_MAX_LEN = 1000;
const COMMUNITY_CHAT_PAGE_SIZE = 50;

async function sendCommunityMessage(uid, text, attachment) {
  const { profile } = await requireCommunityAccess(uid);
  const trimmed = String(text || "").trim();
  const cleanAttachment = validateSupportAttachment(attachment);
  if (!trimmed && !cleanAttachment) throw Object.assign(new Error("Type a message first."), { status: 400 });
  if (trimmed.length > COMMUNITY_CHAT_MAX_LEN) throw Object.assign(new Error("Message is too long."), { status: 400 });
  const now = Date.now();
  const msgRef = db.collection("communityChat").doc();
  const messageDoc = {
    uid,
    username: profile.username || "Trader",
    text: trimmed,
    createdAt: now,
    attachmentDataUrl: cleanAttachment ? cleanAttachment.dataUrl : null,
    attachmentType: cleanAttachment ? cleanAttachment.type : null,
  };
  await msgRef.set(messageDoc);
  return { id: msgRef.id, ...messageDoc };
}

async function getCommunityMessages(uid, limit = COMMUNITY_CHAT_PAGE_SIZE) {
  await requireCommunityAccess(uid);
  const snap = await db.collection("communityChat").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
}

const RENEW_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;
const RENEW_RETRY_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const RENEW_MAX_ATTEMPTS = 3;

const RENEWABLE_PRODUCTS = {
  verification: {
    autoField: "verificationAutoRenew",
    expiryField: "verifiedExpiresAt",
    days: PAID_VERIFICATION_DAYS,
    label: "Account verification",
    commissionLabel: "account verification",
    priceNgn: () => VERIFICATION_PRICE_NGN,
    applyRenewal: (expiresAt) => ({
      verified: true,
      verifiedAt: Date.now(),
      verifiedExpiresAt: expiresAt,
      verifiedVia: "payment",
    }),
  },
  livetv: {
    autoField: "apiPlanAutoRenew",
    expiryField: "apiPlanExpiresAt",
    planField: "apiPlanPaid",
    days: API_PLAN_DAYS,
    label: "Live TV API plan",
    commissionLabel: "Live TV API plan renewal",
    priceNgn: (data) => API_PLANS[data.apiPlanPaid]?.priceNgn || 0,
    applyRenewal: (expiresAt) => ({ apiPlanExpiresAt: expiresAt }),
  },
  devapi: {
    autoField: "devApiPlanAutoRenew",
    expiryField: "devApiPlanExpiresAt",
    planField: "devApiPlanPaid",
    days: DEV_API_PLAN_DAYS,
    label: "Developer API plan",
    commissionLabel: "Developer API plan renewal",
    priceNgn: (data) => DEV_API_PLANS[data.devApiPlanPaid]?.priceNgn || 0,
    applyRenewal: (expiresAt) => ({ devApiPlanExpiresAt: expiresAt }),
  },
};

async function saveBillingAuthorization(uid, paystackData) {
  try {
    const auth = paystackData && paystackData.authorization;
    if (!auth || !auth.authorization_code || auth.reusable === false) return;
    await db.collection("users").doc(uid).set(
      {
        billingAuth: {
          code: auth.authorization_code,
          last4: auth.last4 || "",
          brand: auth.brand || auth.card_type || "",
          bank: auth.bank || "",
          expMonth: auth.exp_month || "",
          expYear: auth.exp_year || "",
          email: (paystackData.customer && paystackData.customer.email) || "",
          savedAt: Date.now(),
        },
      },
      { merge: true }
    );
  } catch (err) {
    console.error("saveBillingAuthorization failed:", err.message);
  }
}

function billingCardSummary(profile) {
  const auth = profile && profile.billingAuth;
  if (!auth || !auth.code) return null;
  return {
    last4: auth.last4 || "",
    brand: auth.brand || "",
    bank: auth.bank || "",
    expMonth: auth.expMonth || "",
    expYear: auth.expYear || "",
    savedAt: auth.savedAt || null,
  };
}

async function removeBillingAuthorization(uid) {
  const update = { billingAuth: admin.firestore.FieldValue.delete() };
  for (const key of Object.keys(RENEWABLE_PRODUCTS)) {
    update[RENEWABLE_PRODUCTS[key].autoField] = false;
  }
  await db.collection("users").doc(uid).update(update);
  return { ok: true };
}

async function setAutoRenew(uid, product, enabled) {
  const config = RENEWABLE_PRODUCTS[product];
  if (!config) throw Object.assign(new Error("Unknown subscription."), { status: 400 });
  const profile = await getUserProfile(uid);
  if (!profile) throw Object.assign(new Error("Account not found."), { status: 404 });
  if (enabled && !billingCardSummary(profile)) {
    throw Object.assign(
      new Error("No saved card yet. Pay for this once and your card is saved for renewals."),
      { status: 400 }
    );
  }
  await db.collection("users").doc(uid).set({ [config.autoField]: !!enabled }, { merge: true });
  return { product, enabled: !!enabled };
}

function renewalDueState(data, product, now) {
  const config = RENEWABLE_PRODUCTS[product];
  const expiresAt = data[config.expiryField] || 0;
  if (!expiresAt) return { due: false };
  if (config.planField && !data[config.planField]) return { due: false };
  if (expiresAt > now + RENEW_LOOKAHEAD_MS) return { due: false };
  return { due: true, expiresAt, lapsed: expiresAt <= now };
}

async function claimRenewalAttempt(uid, product, now) {
  const config = RENEWABLE_PRODUCTS[product];
  const userRef = db.collection("users").doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) return null;
    const data = snap.data();
    if (!data[config.autoField]) return null;
    if (!data.billingAuth || !data.billingAuth.code) return null;
    const state = renewalDueState(data, product, now);
    if (!state.due) return null;
    const prev = (data.renewState && data.renewState[product]) || {};
    const sameCycle = prev.cycle === state.expiresAt;
    if (sameCycle && prev.lastAttemptAt && now - prev.lastAttemptAt < RENEW_RETRY_COOLDOWN_MS) return null;
    if (sameCycle && (prev.attempts || 0) >= RENEW_MAX_ATTEMPTS) return null;
    tx.set(
      userRef,
      {
        renewState: {
          [product]: {
            cycle: state.expiresAt,
            attempts: (sameCycle ? prev.attempts || 0 : 0) + 1,
            lastAttemptAt: now,
          },
        },
      },
      { merge: true }
    );
    return { data, expiresAt: state.expiresAt, attempt: (sameCycle ? prev.attempts || 0 : 0) + 1 };
  });
}

async function renewOneSubscription(uid, product, claimed, chargeFn) {
  const config = RENEWABLE_PRODUCTS[product];
  const data = claimed.data;
  const priceNgn = config.priceNgn(data);
  const userRef = db.collection("users").doc(uid);

  if (!priceNgn) {
    await userRef.set({ [config.autoField]: false }, { merge: true });
    return { uid, product, outcome: "no_price" };
  }

  let charge;
  try {
    charge = await chargeFn({
      email: data.billingAuth.email || data.email,
      amountKobo: priceNgn * 100,
      authorizationCode: data.billingAuth.code,
      metadata: { uid, purpose: "auto_renew", product },
    });
  } catch (err) {
    charge = { status: "failed", gateway_response: err.message };
  }

  if (charge && charge.status === "success") {
    const base = Math.max(Date.now(), claimed.expiresAt);
    const nextExpiry = base + config.days * 24 * 60 * 60 * 1000;
    await userRef.set(
      {
        ...config.applyRenewal(nextExpiry),
        renewState: { [product]: admin.firestore.FieldValue.delete() },
      },
      { merge: true }
    );
    await addNotification(
      uid,
      "auto_renew",
      `${config.label} renewed. ₦${priceNgn.toLocaleString("en-NG")} was charged to your saved card.`,
      { product, expiresAt: nextExpiry, amountNgn: priceNgn }
    );
    await creditReferralCommission(uid, priceNgn, config.commissionLabel).catch(() => {});
    return { uid, product, outcome: "renewed", expiresAt: nextExpiry };
  }

  const reason = (charge && (charge.gateway_response || charge.message)) || "The charge did not go through.";
  const lapsedNow = claimed.expiresAt <= Date.now();

  if (lapsedNow || claimed.attempt >= RENEW_MAX_ATTEMPTS) {
    await userRef.set({ [config.autoField]: false }, { merge: true });
    await addNotification(
      uid,
      "auto_renew_failed",
      `${config.label} could not be renewed and has now ended. ${reason}`,
      { product, reason }
    );
    return { uid, product, outcome: "ended", reason };
  }

  if (claimed.attempt === 1) {
    await addNotification(
      uid,
      "auto_renew_retry",
      `We could not charge your saved card for your ${config.label}. We will try again before it expires.`,
      { product, reason }
    );
  }
  return { uid, product, outcome: "failed", reason };
}

async function runSubscriptionRenewals(chargeFn) {
  const now = Date.now();
  const results = [];
  for (const product of Object.keys(RENEWABLE_PRODUCTS)) {
    const config = RENEWABLE_PRODUCTS[product];
    let snap;
    try {
      snap = await db.collection("users").where(config.autoField, "==", true).get();
    } catch (err) {
      console.error(`[auto-renew] query failed for ${product}:`, err.message);
      continue;
    }
    for (const doc of snap.docs) {
      const quick = renewalDueState(doc.data(), product, now);
      if (!quick.due) continue;
      let claimed;
      try {
        claimed = await claimRenewalAttempt(doc.id, product, now);
      } catch (err) {
        console.error(`[auto-renew] claim failed for ${doc.id}/${product}:`, err.message);
        continue;
      }
      if (!claimed) continue;
      try {
        results.push(await renewOneSubscription(doc.id, product, claimed, chargeFn));
      } catch (err) {
        console.error(`[auto-renew] charge failed for ${doc.id}/${product}:`, err.message);
        results.push({ uid: doc.id, product, outcome: "error", reason: err.message });
      }
    }
  }
  if (results.length) {
    const summary = results.reduce((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] || 0) + 1;
      return acc;
    }, {});
    console.log("[auto-renew] " + JSON.stringify(summary));
  }
  return results;
}

function getEffectiveApiPlan(data) {
  if (!data) return "free";
  if (data.apiPlanPaid && API_PLANS[data.apiPlanPaid] && data.apiPlanExpiresAt && Date.now() < data.apiPlanExpiresAt) {
    return data.apiPlanPaid;
  }
  if (isVerificationActive(data)) return "starter";
  return "free";
}

function getApiPlanConfig(data) {
  return API_PLANS[getEffectiveApiPlan(data)];
}

const BONUS_CODE_AMOUNTS = [5, 10, 25, 50, 100];
const BONUS_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateBonusCodeString() {
  const bytes = crypto.randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += BONUS_CODE_ALPHABET[bytes[i] % BONUS_CODE_ALPHABET.length];
  return out;
}

async function createBonusCode(adminUid, amount, maxRedemptions) {
  const parsedAmount = Number(amount);
  if (!BONUS_CODE_AMOUNTS.includes(parsedAmount)) {
    throw new Error(`Bonus amount must be one of: ${BONUS_CODE_AMOUNTS.join(", ")}.`);
  }
  const limit = Number(maxRedemptions);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Max redemptions must be a positive whole number.");
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateBonusCodeString();
    const ref = db.collection("bonusCodes").doc(code);
    const snap = await ref.get();
    if (snap.exists) continue;
    const entry = {
      code,
      amount: parsedAmount,
      maxRedemptions: limit,
      redemptionsCount: 0,
      createdAt: Date.now(),
      createdBy: adminUid,
    };
    await ref.set(entry);
    return entry;
  }
  throw new Error("Could not generate a unique bonus code. Try again.");
}

async function listBonusCodes() {
  const snap = await db.collection("bonusCodes").orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => d.data());
}

async function redeemBonusCode(uid, rawCode, product) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) throw Object.assign(new Error("Enter a bonus code."), { status: 400 });
  if (!/^[A-Z0-9]{1,32}$/.test(code)) {
    throw Object.assign(new Error("That bonus code doesn't exist."), { status: 404 });
  }
  const field = product === "devapi" ? "bonusDevApiRequests" : "bonusApiRequests";
  const codeRef = db.collection("bonusCodes").doc(code);
  const redemptionRef = codeRef.collection("redemptions").doc(uid);
  const userRef = db.collection("users").doc(uid);
  const result = await db.runTransaction(async (tx) => {
    const [codeSnap, redemptionSnap] = await Promise.all([tx.get(codeRef), tx.get(redemptionRef)]);
    if (!codeSnap.exists) throw Object.assign(new Error("That bonus code doesn't exist."), { status: 404 });
    const data = codeSnap.data();
    if (redemptionSnap.exists) throw Object.assign(new Error("You've already used this bonus code."), { status: 400 });
    if (data.redemptionsCount >= data.maxRedemptions) {
      throw Object.assign(new Error("This bonus code has expired."), { status: 400 });
    }
    tx.set(redemptionRef, { uid, product, redeemedAt: Date.now() });
    tx.update(codeRef, { redemptionsCount: data.redemptionsCount + 1 });
    tx.set(userRef, { [field]: admin.firestore.FieldValue.increment(data.amount) }, { merge: true });
    return { amount: data.amount, product };
  });
  const productLabel = product === "devapi" ? "Developer API" : "Live TV API";
  await addNotification(uid, "bonus_code", `You've received +${result.amount} request limit on your ${productLabel}`, { amount: result.amount, product });
  return result;
}

const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERRAL_SIGNUP_COINS = 5;
const DAILY_COIN_CLAIM_AMOUNT = 2;
const ADMIN_DAILY_COIN_CLAIM_AMOUNT = 5;
const REFERRAL_COMMISSION_RATE = 0.15;
const MIN_WITHDRAWAL_NGN = 3000;
const MAX_WITHDRAWAL_NGN = 100000;
const WITHDRAWAL_TAX_RATE = 0.15;
const MIN_COIN_TRANSFER = 5;
const MAX_COIN_TRANSFER = 100;

const COIN_STORE_ITEMS = {
  boost30: { label: "+30 request limit", coinCost: 40, bonusAmount: 30 },
  boost50: { label: "+50 request limit", coinCost: 80, bonusAmount: 50 },
  boost100: { label: "+100 request limit", coinCost: 160, bonusAmount: 100 },
  verify3d: { label: "3-day account verification", coinCost: 220 },
};

const COIN_PACKAGES = {
  pack25: { coins: 25, priceNgn: 100 },
  pack50: { coins: 50, priceNgn: 200 },
  pack150: { coins: 150, priceNgn: 500 },
  pack350: { coins: 350, priceNgn: 900 },
  pack500: { coins: 500, priceNgn: 1200 },
  pack1000: { coins: 1000, priceNgn: 2000 },
};

async function generateReferralCode() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const bytes = crypto.randomBytes(7);
    let code = "";
    for (let i = 0; i < 7; i++) code += REFERRAL_CODE_ALPHABET[bytes[i] % REFERRAL_CODE_ALPHABET.length];
    const existing = await db.collection("users").where("referralCode", "==", code).limit(1).get();
    if (existing.empty) return code;
  }
  return "R" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

async function ensureReferralCode(uid, profile) {
  if (profile && profile.referralCode) return profile.referralCode;
  const code = await generateReferralCode();
  await db.collection("users").doc(uid).update({ referralCode: code });
  return code;
}

async function findUserByReferralCode(code) {
  if (!code) return null;
  const snap = await db.collection("users").where("referralCode", "==", code).limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

async function applyReferral(newUid, rawReferredByCode) {
  const code = String(rawReferredByCode || "").trim().toUpperCase();
  if (!code || !/^[A-Z0-9]{4,16}$/.test(code)) return;
  const referrer = await findUserByReferralCode(code);
  if (!referrer || referrer.uid === newUid) return;
  const newProfile = await getUserProfile(newUid);
  const referralRef = db.collection("referrals").doc(newUid);
  const newUserRef = db.collection("users").doc(newUid);
  const referrerRef = db.collection("users").doc(referrer.uid);
  const applied = await db.runTransaction(async (tx) => {
    const existing = await tx.get(referralRef);
    if (existing.exists) return false;
    tx.set(referralRef, {
      referrerUid: referrer.uid,
      referredUid: newUid,
      referredUsername: (newProfile && newProfile.username) || "",
      referredAt: Date.now(),
      totalCommissionNgn: 0,
    });
    tx.update(newUserRef, { referredBy: referrer.uid });
    tx.set(referrerRef, { coinBalance: admin.firestore.FieldValue.increment(REFERRAL_SIGNUP_COINS) }, { merge: true });
    return true;
  });
  if (!applied) return;
  await addNotification(
    referrer.uid,
    "referral_signup",
    `You earned +${REFERRAL_SIGNUP_COINS} coins - someone joined using your referral link`,
    { amount: REFERRAL_SIGNUP_COINS }
  );
}

async function getReferralsForUser(uid) {
  const snap = await db.collection("referrals").where("referrerUid", "==", uid).get();
  return snap.docs.map((d) => d.data()).sort((a, b) => b.referredAt - a.referredAt);
}

async function claimDailyCoins(uid, faceDescriptor) {
  const probes = await checkClaimFace(uid, faceDescriptor);
  const today = currentUsageDay();
  const ref = db.collection("users").doc(uid);
  let amount = DAILY_COIN_CLAIM_AMOUNT;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Account not found.");
    const data = snap.data();
    if (data.lastDailyCoinClaimDay === today) {
      throw Object.assign(new Error("You've already claimed today's coins. Come back tomorrow."), { status: 400 });
    }
    if (isAdminEmail(data.email)) amount = ADMIN_DAILY_COIN_CLAIM_AMOUNT;
    tx.set(ref, { coinBalance: admin.firestore.FieldValue.increment(amount), lastDailyCoinClaimDay: today }, { merge: true });
  });
  await saveClaimFace(uid, probes);
  await addNotification(uid, "daily_claim", "You have successfully claimed daily coins", {
    amount,
  });
  return { amount };
}

const CHANNEL_REACT_COIN_COST = 5;

async function spendCoins(uid, amount, reason) {
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  if (!cost) return { spent: 0, balance: null };
  const userRef = db.collection("users").doc(uid);
  let remaining = 0;
  let spenderData = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw Object.assign(new Error("Account not found."), { status: 404 });
    const data = snap.data();
    spenderData = data;
    const balance = data.coinBalance || 0;
    if (balance < cost) {
      throw Object.assign(
        new Error(`You need ${cost} coins for this. You have ${balance}.`),
        { status: 402, code: "coins/insufficient" }
      );
    }
    remaining = balance - cost;
    tx.update(userRef, { coinBalance: admin.firestore.FieldValue.increment(-cost) });
  });
  creditAdminFromSpend(uid, spenderData && spenderData.email, spenderData && spenderData.username, cost).catch(() => {});
  return { spent: cost, balance: remaining, reason: reason || "" };
}

async function refundCoins(uid, amount) {
  const cost = Math.max(0, Math.floor(Number(amount) || 0));
  if (!cost) return;
  await db
    .collection("users")
    .doc(uid)
    .set({ coinBalance: admin.firestore.FieldValue.increment(cost) }, { merge: true });
}

async function creditAdminFromSpend(spenderUid, spenderEmail, spenderUsername, amount) {
  if (!amount || isAdminEmail(spenderEmail)) return;
  try {
    const snap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    if (snap.empty) return;
    const adminDoc = snap.docs[0];
    if (adminDoc.id === spenderUid) return;
    await adminDoc.ref.update({ coinBalance: admin.firestore.FieldValue.increment(amount) });
    const handle = spenderUsername ? `@${spenderUsername}` : "A user";
    await addNotification(adminDoc.id, "coin_income", `${handle} paid +${amount} coins`, { fromUid: spenderUid, amount });
  } catch {
  }
}

async function redeemCoinsForLimit(uid, itemKey, product) {
  const item = COIN_STORE_ITEMS[itemKey];
  if (!item || !item.bonusAmount) throw Object.assign(new Error("Unknown reward."), { status: 400 });
  const field = product === "devapi" ? "bonusDevApiRequests" : "bonusApiRequests";
  const userRef = db.collection("users").doc(uid);
  let spenderData = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("Account not found.");
    const data = snap.data();
    spenderData = data;
    const balance = data.coinBalance || 0;
    if (balance < item.coinCost) throw Object.assign(new Error("Not enough coins for that reward."), { status: 400 });
    tx.update(userRef, {
      coinBalance: admin.firestore.FieldValue.increment(-item.coinCost),
      [field]: admin.firestore.FieldValue.increment(item.bonusAmount),
    });
  });
  creditAdminFromSpend(uid, spenderData && spenderData.email, spenderData && spenderData.username, item.coinCost).catch(() => {});
  const productLabel = product === "devapi" ? "Developer API" : "Live TV API";
  await addNotification(uid, "coin_redeem", `Redeemed ${item.coinCost} coins for ${item.label} on your ${productLabel}`, { itemKey, product });
  return { amount: item.bonusAmount, coinCost: item.coinCost };
}

async function redeemCoinsForVerification(uid) {
  const item = COIN_STORE_ITEMS.verify3d;
  const userRef = db.collection("users").doc(uid);
  let spenderData = null;
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("Account not found.");
    const data = snap.data();
    spenderData = data;
    const balance = data.coinBalance || 0;
    if (balance < item.coinCost) throw Object.assign(new Error("Not enough coins for that reward."), { status: 400 });
    const base = Math.max(Date.now(), data.verifiedExpiresAt || 0);
    const expiresAt = base + 3 * 24 * 60 * 60 * 1000;
    tx.update(userRef, {
      coinBalance: admin.firestore.FieldValue.increment(-item.coinCost),
      verified: true,
      verifiedAt: data.verified ? data.verifiedAt || Date.now() : Date.now(),
      verifiedExpiresAt: expiresAt,
      verifiedVia: "coins",
    });
    return { expiresAt };
  });
  creditAdminFromSpend(uid, spenderData && spenderData.email, spenderData && spenderData.username, item.coinCost).catch(() => {});
  await addNotification(uid, "coin_redeem", `Redeemed ${item.coinCost} coins for 3-day account verification`, { itemKey: "verify3d" });
  return { expiresAt: result.expiresAt };
}

async function findUserByAnyUsername(username) {
  const clean = String(username || "").trim().toLowerCase();
  if (!clean) return null;
  const primary = await db.collection("users").where("username", "==", clean).limit(1).get();
  if (!primary.empty) {
    const doc = primary.docs[0];
    if (!doc.data().pendingDeletion) return { uid: doc.id, ...doc.data() };
  }
  const alt = await db.collection("users").where("altUsernames", "array-contains", clean).limit(1).get();
  if (!alt.empty) {
    const doc = alt.docs[0];
    if (!doc.data().pendingDeletion) return { uid: doc.id, ...doc.data() };
  }
  return null;
}

async function transferCoins(uid, targetUsername, rawAmount) {
  const amount = Math.floor(Number(rawAmount));
  if (!Number.isFinite(amount) || amount < MIN_COIN_TRANSFER || amount > MAX_COIN_TRANSFER) {
    throw Object.assign(
      new Error(`Enter an amount between ${MIN_COIN_TRANSFER} and ${MAX_COIN_TRANSFER} coins.`),
      { status: 400 },
    );
  }

  const recipient = await findUserByAnyUsername(targetUsername);
  if (!recipient) throw Object.assign(new Error("That username does not exist."), { status: 404 });
  if (recipient.uid === uid) {
    throw Object.assign(new Error("You cannot send coins to yourself."), { status: 400 });
  }

  const senderRef = db.collection("users").doc(uid);
  const recipientRef = db.collection("users").doc(recipient.uid);

  const result = await db.runTransaction(async (tx) => {
    const [senderSnap, recipientSnap] = await Promise.all([tx.get(senderRef), tx.get(recipientRef)]);
    if (!senderSnap.exists) throw new Error("Account not found.");
    if (!recipientSnap.exists) {
      throw Object.assign(new Error("That username does not exist."), { status: 404 });
    }
    const senderData = senderSnap.data();
    const balance = senderData.coinBalance || 0;
    if (balance < amount) {
      throw Object.assign(new Error("You do not have enough coins for that transfer."), { status: 400 });
    }
    tx.update(senderRef, { coinBalance: admin.firestore.FieldValue.increment(-amount) });
    tx.update(recipientRef, { coinBalance: admin.firestore.FieldValue.increment(amount) });
    return {
      senderUsername: senderData.username || "a user",
      newBalance: balance - amount,
    };
  });

  const recipientUsername = recipient.username || String(targetUsername || "").trim().toLowerCase();

  try {
    await db.collection("coinTransfers").add({
      fromUid: uid,
      fromUsername: result.senderUsername,
      toUid: recipient.uid,
      toUsername: recipientUsername,
      amount,
      createdAt: Date.now(),
    });
  } catch {
  }

  await Promise.all([
    addNotification(uid, "coin_transfer_sent", `You sent ${amount} coins to @${recipientUsername}`, {
      toUsername: recipientUsername,
      amount,
    }),
    addNotification(recipient.uid, "coin_transfer_received", `@${result.senderUsername} sent you ${amount} coins`, {
      fromUsername: result.senderUsername,
      amount,
    }),
  ]);

  return { amount, toUsername: recipientUsername, newBalance: result.newBalance };
}

async function createCoinPurchasePayment(uid, reference, amountKobo, packageKey) {
  await db.collection("coinPurchasePayments").doc(reference).set({ uid, packageKey, amountKobo, status: "pending", createdAt: Date.now() });
}

async function getCoinPurchasePayment(reference) {
  const snap = await db.collection("coinPurchasePayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function finalizeCoinPurchasePayment(reference, paystackData) {
  const ref = db.collection("coinPurchasePayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const pkg = COIN_PACKAGES[record.packageKey];
  const coins = pkg ? pkg.coins : 0;
  await db.collection("users").doc(record.uid).set({ coinBalance: admin.firestore.FieldValue.increment(coins) }, { merge: true });
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await addNotification(record.uid, "coin_purchase", `+${coins} coins added to your balance`, { coins });
  return { alreadyProcessed: false, uid: record.uid, coins };
}

const COIN_REQUEST_NGN_PER_COIN = 5;
const MIN_COIN_REQUEST = 20;
const MAX_COIN_REQUEST = 5000;
const COIN_REQUEST_LINK_TTL_MS = 60 * 60 * 1000;
const COIN_REQUEST_TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

function coinRequestNairaFor(coins) {
  return coins * COIN_REQUEST_NGN_PER_COIN;
}

function normalizeRequestCoins(rawCoins) {
  const coins = Math.floor(Number(rawCoins));
  if (!Number.isFinite(coins) || coins < MIN_COIN_REQUEST || coins > MAX_COIN_REQUEST) {
    throw Object.assign(
      new Error(`Enter between ${MIN_COIN_REQUEST} and ${MAX_COIN_REQUEST} coins.`),
      { status: 400 }
    );
  }
  return coins;
}

async function createCoinRequestLink(uid, rawCoins) {
  const coins = normalizeRequestCoins(rawCoins);
  const profile = await getUserProfile(uid);
  if (!profile) throw Object.assign(new Error("Account not found."), { status: 404 });
  const token = crypto.randomBytes(18).toString("base64url");
  const now = Date.now();
  const amountNgn = coinRequestNairaFor(coins);
  const displayName = String(profile.firstName || profile.username || "a user").trim().slice(0, 40);
  const photoURL = profile.showProfilePhoto === false ? null : (profile.photoURL || null);
  await db.collection("coinRequestLinks").doc(token).set({
    uid,
    coins,
    amountNgn,
    displayName,
    photoURL,
    username: profile.username || "",
    createdAt: now,
    expiresAt: now + COIN_REQUEST_LINK_TTL_MS,
    paid: false,
  });
  return { token, coins, amountNgn, expiresAt: now + COIN_REQUEST_LINK_TTL_MS, displayName };
}

async function getCoinRequestLink(token) {
  if (!COIN_REQUEST_TOKEN_RE.test(String(token || ""))) return null;
  const snap = await db.collection("coinRequestLinks").doc(String(token)).get();
  if (!snap.exists) return null;
  const data = snap.data();
  const expired = !!data.paid || Date.now() >= (data.expiresAt || 0);
  return { token: snap.id, ...data, expired };
}

async function createCoinRequestPayment(token, reference, amountKobo, payerEmail) {
  const link = await getCoinRequestLink(token);
  if (!link || link.expired) {
    throw Object.assign(new Error("This payment link is no longer valid."), { status: 410 });
  }
  await db.collection("coinRequestPayments").doc(reference).set({
    token: link.token,
    uid: link.uid,
    coins: link.coins,
    amountKobo,
    payerEmail: String(payerEmail || "").slice(0, 120),
    status: "pending",
    createdAt: Date.now(),
  });
  return link;
}

async function getCoinRequestPayment(reference) {
  const snap = await db.collection("coinRequestPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function finalizeCoinRequestPayment(reference, paystackData) {
  const ref = db.collection("coinRequestPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const coins = record.coins || 0;
  await db.collection("users").doc(record.uid).set(
    { coinBalance: admin.firestore.FieldValue.increment(coins) },
    { merge: true }
  );
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await db.collection("coinRequestLinks").doc(record.token).set(
    { paid: true, paidAt: Date.now(), paidReference: reference },
    { merge: true }
  );
  await addNotification(
    record.uid,
    "coin_request_paid",
    `Someone paid your payment link. +${coins} coins added to your balance`,
    { coins }
  );
  return { alreadyProcessed: false, uid: record.uid, coins };
}

async function creditReferralCommission(uid, amountNgn, sourceLabel) {
  if (!amountNgn || amountNgn <= 0) return;
  const profile = await getUserProfile(uid);
  if (!profile || !profile.referredBy) return;
  const referrerUid = profile.referredBy;
  const commission = Math.round(amountNgn * REFERRAL_COMMISSION_RATE);
  if (commission <= 0) return;
  await db.collection("users").doc(referrerUid).set({ nairaBalance: admin.firestore.FieldValue.increment(commission) }, { merge: true });
  db.collection("referrals").doc(uid).set({ totalCommissionNgn: admin.firestore.FieldValue.increment(commission) }, { merge: true }).catch(() => {});
  await addNotification(
    referrerUid,
    "referral_commission",
    `You earned ₦${commission.toLocaleString("en-NG")} commission from a referral's ${sourceLabel}`,
    { amount: commission, sourceLabel }
  );
}

function isValidBankAccountNumber(v) {
  return /^[0-9]{10}$/.test(String(v || "").trim());
}

async function setBankDetails(uid, { bankName, accountNumber, accountName }) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (profile.bankDetails) {
    throw Object.assign(new Error("You already have a saved card. Delete it before adding a new one."), { status: 400 });
  }
  const cleanBankName = String(bankName || "").trim().slice(0, 80);
  const cleanAccountName = String(accountName || "").trim().slice(0, 80);
  const cleanAccountNumber = String(accountNumber || "").trim();
  if (!cleanBankName) throw new Error("Enter your bank name.");
  if (!cleanAccountName) throw new Error("Enter the account name.");
  if (!isValidBankAccountNumber(cleanAccountNumber)) throw new Error("Enter a valid 10-digit account number.");
  const bankDetails = { bankName: cleanBankName, accountName: cleanAccountName, accountNumber: cleanAccountNumber };
  await db.collection("users").doc(uid).update({ bankDetails });
  return bankDetails;
}

async function deleteBankDetails(uid) {
  await db.collection("users").doc(uid).update({ bankDetails: admin.firestore.FieldValue.delete() });
  return { ok: true };
}

async function requestWithdrawal(uid, amountNgn) {
  const amount = Math.floor(Number(amountNgn) || 0);
  if (amount < MIN_WITHDRAWAL_NGN) {
    throw Object.assign(new Error(`Minimum withdrawal is ₦${MIN_WITHDRAWAL_NGN.toLocaleString("en-NG")}.`), { status: 400 });
  }
  if (amount > MAX_WITHDRAWAL_NGN) {
    throw Object.assign(new Error(`Maximum withdrawal is ₦${MAX_WITHDRAWAL_NGN.toLocaleString("en-NG")}.`), { status: 400 });
  }
  const userRef = db.collection("users").doc(uid);
  const withdrawalRef = db.collection("withdrawalRequests").doc();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error("Account not found.");
    const data = snap.data();
    if (!isAdminEmail(data.email) && !isVerificationActive(data)) {
      throw Object.assign(new Error("You must be a verified account to withdraw."), { status: 403 });
    }
    if (!data.bankDetails || !data.bankDetails.accountNumber) {
      throw Object.assign(new Error("Add your bank details before requesting a withdrawal."), { status: 400 });
    }
    const balance = data.nairaBalance || 0;
    if (balance < amount) {
      throw Object.assign(new Error("You don't have enough balance for that withdrawal."), { status: 400 });
    }
    const payoutAmountNgn = Math.round(amount * (1 - WITHDRAWAL_TAX_RATE));
    tx.update(userRef, { nairaBalance: admin.firestore.FieldValue.increment(-amount) });
    tx.set(withdrawalRef, { uid, amountNgn: amount, payoutAmountNgn, bankDetails: data.bankDetails, status: "pending", requestedAt: Date.now() });
    return { id: withdrawalRef.id, bankDetails: data.bankDetails };
  }).then(async (result) => {
    notifyAdminOfWithdrawalRequest(uid, amount, result.bankDetails, result.id).catch((err) => {
      console.error("[requestWithdrawal] admin notify failed:", err.message);
    });
    return { id: result.id };
  });
}

async function notifyAdminOfWithdrawalRequest(uid, amountNgn, bankDetails, withdrawalId) {
  const [adminSnap, profile] = await Promise.all([
    db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get(),
    getUserProfile(uid).catch(() => null),
  ]);
  const username = (profile && profile.username) || "user";
  if (!adminSnap.empty) {
    const adminUid = adminSnap.docs[0].id;
    await addNotification(
      adminUid,
      "withdrawal_request",
      `New withdrawal request: ₦${amountNgn.toLocaleString("en-NG")} from @${username}`,
      { uid, amountNgn, withdrawalId }
    );
  }
  await sendWithdrawalRequestEmail(ADMIN_EMAIL, username, amountNgn, bankDetails).catch((err) => {
    console.error("[requestWithdrawal] admin email failed:", err.message);
  });
}

async function listWithdrawalRequestsForUser(uid) {
  const snap = await db.collection("withdrawalRequests").where("uid", "==", uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.requestedAt - a.requestedAt);
}

async function adminListWithdrawalRequests() {
  const snap = await db.collection("withdrawalRequests").where("status", "==", "pending").get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.requestedAt - b.requestedAt);
  return Promise.all(
    list.map(async (w) => {
      const profile = await getUserProfile(w.uid).catch(() => null);
      return { ...w, username: (profile && profile.username) || "", email: (profile && profile.email) || "" };
    })
  );
}

async function logChannelReactUse(uid, username, link, charged) {
  try {
    await db.collection("channelReactLog").add({
      uid,
      username: username || "",
      link,
      charged: charged || 0,
      createdAt: Date.now(),
      lastResendAt: null,
    });
  } catch {
  }
}

async function adminListChannelReactLog() {
  const snap = await db.collection("channelReactLog").orderBy("createdAt", "desc").limit(300).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function adminMarkChannelReactResent(logId) {
  await db.collection("channelReactLog").doc(logId).update({ lastResendAt: Date.now() }).catch(() => {});
}

function generateCertificateSerial() {
  return "WD-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}

async function adminConfirmWithdrawalPaid(withdrawalId) {
  const ref = db.collection("withdrawalRequests").doc(withdrawalId);
  const certificateSerial = generateCertificateSerial();
  const claim = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Withdrawal request not found.");
    const data = snap.data();
    if (data.status === "completed") return { alreadyProcessed: true, certificateSerial: data.certificateSerial };
    tx.update(ref, { status: "completed", completedAt: Date.now(), certificateSerial });
    return { data };
  });
  if (claim.alreadyProcessed) return { ok: true, certificateSerial: claim.certificateSerial };
  const data = claim.data;
  await addNotification(
    data.uid,
    "withdrawal_paid",
    `Your ₦${data.amountNgn.toLocaleString("en-NG")} withdrawal has been paid`,
    { amountNgn: data.amountNgn, withdrawalId, certificateSerial }
  );
  return { ok: true, certificateSerial };
}

async function createApiPlanPayment(uid, reference, amountKobo, plan) {
  await db.collection("apiPlanPayments").doc(reference).set({
    uid,
    plan,
    amountKobo,
    status: "pending",
    createdAt: Date.now(),
  });
}

async function getApiPlanPayment(reference) {
  const snap = await db.collection("apiPlanPayments").doc(reference).get();
  return snap.exists ? snap.data() : null;
}

async function finalizeApiPlanPayment(reference, paystackData) {
  const ref = db.collection("apiPlanPayments").doc(reference);
  const claim = await claimPendingPayment(ref, paystackData);
  if (claim.notOurs) return { notOurs: true };
  if (claim.alreadyProcessed) return { alreadyProcessed: true, uid: claim.uid };
  if (claim.inProgress) return { alreadyProcessed: true };
  if (claim.failed) throw new Error("Payment was not successful.");

  const record = claim.record;
  const expiresAt = Date.now() + API_PLAN_DAYS * 24 * 60 * 60 * 1000;
  await db.collection("users").doc(record.uid).update({
    apiPlanPaid: record.plan,
    apiPlanPurchasedAt: Date.now(),
    apiPlanExpiresAt: expiresAt,
  });
  await ref.update({ status: "success", confirmedAt: Date.now() });
  await saveBillingAuthorization(record.uid, paystackData);
  const planName = API_PLANS[record.plan]?.name || record.plan;
  await addNotification(record.uid, "api_plan", `Your ${planName} API plan is now active`, { plan: record.plan, expiresAt });
  await creditReferralCommission(record.uid, record.amountKobo / 100, "Live TV API plan purchase");

  return { alreadyProcessed: false, uid: record.uid, plan: record.plan, expiresAt };
}

async function setCustomVisitPageUrl(uid, url) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (getEffectiveApiPlan(profile) !== "max") throw new Error("The custom visit page link is a Max plan feature.");
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("Enter a link first.");
  if (!/^https:\/\/[^\s"'<>]{3,300}$/i.test(trimmed)) throw new Error("Enter a valid https:// URL, without spaces or quote characters.");
  await db.collection("users").doc(uid).update({ customVisitPageUrl: trimmed });
  return { customVisitPageUrl: trimmed };
}

async function adminDeleteUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  if (isAdminEmail(profile.email)) throw new Error("You can't delete the admin account.");
  await purgeUser(uid);
  return { ok: true };
}

async function adminResetPassword(uid, newPassword) {
  if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  await auth.updateUser(uid, { password: newPassword });
  return { ok: true };
}

const MAINTENANCE_CACHE_TTL_MS = 10 * 1000;
let maintenanceCache = null;
let maintenanceCacheExpiry = 0;
let maintenanceInflight = null;

async function readMaintenanceStatus() {
  const snap = await db.collection("settings").doc("site").get();
  const data = snap.exists ? snap.data() : null;
  const enabled = !!(data && data.maintenanceMode);
  const until = (data && data.maintenanceUntil) || null;
  const startedAt = (data && data.maintenanceModeUpdatedAt) || null;

  if (enabled && until && Date.now() >= until) {
    clearExpiredMaintenance().catch(() => {});
    return { maintenanceMode: false, updatedAt: startedAt, until: null, startedAt: null };
  }

  return {
    maintenanceMode: enabled,
    updatedAt: startedAt,
    until: enabled ? until : null,
    startedAt: enabled ? startedAt : null,
  };
}

async function clearExpiredMaintenance() {
  await db.collection("settings").doc("site").set(
    { maintenanceMode: false, maintenanceUntil: null, maintenanceModeUpdatedAt: Date.now() },
    { merge: true }
  );
}

function primeMaintenanceCache(status) {
  maintenanceCache = status;
  maintenanceCacheExpiry = Date.now() + MAINTENANCE_CACHE_TTL_MS;
  return status;
}

async function getMaintenanceStatus() {
  if (maintenanceCache && Date.now() < maintenanceCacheExpiry) return maintenanceCache;
  if (maintenanceInflight) return maintenanceInflight;

  maintenanceInflight = readMaintenanceStatus()
    .then(primeMaintenanceCache)
    .catch((err) => {
      if (maintenanceCache) return maintenanceCache;
      throw err;
    })
    .finally(() => {
      maintenanceInflight = null;
    });

  return maintenanceInflight;
}

async function getMaintenanceMode() {
  const status = await getMaintenanceStatus();
  return status.maintenanceMode;
}

const MAINTENANCE_MIN_MS = 60 * 1000;
const MAINTENANCE_MAX_MS = 30 * 24 * 60 * 60 * 1000;

async function setMaintenanceMode(enabled, untilInput) {
  const updatedAt = Date.now();
  const on = !!enabled;
  let until = null;

  if (on) {
    const parsed = Number(untilInput);
    if (!Number.isFinite(parsed)) {
      throw Object.assign(new Error("Pick the date and time maintenance should end."), { status: 400 });
    }
    const span = parsed - updatedAt;
    if (span < MAINTENANCE_MIN_MS) {
      throw Object.assign(new Error("That end time is in the past. Pick a time at least a minute from now."), { status: 400 });
    }
    if (span > MAINTENANCE_MAX_MS) {
      throw Object.assign(new Error("Maintenance cannot be scheduled more than 30 days out."), { status: 400 });
    }
    until = Math.round(parsed);
  }

  await db.collection("settings").doc("site").set(
    { maintenanceMode: on, maintenanceUntil: until, maintenanceModeUpdatedAt: updatedAt },
    { merge: true }
  );
  const status = { maintenanceMode: on, updatedAt, until, startedAt: on ? updatedAt : null };
  primeMaintenanceCache(status);
  return status;
}

const SUPPORT_MESSAGE_MAX_LEN = 2000;
const SUPPORT_MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SUPPORT_MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const SUPPORT_MESSAGE_DELETE_WINDOW_MS = 24 * 60 * 60 * 1000;
const SUPPORT_ATTACHMENT_MAX_BYTES = 900 * 1024;
const SUPPORT_ATTACHMENT_TYPES = ["image", "file", "voice"];
const ATTACHMENT_PREVIEW_LABEL = { image: "Photo", file: "File", voice: "Voice message" };

function validateSupportAttachment(attachment) {
  if (!attachment) return null;
  const { dataUrl, type, name } = attachment;
  if (!SUPPORT_ATTACHMENT_TYPES.includes(type)) throw new Error("Unsupported attachment type.");
  if (typeof dataUrl !== "string" || !/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9.+-]+=[a-z0-9.+-]+)*;base64,/i.test(dataUrl)) {
    throw new Error("That attachment couldn't be read.");
  }
  if (dataUrl.length > SUPPORT_ATTACHMENT_MAX_BYTES) throw new Error("That attachment is too large.");
  const decoded = decodeDataUrlPayload(dataUrl);
  if (!decoded) throw new Error("That attachment couldn't be read.");
  if (type === "image" && !sniffImageFormat(decoded.buffer)) {
    throw new Error("That doesn't look like a valid image file.");
  }
  if (type === "voice" && !sniffAudioFormat(decoded.buffer)) {
    throw new Error("That doesn't look like a valid voice recording.");
  }
  if (type === "file" && looksExecutableOrScript(decoded.buffer)) {
    throw new Error("That file type isn't allowed as an attachment.");
  }
  return { dataUrl, type, name: type === "file" ? String(name || "file").slice(0, 200) : null };
}

async function purgeExpiredSupportMessages(uid) {
  const cutoff = Date.now() - SUPPORT_MESSAGE_TTL_MS;
  const threadRef = db.collection("supportThreads").doc(uid);
  const oldSnap = await threadRef.collection("messages").where("createdAt", "<", cutoff).get();
  if (oldSnap.empty) return;
  const batch = db.batch();
  oldSnap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  const remainingSnap = await threadRef.collection("messages").orderBy("createdAt", "desc").limit(1).get();
  if (remainingSnap.empty) {
    await threadRef.update({ lastMessageText: "", lastMessageAt: null }).catch(() => {});
  } else {
    const last = remainingSnap.docs[0].data();
    const preview = last.text || ATTACHMENT_PREVIEW_LABEL[last.attachmentType] || "";
    await threadRef.update({
      lastMessageText: preview,
      lastMessageType: last.text ? "" : (last.attachmentType || ""),
      lastMessageAt: last.createdAt,
    }).catch(() => {});
  }
}

async function sweepExpiredSupportMessages() {
  const snap = await db.collection("supportThreads").get();
  for (const doc of snap.docs) {
    await purgeExpiredSupportMessages(doc.id).catch(() => {});
  }
}

async function sendSupportMessage(uid, text, fromAdmin, attachment, replyTo) {
  const trimmed = String(text || "").trim();
  const cleanAttachment = validateSupportAttachment(attachment);
  if (!trimmed && !cleanAttachment) throw new Error("Type a message first.");
  if (trimmed.length > SUPPORT_MESSAGE_MAX_LEN) throw new Error("Message is too long.");
  const now = Date.now();
  const threadRef = db.collection("supportThreads").doc(uid);
  const msgRef = threadRef.collection("messages").doc();

  let cleanReplyTo = null;
  if (replyTo && replyTo.id) {
    const repliedSnap = await threadRef.collection("messages").doc(replyTo.id).get();
    if (repliedSnap.exists) {
      const replied = repliedSnap.data();
      cleanReplyTo = {
        id: replyTo.id,
        text: (replied.text || (replied.attachmentType ? ATTACHMENT_PREVIEW_LABEL[replied.attachmentType] : "")).slice(0, 200),
        fromAdmin: !!replied.fromAdmin,
      };
    }
  }

  const messageDoc = {
    text: trimmed,
    fromAdmin: !!fromAdmin,
    createdAt: now,
    editedAt: null,
    replyTo: cleanReplyTo,
    attachmentDataUrl: cleanAttachment ? cleanAttachment.dataUrl : null,
    attachmentType: cleanAttachment ? cleanAttachment.type : null,
    attachmentName: cleanAttachment ? cleanAttachment.name : null,
  };
  await msgRef.set(messageDoc);
  const preview = trimmed || (cleanAttachment ? ATTACHMENT_PREVIEW_LABEL[cleanAttachment.type] : "");
  await threadRef.set(
    {
      uid,
      lastMessageText: preview,
      lastMessageType: trimmed ? "" : ((cleanAttachment && cleanAttachment.type) || ""),
      lastMessageAt: now,
      updatedAt: now,
      unreadForAdmin: admin.firestore.FieldValue.increment(fromAdmin ? 0 : 1),
      unreadForUser: admin.firestore.FieldValue.increment(fromAdmin ? 1 : 0),
    },
    { merge: true }
  );
  return { id: msgRef.id, ...messageDoc };
}

async function editSupportMessage(threadUid, messageId, actorIsAdmin, newText) {
  const trimmed = String(newText || "").trim();
  if (!trimmed) throw Object.assign(new Error("Message can't be empty."), { status: 400 });
  if (trimmed.length > SUPPORT_MESSAGE_MAX_LEN) throw Object.assign(new Error("Message is too long."), { status: 400 });

  const threadRef = db.collection("supportThreads").doc(threadUid);
  const msgRef = threadRef.collection("messages").doc(messageId);
  const snap = await msgRef.get();
  if (!snap.exists) throw Object.assign(new Error("Message not found."), { status: 404 });
  const msg = snap.data();

  if (!!msg.fromAdmin !== !!actorIsAdmin) {
    throw Object.assign(new Error("You can only edit your own messages."), { status: 403 });
  }
  if (Date.now() - msg.createdAt > SUPPORT_MESSAGE_EDIT_WINDOW_MS) {
    throw Object.assign(new Error("This message can no longer be edited."), { status: 400 });
  }

  const editedAt = Date.now();
  await msgRef.update({ text: trimmed, editedAt });

  const threadSnap = await threadRef.get();
  if (threadSnap.exists && threadSnap.data().lastMessageAt === msg.createdAt) {
    await threadRef.update({ lastMessageText: trimmed }).catch(() => {});
  }

  return { id: messageId, text: trimmed, editedAt };
}

async function deleteSupportMessage(threadUid, messageId, actorIsAdmin) {
  const threadRef = db.collection("supportThreads").doc(threadUid);
  const msgRef = threadRef.collection("messages").doc(messageId);
  const snap = await msgRef.get();
  if (!snap.exists) throw Object.assign(new Error("Message not found."), { status: 404 });
  const msg = snap.data();

  if (!!msg.fromAdmin !== !!actorIsAdmin) {
    throw Object.assign(new Error("You can only delete your own messages."), { status: 403 });
  }
  if (Date.now() - msg.createdAt > SUPPORT_MESSAGE_DELETE_WINDOW_MS) {
    throw Object.assign(new Error("This message can no longer be deleted."), { status: 400 });
  }

  await msgRef.delete();

  const remainingSnap = await threadRef.collection("messages").orderBy("createdAt", "desc").limit(1).get();
  if (remainingSnap.empty) {
    await threadRef.update({ lastMessageText: "", lastMessageAt: null }).catch(() => {});
  } else {
    const last = remainingSnap.docs[0].data();
    const preview = last.text || (last.attachmentType ? ATTACHMENT_PREVIEW_LABEL[last.attachmentType] : "");
    await threadRef.update({ lastMessageText: preview, lastMessageAt: last.createdAt }).catch(() => {});
  }

  return { ok: true };
}

async function getSupportMessages(uid, asAdmin) {
  await purgeExpiredSupportMessages(uid).catch(() => {});
  const threadRef = db.collection("supportThreads").doc(uid);
  const [msgSnap, threadSnap] = await Promise.all([
    threadRef.collection("messages").orderBy("createdAt", "asc").limit(500).get(),
    threadRef.get(),
  ]);
  const messages = msgSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  if (threadSnap.exists) {
    await threadRef.update({ [asAdmin ? "unreadForAdmin" : "unreadForUser"]: 0 }).catch(() => {});
  }
  return messages;
}

async function getSupportUnreadCountForUser(uid) {
  const snap = await db.collection("supportThreads").doc(uid).get();
  return snap.exists ? snap.data().unreadForUser || 0 : 0;
}

async function getSupportUnreadCountForAdmin() {
  const snap = await db.collection("supportThreads").where("unreadForAdmin", ">", 0).get();
  let total = 0;
  snap.forEach((d) => { total += d.data().unreadForAdmin || 0; });
  return total;
}

async function getSupportThreadsForAdmin() {
  const snap = await db.collection("supportThreads").orderBy("updatedAt", "desc").limit(200).get();
  const threads = snap.docs.map((d) => d.data());
  const profiles = await Promise.all(threads.map((t) => getUserProfile(t.uid)));
  return threads.map((t, i) => {
    const p = profiles[i] || {};
    return {
      uid: t.uid,
      username: p.username || null,
      firstName: p.firstName || "",
      lastName: p.lastName || "",
      photoURL: p.photoURL || null,
      verified: isVerificationActive(p),
      lastActiveAt: p.lastActiveAt || null,
      lastMessageText: t.lastMessageText || "",
      lastMessageType: t.lastMessageType || "",
      lastMessageAt: t.lastMessageAt || null,
      unread: t.unreadForAdmin || 0,
    };
  });
}

export {
  adminListUsers,
  adminSearchUsers,
  adminListBannedUsers,
  adminBanUser,
  adminUnbanUser,
  adminVerifyUser,
  adminUnverifyUser,
  adminDeleteUser,
  adminResetPassword,
  getMaintenanceMode,
  getMaintenanceStatus,
  setMaintenanceMode,
  createVerificationPayment,
  getVerificationPayment,
  finalizeVerificationPayment,
  createApiPlanPayment,
  getApiPlanPayment,
  finalizeApiPlanPayment,
  setCustomVisitPageUrl,
  sendSupportMessage,
  editSupportMessage,
  deleteSupportMessage,
  getSupportMessages,
  getSupportUnreadCountForUser,
  getSupportUnreadCountForAdmin,
  getSupportThreadsForAdmin,
  sweepExpiredSupportMessages,
};

export {
  issueCode,
  checkCode,
  createUserAccount,
  upsertUserProfile,
  findUserByUsername,
  isUsernameAvailable,
  isUsernamePending,
  generateUniqueUsername,
  issuePendingSignup,
  resendPendingSignupCode,
  checkPendingSignupCode,
  getUserProfile,
  updateUserProfile,
  addAltUsername,
  removeAltUsername,
  updatePrivacySettings,
  getWatchSeconds,
  addWatchSeconds,
  seedWatchSecondsIfEmpty,
  markEmailVerified,
  ensureGoogleUserProfile,
  verifyTelegramLoginPayload,
  verifyTelegramIdToken,
  createOrGetTelegramUser,
  saveTelegramOAuthState,
  consumeTelegramOAuthState,
  createOrGetGithubUser,
  saveGithubOAuthState,
  consumeGithubOAuthState,
  createApiKey,
  listApiKeysForUser,
  revokeApiKey,
  findApiKeyByRawKey,
  getApiKeyOwnerUid,
  getAccountApiUsage,
  checkAndIncrementAccountApiUsage,
  DEV_API_PLANS,
  PURCHASABLE_DEV_API_PLANS,
  getEffectiveDevApiPlan,
  getDevApiPlanConfig,
  createDevApiPlanPayment,
  getDevApiPlanPayment,
  finalizeDevApiPlanPayment,
  setDevApiCustomAdsUrl,
  createDevApiKey,
  listDevApiKeysForUser,
  revokeDevApiKey,
  findDevApiKeyByRawKey,
  getAccountDevApiUsage,
  checkAndIncrementAccountDevApiUsage,
  checkAndIncrementDailyLimit,
  spendCoins,
  refundCoins,
  CHANNEL_REACT_COIN_COST,
  COIN_STORE_ITEMS,
  COIN_PACKAGES,
  MIN_WITHDRAWAL_NGN,
  MAX_WITHDRAWAL_NGN,
  WITHDRAWAL_TAX_RATE,
  MIN_COIN_TRANSFER,
  MAX_COIN_TRANSFER,
  findUserByAnyUsername,
  transferCoins,
  applyReferral,
  ensureReferralCode,
  findUserByReferralCode,
  getReferralsForUser,
  claimDailyCoins,
  redeemCoinsForLimit,
  redeemCoinsForVerification,
  createCoinPurchasePayment,
  getCoinPurchasePayment,
  finalizeCoinPurchasePayment,
  COIN_REQUEST_NGN_PER_COIN,
  MIN_COIN_REQUEST,
  MAX_COIN_REQUEST,
  COIN_REQUEST_LINK_TTL_MS,
  coinRequestNairaFor,
  createCoinRequestLink,
  getCoinRequestLink,
  createCoinRequestPayment,
  getCoinRequestPayment,
  finalizeCoinRequestPayment,
  billingCardSummary,
  removeBillingAuthorization,
  setAutoRenew,
  runSubscriptionRenewals,
  RENEWABLE_PRODUCTS,
  creditReferralCommission,
  setBankDetails,
  deleteBankDetails,
  requestWithdrawal,
  listWithdrawalRequestsForUser,
  adminListWithdrawalRequests,
  adminConfirmWithdrawalPaid,
  logChannelReactUse,
  adminListChannelReactLog,
  adminMarkChannelReactResent,
  recordIssuedStreamLink,
  getIssuedStreamLinks,
  issueResetToken,
  consumeResetToken,
  createSession,
  verifySession,
  refreshSession,
  deleteSession,
  revokeAllSessions,
  isSessionRevoked,
  scheduleAccountDeletion,
  sweepPendingDeletions,
  sweepOrphanedUsers,
  setupTwoFactor,
  verifyTwoFactorSetup,
  setTwoFactorEnabled,
  verifyTwoFactorCode,
  issueTwoFactorPendingLogin,
  getTwoFactorPendingLogin,
  deleteTwoFactorPendingLogin,
  getPasskeysForUser,
  getMaxPasskeysForUser,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
  getFaceScanForUser,
  enrollFaceScan,
  removeFaceScan,
  matchFaceScan,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowStats,
  growAdminFollowerCount,
  validateImageDataUrl,
  createPost,
  getPostsByUser,
  togglePostLike,
  updatePostVisibility,
  updatePostSettings,
  updatePost,
  deletePost,
  resharePost,
  togglePinPost,
  recalculateUserLikesCount,
  getPostOwner,
  getCommentAuthorUid,
  addComment,
  getComments,
  deleteComment,
  toggleCommentHide,
  toggleCommentPin,
  toggleCommentLike,
  toggleNotificationRead,
  deleteNotification,
  getFollowList,
  getFollowingFeed,
  getFollowingFeedUnseenCount,
  addNotification,
  broadcastNotification,
  getNotifications,
  hasUnreadNotifications,
  markAllNotificationsRead,
  notifyProfileViewed,
  searchUsersByUsername,
  requireAuth,
  optionalAuth,
  isAdminEmail,
  isVerificationActive,
  API_PLANS,
  PURCHASABLE_API_PLANS,
  getEffectiveApiPlan,
  TRADING_PLANS,
  PURCHASABLE_TRADING_PLANS,
  getEffectiveTradingPlan,
  getTradingPlanConfig,
  createTradingPlanPayment,
  getTradingPlanPayment,
  finalizeTradingPlanPayment,
  checkAndIncrementManualTradeQuota,
  checkPositionLimit,
  requireAiTradingAccess,
  requireCommunityAccess,
  creditTradingProfitCoins,
  sendCommunityMessage,
  getCommunityMessages,
  COMMUNITY_CHAT_NAME,
  getApiPlanConfig,
  SESSION_TTL_MS,
  BONUS_CODE_AMOUNTS,
  createBonusCode,
  listBonusCodes,
  redeemBonusCode,
};
