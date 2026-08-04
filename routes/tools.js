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
import { TOTP, Secret } from "otpauth";
import { optionalAuth, isAdminEmail, isVerificationActive, checkAndIncrementDailyLimit } from "../services/auth.js";

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

function toolGate(toolName) {
  return async (req, res, next) => {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const profile = req.userProfile;
    const privileged = !!(profile && (isAdminEmail(profile.email) || isVerificationActive(profile)));
    if (privileged) return next();
    const key = `tool:${toolName}:${req.uid || req.ip}`;
    const result = await checkAndIncrementDailyLimit(key, TOOL_DAILY_LIMIT);
    if (!result.allowed) {
      return res.status(429).json({ error: `You've used this tool ${TOOL_DAILY_LIMIT} times today. Verified accounts get unlimited use, otherwise, try again in 24 hours.` });
    }
    next();
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

const MAX_OBFUSCATE_LENGTH = 20 * 1024 * 1024;
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
      reject(new Error("That file took too long to obfuscate. Try a smaller file."));
    }, OBFUSCATE_WORKER_TIMEOUT_MS);
    worker.once("message", (msg) => {
      clearTimeout(timer);
      worker.terminate();
      if (msg.ok) resolve(msg.code);
      else reject(new Error(msg.error || "Could not obfuscate that code, check it's valid JavaScript."));
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
    res.status(400).json({ error: err.message || "Could not obfuscate that code, check it's valid JavaScript." });
  }
});

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
    res.status(400).json({ error: "Could not decode that token, check it's a valid JWT." });
  }
});

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

const REGEX_WORKER_TIMEOUT_MS = 3000;
const VALID_REGEX_FLAGS = /^[gimsuy]*$/;

function runRegexInWorker(pattern, flags, testString) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "tools-regex-worker.js"), {
      workerData: { pattern, flags, testString },
    });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("That pattern took too long to run against this text. It may be catastrophically slow (ReDoS). Try a simpler pattern."));
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
  if (!VALID_REGEX_FLAGS.test(flags)) return res.status(400).json({ error: "Invalid flags, only g, i, m, s, u, y are supported." });

  try {
    const result = await runRegexInWorker(pattern, flags, testString);
    res.json({ matches: result.matches, truncated: result.truncated });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not run that pattern." });
  }
});

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

router.post("/api/tools/url-encode", optionalAuth, toolGate("url-encode"), async (req, res) => {
  const text = String(req.body?.text || "");
  const mode = req.body?.mode === "decode" ? "decode" : "encode";
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 100000) return res.status(400).json({ error: "Text is too long (max 100,000 characters)." });
  try {
    res.json({ output: mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text) });
  } catch {
    res.status(400).json({ error: "Could not decode that, check it's valid percent-encoding." });
  }
});

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

router.post("/api/tools/uuid", optionalAuth, toolGate("uuid"), async (req, res) => {
  const count = Math.round(Number(req.body?.count ?? 1));
  if (!Number.isFinite(count) || count < 1 || count > 50) {
    return res.status(400).json({ error: "Count must be between 1 and 50." });
  }
  res.json({ uuids: Array.from({ length: count }, () => crypto.randomUUID()) });
});

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

  if (!rgb) return res.status(400).json({ error: "Could not parse that color, try a hex code, rgb(), or hsl() value." });

  const hsl = rgbToHsl(rgb);
  res.json({
    hex: rgbToHex(rgb),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
  });
});

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

function lineDiff(a, b) {
  const aLines = a.split(/\r\n|\r|\n/);
  const bLines = b.split(/\r\n|\r|\n/);
  const n = aLines.length, m = bLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) { ops.push({ type: "same", text: aLines[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "removed", text: aLines[i] }); i++; }
    else { ops.push({ type: "added", text: bLines[j] }); j++; }
  }
  while (i < n) { ops.push({ type: "removed", text: aLines[i] }); i++; }
  while (j < m) { ops.push({ type: "added", text: bLines[j] }); j++; }
  return ops;
}

router.post("/api/tools/text-diff", optionalAuth, toolGate("text-diff"), async (req, res) => {
  const a = String(req.body?.textA || "");
  const b = String(req.body?.textB || "");
  if (!a.trim() && !b.trim()) return res.status(400).json({ error: "Enter some text in both boxes first." });
  if (a.length > 200000 || b.length > 200000) return res.status(400).json({ error: "Text is too long (max 200,000 characters each)." });
  const aLineCount = a.split(/\r\n|\r|\n/).length;
  const bLineCount = b.split(/\r\n|\r|\n/).length;
  if (aLineCount > 4000 || bLineCount > 4000) return res.status(400).json({ error: "Too many lines (max 4,000 each)." });
  const ops = lineDiff(a, b);
  const added = ops.filter((o) => o.type === "added").length;
  const removed = ops.filter((o) => o.type === "removed").length;
  res.json({ ops, added, removed });
});

router.post("/api/tools/find-replace", optionalAuth, toolGate("find-replace"), async (req, res) => {
  const text = String(req.body?.text || "");
  const find = String(req.body?.find || "");
  const replace = String(req.body?.replace || "");
  const useRegex = !!req.body?.useRegex;
  const caseSensitive = !!req.body?.caseSensitive;
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (!find) return res.status(400).json({ error: "Enter something to find first." });
  if (text.length > 500000) return res.status(400).json({ error: "Text is too long (max 500,000 characters)." });
  let output, count = 0;
  try {
    const flags = "g" + (caseSensitive ? "" : "i");
    const pattern = useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(pattern, flags);
    output = text.replace(re, (...args) => {
      count++;
      return replace;
    });
  } catch (err) {
    return res.status(400).json({ error: "That regular expression is invalid." });
  }
  res.json({ output, count });
});

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

router.post("/api/tools/csv-json", optionalAuth, toolGate("csv-json"), async (req, res) => {
  const input = String(req.body?.input || "");
  const direction = req.body?.direction === "jsonToCsv" ? "jsonToCsv" : "csvToJson";
  if (!input.trim()) return res.status(400).json({ error: "Paste some data first." });
  if (input.length > 500000) return res.status(400).json({ error: "Input is too long (max 500,000 characters)." });
  try {
    if (direction === "csvToJson") {
      const lines = input.split(/\r\n|\r|\n/).filter((l) => l.length);
      if (!lines.length) return res.status(400).json({ error: "No rows found." });
      const headers = parseCsvLine(lines[0]);
      const rows = lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ""; });
        return obj;
      });
      res.json({ output: JSON.stringify(rows, null, 2) });
    } else {
      const data = JSON.parse(input);
      const rows = Array.isArray(data) ? data : [data];
      if (!rows.length) return res.status(400).json({ error: "That JSON array is empty." });
      const headerSet = new Set();
      rows.forEach((r) => Object.keys(r || {}).forEach((k) => headerSet.add(k)));
      const headers = [...headerSet];
      const lines = [headers.map(csvField).join(",")];
      rows.forEach((r) => lines.push(headers.map((h) => csvField(r?.[h])).join(",")));
      res.json({ output: lines.join("\n") });
    }
  } catch (err) {
    res.status(400).json({ error: direction === "csvToJson" ? "Could not parse that as CSV." : "Could not parse that as JSON." });
  }
});

const NUM_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const NUM_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const NUM_SCALES = ["", "thousand", "million", "billion", "trillion"];

function threeDigitsToWords(n) {
  const parts = [];
  if (n >= 100) { parts.push(NUM_ONES[Math.floor(n / 100)], "hundred"); n %= 100; }
  if (n >= 20) { parts.push(NUM_TENS[Math.floor(n / 10)]); n %= 10; if (n) parts.push(NUM_ONES[n]); }
  else if (n > 0) parts.push(NUM_ONES[n]);
  return parts.join(" ");
}

function numberToWords(num) {
  if (num === 0) return "zero";
  const negative = num < 0;
  num = Math.abs(Math.trunc(num));
  const groups = [];
  while (num > 0) { groups.push(num % 1000); num = Math.floor(num / 1000); }
  const parts = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    parts.push(threeDigitsToWords(groups[i]) + (NUM_SCALES[i] ? " " + NUM_SCALES[i] : ""));
  }
  return (negative ? "negative " : "") + parts.join(" ");
}

const WORD_TO_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALE_TO_NUM = { hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000, trillion: 1000000000000 };

function wordsToNumber(str) {
  const words = str.toLowerCase().replace(/-/g, " ").replace(/\band\b/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) throw new Error("empty");
  let negative = false;
  if (words[0] === "negative" || words[0] === "minus") { negative = true; words.shift(); }
  let total = 0, current = 0;
  for (const w of words) {
    if (w in WORD_TO_NUM) current += WORD_TO_NUM[w];
    else if (w === "hundred") current *= 100;
    else if (w in SCALE_TO_NUM) { total += current * SCALE_TO_NUM[w]; current = 0; }
    else throw new Error("unrecognized word: " + w);
  }
  return (negative ? -1 : 1) * (total + current);
}

router.post("/api/tools/number-to-words", optionalAuth, toolGate("number-to-words"), async (req, res) => {
  const mode = req.body?.mode === "toNumber" ? "toNumber" : "toWords";
  try {
    if (mode === "toWords") {
      const num = Number(req.body?.input);
      if (!Number.isFinite(num)) return res.status(400).json({ error: "Enter a valid number first." });
      if (Math.abs(num) >= 1e15) return res.status(400).json({ error: "That number is too large." });
      res.json({ output: numberToWords(num) });
    } else {
      const raw = String(req.body?.input || "").trim();
      if (!raw) return res.status(400).json({ error: "Enter some words first." });
      res.json({ output: String(wordsToNumber(raw)) });
    }
  } catch (err) {
    res.status(400).json({ error: "Could not parse that input." });
  }
});

const MORSE_MAP = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---",
  K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
  "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-", '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};
const MORSE_REVERSE = Object.fromEntries(Object.entries(MORSE_MAP).map(([k, v]) => [v, k]));

router.post("/api/tools/morse-code", optionalAuth, toolGate("morse-code"), async (req, res) => {
  const mode = req.body?.mode === "toText" ? "toText" : "toMorse";
  const input = String(req.body?.input || "");
  if (!input.trim()) return res.status(400).json({ error: "Enter something first." });
  if (input.length > 20000) return res.status(400).json({ error: "That's too long (max 20,000 characters)." });
  if (mode === "toMorse") {
    const output = input.toUpperCase().split(" ").map((word) =>
      word.split("").map((ch) => MORSE_MAP[ch] || "").filter(Boolean).join(" ")
    ).join(" / ");
    res.json({ output });
  } else {
    const words = input.trim().split(" / ");
    const output = words.map((word) =>
      word.trim().split(/\s+/).map((code) => MORSE_REVERSE[code] || "").join("")
    ).join(" ");
    res.json({ output });
  }
});

router.post("/api/tools/percentage", optionalAuth, toolGate("percentage"), async (req, res) => {
  const mode = req.body?.mode;
  const x = Number(req.body?.x);
  const y = Number(req.body?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return res.status(400).json({ error: "Enter valid numbers first." });
  if (mode === "percentOf") {
    res.json({ output: ((x / 100) * y).toLocaleString(undefined, { maximumFractionDigits: 6 }), label: `${x}% of ${y}` });
  } else if (mode === "whatPercent") {
    if (y === 0) return res.status(400).json({ error: "The second number can't be zero." });
    res.json({ output: ((x / y) * 100).toLocaleString(undefined, { maximumFractionDigits: 6 }) + "%", label: `${x} is what % of ${y}` });
  } else if (mode === "percentChange") {
    if (x === 0) return res.status(400).json({ error: "The starting number can't be zero." });
    const change = ((y - x) / Math.abs(x)) * 100;
    res.json({ output: (change >= 0 ? "+" : "") + change.toLocaleString(undefined, { maximumFractionDigits: 6 }) + "%", label: `Change from ${x} to ${y}` });
  } else {
    res.status(400).json({ error: "Unknown calculation type." });
  }
});

router.post("/api/tools/bmi", optionalAuth, toolGate("bmi"), async (req, res) => {
  const unit = req.body?.unit === "imperial" ? "imperial" : "metric";
  const weight = Number(req.body?.weight);
  const height = Number(req.body?.height);
  if (!Number.isFinite(weight) || weight <= 0 || !Number.isFinite(height) || height <= 0) {
    return res.status(400).json({ error: "Enter a valid weight and height first." });
  }
  let bmi;
  if (unit === "metric") {
    bmi = weight / ((height / 100) ** 2);
  } else {
    bmi = (weight / (height ** 2)) * 703;
  }
  if (!Number.isFinite(bmi) || bmi <= 0 || bmi > 300) return res.status(400).json({ error: "Those numbers don't look right." });
  let category;
  if (bmi < 18.5) category = "Underweight";
  else if (bmi < 25) category = "Normal weight";
  else if (bmi < 30) category = "Overweight";
  else category = "Obese";
  res.json({ bmi: bmi.toFixed(1), category });
});

function srgbToLinear(c) {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function relativeLuminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function parseHexColor(hex) {
  const clean = String(hex || "").trim().replace(/^#/, "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

router.post("/api/tools/contrast-check", optionalAuth, toolGate("contrast-check"), async (req, res) => {
  const fg = parseHexColor(req.body?.foreground);
  const bg = parseHexColor(req.body?.background);
  if (!fg || !bg) return res.status(400).json({ error: "Enter two valid hex colors first." });
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  res.json({
    ratio: ratio.toFixed(2),
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  });
});

function escapeHtmlMd(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inlineMarkdown(text) {
  let s = escapeHtmlMd(text);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*\s][^*]*?)\*/g, "<em>$1</em>");
  s = s.replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
  return s;
}

function markdownToHtml(md) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let paragraph = [];
  let listType = null;

  function flushParagraph() {
    if (paragraph.length) { out.push("<p>" + inlineMarkdown(paragraph.join(" ")) + "</p>"); paragraph = []; }
  }
  function closeList() {
    if (listType) { out.push(listType === "ul" ? "</ul>" : "</ol>"); listType = null; }
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      flushParagraph(); closeList();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      out.push("<pre><code>" + escapeHtmlMd(codeLines.join("\n")) + "</code></pre>");
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph(); closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>` + inlineMarkdown(headingMatch[2]) + `</h${level}>`);
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushParagraph(); closeList();
      out.push("<hr>");
      i++;
      continue;
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph(); closeList();
      const quoteLines = [blockquoteMatch[1]];
      i++;
      while (i < lines.length && lines[i].match(/^>\s?(.*)$/)) {
        quoteLines.push(lines[i].match(/^>\s?(.*)$/)[1]);
        i++;
      }
      out.push("<blockquote><p>" + inlineMarkdown(quoteLines.join(" ")) + "</p></blockquote>");
      continue;
    }

    const ulMatch = line.match(/^[-*+]\s+(.*)$/);
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      flushParagraph();
      const wantType = ulMatch ? "ul" : "ol";
      if (listType !== wantType) { closeList(); out.push(wantType === "ul" ? "<ul>" : "<ol>"); listType = wantType; }
      out.push("<li>" + inlineMarkdown((ulMatch || olMatch)[1]) + "</li>");
      i++;
      continue;
    }

    if (!line.trim()) { flushParagraph(); closeList(); i++; continue; }

    paragraph.push(line.trim());
    i++;
  }
  flushParagraph();
  closeList();
  return out.join("\n");
}

router.post("/api/tools/markdown-preview", optionalAuth, toolGate("markdown-preview"), async (req, res) => {
  const md = String(req.body?.markdown || "");
  if (!md.trim()) return res.status(400).json({ error: "Enter some markdown first." });
  if (md.length > 200000) return res.status(400).json({ error: "That's too long (max 200,000 characters)." });
  res.json({ html: markdownToHtml(md) });
});

router.post("/api/tools/text-encrypt-gate", optionalAuth, toolGate("text-encrypt"), async (req, res) => {
  res.json({ ok: true });
});

router.post("/api/tools/typing-test-gate", optionalAuth, toolGate("typing-test"), async (req, res) => {
  res.json({ ok: true });
});

const FAKE_FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "Chidi", "Amara", "Kwame", "Fatima", "Yuki", "Wei", "Sofia", "Liam", "Olivia", "Noah"];
const FAKE_LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Okafor", "Adeyemi", "Tanaka", "Kim", "Rossi", "Muller", "Silva", "Chen", "Nguyen", "Patel", "Osei", "Diallo"];
const FAKE_STREET_NAMES = ["Main", "Oak", "Maple", "Cedar", "Elm", "Washington", "Lake", "Hill", "Park", "Sunset"];
const FAKE_STREET_TYPES = ["St", "Ave", "Blvd", "Rd", "Ln", "Dr"];
const FAKE_DOMAINS = ["example.com", "mailtest.dev", "fakemail.io", "sample.org"];
const FAKE_COMPANY_SUFFIX = ["Inc", "LLC", "Group", "Co", "Ltd", "Partners"];

function fakeRandItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function fakeRandInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateFakePerson() {
  const firstName = fakeRandItem(FAKE_FIRST_NAMES);
  const lastName = fakeRandItem(FAKE_LAST_NAMES);
  const email = (firstName + "." + lastName + fakeRandInt(1, 99)).toLowerCase() + "@" + fakeRandItem(FAKE_DOMAINS);
  const phone = "+1-" + fakeRandInt(200, 999) + "-" + fakeRandInt(200, 999) + "-" + String(fakeRandInt(0, 9999)).padStart(4, "0");
  const address = fakeRandInt(100, 9999) + " " + fakeRandItem(FAKE_STREET_NAMES) + " " + fakeRandItem(FAKE_STREET_TYPES);
  const company = fakeRandItem(FAKE_LAST_NAMES) + " " + fakeRandItem(FAKE_COMPANY_SUFFIX);
  return { firstName, lastName, email, phone, address, company };
}

router.post("/api/tools/fake-data", optionalAuth, toolGate("fake-data"), async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 50);
  const people = Array.from({ length: count }, generateFakePerson);
  res.json({ people });
});

router.post("/api/tools/ip-lookup", optionalAuth, toolGate("ip-lookup"), async (req, res) => {
  const raw = String(req.body?.ip || "").trim();
  const target = raw || req.ip;
  try {
    const upstream = await fetch(`https://ipapi.co/${encodeURIComponent(target)}/json/`, {
      headers: { "user-agent": "ES-TEAMS-TV-Tools/1.0" },
    });
    const data = await upstream.json().catch(() => null);
    if (!data || data.error) return res.status(400).json({ error: data?.reason || "Could not look up that IP." });
    res.json({
      ip: data.ip, city: data.city, region: data.region, country: data.country_name,
      postal: data.postal, timezone: data.timezone, isp: data.org, latitude: data.latitude, longitude: data.longitude,
    });
  } catch (err) {
    res.status(502).json({ error: "Could not reach the IP lookup service." });
  }
});

router.post("/api/tools/http-headers", optionalAuth, toolGate("http-headers"), async (req, res) => {
  let raw = String(req.body?.url || "").trim();
  if (!raw) return res.status(400).json({ error: "Enter a URL first." });
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  let target;
  try { target = new URL(raw); } catch { return res.status(400).json({ error: "That's not a valid URL." }); }
  try {
    const upstream = await fetch(target.href, { method: "GET", redirect: "follow", headers: { "user-agent": "ES-TEAMS-TV-Tools/1.0" } });
    const headers = {};
    upstream.headers.forEach((value, key) => { headers[key] = value; });
    res.json({ status: upstream.status, statusText: upstream.statusText, headers });
  } catch (err) {
    res.status(502).json({ error: "Could not reach that URL." });
  }
});

const CRON_MONTH_NAMES = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const CRON_DOW_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function cronNameToNum(token, names) {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const idx = names ? names.indexOf(token.toUpperCase()) : -1;
  if (idx === -1) throw new Error("Invalid cron field value: " + token);
  return idx;
}

function parseCronField(field, min, max, names) {
  const values = new Set();
  for (const part of field.split(",")) {
    let m;
    if (part === "*") { for (let v = min; v <= max; v++) values.add(v); }
    else if ((m = part.match(/^\*\/(\d+)$/))) {
      const step = parseInt(m[1], 10);
      for (let v = min; v <= max; v += step) values.add(v);
    } else if ((m = part.match(/^(\d+|[a-zA-Z]+)-(\d+|[a-zA-Z]+)(?:\/(\d+))?$/))) {
      const start = cronNameToNum(m[1], names);
      const end = cronNameToNum(m[2], names);
      const step = m[3] ? parseInt(m[3], 10) : 1;
      for (let v = start; v <= end; v += step) values.add(v);
    } else {
      values.add(cronNameToNum(part, names));
    }
  }
  const out = [...values].filter((v) => v >= min && v <= max).sort((a, b) => a - b);
  if (!out.length) throw new Error("Invalid cron field: " + field);
  return out;
}

function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("A cron expression needs exactly 5 fields (minute hour day month weekday).");
  const [minuteF, hourF, domF, monthF, dowF] = parts;
  return {
    minutes: parseCronField(minuteF, 0, 59),
    hours: parseCronField(hourF, 0, 23),
    daysOfMonth: parseCronField(domF, 1, 31),
    months: parseCronField(monthF, 1, 12, CRON_MONTH_NAMES),
    daysOfWeek: parseCronField(dowF, 0, 6, CRON_DOW_NAMES),
    domWildcard: domF === "*",
    dowWildcard: dowF === "*",
  };
}

function cronMatches(date, cron) {
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dom = date.getUTCDate();
  const month = date.getUTCMonth() + 1;
  const dow = date.getUTCDay();
  if (!cron.minutes.includes(minute)) return false;
  if (!cron.hours.includes(hour)) return false;
  if (!cron.months.includes(month)) return false;
  const domOk = cron.daysOfMonth.includes(dom);
  const dowOk = cron.daysOfWeek.includes(dow);
  if (cron.domWildcard && cron.dowWildcard) return true;
  if (cron.domWildcard) return dowOk;
  if (cron.dowWildcard) return domOk;
  return domOk || dowOk;
}

function cronNextRuns(cron, fromDate, count) {
  const results = [];
  const cursor = new Date(fromDate.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  let iterations = 0;
  while (results.length < count && iterations < 2 * 366 * 24 * 60) {
    if (cronMatches(cursor, cron)) results.push(new Date(cursor.getTime()));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
    iterations++;
  }
  return results;
}

function describeCron(cron) {
  const parts = [];
  if (cron.minutes.length === 60) parts.push("every minute");
  else if (cron.minutes.length === 1) parts.push(`at minute ${cron.minutes[0]}`);
  else parts.push(`at minutes ${cron.minutes.join(", ")}`);
  if (cron.hours.length < 24) parts.push(cron.hours.length === 1 ? `of hour ${cron.hours[0]}` : `of hours ${cron.hours.join(", ")}`);
  if (!cron.domWildcard) parts.push(`on day-of-month ${cron.daysOfMonth.join(", ")}`);
  if (cron.months.length < 12) parts.push(`in month ${cron.months.map((m) => CRON_MONTH_NAMES[m]).join(", ")}`);
  if (!cron.dowWildcard) parts.push(`on ${cron.daysOfWeek.map((d) => CRON_DOW_NAMES[d]).join(", ")}`);
  return parts.join(" ");
}

router.post("/api/tools/cron-explain", optionalAuth, toolGate("cron-explain"), async (req, res) => {
  const expr = String(req.body?.expression || "").trim();
  if (!expr) return res.status(400).json({ error: "Enter a cron expression first." });
  try {
    const cron = parseCron(expr);
    const description = describeCron(cron);
    const nextRuns = cronNextRuns(cron, new Date(), 5).map((d) => d.toISOString());
    res.json({ description, nextRuns });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not parse that cron expression." });
  }
});

router.post("/api/tools/css-gradient", optionalAuth, toolGate("css-gradient"), async (req, res) => {
  const type = req.body?.type === "radial" ? "radial" : "linear";
  const angle = Math.min(Math.max(parseInt(req.body?.angle, 10) || 0, 0), 360);
  const colors = Array.isArray(req.body?.colors) ? req.body.colors.map(String).slice(0, 8) : [];
  const cleanColors = colors.filter((c) => /^#[0-9a-f]{3,8}$/i.test(c.trim()));
  if (cleanColors.length < 2) return res.status(400).json({ error: "Enter at least two valid hex colors." });
  const css = type === "linear"
    ? `linear-gradient(${angle}deg, ${cleanColors.join(", ")})`
    : `radial-gradient(circle, ${cleanColors.join(", ")})`;
  res.json({ css: `background: ${css};` });
});

router.post("/api/tools/tip-calculator", optionalAuth, toolGate("tip-calculator"), async (req, res) => {
  const bill = Number(req.body?.bill);
  const tipPercent = Number(req.body?.tipPercent);
  const people = Math.max(1, parseInt(req.body?.people, 10) || 1);
  if (!Number.isFinite(bill) || bill < 0 || !Number.isFinite(tipPercent) || tipPercent < 0) {
    return res.status(400).json({ error: "Enter a valid bill amount and tip percentage." });
  }
  const tipAmount = bill * (tipPercent / 100);
  const total = bill + tipAmount;
  res.json({
    tipAmount: tipAmount.toFixed(2),
    total: total.toFixed(2),
    perPersonTotal: (total / people).toFixed(2),
    perPersonTip: (tipAmount / people).toFixed(2),
  });
});

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
];

router.post("/api/tools/random-quote", optionalAuth, toolGate("random-quote"), async (req, res) => {
  res.json(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
});

const ASCII_FONT = {
  A: ["#####", "#...#", "#####", "#...#", "#...#"],
  B: ["####.", "#...#", "####.", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "###..", "#....", "#####"],
  F: ["#####", "#....", "###..", "#....", "#...."],
  G: [".####", "#....", "#.###", "#...#", ".####"],
  H: ["#...#", "#...#", "#####", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "#####"],
  J: ["#####", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "###..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "####.", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#..##", ".####"],
  R: ["####.", "#...#", "####.", "#..#.", "#...#"],
  S: [".####", "#....", ".###.", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  Y: ["#...#", ".#.#.", "..#..", "..#..", "..#.."],
  Z: ["#####", "...#.", "..#..", ".#...", "#####"],
  "0": [".###.", "#...#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "#####"],
  "2": [".###.", "#...#", "..##.", ".#...", "#####"],
  "3": ["####.", "....#", "..##.", "....#", "####."],
  "4": ["#..#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "####."],
  "6": [".###.", "#....", "####.", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", "..#.."],
  "8": [".###.", "#...#", ".###.", "#...#", ".###."],
  "9": [".###.", "#...#", ".####", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "..##.", ".....", "..#.."],
  ".": [".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", "..#..", ".#..."],
};

router.post("/api/tools/ascii-art", optionalAuth, toolGate("ascii-art"), async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "Enter some text first." });
  if (text.length > 20) return res.status(400).json({ error: "Keep it to 20 characters or fewer." });
  const chars = text.toUpperCase().split("").map((c) => ASCII_FONT[c] || ASCII_FONT[" "]);
  const rows = ["", "", "", "", ""];
  chars.forEach((glyph) => {
    for (let r = 0; r < 5; r++) rows[r] += glyph[r].split("").map((px) => (px === "#" ? "█" : " ")).join("") + "  ";
  });
  res.json({ output: rows.join("\n") });
});

function parseYamlScalar(raw) {
  const s = raw.trim();
  if (s === "") return "";
  if (s === "null" || s === "~") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (s.startsWith("[") && s.endsWith("]")) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((x) => parseYamlScalar(x.trim()));
  }
  return s;
}

function yamlToJs(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  let pos = 0;
  function indentOf(line) { return line.match(/^ */)[0].length; }

  function parseBlock(baseIndent) {
    if (pos >= lines.length) return null;
    const firstIndent = indentOf(lines[pos]);
    if (firstIndent < baseIndent) return null;
    const isList = lines[pos].trim().startsWith("- ") || lines[pos].trim() === "-";

    if (isList) {
      const arr = [];
      while (pos < lines.length && indentOf(lines[pos]) === firstIndent && (lines[pos].trim().startsWith("- ") || lines[pos].trim() === "-")) {
        const line = lines[pos];
        const trimmed = line.trim().replace(/^-\s?/, "");
        if (trimmed.includes(":") && !trimmed.startsWith("{")) {
          const dashCol = line.indexOf("-");
          lines[pos] = " ".repeat(dashCol + 2) + trimmed;
          arr.push(parseBlock(dashCol + 2));
        } else if (trimmed === "") {
          pos++;
          arr.push(parseBlock(firstIndent + 2));
        } else {
          arr.push(parseYamlScalar(trimmed));
          pos++;
        }
      }
      return arr;
    } else {
      const obj = {};
      while (pos < lines.length && indentOf(lines[pos]) === firstIndent) {
        const line = lines[pos];
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) { pos++; continue; }
        const key = line.slice(0, colonIdx).trim();
        const rest = line.slice(colonIdx + 1).trim();
        pos++;
        if (rest === "") {
          const nextIndent = pos < lines.length ? indentOf(lines[pos]) : -1;
          obj[key] = nextIndent > firstIndent ? parseBlock(nextIndent) : null;
        } else {
          obj[key] = parseYamlScalar(rest);
        }
      }
      return obj;
    }
  }
  return parseBlock(0);
}

function yamlScalarToStr(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return /[:#\-\[\]{}]/.test(v) || v === "" ? JSON.stringify(v) : v;
  return String(v);
}

function jsToYaml(value, indent) {
  indent = indent || 0;
  const pad = "  ".repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return pad + "[]\n";
    return value.map((v) => {
      if (v !== null && typeof v === "object") {
        const inner = jsToYaml(v, indent + 1).replace(/^ {2}/, "- ");
        return pad + inner.trimStart().split("\n").map((l, i) => (i === 0 ? l : pad + "  " + l)).join("\n");
      }
      return pad + "- " + yamlScalarToStr(v);
    }).join("\n") + "\n";
  }
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) return pad + "{}\n";
    return keys.map((k) => {
      const v = value[k];
      if (v !== null && typeof v === "object" && (Array.isArray(v) ? v.length : Object.keys(v).length)) {
        return pad + k + ":\n" + jsToYaml(v, indent + 1);
      }
      return pad + k + ": " + yamlScalarToStr(v);
    }).join("\n") + "\n";
  }
  return pad + yamlScalarToStr(value) + "\n";
}

router.post("/api/tools/yaml-json", optionalAuth, toolGate("yaml-json"), async (req, res) => {
  const input = String(req.body?.input || "");
  const direction = req.body?.direction === "jsonToYaml" ? "jsonToYaml" : "yamlToJson";
  if (!input.trim()) return res.status(400).json({ error: "Paste some data first." });
  if (input.length > 200000) return res.status(400).json({ error: "That's too long (max 200,000 characters)." });
  try {
    if (direction === "yamlToJson") {
      res.json({ output: JSON.stringify(yamlToJs(input), null, 2) });
    } else {
      const data = JSON.parse(input);
      res.json({ output: jsToYaml(data).replace(/\n{3,}/g, "\n\n").trim() + "\n" });
    }
  } catch (err) {
    res.status(400).json({ error: direction === "yamlToJson" ? "Could not parse that as YAML." : "Could not parse that as JSON." });
  }
});

function jsonDiffCompare(a, b, path) {
  path = path || "";
  const diffs = [];
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ path: path || "$", type: "changed", from: a, to: b });
    return diffs;
  }
  if (a !== null && b !== null && typeof a === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) {
      const childPath = path + (Array.isArray(a) ? `[${key}]` : (path ? "." : "") + key);
      if (!(key in a)) diffs.push({ path: childPath, type: "added", to: b[key] });
      else if (!(key in b)) diffs.push({ path: childPath, type: "removed", from: a[key] });
      else diffs.push(...jsonDiffCompare(a[key], b[key], childPath));
    }
  } else if (a !== b) {
    diffs.push({ path: path || "$", type: "changed", from: a, to: b });
  }
  return diffs;
}

router.post("/api/tools/json-diff", optionalAuth, toolGate("json-diff"), async (req, res) => {
  const jsonA = String(req.body?.jsonA || "");
  const jsonB = String(req.body?.jsonB || "");
  if (!jsonA.trim() || !jsonB.trim()) return res.status(400).json({ error: "Paste JSON in both boxes first." });
  if (jsonA.length > 200000 || jsonB.length > 200000) return res.status(400).json({ error: "That's too long (max 200,000 characters each)." });
  let a, b;
  try { a = JSON.parse(jsonA); } catch { return res.status(400).json({ error: "The first box isn't valid JSON." }); }
  try { b = JSON.parse(jsonB); } catch { return res.status(400).json({ error: "The second box isn't valid JSON." }); }
  const diffs = jsonDiffCompare(a, b);
  res.json({ diffs, identical: diffs.length === 0 });
});

router.post("/api/tools/password-hash", optionalAuth, toolGate("password-hash"), async (req, res) => {
  const mode = req.body?.mode === "verify" ? "verify" : "generate";
  const password = String(req.body?.password || "");
  if (!password) return res.status(400).json({ error: "Enter a password first." });
  if (password.length > 1000) return res.status(400).json({ error: "That password is too long." });
  if (mode === "generate") {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    res.json({ output: `${salt}:${hash}` });
  } else {
    const stored = String(req.body?.hash || "").trim();
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return res.status(400).json({ error: "That doesn't look like a hash this tool generated." });
    try {
      const check = crypto.scryptSync(password, salt, 64).toString("hex");
      const matches = check.length === hash.length && crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
      res.json({ matches });
    } catch {
      res.status(400).json({ error: "That doesn't look like a hash this tool generated." });
    }
  }
});

router.post("/api/tools/totp", optionalAuth, toolGate("totp"), async (req, res) => {
  const mode = req.body?.mode === "verify" ? "verify" : "generate";
  try {
    if (mode === "generate") {
      const secret = new Secret({ size: 20 });
      const totp = new TOTP({ issuer: "ES TEAMS TV", label: "demo", algorithm: "SHA1", digits: 6, period: 30, secret });
      res.json({ secret: secret.base32, code: totp.generate(), period: 30 });
    } else {
      const secretB32 = String(req.body?.secret || "").trim().toUpperCase();
      const token = String(req.body?.token || "").trim();
      if (!secretB32 || !token) return res.status(400).json({ error: "Enter both a secret and a code." });
      let secret;
      try { secret = Secret.fromBase32(secretB32); } catch { return res.status(400).json({ error: "That doesn't look like a valid Base32 secret." }); }
      const totp = new TOTP({ algorithm: "SHA1", digits: 6, period: 30, secret });
      const delta = totp.validate({ token, window: 1 });
      res.json({ valid: delta !== null });
    }
  } catch (err) {
    res.status(400).json({ error: "Could not process that TOTP request." });
  }
});

const NAME_PREFIXES = ["Bright", "Swift", "Blue", "Prime", "Nova", "Peak", "Core", "True", "Nex", "Vivid", "Clear", "North"];
const NAME_SUFFIXES = ["ify", "ly", "Hub", "Base", "Labs", "Works", "ify", "io", "wise", "ify", "app", "spot"];

router.post("/api/tools/name-generator", optionalAuth, toolGate("name-generator"), async (req, res) => {
  const keyword = String(req.body?.keyword || "").trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!keyword) return res.status(400).json({ error: "Enter a keyword first." });
  if (keyword.length > 40) return res.status(400).json({ error: "Keep the keyword under 40 characters." });
  const capitalized = keyword[0].toUpperCase() + keyword.slice(1).toLowerCase();
  const names = new Set();
  while (names.size < 10) {
    const usePrefix = Math.random() > 0.5;
    const decorator = usePrefix ? NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)] : NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    names.add(usePrefix ? decorator + capitalized : capitalized + decorator);
  }
  res.json({ names: [...names] });
});

router.post("/api/tools/countdown-gate", optionalAuth, toolGate("countdown"), async (req, res) => {
  res.json({ ok: true });
});

function minifyJs(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let lastMeaningfulChar = "";
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let str = ch;
      i++;
      while (i < n) {
        if (src[i] === "\\") { str += src[i] + (src[i + 1] || ""); i += 2; continue; }
        if (src[i] === quote) { str += src[i]; i++; break; }
        str += src[i]; i++;
      }
      out += str;
      lastMeaningfulChar = quote;
      continue;
    }
    if (ch === "/" && (/[=(:,;!&|?{}[\n]/.test(lastMeaningfulChar) || lastMeaningfulChar === "")) {
      let str = "/";
      i++;
      let inClass = false;
      let looksLikeRegex = true;
      const scanStart = i;
      while (i < n) {
        if (src[i] === "\\") { str += src[i] + (src[i + 1] || ""); i += 2; continue; }
        if (src[i] === "[") inClass = true;
        if (src[i] === "]") inClass = false;
        if (src[i] === "/" && !inClass) { str += src[i]; i++; break; }
        if (src[i] === "\n") { looksLikeRegex = false; break; }
        str += src[i]; i++;
      }
      if (looksLikeRegex) {
        out += str;
        lastMeaningfulChar = "/";
        continue;
      }
      i = scanStart;
      out += "/";
      lastMeaningfulChar = "/";
      i++;
      continue;
    }
    if (/\s/.test(ch)) {
      while (i < n && /\s/.test(src[i])) i++;
      if (out.length && i < n) out += " ";
      continue;
    }
    out += ch;
    lastMeaningfulChar = ch;
    i++;
  }
  return out.replace(/ ?([{}();,:]) ?/g, "$1").trim();
}

function minifyCss(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (src[i] === '"' || src[i] === "'") {
      const quote = src[i];
      out += src[i]; i++;
      while (i < n && src[i] !== quote) { out += src[i]; i++; }
      out += src[i]; i++;
      continue;
    }
    if (/\s/.test(src[i])) {
      while (i < n && /\s/.test(src[i])) i++;
      if (out.length && !/[\s{;:,]$/.test(out)) out += " ";
      continue;
    }
    out += src[i]; i++;
  }
  return out.replace(/\s*([{}:;,])\s*/g, "$1").replace(/;}/g, "}").trim();
}

function beautifyCss(src) {
  const compact = minifyCss(src);
  let out = "";
  let indent = 0;
  for (let i = 0; i < compact.length; i++) {
    const ch = compact[i];
    if (ch === "{") { out += " {\n" + "  ".repeat(indent + 1); indent++; }
    else if (ch === "}") {
      indent = Math.max(0, indent - 1);
      out = out.replace(/[ \t]*$/, "");
      if (!out.endsWith("\n")) out += "\n";
      out += "  ".repeat(indent) + "}\n" + "  ".repeat(indent);
    } else if (ch === ";") { out += ";\n" + "  ".repeat(indent); }
    else out += ch;
  }
  return out.replace(/\n[ \t]*\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim() + "\n";
}

function beautifyJs(src) {
  const compact = minifyJs(src);
  let out = "";
  let indent = 0;
  let inString = null;
  for (let i = 0; i < compact.length; i++) {
    const ch = compact[i];
    if (inString) {
      out += ch;
      if (ch === "\\") { out += compact[++i] || ""; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inString = ch; out += ch; continue; }
    if (ch === "{") { out += "{\n" + "  ".repeat(indent + 1); indent++; continue; }
    if (ch === "}") {
      indent = Math.max(0, indent - 1);
      out = out.replace(/[ \t]*$/, "");
      if (!out.endsWith("\n")) out += "\n";
      out += "  ".repeat(indent) + "}";
      if (compact[i + 1] && !/[;,)\n]/.test(compact[i + 1])) out += "\n" + "  ".repeat(indent);
      continue;
    }
    if (ch === ";") { out += ";\n" + "  ".repeat(indent); continue; }
    out += ch;
  }
  return out.replace(/\n[ \t]*\n/g, "\n").trim() + "\n";
}

const HTML_PRESERVE_TAGS = ["script", "style", "pre", "textarea"];

function tokenizeHtmlPreserving(html) {
  const tokens = [];
  let i = 0;
  const n = html.length;
  while (i < n) {
    let matched = false;
    for (const tag of HTML_PRESERVE_TAGS) {
      const openRe = new RegExp("^<" + tag + "(\\s[^>]*)?>", "i");
      if (openRe.test(html.slice(i))) {
        const closeRe = new RegExp("</" + tag + "\\s*>", "i");
        const closeMatch = html.slice(i).match(closeRe);
        if (closeMatch) {
          const fullEnd = i + closeMatch.index + closeMatch[0].length;
          tokens.push({ type: "preserved", text: html.slice(i, fullEnd) });
          i = fullEnd;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;
    let next = n;
    for (const tag of HTML_PRESERVE_TAGS) {
      const idx = html.slice(i).search(new RegExp("<" + tag + "(\\s|>)", "i"));
      if (idx !== -1 && i + idx < next) next = i + idx;
    }
    tokens.push({ type: "html", text: html.slice(i, next) });
    i = next;
  }
  return tokens;
}

function minifyHtml(src) {
  const tokens = tokenizeHtmlPreserving(src);
  return tokens.map((t) => {
    if (t.type === "preserved") return t.text;
    return t.text.replace(/<!--[\s\S]*?-->/g, "").replace(/>\s+</g, "><").replace(/\s+/g, " ").trim();
  }).join("");
}

function beautifyHtml(src) {
  const minified = minifyHtml(src);
  const parts = minified.split(/(<[^>]+>)/g).filter((p) => p.length);
  let out = "";
  let indent = 0;
  const selfClosingTag = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)[\s/>]/i;
  const declarationTag = /^<[!?]/;
  parts.forEach((part) => {
    if (/^<\//.test(part)) {
      indent = Math.max(0, indent - 1);
      out += "  ".repeat(indent) + part + "\n";
    } else if (/^<[a-zA-Z!?]/.test(part)) {
      out += "  ".repeat(indent) + part + "\n";
      if (!selfClosingTag.test(part) && !/\/>$/.test(part) && !declarationTag.test(part)) indent++;
    } else if (part.trim()) {
      out += "  ".repeat(indent) + part.trim() + "\n";
    }
  });
  return out.trim() + "\n";
}

router.post("/api/tools/minify", optionalAuth, toolGate("minify"), async (req, res) => {
  const lang = req.body?.lang;
  const mode = req.body?.mode === "beautify" ? "beautify" : "minify";
  const code = String(req.body?.code || "");
  if (!code.trim()) return res.status(400).json({ error: "Paste some code first." });
  if (code.length > 300000) return res.status(400).json({ error: "That's too long (max 300,000 characters)." });
  try {
    let output;
    if (lang === "css") output = mode === "minify" ? minifyCss(code) : beautifyCss(code);
    else if (lang === "html") output = mode === "minify" ? minifyHtml(code) : beautifyHtml(code);
    else if (lang === "js") output = mode === "minify" ? minifyJs(code) : beautifyJs(code);
    else return res.status(400).json({ error: "Unknown language." });
    res.json({ output });
  } catch (err) {
    res.status(400).json({ error: "Could not process that code." });
  }
});

router.post("/api/tools/robots-txt", optionalAuth, toolGate("robots-txt"), async (req, res) => {
  const rules = Array.isArray(req.body?.rules) ? req.body.rules.slice(0, 30) : [];
  const sitemapUrl = String(req.body?.sitemapUrl || "").trim();
  if (!rules.length) return res.status(400).json({ error: "Add at least one rule first." });
  const lines = [];
  rules.forEach((r) => {
    const agent = String(r?.agent || "*").trim() || "*";
    const disallow = Array.isArray(r?.disallow) ? r.disallow : [];
    const allow = Array.isArray(r?.allow) ? r.allow : [];
    lines.push(`User-agent: ${agent}`);
    allow.forEach((p) => { if (String(p).trim()) lines.push(`Allow: ${String(p).trim()}`); });
    disallow.forEach((p) => { if (String(p).trim()) lines.push(`Disallow: ${String(p).trim()}`); });
    lines.push("");
  });
  if (sitemapUrl) lines.push(`Sitemap: ${sitemapUrl}`);
  res.json({ output: lines.join("\n").trim() + "\n" });
});

router.post("/api/tools/sitemap-xml", optionalAuth, toolGate("sitemap-xml"), async (req, res) => {
  const urls = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 200) : [];
  const clean = urls.map((u) => String(u || "").trim()).filter((u) => /^https?:\/\//i.test(u));
  if (!clean.length) return res.status(400).json({ error: "Enter at least one valid URL first." });
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const entries = clean.map((u) => `  <url>\n    <loc>${esc(u)}</loc>\n  </url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  res.json({ output: xml });
});

const SQL_KEYWORDS = ["SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LEFT JOIN", "RIGHT JOIN", "INNER JOIN", "JOIN", "LIMIT", "OFFSET", "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "UNION ALL", "UNION"];

function formatSql(sql) {
  let s = sql.replace(/\s+/g, " ").trim();
  const kws = [...SQL_KEYWORDS].sort((a, b) => b.length - a.length);
  kws.forEach((kw) => {
    const re = new RegExp("\\s*\\b" + kw.replace(" ", "\\s+") + "\\b\\s*", "gi");
    s = s.replace(re, "\n" + kw + " ");
  });
  s = s.replace(/\bAND\b/gi, "\nAND").replace(/\bOR\b/gi, "\nOR");
  s = s.replace(/,\s*/g, ",\n");
  const kwStarts = kws.map((k) => k.toUpperCase());
  return s.split("\n").map((l) => l.trim()).filter(Boolean).map((line) => {
    const upper = line.toUpperCase();
    const isKeywordLine = kwStarts.some((k) => upper.startsWith(k)) || /^(AND|OR)\b/i.test(line) && false;
    return isKeywordLine ? line : "  " + line;
  }).join("\n");
}

router.post("/api/tools/sql-format", optionalAuth, toolGate("sql-format"), async (req, res) => {
  const sql = String(req.body?.sql || "");
  if (!sql.trim()) return res.status(400).json({ error: "Paste a SQL query first." });
  if (sql.length > 100000) return res.status(400).json({ error: "That's too long (max 100,000 characters)." });
  res.json({ output: formatSql(sql) });
});

function validateJsonSchema(value, schema, path) {
  path = path || "$";
  const errors = [];
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    const normalized = actual === "number" && Number.isInteger(value) && types.includes("integer") ? "integer" : actual;
    if (!types.includes(actual) && !types.includes(normalized)) {
      errors.push(`${path}: expected type ${types.join(" or ")}, got ${actual}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path}: value not in enum [${schema.enum.join(", ")}]`);
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern) {
      try { if (!new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match pattern ${schema.pattern}`); }
      catch { errors.push(`${path}: schema has an invalid pattern`); }
    }
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const required = schema.required || [];
    required.forEach((key) => { if (!(key in value)) errors.push(`${path}: missing required property "${key}"`); });
    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        if (key in value) errors.push(...validateJsonSchema(value[key], schema.properties[key], path + "." + key));
      });
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, idx) => errors.push(...validateJsonSchema(item, schema.items, `${path}[${idx}]`)));
  }
  return errors;
}

router.post("/api/tools/json-schema-validate", optionalAuth, toolGate("json-schema-validate"), async (req, res) => {
  const jsonText = String(req.body?.json || "");
  const schemaText = String(req.body?.schema || "");
  if (!jsonText.trim() || !schemaText.trim()) return res.status(400).json({ error: "Enter both JSON and a schema first." });
  if (jsonText.length > 200000 || schemaText.length > 200000) return res.status(400).json({ error: "That's too long (max 200,000 characters each)." });
  let data, schema;
  try { data = JSON.parse(jsonText); } catch { return res.status(400).json({ error: "The JSON box isn't valid JSON." }); }
  try { schema = JSON.parse(schemaText); } catch { return res.status(400).json({ error: "The schema box isn't valid JSON." }); }
  const errors = validateJsonSchema(data, schema);
  res.json({ valid: errors.length === 0, errors });
});

router.post("/api/tools/favicon-gate", optionalAuth, toolGate("favicon"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/meme-text-gate", optionalAuth, toolGate("meme-text"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/signature-gate", optionalAuth, toolGate("signature"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/colorblind-gate", optionalAuth, toolGate("colorblind"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/api-tester-gate", optionalAuth, toolGate("api-tester"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/ws-tester-gate", optionalAuth, toolGate("ws-tester"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/file-detect-gate", optionalAuth, toolGate("file-detect"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/speech-gate", optionalAuth, toolGate("speech"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/qr-scan-gate", optionalAuth, toolGate("qr-scan"), async (req, res) => { res.json({ ok: true }); });
router.post("/api/tools/ocr-gate", optionalAuth, toolGate("ocr"), async (req, res) => { res.json({ ok: true }); });

export { router as toolsRouter };
