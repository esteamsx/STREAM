import ytsearch from "yt-search";
import { fetchYoutubeMp3, fetchYoutubeMp4 } from "./silvatech.js";

async function findVideo(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }
  return video;
}

export async function fetchMp3ByQuery(query) {
  const video = await findVideo(query);
  const result = await fetchYoutubeMp3(video.url);
  return {
    title: result.title || video.title || "Untitled",
    thumbnail: result.thumbnail || video.thumbnail || null,
    audioUrl: result.audioUrl,
  };
}

export async function fetchMp4ByQuery(query) {
  const video = await findVideo(query);
  const result = await fetchYoutubeMp4(video.url);
  return {
    title: result.title || video.title || "Untitled",
    thumbnail: result.thumbnail || video.thumbnail || null,
    videoUrl: result.videoUrl,
    fallbackVideoUrl: result.fallbackVideoUrl,
    fallbackAudioUrl: result.fallbackAudioUrl,
  };
}
