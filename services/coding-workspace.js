import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_EXTRACTED_FILES = 200;
const MAX_EXTRACTED_BYTES = 24 * 1024 * 1024;
const MAX_FILE_BYTES = 12 * 1024 * 1024;
const workspaceLocks = new Map();

function fail(message, status = 400, code = "coding_workspace_error") {
  throw Object.assign(new Error(message), { status, code });
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export async function withCodingWorkspaceLock(uid, conversationId, operation) {
  const key = `${digest(uid)}:${digest(conversationId)}`;
  const previous = workspaceLocks.get(key) || Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  workspaceLocks.set(key, tail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (workspaceLocks.get(key) === tail) workspaceLocks.delete(key);
  }
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function safeRelativePath(value) {
  const input = String(value || "").trim();
  if (!input || input.length > 512 || input.includes("\0") || path.posix.isAbsolute(input) || /^[a-z]:/i.test(input)) {
    fail("Choose a relative path inside this coding workspace.", 400, "coding_workspace_invalid_path");
  }
  const slashPath = input.replaceAll("\\", "/");
  const normalized = path.posix.normalize(slashPath);
  if (slashPath.split("/").some((part) => part === "..") || normalized !== slashPath || normalized === "." || normalized.startsWith("/") || normalized.startsWith("../")) {
    fail("That path is outside this coding workspace.", 400, "coding_workspace_invalid_path");
  }
  return normalized;
}

function configuredRoot() {
  const raw = String(process.env.CODING_EXECUTION_ROOT || "").trim();
  if (!raw) fail("Command execution is not configured for this environment.", 503, "coding_workspace_unavailable");
  if (!path.isAbsolute(raw)) fail("CODING_EXECUTION_ROOT must be an absolute path.", 503, "coding_workspace_invalid_root");
  const root = path.resolve(raw);
  if (root === path.parse(root).root || root === path.resolve(process.cwd())) {
    fail("CODING_EXECUTION_ROOT must point to a dedicated workspace directory.", 503, "coding_workspace_invalid_root");
  }
  return root;
}

async function ensurePrivateDirectory(directory, parent) {
  try {
    await fs.mkdir(directory, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }
  const stat = await fs.lstat(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail("A coding workspace path is not a real directory.", 403, "coding_workspace_invalid_path");
  const [realParent, realDirectory] = await Promise.all([fs.realpath(parent), fs.realpath(directory)]);
  if (!isWithin(realParent, realDirectory) || realDirectory === realParent) fail("A coding workspace path is outside its configured root.", 403, "coding_workspace_invalid_path");
  await fs.chmod(realDirectory, 0o700);
  return realDirectory;
}

export async function codingWorkspacePaths(uid, conversationId) {
  const userId = String(uid || "").trim();
  const conversation = String(conversationId || "").trim();
  if (!userId) fail("A signed-in user is required for a coding workspace.", 401, "coding_workspace_user_required");
  if (!conversation || conversation.length > 300 || conversation.includes("\0")) fail("A valid conversation is required for a coding workspace.", 400, "coding_workspace_conversation_required");
  const configured = configuredRoot();
  await fs.mkdir(configured, { recursive: true, mode: 0o700 });
  const rootStat = await fs.lstat(configured);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) fail("The configured coding workspace root is unavailable.", 503, "coding_workspace_unavailable");
  const root = await fs.realpath(configured);
  const userDirectory = await ensurePrivateDirectory(path.join(root, `user-${digest(userId)}`), root);
  const workspace = await ensurePrivateDirectory(path.join(userDirectory, `conversation-${digest(conversation)}`), userDirectory);
  return { root, workspace };
}

export async function codingWorkspace(uid, conversationId) {
  return (await codingWorkspacePaths(uid, conversationId)).workspace;
}

async function ensureWorkspaceParents(workspace, relativePath) {
  const parts = relativePath.split("/");
  let current = workspace;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    try {
      await fs.mkdir(current, { mode: 0o700 });
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("The uploaded project contains an unsafe path.", 415, "coding_workspace_invalid_path");
    const real = await fs.realpath(current);
    if (!isWithin(workspace, real)) fail("The uploaded project contains an unsafe path.", 415, "coding_workspace_invalid_path");
    current = real;
  }
  return current;
}

async function existingWorkspaceParents(workspace, relativePath) {
  const parts = relativePath.split("/");
  let current = workspace;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch((error) => {
      if (error?.code === "ENOENT") fail("That file is not present in this user's coding workspace.", 404, "coding_workspace_file_not_found");
      throw error;
    });
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("That file path is not a regular workspace directory.", 400, "coding_workspace_invalid_path");
    current = await fs.realpath(current);
    if (!isWithin(workspace, current)) fail("That file is outside this user's coding workspace.", 403, "coding_workspace_invalid_path");
  }
  return current;
}

async function workspaceParentsIfPresent(workspace, relativePath) {
  const parts = relativePath.split("/");
  let current = workspace;
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (!stat) return null;
    if (stat.isSymbolicLink() || !stat.isDirectory()) fail("The uploaded project contains an unsafe path.", 415, "coding_workspace_invalid_path");
    current = await fs.realpath(current);
    if (!isWithin(workspace, current)) fail("The uploaded project contains an unsafe path.", 415, "coding_workspace_invalid_path");
  }
  return current;
}

export async function resolveCodingWorkspaceFile(uid, conversationId, requestedPath) {
  const workspace = await codingWorkspace(uid, conversationId);
  const relative = safeRelativePath(requestedPath);
  const parent = await existingWorkspaceParents(workspace, relative);
  const candidate = path.join(parent, path.posix.basename(relative));
  const stat = await fs.lstat(candidate).catch((error) => {
    if (error?.code === "ENOENT") fail("That file is not present in this user's coding workspace.", 404, "coding_workspace_file_not_found");
    throw error;
  });
  if (stat.isSymbolicLink() || !stat.isFile()) fail("That file is not a regular workspace file.", 400, "coding_workspace_invalid_path");
  const real = await fs.realpath(candidate);
  if (!isWithin(workspace, real)) fail("That file is outside this user's coding workspace.", 403, "coding_workspace_invalid_path");
  return { workspace, filePath: real, relativePath: relative };
}

export async function writeCodingWorkspaceFiles(uid, conversationId, files = []) {
  return withCodingWorkspaceLock(uid, conversationId, () => writeCodingWorkspaceFilesLocked(uid, conversationId, files));
}

async function writeCodingWorkspaceFilesLocked(uid, conversationId, files = []) {
  if (!Array.isArray(files) || files.length > MAX_EXTRACTED_FILES) fail("The uploaded project contains too many files.", 413, "coding_workspace_project_too_large");
  const workspace = await codingWorkspace(uid, conversationId);
  const seen = new Set();
  let totalBytes = 0;
  const prepared = [];
  for (const file of files) {
    const relative = safeRelativePath(file?.name);
    if (seen.has(relative)) fail("The uploaded project contains duplicate file paths.", 415, "coding_workspace_duplicate_path");
    if ([...seen].some((existing) => existing.startsWith(`${relative}/`) || relative.startsWith(`${existing}/`))) fail("The uploaded project contains conflicting file and directory paths.", 415, "coding_workspace_invalid_path");
    seen.add(relative);
    const data = Buffer.isBuffer(file?.data) ? file.data : Buffer.from(file?.data || "");
    if (!data.length || data.length > MAX_FILE_BYTES) fail("The uploaded project contains an empty or oversized file.", 413, "coding_workspace_project_too_large");
    totalBytes += data.length;
    if (totalBytes > MAX_EXTRACTED_BYTES) fail("The uploaded project expands beyond the safe 24 MB workspace limit.", 413, "coding_workspace_project_too_large");
    prepared.push({ relative, data });
  }
  for (const { relative } of prepared) {
    const parent = await workspaceParentsIfPresent(workspace, relative);
    if (!parent) continue;
    const destination = path.join(parent, path.posix.basename(relative));
    const existing = await fs.lstat(destination).catch((error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
    if (existing) fail("A file with the same path already exists in this conversation workspace. Start a new chat before uploading a replacement project.", 409, "coding_workspace_file_exists");
  }
  const written = [];
  try {
    for (const { relative, data } of prepared) {
      const parent = await ensureWorkspaceParents(workspace, relative);
      const destination = path.join(parent, path.posix.basename(relative));
      let handle;
      let created = false;
      try {
        handle = await fs.open(destination, "wx", 0o600);
        created = true;
        await handle.writeFile(data);
      } catch (error) {
        if (created) await fs.unlink(destination).catch(() => {});
        if (error?.code === "EEXIST") fail("A file with the same path already exists in this conversation workspace. Start a new chat before uploading a replacement project.", 409, "coding_workspace_file_exists");
        throw error;
      } finally {
        await handle?.close().catch(() => {});
      }
      written.push(destination);
    }
  } catch (error) {
    await Promise.all(written.map((filePath) => fs.unlink(filePath).catch(() => {})));
    throw error;
  }
  return { workspace, files: prepared.map(({ relative }) => relative), bytes: totalBytes };
}

export async function writeCodingWorkspaceArchives(uid, conversationId, archives = []) {
  if (!Array.isArray(archives) || archives.length > 6) fail("The uploaded project contains too many archives.", 413, "coding_workspace_project_too_large");
  const files = [];
  for (const archive of archives) {
    if (!Array.isArray(archive?.files)) fail("The uploaded project archive could not be read.", 415, "coding_workspace_invalid_archive");
    files.push(...archive.files);
    if (files.length > MAX_EXTRACTED_FILES) fail("The uploaded project contains too many files.", 413, "coding_workspace_project_too_large");
  }
  return writeCodingWorkspaceFiles(uid, conversationId, files);
}

export const codingWorkspaceLimits = { MAX_EXTRACTED_FILES, MAX_EXTRACTED_BYTES, MAX_FILE_BYTES };
