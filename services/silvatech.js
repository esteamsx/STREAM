const BASE_URL = "https://api.silvatech.co.ke/download";

async function callSilvatech(endpoint, videoUrl) {
  const apiUrl = `${BASE_URL}/${endpoint}?url=${encodeURIComponent(videoUrl)}`;
  const res = await fetch(apiUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    throw Object.assign(new Error(`Silvatech API responded ${res.status}.`), { status: 502 });
  }
  const data = await res.json();
  if (!data || data.status !== true || data.result == null || data.result === "") {
    throw Object.assign(new Error("Silvatech API did not return a usable result."), { status: 502 });
  }
  return data.result;
}

function mp3Link(result) {
  if (typeof result === "string") return result;
  return result && (result.dl_link || result.download_url || result.downloadUrl || result.url || result.link || result.direct_audio_url);
}

export async function fetchYoutubeMp3(videoUrl) {
  let result;
  try {
    result = await callSilvatech("ytmp3", videoUrl);
    if (!mp3Link(result)) throw new Error("Silvatech ytmp3 returned no download link.");
  } catch (primaryError) {
    // The documented /download/audio route returns a simple URL string and
    // is a reliable fallback when the metadata downloader is unavailable.
    result = await callSilvatech("audio", videoUrl).catch(() => { throw primaryError; });
  }
  const audioUrl = mp3Link(result);
  if (!audioUrl) {
    throw Object.assign(new Error("No downloadable audio found for that video."), { status: 404 });
  }
  const details = typeof result === "object" ? result : {};
  return {
    title: details.title || "Untitled",
    thumbnail: details.thumbnail || null,
    duration: Number(details.duration || 0),
    audioUrl,
    directAudioUrl: details.direct_audio_url || (audioUrl !== details.dl_link ? audioUrl : null),
  };
}

export async function fetchYoutubeMp4(videoUrl) {
  const result = await callSilvatech("ytmp4", videoUrl);
  const videoUrlOut = result.download_url || result.downloadUrl || result.url || result.link || result.direct_video_url;
  if (!videoUrlOut) {
    throw Object.assign(new Error("No downloadable video found for that video."), { status: 404 });
  }
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: Number(result.duration || 0),
    quality: result.quality || null,
    videoUrl: videoUrlOut,
    fallbackVideoUrl: result.direct_video_url || null,
    fallbackAudioUrl: result.direct_audio_url || null,
  };
}
