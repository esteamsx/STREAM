const BASE_URL = "https://api.silvatech.co.ke/download";

async function callSilvatech(endpoint, videoUrl) {
  const apiUrl = `${BASE_URL}/${endpoint}?url=${encodeURIComponent(videoUrl)}`;
  const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    throw Object.assign(new Error(`Silvatech API responded ${res.status}.`), { status: 502 });
  }
  const data = await res.json();
  if (!data || data.status !== true || !data.result) {
    throw Object.assign(new Error("Silvatech API did not return a usable result."), { status: 502 });
  }
  return data.result;
}

export async function fetchYoutubeMp3(videoUrl) {
  const result = await callSilvatech("ytmp3", videoUrl);
  const audioUrl = result.dl_link || result.direct_audio_url;
  if (!audioUrl) {
    throw Object.assign(new Error("No downloadable audio found for that video."), { status: 404 });
  }
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: Number(result.duration || 0),
    audioUrl,
  };
}

export async function fetchYoutubeMp4(videoUrl) {
  const result = await callSilvatech("ytmp4", videoUrl);
  const videoUrlOut = result.download_url || result.direct_video_url;
  if (!videoUrlOut) {
    throw Object.assign(new Error("No downloadable video found for that video."), { status: 404 });
  }
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: Number(result.duration || 0),
    quality: result.quality || null,
    videoUrl: videoUrlOut,
  };
}
