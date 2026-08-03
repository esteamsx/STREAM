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
    map[u] = exceptions[u] || (upperBase != null ? String.fromCodePoint(upperBase + i) : u);
    map[l] = exceptions[l] || (lowerBase != null ? String.fromCodePoint(lowerBase + i) : l);
  }
  if (digitBase != null) {
    for (let i = 0; i < 10; i++) map[FT_DIGITS[i]] = String.fromCodePoint(digitBase + i);
  }
  return map;
}

function ftSingleCaseBlock(codepointBase) {
  const map = {};
  for (let i = 0; i < 26; i++) {
    map[FT_UPPER[i]] = String.fromCodePoint(codepointBase + i);
    map[FT_LOWER[i]] = String.fromCodePoint(codepointBase + i);
  }
  return map;
}

function ftFromTable(table) {
  const map = {};
  for (const [k, v] of Object.entries(table)) {
    map[k] = v;
    map[k.toUpperCase()] = v;
  }
  return map;
}

function ftApply(str, map) {
  return Array.from(str).map((ch) => map[ch] || ch).join("");
}

const FT_STYLES = [
  { name: "Bold", fn: (s) => ftApply(s, ftBuildBlock(0x1d400, 0x1d41a, 0x1d7ce)) },
  { name: "Italic", fn: (s) => ftApply(s, ftBuildBlock(0x1d434, 0x1d44e, null, { h: "ℎ" })) },
  { name: "Bold Italic", fn: (s) => ftApply(s, ftBuildBlock(0x1d468, 0x1d482, null)) },
  {
    name: "Script",
    fn: (s) => ftApply(s, ftBuildBlock(0x1d49c, 0x1d4b6, null, {
      B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ",
      e: "ℯ", g: "ℊ", o: "ℴ",
    })),
  },
  { name: "Bold Script", fn: (s) => ftApply(s, ftBuildBlock(0x1d4d0, 0x1d4ea, null)) },
  {
    name: "Fraktur",
    fn: (s) => ftApply(s, ftBuildBlock(0x1d504, 0x1d51e, null, { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" })),
  },
  { name: "Bold Fraktur", fn: (s) => ftApply(s, ftBuildBlock(0x1d56c, 0x1d586, null)) },
  {
    name: "Double-Struck",
    fn: (s) => ftApply(s, ftBuildBlock(0x1d538, 0x1d552, 0x1d7d8, { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" })),
  },
  { name: "Monospace", fn: (s) => ftApply(s, ftBuildBlock(0x1d670, 0x1d68a, 0x1d7f6)) },
  { name: "Sans-Serif", fn: (s) => ftApply(s, ftBuildBlock(0x1d5a0, 0x1d5ba, 0x1d7e2)) },
  { name: "Sans-Serif Bold", fn: (s) => ftApply(s, ftBuildBlock(0x1d5d4, 0x1d5ee, 0x1d7ec)) },
  { name: "Sans-Serif Italic", fn: (s) => ftApply(s, ftBuildBlock(0x1d608, 0x1d622, null)) },
  { name: "Sans-Serif Bold Italic", fn: (s) => ftApply(s, ftBuildBlock(0x1d63c, 0x1d656, null)) },
  { name: "Fullwidth", fn: (s) => ftApply(s, ftBuildBlock(0xff21, 0xff41, 0xff10)) },
  {
    name: "Circled",
    fn: (s) => ftApply(s, (() => {
      const map = ftBuildBlock(0x24b6, 0x24d0, null);
      for (let i = 1; i <= 9; i++) map[FT_DIGITS[i]] = String.fromCodePoint(0x2460 + (i - 1));
      map["0"] = "⓪";
      return map;
    })()),
  },
  { name: "Negative Circled", fn: (s) => ftApply(s, ftSingleCaseBlock(0x1f150)) },
  { name: "Squared", fn: (s) => ftApply(s, ftSingleCaseBlock(0x1f130)) },
  { name: "Negative Squared", fn: (s) => ftApply(s, ftSingleCaseBlock(0x1f170)) },
  { name: "Regional Indicator", fn: (s) => ftApply(s, ftSingleCaseBlock(0x1f1e6)) },
  {
    name: "Small Caps",
    fn: (s) => ftApply(s, ftFromTable({
      a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ",
      k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ",
      u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
    })),
  },
  {
    name: "Superscript",
    fn: (s) => ftApply(s, Object.assign(ftFromTable({
      a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ", j: "ʲ",
      k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", q: "q", r: "ʳ", s: "ˢ", t: "ᵗ",
      u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
    }), { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" })),
  },
  {
    name: "Subscript",
    fn: (s) => ftApply(s, Object.assign(ftFromTable({
      a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ",
      o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
    }), { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" })),
  },
  {
    name: "Parenthesized",
    fn: (s) => ftApply(s, (() => {
      const map = {};
      for (let i = 0; i < 26; i++) {
        map[FT_UPPER[i]] = String.fromCodePoint(0x249c + i);
        map[FT_LOWER[i]] = String.fromCodePoint(0x249c + i);
      }
      for (let i = 1; i <= 9; i++) map[FT_DIGITS[i]] = String.fromCodePoint(0x2474 + (i - 1));
      return map;
    })()),
  },
  {
    name: "Upside Down",
    fn: (s) => {
      const table = {
        a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ı", j: "ɾ",
        k: "ʞ", l: "l", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ", s: "s", t: "ʇ",
        u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
        "0": "0", "1": "Ɩ", "2": "ᄅ", "3": "Ɛ", "4": "ㄣ", "5": "Ʀ", "6": "9", "7": "ㄥ", "8": "8", "9": "6",
        ".": "˙", ",": "'", "'": ",", '"': ",,", "!": "¡", "?": "¿",
        "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "_": "‾", ";": "؛",
      };
      return Array.from(s).reverse().map((ch) => table[ch] || table[ch.toLowerCase()] || ch).join("");
    },
  },
  { name: "Reversed", fn: (s) => Array.from(s).reverse().join("") },
  { name: "Wide", fn: (s) => Array.from(s).join(String.fromCharCode(0x2003)) },
  { name: "Strikethrough", fn: (s) => Array.from(s).map((c) => c + "̶").join("") },
  { name: "Underline", fn: (s) => Array.from(s).map((c) => c + "̲").join("") },
  { name: "Double Underline", fn: (s) => Array.from(s).map((c) => c + "̳").join("") },
  {
    name: "Zalgo",
    fn: (s) => {
      const marks = ["̀", "́", "̂", "̃", "̄", "̆", "̈", "̌", "̰", "̱"];
      return Array.from(s).map((ch) => {
        if (ch === " ") return ch;
        let out = ch;
        for (let i = 0; i < 2; i++) out += marks[crypto.randomInt(marks.length)];
        return out;
      }).join("");
    },
  },
];

router.post("/api/tools/fancy-text", optionalAuth, toolGate("fancy-text"), async (req, res) => {
  const text = String(req.body?.text || "");
  if (!text.trim()) return res.status(400).json({ error: "Type some text first." });
  if (text.length > 500) return res.status(400).json({ error: "Text is too long (max 500 characters)." });
  const styles = FT_STYLES.map((s) => ({ name: s.name, text: s.fn(text) }));
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

// ── Word & Character Counter ─────────────────────────────────
router.post("/api/tools/word-count", optionalAuth, toolGate("word-count"), async (req, res) => {
  const text = String(req.body?.text || "");
  if (text.length > 500000) return res.status(400).json({ error: "Text is too long (max 500,000 characters)." });
  const words = (text.match(/\S+/g) || []).length;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
  const sentences = (text.match(/[.!?]+(\s|$)/g) || []).length;
  const paragraphs = (text.split(/\n\s*\n/).filter((p) => p.trim())).length;
  res.json({ words, characters, charactersNoSpaces, lines, sentences, paragraphs });
});

// ── Case Converter ────────────────────────────────────────────
function ccWords(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

router.post("/api/tools/case-convert", optionalAuth, toolGate("case-convert"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = String(req.body?.mode || "upper");
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 100000) return res.status(400).json({ error: "Text is too long (max 100,000 characters)." });

  const words = ccWords(text);
  let output;
  switch (mode) {
    case "upper": output = text.toUpperCase(); break;
    case "lower": output = text.toLowerCase(); break;
    case "title": output = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" "); break;
    case "camel": output = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join(""); break;
    case "pascal": output = words.map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(""); break;
    case "snake": output = words.map((w) => w.toLowerCase()).join("_"); break;
    case "kebab": output = words.map((w) => w.toLowerCase()).join("-"); break;
    default: return res.status(400).json({ error: "Unsupported case mode." });
  }
  res.json({ output });
});

// ── Lorem Ipsum Generator ─────────────────────────────────────
const LOREM_WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

function loremSentence(minWords, maxWords) {
  const len = minWords + crypto.randomInt(maxWords - minWords + 1);
  const words = [];
  for (let i = 0; i < len; i++) words.push(LOREM_WORDS[crypto.randomInt(LOREM_WORDS.length)]);
  const sentence = words.join(" ");
  return sentence[0].toUpperCase() + sentence.slice(1) + ".";
}

router.post("/api/tools/lorem-ipsum", optionalAuth, toolGate("lorem-ipsum"), async (req, res) => {
  const paragraphs = Math.round(Number(req.body?.paragraphs));
  if (!Number.isFinite(paragraphs) || paragraphs < 1 || paragraphs > 50) {
    return res.status(400).json({ error: "Paragraphs must be between 1 and 50." });
  }
  const output = Array.from({ length: paragraphs }, () => {
    const sentenceCount = 3 + crypto.randomInt(4);
    return Array.from({ length: sentenceCount }, () => loremSentence(5, 14)).join(" ");
  }).join("\n\n");
  res.json({ output });
});

// ── Slug Generator ────────────────────────────────────────────
router.post("/api/tools/slug", optionalAuth, toolGate("slug"), async (req, res) => {
  const text = String(req.body?.text || "");
  if (!text.trim()) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 5000) return res.status(400).json({ error: "Text is too long (max 5,000 characters)." });
  const output = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  res.json({ output: output || "-" });
});

// ── URL Encoder / Decoder ─────────────────────────────────────
router.post("/api/tools/url-encode", optionalAuth, toolGate("url-encode"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = req.body?.mode === "decode" ? "decode" : "encode";
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 100000) return res.status(400).json({ error: "Text is too long (max 100,000 characters)." });
  try {
    res.json({ output: mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text) });
  } catch {
    res.status(400).json({ error: "Could not decode that — check it's valid percent-encoding." });
  }
});

// ── HTML Entity Encoder / Decoder ────────────────────────────
const HTML_ENTITY_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const HTML_ENTITY_REVERSE = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

router.post("/api/tools/html-entity", optionalAuth, toolGate("html-entity"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = req.body?.mode === "decode" ? "decode" : "encode";
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 100000) return res.status(400).json({ error: "Text is too long (max 100,000 characters)." });
  let output;
  if (mode === "encode") {
    output = text.replace(/[&<>"']/g, (ch) => HTML_ENTITY_MAP[ch]);
  } else {
    output = text
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name) => HTML_ENTITY_REVERSE[name]);
  }
  res.json({ output });
});

// ── Hex ↔ Text ────────────────────────────────────────────────
router.post("/api/tools/hex-text", optionalAuth, toolGate("hex-text"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = req.body?.mode === "fromHex" ? "fromHex" : "toHex";
  if (!text.trim()) return res.status(400).json({ error: "Enter some input first." });
  if (text.length > 100000) return res.status(400).json({ error: "Input is too long (max 100,000 characters)." });
  try {
    if (mode === "toHex") {
      res.json({ output: Buffer.from(text, "utf8").toString("hex") });
    } else {
      const cleaned = text.replace(/\s+/g, "").replace(/^0x/i, "");
      if (!/^[0-9a-fA-F]*$/.test(cleaned) || cleaned.length % 2 !== 0) {
        return res.status(400).json({ error: "That doesn't look like valid hex." });
      }
      res.json({ output: Buffer.from(cleaned, "hex").toString("utf8") });
    }
  } catch {
    res.status(400).json({ error: "Could not process that input." });
  }
});

// ── Binary ↔ Text ─────────────────────────────────────────────
router.post("/api/tools/binary-text", optionalAuth, toolGate("binary-text"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = req.body?.mode === "fromBinary" ? "fromBinary" : "toBinary";
  if (!text.trim()) return res.status(400).json({ error: "Enter some input first." });
  if (text.length > 100000) return res.status(400).json({ error: "Input is too long (max 100,000 characters)." });
  try {
    if (mode === "toBinary") {
      const bytes = Buffer.from(text, "utf8");
      res.json({ output: Array.from(bytes).map((b) => b.toString(2).padStart(8, "0")).join(" ") });
    } else {
      const groups = text.trim().split(/\s+/);
      if (!groups.every((g) => /^[01]{1,8}$/.test(g))) {
        return res.status(400).json({ error: "That doesn't look like valid binary (space-separated 8-bit groups)." });
      }
      const bytes = Buffer.from(groups.map((g) => parseInt(g, 2)));
      res.json({ output: bytes.toString("utf8") });
    }
  } catch {
    res.status(400).json({ error: "Could not process that input." });
  }
});

// ── ROT13 / Caesar Cipher ─────────────────────────────────────
router.post("/api/tools/caesar-cipher", optionalAuth, toolGate("caesar-cipher"), async (req, res) => {
  const text = String(req.body?.text || "");
  const shift = ((Math.round(Number(req.body?.shift ?? 13)) % 26) + 26) % 26;
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 100000) return res.status(400).json({ error: "Text is too long (max 100,000 characters)." });
  const output = text.replace(/[a-zA-Z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + shift) % 26) + base);
  });
  res.json({ output });
});

// ── UUID Generator ────────────────────────────────────────────
router.post("/api/tools/uuid", optionalAuth, toolGate("uuid"), async (req, res) => {
  const count = Math.round(Number(req.body?.count ?? 1));
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    return res.status(400).json({ error: "Count must be between 1 and 50." });
  }
  res.json({ uuids: Array.from({ length: count }, () => crypto.randomUUID()) });
});

// ── Color Converter ───────────────────────────────────────────
function hexToRgb(hex) {
  const clean = hex.replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function rgbToHex({ r, g, b }) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb({ h, s, l }) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

router.post("/api/tools/color-convert", optionalAuth, toolGate("color-convert"), async (req, res) => {
  const input = String(req.body?.input || "").trim();
  if (!input) return res.status(400).json({ error: "Enter a color first (hex, rgb, or hsl)." });

  let rgb = null;
  const hexMatch = input.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  const rgbMatch = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  const hslMatch = input.match(/^hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/i);

  if (hexMatch) rgb = hexToRgb(hexMatch[1]);
  else if (rgbMatch) rgb = { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) };
  else if (hslMatch) rgb = hslToRgb({ h: Number(hslMatch[1]), s: Number(hslMatch[2]), l: Number(hslMatch[3]) });

  if (!rgb) return res.status(400).json({ error: "Could not parse that color — try a hex code, rgb(), or hsl() value." });

  const hsl = rgbToHsl(rgb);
  res.json({
    hex: rgbToHex(rgb),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  });
});

// ── Number Base Converter ─────────────────────────────────────
router.post("/api/tools/base-convert", optionalAuth, toolGate("base-convert"), async (req, res) => {
  const input = String(req.body?.input || "").trim();
  const fromBase = Math.round(Number(req.body?.fromBase));
  const toBase = Math.round(Number(req.body?.toBase));
  if (!input) return res.status(400).json({ error: "Enter a number first." });
  if (![fromBase, toBase].every((b) => b >= 2 && b <= 36)) {
    return res.status(400).json({ error: "Bases must be between 2 and 36." });
  }
  const parsed = parseInt(input, fromBase);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return res.status(400).json({ error: `"${input}" isn't valid in base ${fromBase}.` });
  }
  res.json({ output: parsed.toString(toBase).toUpperCase() });
});

// ── Roman Numeral Converter ───────────────────────────────────
const ROMAN_TABLE = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toRoman(num) {
  let result = "";
  let n = num;
  for (const [value, symbol] of ROMAN_TABLE) {
    while (n >= value) { result += symbol; n -= value; }
  }
  return result;
}

function fromRoman(str) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const cur = map[str[i]];
    const next = map[str[i + 1]];
    if (!cur) return null;
    if (next && cur < next) total -= cur;
    else total += cur;
  }
  return total;
}

router.post("/api/tools/roman-numeral", optionalAuth, toolGate("roman-numeral"), async (req, res) => {
  const mode = req.body?.mode === "fromRoman" ? "fromRoman" : "toRoman";
  if (mode === "toRoman") {
    const num = Math.round(Number(req.body?.input));
    if (!Number.isFinite(num) || num < 1 || num > 3999) {
      return res.status(400).json({ error: "Enter a number between 1 and 3999." });
    }
    res.json({ output: toRoman(num) });
  } else {
    const input = String(req.body?.input || "").trim().toUpperCase();
    if (!/^[IVXLCDM]+$/.test(input)) return res.status(400).json({ error: "Enter a valid Roman numeral." });
    const value = fromRoman(input);
    if (value == null || toRoman(value) !== input) return res.status(400).json({ error: "That's not a valid Roman numeral." });
    res.json({ output: value });
  }
});

// ── User Agent Parser ─────────────────────────────────────────
function parseUserAgent(ua) {
  let browser = "Unknown", browserVersion = "";
  const browserPatterns = [
    [/Edg\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/CriOS\/([\d.]+)/, "Chrome (iOS)"],
    [/FxiOS\/([\d.]+)/, "Firefox (iOS)"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
  ];
  for (const [re, name] of browserPatterns) {
    const m = ua.match(re);
    if (m) { browser = name; browserVersion = m[1]; break; }
  }

  let os = "Unknown";
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT 6\.3/.test(ua)) os = "Windows 8.1";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";

  const isMobile = /Mobi|Android|iPhone|iPad/.test(ua);
  const device = /iPad/.test(ua) ? "Tablet" : isMobile ? "Mobile" : "Desktop";

  return { browser, browserVersion, os, device };
}

router.post("/api/tools/user-agent-parse", optionalAuth, toolGate("user-agent-parse"), async (req, res) => {
  const ua = String(req.body?.userAgent || req.get("user-agent") || "");
  if (!ua) return res.status(400).json({ error: "No user agent string to parse." });
  res.json({ userAgent: ua, ...parseUserAgent(ua) });
});

// ── Subnet / CIDR Calculator ──────────────────────────────────
function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
function intToIp(int) {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join(".");
}

router.post("/api/tools/subnet-calc", optionalAuth, toolGate("subnet-calc"), async (req, res) => {
  const cidr = String(req.body?.cidr || "").trim();
  const match = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!match) return res.status(400).json({ error: "Enter a CIDR like 192.168.1.0/24." });
  const ipInt = ipToInt(match[1]);
  const prefix = Number(match[2]);
  if (ipInt == null || prefix < 0 || prefix > 32) return res.status(400).json({ error: "Invalid IP address or prefix length." });

  const maskInt = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const totalHosts = Math.pow(2, 32 - prefix);
  const usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;

  res.json({
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    subnetMask: intToIp(maskInt),
    firstHost: totalHosts > 2 ? intToIp(networkInt + 1) : intToIp(networkInt),
    lastHost: totalHosts > 2 ? intToIp(broadcastInt - 1) : intToIp(broadcastInt),
    totalHosts,
    usableHosts,
  });
});

// ── Random Number Generator ───────────────────────────────────
router.post("/api/tools/random-number", optionalAuth, toolGate("random-number"), async (req, res) => {
  const min = Math.round(Number(req.body?.min));
  const max = Math.round(Number(req.body?.max));
  const count = Math.round(Number(req.body?.count ?? 1));
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    return res.status(400).json({ error: "Min must be less than max." });
  }
  if (!Number.isFinite(count) || count < 1 || count > 100) {
    return res.status(400).json({ error: "Count must be between 1 and 100." });
  }
  const numbers = Array.from({ length: count }, () => min + crypto.randomInt(max - min + 1));
  res.json({ numbers });
});

// ── Coin Flip / Dice Roller ───────────────────────────────────
router.post("/api/tools/dice-roll", optionalAuth, toolGate("dice-roll"), async (req, res) => {
  const sides = Math.round(Number(req.body?.sides ?? 6));
  const count = Math.round(Number(req.body?.count ?? 1));
  if (!Number.isFinite(sides) || sides < 2 || sides > 1000) {
    return res.status(400).json({ error: "Sides must be between 2 and 1000." });
  }
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    return res.status(400).json({ error: "Count must be between 1 and 50." });
  }
  const rolls = Array.from({ length: count }, () => 1 + crypto.randomInt(sides));
  res.json({ rolls, total: rolls.reduce((a, b) => a + b, 0) });
});

// ── Duplicate Line Remover ────────────────────────────────────
router.post("/api/tools/dedupe-lines", optionalAuth, toolGate("dedupe-lines"), async (req, res) => {
  const text = String(req.body?.text || "");
  const caseSensitive = !!req.body?.caseSensitive;
  if (!text.trim()) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 500000) return res.status(400).json({ error: "Text is too long (max 500,000 characters)." });
  const lines = text.split(/\r\n|\r|\n/);
  const seen = new Set();
  const output = [];
  for (const line of lines) {
    const key = caseSensitive ? line : line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(line);
  }
  res.json({ output: output.join("\n"), removedCount: lines.length - output.length });
});

// ── Text Sorter ───────────────────────────────────────────────
router.post("/api/tools/sort-lines", optionalAuth, toolGate("sort-lines"), async (req, res) => {
  const text = String(req.body?.text || "");
  const order = req.body?.order === "desc" ? "desc" : "asc";
  const numeric = !!req.body?.numeric;
  if (!text.trim()) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 500000) return res.status(400).json({ error: "Text is too long (max 500,000 characters)." });
  const lines = text.split(/\r\n|\r|\n/);
  lines.sort((a, b) => {
    const cmp = numeric ? (Number(a) - Number(b)) : a.localeCompare(b);
    return order === "asc" ? cmp : -cmp;
  });
  res.json({ output: lines.join("\n") });
});

// ── Age Calculator ────────────────────────────────────────────
router.post("/api/tools/age-calc", optionalAuth, toolGate("age-calc"), async (req, res) => {
  const raw = String(req.body?.birthDate || "").trim();
  if (!raw) return res.status(400).json({ error: "Enter a birth date first." });
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return res.status(400).json({ error: "Could not parse that date." });
  const now = new Date();
  if (birth > now) return res.status(400).json({ error: "That date is in the future." });

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) { years -= 1; months += 12; }
  const totalDays = Math.floor((now.getTime() - birth.getTime()) / 86400000);

  res.json({ years, months, days, totalDays });
});

export { router as toolsRouter };
