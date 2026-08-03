import express from "express";
import dns from "node:dns/promises";
import tls from "node:tls";
import net from "node:net";
import { verifySolution } from "altcha-lib";
import QRCode from "qrcode";
import JavaScriptObfuscator from "javascript-obfuscator";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { optionalAuth, isAdminEmail } from "../services/auth.js";

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
const MAX_OBFUSCATE_LENGTH = 50000;

router.post("/api/tools/obfuscate", optionalAuth, toolGate("obfuscate"), async (req, res) => {
  const code = String(req.body?.code || "");
  if (!code.trim()) return res.status(400).json({ error: "Paste some JavaScript code first." });
  if (code.length > MAX_OBFUSCATE_LENGTH) {
    return res.status(400).json({ error: `Code is too long (max ${MAX_OBFUSCATE_LENGTH.toLocaleString()} characters).` });
  }
  try {
    const result = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      selfDefending: true,
    });
    res.json({ code: result.getObfuscatedCode() });
  } catch {
    res.status(400).json({ error: "Could not obfuscate that code — check it's valid JavaScript." });
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

export { router as toolsRouter };
