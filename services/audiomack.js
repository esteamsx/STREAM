const FETCH_TIMEOUT_MS = 15000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Audiomack responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach Audiomack right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchAudiomackTrack(query) {
  const searchUrl = `https://api.audiomack.com/v1/search/songs?q=${encodeURIComponent(query)}&limit=1`;
  const data = await fetchJson(searchUrl);
  const results = data && (data.results || data.data);
  const track = Array.isArray(results) ? results[0] : null;
  if (!track) throw Object.assign(new Error("No results found for that search."), { status: 404 });

  const streamUrl = track.url_stream || track.streaming_url || track.url;
  if (!streamUrl) throw Object.assign(new Error("That track has no playable stream available."), { status: 502 });

  return {
    title: track.title || "Untitled",
    artist: (track.artist && (track.artist.name || track.artist)) || track.uploader || "",
    durationSeconds: track.duration || 0,
    streamUrl,
  };
}
