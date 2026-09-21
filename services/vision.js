import { assertPublicHttpUrl } from "./url-safety.js";

const FETCH_TIMEOUT_MS = 60000;
const CAPTION_MODEL_URL = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large";

export async function analyzeImage(url) {
  const token = process.env.HF_API_TOKEN;
  if (!token) {
    throw Object.assign(new Error("Image analysis is not configured on this server (missing HF_API_TOKEN)."), { status: 503 });
  }

  const safeUrl = await assertPublicHttpUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const imgRes = await fetch(safeUrl, { signal: controller.signal, redirect: "error" });
    if (!imgRes.ok) {
      throw Object.assign(new Error(`Could not fetch that image URL (source responded ${imgRes.status}).`), { status: 400 });
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const hfRes = await fetch(CAPTION_MODEL_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" },
      body: imgBuffer,
      signal: controller.signal,
    });
    const data = await hfRes.json().catch(() => null);
    const caption = Array.isArray(data) && data[0] && data[0].generated_text;
    if (!caption) {
      const detail = (data && (data.error || JSON.stringify(data))) || `HTTP ${hfRes.status}`;
      throw Object.assign(new Error(`Could not analyze that image (${String(detail).slice(0, 150)}).`), { status: 502 });
    }
    return { description: caption };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error(`Could not analyze that image (${err.message}).`), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
