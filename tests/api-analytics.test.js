import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { apiTypeForPath, createApiAnalyticsMiddleware } from "../services/api-analytics.js";
import { movieApiCors } from "../middleware/movie-api-cors.js";

test("classifies Movie API endpoint paths for existing analytics", () => {
  for (const path of [
    "/api/v1/movie/status",
    "/api/v1/movie/home",
    "/api/v1/movie/catalog/movies",
    "/api/v1/movie/search",
    "/api/v1/movie/streams/subject-id",
    "/api/v1/movie/play/subject-id",
    "/api/v1/movie/download-jobs/123/file",
  ]) assert.equal(apiTypeForPath(path), "movie", path);
});

test("keeps Movie API management and unrelated routes out of API request analytics", () => {
  assert.equal(apiTypeForPath("/api/movieapi/keys"), null);
  assert.equal(apiTypeForPath("/api/movieapi/bonus-redeem"), null);
  assert.equal(apiTypeForPath("/api/admin/api-analytics"), null);
  assert.equal(apiTypeForPath("/api/v1/dev/search"), "developer");
  assert.equal(apiTypeForPath("/api/v1/channels"), "livetv");
});

test("allows browser clients from any origin to use the per-user-key Movie API", () => {
  const headers = {};
  let nextCalled = false;
  const res = { setHeader: (key, value) => { headers[key] = value; }, status() { throw new Error("preflight must not be sent for a regular request"); } };
  movieApiCors({ path: "/api/v1/movie/search", method: "GET", headers: { origin: "https://third-party.example" } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.match(headers["Access-Control-Allow-Headers"], /x-api-key/);
  assert.match(headers["Access-Control-Allow-Headers"], /range/);
  assert.equal(headers["Cross-Origin-Resource-Policy"], "cross-origin");
});

test("short-circuits only Movie API preflight requests", () => {
  const headers = {};
  let statusCode = null;
  let ended = false;
  let nextCalled = false;
  const res = {
    setHeader: (key, value) => { headers[key] = value; },
    status: (code) => { statusCode = code; return { end: () => { ended = true; } }; },
  };
  movieApiCors({ path: "/api/v1/movie/download-jobs", method: "OPTIONS" }, res, () => { nextCalled = true; });
  assert.equal(statusCode, 204);
  assert.equal(ended, true);
  assert.equal(nextCalled, false);

  let unrelatedNext = false;
  const unrelated = { setHeader() { throw new Error("must not add CORS headers to unrelated routes"); } };
  movieApiCors({ path: "/api/admin/api-analytics", method: "OPTIONS" }, unrelated, () => { unrelatedNext = true; });
  assert.equal(unrelatedNext, true);
});

test("records quota consumption only when the Movie API key and quota check passed", async () => {
  const operations = [];
  const batchOperations = [];
  const db = {
    collection: (collection) => ({
      doc: (id) => ({ collection, id }),
    }),
    batch: () => ({
      create: (ref, value) => batchOperations.push({ op: "create", ref, value }),
      set: (ref, value) => batchOperations.push({ op: "set", ref, value }),
      commit: async () => { operations.push(...batchOperations); },
    }),
  };
  db.collection = (collection) => ({
    doc: (id) => ({
      collection,
      id,
      create: async (value) => { operations.push({ op: "create", ref: { collection, id }, value }); },
    }),
  });
  const middleware = createApiAnalyticsMiddleware(db, { now: () => 1762700000000, randomShard: () => 0, increment: (n) => n, onError: (err) => { throw err; } });
  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableFinished = true;
  middleware({ path: "/api/v1/movie/search", method: "GET", route: { path: "/api/v1/movie/search" }, movieApiQuotaConsumed: true }, res, () => {});
  res.emit("finish");
  await new Promise((resolve) => setImmediate(resolve));
  const event = operations.find((entry) => entry.ref?.collection === "apiRequestEvents")?.value;
  const rollup = operations.find((entry) => entry.ref?.collection === "apiAnalyticsDaily")?.value;
  assert.equal(event.api, "movie");
  assert.equal(event.quotaConsumed, true);
  assert.equal(rollup.quotaConsumed, 1);
  assert.equal(Object.hasOwn(event, "apiKey"), false);
});
