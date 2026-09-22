import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";

function parseCookieHeader(header) {
  return String(header || "")
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: ".youtube.com" };
    });
}

function buildYtdlAgent() {
  const cookieHeader = process.env.YOUTUBE_COOKIE;
  const proxyUrl = process.env.YTDL_PROXY_URL;
  const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : undefined;
  try {
    if (proxyUrl) return ytdl.createProxyAgent({ uri: proxyUrl }, cookies);
    if (cookies && cookies.length) return ytdl.createAgent(cookies);
  } catch (err) {
    console.error("Could not build a ytdl-core agent, using default:", err.message);
  }
  return undefined;
}

export async function fetchSongByQuery(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }

  let info;
  try {
    const agent = buildYtdlAgent();
    info = await ytdl.getInfo(video.url, agent ? { agent } : undefined);
  } catch (err) {
    console.error("ytdl.getInfo failed:", err.message);
    throw Object.assign(new Error(`Found a match but could not read its download info (${err.message}).`), { status: 502 });
  }

  const audioFormat = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
  const videoFormat = ytdl.chooseFormat(info.formats, { quality: "18" }) || ytdl.chooseFormat(info.formats, { filter: "videoandaudio" });

  if (!audioFormat && !videoFormat) {
    throw Object.assign(new Error("Found a match but it has no downloadable formats available."), { status: 502 });
  }

  return {
    title: video.title || "Untitled",
    thumbnail: video.thumbnail || null,
    audioUrl: audioFormat ? audioFormat.url : null,
    videoUrl: videoFormat ? videoFormat.url : null,
  };
}
