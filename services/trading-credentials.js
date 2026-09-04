import { db } from "../config/firebase.js";
import { encryptSecret, decryptSecret, last4, hashForLookup } from "./trading-vault-crypto.js";

const COLLECTION = "tradingCredentials";
const VALID_EXCHANGES = ["bybit", "weex"];
const VALID_MODES = ["live", "demo"];
const HASH_PATHS_BY_FIELD = {
  apiKey: ["bybit.live.apiKeyHash", "bybit.demo.apiKeyHash", "weex.live.apiKeyHash", "weex.demo.apiKeyHash"],
  apiSecret: ["bybit.live.apiSecretHash", "bybit.demo.apiSecretHash", "weex.live.apiSecretHash", "weex.demo.apiSecretHash"],
  passphrase: ["weex.live.passphraseHash", "weex.demo.passphraseHash"],
};

function assertExchangeMode(exchange, mode) {
  if (!VALID_EXCHANGES.includes(exchange)) {
    throw Object.assign(new Error("Unknown exchange."), { status: 400 });
  }
  if (!VALID_MODES.includes(mode)) {
    throw Object.assign(new Error("Unknown trading mode."), { status: 400 });
  }
}

export async function saveCredentials(uid, exchange, mode, fields) {
  assertExchangeMode(exchange, mode);
  if (!fields.apiKey || !fields.apiSecret) {
    throw Object.assign(new Error("API key and secret are required."), { status: 400 });
  }
  if (exchange === "weex" && !fields.passphrase) {
    throw Object.assign(new Error("WEEX also requires the API passphrase."), { status: 400 });
  }
  const entry = {
    apiKey: encryptSecret(fields.apiKey),
    apiSecret: encryptSecret(fields.apiSecret),
    apiKeyHash: hashForLookup(fields.apiKey),
    apiSecretHash: hashForLookup(fields.apiSecret),
    last4: last4(fields.apiKey),
    savedAt: Date.now(),
  };
  if (exchange === "weex") {
    entry.passphrase = encryptSecret(fields.passphrase);
    entry.passphraseHash = hashForLookup(fields.passphrase);
  }
  const ref = db.collection(COLLECTION).doc(uid);
  await ref.set({ [exchange]: { [mode]: entry } }, { merge: true });
}

export async function deleteCredentials(uid, exchange, mode) {
  assertExchangeMode(exchange, mode);
  const ref = db.collection(COLLECTION).doc(uid);
  await ref.set({ [exchange]: { [mode]: null } }, { merge: true });
}

export async function findDuplicateCredentialOwner(uid, field, value) {
  const paths = HASH_PATHS_BY_FIELD[field];
  if (!paths || !value) return false;
  const hash = hashForLookup(value);
  const results = await Promise.all(
    paths.map((path) => db.collection(COLLECTION).where(path, "==", hash).limit(5).get())
  );
  for (const snap of results) {
    for (const doc of snap.docs) {
      if (doc.id !== uid) return true;
    }
  }
  return false;
}

function statusFor(data, exchange, mode) {
  const c = data?.[exchange]?.[mode];
  return c ? { saved: true, last4: c.last4 || null, savedAt: c.savedAt || null } : { saved: false };
}

export async function getCredentialsStatus(uid) {
  const snap = await db.collection(COLLECTION).doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  return {
    bybit: { live: statusFor(data, "bybit", "live"), demo: statusFor(data, "bybit", "demo") },
    weex: { live: statusFor(data, "weex", "live"), demo: statusFor(data, "weex", "demo") },
    autoTrading: data?.autoTrading || { enabled: false, exchange: "bybit", mode: "demo", sizePercent: 15 },
  };
}

export async function getDecryptedCredentials(uid, exchange, mode) {
  assertExchangeMode(exchange, mode);
  const snap = await db.collection(COLLECTION).doc(uid).get();
  const data = snap.exists ? snap.data() : {};
  const c = data?.[exchange]?.[mode];
  if (!c || !c.apiKey || !c.apiSecret) return null;
  return {
    apiKey: decryptSecret(c.apiKey),
    apiSecret: decryptSecret(c.apiSecret),
    passphrase: c.passphrase ? decryptSecret(c.passphrase) : undefined,
  };
}

export async function saveAutoTradingSettings(uid, settings) {
  const sizePercent = Number(settings.sizePercent);
  if (!Number.isFinite(sizePercent) || sizePercent < 1 || sizePercent > 100) {
    throw Object.assign(new Error("Size percent must be between 1 and 100."), { status: 400 });
  }
  const exchange = settings.exchange === "weex" ? "weex" : "bybit";
  const mode = settings.mode === "live" ? "live" : "demo";
  const ref = db.collection(COLLECTION).doc(uid);
  await ref.set({
    autoTrading: { enabled: !!settings.enabled, exchange, mode, sizePercent },
  }, { merge: true });
}

export async function getAllOptedInAutoTraders() {
  const snap = await db.collection(COLLECTION).where("autoTrading.enabled", "==", true).get();
  return snap.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
}
