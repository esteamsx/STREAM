import test from "node:test";
import assert from "node:assert/strict";
import {
  THREE_DAYS_MS,
  createPremiumExpiryReminderService,
  formatExpiryDate,
  isReminderEligible,
  reminderExpiryRange,
} from "../services/premium-expiry-reminders.js";

function fakeDatabase(users) {
  const userDocs = new Map(Object.entries(users).map(([id, data]) => [id, { ...data }]));
  const reminders = new Map();
  const refFor = (collection, id) => ({
    collection,
    id,
    async get() {
      const value = collection === "users" ? userDocs.get(id) : reminders.get(id);
      return { exists: value !== undefined, data: () => value };
    },
    async set(value, options = {}) {
      const target = collection === "users" ? userDocs : reminders;
      target.set(id, options.merge ? { ...(target.get(id) || {}), ...value } : { ...value });
    },
  });
  return {
    userDocs,
    reminders,
    collection(name) {
      const filters = [];
      return {
        doc: (id) => refFor(name, id),
        where(field, op, value) { filters.push([field, op, value]); return this; },
        async get() {
          const docs = [...userDocs.entries()]
            .filter(([, data]) => filters.every(([field, op, value]) => op === ">=" ? data[field] >= value : op === "<" ? data[field] < value : true))
            .map(([id, data]) => ({ id, data: () => data }));
          return { docs, size: docs.length, empty: docs.length === 0 };
        },
      };
    },
    async runTransaction(work) {
      return work({
        get: (ref) => ref.get(),
        set: (ref, value, options) => ref.set(value, options),
      });
    },
  };
}

const baseNow = Date.UTC(2026, 0, 1, 12, 0, 0);

test("reminder interval uses the UTC instant 72 hours ahead", () => {
  assert.deepEqual(reminderExpiryRange(baseNow, 60_000), { start: baseNow + THREE_DAYS_MS - 60_000, end: baseNow + THREE_DAYS_MS });
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com" }, baseNow + THREE_DAYS_MS, baseNow), true);
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com" }, baseNow + THREE_DAYS_MS + 1, baseNow), false);
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com" }, baseNow + THREE_DAYS_MS - 60_000, baseNow), true);
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com" }, baseNow + THREE_DAYS_MS - 60_001, baseNow), false);
  assert.equal(isReminderEligible({ verified: false, email: "member@example.com" }, baseNow + THREE_DAYS_MS, baseNow), false);
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com", subscriptionStatus: "cancelled" }, baseNow + THREE_DAYS_MS, baseNow), false);
  assert.equal(isReminderEligible({ verified: true, email: "member@example.com" }, baseNow - 1, baseNow), false);
  assert.equal(isReminderEligible({ verified: true, email: "" }, baseNow + THREE_DAYS_MS, baseNow), false);
});

test("expiry date is rendered from the real UTC expiry timestamp", () => {
  assert.equal(formatExpiryDate(Date.UTC(2026, 4, 17, 23, 59)), "May 17, 2026");
});

test("sends one reminder for the active expiry cycle and never duplicates it on repeated sweeps", async () => {
  const expiry = baseNow + THREE_DAYS_MS - 30_000;
  const db = fakeDatabase({
    member1: { verified: true, verifiedExpiresAt: expiry, email: "member@example.com", emailVerified: true },
    member2: { verified: false, verifiedExpiresAt: expiry, email: "inactive@example.com" },
    member3: { verified: true, verifiedExpiresAt: expiry + 5 * 60_000, email: "not-yet@example.com" },
  });
  const sent = [];
  const service = createPremiumExpiryReminderService({
    database: db,
    sendReminder: async (payload) => sent.push(payload),
    renewUrl: "https://example.com/account?premium=1",
    clock: () => baseNow,
    sweepIntervalMs: 60_000,
    logger: { error() {} },
  });
  const first = await service.run();
  assert.equal(first.sent, 1);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].email, "member@example.com");
  assert.equal(sent[0].expiryAt, expiry);
  assert.equal(sent[0].renewUrl, "https://example.com/account?premium=1");
  const second = await service.run();
  assert.equal(second.sent, 0);
  assert.equal(sent.length, 1);
  assert.equal([...db.reminders.values()][0].status, "sent");
});
