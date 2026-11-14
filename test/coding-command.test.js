import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { executeCodingCommand } from "../services/coding-command.js";

async function workspace() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "stream-coding-command-"));
  await fs.writeFile(path.join(root, "valid.js"), "const answer = 42;\n");
  return root;
}

function activityMock(events) {
  return { operation: async (type, description, details, work) => { events.push({ type, description, details }); return work(); } };
}

test("coding command requires explicit approval and rejects arbitrary tools", async () => {
  await assert.rejects(() => executeCodingCommand({ input: { tool: "shell", command: "id" }, activity: activityMock([]) }), (error) => error.code === "coding_command_approval_required");
  await assert.rejects(() => executeCodingCommand({ input: { tool: "shell" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_not_allowed");
});

test("coding command confines node checks to relative paths and executes the real process", async () => {
  const root = await workspace();
  const previous = process.env.CODING_EXECUTION_ROOT;
  process.env.CODING_EXECUTION_ROOT = root;
  try {
    const events = [];
    const result = await executeCodingCommand({ input: { tool: "node_check", path: "valid.js" }, approved: true, activity: activityMock(events), signal: new AbortController().signal });
    assert.equal(result.exitCode, 0);
    assert.equal(result.tool, "node_check");
    assert.equal(events[0].type, "command.exec");
    await assert.rejects(() => executeCodingCommand({ input: { tool: "node_check", path: "../outside.js" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_invalid_path");
  } finally {
    if (previous === undefined) delete process.env.CODING_EXECUTION_ROOT;
    else process.env.CODING_EXECUTION_ROOT = previous;
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("coding command only permits validation npm scripts", async () => {
  await assert.rejects(() => executeCodingCommand({ input: { tool: "npm_script", script: "start" }, approved: true, activity: activityMock([]) }), (error) => error.code === "coding_command_script_not_allowed");
});
