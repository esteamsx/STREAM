const FETCH_TIMEOUT_MS = 60000;
const BASE = "https://apis.davidcyril.name.ng";

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the download source right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

function extractVideoUrl(result) {
  const candidates = [result.video && result.video.download_url, result.video_url, result.download_url];
  return candidates.find((u) => typeof u === "string" && u.length > 0) || null;
}

export async function fetchSongByQuery(query) {
  const data = await fetchJson(`${BASE}/song?query=${encodeURIComponent(query)}`);
  if (!data.status || !data.result) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }
  const result = data.result;
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    audioUrl: (result.audio && result.audio.download_url) || null,
    videoUrl: extractVideoUrl(result),
  };
}

async function uploadToCatbox(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let hostedUrl;
  try {
    const imgRes = await fetch(url, { signal: controller.signal });
    if (!imgRes.ok) throw Object.assign(new Error("Could not fetch that image URL."), { status: 400 });
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", new Blob([buffer], { type: contentType }), `image.${ext}`);
    const uploadRes = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form, signal: controller.signal });
    if (!uploadRes.ok) throw Object.assign(new Error("Could not host that image for analysis."), { status: 502 });
    hostedUrl = (await uploadRes.text()).trim();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not host that image for analysis."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (!hostedUrl.startsWith("http")) {
    throw Object.assign(new Error("Could not host that image for analysis."), { status: 502 });
  }
  return hostedUrl;
}

export async function analyzeImage(url) {
  const hostedUrl = await uploadToCatbox(url);
  const data = await fetchJson(`${BASE}/imgscan?url=${encodeURIComponent(hostedUrl)}`);
  if (!data.success || !data.result) {
    throw Object.assign(new Error("Could not analyze that image."), { status: 502 });
  }
  return { description: data.result };
}
