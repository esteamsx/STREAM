import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "../config/firebase.js";
import { appendCoinLedger } from "./coin-ledger.js";
import { addNotification, discountedCashPrice, getAdminUid, getUserProfile, COIN_PACKAGES } from "./auth.js";
import { getSpotCoins, getSpotDepositHistory, getSpotTicker } from "./weex-readonly.js";
import { getDecryptedCredentials } from "./trading-credentials.js";
import { NGN_PER_USD } from "./paystack.js";

export const CRYPTO_DEPOSIT_MIN_COINS = 100;
export const CRYPTO_DEPOSIT_MAX_COINS = 3000;
export const CRYPTO_DEPOSIT_FEE_USD = 1;
export const TRX_USD_RATE = 0.60;
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;
const VERIFICATION_RETRY_WINDOW_MS = 5 * 60 * 1000;

const NETWORKS = {
  usdt_aptos: { id: "usdt_aptos", depositType: "USDT", asset: "USDT", label: "USDT", network: "Aptos", chainAliases: ["APTOS", "APT"], address: "0xf241264225dcaffb0d5473656281413ff11127d12a949e224bed85cfc65a8893", logo: "https://cdn.simpleicons.org/tether" },
  usdt_polygon: { id: "usdt_polygon", depositType: "USDT", asset: "USDT", label: "USDT", network: "Polygon POS", chainAliases: ["POLYGONPOS", "POLYGON", "MATIC", "POL"], address: "0x9be1a31daeba36bb75b358b9b8e2559a47c682d2", logo: "https://cdn.simpleicons.org/tether" },
  usdt_trx: { id: "usdt_trx", depositType: "USDT", asset: "USDT", label: "USDT", network: "TRX", chainAliases: ["TRX", "TRC20", "TRON"], address: "TAi4ZehqXYxPbvJccvWxMM9wp39phPPMv5", logo: "https://cdn.simpleicons.org/tether" },
  usdt_eth: { id: "usdt_eth", depositType: "USDT", asset: "USDT", label: "USDT", network: "ETH", chainAliases: ["ETH", "ERC20", "ETHEREUM"], address: "0x9be1a31daeba36bb75b358b9b8e2559a47c682d2", logo: "https://cdn.simpleicons.org/tether" },
  usdt_bsc: { id: "usdt_bsc", depositType: "USDT", asset: "USDT", label: "USDT", network: "BSC", chainAliases: ["BSC", "BEP20BSC", "BEP20"], address: "0x9be1a31daeba36bb75b358b9b8e2559a47c682d2", logo: "https://cdn.simpleicons.org/tether" },
  usdt_sol: { id: "usdt_sol", depositType: "USDT", asset: "USDT", label: "USDT", network: "Solana", chainAliases: ["SOL", "SOLANA"], address: "8ageuHezSjwxg81hjAvEKvH5P9BoaN5R9hn2ao24ZJ8q", logo: "https://cdn.simpleicons.org/tether" },
  btc_bsc: { id: "btc_bsc", depositType: "BTC", asset: "BTC", label: "BTC", network: "BSC", chainAliases: ["BSC", "BEP20BSC", "BEP20"], address: "0x9be1a31daeba36bb75b358b9b8e2559a47c682d2", logo: "https://cdn.simpleicons.org/bitcoin" },
  btc_native: { id: "btc_native", depositType: "BTC", asset: "BTC", label: "BTC", network: "Bitcoin", chainAliases: ["BTC", "BITCOIN"], address: "0x9be1a31daeba36bb75b358b9b8e2559a47c682d2", logo: "https://cdn.simpleicons.org/bitcoin" },
};

const COIN_PRICE_POINTS = Object.values(COIN_PACKAGES).map((item) => ({ coins: Number(item.coins), priceNgn: Number(item.priceNgn) })).sort((a, b) => a.coins - b.coins);

async function getWeexCredentials() {
  if (process.env.WEEX_API_KEY && process.env.WEEX_API_SECRET && process.env.WEEX_API_PASSPHRASE) {
    return { apiKey: process.env.WEEX_API_KEY, apiSecret: process.env.WEEX_API_SECRET, passphrase: process.env.WEEX_API_PASSPHRASE };
  }
  const adminUid = await getAdminUid().catch(() => null);
  if (!adminUid) return null;
  return getDecryptedCredentials(adminUid, "weex", "live").catch(() => null);
}

function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function cleanCoins(raw) { const coins = Math.floor(Number(raw)); if (!Number.isFinite(coins) || coins < CRYPTO_DEPOSIT_MIN_COINS || coins > CRYPTO_DEPOSIT_MAX_COINS) fail(`Enter between ${CRYPTO_DEPOSIT_MIN_COINS.toLocaleString()} and ${CRYPTO_DEPOSIT_MAX_COINS.toLocaleString()} coins.`); return coins; }
function cleanHash(raw) { const hash = String(raw || "").trim(); if (!/^[a-z0-9:_-]{16,180}$/i.test(hash)) fail("Enter a valid transaction hash."); return hash; }
function networkFor(id) { const network = NETWORKS[String(id || "")]; if (!network) fail("Select a supported crypto network."); return network; }
function interpolatePrice(coins) { const exact = COIN_PRICE_POINTS.find((p) => p.coins === coins); if (exact) return exact.priceNgn; let lower = COIN_PRICE_POINTS[0]; let upper = COIN_PRICE_POINTS[COIN_PRICE_POINTS.length - 1]; for (let i = 0; i < COIN_PRICE_POINTS.length - 1; i += 1) { if (coins >= COIN_PRICE_POINTS[i].coins && coins <= COIN_PRICE_POINTS[i + 1].coins) { lower = COIN_PRICE_POINTS[i]; upper = COIN_PRICE_POINTS[i + 1]; break; } } const fraction = (coins - lower.coins) / (upper.coins - lower.coins || 1); return Math.round((lower.priceNgn + (upper.priceNgn - lower.priceNgn) * fraction) * 100) / 100; }
function normalizeChain(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
function chainMatches(network, rowChain) { if (!network || !rowChain) return false; const actual = normalizeChain(rowChain); return network.chainAliases.some((alias) => { const normalized = normalizeChain(alias); return normalized === actual || actual.includes(normalized) || normalized.includes(actual); }); }
function roundCrypto(value) { return Number(Number(value).toFixed(10)); }

async function tickerRate(network) {
  if (network.asset === "BTC") {
    const result = await getSpotTicker("BTCUSDT");
    const price = Number(result?.price);
    if (!Number.isFinite(price) || price <= 0) fail("The BTC rate is temporarily unavailable.", 503);
    return price;
  }
  if (network.network === "TRX") return TRX_USD_RATE;
  return 1;
}

async function chainMinimum(asset, network) {
  try {
    const coins = await getSpotCoins();
    const coin = (Array.isArray(coins) ? coins : []).find((item) => String(item?.coin || "").toUpperCase() === asset);
    const chain = (coin?.networkList || []).find((item) => chainMatches(network, item.network || item.name));
    if (!chain) return { minimum: null, chain: null, available: false };
    return { minimum: Number.isFinite(Number(chain.depositDust)) ? Number(chain.depositDust) : null, chain: chain.network || chain.name || null, available: chain.depositEnable !== false };
  } catch {
    return { minimum: null, chain: null, available: true };
  }
}

export async function getCryptoQuote(rawCoins, networkId, profile = null) {
  const coins = cleanCoins(rawCoins); const network = networkFor(networkId); const baseNgn = interpolatePrice(coins); const priceNgn = profile ? discountedCashPrice(baseNgn, profile) : baseNgn; const amountUsd = priceNgn / NGN_PER_USD; const totalUsd = amountUsd + CRYPTO_DEPOSIT_FEE_USD; const rateUsd = await tickerRate(network); const cryptoAmount = roundCrypto(totalUsd / rateUsd); const limits = await chainMinimum(network.asset, network); const credentials = await getWeexCredentials();
  return { coins, priceNgn, feeUsd: CRYPTO_DEPOSIT_FEE_USD, amountUsd, totalUsd, rateUsd, cryptoAmount, network: { ...network, chain: limits.chain, minimum: limits.minimum, available: limits.available, warning: "" }, verificationAvailable: !!credentials };
}

export function listCryptoNetworks() { return Object.values(NETWORKS).map((network) => ({ ...network, chainAliases: undefined })); }

export async function createCryptoDeposit(uid, rawCoins, networkId) {
  const profile = await getUserProfile(uid, 0); if (!profile) fail("Account not found.", 404); const quote = await getCryptoQuote(rawCoins, networkId, profile); if (quote.network.minimum !== null && quote.cryptoAmount < quote.network.minimum) fail(`This amount is below WEEX's minimum deposit of ${quote.network.minimum} ${quote.network.asset} for ${quote.network.network}.`); const now = Date.now(); const ref = db.collection("cryptoDeposits").doc(); const data = { uid, status: "pending", coins: quote.coins, amountNgn: quote.priceNgn, feeUsd: quote.feeUsd, amountUsd: quote.amountUsd, totalUsd: quote.totalUsd, asset: quote.network.asset, networkId: quote.network.id, network: quote.network.network, chain: quote.network.chain || null, cryptoAmount: quote.cryptoAmount, destinationAddress: quote.network.address, rateUsd: quote.rateUsd, createdAt: now, updatedAt: now, verificationAttempts: 0 }; await ref.set(data); return { id: ref.id, ...data, networkInfo: quote.network, verificationAvailable: quote.verificationAvailable };
}

export async function getCryptoDeposit(uid, id) { const ref = db.collection("cryptoDeposits").doc(String(id || "")); const snap = await ref.get(); if (!snap.exists || snap.data().uid !== uid) return null; return { id: snap.id, ...snap.data() }; }
export async function listCryptoDeposits(uid) { const snap = await db.collection("cryptoDeposits").where("uid", "==", uid).get(); return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); }

export async function submitCryptoDepositHash(uid, id, rawHash) {
  const hash = cleanHash(rawHash); const depositRef = db.collection("cryptoDeposits").doc(String(id || "")); const hashRef = db.collection("cryptoDepositHashes").doc(crypto.createHash("sha256").update(hash.toLowerCase()).digest("hex"));
  return db.runTransaction(async (tx) => { const depositSnap = await tx.get(depositRef); const hashSnap = await tx.get(hashRef); if (!depositSnap.exists || depositSnap.data().uid !== uid) fail("Deposit not found.", 404); const deposit = depositSnap.data(); if (deposit.status === "successful") return { id: depositSnap.id, ...deposit }; if (hashSnap.exists && hashSnap.data().depositId !== depositSnap.id) fail("That transaction hash has already been submitted."); const now = Date.now(); const verificationDeadlineAt = now + VERIFICATION_WINDOW_MS; const verificationRetryAt = verificationDeadlineAt + VERIFICATION_RETRY_WINDOW_MS; tx.set(hashRef, { depositId: depositSnap.id, uid, hash, createdAt: now }, { merge: true }); tx.update(depositRef, { txHash: hash, status: "pending", verificationStartedAt: now, verificationDeadlineAt, verificationRetryAt, updatedAt: now, verificationError: admin.firestore.FieldValue.delete() }); return { id: depositSnap.id, ...deposit, txHash: hash, status: "pending", verificationStartedAt: now, verificationDeadlineAt, verificationRetryAt }; });
}

function verificationStatus(row) { const status = Number(row?.status); if (status === 1) return "successful"; if (status === 0) return "pending"; return "hold"; }
async function updateDeposit(id, fields) { await db.collection("cryptoDeposits").doc(id).set({ ...fields, updatedAt: Date.now() }, { merge: true }); }

export async function verifyCryptoDeposit(uid, id) {
  const current = await getCryptoDeposit(uid, id); if (!current) fail("Deposit not found.", 404); if (current.status === "successful") return current; if (!current.txHash) fail("Submit your transaction hash first."); const now = Date.now(); const verificationStartedAt = Number(current.verificationStartedAt) || now; const verificationDeadlineAt = Number(current.verificationDeadlineAt) || verificationStartedAt + VERIFICATION_WINDOW_MS; const verificationRetryAt = Number(current.verificationRetryAt) || verificationDeadlineAt + VERIFICATION_RETRY_WINDOW_MS; const finalRetryExpired = now >= verificationRetryAt; const attempts = Number(current.verificationAttempts || 0) + 1; const credentials = await getWeexCredentials();
  if (!credentials) { await updateDeposit(id, { status: "hold", verificationAttempts: attempts, verificationError: "Deposit verification is awaiting administrator review." }); return { ...current, status: "hold", verificationAttempts: attempts }; }
  let result; try { result = await getSpotDepositHistory({ coin: current.asset, txHash: current.txHash, pageNo: 1, pageSize: 50 }, credentials); } catch { await updateDeposit(id, { status: "hold", verificationAttempts: attempts, verificationError: "The deposit provider did not return a verification result." }); return { ...current, status: "hold", verificationAttempts: attempts }; }
  const rows = Array.isArray(result?.items) ? result.items : []; const row = rows.find((item) => String(item.txHash || "").toLowerCase() === current.txHash.toLowerCase());
  if (!row) { const nextStatus = finalRetryExpired ? "declined" : "pending"; await updateDeposit(id, { status: nextStatus, verificationStartedAt, verificationDeadlineAt, verificationRetryAt, verificationAttempts: attempts, lastCheckedAt: now, verificationError: finalRetryExpired ? "WEEX did not return this transaction after the verification retry window." : "WEEX has not returned this transaction yet." }); return { ...current, status: nextStatus, verificationStartedAt, verificationDeadlineAt, verificationRetryAt, verificationAttempts: attempts }; }
  const amountMatches = Math.abs(Number(row.amount) - Number(current.cryptoAmount)) <= Math.max(0.00000001, Number(current.cryptoAmount) * 0.000001); const addressMatches = String(row.address || "").toLowerCase() === String(current.destinationAddress || "").toLowerCase(); const coinMatches = String(row.coin || "").toUpperCase() === current.asset; const chainMatchesRow = chainMatches(NETWORKS[current.networkId], row.network); const state = verificationStatus(row); const snapshot = { txHash: row.txHash, coin: row.coin, network: row.network, amount: row.amount, address: row.address, status: row.status, confirmedNum: row.confirmedNum || null, updatedAt: row.updatedAt || null };
  if (state !== "successful" || !amountMatches || !addressMatches || !coinMatches || !chainMatchesRow) { const nextStatus = finalRetryExpired ? "declined" : state === "pending" ? "pending" : "hold"; await updateDeposit(id, { status: nextStatus, verificationStartedAt, verificationDeadlineAt, verificationRetryAt, verificationAttempts: attempts, lastCheckedAt: now, verificationSnapshot: snapshot, verificationError: finalRetryExpired ? "The transaction did not exactly match after the verification retry window." : !amountMatches || !addressMatches || !chainMatchesRow ? "The returned WEEX record did not exactly match the requested asset, network, amount, or destination." : "WEEX has not finalized this deposit." }); return { ...current, status: nextStatus, verificationStartedAt, verificationDeadlineAt, verificationRetryAt, verificationAttempts: attempts, verificationSnapshot: snapshot }; }
  const depositRef = db.collection("cryptoDeposits").doc(id); const userRef = db.collection("users").doc(uid); let credited = false;
  await db.runTransaction(async (tx) => { const depositSnap = await tx.get(depositRef); const userSnap = await tx.get(userRef); if (!depositSnap.exists || !userSnap.exists || depositSnap.data().uid !== uid) fail("Deposit not found.", 404); const deposit = depositSnap.data(); if (deposit.status === "successful") return; const user = userSnap.data(); const ledger = appendCoinLedger(tx, userRef, user, Number(deposit.coins), "crypto_deposit", { depositId: id, txHash: deposit.txHash, asset: deposit.asset, network: deposit.network }); tx.set(userRef, { coinBalance: admin.firestore.FieldValue.increment(Number(deposit.coins)), ...ledger }, { merge: true }); tx.update(depositRef, { status: "successful", verifiedAt: Date.now(), lastCheckedAt: Date.now(), verificationAttempts: attempts, verificationSnapshot: snapshot, verificationError: admin.firestore.FieldValue.delete(), updatedAt: Date.now() }); credited = true; });
  if (credited) await addNotification(uid, "crypto_deposit", `+${current.coins} coins added from your crypto deposit`, { coins: current.coins, depositId: id }).catch(() => {}); return { ...(await getCryptoDeposit(uid, id)), credited };
}

export async function adminListCryptoDeposits() {
  const snap = await db.collection("cryptoDeposits").where("status", "in", ["pending", "hold"]).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function adminDecideCryptoDeposit(adminUid, id, decision) {
  const accepted = decision === "successful" || decision === "accepted";
  const status = accepted ? "successful" : decision === "declined" ? "declined" : "hold";
  const ref = db.collection("cryptoDeposits").doc(String(id || ""));
  let uid = null;
  let coins = 0;
  let credited = false;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("Deposit not found.", 404);
    const deposit = snap.data();
    uid = deposit.uid;
    coins = Number(deposit.coins || 0);
    if (deposit.status === "successful") return;
    if (deposit.status === "declined") fail("This deposit has already been declined.");

    if (accepted) {
      const userRef = db.collection("users").doc(deposit.uid);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) fail("User account not found.", 404);
      const user = userSnap.data();
      const ledger = appendCoinLedger(tx, userRef, user, coins, "crypto_deposit", {
        depositId: ref.id,
        txHash: deposit.txHash || null,
        asset: deposit.asset,
        network: deposit.network,
        approvedBy: adminUid,
      });
      tx.set(userRef, { coinBalance: admin.firestore.FieldValue.increment(coins), ...ledger }, { merge: true });
      credited = true;
    }

    tx.update(ref, {
      status,
      adminDecision: accepted ? "accepted" : "declined",
      adminUid,
      adminDecidedAt: Date.now(),
      ...(accepted ? { verifiedAt: Date.now(), creditedByAdmin: true } : {}),
      updatedAt: Date.now(),
    });
  });

  if (uid && credited) {
    await addNotification(uid, "crypto_deposit", `+${coins} coins added from your crypto deposit`, { coins, depositId: String(id), approvedByAdmin: true }).catch(() => {});
  } else if (uid && status === "declined") {
    await addNotification(uid, "crypto_deposit_declined", "Your crypto deposit was declined by an administrator.", { depositId: String(id) }).catch(() => {});
  }

  const updated = await db.collection("cryptoDeposits").doc(String(id)).get();
  return { id: updated.id, ...updated.data(), credited };
}
