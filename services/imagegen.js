const FETCH_TIMEOUT_MS = 60000;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ESTeamsTV/1.0; +https://esteamstv.devs.surf)",
};
const BG_ROUTER_URL = "https://router.huggingface.co/fal-ai/fal-ai/bria/background/remove";

export async function generateImageFromPrompt(prompt, options = {}) {
  const width = Math.min(Math.max(Number(options.width) || 1024, 256), 1920);
  const height = Math.min(Math.max(Number(options.height) || 1024, 256), 1920);
  const seed = Number(options.seed) || Math.floor(Math.random() * 1000000);

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(imageUrl, { signal: controller.signal, headers: REQUEST_HEADERS });
    if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      throw Object.assign(new Error("The image provider did not return an image. Try a different prompt."), { status: 502 });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not generate that image right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function removeImageBackground(imageUrl) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw Object.assign(new Error("Background removal is not configured on this server."), { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(BG_ROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: controller.signal,
    });
  } catch (err) {
    throw Object.assign(new Error("The background removal provider did not respond in time. Try again shortly."), { status: 504 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error(`Background removal failed (upstream responded ${res.status}${detail ? `: ${detail.slice(0, 150)}` : ""}).`), { status: 502 });
  }

  const data = await res.json().catch(() => null);
  const resultUrl = data && data.image && data.image.url;
  if (!resultUrl) {
    throw Object.assign(new Error("Background removal did not return an image. The provider may be overloaded, try again shortly."), { status: 502 });
  }

  return { imageUrl: resultUrl };
}
