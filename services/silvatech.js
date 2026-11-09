import crypto from "node:crypto";

const CDN_FINDER = "https://media.savetube.vip/api/random-cdn";
const AES_KEY = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";
const MAX_ATTEMPTS = 4;
const BUDGET_MS = 24000;
const SAVETUBE_ORIGIN = "https://savetube.vip";

function videoIdFrom(url) {
  const match = [
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /music\.youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ].map((pattern) => String(url).match(pattern)).find(Boolean);
  return match ? match[1] : null;
}

function decryptPayload(encoded) {
  const raw = Buffer.from(String(encoded).replace(/\s/g, ""), "base64");
  if (raw.length < 17) throw new Error("The service returned an unreadable payload.");
  const decipher = crypto.createDecipheriv("aes-128-cbc", AES_KEY, raw.subarray(0, 16));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(16)), decipher.final()]).toString("utf8"));
}

async function requestJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Download service responded ${response.status}.`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function servesMedia(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      headers: { Range: "bytes=0-1", "user-agent": UA },
      redirect: "manual",
      signal: controller.signal,
    });
    await response.body?.cancel();
    if (response.status >= 300) return false;
    const type = String(response.headers.get("content-type") || "");
    return /^(audio|video)\//i.test(type) || /octet-stream/i.test(type);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function attempt(videoUrl, id, isAudio, quality) {
  const headers = {
    "content-type": "application/json",
    "user-agent": UA,
    origin: SAVETUBE_ORIGIN,
    referer: `${SAVETUBE_ORIGIN}/`,
  };
  const cdnResponse = await requestJson(CDN_FINDER, { headers }, 12000);
  const cdn = cdnResponse && cdnResponse.cdn;
  if (!cdn) throw new Error("The service did not return a download server.");

  const infoResponse = await requestJson(`https://${cdn}/v2/info`, {
    method: "POST",
    headers,
    body: JSON.stringify({ url: videoUrl }),
  }, 15000);
  if (!infoResponse || !infoResponse.data) throw new Error(infoResponse?.message || "Video not found or not supported.");
  const meta = decryptPayload(infoResponse.data);

  let downloadUrl = null;
  if (!isAudio && Array.isArray(meta.video_formats)) {
    const format = meta.video_formats.find((item) => String(item.quality) === quality && item.url);
    if (format) downloadUrl = `${format.url}${format.url.includes("?") ? "&" : "?"}title=${meta.titleSlug || "video"}`;
  }
  if (!downloadUrl) {
    const downloadResponse = await requestJson(`https://${cdn}/download`, {
      method: "POST",
      headers,
      body: JSON.stringify({ id, downloadType: isAudio ? "audio" : "video", quality, key: meta.key }),
    }, 20000);
    downloadUrl = downloadResponse?.data?.downloadUrl;
  }
  if (!downloadUrl) throw new Error("The service did not return a download link.");
  return { meta, downloadUrl };
}

async function runSaveTube(input, format) {
  if (!input || !/^https?:\/\//i.test(String(input))) throw new Error("Invalid URL.");
  const id = videoIdFrom(String(input));
  if (!id) throw new Error("Failed to extract a YouTube video id from that link.");
  const isAudio = String(format).toLowerCase() === "mp3";
  const quality = isAudio ? "128" : "720";
  const url = `https://www.youtube.com/watch?v=${id}`;
  const started = Date.now();
  let best = null;
  let lastError = null;

  for (let attemptNumber = 0; attemptNumber < MAX_ATTEMPTS && Date.now() - started < BUDGET_MS; attemptNumber += 1) {
    try {
      const result = await attempt(url, id, isAudio, quality);
      best = best || result;
      if (await servesMedia(result.downloadUrl)) {
        best = result;
        break;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (!best) throw new Error(lastError?.message || "The download service is not responding right now.");

  const { meta, downloadUrl } = best;
  const seconds = Number(meta.duration) || 0;
  return {
    title: meta.title || null,
    thumbnail: meta.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    duration: seconds,
    durationText: meta.durationLabel || `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    videoId: id,
    url,
    format: isAudio ? "mp3" : "mp4",
    download: downloadUrl,
    download_url: downloadUrl,
    cover: meta.thumbnail || null,
  };
}

async function runDirectYoutubeFallback(videoUrl, format) {
  const module = await import("@distube/ytdl-core");
  const ytdl = module.default || module;
  const info = await ytdl.getInfo(videoUrl);
  const isAudio = format === "mp3";
  const candidates = info.formats.filter((item) => isAudio
    ? item.hasAudio && !item.hasVideo
    : item.hasAudio && item.hasVideo && item.container === "mp4");
  candidates.sort((a, b) => (Number(b.audioBitrate || 0) + Number(b.height || 0)) - (Number(a.audioBitrate || 0) + Number(a.height || 0)));
  const chosen = candidates[0];
  if (!chosen?.url) throw new Error("YouTube did not return a compatible media format.");
  const details = info.videoDetails || {};
  return {
    title: details.title || "Untitled",
    thumbnail: details.thumbnails?.at(-1)?.url || null,
    duration: Number(details.lengthSeconds) || 0,
    download: chosen.url,
  };
}

export async function fetchYoutubeMp3(videoUrl) {
  let result;
  try { result = await runSaveTube(videoUrl, "mp3"); }
  catch (primaryError) {
    try { result = await runDirectYoutubeFallback(videoUrl, "mp3"); }
    catch { throw primaryError; }
  }
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: result.duration,
    audioUrl: result.download,
    directAudioUrl: null,
  };
}

export async function fetchYoutubeMp4(videoUrl) {
  let result;
  try { result = await runSaveTube(videoUrl, "mp4"); }
  catch (primaryError) {
    try { result = await runDirectYoutubeFallback(videoUrl, "mp4"); }
    catch { throw primaryError; }
  }
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: result.duration,
    quality: "720",
    videoUrl: result.download,
    fallbackVideoUrl: null,
    fallbackAudioUrl: null,
  };
}
