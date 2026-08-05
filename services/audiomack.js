const FETCH_TIMEOUT_MS = 15000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Audiomack responded ${res.status}.`), { status: 502 });
    return await res.text();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach Audiomack right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

function extractEmbeddedJson(html) {
  const patterns = [
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/,
    /<script[^>]+type="application\/json"[^>]*>([\s\S]+?)<\/script>/,
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (!match) continue;
    try {
      return JSON.parse(match[1]);
    } catch {
    }
  }
  return null;
}

function findTrackInJson(node, depth = 0, seen = new Set()) {
  if (!node || typeof node !== "object" || depth > 10 || seen.has(node)) return null;
  seen.add(node);

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findTrackInJson(item, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  const title = node.title || node.song_title || node.name;
  const streamUrl = node.url_stream || node.streaming_url || node.audio_url || node.play_url || node.stream_url;
  if (title && typeof title === "string" && typeof streamUrl === "string" && /^https?:\/\//.test(streamUrl)) {
    const artist = (node.artist && (node.artist.name || node.artist)) || node.uploader || node.artist_name || "";
    return {
      title,
      artist: typeof artist === "string" ? artist : "",
      durationSeconds: Number(node.duration) || 0,
      streamUrl,
    };
  }

  for (const key of Object.keys(node)) {
    const found = findTrackInJson(node[key], depth + 1, seen);
    if (found) return found;
  }
  return null;
}

export async function searchAudiomackTrack(query) {
  const searchUrl = `https://audiomack.com/search/${encodeURIComponent(query)}`;
  const html = await fetchHtml(searchUrl);
  const data = extractEmbeddedJson(html);
  const track = data ? findTrackInJson(data) : null;
  if (!track) throw Object.assign(new Error("No results found for that search."), { status: 404 });
  return track;
}
