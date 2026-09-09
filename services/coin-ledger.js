import crypto from "crypto";

const COIN_LEDGER_SIGNING_KEY = (() => {
  const explicit = process.env.COIN_LEDGER_SECRET || process.env.SESSION_SECRET;
  if (explicit) return crypto.createHash("sha256").update(`coin-ledger-v1:${explicit}`).digest();
  const fallback = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!fallback) throw new Error("Set SESSION_SECRET so the coin ledger can be signed.");
  return crypto.createHash("sha256").update(`coin-ledger-v1:${fallback}`).digest();
})();

function canonicalEntry(entry) {
  return JSON.stringify({
    uid: entry.uid,
    seq: entry.seq,
    type: entry.type,
    delta: entry.delta,
    balanceAfter: entry.balanceAfter,
    prevHash: entry.prevHash,
    timestamp: entry.timestamp,
    meta: entry.meta || {},
  });
}

function hashEntry(entry) {
  return crypto.createHash("sha256").update(canonicalEntry(entry)).digest("hex");
}

function signHash(hash) {
  return crypto.createHmac("sha256", COIN_LEDGER_SIGNING_KEY).update(hash).digest("hex");
}

function nextEntry(userRef, prevHash, prevSeq, prevBalance, delta, type, meta) {
  const seq = prevSeq + 1;
  const balanceAfter = prevBalance + delta;
  const entry = { uid: userRef.id, seq, type, delta, balanceAfter, prevHash, timestamp: Date.now(), meta: meta || {} };
  const hash = hashEntry(entry);
  const signature = signHash(hash);
  return {
    ref: userRef.collection("coinLedger").doc(String(seq)),
    doc: { ...entry, hash, signature },
    seq,
    hash,
    balanceAfter,
  };
}

function buildLedgerEntries(userRef, priorData, delta, type, meta) {
  const entries = [];
  let prevHash = priorData.coinLedgerTip || "genesis";
  let prevSeq = priorData.coinLedgerSeq || 0;
  const priorBalance = priorData.coinBalance || 0;
  if (!priorData.coinLedgerTip) {
    const genesis = nextEntry(userRef, "genesis", 0, 0, priorBalance, "ledger_genesis", {
      note: "baseline recorded when signing was enabled for this account",
    });
    entries.push(genesis);
    prevHash = genesis.hash;
    prevSeq = genesis.seq;
  }
  entries.push(nextEntry(userRef, prevHash, prevSeq, priorBalance, delta, type, meta));
  return entries;
}

export function appendCoinLedger(tx, userRef, priorData, delta, type, meta) {
  const entries = buildLedgerEntries(userRef, priorData || {}, delta, type, meta);
  for (const entry of entries) tx.set(entry.ref, entry.doc);
  const last = entries[entries.length - 1];
  return { coinLedgerTip: last.hash, coinLedgerSeq: last.seq, coinLedgerTipBalance: last.balanceAfter };
}

export function coinLedgerMismatch(data) {
  if (!data || !data.coinLedgerTip) return false;
  return (data.coinBalance || 0) !== (data.coinLedgerTipBalance || 0);
}

export async function verifyCoinLedgerChain(db, uid, limit = 5000) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return { valid: false, reason: "user not found" };
  const data = userSnap.data();
  const entriesSnap = await userRef.collection("coinLedger").orderBy("seq", "asc").limit(limit).get();

  let prevHash = "genesis";
  let runningBalance = 0;
  let seq = 0;
  for (const doc of entriesSnap.docs) {
    const entry = doc.data();
    seq += 1;
    if (entry.seq !== seq) return { valid: false, reason: "sequence gap", atSeq: seq };
    if (entry.prevHash !== prevHash) return { valid: false, reason: "broken chain", atSeq: seq };
    const expectedHash = hashEntry(entry);
    if (expectedHash !== entry.hash) return { valid: false, reason: "entry hash mismatch", atSeq: seq };
    if (signHash(expectedHash) !== entry.signature) return { valid: false, reason: "bad signature", atSeq: seq };
    runningBalance += entry.delta;
    if (runningBalance !== entry.balanceAfter) return { valid: false, reason: "running balance mismatch", atSeq: seq };
    prevHash = entry.hash;
  }

  if (entriesSnap.empty) {
    return { valid: true, entryCount: 0, chainBalance: 0, actualBalance: data.coinBalance || 0, migrated: false };
  }

  const chainBalance = runningBalance;
  const actualBalance = data.coinBalance || 0;
  if (chainBalance !== actualBalance) {
    return { valid: false, reason: "current balance does not match ledger tip", chainBalance, actualBalance };
  }
  return { valid: true, entryCount: seq, chainBalance, actualBalance, migrated: true };
}
