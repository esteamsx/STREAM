import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { buildCodingPayload } from "../services/coarena-coding.js";
import { CODING_FILE_MAX_BYTES, CODING_FILE_TTL_MS, createCodingTemporaryFiles, extractGeneratedCodingFiles } from "../services/coding-temporary-files.js";

class FakeFirestore {
  constructor() { this.data = new Map(); }
  collection(name) {
    const data = this.data;
    const key = (id) => `${name}/${id}`;
    return {
      doc(id) {
        const idKey = key(id);
        return {
          id,
          async get() { return { exists: data.has(idKey), data: () => data.get(idKey) }; },
          async create(value) { if (data.has(idKey)) throw new Error("already exists"); data.set(idKey, structuredClone(value)); },
          async update(value) { if (!data.has(idKey)) throw new Error("not found"); Object.assign(data.get(idKey), structuredClone(value)); },
        };
      },
      where(field, op, value) {
        const query = { conditions: [[field, op, value]], max: Infinity };
        const chain = {
          where(nextField, nextOp, nextValue) { query.conditions.push([nextField, nextOp, nextValue]); return chain; },
          limit(amount) { query.max = amount; return chain; },
          async get() {
            const docs = [];
            for (const [idKey, value] of data) {
              if (!idKey.startsWith(`${name}/`)) continue;
              const matched = query.conditions.every(([field, operator, expected]) => {
                if (operator === "==") return value[field] === expected;
                if (operator === "<=") return Number(value[field]) <= Number(expected);
                return false;
              });
              if (!matched) continue;
              const id = idKey.slice(name.length + 1);
              docs.push({ id, ref: chain.doc(id), data: () => value });
              if (docs.length >= query.max) break;
            }
            return { docs };
          },
          doc: this.doc,
        };
        return chain;
      },
    };
  }
}

async function makeService(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "es-teams-coding-files-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const previousScanner = process.env.CODING_CLAMSCAN_BIN;
  process.env.CODING_CLAMSCAN_BIN = "/bin/true";
  t.after(() => { if (previousScanner == null) delete process.env.CODING_CLAMSCAN_BIN; else process.env.CODING_CLAMSCAN_BIN = previousScanner; });
  const db = new FakeFirestore();
  let currentTime = Date.UTC(2026, 0, 1);
  const service = createCodingTemporaryFiles({ db, root, now: () => currentTime, ...options });
  return { service, db, root, now: (value) => { currentTime = value; }, currentTime: () => currentTime };
}

async function upload(service, { uid = "user-a", name = "app.js", mime = "application/javascript", bytes = Buffer.from("export const answer = 42;\n") } = {}) {
  return service.storeStream(uid, { filename: name, mime, stream: Readable.from([bytes]), contentLength: bytes.length });
}

test("COD\\NG stores a full 30 MiB upload ephemerally and writes only the allowed Firestore metadata", async (t) => {
  const { service, db, root } = await makeService(t);
  const pattern = Buffer.from("export const x = 1;\n");
  const bytes = Buffer.alloc(CODING_FILE_MAX_BYTES);
  for (let offset = 0; offset < bytes.length; offset += pattern.length) pattern.copy(bytes, offset, 0, Math.min(pattern.length, bytes.length - offset));
  const file = await upload(service, { name: "large.txt", mime: "text/plain", bytes });
  assert.equal(file.size, 30 * 1024 * 1024);
  assert.equal(file.status, "available");
  assert.equal((await fs.stat(path.join(root, file.id))).size, CODING_FILE_MAX_BYTES);
  const record = db.data.get(`codingTemporaryFiles/${file.id}`);
  assert.deepEqual(Object.keys(record).sort(), ["createdAt", "expiresAt", "filename", "ownerId", "status"]);
  assert.equal(record.ownerId, "user-a");
  assert.equal(record.filename, "large.txt");
  assert.equal(record.expiresAt - record.createdAt, CODING_FILE_TTL_MS);
  assert.equal(JSON.stringify(record).includes("export const answer"), false);
});

test("COD\\NG file uploads feed AI processing and downloads only for their owner", async (t) => {
  const { service } = await makeService(t);
  const file = await upload(service);
  const stored = await service.readForProcessing("user-a", file.id);
  const payload = buildCodingPayload({ messages: [{ role: "user", content: "Review the attachment." }], attachments: [{ name: stored.filename, mime: file.mime, bytes: stored.bytes }] });
  assert.match(payload.messages[0].content[1].text, /export const answer = 42/);
  const download = await service.getDownload("user-a", file.id);
  assert.equal(await fs.readFile(download.path, "utf8"), "export const answer = 42;\n");
  await assert.rejects(service.readForProcessing("user-b", file.id), (error) => error.status === 404 && error.code === "file_not_found");
  await assert.rejects(service.getDownload("user-b", file.id), (error) => error.status === 404 && error.code === "file_not_found");
  assert.equal((await service.listForOwner("user-b")).length, 0);
  assert.equal((await service.listForOwner("user-a")).length, 1);
});

test("COD\\NG marks files EXPIRED at 24 hours and cleanup removes expired bytes", async (t) => {
  const { service, db, root, now, currentTime } = await makeService(t);
  const first = await upload(service, { name: "notes.txt", mime: "text/plain", bytes: Buffer.from("temporary notes") });
  now(currentTime() + CODING_FILE_TTL_MS);
  const files = await service.listForOwner("user-a");
  assert.equal(files[0].status, "expired");
  assert.equal(db.data.get(`codingTemporaryFiles/${first.id}`).status, "expired");
  await assert.rejects(service.getDownload("user-a", first.id), (error) => error.status === 410 && error.code === "file_expired");
  assert.equal((await fs.stat(path.join(root, first.id)).catch((error) => error.code)), "ENOENT");

  now(currentTime() - CODING_FILE_TTL_MS);
  const second = await upload(service, { name: "report.md", mime: "text/markdown", bytes: Buffer.from("short-lived") });
  now(currentTime() + CODING_FILE_TTL_MS);
  assert.equal(await service.cleanupExpired(), 2);
  assert.equal(db.data.get(`codingTemporaryFiles/${second.id}`).status, "expired");
  assert.equal((await fs.stat(path.join(root, second.id)).catch((error) => error.code)), "ENOENT");
});

test("COD\\NG startup and recurring cleanup schedule removes expired files", async (t) => {
  const { service, db, root, now, currentTime } = await makeService(t, { cleanupIntervalMs: 20 });
  const file = await upload(service, { name: "scheduled.txt", mime: "text/plain", bytes: Buffer.from("scheduled") });
  const timer = service.startCleanupSchedule();
  t.after(() => clearInterval(timer));
  await new Promise((resolve) => setTimeout(resolve, 5));
  now(currentTime() + CODING_FILE_TTL_MS);
  await new Promise((resolve) => setTimeout(resolve, 25));
  clearInterval(timer);
  assert.equal(db.data.get(`codingTemporaryFiles/${file.id}`).status, "expired");
  assert.equal((await fs.stat(path.join(root, file.id)).catch((error) => error.code)), "ENOENT");
});

test("COD\\NG treats files missing after Render restart or redeploy as unavailable", async (t) => {
  const { service, root, db } = await makeService(t);
  const file = await upload(service);
  await fs.unlink(path.join(root, file.id));
  const listed = await service.listForOwner("user-a");
  assert.equal(listed[0].status, "unavailable");
  assert.equal(db.data.get(`codingTemporaryFiles/${file.id}`).status, "unavailable");
  await assert.rejects(service.getDownload("user-a", file.id), (error) => error.status === 410 && error.code === "file_unavailable");
});

test("COD\\NG rejects oversized and invalid uploads and extracts only safe named generated files", async (t) => {
  const { service } = await makeService(t);
  await assert.rejects(service.storeStream("user-a", { filename: "too-large.txt", mime: "text/plain", stream: Readable.from([]), contentLength: CODING_FILE_MAX_BYTES + 1 }), (error) => error.status === 413 && error.code === "file_too_large");
  await assert.rejects(upload(service, { name: "payload.exe", mime: "application/octet-stream", bytes: Buffer.from("MZ") }), (error) => error.status === 415);
  const generated = extractGeneratedCodingFiles("Saved file:\n```js filename=src/app.js\nexport const ok = true;\n```\n```text filename=../unsafe.txt\nno\n```\n```js filename=run.exe\nno\n```");
  assert.equal(generated.length, 1);
  assert.equal(generated[0].filename, "src/app.js");
  assert.equal(generated[0].bytes.toString("utf8"), "export const ok = true;");
  const saved = await service.saveBytes("user-a", generated[0].filename, generated[0].bytes);
  assert.equal(saved.status, "available");
  assert.equal((await service.getDownload("user-a", saved.id)).filename, "src/app.js");
});
