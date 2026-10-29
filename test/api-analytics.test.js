import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createApiAnalyticsMiddleware, getApiActivityPage, getApiAnalytics } from "../services/api-analytics.js";

class FakeSnapshot {
  constructor(id, value) {
    this.id = id;
    this.value = value;
    this.exists = value !== undefined;
    this.docs = undefined;
    this.size = undefined;
  }
  data() { return this.value; }
}

class FakeDocument {
  constructor(db, collection, id) { this.db = db; this.collection = collection; this.id = id; }
  async get() { return new FakeSnapshot(this.id, this.db.tables.get(this.collection)?.get(this.id)); }
}

function fieldValue(record, field) {
  return field.split(".").reduce((value, key) => value && value[key], record);
}

class FakeQuery {
  constructor(db, collection, filters = [], ordering = null, count = null, cursorId = null) {
    this.db = db;
    this.collection = collection;
    this.filters = filters;
    this.ordering = ordering;
    this.count = count;
    this.cursorId = cursorId;
  }
  where(field, operator, value) { return new FakeQuery(this.db, this.collection, [...this.filters, [field, operator, value]], this.ordering, this.count, this.cursorId); }
  orderBy(field, direction = "asc") { return new FakeQuery(this.db, this.collection, this.filters, [field, direction], this.count, this.cursorId); }
  limit(count) { return new FakeQuery(this.db, this.collection, this.filters, this.ordering, count, this.cursorId); }
  startAfter(snapshot) { return new FakeQuery(this.db, this.collection, this.filters, this.ordering, this.count, snapshot.id); }
  async get() {
    let entries;
    if (this.collection === "coinLedger") entries = this.db.ledger;
    else entries = [...(this.db.tables.get(this.collection) || new Map()).entries()].map(([id, value]) => ({ id, value }));
    let docs = entries.filter(({ value }) => this.filters.every(([field, operator, wanted]) => {
      const actual = fieldValue(value, field);
      if (operator === "==") return actual === wanted;
      if (operator === ">=") return actual >= wanted;
      if (operator === "<=") return actual <= wanted;
      return false;
    }));
    if (this.ordering) {
      const [field, direction] = this.ordering;
      docs.sort((a, b) => {
        const delta = (fieldValue(a.value, field) || 0) - (fieldValue(b.value, field) || 0);
        return (direction === "desc" ? -delta : delta) || a.id.localeCompare(b.id);
      });
    }
    if (this.cursorId) {
      const index = docs.findIndex((doc) => doc.id === this.cursorId);
      if (index >= 0) docs = docs.slice(index + 1);
    }
    if (this.count != null) docs = docs.slice(0, this.count);
    return { docs: docs.map(({ id, value }) => new FakeSnapshot(id, value)), empty: docs.length === 0, size: docs.length };
  }
}

class FakeDb {
  constructor() {
    this.tables = new Map();
    this.ledger = [];
  }
  collection(name) {
    return {
      doc: (id) => new FakeDocument(this, name, id),
      where: (field, operator, value) => new FakeQuery(this, name).where(field, operator, value),
    };
  }
  collectionGroup(name) { return new FakeQuery(this, name); }
  async runTransaction(callback) {
    const pending = [];
    const tx = {
      get: async (ref) => ref.get(),
      create: (ref, value) => pending.push([ref, value]),
      set: (ref, value) => pending.push([ref, value]),
    };
    await callback(tx);
    for (const [ref, value] of pending) {
      if (!this.tables.has(ref.collection)) this.tables.set(ref.collection, new Map());
      const table = this.tables.get(ref.collection);
      if (ref.collection !== "apiRequestEvents" || !table.has(ref.id)) table.set(ref.id, { ...(table.get(ref.id) || {}), ...value });
    }
  }
  seed(collection, id, value) {
    if (!this.tables.has(collection)) this.tables.set(collection, new Map());
    this.tables.get(collection).set(id, value);
  }
}

function emitRequest(middleware, { path, route, status = 200, method = "GET", queryKey = "" }) {
  const req = { path, originalUrl: path + queryKey, method, route: route ? { path: route } : undefined };
  const res = new EventEmitter();
  res.statusCode = status;
  let nextCalls = 0;
  middleware(req, res, () => { nextCalls += 1; });
  res.emit("finish");
  res.emit("finish");
  return { req, res, nextCalls };
}

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);
const flushWrites = () => new Promise((resolve) => setTimeout(resolve, 0));

test("tracks Developer and Live TV API requests once, including errors, without query secrets", async () => {
  const db = new FakeDb();
  const middleware = createApiAnalyticsMiddleware(db, { now: () => NOW, randomShard: () => 2, onError: (err) => { throw err; } });
  const dev = emitRequest(middleware, {
    path: "/api/v1/dev/dl/secret-token-value",
    route: "/api/v1/dev/dl/:token",
    status: 401,
    queryKey: "?key=super-secret-api-key",
  });
  assert.equal(dev.nextCalls, 1);
  const live = emitRequest(middleware, { path: "/api/v1/stream/sports-one", route: "/api/v1/stream/:channel", status: 200 });
  const publicList = emitRequest(middleware, { path: "/api/v1/channels", route: "/api/v1/channels", status: 200 });
  const ignored = emitRequest(middleware, { path: "/api/v1/hls/sports-one/master.m3u8", route: "/api/v1/hls/:channel/master.m3u8", status: 200 });
  assert.equal(ignored.req.__apiAnalyticsTracked, undefined);
  await flushWrites();

  const events = [...db.tables.get("apiRequestEvents").values()];
  assert.equal(events.length, 3);
  assert.equal(events.filter((event) => event.api === "developer").length, 1);
  assert.equal(events.filter((event) => event.api === "livetv").length, 2);
  assert.equal(events.find((event) => event.api === "developer").failed, true);
  assert.equal(events.find((event) => event.endpoint.includes("dl/")).endpoint, "/api/v1/dev/dl/:token");
  assert.equal(JSON.stringify(events).includes("super-secret"), false);
  assert.equal(JSON.stringify(events).includes("secret-token-value"), false);
  assert.equal(db.tables.get("apiAnalyticsDaily").size, 2);
  assert.equal(db.tables.get("apiRequestErrors").size, 1);
});

test("aggregates requests and signed coin-ledger request-pack charges/refunds by API and period", async () => {
  const db = new FakeDb();
  const middleware = createApiAnalyticsMiddleware(db, { now: () => NOW, randomShard: () => 0, onError: (err) => { throw err; } });
  emitRequest(middleware, { path: "/api/v1/dev/quote", route: "/api/v1/dev/quote", status: 200 });
  emitRequest(middleware, { path: "/api/v1/stream/channel-a", route: "/api/v1/stream/:channel", status: 503 });
  await flushWrites();
  const today = new Date(NOW);
  const earlierThisMonth = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 2, 12);
  db.ledger = [
    { id: "dev-spend", value: { type: "store_redeem", timestamp: NOW - 1000, delta: -60, meta: { product: "devapi" } } },
    { id: "tv-spend", value: { type: "store_redeem", timestamp: NOW - 2000, delta: -120, meta: { product: "livetv" } } },
    { id: "tv-refund", value: { type: "store_refund", timestamp: NOW - 3000, delta: 30, meta: { product: "livetv" } } },
    { id: "dev-admin-income", value: { type: "channel_react_income", timestamp: NOW - 1500, delta: 60, meta: { source: "api_request_limit", product: "devapi" } } },
    { id: "old-dev-spend", value: { type: "store_redeem", timestamp: earlierThisMonth, delta: -240, meta: { product: "devapi" } } },
    { id: "unrelated", value: { type: "store_redeem", timestamp: NOW - 4000, delta: -330, meta: { itemKey: "verify3d" } } },
  ];

  const analytics = await getApiAnalytics(db, { range: "7d", now: NOW });
  assert.equal(analytics.totals.requests, 2);
  assert.equal(analytics.totals.successful, 1);
  assert.equal(analytics.totals.failed, 1);
  assert.equal(analytics.totals.errorRate, 50);
  assert.equal(analytics.apis.developer.coinsSpent, 60);
  assert.equal(analytics.apis.developer.coinsEarned, 60);
  assert.equal(analytics.apis.livetv.coinsSpent, 120);
  assert.equal(analytics.apis.livetv.coinsRefunded, 30);
  assert.equal(analytics.apis.livetv.netCoinsSpent, 90);
  assert.equal(analytics.periods.today.requests, 2);
  assert.equal(analytics.topEndpoints.developer[0].endpoint, "/api/v1/dev/quote");
  assert.equal(analytics.recentErrors.length, 1);
  assert.equal(analytics.historicalRequestDataAvailable, false);
  assert.equal(analytics.coinAccounting.directPerRequestCoinCharges, 0);
});

test("recent activity uses bounded pages and opaque event cursors", async () => {
  const db = new FakeDb();
  const at = NOW;
  db.seed("apiRequestEvents", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { at, api: "developer", method: "GET", endpoint: "/api/v1/dev/quote", status: 200 });
  db.seed("apiRequestEvents", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", { at: at - 1, api: "livetv", method: "GET", endpoint: "/api/v1/stream/:channel", status: 401, failed: true });
  const first = await getApiActivityPage(db, { range: "30d", now: NOW, pageSize: 1 });
  assert.equal(first.events.length, 1);
  assert.equal(first.nextCursor, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  const second = await getApiActivityPage(db, { range: "30d", now: NOW, pageSize: 1, cursor: first.nextCursor });
  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].id, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
});

test("captures a disconnected API request once without duplicating the finish event", async () => {
  const db = new FakeDb();
  const middleware = createApiAnalyticsMiddleware(db, { now: () => NOW, randomShard: () => 1, onError: (err) => { throw err; } });
  const req = { path: "/api/v1/dev/quote", method: "GET", route: { path: "/api/v1/dev/quote" } };
  const res = new EventEmitter();
  res.statusCode = 200;
  middleware(req, res, () => {});
  res.emit("close");
  res.emit("finish");
  await flushWrites();
  const events = [...db.tables.get("apiRequestEvents").values()];
  assert.equal(events.length, 1);
  assert.equal(events[0].status, 499);
  assert.equal(events[0].failed, true);
});
