import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { executeCodingCommand } from "../services/coding-command.js";
import { codingWorkspace } from "../services/coding-workspace.js";

const bubblewrapAvailable = spawnSync(process.env.CODING_SANDBOX_BIN || "bwrap", ["--version"], { encoding: "utf8" }).status === 0;

function activityMock(events) {
  return { operation: async (type, description, details, work) => { events.push({ type, description, details }); return work(); } };
}

async function withWorkspaceRoot(run) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stream-coding-command-"));
  const previous = process.env.CODING_EXECUTION_ROOT;
  process.env.CODING_EXECUTION_ROOT = root;
  try { await run(root); }
  finally {
    if (previous === undefined) delete process.env.CODING_EXECUTION_ROOT;
    else process.env.CODING_EXECUTION_ROOT = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("coding command requires explicit approval and rejects arbitrary tools", async () => {
  await assert.rejects(() => executeCodingCommand({ input: { tool: "shell", command: "id" }, activity: activityMock([]) }), (error) => error.code === "coding_command_approval_required");
  await assert.rejects(() => executeCodingCommand({ input: { tool: "node_check", path: "valid.js", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_user_required");
  await assert.rejects(() => executeCodingCommand({ uid: "user-a", input: { tool: "shell", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_not_allowed");
});

test("coding command runs node checks inside the authenticated user's conversation workspace", { skip: !bubblewrapAvailable && "Bubblewrap is not installed in this test environment" }, async () => {
  await withWorkspaceRoot(async () => {
    const workspaceA = await codingWorkspace("user-a", "chat-a");
    await fs.writeFile(path.join(workspaceA, "valid.js"), "const answer = 42;\n");
    const events = [];
    const result = await executeCodingCommand({ uid: "user-a", input: { tool: "node_check", path: "valid.js", conversationId: "chat-a" }, approved: true, activity: activityMock(events), signal: new AbortController().signal });
    assert.equal(result.exitCode, 0);
    assert.equal(result.tool, "node_check");
    assert.equal(result.cwd, "user workspace");
    assert.equal(events[0].type, "command.exec");
    await assert.rejects(() => executeCodingCommand({ uid: "user-a", input: { tool: "node_check", path: "../outside.js", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_invalid_path");
    await assert.rejects(() => executeCodingCommand({ uid: "user-b", input: { tool: "node_check", path: "valid.js", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_workspace_file_not_found");
  });
});

test("coding command rejects symbolic links that point outside the authenticated workspace", async () => {
  await withWorkspaceRoot(async (root) => {
    const workspaceA = await codingWorkspace("user-a", "chat-a");
    const workspaceB = await codingWorkspace("user-b", "chat-a");
    const privateFile = path.join(workspaceB, "private.js");
    await fs.writeFile(privateFile, "const privateValue = true;\n");
    await fs.symlink(privateFile, path.join(workspaceA, "leak.js"));
    const check = executeCodingCommand({ uid: "user-a", input: { tool: "node_check", path: "leak.js", conversationId: "chat-a" }, approved: true, activity: activityMock([]) });
    await assert.rejects(check, (error) => error.code === "coding_workspace_invalid_path");
    assert.equal(await fs.readFile(privateFile, "utf8"), "const privateValue = true;\n");
    assert.ok(root);
  });
});

test("approved npm tests cannot read or modify another user's workspace", { skip: !bubblewrapAvailable && "Bubblewrap is not installed in this test environment" }, async () => {
  await withWorkspaceRoot(async () => {
    const workspaceA = await codingWorkspace("user-a", "chat-a");
    const workspaceB = await codingWorkspace("user-b", "chat-a");
    const privateFile = path.join(workspaceB, "private.txt");
    await fs.writeFile(privateFile, "private user data\n");
    await fs.writeFile(path.join(workspaceA, "package.json"), JSON.stringify({ scripts: { test: "node test.js" } }));
    const script = [
      "const fs = require('node:fs');",
      `const privateFile = ${JSON.stringify(privateFile)};`,
      "let leaked = false; let modified = false;",
      "try { fs.readFileSync(privateFile); leaked = true; } catch {}",
      "try { fs.writeFileSync(privateFile, 'modified'); modified = true; } catch {}",
      "if (leaked || modified) process.exit(9);",
      "console.log('other user workspace is unavailable');",
    ].join("\n");
    await fs.writeFile(path.join(workspaceA, "test.js"), script);
    const result = await executeCodingCommand({ uid: "user-a", input: { tool: "npm_test", conversationId: "chat-a" }, approved: true, activity: activityMock([]) });
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /other user workspace is unavailable/);
    assert.equal(await fs.readFile(privateFile, "utf8"), "private user data\n");
  });
});

test("coding command fails closed when the sandbox executable is unavailable", async () => {
  const previousSandbox = process.env.CODING_SANDBOX_BIN;
  process.env.CODING_SANDBOX_BIN = "/missing/coding-sandbox";
  try {
    await withWorkspaceRoot(async () => {
      const workspace = await codingWorkspace("user-a", "chat-a");
      await fs.writeFile(path.join(workspace, "valid.js"), "const answer = 42;\n");
      await assert.rejects(
        () => executeCodingCommand({ uid: "user-a", input: { tool: "node_check", path: "valid.js", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }),
        (error) => error.code === "coding_command_sandbox_unavailable" && error.status === 503,
      );
    });
  } finally {
    if (previousSandbox === undefined) delete process.env.CODING_SANDBOX_BIN;
    else process.env.CODING_SANDBOX_BIN = previousSandbox;
  }
});

test("coding command only permits validation npm scripts", async () => {
  await assert.rejects(() => executeCodingCommand({ uid: "user-a", input: { tool: "npm_script", script: "start", conversationId: "chat-a" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_script_not_allowed");
});
