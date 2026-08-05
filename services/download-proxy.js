import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

function getDlTokenSecret() {
  if (process.env.STREAM_TOKEN_SECRET) return process.env.STREAM_TOKEN_SECRET;

  const secretPath = path.join(process.cwd(), ".stream-token-secret");
  try {
    const existing = fs.readFileSync(secretPath, "utf8").trim();
    if (existing) return existing;
  } catch {
  }

  const generated = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  } catch {
  }
  return generated;
}
const DL_TOKEN_SECRET = getDlTokenSecret();

export function signDownloadToken(payload, ttlMs) {
  const exp = Date.now() + ttlMs;
  const body = JSON.stringify({ ...payload, exp });
  const payloadB64 = Buffer.from(body).toString("base64url");
  const sig = crypto.createHmac("sha256", DL_TOKEN_SECRET).update("dev-dl:" + payloadB64).digest("hex").slice(0, 32);
  return `${payloadB64}.${sig}`;
}

export function verifyDownloadToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", DL_TOKEN_SECRET).update("dev-dl:" + payloadB64).digest("hex").slice(0, 32);
  const sigBuf = Buffer.from(sig || "", "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return null;
  }
  if (!payload.url || !payload.exp || Date.now() > payload.exp) return null;
  return payload;
}

export async function streamProxiedFile(payload, req, res) {
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    };
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(payload.url, { headers, redirect: "follow" });

    res.status(upstream.status);
    const ct = payload.mime || upstream.headers.get("content-type");
    const cl = upstream.headers.get("content-length");
    const cr = upstream.headers.get("content-range");
    if (ct) res.set("Content-Type", ct);
    if (cl) res.set("Content-Length", cl);
    if (cr) res.set("Content-Range", cr);
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "no-store");
    if (payload.filename) {
      res.set("Content-Disposition", `attachment; filename="${payload.filename.replace(/[^\w.\-]/g, "_")}"`);
    }

    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (err) {
    console.error("dev-api download proxy error:", err.message);
    if (!res.headersSent) res.status(502).json({ error: "Could not reach the file source." });
    else res.end();
  }
}

export function sanitizeFilename(name) {
  return String(name || "download")
    .replace(/[^\w\s.\-]/g, "")
    .trim()
    .slice(0, 80) || "download";
}
