import crypto from "crypto";

function getKey() {
  const raw = process.env.TRADING_VAULT_KEY;
  if (!raw || !raw.trim()) {
    throw Object.assign(new Error("Server is not configured to store trading API credentials (TRADING_VAULT_KEY missing)."), { status: 503 });
  }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain) {
  if (!plain) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function last4(value) {
  return value ? String(value).slice(-4) : null;
}

export function hashForLookup(value) {
  if (!value) return null;
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
