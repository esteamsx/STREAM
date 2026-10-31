import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "../config/firebase.js";
import { appendCoinLedger } from "./coin-ledger.js";
import { addNotification, discountedCashPrice, getUserProfile, COIN_PACKAGES } from "./auth.js";
import { getPublicTicker, getCoinInfo, getDepositRecord } from "./bybit-readonly.js";
import { NGN_PER_USD } from "./paystack.js";

export const CRYPTO_DEPOSIT_MIN_COINS = 100;
export const CRYPTO_DEPOSIT_MAX_COINS = 3000;
export const CRYPTO_DEPOSIT_FEE_USD = 1;
export const TRX_USD_RATE = 0.60;

const NETWORKS = {
  usdt_trc20: {
    id: "usdt_trc20", asset: "USDT", label: "USDT", network: "TRC20", chainAliases: ["TRX", "TRC20", "TRON"],
    address: "TBWMGYfvYs27uaWYsbm4nCKRm5hQieaKM7", logo: "https://cdn.simpleicons.org/tether",
  },
  usdt_erc20: {
    id: "usdt_erc20", asset: "USDT", label: "USDT", network: "ERC20", chainAliases: ["ETH", "ERC20", "ETHEREUM"],
    address: "0x6a0bd643467c63508e66bace1f2d019580776a8a", logo: "https://cdn.simpleicons.org/tether",
  },
  usdt_aptos: {
    id: "usdt_aptos", asset: "USDT", label: "USDT", network: "Aptos", chainAliases: ["APTOS", "APT"],
    address: "0xe18eecdf100e979926c2974c3e352123a5e8de30b712b98715f9deab1808c045", logo: "https://cdn.simpleicons.org/tether",
  },
  usdt_polygon: {
    id: "usdt_polygon", asset: "USDT", label: "USDT", network: "Polygon POS", chainAliases: ["MATIC", "POLYGON", "POLYGON POS"],
    address: "0x6a0bd643467c63508e66bace1f2d019580776a8a", logo: "https://cdn.simpleicons.org/tether",
  },
  usdt_ton: {
    id: "usdt_ton", asset: "USDT", label: "USDT", network: "TON", chainAliases: ["TON"],
    address: "UQD9dzBRqDuv80IEMi5NGElZxyQ1svxqwQmLnLSGEO68lRyy", logo: "https://cdn.simpleicons.org/tether",
  },
  btc: {
    id: "btc", asset: "BTC", label: "BTC", network: "Bitcoin network", chainAliases: ["BTC", "BITCOIN"],
    address: "13vKcHUrPp1otBFUVvDNPtbHf9v6WCazB2", logo: "https://cdn.simpleicons.org/bitcoin",
  },
};

const COIN_PRICE_POINTS = Object.values(COIN_PACKAGES)
  .map((item) => ({ coins: Number(item.coins), priceNgn: Number(item.priceNgn) }))
  .sort((a, b) => a.coins - b.coins);

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function cleanCoins(raw) {
  const coins = Math.floor(Number(raw));
  if (!Number.isFinite(coins) || coins < CRYPTO_DEPOSIT_MIN_COINS || coins > CRYPTO_DEPOSIT_MAX_COINS) {
    fail(`Enter between ${CRYPTO_DEPOSIT_MIN_COINS.toLocaleString()} and ${CRYPTO_DEPOSIT_MAX_COINS.toLocaleString()} coins.`);
  }
  return coins;
}

function cleanHash(raw) {
  const hash = String(raw || "").trim();
  if (!/^[a-z0-9:_-]{16,180}$/i.test(hash)) fail("Enter a valid transaction hash.");
  return hash;
}

function networkFor(id) {
  const network = NETWORKS[String(id || "")];
  if (!network) fail("Select a supported crypto network.");
  return network;
}

function interpolatePrice(coins) {
  const exact = COIN_PRICE_POINTS.find((p) => p.coins === coins);
  if (exact) return exact.priceNgn;
  let lower = COIN_PRICE_POINTS[0];
  let upper = COIN_PRICE_POINTS[COIN_PRICE_POINTS.length - 1];
  for (let i = 0; i < COIN_PRICE_POINTS.length - 1; i += 1) {
    if (coins >= COIN_PRICE_POINTS[i].coins && coins <= COIN_PRICE_POINTS[i + 1].coins) {
      lower = COIN_PRICE_POINTS[i];
      upper = COIN_PRICE_POINTS[i + 1];
      break;
    }
  }
  const fraction = (coins - lower.coins) / (upper.coins - lower.coins || 1);
  return Math.round((lower.priceNgn + (upper.priceNgn - lower.priceNgn) * fraction) * 100) / 100;
}

function normalizeChain(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function chainMatches(network, rowChain) {
  const actual = normalizeChain(rowChain);
  return network.chainAliases.some((alias) => normalizeChain(alias) === actual || actual.includes(normalizeChain(alias)) || normalizeChain(alias).includes(actual));
}

function roundCrypto(value) {
  return Number(Number(value).toFixed(10));
}

async function tickerRate(network) {
  if (network.asset === "BTC") {
    const result = await getPublicTicker("spot", "BTCUSDT");
    const price = Number(result?.list?.[0]?.lastPrice);
    if (!Number.isFinite(price) || price <= 0) fail("The BTC rate is temporarily unavailable.", 503);
    return price;
  }
  if (network.network === "TRC20") return TRX_USD_RATE;
  return 1;
}

async function chainMinimum(asset, network) {
  try {
    const info = await getCoinInfo(asset);
    const row = (info?.rows || []).find((item) => String(item.coin || "").toUpperCase() === asset);
    const chain = (row?.chains || []).find((item) => chainMatches(network, item.chain) || chainMatches(network, item.chainType));
    if (!chain) return { minimum: null, chain: null, available: false, warning: "Bybit did not return this network's deposit settings." };
    const minimum = Number(chain.depositMin);
    return {
      minimum: Number.isFinite(minimum) && minimum >= 0 ? minimum : null,
      chain: chain.chain || chain.chainType || null,
      available: String(chain.chainDeposit) === "1",
      warning: String(chain.chainDeposit) === "1" ? "" : "This network is currently unavailable for Bybit deposits.",
    };
  } catch (err) {
    return { minimum: null, chain: null, available: false, warning: "Bybit deposit limits are temporarily unavailable. Verification will remain on HOLD." };
  }
}

export async function getCryptoQuote(rawCoins, networkId, profile = null) {
  const coins = cleanCoins(rawCoins);
  const network = networkFor(networkId);
  const baseNgn = interpolatePrice(coins);
  const priceNgn = profile ? discountedCashPrice(baseNgn, profile) : baseNgn;
  const amountUsd = priceNgn / NGN_PER_USD;
  const totalUsd = amountUsd + CRYPTO_DEPOSIT_FEE_USD;
  const rateUsd = await tickerRate(network);
  const cryptoAmount = roundCrypto(totalUsd / rateUsd);
  const limits = await chainMinimum(network.asset, network);
  return {
    coins, priceNgn, feeUsd: CRYPTO_DEPOSIT_FEE_USD, amountUsd, totalUsd, rateUsd, cryptoAmount,
    network: { ...network, chain: limits.chain, minimum: limits.minimum, available: limits.available, warning: limits.warning },
    verificationAvailable: !!process.env.BYBIT_API_KEY && !!process.env.BYBIT_API_SECRET,
  };
}

export function listCryptoNetworks() {
  return Object.values(NETWORKS).map((network) => ({ ...network, chainAliases: undefined }));
}

export async function createCryptoDeposit(uid, rawCoins, networkId) {
  const profile = await getUserProfile(uid, 0);
  if (!profile) fail("Account not found.", 404);
  const quote = await getCryptoQuote(rawCoins, networkId, profile);
  if (quote.network.minimum !== null && quote.cryptoAmount < quote.network.minimum) {
    fail(`This amount is below Bybit's minimum deposit of ${quote.network.minimum} ${quote.network.asset} for ${quote.network.network}.`);
  }
  const now = Date.now();
  const ref = db.collection("cryptoDeposits").doc();
  const data = {
    uid, status: "pending", coins: quote.coins, amountNgn: quote.priceNgn, feeUsd: quote.feeUsd,
    amountUsd: quote.amountUsd, totalUsd: quote.totalUsd, asset: quote.network.asset, networkId: quote.network.id,
    network: quote.network.network, chain: quote.network.chain || null, cryptoAmount: quote.cryptoAmount,
    destinationAddress: quote.network.address, rateUsd: quote.rateUsd, createdAt: now, updatedAt: now,
    verificationAttempts: 0,
  };
  await ref.set(data);
  return { id: ref.id, ...data, networkInfo: quote.network, verificationAvailable: quote.verificationAvailable };
}

export async function getCryptoDeposit(uid, id) {
  const ref = db.collection("cryptoDeposits").doc(String(id || ""));
  const snap = await ref.get();
  if (!snap.exists || snap.data().uid !== uid) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listCryptoDeposits(uid) {
  const snap = await db.collection("cryptoDeposits").where("uid", "==", uid).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function submitCryptoDepositHash(uid, id, rawHash) {
  const hash = cleanHash(rawHash);
  const depositRef = db.collection("cryptoDeposits").doc(String(id || ""));
  const hashRef = db.collection("cryptoDepositHashes").doc(crypto.createHash("sha256").update(hash.toLowerCase()).digest("hex"));
  return db.runTransaction(async (tx) => {
    const depositSnap = await tx.get(depositRef);
    const hashSnap = await tx.get(hashRef);
    if (!depositSnap.exists || depositSnap.data().uid !== uid) fail("Deposit not found.", 404);
    const deposit = depositSnap.data();
    if (deposit.status === "successful") return { id: depositSnap.id, ...deposit };
    if (hashSnap.exists && hashSnap.data().depositId !== depositSnap.id) fail("That transaction hash has already been submitted.");
    tx.set(hashRef, { depositId: depositSnap.id, uid, hash, createdAt: Date.now() }, { merge: true });
    tx.update(depositRef, { txHash: hash, status: "pending", updatedAt: Date.now(), verificationError: admin.firestore.FieldValue.delete() });
    return { id: depositSnap.id, ...deposit, txHash: hash, status: "pending" };
  });
}

function verificationStatus(row) {
  const status = Number(row?.status);
  if (status === 3 || status === 10012) return "successful";
  if (status === 4 || status === 70011) return "hold";
  return "pending";
}

async function updateDeposit(id, fields) {
  await db.collection("cryptoDeposits").doc(id).set({ ...fields, updatedAt: Date.now() }, { merge: true });
}

export async function verifyCryptoDeposit(uid, id) {
  const current = await getCryptoDeposit(uid, id);
  if (!current) fail("Deposit not found.", 404);
  if (current.status === "successful") return current;
  if (!current.txHash) fail("Submit your transaction hash first.");
  const attempts = Number(current.verificationAttempts || 0) + 1;
  if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
    await updateDeposit(id, { status: "hold", verificationAttempts: attempts, verificationError: "Bybit verification is not configured. Awaiting manual review." });
    return { ...current, status: "hold", verificationAttempts: attempts };
  }
  let result;
  try {
    result = await getDepositRecord({ txID: current.txHash, coin: current.asset, limit: 50 });
  } catch (err) {
    await updateDeposit(id, { status: "hold", verificationAttempts: attempts, verificationError: "Bybit verification failed. The transaction was preserved for later review." });
    return { ...current, status: "hold", verificationAttempts: attempts };
  }
  const rows = result?.rows || [];
  const row = rows.find((item) => String(item.txID || "").toLowerCase() === current.txHash.toLowerCase());
  if (!row) {
    await updateDeposit(id, { status: "pending", verificationAttempts: attempts, lastCheckedAt: Date.now(), verificationError: "Bybit has not returned this transaction yet." });
    return { ...current, status: "pending", verificationAttempts: attempts };
  }
  const amountMatches = Math.abs(Number(row.amount) - Number(current.cryptoAmount)) <= Math.max(0.00000001, Number(current.cryptoAmount) * 0.000001);
  const addressMatches = String(row.toAddress || "").toLowerCase() === String(current.destinationAddress || "").toLowerCase();
  const coinMatches = String(row.coin || "").toUpperCase() === current.asset;
  const chainMatchesRow = chainMatches(NETWORKS[current.networkId], row.chain);
  const state = verificationStatus(row);
  const snapshot = { txID: row.txID, coin: row.coin, chain: row.chain, amount: row.amount, toAddress: row.toAddress, status: row.status, confirmations: row.confirmations || null, successAt: row.successAt || null, id: row.id || null };
  if (state !== "successful" || !amountMatches || !addressMatches || !coinMatches || !chainMatchesRow) {
    await updateDeposit(id, { status: state === "pending" ? "pending" : "hold", verificationAttempts: attempts, lastCheckedAt: Date.now(), verificationSnapshot: snapshot, verificationError: !amountMatches || !addressMatches || !chainMatchesRow ? "The returned Bybit record did not exactly match the requested asset, network, amount, or destination." : "Bybit has not finalized this deposit." });
    return { ...current, status: state === "pending" ? "pending" : "hold", verificationAttempts: attempts, verificationSnapshot: snapshot };
  }
  const depositRef = db.collection("cryptoDeposits").doc(id);
  const userRef = db.collection("users").doc(uid);
  let credited = false;
  await db.runTransaction(async (tx) => {
    const depositSnap = await tx.get(depositRef);
    const userSnap = await tx.get(userRef);
    if (!depositSnap.exists || !userSnap.exists || depositSnap.data().uid !== uid) fail("Deposit not found.", 404);
    const deposit = depositSnap.data();
    if (deposit.status === "successful") return;
    const user = userSnap.data();
    const ledger = appendCoinLedger(tx, userRef, user, Number(deposit.coins), "crypto_deposit", { depositId: id, txHash: deposit.txHash, asset: deposit.asset, network: deposit.network });
    tx.set(userRef, { coinBalance: admin.firestore.FieldValue.increment(Number(deposit.coins)), ...ledger }, { merge: true });
    tx.update(depositRef, { status: "successful", verifiedAt: Date.now(), lastCheckedAt: Date.now(), verificationAttempts: attempts, verificationSnapshot: snapshot, verificationError: admin.firestore.FieldValue.delete(), updatedAt: Date.now() });
    credited = true;
  });
  if (credited) {
    await addNotification(uid, "crypto_deposit", `+${current.coins} coins added from your crypto deposit`, { coins: current.coins, depositId: id }).catch(() => {});
  }
  return { ...(await getCryptoDeposit(uid, id)), credited };
}

export async function adminListCryptoDeposits() {
  const snap = await db.collection("cryptoDeposits").where("status", "in", ["pending", "hold"]).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function adminDecideCryptoDeposit(adminUid, id, decision) {
  const status = decision === "successful" ? "successful" : decision === "declined" ? "declined" : "hold";
  if (status === "successful") fail("Successful credits must come from a confirmed Bybit verification.");
  const ref = db.collection("cryptoDeposits").doc(String(id || ""));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail("Deposit not found.", 404);
    if (snap.data().status === "successful") fail("This deposit has already been credited.");
    tx.update(ref, { status, adminDecision: status, adminUid, adminDecidedAt: Date.now(), updatedAt: Date.now() });
  });
  return getCryptoDeposit((await db.collection("cryptoDeposits").doc(String(id)).get()).data().uid, id);
}
