import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";

const FETCH_TIMEOUT_MS = 30000;

async function tryCobalt(url) {
  const res = await fetch("https://api.cobalt.tools/api/json", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url, isAudioOnly: false }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!res.ok || !data || (data.status !== "stream" && data.status !== "redirect") || !data.url) {
    throw new Error((data && (data.text || data.status)) || `HTTP ${res.status}`);
  }
  return data.url;
}

export async function fetchSongByQuery(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }

  const cobaltUrl = await tryCobalt(video.url).catch(() => null);

  let audioUrl = null;
  let videoUrl = cobaltUrl;
  try {
    const info = await ytdl.getInfo(video.url);
    const audioFormat = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    audioUrl = audioFormat ? audioFormat.url : null;
    if (!videoUrl) {
      const videoFormat = ytdl.chooseFormat(info.formats, { quality: "18" }) || ytdl.chooseFormat(info.formats, { filter: "videoandaudio" });
      videoUrl = videoFormat ? videoFormat.url : null;
    }
  } catch (err) {
    if (!videoUrl && !audioUrl) {
      throw Object.assign(new Error(`Found a match but could not read its download info (${err.message}).`), { status: 502 });
    }
  }

  return {
    title: video.title || "Untitled",
    thumbnail: video.thumbnail || null,
    audioUrl,
    videoUrl,
  };
}
