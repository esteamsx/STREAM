import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const MAX_OUTPUT_CHARS = 64_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;
const SAFE_SCRIPT_NAMES = new Set(["test", "check", "lint", "build"]);
const SAFE_TOOLS = new Set(["node_check", "npm_test", "npm_script", "git_diff_check"]);

function fail(message, status = 400, code = "coding_command_error") {
  throw Object.assign(new Error(message), { status, code });
}

function safeRelativePath(value) {
  const input = String(value || "").trim();
  if (!input || input.length > 240 || input.includes("\0") || path.isAbsolute(input)) fail("Choose a relative source-file path.", 400, "coding_command_invalid_path");
  const normalized = path.posix.normalize(input.replaceAll("\\", "/"));
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../") || normalized.startsWith("/")) fail("That command path is outside the coding workspace.", 400, "coding_command_invalid_path");
  return normalized;
}

function configuredRoot() {
  const raw = String(process.env.CODING_EXECUTION_ROOT || "").trim();
  if (!raw) fail("Command execution is not configured for this environment.", 503, "coding_command_unavailable");
  const root = path.resolve(raw);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) fail("The coding execution workspace is unavailable.", 503, "coding_command_unavailable");
  return root;
}

function redactedOutput(value) {
  return String(value || "").slice(0, MAX_OUTPUT_CHARS)
    .replace(/(authorization|cookie|x-api-key|api[-_ ]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function resolveCommand(input = {}) {
  const tool = String(input.tool || "").trim();
  if (!SAFE_TOOLS.has(tool)) fail("That command tool is not permitted.", 400, "coding_command_not_allowed");
  if (tool === "node_check") {
    const file = safeRelativePath(input.path);
    return { tool, label: `Checking ${file}.`, executable: process.execPath, args: ["--check", file], display: `${process.execPath} --check ${file}` };
  }
  if (tool === "npm_test") return { tool, label: "Running the project test suite.", executable: process.platform === "win32" ? "npm.cmd" : "npm", args: ["test"], display: "npm test" };
  if (tool === "npm_script") {
    const script = String(input.script || "").trim();
    if (!SAFE_SCRIPT_NAMES.has(script)) fail("Only approved validation scripts can be run.", 400, "coding_command_script_not_allowed");
    return { tool, label: `Running the ${script} script.`, executable: process.platform === "win32" ? "npm.cmd" : "npm", args: ["run", script], display: `npm run ${script}` };
  }
  return { tool, label: "Checking the Git diff.", executable: "git", args: ["diff", "--check"], display: "git diff --check" };
}

export function commandWorkspace() {
  return configuredRoot();
}

export async function executeCodingCommand({ input = {}, activity, approved = false, signal } = {}) {
  if (approved !== true) fail("Explicit approval is required before running a command.", 403, "coding_command_approval_required");
  if (!activity?.operation) fail("A live activity run is required for command execution.", 400, "coding_command_activity_required");
  const command = resolveCommand(input);
  const cwd = configuredRoot();
  const timeoutMs = Math.min(MAX_TIMEOUT_MS, Math.max(1000, Number(input.timeoutMs) || DEFAULT_TIMEOUT_MS));
  if (signal?.aborted) fail("The command was cancelled.", 499, "coding_command_cancelled");
  const result = await activity.operation("command.exec", command.label, { tool: command.tool, command: command.display, timeoutMs }, () => new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, {
      cwd,
      shell: false,
      detached: process.platform !== "win32",
      windowsHide: true,
      env: { PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin", NODE_ENV: "test", HOME: os.homedir(), CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const terminate = () => {
      if (process.platform !== "win32" && child.pid) { try { process.kill(-child.pid, "SIGKILL"); } catch {} }
      else child.kill("SIGKILL");
    };
    signal?.addEventListener("abort", terminate, { once: true });
    const append = (target, chunk) => {
      const next = target + String(chunk || "");
      return next.length > MAX_OUTPUT_CHARS ? next.slice(0, MAX_OUTPUT_CHARS) : next;
    };
    child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); signal?.removeEventListener("abort", terminate); reject(Object.assign(new Error("The approved command could not be started."), { cause: error, code: "coding_command_start_failed" })); });
    child.once("close", (code, exitSignal) => {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", terminate);
      const output = { tool: command.tool, command: command.display, cwd: path.basename(cwd), exitCode: code, signal: exitSignal || null, timedOut, stdout: redactedOutput(stdout), stderr: redactedOutput(stderr) };
      if (timedOut) reject(Object.assign(new Error("The command exceeded the execution time limit."), { code: "coding_command_timeout", status: 408, output }));
      else if (code !== 0) reject(Object.assign(new Error("The command failed validation."), { code: "coding_command_failed", status: 422, output }));
      else resolve(output);
    });
  }));
  return result;
}

export const codingCommandLimits = { MAX_OUTPUT_CHARS, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, SAFE_TOOLS: [...SAFE_TOOLS] };
