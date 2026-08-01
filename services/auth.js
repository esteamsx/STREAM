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
import { sendVerificationCode, sendBanNotificationEmail } from "./mailer.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// Only this account gets Admin access — checked here so both the /admin route
// gate in server.js and the auto-follow-on-signup below share one source of truth.
const ADMIN_EMAIL = "etimpaschal95@gmail.com";
function isAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

// Every new account automatically follows the admin account on first sign-up.
// Best-effort: a hiccup here should never block someone from finishing signup.
async function autoFollowAdmin(newUid, newUserEmail) {
  try {
    if (isAdminEmail(newUserEmail)) return; // the admin doesn't follow themselves
    const snap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    if (snap.empty) return;
    const adminUid = snap.docs[0].id;
    await followUser(newUid, adminUid);
  } catch {
    // non-fatal — signup should still succeed even if this fails
  }
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

// Sends a verification code as a Telegram DM instead of email — used for
// account-deletion codes on Telegram-only accounts, which have no email.
// Requires the user to have granted the bot "write" access, which our
// Telegram login flow already requests.
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
  });
  await autoFollowAdmin(userRecord.uid, email);
  return userRecord.uid;
}

// ── Username lookups: usernames are stored lowercase so checks are case-insensitive ──
async function findUserByUsername(username) {
  if (!username) return null;
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

// True if `username` is free to use. Pass `excludeUid` when checking during a
// profile edit so a user's own current username doesn't flag as taken.
// Accounts scheduled for deletion no longer hold their username.
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

// True if `username` is claimed by an in-flight (not yet verified) signup.
// `excludeEmail` lets a person re-check the same username they already have pending.
// An expired/abandoned pending signup no longer holds the name — it's cleaned up here.
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

// Builds a short, available username from a display name (e.g. a Google first name),
// falling back to appending a number — "paschal", "paschal2", "paschal3"… — until one is free.
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

// ── Pending signups: nothing is created in Firebase Auth or Firestore ──
// until the emailed code is actually verified. Keyed by email so a refresh
// before verifying and re-signing up with the same email just overwrites it.
async function issuePendingSignup({ firstName, lastName, email, username, password }) {
  const code = generateCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  await db.collection("pending_signups").doc(email).set({ firstName, lastName, email, username, password, code, expiresAt });
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

// ── Admin-only alternate usernames — extra handles reserved so nobody else can sign up with them ──
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

/* ── Watch hours — persisted in Firestore so it survives redeploys/devices,
   instead of living only in the browser's localStorage. ── */
const MAX_WATCH_SYNC_SECONDS = 300; // ignore absurd deltas from a stale/backgrounded tab

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

// One-time migration helper: if the account has no server-side total yet,
// seed it from whatever the browser had stored locally so nobody loses their hours.
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
  if (existing) return existing;
  const [firstName, ...rest] = (decodedToken.name || decodedToken.email).split(" ");
  const username = await generateUniqueUsername(firstName || decodedToken.email.split("@")[0]);
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
  };
  await db.collection("users").doc(uid).set(profile);
  await autoFollowAdmin(uid, profile.email);
  return profile;
}

// ── Telegram Login Widget: verifies the payload's signature against the bot
// token per Telegram's documented algorithm, then finds or creates the
// matching account. No email or password is ever required for this path.
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
  if (!(authAge >= 0) || authAge > 86400) return false; // reject stale/replayed logins
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

// Telegram's newer "Log In With Telegram" (OIDC) flow hands back a signed
// id_token instead of the legacy hash-signed fields. This verifies it against
// Telegram's published JWKS (no bot secret needed — signature is asymmetric)
// and checks issuer/audience/expiry before trusting anything inside it.
async function verifyTelegramIdToken(idToken, expectedBotId) {
  try {
    const parts = String(idToken).split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const header = JSON.parse(base64UrlToBuffer(headerB64).toString("utf8"));
    const payload = JSON.parse(base64UrlToBuffer(payloadB64).toString("utf8"));
    const algSpec = TELEGRAM_JWT_ALGS[header.alg];
    if (!algSpec) return null; // unexpected/unsupported signing algorithm

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

// Finds the account for this Telegram ID, or creates one. Firebase Auth users
// created here have no email/password — the Telegram ID is the identifier —
// so this mirrors createUserAccount/ensureGoogleUserProfile but stays passwordless.
async function createOrGetTelegramUser({ id, first_name, last_name, username, photo_url }) {
  const telegramId = String(id);
  const existing = await findUserByTelegramId(telegramId);
  if (existing) return existing.uid;

  const uid = `tg_${telegramId}`;
  const displayName = [first_name, last_name].filter(Boolean).join(" ") || username || "Telegram User";
  try {
    await auth.createUser({ uid, displayName });
  } catch (err) {
    // A prior attempt may have created the Auth user but failed before the
    // Firestore doc was written (network blip, etc.) — pick up where it left
    // off instead of failing the retry too.
    if (err.code !== "auth/uid-already-exists") throw err;
  }

  const uniqueUsername = await generateUniqueUsername(username || first_name || "user");
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
  };
  await db.collection("users").doc(uid).set(profile, { merge: true });
  await autoFollowAdmin(uid, null);
  return uid;
}

// ── Telegram OIDC redirect flow: short-lived PKCE state storage ──────────
// The state doc is deleted on first read (one-time use) and self-expires
// after 10 minutes even if the redirect never comes back.
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

// ── GitHub OAuth: standard authorization-code flow (GitHub OAuth Apps are
// confidential clients — the exchange happens server-side with a client
// secret, so no PKCE code_verifier is needed here, just a CSRF-guarding
// `state`). Mirrors the Telegram state storage below so both flows share
// the same "one-time use, self-expiring" shape.
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

// Finds the account for this GitHub user, or creates one. GitHub accounts
// may not expose a public email (many devs hide it), so `email` here is
// whatever the caller already resolved via GitHub's /user/emails endpoint —
// it may be null, in which case the account is created email-less, same as
// a Telegram-only account.
async function createOrGetGithubUser({ id, login, name, email, avatar_url }) {
  const githubId = String(id);
  const existing = await findUserByGithubId(githubId);
  if (existing) return existing.uid;

  const uid = `gh_${githubId}`;
  const displayName = name || login || "GitHub User";
  try {
    await auth.createUser({ uid, displayName, email: email || undefined, emailVerified: !!email });
  } catch (err) {
    // A prior attempt may have created the Auth user but failed before the
    // Firestore doc was written (network blip, etc.) — pick up where it left
    // off instead of failing the retry too.
    if (err.code !== "auth/uid-already-exists") throw err;
  }

  const uniqueUsername = await generateUniqueUsername(login || name || "user");
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
  };
  await db.collection("users").doc(uid).set(profile, { merge: true });
  await autoFollowAdmin(uid, email || null);
  return uid;
}

// ── Developer API keys. Raw key is only ever shown once, at creation —
// we store just its SHA-256 hash as the Firestore doc id, so a lookup is a
// single doc.get() and a leaked database export never reveals usable keys.
function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// Monthly request quota. Tracked per ACCOUNT (uid), not per key — revoking a
// key and creating a new one does not grant a fresh allowance, since the
// counter lives on the account's own doc, not on any individual key's doc.
// Not enforced by SimpleRateLimiter (that's the separate per-minute burst
// cap in api.js) — this is the hard monthly ceiling.
const API_KEY_MONTHLY_LIMIT = 100;

function currentUsageMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Read-only: for display (the dashboard's usage bar). Never writes, so it's
// safe to call as often as needed without affecting the count itself.
async function getAccountApiUsage(uid) {
  const nowMonth = currentUsageMonth();
  const snap = await db.collection("apiUsage").doc(uid).get();
  const data = snap.exists ? snap.data() : null;
  const requestsThisMonth = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  return { requestsThisMonth, monthlyLimit: API_KEY_MONTHLY_LIMIT };
}

// Called once per authenticated API request (from requireApiKey in api.js).
// Returns allowed:false without incrementing once the account is already at
// its cap, so a blocked account can't be pushed further over by retries.
async function checkAndIncrementAccountApiUsage(uid) {
  const nowMonth = currentUsageMonth();
  const ref = db.collection("apiUsage").doc(uid);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const current = data && data.usageMonth === nowMonth ? (data.requestsThisMonth || 0) : 0;
  if (current >= API_KEY_MONTHLY_LIMIT) {
    return { allowed: false, requestsThisMonth: current, monthlyLimit: API_KEY_MONTHLY_LIMIT };
  }
  const requestsThisMonth = current + 1;
  await ref.set({ uid, requestsThisMonth, usageMonth: nowMonth }, { merge: true });
  return { allowed: true, requestsThisMonth, monthlyLimit: API_KEY_MONTHLY_LIMIT };
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
  // rawKey is returned exactly once — the caller must show it to the user now.
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

// Looks up a raw key presented by a developer's request. Returns null for
// missing/revoked keys so callers can respond with a generic 401 either way
// (no need to distinguish "wrong key" from "revoked key" to the caller).
async function findApiKeyByRawKey(rawKey) {
  if (!rawKey || typeof rawKey !== "string") return null;
  const keyHash = hashApiKey(rawKey);
  const ref = db.collection("apiKeys").doc(keyHash);
  const snap = await ref.get();
  if (!snap.exists || snap.data().revoked) return null;
  ref.update({ lastUsedAt: Date.now() }).catch(() => {}); // best-effort, don't block the request on it
  return { id: snap.id, uid: snap.data().uid };
}

// ── Issued stream links (Settings → API → "Generated Links") ─────────────
// Stored in Firestore rather than a local file next to server.js — a local
// dotfile survives a plain process restart, but gets wiped along with the
// rest of the old filesystem on a redeploy/fresh file upload, which was
// making the dashboard's link history disappear even though the app itself
// came back up fine. Firestore isn't affected by that, same as every other
// piece of account data in this file.
const MAX_ISSUED_LINKS_PER_ACCOUNT = 50;

async function recordIssuedStreamLink(uid, entry) {
  await db.collection("issuedStreamLinks").add({ uid, ...entry });
  // Best-effort trim so the collection doesn't grow forever — never blocks
  // the caller, same spirit as the old fire-and-forget disk append.
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

/* ── Sessions ──────────────────────────────────────────────────────────────
   Sessions are signed rather than stored: the cookie carries the uid and its
   own expiry, authenticated by an HMAC. Signing in therefore costs no
   Firestore write, and checking a session costs no Firestore read.

   The stored-session version wrote a document per sign-in and read one on
   every single request. When Firestore stopped accepting writes, that write
   didn't fail — the client retried it indefinitely — so /api/session hung
   forever at createSession and every sign-in method broke at once while the
   cached pages carried on serving normally.

   The tradeoff is that a signed token can't be deleted server-side. Anything
   that must invalidate sessions early stamps `sessionsValidFrom` on the user
   document instead, and tokens issued before that instant are refused; see
   sessionIssuedAt() and its use in requireAuth. That check runs where the
   profile has already been fetched, so revocation costs nothing extra.
   ───────────────────────────────────────────────────────────────────────── */

// Prefer an explicit SESSION_SECRET. Failing that, derive a key from the
// service-account credentials: already secret, already required for the app to
// boot, and identical across restarts and instances — so no new environment
// variable is needed for this to work on deploy, and existing signed cookies
// survive a restart.
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

// Returns the payload only for a token whose signature verifies. Never throws:
// every malformed, truncated or forged cookie is just a null.
function readSessionToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, body, sig] = parts;
  const expected = crypto.createHmac("sha256", SESSION_SIGNING_KEY).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  // timingSafeEqual throws on a length mismatch, so check that first.
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload && typeof payload.uid === "string" ? payload : null;
  } catch {
    return null;
  }
}

// When the token was issued, for revocation checks. Null for legacy session
// ids, which carry no issue time — those are refused outright once a
// revocation instant is set, since their age can't be established.
function sessionIssuedAt(token) {
  const payload = readSessionToken(token);
  return payload && typeof payload.iat === "number" ? payload.iat : null;
}

// True when this token predates the account's revocation instant — set by a
// ban, a scheduled deletion, or any other "sign this account out everywhere".
function isSessionRevoked(token, profile) {
  const validFrom = profile?.sessionsValidFrom;
  if (typeof validFrom !== "number") return false;
  const issuedAt = sessionIssuedAt(token);
  if (issuedAt === null) return true; // legacy id: unknown age, so don't trust it
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

  // Sessions issued before the switch to signed cookies are still Firestore
  // document ids. Honoured so nobody was signed out by the change; they age
  // out on their own within SESSION_TTL_MS.
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

// A signed token has no server-side record to remove — logout clears the
// cookie, which is what ends the session. Legacy ids still get cleaned up.
async function deleteSession(sessionId) {
  if (!sessionId || !LEGACY_SESSION_ID.test(sessionId)) return;
  await db.collection("sessions").doc(sessionId).delete().catch(() => {});
}

// Invalidates every session for an account, including signed cookies already
// out in the wild, by moving the account's revocation instant to now.
async function revokeAllSessions(uid) {
  await db.collection("users").doc(uid).update({ sessionsValidFrom: Date.now() }).catch(() => {});
  // Legacy stored sessions still need their documents removed; signed cookies
  // are handled entirely by the stamp above.
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

// When an account is permanently deleted, every follow relationship it was
// part of has to be unwound too — otherwise the other side's follower/following
// counts stay inflated forever, pointing at an account that no longer exists.
async function cleanupFollowRelationships(uid) {
  const [asFollower, asTarget] = await Promise.all([
    db.collection("follows").where("followerUid", "==", uid).get(),
    db.collection("follows").where("targetUid", "==", uid).get(),
  ]);

  const docs = [...asFollower.docs, ...asTarget.docs];
  const CHUNK = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + CHUNK)) {
      const { followerUid, targetUid } = doc.data();
      batch.delete(doc.ref);
      if (followerUid === uid) {
        // This account was following someone — that account loses a follower.
        batch.update(db.collection("users").doc(targetUid), {
          followersCount: admin.firestore.FieldValue.increment(-1),
        });
      } else {
        // Someone was following this account — they lose someone they follow.
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

// Releases usernames left behind by profiles whose Firebase Auth account is
// gone (most commonly: someone was deleted straight from the Firebase console
// instead of through the app). Without this the username stays permanently
// unavailable even though nobody is actually using it anymore.
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

const MAX_PASSKEYS_PER_USER = 3;

// The browser's WebAuthn library (@simplewebauthn/browser) calls .replace() on
// options.challenge, options.user.id, and every excludeCredentials/allowCredentials[].id
// expecting each to be a base64url STRING. If any of those arrive as something else
// (undefined, a raw Buffer that got JSON-serialized as {type:"Buffer",data:[...]}, etc.)
// the browser library crashes with "Cannot read properties of undefined (reading 'replace')".
// This helper guarantees a proper base64url string no matter what shape the value is in.
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

// Converts one excludeCredentials/allowCredentials descriptor and guarantees
// its `id` came out as a real, non-empty string — this is the field the
// browser library calls .replace()/base64url-decodes directly. A bad
// (missing/malformed) entry here is exactly what surfaces client-side as
// "Cannot read properties of undefined (reading 'replace')", so this throws
// a clear server-side error instead of ever letting that shape reach the
// browser.
function toSafeCredentialDescriptor(c, label) {
  const id = toBase64url(c && c.id);
  if (!id || typeof id !== "string") {
    throw new Error(`Server produced an invalid ${label} entry — passkey data may be corrupted.`);
  }
  return { ...c, id };
}

// Walks the options object returned by @simplewebauthn/server and forces every field
// the browser library expects to be a base64url string into that shape.
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
    // Always a real array — never undefined — so the browser library's
    // .map() over it is never handed something it doesn't expect.
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

// Step 1 of adding a passkey to an already-signed-in account.
async function beginPasskeyRegistration(uid, email, displayName, rpID) {
  const existing = await getPasskeysForUser(uid);
  if (existing.length >= MAX_PASSKEYS_PER_USER) {
    throw new Error(`You can only have up to ${MAX_PASSKEYS_PER_USER} passkeys. Delete one to add another.`);
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

// Step 2: verify the browser's response and save the new credential.
async function finishPasskeyRegistration(uid, response, rpID, origin, name) {
  try {
    // Validate inputs
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
    if (existing.length >= MAX_PASSKEYS_PER_USER) {
      throw new Error(`You can only have up to ${MAX_PASSKEYS_PER_USER} passkeys. Delete one to add another.`);
    }

    // Verify the registration response
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

    // Validate credential structure
    if (!credential || !credential.id || !credential.publicKey) {
      throw new Error("Invalid credential data from browser.");
    }

    // Convert credential.id (Uint8Array) to base64url string for Firestore doc ID
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

    // Check if credential already exists
    const existingCred = await db.collection("passkey_credentials").doc(credentialIdString).get();
    if (existingCred.exists) {
      throw new Error(existingCred.data().uid === uid
        ? "This passkey is already added to your account."
        : "This passkey is already registered to another account.");
    }

    // Store the credential
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
    // Re-throw with context
    throw err;
  }
}

async function deletePasskey(uid, credentialId) {
  const ref = db.collection("passkey_credentials").doc(credentialId);
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) throw new Error("Passkey not found.");
  await ref.delete();
}

// Step 1 of signing in with a passkey — no email or username needed. Discoverable
// credentials mean the browser itself shows the matching passkey(s) for this site.
async function beginPasskeyAuthentication(rpID) {
  const rawOptions = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    // Empty (not omitted) allowCredentials is the documented way to ask for
    // a fully discoverable/passwordless flow — the browser shows whichever
    // passkeys it has for this rpID instead of us needing to name one.
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

// Step 2: look up whichever credential the browser picked, verify it, and hand back the uid.
async function finishPasskeyAuthentication(token, response, rpID, origin) {
  try {
    // Validate inputs
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

    // Convert response.id to base64url if it's binary
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

    // Look up the credential
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

    // Prepare credential for verification
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

    // Verify the authentication response
    // NOTE: @simplewebauthn/server v10's `credential.id` must be the
    // base64url STRING (its type is `Base64URLString`), not raw bytes —
    // only `publicKey` is binary. Passing the decoded Buffer here (as this
    // previously did) breaks the library's internal base64url handling and
    // is what was surfacing client-side as "Cannot read properties of
    // undefined (reading 'replace')".
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

    // Update counter for replay attack protection
    try {
      await credDoc.ref.update({ counter: verification.authenticationInfo.newCounter });
    } catch (updateErr) {
      console.error("Failed to update counter:", updateErr);
      // Don't throw - user already verified, just log the update failure
    }

    return credData.uid;
  } catch (err) {
    // Re-throw with context
    throw err;
  }
}

// ── Follow system: users can follow each other. Each relationship is stored
// once as `${followerUid}_${targetUid}` so it's cheap to check and idempotent.
// followersCount/followingCount live on the user doc itself so the account
// page can show them instantly without a separate count query. ──
function followDocId(followerUid, targetUid) {
  return `${followerUid}_${targetUid}`;
}

// ── Notifications: a simple activity feed shown via the account page's bell
// icon. Best-effort — a failure here should never block the underlying
// action (password change, follow, etc). ──
async function addNotification(uid, type, message, meta = null) {
  try {
    await db.collection("notifications").add({ uid, type, message, meta, createdAt: Date.now(), read: false });
  } catch {
    // non-fatal
  }
}

async function getNotifications(uid, limit = 50) {
  const snap = await db.collection("notifications").where("uid", "==", uid).limit(200).get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list.slice(0, limit);
}

async function hasUnreadNotifications(uid) {
  const list = await getNotifications(uid, 200);
  // Comments don't light up the notification dot — the per-post comment
  // count badge already surfaces those. Likes/follows/tags/reshares still
  // do; only "comment" is excluded here.
  return list.some((n) => !n.read && n.type !== "comment");
}

async function markAllNotificationsRead(uid) {
  const snap = await db.collection("notifications").where("uid", "==", uid).limit(500).get();
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

// ── "X viewed your profile" — de-duped so a viewer only triggers this once
// per 7 days, tracked via a deterministic doc id so we can check with a
// single cheap read instead of scanning the notifications collection. ──
const PROFILE_VIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

async function notifyProfileViewed(viewerUid, viewerProfile, targetUid) {
  if (!viewerProfile || viewerUid === targetUid) return;
  try {
    const ref = db.collection("profile_view_notifs").doc(`${viewerUid}_${targetUid}`);
    const snap = await ref.get();
    const now = Date.now();
    if (snap.exists && now - (snap.data().lastNotifiedAt || 0) < PROFILE_VIEW_COOLDOWN_MS) {
      return; // already notified this target about this viewer within 7 days
    }
    await ref.set({ viewerUid, targetUid, lastNotifiedAt: now });
    const name = ((viewerProfile.firstName || "") + " " + (viewerProfile.lastName || "")).trim() || `@${viewerProfile.username}`;
    await addNotification(targetUid, "profile_view", `${name} viewed your profile`, {
      viewerUid,
      viewerUsername: viewerProfile.username || "",
    });
  } catch {
    // non-fatal — a missed view notification should never break the profile page
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
    if (snap.exists) return; // already following — no-op, never double counts
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

// Stats shown on the account page. Falls back to 0 for accounts created
// before these counters existed.
async function getFollowStats(uid) {
  const profile = await getUserProfile(uid);
  return {
    followers: profile?.followersCount || 0,
    following: profile?.followingCount || 0,
    likes: profile?.likesCount || 0,
  };
}

// Admin-only cosmetic follower growth: adds 7 followers every hour to the
// admin account's displayed count. No follow docs are created — this only
// nudges the counter shown on the admin's own pages.
async function growAdminFollowerCount() {
  try {
    const snap = await db.collection("users").where("email", "==", ADMIN_EMAIL).limit(1).get();
    if (snap.empty) return;
    await snap.docs[0].ref.update({ followersCount: admin.firestore.FieldValue.increment(7) });
  } catch {
    // best-effort
  }
}

// ── Posts: text/photo posts on a user's own profile, with likes and @tags ──
const MAX_POST_IMAGE_BYTES = 900 * 1024;

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
  if (imageDataUrl) {
    if (typeof imageDataUrl !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageDataUrl)) {
      throw new Error("Please attach a valid image.");
    }
    if (imageDataUrl.length > MAX_POST_IMAGE_BYTES) throw new Error("That image is too large. Try a smaller photo.");
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
    editedAt: null,
    createdAt: Date.now(),
  };
  const ref = await db.collection("posts").add(post);

  const authorName = `${author.firstName || ""} ${author.lastName || ""}`.trim() || `@${author.username}`;
  const postUrl = `/u/${author.username}#post-${ref.id}`;
  for (const t of tagged) {
    await addNotification(t.uid, "tag", `${authorName} tagged you.`, { postId: ref.id, postUrl });
  }

  return { id: ref.id, ...post, likesCount: 0, likedByViewer: false, commentsCount: 0 };
}

// Reshares never carry their own likes OR comments — both are recorded on
// the original post they point to (see togglePostLike / addComment below),
// so a reshare's own `likedBy` and `commentsCount` stay empty forever.
// This resolves the *real* stats (the original's, for a reshare; its own,
// otherwise) for a batch of raw post docs, so list views show the same
// like/comment counts a viewer would see on the original post itself.
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
      // Comments live on the original, so the original's on/off switch is
      // the one that actually governs whether a reshare can be commented on.
      commentsEnabled: src.commentsEnabled !== false,
    });
  }
  return result;
}

// Comments on a reshare belong to the original post's thread — everyone
// discussing the same content sees the same conversation, and the original
// author keeps ownership/moderation of it. Resolves a postId to the id the
// comment collection should actually key on.
async function resolveCommentTargetPostId(postId) {
  const snap = await db.collection("posts").doc(postId).get();
  if (!snap.exists) return postId;
  const data = snap.data();
  return (data.resharedFrom && data.resharedFrom.postId) || postId;
}

async function getPostsByUser(targetUid, viewerUid) {
  const snap = await db.collection("posts").where("uid", "==", targetUid).limit(200).get();
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  posts.sort((a, b) => b.createdAt - a.createdAt);

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
      editedAt: p.editedAt || null,
      createdAt: p.createdAt,
      likesCount: stats.likedBy.length,
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
  if (imageDataUrl) {
    if (typeof imageDataUrl !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(imageDataUrl)) {
      throw new Error("Please attach a valid image.");
    }
    if (imageDataUrl.length > MAX_POST_IMAGE_BYTES) throw new Error("That image is too large. Try a smaller photo.");
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
    likesCount: (updated.likedBy || []).length,
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

  const likeCount = (post.likedBy || []).length;
  if (likeCount > 0) {
    await db.collection("users").doc(uid).update({
      likesCount: admin.firestore.FieldValue.increment(-likeCount),
    }).catch(() => {});
  }
  await ref.delete();
  return { ok: true };
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

// ── Comments: single-level (no replies), with owner moderation (pin/hide/delete) and likes ──
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

// Small lookup used by the comments API to know who to notify — added
// alongside the existing comment functions without touching their logic.
async function getPostOwner(postId) {
  const snap = await db.collection("posts").doc(postId).get();
  if (!snap.exists) return null;
  let data = snap.data();
  // Comments on a reshare live on the original post, so the person to
  // notify about a new comment is the original author, not the resharer.
  if (data.resharedFrom && data.resharedFrom.postId) {
    const origSnap = await db.collection("posts").doc(data.resharedFrom.postId).get();
    if (origSnap.exists) data = origSnap.data();
  }
  const owner = await getUserProfile(data.uid);
  return owner ? { uid: data.uid, username: owner.username } : { uid: data.uid, username: null };
}

// Small lookup used by the comments API to know who to notify on a reply —
// additive, doesn't touch the existing comment functions' logic.
async function getCommentAuthorUid(commentId) {
  const snap = await db.collection("comments").doc(commentId).get();
  if (!snap.exists) return null;
  return snap.data().uid || null;
}

async function addComment(uid, postId, text, taggedUsernames) {
  const cleanText = (text || "").toString().trim().slice(0, 500);
  if (!cleanText) throw new Error("Write something first.");
  // A reshare has no comment thread of its own — commenting on one adds to
  // the original post's thread, so everyone sees the same conversation and
  // the original author keeps ownership of it.
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
      photoURL: author.showProfilePhoto === false ? null : (author.photoURL || null), isAdmin: isAdminEmail(author.email), verified: !!author.verified,
    } : null,
  };
}

async function getComments(postId, viewerUid) {
  // Same redirection as addComment — a reshare shows the original's thread.
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
        photoURL: author.showProfilePhoto === false ? null : (author.photoURL || null), isAdmin: isAdminEmail(author.email), verified: !!author.verified,
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

  // A reshare doesn't own likes — liking one always credits the original
  // post it points to (its likedBy array, its author's likesCount, its
  // notification), so a like never ends up attributed to the resharer.
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
  return { likesCount: (updated.likedBy || []).length, likedByViewer: (updated.likedBy || []).includes(uid) };
}

// Fetches the actual list of people following (or followed by) a user, for
// the followers/following overlay. Firestore 'in' queries cap at 30 ids, so
// large lists are looked up in chunks.
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
        isAdmin: isAdminEmail(data.email), verified: !!data.verified,
      });
    });
  }
  return users;
}

// ── Following feed — posts from people you follow, shown via the small
// "POSTS" overlay on the profile page. Mirrors getFollowList's approach of
// chunked, unordered queries + sorting in JS (no .orderBy() combined with
// an 'in' filter), so this never needs a new Firestore composite index. ──
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

  // Visibility: "everyone" shown to anyone, "only_me" never shown to
  // someone else, "friends" only if that author follows the viewer back
  // too. isFollowing() is a single doc get (deterministic id), not a
  // query, so batching it per distinct author needs no index either.
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
        isAdmin: isAdminEmail(data.email), verified: !!data.verified,
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
      likesCount: stats.likedBy.length,
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
    // Field mask: this only needs createdAt/visibility to produce a count,
    // so there's no reason to pull full post bodies (text, base64 images)
    // across the wire for what's ultimately just a badge number, polled
    // every 20s from every open tab.
    const snap = await db.collection("posts").where("uid", "in", chunk).limit(50)
      .select("createdAt", "visibility").get();
    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.createdAt <= lastSeenFeedAt) return;
      // Not re-checking "friends"-visibility mutual-follow here — the badge
      // is a lightweight heads-up, and getFollowingFeed above is what
      // actually gates what's shown. Slightly over-counting a friends-only
      // post you can't see yet is a minor cosmetic edge case, not a
      // security issue, and avoids extra reads on every poll of this.
      if ((data.visibility || "everyone") === "only_me") return;
      count++;
    });
  }
  return Math.min(count, 99);
}

// Prefix search on the (already-lowercased) username field — the standard
// Firestore trick for "starts with" search without a separate search index.
async function searchUsersByUsername(query, excludeUid, limit = 15) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const [usernameSnap, altSnap] = await Promise.all([
    db.collection("users")
      .where("username", ">=", q)
      .where("username", "<=", q + "\uf8ff")
      .limit(limit)
      .get(),
    // Alt/reserved usernames are stored as exact strings (no prefix index),
    // so this matches when the full alt username has been typed.
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
        isAdmin: isAdminEmail(data.email), verified: !!data.verified,
      };
    });
}

const LAST_ACTIVE_UPDATE_THROTTLE_MS = 2 * 60 * 1000; // don't write on every single request

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session;
  verifySession(sessionId)
    .then(async (uid) => {
      if (!uid) return res.status(401).json({ error: "not_authenticated" });
      const profile = await getUserProfile(uid);
      // `banned` is enforced here rather than relying on the ban having
      // deleted the session: a signed cookie can't be deleted, and this check
      // is free because the profile is already loaded. isSessionRevoked
      // covers cookies issued before the account was banned or scheduled for
      // deletion.
      if (!profile || profile.pendingDeletion || profile.banned || isSessionRevoked(sessionId, profile)) {
        await deleteSession(sessionId);
        return res.status(401).json({ error: "not_authenticated" });
      }
      req.uid = uid;
      req.userProfile = profile; // already fetched above — downstream handlers can reuse this instead of re-fetching
      // Presence / "last seen" — best-effort, throttled so we're not writing
      // to the user doc on every single authenticated request.
      if (!profile.lastActiveAt || Date.now() - profile.lastActiveAt > LAST_ACTIVE_UPDATE_THROTTLE_MS) {
        updateUserProfile(uid, { lastActiveAt: Date.now() }).catch(() => {});
      }
      next();
    })
    .catch(() => res.status(401).json({ error: "not_authenticated" }));
}

// ── Admin user management (owner-only tools, gated by isAdminEmail) ──
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
    verified: !!data.verified,
  };
}

// Paginated list of every account for the "User Accounts" panel — newest first.
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

// Prefix search on username, for the quick-access search box in the admin panel.
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

  // Telegram-only accounts have no email — let admins look them up by their numeric Telegram ID too.
  if (/^\d+$/.test(q)) {
    const tgSnap = await db.collection("users").where("telegramId", "==", q).limit(5).get();
    tgSnap.docs
      .filter((d) => !d.data().pendingDeletion && !isAdminEmail(d.data().email) && !d.data().banned)
      .forEach((d) => results.set(d.id, adminUserView(d.id, d.data())));
  }

  // Same idea for GitHub-only accounts — searchable by numeric GitHub ID or @login.
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

  // Best-effort ban notification — never let an email hiccup block the ban itself.
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
      // non-fatal
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

async function adminVerifyUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  await db.collection("users").doc(uid).update({ verified: true, verifiedAt: Date.now() });
  return adminUserView(uid, { ...profile, verified: true });
}

async function adminUnverifyUser(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) throw new Error("Account not found.");
  await db.collection("users").doc(uid).update({ verified: false, verifiedAt: null });
  return adminUserView(uid, { ...profile, verified: false });
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
  API_KEY_MONTHLY_LIMIT,
  getAccountApiUsage,
  checkAndIncrementAccountApiUsage,
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
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowStats,
  growAdminFollowerCount,
  createPost,
  getPostsByUser,
  togglePostLike,
  updatePostVisibility,
  updatePostSettings,
  updatePost,
  deletePost,
  resharePost,
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
  getNotifications,
  hasUnreadNotifications,
  markAllNotificationsRead,
  notifyProfileViewed,
  searchUsersByUsername,
  requireAuth,
  isAdminEmail,
  SESSION_TTL_MS,
};
