const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`TikTok service responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the TikTok service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
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

  const data = await fetchJson(`https://tikwm.com/api/?url=${encodeURIComponent(url)}`);
  if (data.code !== 0 || !data.data) {
    throw Object.assign(new Error(data.msg || "Could not resolve that TikTok link."), { status: 404 });
  }

  const item = data.data;
  const images = Array.isArray(item.images) ? item.images : [];

  return {
    type: images.length ? "images" : "video",
    title: item.title || "tiktok-media",
    author: (item.author && (item.author.nickname || item.author.unique_id)) || null,
    videoUrl: item.play || item.hdplay || item.wmplay || null,
    audioUrl: item.music || null,
    images,
  };
}
