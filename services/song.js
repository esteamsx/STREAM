import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";
import { getYoutubeStreams } from "./youtube-innertube.js";

function buildYtdlOptions() {
  const cookieHeader = process.env.YOUTUBE_COOKIE;
  const proxyUrl = process.env.YTDL_PROXY_URL;
  const options = {};
  if (proxyUrl) {
    try {
      options.agent = ytdl.createProxyAgent({ uri: proxyUrl });
    } catch (err) {
      console.error("Could not build a ytdl-core proxy agent, using default:", err.message);
    }
  }
  if (cookieHeader) {
    options.requestOptions = { headers: { cookie: cookieHeader } };
  }
  return options;
}

function isRateLimitError(err) {
  return err.statusCode === 429 || /\b429\b/.test(err.message || "");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getInfoWithRetry(url, options) {
  const delaysMs = [1500, 4000];
  let lastErr;
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await ytdl.getInfo(url, options);
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || attempt === delaysMs.length) throw err;
      console.error(`ytdl.getInfo hit a rate limit, retrying in ${delaysMs[attempt]}ms...`);
      await sleep(delaysMs[attempt]);
    }
  }
  throw lastErr;
}

async function fetchViaYtdlCore(videoUrl) {
  const options = buildYtdlOptions();
  const info = await getInfoWithRetry(videoUrl, Object.keys(options).length ? options : undefined);
  const audioFormat = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
  const videoFormat = ytdl.chooseFormat(info.formats, { quality: "18" }) || ytdl.chooseFormat(info.formats, { filter: "videoandaudio" });
  if (!audioFormat && !videoFormat) {
    throw Object.assign(new Error("Found a match but it has no downloadable formats available."), { status: 502 });
  }
  return {
    audioUrl: audioFormat ? audioFormat.url : null,
    videoUrl: videoFormat ? videoFormat.url : null,
  };
}

export async function fetchSongByQuery(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }

  let audioUrl = null;
  let videoUrl = null;
  let thumbnail = video.thumbnail || null;
  let title = video.title || "Untitled";

  try {
    const streams = await getYoutubeStreams(video.url);
    audioUrl = streams.audioUrl;
    videoUrl = streams.videoUrl;
    thumbnail = streams.thumbnail || thumbnail;
    title = streams.title || title;
  } catch (err) {
    console.error("InnerTube (ANDROID_VR) fetch failed, falling back to ytdl-core:", err.message);
    try {
      const fallback = await fetchViaYtdlCore(video.url);
      audioUrl = fallback.audioUrl;
      videoUrl = fallback.videoUrl;
    } catch (fallbackErr) {
      console.error("ytdl-core fallback also failed:", fallbackErr.message);
      const friendly = isRateLimitError(fallbackErr)
        ? "YouTube is rate-limiting this server right now, try again in a minute."
        : `Found a match but could not read its download info (${fallbackErr.message}).`;
      throw Object.assign(new Error(friendly), { status: 502 });
    }
  }

  if (!audioUrl && !videoUrl) {
    throw Object.assign(new Error("Found a match but it has no downloadable formats available."), { status: 502 });
  }

  return { title, thumbnail, audioUrl, videoUrl };
}
