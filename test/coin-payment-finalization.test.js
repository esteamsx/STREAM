import test from "node:test";
import assert from "node:assert/strict";
import { finalizeCoinCreditPayment } from "../services/coin-payment-finalization.js";

class FakeFirestore {
  constructor() {
    this.documents = new Map();
    this.lock = Promise.resolve();
  }

  collection(name) {
    return new FakeCollection(this, [name]);
  }

  async runTransaction(callback) {
    let release;
    const previous = this.lock;
    this.lock = new Promise((resolve) => { release = resolve; });
    await previous;
    const writes = [];
    const tx = {
      get: async (ref) => ref instanceof FakeQuery ? ref.read(this.documents) : readDocument(this.documents, ref),
      set: (ref, value, options = {}) => writes.push({ kind: "set", ref, value: structuredClone(value), merge: !!options.merge }),
      update: (ref, value) => writes.push({ kind: "update", ref, value: structuredClone(value) }),
    };
    try {
      const result = await callback(tx);
      for (const write of writes) {
        const prior = this.documents.get(write.ref.path);
        if (write.kind === "update" && prior === undefined) throw new Error("document does not exist");
        this.documents.set(write.ref.path, applyValue(prior || {}, write.value, write.merge || write.kind === "update"));
      }
      return result;
    } finally {
      release();
    }
  }
}

class FakeCollection {
  constructor(db, parts) { this.db = db; this.parts = parts; }
  doc(id) { return new FakeDocument(this.db, [...this.parts, String(id)].join("/")); }
  where(field, operator, value) { return new FakeQuery(this.db, this.parts, field, operator, value); }
}

class FakeDocument {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new FakeCollection(this.db, [...this.path.split("/"), name]); }
}

class FakeQuery {
  constructor(db, parts, field, operator, value) {
    this.db = db;
    this.parts = parts;
    this.field = field;
    this.operator = operator;
    this.value = value;
    this.max = Infinity;
  }
  limit(max) { this.max = max; return this; }
  async read(documents) {
    const prefix = this.parts.join("/") + "/";
    const docs = [...documents.entries()]
      .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
      .filter(([, data]) => {
        const actual = this.field.split(".").reduce((value, key) => value == null ? undefined : value[key], data);
        return this.operator === "==" && actual === this.value;
      })
      .slice(0, this.max)
      .map(([path, data]) => ({ id: path.split("/").at(-1), data: () => structuredClone(data) }));
    return { empty: docs.length === 0, docs };
  }
}

function readDocument(documents, ref) {
  const value = documents.get(ref.path);
  return { exists: value !== undefined, data: () => value === undefined ? undefined : structuredClone(value) };
}

function applyValue(prior, value, merge) {
  const next = merge ? structuredClone(prior) : {};
  for (const [key, item] of Object.entries(value)) {
    if (item && typeof item === "object" && item.__increment === true) next[key] = (Number(next[key]) || 0) + item.amount;
    else if (item && typeof item === "object" && !Array.isArray(item)) next[key] = merge ? { ...(next[key] || {}), ...structuredClone(item) } : structuredClone(item);
    else next[key] = item;
  }
  return next;
}

function service(db) {
  return (reference, paystackData, extra = {}) => finalizeCoinCreditPayment({
    db,
    reference,
    paystackData,
    paymentCollection: extra.paymentCollection || "coinPurchasePayments",
    ledgerType: extra.ledgerType || "coin_purchase",
    getCoins: (record) => record.coins,
    getLedgerMeta: (_record, paymentReference) => ({ reference: paymentReference }),
    increment: (amount) => ({ __increment: true, amount }),
    appendCoinLedger(tx, userRef, priorData, delta, type, meta) {
      const seq = (priorData.coinLedgerSeq || 0) + 1;
      tx.set(userRef.collection("coinLedger").doc(String(seq)), { seq, type, delta, meta });
      return { coinLedgerSeq: seq, coinLedgerTipBalance: (priorData.coinBalance || 0) + delta };
    },
    ...extra,
  });
}

const successfulPayment = { status: "success", currency: "NGN", amount: 250000 };

function seedPayment(db, reference, fields = {}) {
  db.documents.set(`coinPurchasePayments/${reference}`, {
    uid: "user-1", coins: 50, amountKobo: 250000, status: "pending", ...fields,
  });
  db.documents.set("users/user-1", { coinBalance: 0 });
}

test("concurrent confirmations grant coins once and atomically mark payment successful", async () => {
  const db = new FakeFirestore();
  seedPayment(db, "payment-a");
  const finalize = service(db);
  const results = await Promise.all([
    finalize("payment-a", successfulPayment),
    finalize("payment-a", successfulPayment),
  ]);

  assert.equal(db.documents.get("users/user-1").coinBalance, 50);
  assert.equal(db.documents.get("users/user-1").coinLedgerSeq, 1);
  assert.equal(db.documents.get("coinPurchasePayments/payment-a").status, "success");
  assert.equal(results.filter((result) => !result.alreadyProcessed).length, 1);
  assert.equal(results.filter((result) => result.alreadyProcessed).length, 1);
});

test("stale legacy claim with an existing coin ledger entry recovers without a second grant", async () => {
  const db = new FakeFirestore();
  seedPayment(db, "payment-legacy", { status: "claimed", claimedAt: 1 });
  db.documents.set("users/user-1", { coinBalance: 50, coinLedgerSeq: 1, coinLedgerTipBalance: 50 });
  db.documents.set("users/user-1/coinLedger/1", {
    seq: 1, type: "coin_purchase", delta: 50, meta: { reference: "payment-legacy" },
  });

  const result = await service(db)("payment-legacy", successfulPayment);
  assert.equal(result.alreadyProcessed, true);
  assert.equal(result.recovered, true);
  assert.equal(db.documents.get("users/user-1").coinBalance, 50);
  assert.equal(db.documents.get("users/user-1").coinLedgerSeq, 1);
  assert.equal(db.documents.get("coinPurchasePayments/payment-legacy").status, "success");
});

test("coin-request completion marks the request link in the same transaction as the grant", async () => {
  const db = new FakeFirestore();
  db.documents.set("coinRequestPayments/request-payment", {
    uid: "user-1", token: "request-token", coins: 20, amountKobo: 125000, status: "pending",
  });
  db.documents.set("users/user-1", { coinBalance: 0 });
  db.documents.set("coinRequestLinks/request-token", { paid: false });

  const result = await service(db)("request-payment", { ...successfulPayment, amount: 125000 }, {
    paymentCollection: "coinRequestPayments",
    ledgerType: "coin_request_payment",
    linkedCollection: "coinRequestLinks",
    getLinkedId: (record) => record.token,
  });

  assert.equal(result.coins, 20);
  assert.equal(db.documents.get("users/user-1").coinBalance, 20);
  assert.equal(db.documents.get("coinRequestLinks/request-token").paid, true);
  assert.equal(db.documents.get("coinRequestLinks/request-token").paidReference, "request-payment");
  assert.equal(db.documents.get("coinRequestPayments/request-payment").status, "success");
});

test("underpaid or unsuccessful provider transactions do not mint coins", async () => {
  const db = new FakeFirestore();
  seedPayment(db, "payment-short");
  await assert.rejects(service(db)("payment-short", { status: "success", currency: "NGN", amount: 10 }), /Payment was not successful/);
  assert.equal(db.documents.get("users/user-1").coinBalance, 0);
  assert.equal(db.documents.get("coinPurchasePayments/payment-short").status, "failed");
});

test("malformed provider or expected amounts do not mint coins", async () => {
  const db = new FakeFirestore();
  seedPayment(db, "payment-malformed-provider");
  await assert.rejects(
    service(db)("payment-malformed-provider", { ...successfulPayment, amount: Number.NaN }),
    /Payment was not successful/,
  );
  seedPayment(db, "payment-malformed-record", { amountKobo: Number.NaN });
  await assert.rejects(service(db)("payment-malformed-record", successfulPayment), /Payment was not successful/);
  assert.equal(db.documents.get("users/user-1").coinBalance, 0);
});
