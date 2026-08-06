import { createWorker } from "tesseract.js";
import { createRequire } from "module";
import path from "path";
import { assertPublicHttpUrl } from "./url-safety.js";

const require = createRequire(import.meta.url);
const LANG_PATH = path.join(path.dirname(require.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/bmp", "image/webp", "image/gif"]);

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, { langPath: LANG_PATH, cachePath: LANG_PATH }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function fetchImageBuffer(url) {
  const parsed = await assertPublicHttpUrl(url);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(parsed, { signal: controller.signal, redirect: "error" });
  } catch {
    throw Object.assign(new Error("Could not reach that image URL."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw Object.assign(new Error(`Image URL responded ${res.status}.`), { status: 502 });
  }
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw Object.assign(new Error("URL did not return a supported image type (jpeg, png, bmp, webp, gif)."), { status: 415 });
  }
  const contentLength = Number(res.headers.get("content-length") || 0);
  if (contentLength && contentLength > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error("Image is too large (10MB limit)."), { status: 413 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error("Image is too large (10MB limit)."), { status: 413 });
  }
  return buffer;
}

export async function extractTextFromImageUrl(url) {
  const buffer = await fetchImageBuffer(url);
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  return { text: data.text.trim(), confidence: data.confidence };
}
