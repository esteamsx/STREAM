import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";

const DEFAULT_BASE_URL = "https://coarena.ai/api";
const DEFAULT_MODEL = "claude-fable-5-2";
const MAX_MESSAGES = 80;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 30 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 200;
const MAX_ZIP_EXPANDED_BYTES = 24 * 1024 * 1024;
const MAX_ZIP_FILE_BYTES = 12 * 1024 * 1024;
const MAX_ZIP_TEXT_CHARS = 500000;
const QUARANTINE_DIR = path.join(os.tmpdir(), "stream-coding-quarantine");
const UNSUPPORTED_ARCHIVE_MIMES = new Set(["application/x-rar-compressed", "application/vnd.rar", "application/x-7z-compressed", "application/x-tar", "application/gzip", "application/x-bzip2", "application/x-xz", "application/java-archive"]);
const BLOCKED_EXTENSIONS = /\.(?:rar|7z|tar|gz|bz2|xz|tgz|exe|dll|so|dylib|msi|com|scr|bat|cmd|ps1|psm1|psd1|vbs|vbe|jse|wsf|wsh|jar|apk|deb|rpm|dmg|iso|sys|ocx|cpl|pif|appx|appxbundle|hta|gadget|reg|lnk|url|command|app)$/i;
const TEXT_MIMES = /^(?:text\/.*|application\/(?:json|javascript|x-javascript|typescript|xml|yaml|x-yaml|graphql|sql|toml|x-sh|x-httpd-php|wasm))$/i;
const SOURCE_EXTENSION = /\.(?:txt|md|rst|js|mjs|cjs|jsx|ts|tsx|json|css|scss|sass|less|html|htm|vue|svelte|astro|xml|svg|py|pyi|ipynb|java|kt|kts|go|rs|php|phtml|sql|yml|yaml|toml|ini|cfg|conf|sh|bash|zsh|fish|c|h|cc|cpp|cxx|hpp|hxx|cs|fs|vb|swift|rb|rake|pl|pm|lua|dart|ex|exs|erl|hrl|clj|cljs|cljc|edn|scala|sc|groovy|gradle|tf|hcl|proto|graphql|gql|prisma|properties|make|mk|cmake|dockerfile|gitignore|editorconfig|lock)$/i;
const SOURCE_BASENAME = /^(?:dockerfile|containerfile|makefile|gnumakefile|cmakelists\.txt|gemfile|rakefile|procfile|justfile|readme(?:\..*)?)$/i;
const SENSITIVE_FILE = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.npmrc|\.pypirc|credentials(?:\.json)?|secrets?(?:\.json)?|id_rsa|id_ed25519|[^/]+\.(?:pem|key|p12|pfx))$/i;
const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_EOCD = 0x06054b50;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});
let scannerNoticeShown = false;

function cleanText(value, max = 20000) {
  return String(value == null ? "" : value).slice(0, max);
}

export function coarenaConfig() {
  const base = String(process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const token = String(process.env.ANTHROPIC_AUTH_TOKEN || process.env.COARENA_API_KEY || "").trim();
  return { base, token, model: String(process.env.COARENA_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL };
}

function endpointFor(base) {
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return base + "/messages";
  return base + "/v1/messages";
}

function attachmentError(message, code = "unsafe_attachment", status = 400) {
  return Object.assign(new Error(message), { status, code });
}

function decodeAttachment(data) {
  if (!data || data.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) throw attachmentError("The uploaded file encoding is invalid.");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length) throw attachmentError("The uploaded file is empty.");
  return bytes;
}

function isZipSignature(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && ((bytes[2] === 0x03 && bytes[3] === 0x04) || (bytes[2] === 0x05 && bytes[3] === 0x06) || (bytes[2] === 0x07 && bytes[3] === 0x08));
}

function hasExecutableSignature(bytes) {
  if (bytes.length < 2) return false;
  const a = bytes[0], b = bytes[1], c = bytes[2], d = bytes[3];
  return (a === 0x4d && b === 0x5a) || (a === 0x7f && b === 0x45 && c === 0x4c && d === 0x46) ||
    (a === 0xfe && b === 0xed && (c === 0xfa || c === 0xcf)) || (a === 0xcf && b === 0xfa && (c === 0xed || c === 0xce)) ||
    (a === 0xca && b === 0xfe && c === 0xba && d === 0xbe);
}

function zipCrc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function safeZipTextFiles(bytes) {
  if (!isZipSignature(bytes)) throw attachmentError("That .zip file is invalid or could not be read.", "invalid_zip", 415);
  const minOffset = Math.max(0, bytes.length - 65557);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= minOffset; i--) {
    if (bytes.readUInt32LE(i) === ZIP_EOCD) { eocd = i; break; }
  }
  if (eocd < 0 || eocd + 22 > bytes.length) throw attachmentError("That .zip file is incomplete or unsupported.", "invalid_zip", 415);
  const disk = bytes.readUInt16LE(eocd + 4);
  const centralDisk = bytes.readUInt16LE(eocd + 6);
  const diskEntries = bytes.readUInt16LE(eocd + 8);
  const entries = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const centralOffset = bytes.readUInt32LE(eocd + 16);
  if (disk || centralDisk || diskEntries !== entries || entries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff || entries > MAX_ZIP_ENTRIES || centralOffset + centralSize > eocd) {
    throw attachmentError("This .zip uses an unsupported layout or contains too many files.", "invalid_zip", 415);
  }

  let cursor = centralOffset;
  const centralEnd = centralOffset + centralSize;
  let expandedBytes = 0;
  let textChars = 0;
  const readableFiles = [];
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== ZIP_CENTRAL) throw attachmentError("The .zip file has an invalid directory.", "invalid_zip", 415);
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const crc32 = bytes.readUInt32LE(cursor + 16);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > centralEnd || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) throw attachmentError("The .zip file contains an unsupported entry.", "invalid_zip", 415);
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const name = rawName.toString((flags & 0x800) ? "utf8" : "latin1").replace(/\\/g, "/");
    cursor = end;
    if (!name || /[\0\x00-\x1f\x7f]/.test(name) || name.startsWith("/") || /^[a-z]:/i.test(name) || name.split("/").some((part) => part === "..")) {
      throw attachmentError("The .zip contains an unsafe file path.", "unsafe_zip_path", 415);
    }
    if (name.endsWith("/")) continue;
    if (BLOCKED_EXTENSIONS.test(name) || /\.zip$/i.test(name)) throw attachmentError("The .zip contains an executable or blocked file type.", "archive_or_executable_rejected", 415);
    if (flags & 0x41) throw attachmentError("Encrypted .zip entries cannot be checked safely.", "unsafe_archive", 415);
    if (method !== 0 && method !== 8) throw attachmentError("The .zip uses an unsupported compression method.", "invalid_zip", 415);
    if (uncompressedSize > MAX_ZIP_FILE_BYTES || expandedBytes + uncompressedSize > MAX_ZIP_EXPANDED_BYTES) throw attachmentError("The .zip expands beyond the safe 24 MB limit.", "zip_too_large", 413);
    if (compressedSize > bytes.length || (uncompressedSize > 1024 * 1024 && compressedSize > 0 && uncompressedSize / compressedSize > 200)) throw attachmentError("The .zip has an unsafe compression ratio.", "zip_too_large", 413);
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== ZIP_LOCAL) throw attachmentError("The .zip contains an invalid file entry.", "invalid_zip", 415);
    const localFlags = bytes.readUInt16LE(localOffset + 6);
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localCrc32 = bytes.readUInt32LE(localOffset + 14);
    const localCompressedSize = bytes.readUInt32LE(localOffset + 18);
    const localUncompressedSize = bytes.readUInt32LE(localOffset + 22);
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const localNameStart = localOffset + 30;
    const localNameEnd = localNameStart + localNameLength;
    if (localFlags !== flags || localMethod !== method || localNameLength !== nameLength || !bytes.subarray(localNameStart, localNameEnd).equals(rawName)) throw attachmentError("The .zip entry headers do not match.", "invalid_zip", 415);
    if (flags & 0x08) {
      if ((localCrc32 && localCrc32 !== crc32) || (localCompressedSize && localCompressedSize !== compressedSize) || (localUncompressedSize && localUncompressedSize !== uncompressedSize)) throw attachmentError("The .zip entry headers do not match.", "invalid_zip", 415);
    } else if (localCrc32 !== crc32 || localCompressedSize !== compressedSize || localUncompressedSize !== uncompressedSize) {
      throw attachmentError("The .zip entry headers do not match.", "invalid_zip", 415);
    }
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > centralOffset) throw attachmentError("The .zip contains a truncated or overlapping file entry.", "invalid_zip", 415);
    const packed = bytes.subarray(dataStart, dataEnd);
    let content;
    try {
      content = method === 0 ? Buffer.from(packed) : inflateRawSync(packed, { maxOutputLength: Math.max(1, uncompressedSize) });
    } catch {
      throw attachmentError("The .zip contains a damaged or oversized file.", "invalid_zip", 415);
    }
    if (content.length !== uncompressedSize || zipCrc32(content) !== crc32) throw attachmentError("The .zip contains a file with an invalid size or checksum.", "invalid_zip", 415);
    expandedBytes += content.length;
    if (hasExecutableSignature(content)) throw attachmentError("The .zip contains executable content and was rejected.", "archive_or_executable_rejected", 415);
    if (SENSITIVE_FILE.test(name)) continue;

    const baseName = path.posix.basename(name);
    if ((!SOURCE_EXTENSION.test(baseName) && !SOURCE_BASENAME.test(baseName)) || content.includes(0)) continue;
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(content); } catch { continue; }
    const remaining = MAX_ZIP_TEXT_CHARS - textChars;
    if (remaining <= 0) break;
    text = text.slice(0, Math.min(120000, remaining));
    readableFiles.push({ name, text });
    textChars += text.length;
  }
  if (cursor !== centralEnd) throw attachmentError("The .zip directory size does not match its entries.", "invalid_zip", 415);
  if (!readableFiles.length) throw attachmentError("The .zip must include readable source files such as .js, .css, or .html.", "empty_source_zip", 415);
  return readableFiles;
}

function runOptionalClamScan(filePath) {
  const scanner = process.env.CODING_CLAMSCAN_BIN || (fs.existsSync("/usr/bin/clamdscan") ? "/usr/bin/clamdscan" : fs.existsSync("/usr/bin/clamscan") ? "/usr/bin/clamscan" : "");
  if (!scanner) {
    if (!scannerNoticeShown) { console.warn("[COD\\NG] ClamAV is unavailable; uploads use signature, type, and quarantine checks."); scannerNoticeShown = true; }
    return { available: false, clean: false };
  }
  const result = spawnSync(scanner, scanner.endsWith("clamdscan") ? ["--no-summary", filePath] : ["--no-summary", "--infected", filePath], { encoding: "utf8", timeout: 10000 });
  if (result.error || result.status > 1) throw attachmentError("File security scanning is temporarily unavailable. Try a source-code file or try again later.", "scanner_unavailable", 503);
  return { available: true, clean: result.status === 0 };
}

function quarantineScan(name, mime, bytes) {
  const zipByName = /\.zip$/i.test(name);
  const zipBySignature = isZipSignature(bytes);
  if (BLOCKED_EXTENSIONS.test(name) || UNSUPPORTED_ARCHIVE_MIMES.has(mime)) throw attachmentError("Executable and unsupported archive files are not accepted by COD\\NG.", "archive_or_executable_rejected", 415);
  if (zipByName !== zipBySignature) throw attachmentError("Only valid .zip source-code archives can be uploaded.", "invalid_zip", 415);
  if (zipBySignature && mime && !["application/zip", "application/x-zip-compressed", "application/octet-stream", "application/x-zip"].includes(mime)) throw attachmentError("The .zip file type does not match its contents.", "invalid_zip", 415);
  if (hasExecutableSignature(bytes)) throw attachmentError("Executable content was rejected before it could be forwarded.", "archive_or_executable_rejected", 415);
  if (!mime.startsWith("image/") && mime !== "application/pdf" && !zipBySignature && bytes.includes(0)) throw attachmentError("Binary content is not accepted as a source file.", "binary_source_rejected", 415);
  const zipFiles = zipBySignature ? safeZipTextFiles(bytes) : null;
  fs.mkdirSync(QUARANTINE_DIR, { recursive: true, mode: 0o700 });
  const quarantinePath = path.join(QUARANTINE_DIR, crypto.randomUUID());
  fs.writeFileSync(quarantinePath, bytes, { mode: 0o600, flag: "wx" });
  try {
    const detected = spawnSync("file", ["--brief", "--mime-type", quarantinePath], { encoding: "utf8", timeout: 5000 });
    if (detected.error) throw attachmentError("File security scanning is temporarily unavailable.", "scanner_unavailable", 503);
    const detectedMime = String(detected.stdout || "").trim().toLowerCase();
    if (UNSUPPORTED_ARCHIVE_MIMES.has(detectedMime) || /(?:executable|shared object|java archive)/i.test(detectedMime)) throw attachmentError("The uploaded file type is not accepted.", "archive_or_executable_rejected", 415);
    if (zipBySignature && !/zip|archive/i.test(detectedMime)) throw attachmentError("The uploaded .zip could not be verified as an archive.", "invalid_zip", 415);
    if (!zipBySignature && mime.startsWith("image/") && mime !== detectedMime && !(mime === "image/jpg" && detectedMime === "image/jpeg")) throw attachmentError("The uploaded image type does not match its contents.", "invalid_attachment_type", 415);
    if (!zipBySignature && mime === "application/pdf" && detectedMime !== "application/pdf") throw attachmentError("The uploaded PDF type does not match its contents.", "invalid_attachment_type", 415);
    if (!zipBySignature && !mime.startsWith("image/") && mime !== "application/pdf" && !TEXT_MIMES.test(detectedMime)) throw attachmentError("Only readable source-code files, PDFs, and images are accepted.", "unsupported_attachment_type", 415);
    const clam = runOptionalClamScan(quarantinePath);
    if (clam.available && !clam.clean) throw attachmentError("The uploaded file failed malware scanning and was quarantined.", "malware_rejected", 415);
    return zipFiles;
  } finally {
    try { fs.unlinkSync(quarantinePath); } catch {}
  }
}

function attachmentContent(attachment) {
  const rawName = cleanText(attachment?.name || "attachment", 180);
  if (!rawName || /[\0/\\]/.test(rawName) || rawName.includes("..")) throw attachmentError("The uploaded filename is invalid.", "unsafe_filename");
  const name = rawName;
  const mime = cleanText(attachment?.mime || attachment?.type || "application/octet-stream", 100).toLowerCase();
  const data = String(attachment?.data || "");
  const bytes = decodeAttachment(data);
  if (bytes.length > MAX_ATTACHMENT_BYTES) throw attachmentError(`${name} is larger than 12 MB.`, "attachment_too_large", 413);
  const zipFiles = quarantineScan(name, mime, bytes);
  if (zipFiles) {
    const source = zipFiles.map((file) => `\n\n--- File from ${name}: ${file.name} ---\n${file.text}\n--- End file ---`).join("");
    return { type: "text", text: `\n\n--- Source files extracted safely from ${name} ---${source}\n--- End archive ---\n`, _bytes: bytes.length };
  }
  if (mime.startsWith("image/")) return { type: "image", source: { type: "base64", media_type: mime, data }, _name: name, _bytes: bytes.length };
  if (mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: mime, data }, _name: name, _bytes: bytes.length };
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw attachmentError(`${name} is not valid UTF-8 source text.`, "unreadable_attachment", 415); }
  if (!text) throw attachmentError(`${name} could not be read as text.`, "unreadable_attachment");
  return { type: "text", text: `\n\n--- File: ${name} (${mime}) ---\n${text.slice(0, 120000)}\n--- End file ---\n`, _bytes: bytes.length };
}

export function buildCodingPayload(input = {}) {
  const rawMessages = Array.isArray(input.messages) ? input.messages.slice(-MAX_MESSAGES) : [];
  const messages = rawMessages.map((message) => {
    const role = message?.role === "assistant" ? "assistant" : "user";
    const text = cleanText(message?.content || "", 30000);
    return { role, content: text };
  }).filter((message) => message.content.trim());
  if (!messages.length || messages[messages.length - 1].role !== "user") throw Object.assign(new Error("Send a user message first."), { status: 400 });
  const rawAttachments = Array.isArray(input.attachments) ? input.attachments.slice(0, MAX_ATTACHMENTS) : [];
  const declaredAttachmentBytes = rawAttachments.reduce((total, item) => total + decodeAttachment(String(item?.data || "")).length, 0);
  if (declaredAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw attachmentError("Attachments are too large together. Keep the total under 30 MB.", "attachments_too_large", 413);
  const attachments = rawAttachments.map(attachmentContent);
  const attachmentBytes = attachments.reduce((total, item) => total + item._bytes, 0);
  if (attachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw attachmentError("Attachments are too large together. Keep the total under 30 MB.", "attachments_too_large", 413);
  if (attachments.length) {
    const last = messages[messages.length - 1];
    const content = [{ type: "text", text: last.content }, ...attachments.map((item) => { const copy = { ...item }; delete copy._name; delete copy._bytes; return copy; })];
    last.content = content;
  }
  return {
    model: coarenaConfig().model,
    max_tokens: Math.min(12000, Math.max(1024, Number(input.max_tokens) || 8192)),
    system: "You are COD\\NG, the ES TEAMS TV premium coding assistant. Help with programming, debugging, architecture, and code review. Be precise. When the user asks for a completed file, return a fenced code block with the filename on the fence, for example ```js filename=src/app.js, and include the complete file. Never claim to have executed code you did not execute.",
    messages,
    stream: true,
  };
}

export async function createCoarenaRequest(payload, { signal } = {}) {
  const { base, token } = coarenaConfig();
  if (!token) throw Object.assign(new Error("COD\\NG is not configured yet. Set COARENA_API_KEY or ANTHROPIC_AUTH_TOKEN on the server."), { status: 503, code: "coding_not_configured" });
  const response = await fetch(endpointFor(base), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream, application/json", "anthropic-version": "2023-06-01", "x-api-key": token, authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const raw = (await response.text()).slice(0, 800);
    let detail = raw;
    try { detail = JSON.parse(raw).error?.message || JSON.parse(raw).error || raw; } catch {}
    throw Object.assign(new Error(`Coarena returned HTTP ${response.status}: ${detail || "request failed"}`), { status: response.status, code: "coarena_error" });
  }
  return response;
}

export async function* readCoarenaStream(response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data || data === "[DONE]") continue;
        let event; try { event = JSON.parse(data); } catch { continue; }
        const text = event.delta?.text || event.content_block?.text || (event.type === "message_start" ? "" : "");
        if (text) yield { type: "text", text };
        if (event.type === "message_stop") yield { type: "done" };
      }
    }
    if (buffer.trim()) {
      const data = buffer.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
      if (data && data !== "[DONE]") { let event; try { event = JSON.parse(data); } catch { event = null; } const text = event?.delta?.text || event?.content_block?.text; if (text) yield { type: "text", text }; if (event?.type === "message_stop") yield { type: "done" }; }
    }
  } finally { reader.releaseLock(); }
}

export const codingLimits = { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_TOTAL_ATTACHMENT_BYTES, MAX_MESSAGES };
