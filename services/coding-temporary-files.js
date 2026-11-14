import crypto from "node:crypto";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { validateCodingAttachment } from "./coarena-coding.js";

export const CODING_FILE_TTL_MS = 24 * 60 * 60 * 1000;
export const CODING_FILE_MAX_BYTES = 30 * 1024 * 1024;
export const CODING_FILE_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const COLLECTION = "codingTemporaryFiles";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STALE_PART_AGE_MS = 60 * 60 * 1000;
const GENERATED_EXT_RE = /\.(?:txt|md|rst|js|mjs|cjs|jsx|ts|tsx|json|css|scss|sass|less|html|htm|xml|svg|py|java|kt|go|rs|php|sql|yml|yaml|toml|sh|bash|c|h|cc|cpp|hpp|cs|swift|rb|lua|dart|ex|exs|clj|scala|groovy|gradle|tf|hcl|proto|graphql|gql|prisma|properties)$/i;

function fileError(message, code, status = 400) {
  return Object.assign(new Error(message), { code, status });
}
function validUid(uid) {
  const value = String(uid || "").trim();
  if (!value || value.length > 180) throw fileError("Your signed-in account could not be verified.", "file_owner_required", 401);
  return value;
}
function uploadFilename(value) {
  const filename = String(value || "").normalize("NFC").trim();
  if (!filename || filename.length > 180 || /[\0-\x1f\x7f/\\]/.test(filename) || filename.includes("..")) {
    throw fileError("The uploaded filename is invalid.", "unsafe_filename", 400);
  }
  return filename;
}
function generatedFilename(value) {
  const filename = String(value || "").normalize("NFC").trim().replace(/\\/g, "/");
  const segments = filename.split("/");
  if (!filename || filename.length > 180 || filename.startsWith("/") || /[\0-\x1f\x7f<>:"|?*]/.test(filename) || segments.some((part) => !part || part === "." || part === "..") || !GENERATED_EXT_RE.test(filename)) {
    throw fileError("The generated filename is not supported for temporary download.", "unsafe_generated_filename", 415);
  }
  return filename;
}
function publicMetadata(id, data) {
  return { id, filename: data.filename, ownerId: data.ownerId, createdAt: data.createdAt, expiresAt: data.expiresAt, status: data.status };
}
function isExpired(data, now) {
  return data.status === "expired" || Number(data.expiresAt) <= now;
}

export function extractGeneratedCodingFiles(text, { maxFiles = 6, maxTotalBytes = CODING_FILE_MAX_BYTES } = {}) {
  const result = [];
  const names = new Set();
  let totalBytes = 0;
  const pattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match;
  while (result.length < maxFiles && (match = pattern.exec(String(text || "")))) {
    const info = match[1] || "";
    const nameMatch = /(?:^|\s)filename=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i.exec(info);
    if (!nameMatch) continue;
    let filename;
    try { filename = generatedFilename(nameMatch[1] || nameMatch[2] || nameMatch[3]); } catch { continue; }
    if (names.has(filename)) continue;
    const content = match[2].replace(/\n$/, "");
    const bytes = Buffer.from(content, "utf8");
    if (!bytes.length || totalBytes + bytes.length > maxTotalBytes) continue;
    names.add(filename);
    totalBytes += bytes.length;
    result.push({ filename, bytes });
  }
  return result;
}

export function createCodingTemporaryFiles({ db, root = path.join(os.tmpdir(), "es-teams-coding-files"), now = () => Date.now(), maxBytes = CODING_FILE_MAX_BYTES, cleanupIntervalMs = CODING_FILE_CLEANUP_INTERVAL_MS } = {}) {
  if (!db || typeof db.collection !== "function") throw new TypeError("A Firestore database is required for coding temporary-file metadata.");
  const absoluteRoot = path.resolve(root);
  const records = db.collection(COLLECTION);
  let uploadsInFlight = 0;

  function diskPath(id) {
    if (!ID_RE.test(String(id || ""))) throw fileError("Temporary file not found.", "file_not_found", 404);
    return path.join(absoluteRoot, id);
  }
  async function ensureStorageRoot() {
    await fs.mkdir(absoluteRoot, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(absoluteRoot);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw fileError("Temporary file storage is unavailable.", "temporary_storage_invalid", 503);
    await fs.chmod(absoluteRoot, 0o700);
  }
  async function removeDiskFile(id) {
    try { await fs.unlink(diskPath(id)); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  async function setStatus(ref, data, status) {
    if (data.status !== status) await ref.update({ status });
    return { ...data, status };
  }
  async function requireOwnedAvailable(uid, id) {
    const ownerId = validUid(uid);
    const fileId = String(id || "");
    if (!ID_RE.test(fileId)) throw fileError("Temporary file not found.", "file_not_found", 404);
    const ref = records.doc(fileId);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw fileError("Temporary file not found.", "file_not_found", 404);
    let data = snapshot.data();
    if (data.ownerId !== ownerId) throw fileError("Temporary file not found.", "file_not_found", 404);
    if (isExpired(data, now())) {
      await removeDiskFile(ref.id);
      data = await setStatus(ref, data, "expired");
      throw fileError("This file has expired and is no longer downloadable.", "file_expired", 410);
    }
    if (data.status !== "available") throw fileError("This temporary file is unavailable.", "file_unavailable", 410);
    const target = diskPath(ref.id);
    let fileStat;
    try {
      fileStat = await fs.stat(target);
      if (!fileStat.isFile()) throw Object.assign(new Error("not a file"), { code: "ENOENT" });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await setStatus(ref, data, "unavailable");
      throw fileError("This file is unavailable because the temporary Render filesystem was cleared after a restart or redeploy.", "file_unavailable", 410);
    }
    return { id: ref.id, ref, data, path: target, size: fileStat.size };
  }
  async function saveBytes(uid, filename, bytes, { validate = false, mime = "text/plain" } = {}) {
    const ownerId = validUid(uid);
    const safeName = generatedFilename(filename);
    if (!Buffer.isBuffer(bytes) || !bytes.length) throw fileError("The file is empty.", "empty_file", 400);
    if (bytes.length > maxBytes) throw fileError("Files must be 30 MB or smaller.", "file_too_large", 413);
    const id = crypto.randomUUID();
    const target = diskPath(id);
    await ensureStorageRoot();
    if (validate) validateCodingAttachment({ name: safeName, mime, bytes });
    await fs.writeFile(target, bytes, { flag: "wx", mode: 0o600 });
    const createdAt = now();
    const metadata = { filename: safeName, ownerId, createdAt, expiresAt: createdAt + CODING_FILE_TTL_MS, status: "available" };
    try {
      await records.doc(id).create(metadata);
    } catch (error) {
      await fs.unlink(target).catch(() => {});
      throw error;
    }
    return { ...publicMetadata(id, metadata), mime, size: bytes.length };
  }

  async function storeStream(uid, { filename, mime = "application/octet-stream", stream, contentLength }) {
    validUid(uid);
    let name;
    try { name = uploadFilename(filename); }
    catch (error) { stream?.resume?.(); throw error; }
    if (uploadsInFlight >= 2) { stream.resume?.(); throw fileError("Another upload is already being processed. Try again in a moment.", "upload_busy", 429); }
    if (Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) { stream.resume?.(); throw fileError("Files must be 30 MB or smaller.", "file_too_large", 413); }
    if (!stream || typeof stream.pipe !== "function") throw fileError("The upload body is missing.", "empty_file", 400);
    uploadsInFlight += 1;
    const id = crypto.randomUUID();
    const partial = path.join(absoluteRoot, `${id}.part`);
    try {
      await ensureStorageRoot();
      let size = 0;
      const limiter = new Transform({ transform(chunk, _encoding, callback) {
        size += chunk.length;
        if (size > maxBytes) return callback(fileError("Files must be 30 MB or smaller.", "file_too_large", 413));
        callback(null, chunk);
      } });
      await pipeline(stream, limiter, createWriteStream(partial, { flags: "wx", mode: 0o600 }));
      if (!size) throw fileError("The file is empty.", "empty_file", 400);
      if (Number.isFinite(Number(contentLength)) && Number(contentLength) !== size) throw fileError("The upload size did not match its content.", "invalid_upload_length", 400);
      const bytes = await fs.readFile(partial);
      validateCodingAttachment({ name, mime: String(mime || "application/octet-stream").toLowerCase(), bytes });
      const target = diskPath(id);
      await fs.rename(partial, target);
      const createdAt = now();
      const metadata = { filename: name, ownerId: validUid(uid), createdAt, expiresAt: createdAt + CODING_FILE_TTL_MS, status: "available" };
      try { await records.doc(id).create(metadata); }
      catch (error) { await fs.unlink(target).catch(() => {}); throw error; }
      return { ...publicMetadata(id, metadata), mime: String(mime || "application/octet-stream").toLowerCase(), size };
    } catch (error) {
      await fs.unlink(partial).catch(() => {});
      throw error;
    } finally {
      uploadsInFlight -= 1;
    }
  }

  async function readForProcessing(uid, id, { maxBytes: processingLimit = CODING_FILE_MAX_BYTES } = {}) {
    const file = await requireOwnedAvailable(uid, id);
    if (file.size > processingLimit) throw fileError("Attachments are too large together. Keep the total under 30 MB.", "attachments_too_large", 413);
    const bytes = await fs.readFile(file.path);
    return { ...publicMetadata(file.id, file.data), bytes };
  }
  async function getDownload(uid, id) {
    const file = await requireOwnedAvailable(uid, id);
    return { ...publicMetadata(file.id, file.data), path: file.path };
  }
  async function listForOwner(uid) {
    const ownerId = validUid(uid);
    const snapshot = await records.where("ownerId", "==", ownerId).limit(500).get();
    const result = [];
    for (const doc of snapshot.docs) {
      let data = doc.data();
      if (isExpired(data, now())) {
        await removeDiskFile(doc.id);
        data = await setStatus(doc.ref, data, "expired");
      } else if (data.status === "available") {
        try {
          const stat = await fs.stat(diskPath(doc.id));
          if (!stat.isFile()) throw Object.assign(new Error("not a file"), { code: "ENOENT" });
        } catch (error) {
          if (error?.code !== "ENOENT") throw error;
          data = await setStatus(doc.ref, data, "unavailable");
        }
      }
      result.push(publicMetadata(doc.id, data));
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }
  async function cleanupExpired({ limit = 250 } = {}) {
    const snapshot = await records.where("expiresAt", "<=", now()).limit(Math.max(1, Math.min(500, limit))).get();
    let removed = 0;
    for (const doc of snapshot.docs) {
      await removeDiskFile(doc.id);
      if (doc.data().status !== "expired") await doc.ref.update({ status: "expired" });
      removed += 1;
    }
    const rootStat = await fs.lstat(absoluteRoot).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
    if (!rootStat) return removed;
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw fileError("Temporary file storage is unavailable.", "temporary_storage_invalid", 503);
    const entries = await fs.readdir(absoluteRoot, { withFileTypes: true });
    for (const entry of entries) {
      const isPartial = entry.isFile() && /^[0-9a-f-]{36}\.part$/i.test(entry.name);
      const isBlob = entry.isFile() && ID_RE.test(entry.name);
      if (!isPartial && !isBlob) continue;
      const candidate = path.join(absoluteRoot, entry.name);
      const stat = await fs.lstat(candidate).catch((error) => error?.code === "ENOENT" ? null : Promise.reject(error));
      if (!stat || stat.isSymbolicLink() || !stat.isFile() || now() - stat.mtimeMs < STALE_PART_AGE_MS) continue;
      if (isBlob) {
        const metadata = await records.doc(entry.name).get();
        if (metadata.exists) continue;
      }
      await fs.unlink(candidate);
      removed += 1;
    }
    return removed;
  }
  function startCleanupSchedule() {
    void cleanupExpired().catch((error) => console.error("[COD\\NG] initial temporary-file cleanup failed", error?.code || error?.message));
    const timer = setInterval(() => {
      void cleanupExpired().catch((error) => console.error("[COD\\NG] scheduled temporary-file cleanup failed", error?.code || error?.message));
    }, cleanupIntervalMs);
    timer.unref?.();
    return timer;
  }

  return { storeStream, saveBytes, readForProcessing, getDownload, listForOwner, cleanupExpired, startCleanupSchedule, root: absoluteRoot };
}
