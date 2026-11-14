import crypto from "node:crypto";
import { db } from "../config/firebase.js";
import { encryptGithubToken, decryptGithubToken, validateRepo, parseGithubRepositoryInput, validateRef, validatePath } from "./github-agent-guards.js";
import { getCodingGithubOAuthConfig, CODING_GITHUB_OAUTH_SCOPE } from "./github-agent-config.js";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "ES-TEAMS-TV-CODING-GITHUB-AGENT";
const OAUTH_TTL_MS = 10 * 60 * 1000;
const WORKSPACE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_CHANGES = 80;
const MAX_CONTEXT_FILES = 12;
const MAX_CONTEXT_CHARS = 80_000;
const MAX_TREE_METADATA_CHARS = 24_000;
const MAX_CONTEXT_FILE_CHARS = 20_000;
const CONTEXT_FILE_PATTERN = /(?:^|\/)(?:package\.json|readme(?:\.[^/]*)?|server\.[cm]?[jt]sx?|index\.[cm]?[jt]sx?|[^/]+\.(?:[cm]?[jt]sx?|vue|svelte|css|scss|html|md|json|ya?ml|toml|sql|py|go|rs|java|rb|php|sh))$/i;
const CONTEXT_IGNORED_PATH = /(?:^|\/)(?:\.git|node_modules|dist|build|coverage|vendor|\.next|\.cache)(?:\/|$)/i;
function fail(message, status = 400, code = "github_agent_error") {
  throw Object.assign(new Error(message), { status, code });
}

function githubHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": USER_AGENT };
}

async function githubRequest(token, path, options = {}) {
  const response = await fetch(`${GITHUB_API}${path}`, { ...options, headers: { ...githubHeaders(token), ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.message ? `: ${body.message}` : "";
    fail(`GitHub request failed (${response.status})${detail}`, response.status === 404 ? 404 : 502, "github_api_error");
  }
  return body;
}

async function audit(uid, operation, details = {}) {
  await db.collection("github_agent_audit").add({ uid: String(uid), operation, details, createdAt: Date.now() });
}

export async function createOAuthState(uid, returnTo = "/coding") {
  const state = crypto.randomBytes(32).toString("base64url");
  await db.collection("github_agent_oauth_state").doc(state).set({ uid: String(uid), returnTo: String(returnTo).startsWith("/") ? String(returnTo).slice(0, 200) : "/coding", expiresAt: Date.now() + OAUTH_TTL_MS });
  return state;
}

export async function consumeOAuthState(state) {
  const clean = String(state || "");
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(clean)) return null;
  const ref = db.collection("github_agent_oauth_state").doc(clean);
  const snap = await ref.get();
  await ref.delete().catch(() => {});
  if (!snap.exists || Date.now() > Number(snap.data()?.expiresAt || 0)) return null;
  return snap.data();
}

export async function saveConnection(uid, { token, githubUser, scopes = [] }) {
  if (!token || !githubUser?.id) fail("GitHub authorization did not return a usable account.", 502);
  await db.collection("github_agent_connections").doc(String(uid)).set({
    token: encryptGithubToken(token), githubId: String(githubUser.id), login: String(githubUser.login || ""), avatarUrl: githubUser.avatar_url || null,
    scopes: Array.isArray(scopes) ? scopes.slice(0, 20) : [], connectedAt: Date.now(), lastUsedAt: Date.now(), revokedAt: null,
  }, { merge: true });
  await audit(uid, "connect", { githubId: String(githubUser.id), login: String(githubUser.login || ""), scopes });
}

export async function getConnection(uid) {
  const snap = await db.collection("github_agent_connections").doc(String(uid)).get();
  if (!snap.exists || snap.data()?.revokedAt) return null;
  const data = snap.data();
  return { ...data, uid: String(uid), token: decryptGithubToken(data.token) };
}

export async function getConnectionStatus(uid) {
  const data = await getConnection(uid);
  const scopes = Array.isArray(data?.scopes) ? data.scopes : [];
  return data ? { connected: true, login: data.login, avatarUrl: data.avatarUrl || null, scopes, needsPermissionUpgrade: !scopes.includes(CODING_GITHUB_OAUTH_SCOPE), selectedRepo: data.selectedRepo || null, connectedAt: data.connectedAt || null } : { connected: false, selectedRepo: null, needsPermissionUpgrade: false };
}

export async function disconnect(uid) {
  await db.collection("github_agent_connections").doc(String(uid)).set({ token: null, revokedAt: Date.now() }, { merge: true });
  await audit(uid, "disconnect");
}

async function tokenFor(uid) {
  const connection = await getConnection(uid);
  if (!connection?.token) fail("Connect GitHub before using the repository Agent.", 401, "github_not_connected");
  await db.collection("github_agent_connections").doc(String(uid)).set({ lastUsedAt: Date.now() }, { merge: true });
  return connection;
}

function ensureWritePermission(connection, chosen) {
  if (connection?.selectedRepo?.owner?.toLowerCase() === chosen.owner.toLowerCase() && connection?.selectedRepo?.repo?.toLowerCase() === chosen.repo.toLowerCase() && connection.selectedRepo.permissions?.push === false) {
    fail("This GitHub account can read the repository but cannot modify it. Choose a repository where you have write access or reconnect GitHub with the required permission.", 403, "github_write_permission_required");
  }
}

export async function exchangeOAuthCode(code) {
  const { clientId, clientSecret, redirectUri } = getCodingGithubOAuthConfig();
  if (!clientId || !clientSecret) fail("GitHub Agent OAuth is not configured.", 503, "github_oauth_unavailable");
  const response = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: String(code), redirect_uri: redirectUri }) });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) fail("Could not complete GitHub authorization.", 502, "github_oauth_exchange_failed");
  return { token: data.access_token, scopes: String(data.scope || "").split(",").map((s) => s.trim()).filter(Boolean) };
}

export async function getGithubUser(token) { return githubRequest(token, "/user"); }

export async function listRepositories(uid) {
  const connection = await tokenFor(uid);
  const rows = await githubRequest(connection.token, "/user/repos?visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&per_page=100");
  await audit(uid, "list_repositories", { count: Array.isArray(rows) ? rows.length : 0 });
  return (Array.isArray(rows) ? rows : []).map((r) => ({ id: r.id, owner: r.owner?.login, repo: r.name, fullName: r.full_name, private: !!r.private, defaultBranch: r.default_branch || "main", htmlUrl: r.html_url, permissions: r.permissions || {} }));
}

export async function selectRepository(uid, input) {
  const selected = { ...parseGithubRepositoryInput(input), branch: validateRef(input?.branch || "main") };
  const connection = await tokenFor(uid);
  const repo = await githubRequest(connection.token, `/repos/${encodeURIComponent(selected.owner)}/${encodeURIComponent(selected.repo)}`);
  if (repo.owner?.login?.toLowerCase() !== selected.owner.toLowerCase()) fail("Repository owner did not match GitHub.", 403);
  selected.branch = validateRef(input?.branch || repo.default_branch || "main");
  await db.collection("github_agent_connections").doc(String(uid)).set({ selectedRepo: { ...selected, fullName: repo.full_name, htmlUrl: repo.html_url, private: !!repo.private, permissions: repo.permissions || {} }, selectedAt: Date.now() }, { merge: true });
  await audit(uid, "select_repository", selected);
  return { ...selected, fullName: repo.full_name, htmlUrl: repo.html_url, private: !!repo.private, permissions: repo.permissions || {} };
}

export async function createBranch(uid, input = {}) {
  const connection = await tokenFor(uid);
  const owner = String(input.owner || connection.selectedRepo?.owner || "");
  const repo = String(input.repo || connection.selectedRepo?.repo || "");
  const branch = validateRef(input.branch);
  const base = validateRef(input.base || connection.selectedRepo?.branch || "main");
  if (!owner || !repo) fail("Select a GitHub repository first.", 400, "github_repository_required");
  ensureWritePermission(connection, { owner, repo });
  if (["main", "master"].includes(branch.toLowerCase())) fail("The GitHub Agent cannot create a writable work branch named main or master.", 409, "github_protected_branch");
  const source = await githubRequest(connection.token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodeURIComponent(base)}`);
  await githubRequest(connection.token, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: source.object.sha }) });
  await audit(uid, "create_branch", { owner, repo, branch, base });
  return { owner, repo, branch, base, sha: source.object.sha };
}

export async function openPullRequest(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  ensureWritePermission(connection, chosen);
  const head = validateRef(input.head || chosen.branch);
  const base = validateRef(input.base || "main");
  if (["main", "master"].includes(head.toLowerCase())) fail("Pull requests must originate from a review branch.", 409, "github_protected_branch");
  const title = String(input.title || "COD\\NG reviewed changes").trim().slice(0, 200);
  const body = String(input.body || "Created after explicit COD\\NG review and approval.").trim().slice(0, 10000);
  const pr = await githubRequest(connection.token, `/repos/${encodeURIComponent(chosen.owner)}/${encodeURIComponent(chosen.repo)}/pulls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body, head, base }) });
  await audit(uid, "open_pull_request", { ...chosen, head, base, number: pr.number });
  return { number: pr.number, title: pr.title, state: pr.state, htmlUrl: pr.html_url, head, base };
}

async function selected(uid, input = {}) {
  const connection = await tokenFor(uid);
  const chosen = input.owner && input.repo ? { ...validateRepo(input.owner, input.repo), branch: validateRef(input.branch || "main") } : connection.selectedRepo;
  if (!chosen?.owner || !chosen?.repo) fail("Select a GitHub repository first.", 400, "github_repository_required");
  return { connection, chosen };
}

export async function getTree(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const ref = validateRef(input.ref || chosen.branch);
  const tree = await githubRequest(connection.token, `/repos/${encodeURIComponent(chosen.owner)}/${encodeURIComponent(chosen.repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  await audit(uid, "read_tree", { ...chosen, ref });
  const entries = [];
  let metadataChars = 0;
  for (const item of (tree.tree || []).filter((candidate) => candidate.type === "blob").slice(0, 5000)) {
    const entry = { path: validatePath(item.path), sha: item.sha, size: item.size || 0, type: item.type };
    const entryChars = JSON.stringify(entry).length + 1;
    if (metadataChars + entryChars > MAX_TREE_METADATA_CHARS) break;
    entries.push(entry);
    metadataChars += entryChars;
  }
  return { sha: tree.sha, truncated: !!tree.truncated || entries.length < (tree.tree || []).filter((item) => item.type === "blob").length, entries, metadataChars };
}

export async function readFile(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const path = validatePath(input.path); const ref = validateRef(input.ref || chosen.branch);
  const file = await githubRequest(connection.token, `/repos/${encodeURIComponent(chosen.owner)}/${encodeURIComponent(chosen.repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
  if (file.type !== "file" || Number(file.size || 0) > MAX_FILE_BYTES) fail("That file is too large or is not a regular file.", 413);
  const content = Buffer.from(String(file.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  await audit(uid, "read_file", { ...chosen, ref, path, bytes: Buffer.byteLength(content) });
  return { path, sha: file.sha, size: file.size || Buffer.byteLength(content), content, encoding: "utf-8", htmlUrl: file.html_url || null };
}

export async function getRepositoryContext(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const ref = validateRef(input.ref || chosen.branch);
  const tree = await githubRequest(connection.token, `/repos/${encodeURIComponent(chosen.owner)}/${encodeURIComponent(chosen.repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  const entries = (tree.tree || []).filter((item) => item.type === "blob" && !CONTEXT_IGNORED_PATH.test(item.path) && Number(item.size || 0) <= MAX_FILE_BYTES);
  const metadata = [];
  let metadataChars = 0;
  for (const item of entries) {
    const line = `${item.path}\t${item.size || 0}\t${item.sha}\n`;
    if (metadataChars + line.length > MAX_TREE_METADATA_CHARS) break;
    metadata.push(line);
    metadataChars += line.length;
  }
  const prioritized = entries
    .filter((item) => CONTEXT_FILE_PATTERN.test(item.path))
    .sort((a, b) => {
      const score = (item) => /(?:^|\/)(?:package\.json|readme(?:\.[^/]*)?|server\.[cm]?[jt]sx?)$/i.test(item.path) ? 0 : /\.(?:[cm]?tsx?|jsx?|vue|svelte|py|go|rs|java|rb|php)$/i.test(item.path) ? 1 : 2;
      return score(a) - score(b) || a.path.length - b.path.length;
    })
    .slice(0, MAX_CONTEXT_FILES);
  const files = [];
  let contextChars = metadataChars;
  for (const item of prioritized) {
    if (contextChars >= MAX_CONTEXT_CHARS) break;
    const file = await githubRequest(connection.token, `/repos/${encodeURIComponent(chosen.owner)}/${encodeURIComponent(chosen.repo)}/contents/${item.path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`);
    if (file.type !== "file") continue;
    const content = Buffer.from(String(file.content || "").replace(/\n/g, ""), "base64").toString("utf8").slice(0, MAX_CONTEXT_FILE_CHARS);
    const remaining = MAX_CONTEXT_CHARS - contextChars;
    const text = content.slice(0, Math.max(0, remaining));
    if (!text) break;
    files.push({ path: item.path, sha: file.sha, content: text, truncated: text.length < content.length });
    contextChars += text.length;
  }
  await audit(uid, "read_repository_context", { ...chosen, ref, fileCount: files.length, treeChars: metadataChars, contextChars });
  return { repo: { ...chosen, ref }, tree: metadata.join(""), files, chars: contextChars };
}

export async function searchCode(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const query = String(input.query || "").trim(); if (!query || query.length > 180) fail("Enter a search query up to 180 characters.");
  const q = `${query} repo:${chosen.owner}/${chosen.repo}`;
  const results = await githubRequest(connection.token, `/search/code?q=${encodeURIComponent(q)}&per_page=50`);
  await audit(uid, "search_code", { ...chosen, query });
  return { total: results.total_count || 0, items: (results.items || []).map((item) => ({ path: item.path, sha: item.sha, htmlUrl: item.html_url, repository: item.repository?.full_name })) };
}

function unifiedDiff(path, before, after) {
  if (before === after) return "";
  const a = String(before || "").split("\n"); const b = String(after || "").split("\n");
  const lines = [`diff --git a/${path} b/${path}`, `--- a/${path}`, `+++ b/${path}`];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) { if (a[i] === b[i]) lines.push(` ${a[i] ?? ""}`); else { if (a[i] !== undefined) lines.push(`-${a[i]}`); if (b[i] !== undefined) lines.push(`+${b[i]}`); } }
  return lines.join("\n");
}

export async function stageChanges(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const changes = Array.isArray(input.changes) ? input.changes : [];
  if (!changes.length || changes.length > MAX_CHANGES) fail(`Provide between 1 and ${MAX_CHANGES} file changes.`);
  const normalized = [];
  for (const change of changes) {
    const path = validatePath(change.path); const action = ["create", "update", "delete"].includes(change.action) ? change.action : "update";
    if (action !== "delete" && Buffer.byteLength(String(change.content ?? ""), "utf8") > MAX_FILE_BYTES) fail(`${path} is too large.`);
    const current = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(chosen.branch)}`).catch((error) => {
      if (error?.status === 404) return null;
      throw error;
    });
    const before = current?.content ? Buffer.from(String(current.content).replace(/\n/g, ""), "base64").toString("utf8") : "";
    if (action !== "create" && !current) fail(`${path} does not exist on the selected branch.`, 404, "github_file_missing");
    if (action !== "create" && change.baseSha && change.baseSha !== current.sha) fail(`${path} changed before it was staged. Re-read it and try again.`, 409, "github_change_conflict");
    if (action === "create" && current) fail(`Cannot create ${path}; the file already exists.`, 409, "github_change_conflict");
    normalized.push({ path, action, before, content: action === "delete" ? null : String(change.content ?? ""), baseSha: change.baseSha ? String(change.baseSha) : (current?.sha || null) });
  }
  const id = crypto.randomUUID();
  await db.collection("github_agent_workspaces").doc(String(uid)).collection("changes").doc(id).set({ id, repo: chosen, changes: normalized, createdAt: Date.now(), expiresAt: Date.now() + WORKSPACE_TTL_MS, approvedAt: null, committedAt: null });
  await audit(uid, "stage_changes", { ...chosen, changeId: id, count: normalized.length });
  return { id, repo: chosen, changes: normalized.map(({ content, before, ...item }) => ({ ...item, contentBytes: content == null ? null : Buffer.byteLength(content) })), diff: normalized.map((item) => unifiedDiff(item.path, item.before || "", item.content || "")).filter(Boolean).join("\n") };
}

export async function getWorkspace(uid, id) {
  const snap = await db.collection("github_agent_workspaces").doc(String(uid)).collection("changes").doc(String(id)).get();
  if (!snap.exists || Date.now() > Number(snap.data()?.expiresAt || 0)) fail("That GitHub change workspace has expired.", 404, "github_workspace_expired");
  const data = snap.data();
  return { ...data, diff: (data.changes || []).map((item) => unifiedDiff(item.path, item.before || "", item.content || "")).filter(Boolean).join("\n") };
}

export async function approveWorkspace(uid, id) {
  const workspace = await getWorkspace(uid, id);
  if (workspace.repo.branch.toLowerCase() === "main" || workspace.repo.branch.toLowerCase() === "master") fail("Create a review branch before approving changes; protected default branches are never pushed implicitly.", 409, "github_protected_branch");
  await db.collection("github_agent_workspaces").doc(String(uid)).collection("changes").doc(String(id)).update({ approvedAt: Date.now(), approvedBy: String(uid) });
  await audit(uid, "approve_changes", { ...workspace.repo, changeId: id });
  return { id, approved: true, repo: workspace.repo };
}

export async function commitWorkspace(uid, id, input = {}) {
  const workspace = await getWorkspace(uid, id);
  if (!workspace.approvedAt) fail("Explicit approval is required before committing changes.", 403, "github_approval_required");
  const { connection, chosen } = await selected(uid, workspace.repo);
  ensureWritePermission(connection, chosen);
  if (chosen.branch.toLowerCase() === "main" || chosen.branch.toLowerCase() === "master") fail("Direct commits to main are blocked by the GitHub Agent.", 409, "github_protected_branch");
  const message = String(input.message || "COD\\NG: apply reviewed changes").trim().slice(0, 200); if (!message) fail("Commit message is required.");
  const ref = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/ref/heads/${encodeURIComponent(chosen.branch)}`);
  const baseCommit = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/commits/${ref.object.sha}`);
  const currentTree = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/trees/${baseCommit.tree.sha}?recursive=1`);
  const currentShas = new Map((currentTree.tree || []).filter((item) => item.type === "blob").map((item) => [item.path, item.sha]));
  const treeItems = [];
  for (const item of workspace.changes || []) {
    const currentSha = currentShas.get(item.path) || null;
    if (item.action === "create" && currentSha) fail(`Cannot create ${item.path}; the file already exists.`, 409, "github_change_conflict");
    if ((item.action === "update" || item.action === "delete") && (!item.baseSha || !currentSha || item.baseSha !== currentSha)) {
      fail(`${item.path} changed on GitHub after it was staged. Re-read it and stage the change again.`, 409, "github_change_conflict");
    }
    if (item.action === "delete") { treeItems.push({ path: item.path, mode: "100644", type: "blob", sha: null }); continue; }
    const blob = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/blobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: item.content || "", encoding: "utf-8" }) });
    treeItems.push({ path: item.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/trees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeItems }) });
  const commit = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/commits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommit.sha] }) });
  await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/git/refs/heads/${encodeURIComponent(chosen.branch)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sha: commit.sha, force: false }) });
  await db.collection("github_agent_workspaces").doc(String(uid)).collection("changes").doc(String(id)).update({ committedAt: Date.now(), commitSha: commit.sha, commitUrl: commit.html_url, status: "committed" });
  await audit(uid, "commit_changes", { ...chosen, changeId: id, commitSha: commit.sha, commitUrl: commit.html_url });
  return { status: "committed", commitSha: commit.sha, commitUrl: commit.html_url, branch: chosen.branch };
}

export async function getHistory(uid, input = {}) {
  const { connection, chosen } = await selected(uid, input);
  const branch = validateRef(input.branch || chosen.branch);
  const commits = await githubRequest(connection.token, `/repos/${chosen.owner}/${chosen.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=30`);
  await audit(uid, "read_history", { ...chosen, branch });
  return (commits || []).map((commit) => ({ sha: commit.sha, message: commit.commit?.message || "", author: commit.commit?.author?.name || "", date: commit.commit?.author?.date || null, htmlUrl: commit.html_url }));
}

export async function detectTests(uid, input = {}) {
  const packageFile = await readFile(uid, { ...input, path: "package.json" }).catch(() => null);
  const scripts = packageFile ? JSON.parse(packageFile.content)?.scripts || {} : {};
  const candidates = ["test", "check", "lint", "build"].filter((name) => scripts[name]);
  await audit(uid, "inspect_tests", { ...(input.owner ? validateRepo(input.owner, input.repo) : {}), candidates });
  return { executable: false, reason: "Tests are not executed on the production server. Run the reported command in a sandbox or GitHub Actions workflow after review.", packageScripts: scripts, candidates };
}
