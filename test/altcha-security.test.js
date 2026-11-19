import test from "node:test";
import assert from "node:assert/strict";
import { canonicalPayload, createAltchaVerifier } from "../services/altcha-security.js";

function fakeDatabase() {
  const documents = new Map();
  const refFor = (collection, id) => ({
    collection,
    id,
    async get() {
      const value = documents.get(`${collection}/${id}`);
      return { exists: !!value, data: () => value };
    },
  });
  return {
    documents,
    collection(name) {
      return { doc: (id) => refFor(name, id) };
    },
    async runTransaction(work) {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, value) => documents.set(`${ref.collection}/${ref.id}`, value),
      };
      return work(tx);
    },
  };
}

test("ALTCHA replay key is stable when object field order changes", () => {
  assert.equal(canonicalPayload({ signature: "s", challenge: "c" }), canonicalPayload({ challenge: "c", signature: "s" }));
});

test("a valid ALTCHA proof can be consumed once, then is rejected as a replay", async () => {
  const database = fakeDatabase();
  let now = 1_000;
  const verify = createAltchaVerifier({
    database,
    key: "test-secret",
    clock: () => now,
    verifySolution: async (payload, key) => payload?.signature === "valid" && key === "test-secret",
  });
  const proof = { challenge: "challenge-1", signature: "valid" };
  assert.equal(await verify.verifyOnly(proof), true);
  assert.equal(database.documents.size, 0);
  assert.equal(await verify.consumeVerified(proof), true);
  assert.equal(await verify({ signature: "valid", challenge: "challenge-1" }), false);
  assert.equal(database.documents.size, 1);
  now += 24 * 60 * 60 * 1000 + 1;
  assert.equal(await verify(proof), true);
});

test("ALTCHA verification and replay-store failures fail closed", async () => {
  const database = fakeDatabase();
  const invalid = createAltchaVerifier({ database, key: "k", verifySolution: async () => false });
  assert.equal(await invalid({ token: 1 }), false);
  const broken = createAltchaVerifier({ database: { collection: () => ({ doc: () => ({}) }), runTransaction: async () => { throw new Error("offline"); } }, key: "k", verifySolution: async () => true });
  assert.equal(await broken({ token: 2 }), false);
});
