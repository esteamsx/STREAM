import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { blockedApiOriginGuard } from "../middleware/blocked-api-origin.js";

function invoke(path, headers = {}) {
  let nextCalled = false;
  let status = 200;
  let payload = null;
  const responseHeaders = {};
  const req = {
    path,
    method: "GET",
    get(name) { return headers[name.toLowerCase()]; },
  };
  const res = {
    setHeader(name, value) { responseHeaders[name] = value; },
    status(code) { status = code; return this; },
    json(value) { payload = value; return this; },
  };
  blockedApiOriginGuard(req, res, () => { nextCalled = true; });
  return { nextCalled, status, payload, headers: responseHeaders };
}

test("blocks target-site API requests identified by Origin, including preflight requests", () => {
  const result = invoke("/api/wa/react", { origin: "https://wa.dclabs.my.id" });
  assert.equal(result.nextCalled, false);
  assert.equal(result.status, 403);
  assert.deepEqual(result.payload, { error: "Access denied." });
  assert.equal(result.headers["Cache-Control"], "no-store");
});

test("blocks API and embed requests identified by target-site Referer", () => {
  assert.equal(invoke("/api/v1/live-tv", { referer: "https://wa.dclabs.my.id/tools" }).status, 403);
  assert.equal(invoke("/embed/player", { referer: "https://wa.dclabs.my.id/page" }).status, 403);
});

test("does not block unrelated origins, hostname lookalikes, normal website pages, or headerless calls", () => {
  assert.equal(invoke("/api/wa/react", { origin: "https://dclabs.my.id" }).nextCalled, true);
  assert.equal(invoke("/api/wa/react", { origin: "https://wa.dclabs.my.id.evil.example" }).nextCalled, true);
  assert.equal(invoke("/api/wa/react").nextCalled, true);
  assert.equal(invoke("/channel-react", { referer: "https://wa.dclabs.my.id/" }).nextCalled, true);
});

test("the guard is installed before API analytics and API routes", () => {
  const server = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /app\.use\(requestId\);\s*app\.use\(blockedApiOriginGuard\);\s*app\.use\(createApiAnalyticsMiddleware/);
});
