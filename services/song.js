import crypto from "crypto";
import ytsearch from "yt-search";
import { fetchYoutubeMp4 } from "./silvatech.js";

const SAVETUBE_KEY = Buffer.from("C5D58EF67A7584E4A29F6C35BBC4EB12", "hex");
const SAVETUBE_HEADERS = {
  "content-type": "application/json",
  origin: "https://yt.savetube.me",
  "user-agent": "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
};
const SAVETUBE_TIMEOUT_MS = 20000;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...SAVETUBE_HEADERS, ...(options.headers || {}) },
    signal: AbortSignal.timeout(SAVETUBE_TIMEOUT_MS),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(`SaveTube returned HTTP ${response.status}.`), { status: 502 });
  }
  return data;
}

function youtubeId(url) {
  const source = String(url || "");
  const patterns = [
    /youtube\.com\/watch\?[^#]*\bv=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
  ];
  return patterns.map((pattern) => source.match(pattern)?.[1]).find(Boolean) || null;
}

function saveTubeCdnUrl(cdn) {
  let parsed;
  try {
    parsed = new URL(`https://${String(cdn || "").replace(/^https?:\/\//i, "")}`);
  } catch {
    throw Object.assign(new Error("SaveTube returned an invalid CDN."), { status: 502 });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw Object.assign(new Error("SaveTube returned an invalid CDN."), { status: 502 });
  }
  return parsed.origin;
}

async function saveTube(url, format = "mp3") {
  const id = youtubeId(url);
  if (!id) throw Object.assign(new Error("Failed to extract the YouTube link."), { status: 400 });
  if (format !== "mp3") throw Object.assign(new Error("Only MP3 format is enabled for this endpoint."), { status: 400 });

  try {
    const cdnResponse = await fetchJson("https://media.savetube.vip/api/random-cdn", { method: "GET" });
    const cdn = saveTubeCdnUrl(cdnResponse?.cdn);
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;

    const infoResponse = await fetchJson(`${cdn}/v2/info`, {
      method: "POST",
      body: JSON.stringify({ url: canonicalUrl }),
    });
    const encryptedData = infoResponse?.data?.data || infoResponse?.data;
    if (typeof encryptedData !== "string" || !encryptedData) {
      throw Object.assign(new Error("SaveTube did not return video information."), { status: 502 });
    }

    const encrypted = Buffer.from(encryptedData, "base64");
    if (encrypted.length <= 16) {
      throw Object.assign(new Error("SaveTube returned invalid video information."), { status: 502 });
    }
    const decipher = crypto.createDecipheriv("aes-128-cbc", SAVETUBE_KEY, encrypted.subarray(0, 16));
    const decrypted = JSON.parse(Buffer.concat([decipher.update(encrypted.subarray(16)), decipher.final()]).toString("utf8"));

    const downloadResponse = await fetchJson(`${cdn}/download`, {
      method: "POST",
      body: JSON.stringify({
        id,
        downloadType: "audio",
        quality: "128",
        key: decrypted.key,
      }),
    });
    const downloadUrl = downloadResponse?.data?.data?.downloadUrl || downloadResponse?.data?.downloadUrl;
    if (!downloadUrl || !/^https?:\/\//i.test(downloadUrl)) {
      throw Object.assign(new Error("SaveTube did not return a downloadable audio link."), { status: 502 });
    }

    return {
      title: decrypted.title || null,
      thumbnail: decrypted.thumbnail || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      duration: Number(decrypted.duration || 0),
      audioUrl: downloadUrl,
    };
  } catch (err) {
    if (err?.status) throw err;
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw Object.assign(new Error("SaveTube timed out while preparing the audio."), { status: 504 });
    }
    throw Object.assign(new Error("Could not reach the MP3 provider right now."), { status: 502, cause: err });
  }
}

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
  const result = await saveTube(video.url, "mp3");
  return {
    title: result.title || video.title || "Untitled",
    thumbnail: result.thumbnail || video.thumbnail || null,
    audioUrl: result.audioUrl,
    duration: result.duration,
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
