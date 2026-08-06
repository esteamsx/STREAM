const FETCH_TIMEOUT_MS = 150000;
const ROUTER_URL = "https://router.huggingface.co/fal-ai/fal-ai/wan/v2.2-5b/text-to-video";
const CATBOX_USER_AGENT = "Mozilla/5.0 (compatible; ESTeamsTV/1.0; +https://esteamstv.devs.surf)";

async function uploadVideoToCatbox(buffer, contentType) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const ext = contentType.includes("webm") ? "webm" : "mp4";
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([buffer], { type: contentType }), `video.${ext}`);
    const uploadRes = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form,
      signal: controller.signal,
      headers: { "User-Agent": CATBOX_USER_AGENT },
    });
    const uploadText = (await uploadRes.text()).trim();
    if (!uploadRes.ok || !uploadText.startsWith("http")) {
      throw Object.assign(new Error(`Could not host the generated video (catbox responded: ${uploadText.slice(0, 150)}).`), { status: 502 });
    }
    return uploadText;
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error(`Could not host the generated video (${err.message}).`), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function generateVideoFromPrompt(prompt) {
  const token = process.env.HF_API_TOKEN;
  if (!token) throw Object.assign(new Error("AI video generation is not configured on this server."), { status: 503 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(ROUTER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt }),
      signal: controller.signal,
    });
  } catch (err) {
    throw Object.assign(new Error("The video generation provider did not respond in time. Try a shorter prompt or try again shortly."), { status: 504 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw Object.assign(new Error(`Video generation failed (upstream responded ${res.status}${detail ? `: ${detail.slice(0, 150)}` : ""}).`), { status: 502 });
  }

  const contentType = res.headers.get("content-type") || "video/mp4";
  if (!contentType.startsWith("video/")) {
    throw Object.assign(new Error("Video generation did not return a video. The provider may be overloaded, try again shortly."), { status: 502 });
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const videoUrl = await uploadVideoToCatbox(buffer, contentType);
  return { videoUrl };
}
