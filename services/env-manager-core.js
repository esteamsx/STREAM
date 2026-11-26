import crypto from "crypto";

const MAX_ENV_BYTES = 2 * 1024 * 1024;
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function encryptionKey() {
  const raw = String(process.env.ENV_MANAGER_ENCRYPTION_KEY || "").trim();
  if (!raw) throw Object.assign(new Error("ENV manager encryption is not configured."), { code: "env-manager/not-configured" });
  let key;
  if (/^[0-9a-f]{64}$/i.test(raw)) key = Buffer.from(raw, "hex");
  else { try { key = Buffer.from(raw, "base64"); } catch { key = null; } }
  if (!key || key.length !== 32) throw Object.assign(new Error("ENV manager encryption is not configured."), { code: "env-manager/not-configured" });
  return key;
}
export function encryptEnvValue(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: ciphertext.toString("base64") };
}
export function decryptEnvValue(record) {
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(String(record.iv), "base64"));
    decipher.setAuthTag(Buffer.from(String(record.tag), "base64"));
    return Buffer.concat([decipher.update(Buffer.from(String(record.data), "base64")), decipher.final()]).toString("utf8");
  } catch { throw Object.assign(new Error("Stored ENV data could not be decrypted."), { code: "env-manager/decrypt-failed" }); }
}
function findClosingQuote(text, quote) { let escaped = false; for (let i = 1; i < text.length; i += 1) { const ch = text[i]; if (escaped) { escaped = false; continue; } if (quote === '"' && ch === "\\") { escaped = true; continue; } if (ch === quote) return i; } return -1; }
function decodeDoubleQuoted(value) { return value.replace(/\\(\\|n|r|t|"|')/g, (_, code) => ({ n: "\n", r: "\r", t: "\t", "\\": "\\", '"': '"', "'": "'" }[code] || code)); }
export function parseEnvText(input) {
  const text = String(input || "").replace(/^\uFEFF/, "");
  if (Buffer.byteLength(text, "utf8") > MAX_ENV_BYTES) throw new Error("The .env file is too large.");
  const lines = text.replace(/\r\n?/g, "\n").split("\n"); const variables = {};
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i].trim(); if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trimStart();
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/); if (!match) throw new Error(`Invalid environment variable declaration on line ${i + 1}.`);
    const name = match[1]; let raw = match[2]; let value;
    if (raw.startsWith('"') || raw.startsWith("'")) {
      const quote = raw[0]; let end = findClosingQuote(raw, quote);
      while (end < 0 && i + 1 < lines.length) { i += 1; raw += `\n${lines[i]}`; end = findClosingQuote(raw, quote); }
      if (end < 0) throw new Error(`Unterminated quoted value for ${name}.`);
      const rest = raw.slice(end + 1).trim(); if (rest && !rest.startsWith("#")) throw new Error(`Unexpected characters after ${name}.`);
      value = raw.slice(1, end); if (quote === '"') value = decodeDoubleQuoted(value);
    } else { const comment = raw.search(/\s+#/); value = (comment >= 0 ? raw.slice(0, comment) : raw).trimEnd(); }
    variables[name] = value;
  }
  return variables;
}
export function normalizeEnvName(name) { const value = String(name || "").trim(); if (!KEY_RE.test(value)) throw new Error("Invalid environment variable name."); return value; }
