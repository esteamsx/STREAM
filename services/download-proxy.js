import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { watermarkImageBuffer } from "./image-watermark.js";
import { watermarkVideoBuffer, watermarkAudioBuffer, canWatermarkSize } from "./video-watermark.js";
import { muxRemoteAvToBuffer } from "./av-mux.js";

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

export function inspectDownloadToken(token) {
  const invalid = { status: 403, error: "Invalid token" };
  if (!token || typeof token !== "string" || !token.includes(".")) return invalid;
  const [payloadB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", DL_TOKEN_SECRET).update("dev-dl:" + payloadB64).digest("hex").slice(0, 32);
  const sigBuf = Buffer.from(sig || "", "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return invalid;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
  } catch {
    return invalid;
  }
  if (!payload.url || !payload.exp) return invalid;
  if (Date.now() > payload.exp) return { status: 410, error: "Token expired" };
  return { payload };
}

export function verifyDownloadToken(token) {
  return inspectDownloadToken(token).payload || null;
}

const UPSTREAM_HEADERS_TIMEOUT_MS = 20000;

function sourceHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

function logDlError(stage, err, payload, extra) {
  const cause = err && err.cause ? ` cause=${err.cause.code || ""} ${err.cause.message || err.cause}` : "";
  const detail = err && err.stack ? err.stack : String(err);
  console.error(`dev-api dl ${stage} host=${sourceHost(payload && payload.url)}${extra ? " " + extra : ""}${cause}: ${detail}`);
}

async function fetchOnce(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_HEADERS_TIMEOUT_MS);
  try {
    return await fetch(url, { headers, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, headers, attempts) {
  let lastResponse = null;
  let lastError = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetchOnce(url, headers);
      if (response.ok || (response.status < 500 && response.status !== 429)) return response;
      if (lastResponse && lastResponse.body) lastResponse.body.cancel().catch(() => {});
      lastResponse = response;
      lastError = null;
    } catch (err) {
      lastError = err;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError;
}

export async function streamProxiedFile(payload, req, res) {
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    };
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetchWithRetry(payload.url, headers, 3);

    if (!upstream.ok && payload.fallbackVideoUrl && payload.fallbackAudioUrl) {
      try {
        const muxed = await muxRemoteAvToBuffer(payload.fallbackVideoUrl, payload.fallbackAudioUrl);
        res.status(200);
        res.set("Content-Type", "video/mp4");
        res.set("Content-Length", String(muxed.length));
        res.set("Accept-Ranges", "none");
        res.set("Cache-Control", "no-store");
        if (payload.filename) {
          res.set("Content-Disposition", `attachment; filename="${payload.filename.replace(/[^\w.\-]/g, "_")}"`);
        }
        return res.end(muxed);
      } catch (muxErr) {
        logDlError("mux fallback", muxErr, payload);
      }
    }

    if (!upstream.ok && upstream.status !== 416) {
      if (upstream.body) upstream.body.cancel().catch(() => {});
      console.error(`dev-api dl upstream rejected host=${sourceHost(payload.url)} status=${upstream.status}`);
      const gone = upstream.status === 404 || upstream.status === 410;
      const limited = upstream.status === 429;
      const outStatus = gone ? 404 : limited ? 503 : 502;
      const message = gone
        ? "Source file is no longer available"
        : limited
          ? "Source is rate limiting requests"
          : upstream.status === 401 || upstream.status === 403
            ? "Source rejected the request, source link may have expired"
            : "Source returned an error";
      return res.status(outStatus).json({ error: message, upstream_status: upstream.status });
    }

    const ct = payload.mime || upstream.headers.get("content-type");

    if (payload.watermark && upstream.ok && ct && ct.startsWith("image/")) {
      const raw = Buffer.from(await upstream.arrayBuffer());
      let out = raw;
      let outType = ct;
      try {
        out = await watermarkImageBuffer(raw, payload.watermarkText || "ES TEAMS TV");
        if (ct === "image/png") outType = "image/png";
        else if (ct === "image/webp") outType = "image/webp";
        else outType = "image/jpeg";
      } catch (err) {
        out = raw;
      }
      res.status(200);
      res.set("Content-Type", outType);
      res.set("Content-Length", String(out.length));
      res.set("Accept-Ranges", "none");
      res.set("Cache-Control", "no-store");
      if (payload.filename) {
        res.set("Content-Disposition", `attachment; filename="${payload.filename.replace(/[^\w.\-]/g, "_")}"`);
      }
      return res.end(out);
    }

    if (payload.watermark && upstream.ok && ct && (ct.startsWith("video/") || ct.startsWith("audio/"))) {
      const cl = Number(upstream.headers.get("content-length") || 0);
      if (canWatermarkSize(cl)) {
        const raw = Buffer.from(await upstream.arrayBuffer());
        const out = ct.startsWith("video/")
          ? await watermarkVideoBuffer(raw, payload.watermarkText || "ES TEAMS TV")
          : await watermarkAudioBuffer(raw, payload.watermarkText || "ES TEAMS TV");
        res.status(200);
        res.set("Content-Type", ct);
        res.set("Content-Length", String(out.length));
        res.set("Accept-Ranges", "none");
        res.set("Cache-Control", "no-store");
        if (payload.filename) {
          res.set("Content-Disposition", `attachment; filename="${payload.filename.replace(/[^\w.\-]/g, "_")}"`);
        }
        return res.end(out);
      }
    }

    res.status(upstream.status);
    const cl = upstream.headers.get("content-length");
    const cr = upstream.headers.get("content-range");
    if (ct) res.set("Content-Type", ct);
    if (cr) res.set("Content-Range", cr);
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "no-store");
    if (payload.filename) {
      res.set("Content-Disposition", `attachment; filename="${payload.filename.replace(/[^\w.\-]/g, "_")}"`);
    }

    const declaredSize = Number(cl || 0);
    const canBufferWhole = upstream.ok && !req.headers.range && declaredSize > 0 && declaredSize <= 80 * 1024 * 1024;

    if (canBufferWhole) {
      try {
        const fullBuffer = Buffer.from(await upstream.arrayBuffer());
        res.set("Content-Length", String(fullBuffer.length));
        return res.end(fullBuffer);
      } catch (bufferErr) {
        logDlError("buffering", bufferErr, payload);
        if (!res.headersSent) return res.status(502).json({ error: "Could not download that file completely." });
        return res.end();
      }
    }

    if (cl) res.set("Content-Length", cl);

    if (upstream.body) {
      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.on("error", (streamErr) => {
        logDlError("stream", streamErr, payload);
        res.destroy();
      });
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    logDlError("proxy", err, payload);
    const timedOut = err && (err.name === "AbortError" || err.name === "TimeoutError");
    if (!res.headersSent) {
      if (timedOut) res.status(504).json({ error: "Source timed out" });
      else res.status(502).json({ error: "Could not reach the file source." });
    } else res.end();
  }
}

export function sanitizeFilename(name) {
  return String(name || "download")
    .replace(/[^\w\s.\-]/g, "")
    .trim()
    .slice(0, 80) || "download";
}
