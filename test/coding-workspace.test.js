import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanupExpiredCodingWorkspaceFiles, codingWorkspace, resolveCodingWorkspaceFile, withCodingWorkspaceLock, writeCodingWorkspaceArchives, writeCodingWorkspaceFiles } from "../services/coding-workspace.js";

async function withWorkspaceRoot(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stream-coding-workspaces-"));
  const previous = process.env.CODING_EXECUTION_ROOT;
  process.env.CODING_EXECUTION_ROOT = root;
  try { await run(root); }
  finally {
    if (previous === undefined) delete process.env.CODING_EXECUTION_ROOT;
    else process.env.CODING_EXECUTION_ROOT = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("coding workspaces are private per authenticated user and conversation", async () => {
  await withWorkspaceRoot(async () => {
    const alice = await codingWorkspace("alice", "chat-1");
    const bob = await codingWorkspace("bob", "chat-1");
    const aliceOtherChat = await codingWorkspace("alice", "chat-2");
    assert.notEqual(alice, bob);
    assert.notEqual(alice, aliceOtherChat);
    assert.equal((await fs.stat(alice)).mode & 0o777, 0o700);
    await writeCodingWorkspaceFiles("alice", "chat-1", [{ name: "src/main.js", data: Buffer.from("export const answer = 42;\n") }]);
    const resolved = await resolveCodingWorkspaceFile("alice", "chat-1", "src/main.js");
    assert.equal(await fs.readFile(resolved.filePath, "utf8"), "export const answer = 42;\n");
    await assert.rejects(() => resolveCodingWorkspaceFile("bob", "chat-1", "src/main.js"), (error) => error.code === "coding_workspace_file_not_found");
    await assert.rejects(() => resolveCodingWorkspaceFile("alice", "chat-2", "src/main.js"), (error) => error.code === "coding_workspace_file_not_found");
  });
});

test("coding workspace rejects traversal and symlink-based cross-user access", async () => {
  await withWorkspaceRoot(async () => {
    const alice = await codingWorkspace("alice", "chat-1");
    const bob = await codingWorkspace("bob", "chat-1");
    await fs.writeFile(path.join(bob, "private.js"), "const secret = true;\n");
    await assert.rejects(() => writeCodingWorkspaceFiles("alice", "chat-1", [{ name: "../outside.js", data: Buffer.from("bad") }]), (error) => error.code === "coding_workspace_invalid_path");
    await assert.rejects(() => writeCodingWorkspaceFiles("alice", "chat-1", [
      { name: "blocked", data: Buffer.from("first") },
      { name: "blocked/child.js", data: Buffer.from("second") },
    ]), (error) => error.code === "coding_workspace_invalid_path");
    await assert.rejects(() => fs.stat(path.join(alice, "blocked")), (error) => error.code === "ENOENT");
    await fs.symlink(bob, path.join(alice, "foreign"));
    await assert.rejects(() => writeCodingWorkspaceFiles("alice", "chat-1", [{ name: "foreign/stolen.js", data: Buffer.from("bad") }]), (error) => error.code === "coding_workspace_invalid_path");
    await fs.symlink(path.join(bob, "private.js"), path.join(alice, "leak.js"));
    await assert.rejects(() => resolveCodingWorkspaceFile("alice", "chat-1", "leak.js"), (error) => error.code === "coding_workspace_invalid_path");
    assert.equal(await fs.readFile(path.join(bob, "private.js"), "utf8"), "const secret = true;\n");
  });
});

test("coding workspace root must be configured as an absolute dedicated path", async () => {
  const previous = process.env.CODING_EXECUTION_ROOT;
  try {
    delete process.env.CODING_EXECUTION_ROOT;
    await assert.rejects(() => codingWorkspace("alice", "chat-1"), (error) => error.code === "coding_workspace_unavailable");
    process.env.CODING_EXECUTION_ROOT = "relative/workspace";
    await assert.rejects(() => codingWorkspace("alice", "chat-1"), (error) => error.code === "coding_workspace_invalid_root");
  } finally {
    if (previous === undefined) delete process.env.CODING_EXECUTION_ROOT;
    else process.env.CODING_EXECUTION_ROOT = previous;
  }
});

test("ZIP-extracted upload copies expire after 24 hours without storing their contents in metadata", async () => {
  await withWorkspaceRoot(async (root) => {
    const workspace = await codingWorkspace("alice", "chat-upload");
    await writeCodingWorkspaceArchives("alice", "chat-upload", [{ files: [{ name: "src/upload.js", data: Buffer.from("export const temporary = true;\n") }] }]);
    const marker = path.join(os.tmpdir(), "es-teams-coding-workspace-expiry", `user-${crypto.createHash("sha256").update("alice").digest("hex")}`, `conversation-${crypto.createHash("sha256").update("chat-upload").digest("hex")}.json`);
    const metadata = JSON.parse(await fs.readFile(marker, "utf8"));
    assert.deepEqual(Object.keys(metadata.files[0]).sort(), ["expiresAt", "path"]);
    assert.equal(JSON.stringify(metadata).includes("temporary = true"), false);
    const filePath = path.join(workspace, "src/upload.js");
    assert.equal(await fs.readFile(filePath, "utf8"), "export const temporary = true;\n");
    metadata.files[0].expiresAt = 0;
    await fs.writeFile(marker, JSON.stringify(metadata));
    assert.equal(await cleanupExpiredCodingWorkspaceFiles({ root, now: 1 }), 1);
    await assert.rejects(fs.stat(filePath), (error) => error.code === "ENOENT");
    await assert.rejects(fs.stat(marker), (error) => error.code === "ENOENT");
  });
});

test("coding workspace command and extraction operations serialize per conversation", async () => {
  const sequence = [];
  let releaseFirst;
  let firstStarted;
  const started = new Promise((resolve) => { firstStarted = resolve; });
  const blocked = new Promise((resolve) => { releaseFirst = resolve; });
  const first = withCodingWorkspaceLock("alice", "chat-1", async () => {
    sequence.push("command-start");
    firstStarted();
    await blocked;
    sequence.push("command-end");
  });
  await started;
  const second = withCodingWorkspaceLock("alice", "chat-1", async () => { sequence.push("extract"); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sequence, ["command-start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(sequence, ["command-start", "command-end", "extract"]);
});
