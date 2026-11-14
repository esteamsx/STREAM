import crypto from "node:crypto";

const SAFE_REF = /^[A-Za-z0-9._\/-]{1,200}$/;
const SAFE_REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;

function fail(message, status = 400, code = "github_agent_error") {
  throw Object.assign(new Error(message), { status, code });
}

function secretKey() {
  const raw = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || process.env.TRADING_VAULT_KEY || process.env.SESSION_SECRET;
  if (!raw || !String(raw).trim()) fail("GitHub Agent token encryption is not configured.", 503, "github_agent_storage_unavailable");
  return crypto.createHash("sha256").update(String(raw)).digest();
}

export function encryptGithubToken(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptGithubToken(value) {
  if (!value) return null;
  const payload = Buffer.from(String(value), "base64");
  if (payload.length < 29) fail("Stored GitHub credential is invalid.", 503, "github_agent_storage_invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}

export function validateRepo(owner, repo) {
  const cleanOwner = String(owner || "").trim();
  const cleanRepo = String(repo || "").trim();
  if (!SAFE_REPO_PART.test(cleanOwner) || !SAFE_REPO_PART.test(cleanRepo)) fail("Invalid GitHub repository.");
  return { owner: cleanOwner, repo: cleanRepo };
}

export function validateRef(ref = "main") {
  const clean = String(ref || "").trim();
  if (!SAFE_REF.test(clean) || clean.includes("..") || clean.startsWith("/") || clean.endsWith("/")) fail("Invalid GitHub branch or ref.");
  return clean;
}

export function validatePath(path) {
  const raw = String(path || "").trim();
  if (raw.startsWith("/")) fail("Invalid repository path.");
  const clean = raw;
  if (!clean || clean.length > 500 || clean.includes("\\") || clean.split("/").some((part) => !part || part === "." || part === "..")) fail("Invalid repository path.");
  return clean;
}
