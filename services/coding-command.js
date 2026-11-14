import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { codingWorkspacePaths, resolveCodingWorkspaceFile, withCodingWorkspaceLock } from "./coding-workspace.js";

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

function redactedOutput(value) {
  return String(value || "").slice(0, MAX_OUTPUT_CHARS)
    .replace(/(authorization|cookie|x-api-key|api[-_ ]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function sandboxExecutable() {
  const configured = String(process.env.CODING_SANDBOX_BIN || "bwrap").trim();
  const candidates = path.isAbsolute(configured)
    ? [configured]
    : (process.env.PATH || "/usr/local/bin:/usr/bin:/bin").split(path.delimiter).filter(Boolean).map((directory) => path.join(directory, configured));
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) {
        fs.accessSync(candidate, fs.constants.X_OK);
        return candidate;
      }
    } catch {}
  }
  fail("The command sandbox is unavailable. Install Bubblewrap in the service runtime before enabling command execution.", 503, "coding_command_sandbox_unavailable");
}

function sandboxArgs({ root, workspace, executable, args }) {
  if (!isWithin(root, workspace) || root === workspace) {
    fail("The configured workspace root cannot be safely isolated.", 503, "coding_workspace_invalid_root");
  }
  const sandboxWorkspace = ["/mnt", "/var/tmp", "/tmp"].find((candidate) => {
    if (isWithin(root, candidate) || isWithin(candidate, root)) return false;
    try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
  });
  if (!sandboxWorkspace) fail("No safe Bubblewrap mountpoint is available.", 503, "coding_command_sandbox_unavailable");
  const runtimeRoot = path.dirname(path.dirname(process.execPath));
  if (!path.isAbsolute(runtimeRoot) || isWithin(root, runtimeRoot) || isWithin(runtimeRoot, root)) fail("The configured workspace root overlaps the command runtime.", 503, "coding_workspace_invalid_root");
  const runtimeMount = ["/opt", "/usr/local"].find((candidate) => {
    if (isWithin(runtimeRoot, candidate) || isWithin(candidate, runtimeRoot) || isWithin(root, candidate) || isWithin(candidate, root)) return false;
    try { return fs.statSync(candidate).isDirectory(); } catch { return false; }
  });
  if (!runtimeMount) fail("No safe runtime mountpoint is available for command isolation.", 503, "coding_command_sandbox_unavailable");
  const remapRuntimeExecutable = (hostPath) => {
    const relative = path.relative(runtimeRoot, hostPath);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail("The command executable is outside the isolated runtime.", 503, "coding_command_sandbox_unavailable");
    return path.join(runtimeMount, relative);
  };
  let sandboxExecutablePath = executable;
  if (executable === process.execPath) sandboxExecutablePath = remapRuntimeExecutable(process.execPath);
  else if (executable === "npm") {
    const npmPath = path.join(runtimeRoot, "bin", "npm");
    if (!fs.existsSync(npmPath)) fail("The isolated Node runtime does not include npm.", 503, "coding_command_sandbox_unavailable");
    sandboxExecutablePath = remapRuntimeExecutable(npmPath);
  }
  const runtimePath = [path.join(runtimeMount, "bin"), "/usr/local/bin", "/usr/bin", "/bin"].filter((item, index, values) => values.indexOf(item) === index).join(path.delimiter);
  const result = [
    "--die-with-parent", "--new-session", "--unshare-all",
    "--ro-bind", "/", "/",
    "--bind", workspace, sandboxWorkspace,
    "--tmpfs", root,
    "--ro-bind", runtimeRoot, runtimeMount,
  ];
  for (const sensitiveDirectory of ["/home", "/root", "/tmp", "/var/tmp", "/etc/secrets", "/run/secrets"]) {
    try {
      if (sensitiveDirectory !== sandboxWorkspace && sensitiveDirectory !== root && fs.statSync(sensitiveDirectory).isDirectory()) result.push("--tmpfs", sensitiveDirectory);
    } catch {}
  }
  result.push("--proc", "/proc", "--dev", "/dev", "--chdir", sandboxWorkspace, "--clearenv", "--setenv", "PATH", runtimePath,
    "--setenv", "HOME", sandboxWorkspace, "--setenv", "TMPDIR", "/tmp", "--setenv", "NPM_CONFIG_CACHE", "/tmp/npm-cache",
    "--setenv", "NODE_ENV", "test", "--setenv", "CI", "1", "--", sandboxExecutablePath, ...args);
  return result;
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

export function commandWorkspace(uid, conversationId) {
  return codingWorkspacePaths(uid, conversationId).then(({ workspace }) => workspace);
}

export async function executeCodingCommand(options = {}) {
  const uid = options.uid;
  const input = options.input || {};
  const activity = options.activity;
  const approved = options.approved === true;
  const signal = options.signal;
  if (approved !== true) fail("Explicit approval is required before running a command.", 403, "coding_command_approval_required");
  if (!activity?.operation) fail("A live activity run is required for command execution.", 400, "coding_command_activity_required");
  if (!String(uid || "").trim()) fail("A signed-in user is required for command execution.", 401, "coding_command_user_required");
  return withCodingWorkspaceLock(uid, input.conversationId, () => executeCodingCommandLocked({ uid, input, activity, signal }));
}

async function executeCodingCommandLocked({ uid, input, activity, signal }) {
  const command = resolveCommand(input);
  const { root, workspace: cwd } = await codingWorkspacePaths(uid, input.conversationId);
  const args = command.tool === "node_check"
    ? ["--check", (await resolveCodingWorkspaceFile(uid, input.conversationId, input.path)).relativePath]
    : command.args;
  const sandbox = sandboxExecutable();
  const sandboxArguments = sandboxArgs({ root, workspace: cwd, executable: command.executable, args });
  const timeoutMs = Math.min(MAX_TIMEOUT_MS, Math.max(1000, Number(input.timeoutMs) || DEFAULT_TIMEOUT_MS));
  if (signal?.aborted) fail("The command was cancelled.", 499, "coding_command_cancelled");
  const result = await activity.operation("command.exec", command.label, { tool: command.tool, command: command.display, timeoutMs }, () => new Promise((resolve, reject) => {
    const child = spawn(sandbox, sandboxArguments, {
      cwd,
      shell: false,
      detached: process.platform !== "win32",
      windowsHide: true,
      env: {},
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
      const output = { tool: command.tool, command: command.display, cwd: "user workspace", exitCode: code, signal: exitSignal || null, timedOut, stdout: redactedOutput(stdout), stderr: redactedOutput(stderr) };
      if (timedOut) reject(Object.assign(new Error("The command exceeded the execution time limit."), { code: "coding_command_timeout", status: 408, output }));
      else if (code !== 0 && /^bwrap:/i.test(String(stderr).trim())) reject(Object.assign(new Error("The command sandbox could not start in this environment."), { code: "coding_command_sandbox_failed", status: 503, output }));
      else if (code !== 0) reject(Object.assign(new Error("The command failed validation."), { code: "coding_command_failed", status: 422, output }));
      else resolve(output);
    });
  }));
  return result;
}

export const codingCommandLimits = { MAX_OUTPUT_CHARS, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, SAFE_TOOLS: [...SAFE_TOOLS] };
