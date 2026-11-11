import {
  emmyGet,
  firstSuccessful,
  pickMediaUrl,
  pickText,
  deepFind,
  parseDuration,
  probeMedia,
  TITLE_KEYS,
  THUMB_KEYS,
  DURATION_KEYS,
} from "./emmy-api.js";

const BUDGET_MS = 55000;
const VIDEO_QUALITIES = ["144", "240", "360", "480", "720", "1080"];

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

export function normalizeVideoQuality(wanted) {
  const target = parseInt(wanted, 10);
  if (!Number.isFinite(target) || target <= 0) return "720";
  return VIDEO_QUALITIES.reduce((best, level) =>
    Math.abs(Number(level) - target) < Math.abs(Number(best) - target) ? level : best, "720");
}

function normalizeInput(input) {
  if (!input || !/^https?:\/\//i.test(String(input))) {
    throw Object.assign(new Error("Invalid URL."), { status: 400 });
  }
  const id = videoIdFrom(String(input));
  if (!id) throw Object.assign(new Error("Failed to extract a YouTube video id from that link."), { status: 400 });
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}

function emmyStep({ endpoint, params, kind, url, id, checked }) {
  return {
    name: `${endpoint}${params.format ? `:${params.format}` : ""}`,
    run: async () => {
      const result = await emmyGet(endpoint, { url, ...params });
      const download = pickMediaUrl(result, kind, url);
      if (!download) throw Object.assign(new Error("The service did not return a download link."), { status: 502 });
      if (!checked && !(await probeMedia(download))) {
        throw Object.assign(new Error("The service returned a link that is not downloadable."), { status: 502 });
      }
      const thumbnailRaw = pickMediaUrl(result, "thumb", url);
      return {
        title: pickText(result, TITLE_KEYS),
        thumbnail: thumbnailRaw || `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        duration: parseDuration(deepFind(result, DURATION_KEYS)),
        download,
        quality: params.format && /^\d+$/.test(params.format) ? params.format : null,
      };
    },
  };
}

function audioSteps(url, id) {
  return [
    emmyStep({ endpoint: "savetube", params: { format: "mp3" }, kind: "audio", url, id, checked: true }),
    emmyStep({ endpoint: "ytshortdown", params: { format: "mp3" }, kind: "audio", url, id, checked: true }),
    emmyStep({ endpoint: "clipto", params: {}, kind: "audio", url, id, checked: false }),
  ];
}

function videoSteps(url, id, quality) {
  return [
    emmyStep({ endpoint: "savetube", params: { format: quality }, kind: "video", url, id, checked: true }),
    emmyStep({ endpoint: "ytshortdown", params: { format: quality }, kind: "video", url, id, checked: true }),
    emmyStep({ endpoint: "clipto", params: {}, kind: "video", url, id, checked: false }),
    emmyStep({ endpoint: "ssvid", params: {}, kind: "video", url, id, checked: false }),
    emmyStep({ endpoint: "ytdl-rapidapi", params: {}, kind: "video", url, id, checked: false }),
  ];
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

let directFallback = runDirectYoutubeFallback;
export function __setDirectFallbackForTests(fn) {
  directFallback = fn || runDirectYoutubeFallback;
}

async function resolve(steps, url, format) {
  try {
    return await firstSuccessful(steps, { budgetMs: BUDGET_MS });
  } catch (primaryError) {
    try { return await directFallback(url, format); }
    catch {
      if (!primaryError.status) primaryError.status = 502;
      throw primaryError;
    }
  }
}

export async function fetchYoutubeMp3(videoUrl) {
  const { id, url } = normalizeInput(videoUrl);
  const result = await resolve(audioSteps(url, id), url, "mp3");
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: result.duration,
    audioUrl: result.download,
    directAudioUrl: null,
  };
}

export async function fetchYoutubeMp4(videoUrl, quality) {
  const { id, url } = normalizeInput(videoUrl);
  const wanted = normalizeVideoQuality(quality);
  const result = await resolve(videoSteps(url, id, wanted), url, "mp4");
  return {
    title: result.title || "Untitled",
    thumbnail: result.thumbnail || null,
    duration: result.duration,
    quality: result.quality || wanted,
    videoUrl: result.download,
    fallbackVideoUrl: null,
    fallbackAudioUrl: null,
  };
}
