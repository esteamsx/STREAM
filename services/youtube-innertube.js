
const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`;
const CLIENT_VERSION = "1.60.19";

function androidVrContext() {
  return {
    client: {
      clientName: "ANDROID_VR",
      clientVersion: CLIENT_VERSION,
      deviceMake: "Oculus",
      deviceModel: "Quest 3",
      androidSdkVersion: 32,
      osName: "Android",
      osVersion: "12",
      hl: "en",
      gl: "US",
    },
  };
}

function extractVideoId(input) {
  const trimmed = String(input || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }
  return null;
}

async function fetchPlayerData(videoId) {
  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12; en_US; Oculus Quest3) gzip",
    },
    body: JSON.stringify({
      videoId,
      context: androidVrContext(),
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`YouTube InnerTube responded ${res.status}.`), { status: 502 });
  }
  return res.json();
}

function pickBestAudio(formats) {
  const audioFormats = formats.filter((f) => f.mimeType && f.mimeType.startsWith("audio/") && f.url);
  if (!audioFormats.length) return null;
  return audioFormats.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
}

function pickBestVideo(formats) {
  const muxed = formats.filter((f) => f.mimeType && f.mimeType.startsWith("video/") && f.audioQuality && f.url);
  if (muxed.length) {
    return muxed.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  }
  const videoOnly = formats.filter((f) => f.mimeType && f.mimeType.startsWith("video/") && f.url);
  if (!videoOnly.length) return null;
  return videoOnly.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
}

export async function getYoutubeStreams(input) {
  const videoId = extractVideoId(input);
  if (!videoId) {
    throw Object.assign(new Error("Could not find a YouTube video ID in that input."), { status: 400 });
  }

  const data = await fetchPlayerData(videoId);

  const playability = data.playabilityStatus && data.playabilityStatus.status;
  if (playability && playability !== "OK") {
    const reason = (data.playabilityStatus && data.playabilityStatus.reason) || playability;
    throw Object.assign(new Error(`This video is not playable (${reason}).`), { status: 422 });
  }

  const formats = [
    ...((data.streamingData && data.streamingData.formats) || []),
    ...((data.streamingData && data.streamingData.adaptiveFormats) || []),
  ];
  if (!formats.length) {
    throw Object.assign(new Error("YouTube returned no downloadable formats for that video."), { status: 502 });
  }

  const bestAudio = pickBestAudio(formats);
  const bestVideo = pickBestVideo(formats);
  if (!bestAudio && !bestVideo) {
    throw Object.assign(new Error("Could not find a usable audio or video stream for that video."), { status: 502 });
  }

  const details = data.videoDetails || {};
  return {
    title: details.title || "Untitled",
    channel: details.author || null,
    duration: Number(details.lengthSeconds || 0),
    thumbnail: (details.thumbnail && details.thumbnail.thumbnails && details.thumbnail.thumbnails.slice(-1)[0]?.url) || null,
    audioUrl: bestAudio ? bestAudio.url : null,
    videoUrl: bestVideo ? bestVideo.url : null,
    videoIsMuxed: !!(bestVideo && bestVideo.audioQuality),
    videoQuality: bestVideo ? (bestVideo.qualityLabel || null) : null,
  };
}
