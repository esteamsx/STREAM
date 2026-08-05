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

export async function analyzeImage(url) {
  const data = await fetchJson(`${BASE}/imgscan?url=${encodeURIComponent(url)}`);
  if (!data.success || !data.result) {
    throw Object.assign(new Error("Could not analyze that image."), { status: 502 });
  }
  return { description: data.result };
}
