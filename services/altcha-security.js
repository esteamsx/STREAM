import crypto from "node:crypto";
import { verifySolution as defaultVerifySolution } from "altcha-lib";

const USED_COLLECTION = "used_altcha_solutions";
const USED_SOLUTION_TTL_MS = 24 * 60 * 60 * 1000;

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function canonicalPayload(payload) {
  if (typeof payload === "string") {
    try {
      return JSON.stringify(stableValue(JSON.parse(payload)));
    } catch {
      return payload;
    }
  }
  return JSON.stringify(stableValue(payload));
}

function replayDocumentId(payload) {
  return crypto.createHash("sha256").update(canonicalPayload(payload)).digest("hex");
}

function createAltchaVerifier({ database, key = process.env.ALTCHA_SECRET, verifySolution = defaultVerifySolution, clock = Date.now } = {}) {
  async function verifyOnly(payload) {
    if (!payload || !key || typeof verifySolution !== "function") return false;
    try {
      return !!(await verifySolution(payload, key));
    } catch {
      return false;
    }
  }

  async function consumeVerified(payload) {
    if (!payload || !database?.collection) return false;
    try {
      const now = Number(clock());
      const ref = database.collection(USED_COLLECTION).doc(replayDocumentId(payload));
      return await database.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists && Number(snap.data()?.expiresAt || 0) > now) return false;
        tx.set(ref, { usedAt: now, expiresAt: now + USED_SOLUTION_TTL_MS });
        return true;
      });
    } catch {
      // Fail closed if persistence or the replay check fails.
      return false;
    }
  }

  async function verifyAndConsume(payload) {
    if (!(await verifyOnly(payload))) return false;
    return consumeVerified(payload);
  }

  verifyAndConsume.verifyOnly = verifyOnly;
  verifyAndConsume.consumeVerified = consumeVerified;
  return verifyAndConsume;
}

async function pruneExpiredAltchaSolutions(database, now = Date.now(), limit = 500) {
  if (!database?.collection) return 0;
  const snapshot = await database.collection(USED_COLLECTION)
    .where("expiresAt", "<=", Number(now))
    .limit(Math.max(1, Math.min(1000, Number(limit) || 500)))
    .get();
  if (snapshot.empty) return 0;
  const batch = database.batch();
  for (const doc of snapshot.docs) batch.delete(doc.ref);
  await batch.commit();
  return snapshot.size;
}

export { USED_COLLECTION, USED_SOLUTION_TTL_MS, canonicalPayload, replayDocumentId, createAltchaVerifier, pruneExpiredAltchaSolutions };
