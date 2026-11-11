import {
  emmyGet,
  firstSuccessful,
  pickMediaUrl,
  pickAvatarUrl,
  pickText,
  deepFind,
  parseCount,
  parseDuration,
  TITLE_KEYS,
  AUTHOR_KEYS,
  DURATION_KEYS,
} from "./emmy-api.js";

const FETCH_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 700;
const HOSTS = ["https://www.tikwm.com", "https://tikwm.com"];
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.tikwm.com",
  Referer: "https://www.tikwm.com/",
};

function absoluteUrl(value) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${HOSTS[0]}${value}`;
  return value;
}

async function requestOnce(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      console.error(`tiktok upstream ${res.status} host=${new URL(url).host}`);
      throw Object.assign(new Error(`TikTok service responded ${res.status}.`), { status: 502, upstreamStatus: res.status });
    }
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    console.error(`tiktok upstream unreachable host=${new URL(url).host}: ${err && err.message ? err.message : err}`);
    throw Object.assign(new Error("Could not reach the TikTok service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

async function callTikwm(path, params) {
  const query = new URLSearchParams(params).toString();
  const attempts = [];
  for (const host of HOSTS) {
    attempts.push(() => requestOnce(`${host}${path}?${query}`, { headers: BROWSER_HEADERS }));
    attempts.push(() =>
      requestOnce(`${host}${path}`, {
        method: "POST",
        headers: { ...BROWSER_HEADERS, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: query,
      })
    );
  }
  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      const data = await attempts[i]();
      if (data && data.code === -1 && /limit/i.test(String(data.msg || ""))) {
        lastError = Object.assign(new Error("TikTok service is busy, try again in a few seconds."), { status: 503 });
      } else {
        return data;
      }
    } catch (err) {
      lastError = err;
      if (err.upstreamStatus === 404) break;
    }
    if (i < attempts.length - 1) await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  throw lastError;
}

const EMMY_TIKTOK_PROVIDERS = ["savetik", "vibetik-tiktokdl", "tiktokdl-rapidapi", "aio-rapidapi"];

function imagesFromResult(result) {
  const found = [];
  (function walk(value, key, depth) {
    if (value === null || value === undefined || depth > 6) return;
    if (Array.isArray(value)) {
      if (/(image|photo|slide|picture)s?$/i.test(key)) {
        for (const item of value) {
          const link = typeof item === "string" ? item : item && (item.url || item.src || item.image);
          if (typeof link === "string" && /^https?:\/\//i.test(link)) found.push(link);
        }
      }
      value.forEach((item) => walk(item, key, depth + 1));
      return;
    }
    if (typeof value === "object") {
      for (const [childKey, child] of Object.entries(value)) walk(child, childKey, depth + 1);
    }
  })(result, "", 0);
  return [...new Set(found)];
}

export async function resolveTikTokViaEmmy(url) {
  const steps = EMMY_TIKTOK_PROVIDERS.map((endpoint) => ({
    name: endpoint,
    run: async () => {
      const result = await emmyGet(endpoint, { url });
      const videoUrl = pickMediaUrl(result, "video", url);
      const images = videoUrl ? [] : imagesFromResult(result);
      if (!videoUrl && !images.length) {
        throw Object.assign(new Error("The service did not return a TikTok download link."), { status: 502 });
      }
      return {
        type: images.length ? "images" : "video",
        title: pickText(result, TITLE_KEYS) || "tiktok-media",
        author: pickText(result, AUTHOR_KEYS),
        cover: pickMediaUrl(result, "thumb", url),
        duration: parseDuration(deepFind(result, DURATION_KEYS)) || null,
        videoUrl,
        audioUrl: pickMediaUrl(result, "audio", url),
        images,
      };
    },
  }));
  return firstSuccessful(steps, { budgetMs: 45000 });
}

export async function getTikTokProfileViaEmmy(username) {
  const handle = String(username || "").trim().replace(/^@/, "");
  if (!handle) throw Object.assign(new Error("Missing username."), { status: 400 });
  const result = await emmyGet("tiktok-inspector", { username: handle });
  const nickname = pickText(result, ["nickname", "name", "displayName"]);
  const followers = parseCount(deepFind(result, ["followerCount", "followers", "fans"]));
  if (!nickname && followers === null) {
    throw Object.assign(new Error("Could not find that TikTok user."), { status: 404 });
  }
  return {
    uniqueId: pickText(result, ["uniqueId", "unique_id", "username", "handle"]) || handle,
    nickname: nickname || handle,
    verified: deepFind(result, ["verified", "isVerified"]) === true,
    bio: pickText(result, ["signature", "bio", "description"]) || "",
    avatar: pickAvatarUrl(result),
    followers,
    following: parseCount(deepFind(result, ["followingCount", "following"])),
    likes: parseCount(deepFind(result, ["heartCount", "likeCount", "likes", "hearts", "heart"])),
    videos: parseCount(deepFind(result, ["videoCount", "videos", "posts"])),
  };
}

export async function resolveTikTokMedia(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("Invalid TikTok URL."), { status: 400 });
  }
  if (!/(^|\.)tiktok\.com$/.test(parsed.hostname)) {
    throw Object.assign(new Error("URL must be a tiktok.com link."), { status: 400 });
  }

  try {
    return await resolveTikTokViaEmmy(url);
  } catch (err) {
    console.error(`tiktok emmy providers failed, using fallback: ${err && err.message ? err.message : err}`);
  }

  const data = await callTikwm("/api/", { url });
  if (data.code !== 0 || !data.data) {
    throw Object.assign(new Error(data.msg || "Could not resolve that TikTok link."), { status: 404 });
  }

  const item = data.data;
  const images = Array.isArray(item.images) ? item.images : [];

  return {
    type: images.length ? "images" : "video",
    title: item.title || "tiktok-media",
    author: (item.author && (item.author.nickname || item.author.unique_id)) || null,
    videoUrl: absoluteUrl(item.play || item.hdplay || item.wmplay),
    audioUrl: absoluteUrl(item.music),
    images: images.map(absoluteUrl).filter(Boolean),
  };
}

export async function getTikTokProfile(username) {
  const handle = String(username || "").trim().replace(/^@/, "");
  if (!handle) throw Object.assign(new Error("Missing username."), { status: 400 });
  try {
    return await getTikTokProfileViaEmmy(handle);
  } catch (err) {
    console.error(`tiktok emmy profile failed, using fallback: ${err && err.message ? err.message : err}`);
  }
  const data = await callTikwm("/api/user/info", { unique_id: handle });
  if (data.code !== 0 || !data.data) {
    throw Object.assign(new Error(data.msg || "Could not find that TikTok user."), { status: 404 });
  }
  const u = data.data.user || {};
  const s = data.data.stats || {};
  return {
    uniqueId: u.uniqueId,
    nickname: u.nickname,
    verified: !!u.verified,
    bio: u.signature || "",
    avatar: u.avatarLarger,
    followers: s.followerCount,
    following: s.followingCount,
    likes: s.heartCount,
    videos: s.videoCount,
  };
}
