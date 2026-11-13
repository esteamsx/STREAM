import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULT_BASE_URL = "https://coarena.ai/api";
const DEFAULT_MODEL = "claude-fable-5-2";
const MAX_MESSAGES = 80;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 30 * 1024 * 1024;
const QUARANTINE_DIR = path.join(os.tmpdir(), "stream-coding-quarantine");
const ARCHIVE_MIMES = new Set(["application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/vnd.rar", "application/x-7z-compressed", "application/x-tar", "application/gzip", "application/x-bzip2", "application/x-xz", "application/java-archive"]);
const BLOCKED_EXTENSIONS = /\.(?:zip|rar|7z|tar|gz|bz2|xz|tgz|exe|dll|so|dylib|msi|com|scr|bat|cmd|ps1|vbs|jar|apk|deb|rpm|dmg|iso)$/i;
const TEXT_MIMES = /^(?:text\/.*|application\/(?:json|javascript|x-javascript|typescript|xml|yaml|x-yaml|graphql|sql|toml|x-sh|x-httpd-php))$/i;
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

function runOptionalClamScan(filePath) {
  const scanner = process.env.CODING_CLAMSCAN_BIN || (fs.existsSync("/usr/bin/clamdscan") ? "/usr/bin/clamdscan" : fs.existsSync("/usr/bin/clamscan") ? "/usr/bin/clamscan" : "");
  if (!scanner) {
    if (!scannerNoticeShown) { console.warn("[COD/NG] ClamAV is unavailable; text uploads use signature/quarantine checks and binary uploads are rejected."); scannerNoticeShown = true; }
    return { available: false, clean: false };
  }
  const result = spawnSync(scanner, scanner.endsWith("clamdscan") ? ["--no-summary", filePath] : ["--no-summary", "--infected", filePath], { encoding: "utf8", timeout: 10000 });
  if (result.error || result.status > 1) throw attachmentError("File security scanning is temporarily unavailable. Try a source-code file or try again later.", "scanner_unavailable", 503);
  return { available: true, clean: result.status === 0 };
}

function quarantineScan(name, mime, bytes) {
  if (BLOCKED_EXTENSIONS.test(name) || ARCHIVE_MIMES.has(mime)) throw attachmentError("Archives and executable files are not accepted by COD/NG.", "archive_or_executable_rejected", 415);
  const signature = bytes.subarray(0, 8);
  if (signature[0] === 0x50 && signature[1] === 0x4b || signature[0] === 0x1f && signature[1] === 0x8b || signature[0] === 0x37 && signature[1] === 0x7a || signature[0] === 0x4d && signature[1] === 0x5a || signature[0] === 0x7f && signature[1] === 0x45 && signature[2] === 0x4c && signature[3] === 0x46) {
    throw attachmentError("Archive or executable content was rejected before it could be forwarded.", "archive_or_executable_rejected", 415);
  }
  if (!mime.startsWith("image/") && mime !== "application/pdf" && bytes.includes(0)) throw attachmentError("Binary content is not accepted as a source file.", "binary_source_rejected", 415);
  fs.mkdirSync(QUARANTINE_DIR, { recursive: true, mode: 0o700 });
  const quarantinePath = path.join(QUARANTINE_DIR, crypto.randomUUID());
  fs.writeFileSync(quarantinePath, bytes, { mode: 0o600, flag: "wx" });
  try {
    const detected = spawnSync("file", ["--brief", "--mime-type", quarantinePath], { encoding: "utf8", timeout: 5000 });
    if (detected.error) throw attachmentError("File security scanning is temporarily unavailable.", "scanner_unavailable", 503);
    const detectedMime = String(detected.stdout || "").trim().toLowerCase();
    if (ARCHIVE_MIMES.has(detectedMime) || /(?:executable|shared object|java archive)/i.test(detectedMime)) throw attachmentError("The quarantined file type is not accepted.", "archive_or_executable_rejected", 415);
    const clam = runOptionalClamScan(quarantinePath);
    if (clam.available && !clam.clean) throw attachmentError("The uploaded file failed malware scanning and was quarantined.", "malware_rejected", 415);
    if (!clam.available && !TEXT_MIMES.test(detectedMime)) throw attachmentError("This binary file type requires an enabled malware scanner.", "scanner_required", 415);
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
  quarantineScan(name, mime, bytes);
  if (mime.startsWith("image/")) return { type: "image", source: { type: "base64", media_type: mime, data }, _name: name, _bytes: bytes.length };
  if (mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: mime, data }, _name: name, _bytes: bytes.length };
  const text = bytes.toString("utf8");
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
    system: "You are COD/NG, the ES TEAMS TV premium coding assistant. Help with programming, debugging, architecture, and code review. Be precise. When the user asks for a completed file, return a fenced code block with the filename on the fence, for example ```js filename=src/app.js, and include the complete file. Never claim to have executed code you did not execute.",
    messages,
    stream: true,
  };
}

export async function createCoarenaRequest(payload, { signal } = {}) {
  const { base, token } = coarenaConfig();
  if (!token) throw Object.assign(new Error("COD/NG is not configured yet. Set COARENA_API_KEY or ANTHROPIC_AUTH_TOKEN on the server."), { status: 503, code: "coding_not_configured" });
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
