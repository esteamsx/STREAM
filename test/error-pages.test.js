import test from "node:test";
import assert from "node:assert/strict";
import { notFoundHandler } from "../middleware/error-pages.js";

function responseStub() {
  return {
    headers: {},
    statusCode: 200,
    contentType: "",
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    type(value) { this.contentType = value; return this; },
    send(body) { this.body = body; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("HTML 404 uses the existing brand icon, glass styling, motion, and home link", () => {
  const res = responseStub();
  notFoundHandler({ path: "/this-page-is-missing" }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.contentType, "html");
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.match(res.body, /\/icon-32\.png/);
  assert.match(res.body, /class="nf-card"/);
  assert.match(res.body, /backdrop-filter:blur\(26px\)/);
  assert.match(res.body, /prefers-reduced-motion:reduce/);
  assert.match(res.body, /class="nf-home" href="\/"/);
  assert.match(res.body, /<path d="M14 3h7v7"\/>/);
});

test("API 404 remains a JSON response", () => {
  const res = responseStub();
  notFoundHandler({ path: "/api/missing" }, res);
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, { error: "Not found." });
});
