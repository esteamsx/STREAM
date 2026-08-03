import express from "express";
import dns from "node:dns/promises";
import tls from "node:tls";
import net from "node:net";
import crypto from "node:crypto";
import { Worker } from "node:worker_threads";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifySolution } from "altcha-lib";
import QRCode from "qrcode";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { optionalAuth, isAdminEmail } from "../services/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

const ALTCHA_HMAC_KEY = process.env.ALTCHA_SECRET;

async function verifyCaptcha(payload) {
  if (!payload) return false;
  try {
    return !!(await verifySolution(payload, ALTCHA_HMAC_KEY));
  } catch {
    return false;
  }
}

const TOOL_DAILY_LIMIT = 3;
const TOOL_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function toolGate(toolName) {
  const limiter = new SimpleRateLimiter(
    TOOL_DAILY_LIMIT,
    TOOL_LIMIT_WINDOW_MS,
    (req) => `${req.uid || req.ip}:${toolName}`,
    `You've used this tool ${TOOL_DAILY_LIMIT} times today. Verified accounts get unlimited use — otherwise, try again in 24 hours.`
  );
  const limiterMw = limiter.middleware();
  return async (req, res, next) => {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const profile = req.userProfile;
    const privileged = !!(profile && (isAdminEmail(profile.email) || profile.verified));
    if (privileged) return next();
    return limiterMw(req, res, next);
  };
}

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function cleanDomain(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

// ── DNS Lookup ──────────────────────────────────────────────
const DNS_RESOLVERS = {
  A: (d) => dns.resolve4(d),
  AAAA: (d) => dns.resolve6(d),
  MX: (d) => dns.resolveMx(d),
  TXT: (d) => dns.resolveTxt(d),
  NS: (d) => dns.resolveNs(d),
  CNAME: (d) => dns.resolveCname(d),
  SOA: (d) => dns.resolveSoa(d),
};

router.post("/api/tools/dns-lookup", optionalAuth, toolGate("dns-lookup"), async (req, res) => {
  const domain = cleanDomain(req.body?.domain);
  const type = String(req.body?.type || "A").toUpperCase();
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: "Enter a valid domain name." });
  const resolver = DNS_RESOLVERS[type];
  if (!resolver) return res.status(400).json({ error: "Unsupported record type." });
  try {
    const records = await resolver(domain);
    res.json({ domain, type, records });
  } catch (err) {
    const notFound = err.code === "ENOTFOUND" || err.code === "ENODATA";
    res.status(notFound ? 404 : 500).json({ error: notFound ? `No ${type} records found for that domain.` : "Lookup failed." });
  }
});

// ── JavaScript Obfuscator ───────────────────────────────────
const MAX_OBFUSCATE_LENGTH = 20 * 1024 * 1024; // 20MB
const OBFUSCATE_WORKER_TIMEOUT_MS = 120000;

function obfuscateInWorker(code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "tools-obfuscate-worker.js"), {
      workerData: {
        code,
        options: {
          compact: true,
          controlFlowFlattening: true,
          stringArray: true,
          stringArrayEncoding: ["base64"],
          selfDefending: true,
        },
      },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("That file took too long to obfuscate — try a smaller file."));
    }, OBFUSCATE_WORKER_TIMEOUT_MS);
    worker.once("message", (msg) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg.ok) resolve(msg.code);
      else reject(new Error(msg.error || "Could not obfuscate that code — check it's valid JavaScript."));
    });
    worker.once("error", (err) => {
      clearTimeout(timer);
      reject(new Error(err.message || "Could not obfuscate that code."));
    });
  });
}

router.post("/api/tools/obfuscate", optionalAuth, toolGate("obfuscate"), async (req, res) => {
  const code = String(req.body?.code || "");
  if (!code.trim()) return res.status(400).json({ error: "Paste or upload some JavaScript code first." });
  if (code.length > MAX_OBFUSCATE_LENGTH) {
    return res.status(400).json({ error: "File is too large (max 20MB)." });
  }
  try {
    const obfuscatedCode = await obfuscateInWorker(code);
    res.json({ code: obfuscatedCode });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not obfuscate that code — check it's valid JavaScript." });
  }
});

// ── QR Code Generator ───────────────────────────────────────
router.post("/api/tools/qr-code", optionalAuth, toolGate("qr-code"), async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Enter some text or a URL first." });
  if (text.length > 2000) return res.status(400).json({ error: "Text is too long (max 2,000 characters)." });
  try {
    const dataUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 2, width: 400 });
    res.json({ dataUrl });
  } catch {
    res.status(400).json({ error: "Could not generate a QR code for that input." });
  }
});

// ── SSL Certificate Checker ─────────────────────────────────
function checkSslCertificate(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 8000 }, () => {
      const cert = socket.getPeerCertificate();
      const authorized = socket.authorized;
      const authorizationError = socket.authorizationError || null;
      socket.end();
      if (!cert || !Object.keys(cert).length) return reject(new Error("No certificate returned by that host."));
      resolve({
        subject: cert.subject,
        issuer: cert.issuer,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysRemaining: Math.ceil((new Date(cert.valid_to).getTime() - Date.now()) / 86400000),
        fingerprint: cert.fingerprint256 || cert.fingerprint || null,
        authorized,
        authorizationError,
      });
    });
    socket.on("timeout", () => { socket.destroy(); reject(new Error("Connection timed out.")); });
    socket.on("error", (err) => reject(new Error(err.code === "ENOTFOUND" ? "Could not resolve that domain." : "Could not connect on port 443.")));
  });
}

router.post("/api/tools/ssl-check", optionalAuth, toolGate("ssl-check"), async (req, res) => {
  const domain = cleanDomain(req.body?.domain);
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: "Enter a valid domain name." });
  try {
    const result = await checkSslCertificate(domain);
    res.json({ domain, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not check that certificate." });
  }
});

// ── WHOIS Lookup ─────────────────────────────────────────────
function whoisQuery(server, query) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: server, port: 43 }, () => {
      socket.write(query + "\r\n");
    });
    let data = "";
    socket.setTimeout(8000);
    socket.on("data", (chunk) => { data += chunk.toString("utf8"); });
    socket.on("end", () => resolve(data));
    socket.on("timeout", () => { socket.destroy(); reject(new Error("WHOIS lookup timed out.")); });
    socket.on("error", () => reject(new Error("WHOIS lookup failed.")));
  });
}

async function lookupWhois(domain) {
  const ianaResult = await whoisQuery("whois.iana.org", domain);
  const referMatch = ianaResult.match(/refer:\s*(\S+)/i);
  const server = referMatch ? referMatch[1] : null;
  if (!server || server === "whois.iana.org") return ianaResult;
  return whoisQuery(server, domain);
}

router.post("/api/tools/whois", optionalAuth, toolGate("whois"), async (req, res) => {
  const domain = cleanDomain(req.body?.domain);
  if (!DOMAIN_RE.test(domain)) return res.status(400).json({ error: "Enter a valid domain name." });
  try {
    const raw = await lookupWhois(domain);
    res.json({ domain, raw: raw.trim() || "No WHOIS data returned for that domain." });
  } catch (err) {
    res.status(400).json({ error: err.message || "WHOIS lookup failed." });
  }
});

// ── Base64 Encode / Decode ──────────────────────────────────
router.post("/api/tools/base64", optionalAuth, toolGate("base64"), async (req, res) => {
  const input = String(req.body?.input ?? "");
  const mode = req.body?.mode === "decode" ? "decode" : "encode";
  if (input.length > 100000) return res.status(400).json({ error: "Input is too long (max 100,000 characters)." });
  try {
    if (mode === "encode") {
      res.json({ output: Buffer.from(input, "utf8").toString("base64") });
    } else {
      res.json({ output: Buffer.from(input, "base64").toString("utf8") });
    }
  } catch {
    res.status(400).json({ error: "Could not process that input." });
  }
});

// ── JWT Decoder ──────────────────────────────────────────────
router.post("/api/tools/jwt-decode", optionalAuth, toolGate("jwt-decode"), async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const parts = token.split(".");
  if (parts.length < 2) return res.status(400).json({ error: "That doesn't look like a valid JWT." });
  try {
    const decodePart = (part) => JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    const header = decodePart(parts[0]);
    const payload = decodePart(parts[1]);
    res.json({ header, payload, signaturePresent: parts.length === 3 && !!parts[2] });
  } catch {
    res.status(400).json({ error: "Could not decode that token — check it's a valid JWT." });
  }
});

// ── JSON Formatter ───────────────────────────────────────────
router.post("/api/tools/json-format", optionalAuth, toolGate("json-format"), async (req, res) => {
  const input = String(req.body?.input || "");
  if (input.length > 200000) return res.status(400).json({ error: "Input is too long (max 200,000 characters)." });
  try {
    const parsed = JSON.parse(input);
    res.json({ output: JSON.stringify(parsed, null, 2) });
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON: " + err.message });
  }
});

// ── Fancy Text Generator ─────────────────────────────────────
const FT_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const FT_LOWER = "abcdefghijklmnopqrstuvwxyz";
const FT_DIGITS = "0123456789";

function ftBuildBlock(upperBase, lowerBase, digitBase, exceptions = {}) {
  const map = {};
  for (let i = 0; i < 26; i++) {
    const u = FT_UPPER[i], l = FT_LOWER[i];
    map[u] = exceptions[u] || String.fromCodePoint(upperBase + i);
    map[l] = exceptions[l] || String.fromCodePoint(lowerBase + i);
  }
  if (digitBase != null) {
    for (let i = 0; i < 10; i++) map[FT_DIGITS[i]] = String.fromCodePoint(digitBase + i);
  }
  return map;
}

function ftApply(str, map) {
  return Array.from(str).map((ch) => map[ch] || ch).join("");
}

const FT_STYLES = [
  { name: "Bold", map: ftBuildBlock(0x1d400, 0x1d41a, 0x1d7ce) },
  { name: "Italic", map: ftBuildBlock(0x1d434, 0x1d44e, null, { h: "ℎ" }) },
  { name: "Bold Italic", map: ftBuildBlock(0x1d468, 0x1d482, null) },
  {
    name: "Script",
    map: ftBuildBlock(0x1d49c, 0x1d4b6, null, {
      B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ",
      e: "ℯ", g: "ℊ", o: "ℴ",
    }),
  },
  {
    name: "Fraktur",
    map: ftBuildBlock(0x1d504, 0x1d51e, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" }),
  },
  {
    name: "Double-Struck",
    map: ftBuildBlock(0x1d538, 0x1d552, 0x1d7d8, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" }),
  },
  { name: "Monospace", map: ftBuildBlock(0x1d670, 0x1d68a, 0x1d7f6) },
  {
    name: "Circled",
    map: (() => {
      const map = ftBuildBlock(0x24b6, 0x24d0, null);
      for (let i = 1; i <= 9; i++) map[FT_DIGITS[i]] = String.fromCodePoint(0x2460 + (i - 1));
      map["0"] = "⓪";
      return map;
    })(),
  },
  {
    name: "Small Caps",
    map: (() => {
      const table = {
        a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
        k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ",
        u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
      };
      const map = {};
      for (const [k, v] of Object.entries(table)) { map[k] = v; map[k.toUpperCase()] = v; }
      return map;
    })(),
  },
];

const FT_UPSIDE_DOWN_TABLE = {
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ı", j: "ɾ",
  k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ",
  u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "Ʀ", "6": "9", "7": "ㄥ", "8": "8", "9": "6",
  ".": "˙", ",": "'", "'": ",", '"': ",,", "!": "¡", "?": "¿",
  "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "_": "‾", ";": "؛",
};

function ftUpsideDown(str) {
  return Array.from(str)
    .reverse()
    .map((ch) => FT_UPSIDE_DOWN_TABLE[ch] || FT_UPSIDE_DOWN_TABLE[ch.toLowerCase()] || ch)
    .join("");
}

router.post("/api/tools/fancy-text", optionalAuth, toolGate("fancy-text"), async (req, res) => {
  const text = String(req.body?.text || "");
  if (!text.trim()) return res.status(400).json({ error: "Type some text first." });
  if (text.length > 500) return res.status(400).json({ error: "Text is too long (max 500 characters)." });
  const styles = FT_STYLES.map((s) => ({ name: s.name, text: ftApply(text, s.map) }));
  styles.push({ name: "Upside Down", text: ftUpsideDown(text) });
  res.json({ styles });
});

// ── Password Generator ───────────────────────────────────────
const PW_CHARSETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
};

router.post("/api/tools/password-generate", optionalAuth, toolGate("password-generate"), async (req, res) => {
  const length = Math.round(Number(req.body?.length));
  const sets = req.body?.sets && typeof req.body.sets === "object" ? req.body.sets : {};
  if (!Number.isFinite(length) || length < 4 || length > 128) {
    return res.status(400).json({ error: "Length must be between 4 and 128." });
  }
  const pool = Object.keys(PW_CHARSETS)
    .filter((key) => sets[key])
    .map((key) => PW_CHARSETS[key])
    .join("");
  if (!pool) return res.status(400).json({ error: "Pick at least one character type." });

  let password = "";
  for (let i = 0; i < length; i++) {
    password += pool[crypto.randomInt(pool.length)];
  }
  const entropyBits = Math.round(length * Math.log2(pool.length));
  res.json({ password, entropyBits });
});

// ── Hash Generator ────────────────────────────────────────────
const HASH_ALGORITHMS = ["md5", "sha1", "sha256", "sha512"];
const MAX_HASH_INPUT_BYTES = 20 * 1024 * 1024;

router.post("/api/tools/hash", optionalAuth, toolGate("hash"), async (req, res) => {
  const algorithm = String(req.body?.algorithm || "sha256").toLowerCase();
  if (!HASH_ALGORITHMS.includes(algorithm)) return res.status(400).json({ error: "Unsupported algorithm." });

  let buffer;
  try {
    if (req.body?.fileBase64) {
      buffer = Buffer.from(String(req.body.fileBase64), "base64");
    } else {
      buffer = Buffer.from(String(req.body?.text ?? ""), "utf8");
    }
  } catch {
    return res.status(400).json({ error: "Could not read that input." });
  }
  if (!buffer.length) return res.status(400).json({ error: "Enter some text or choose a file first." });
  if (buffer.length > MAX_HASH_INPUT_BYTES) return res.status(400).json({ error: "Input is too large (max 20MB)." });

  const hash = crypto.createHash(algorithm).update(buffer).digest("hex");
  res.json({ algorithm, hash, bytes: buffer.length });
});

// ── Regex Tester ──────────────────────────────────────────────
const REGEX_WORKER_TIMEOUT_MS = 3000;
const VALID_REGEX_FLAGS = /^[gimsuy]*$/;

function runRegexInWorker(pattern, flags, testString) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "tools-regex-worker.js"), {
      workerData: { pattern, flags, testString },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("That pattern took too long to run against this text — it may be catastrophically slow (ReDoS). Try a simpler pattern."));
    }, REGEX_WORKER_TIMEOUT_MS);
    worker.once("message", (msg) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg.ok) resolve(msg);
      else reject(new Error(msg.error || "Invalid regular expression."));
    });
    worker.once("error", (err) => {
      clearTimeout(timer);
      reject(new Error(err.message || "Could not run that pattern."));
    });
  });
}

router.post("/api/tools/regex-test", optionalAuth, toolGate("regex-test"), async (req, res) => {
  const pattern = String(req.body?.pattern || "");
  const flags = String(req.body?.flags || "");
  const testString = String(req.body?.testString || "");
  if (!pattern) return res.status(400).json({ error: "Enter a regular expression first." });
  if (pattern.length > 2000) return res.status(400).json({ error: "Pattern is too long." });
  if (testString.length > 200000) return res.status(400).json({ error: "Test string is too long (max 200,000 characters)." });
  if (!VALID_REGEX_FLAGS.test(flags)) return res.status(400).json({ error: "Invalid flags — only g, i, m, s, u, y are supported." });

  try {
    const result = await runRegexInWorker(pattern, flags, testString);
    res.json({ matches: result.matches, truncated: result.truncated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not run that pattern." });
  }
});

// ── Timestamp Converter ──────────────────────────────────────
router.post("/api/tools/timestamp", optionalAuth, toolGate("timestamp"), async (req, res) => {
  const mode = req.body?.mode === "toTimestamp" ? "toTimestamp" : "toDate";
  try {
    if (mode === "toDate") {
      const raw = req.body?.timestamp;
      const num = Number(raw);
      if (!Number.isFinite(num)) return res.status(400).json({ error: "Enter a valid Unix timestamp." });
      const ms = Math.abs(num) > 1e12 ? num : num * 1000;
      const date = new Date(ms);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "That timestamp is out of range." });
      res.json({ iso: date.toISOString(), utc: date.toUTCString(), unixSeconds: Math.floor(date.getTime() / 1000), unixMillis: date.getTime() });
    } else {
      const raw = String(req.body?.dateString || "").trim();
      if (!raw) return res.status(400).json({ error: "Enter a date first." });
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: "Could not parse that date." });
      res.json({ iso: date.toISOString(), utc: date.toUTCString(), unixSeconds: Math.floor(date.getTime() / 1000), unixMillis: date.getTime() });
    }
  } catch {
    res.status(400).json({ error: "Could not process that input." });
  }
});

export { router as toolsRouter };
