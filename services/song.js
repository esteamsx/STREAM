import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";

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
    console.log(`Using YOUTUBE_COOKIE (${cookieHeader.length} chars) for this request.`);
  } else {
    console.log("No YOUTUBE_COOKIE set for this request.");
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

export async function fetchSongByQuery(query) {
  const searched = await ytsearch(query).catch(() => null);
  const video = searched && searched.videos && searched.videos[0];
  if (!video) {
    throw Object.assign(new Error("Could not find a match for that search."), { status: 404 });
  }

  let info;
  try {
    const options = buildYtdlOptions();
    info = await getInfoWithRetry(video.url, Object.keys(options).length ? options : undefined);
  } catch (err) {
    console.error("ytdl.getInfo failed:", err.message);
    const friendly = isRateLimitError(err)
      ? "YouTube is rate-limiting this server right now, try again in a minute."
      : `Found a match but could not read its download info (${err.message}).`;
    throw Object.assign(new Error(friendly), { status: 502 });
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
