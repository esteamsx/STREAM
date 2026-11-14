import crypto from "node:crypto";

const SAFE_REF = /^[A-Za-z0-9._\/-]{1,200}$/;
const SAFE_REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/;

function fail(message, status = 400, code = "github_agent_error") {
  throw Object.assign(new Error(message), { status, code });
}

function secretKey() {
  const raw = process.env.CODING_GITHUB_ENCRYPTION_KEY;
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

export function parseGithubRepositoryInput(input = {}) {
  let owner = String(input.owner || "").trim();
  let repo = String(input.repo || "").trim();
  const rawUrl = String(input.url || input.repositoryUrl || "").trim();
  if (rawUrl) {
    let parsed;
    try { parsed = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`); } catch { fail("Enter a valid GitHub repository URL."); }
    if (parsed.hostname.toLowerCase() !== "github.com") fail("Repository URL must use github.com.");
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 && !(parts.length === 3 && parts[2].toLowerCase() === ".git")) fail("Enter a GitHub repository URL like https://github.com/owner/repository.");
    owner = parts[0]; repo = parts[1].replace(/\.git$/i, "");
  }
  return validateRepo(owner, repo);
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
