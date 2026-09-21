import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";

export async function fetchSongByQuery(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }

  const info = await ytdl.getInfo(video.url).catch(() => null);
  if (!info) {
    throw Object.assign(new Error("Found a match but could not read its download info."), { status: 502 });
  }

  const audioFormat = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
  const videoFormat = ytdl.chooseFormat(info.formats, { quality: "18" }) || ytdl.chooseFormat(info.formats, { filter: "videoandaudio" });

  return {
    title: info.videoDetails.title || video.title || "Untitled",
    thumbnail: video.thumbnail || info.videoDetails.thumbnails?.slice(-1)[0]?.url || null,
    audioUrl: audioFormat ? audioFormat.url : null,
    videoUrl: videoFormat ? videoFormat.url : null,
  };
}
