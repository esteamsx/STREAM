const DEFAULT_BASE_URL = "https://apis.emmyhenztech.name.ng";
const DEFAULT_TIMEOUT_MS = 25000;
const UA = "Mozilla/5.0 (compatible; ESTeamsTV/1.0; +https://esteamstv.devs.surf)";

function baseUrl() {
  return String(process.env.EMMY_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function fail(message, status, extra) {
  return Object.assign(new Error(message), { status }, extra || {});
}

export async function emmyGet(name, params = {}, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const qs = query.toString();
  const url = `${baseUrl()}/api/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`;

  const headers = { Accept: "application/json", "User-Agent": UA };
  if (process.env.EMMY_API_KEY) headers["X-Api-Key"] = process.env.EMMY_API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  let text;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
    text = await res.text();
  } catch (err) {
    const timedOut = err && (err.name === "AbortError" || err.name === "TimeoutError");
    console.error(`emmy upstream unreachable endpoint=${name}: ${timedOut ? "timeout" : (err && err.message) || err}`);
    throw fail(timedOut ? "The download service timed out." : "Could not reach the download service right now.", 502, { emmy: name });
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }

  const providerMessage = body && typeof body === "object" && (body.error || body.message);
  if (!res.ok || (body && typeof body === "object" && body.status === false)) {
    console.error(`emmy upstream ${res.status} endpoint=${name}`);
    let status = 502;
    let message = typeof providerMessage === "string" && providerMessage ? providerMessage : `Download service responded ${res.status}.`;
    if (res.status === 400 || res.status === 404 || res.status === 422) status = 404;
    else if (res.status === 429) { status = 503; message = "The download service is busy, try again in a few seconds."; }
    else if (res.status === 401 || res.status === 403) message = "The download service rejected the request.";
    throw fail(message, status, { emmy: name, upstreamStatus: res.status });
  }

  if (!body || typeof body !== "object") throw fail("The download service returned an unreadable response.", 502, { emmy: name });
  const result = body.result !== undefined ? body.result : body.data;
  if (result === undefined || result === null) throw fail("The download service returned an empty result.", 502, { emmy: name });
  return result;
}

export async function firstSuccessful(steps, { budgetMs = 55000 } = {}) {
  const started = Date.now();
  let lastError = null;
  for (const step of steps) {
    if (Date.now() - started > budgetMs) break;
    try {
      const value = await step.run();
      if (value) return value;
    } catch (err) {
      lastError = err;
      console.error(`emmy step failed step=${step.name}: ${(err && err.message) || err}`);
    }
  }
  throw lastError || fail("The download service is not responding right now.", 502);
}

const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|heic|bmp)$/;
const AUD_EXT = /\.(mp3|m4a|aac|ogg|opus|wav|flac)$/;
const VID_EXT = /\.(mp4|webm|mov|m4v|mkv|3gp)$/;
const THUMBISH = /(thumb|cover|poster|avatar|preview|banner|icon|logo|profile|artwork)/;
const PAGE_URL_RES = [
  /tiktok\.com\/@[^/]+\/(video|photo)\/\d+/i,
  /instagram\.com\/(p|reel|reels|tv|stories)\//i,
  /(youtube\.com\/(watch|shorts|embed)|youtu\.be\/)/i,
  /facebook\.com\/(watch|reel|[^/]+\/videos)/i,
  /(open\.spotify\.com|soundcloud\.com\/[^/]+\/[^/]+$|pinterest\.[a-z.]+\/pin\/|pin\.it\/)/i,
];

function asUrl(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith("//")) return `https:${text}`;
  return null;
}

function pathnameOf(url) {
  try { return new URL(url).pathname.toLowerCase(); } catch { return String(url).toLowerCase().split("?")[0]; }
}

function normalizeLink(url) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return String(url || "").toLowerCase();
  }
}

function isPageUrl(url, input) {
  if (input && normalizeLink(url) === normalizeLink(input)) return true;
  return PAGE_URL_RES.some((re) => re.test(url));
}

export function collectUrls(node) {
  const out = [];
  const seen = new Set();
  (function walk(value, keys, depth) {
    if (value === null || value === undefined || depth > 7) return;
    if (typeof value === "string") {
      const url = asUrl(value);
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push({ url, key: keys[keys.length - 1] || "", path: keys.join(".").toLowerCase() });
      }
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach((item) => walk(item, keys, depth + 1));
      return;
    }
    if (typeof value === "object") {
      for (const [key, item] of Object.entries(value)) walk(item, [...keys, key], depth + 1);
    }
  })(node, [], 0);
  return out;
}

function scoreCandidate(candidate, kind) {
  const p = candidate.path;
  const k = candidate.key.toLowerCase();
  const pathname = pathnameOf(candidate.url);
  const isImg = IMG_EXT.test(pathname);
  const isAud = AUD_EXT.test(pathname);
  const isVid = VID_EXT.test(pathname);
  const thumbish = THUMBISH.test(p);
  let score = 0;

  if (kind === "video") {
    if (isVid) score += 40;
    if (isImg || isAud) score -= 100;
    if (thumbish) score -= 80;
    if (/(music|audio|sound|mp3|song)/.test(p)) score -= 60;
    if (/(watermark|wm)/.test(p) && !/(no[_-]?water|nowm|no_wm|without|nowatermark)/.test(p)) score -= 40;
    if (/(no[_-]?water|nowm|without[_-]?water|nowatermark|hd)/.test(p)) score += 25;
    if (/(video|mp4|download|play|dl|src|link|url|media)/.test(k)) score += 10;
  } else if (kind === "audio") {
    if (isAud) score += 40;
    if (isImg || isVid) score -= 100;
    if (thumbish) score -= 80;
    if (/(audio|mp3|music|sound|song|download|dl|link|url|stream)/.test(k)) score += 15;
    if (/(video|mp4)/.test(p) && !isAud) score -= 40;
  } else if (kind === "image") {
    if (isImg) score += 40;
    if (isVid || isAud) score -= 100;
    if (thumbish) score -= 80;
    if (/(image|photo|picture|pic|img|download|url|link|src)/.test(k)) score += 15;
    if (/(hd|original|full|large)/.test(p)) score += 10;
  } else if (kind === "thumb") {
    if (isVid || isAud) score -= 100;
    if (isImg) score += 30;
    if (thumbish || /(image|img|pic)/.test(p)) score += 40;
  }
  return score;
}

export function pickMediaUrl(result, kind, input) {
  const minimum = kind === "thumb" ? 20 : -50;
  const ranked = collectUrls(result)
    .filter((c) => !isPageUrl(c.url, input))
    .map((c) => ({ ...c, score: scoreCandidate(c, kind) }))
    .filter((c) => c.score > minimum)
    .sort((a, b) => b.score - a.score);
  return ranked.length ? ranked[0].url : null;
}

const normKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");

export function deepFind(node, names, { maxDepth = 6 } = {}) {
  const wanted = names.map(normKey);
  let level = [node];
  for (let depth = 0; depth <= maxDepth && level.length; depth += 1) {
    const next = [];
    for (const item of level) {
      if (!item || typeof item !== "object") continue;
      if (Array.isArray(item)) {
        item.slice(0, 20).forEach((child) => next.push(child));
        continue;
      }
      const byKey = new Map();
      for (const [key, value] of Object.entries(item)) byKey.set(normKey(key), value);
      for (const name of wanted) {
        const value = byKey.get(name);
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "boolean") return value;
      }
      for (const value of Object.values(item)) if (value && typeof value === "object") next.push(value);
    }
    level = next;
  }
  return null;
}

export function pickText(result, names) {
  const value = deepFind(result, names);
  return typeof value === "string" ? value : null;
}

export function parseCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.trim().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/i);
  if (!match) return null;
  const factor = { k: 1e3, m: 1e6, b: 1e9 }[(match[2] || "").toLowerCase()] || 1;
  return Math.round(Number(match[1]) * factor);
}

export function parseDuration(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== "string") return 0;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text);
  const clock = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (clock) return Number(clock[1] || 0) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const iso = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) return Number(iso[1] || 0) * 3600 + Number(iso[2] || 0) * 60 + Number(iso[3] || 0);
  return 0;
}

export const TITLE_KEYS = ["title", "name", "videoTitle", "desc", "description", "caption", "text"];
export const THUMB_KEYS = ["thumbnail", "thumb", "thumbnailUrl", "cover", "image", "poster", "preview"];
export const AUTHOR_KEYS = ["author", "authorName", "nickname", "uniqueId", "username", "creator", "owner", "channel"];
export const DURATION_KEYS = ["duration", "durationSeconds", "lengthSeconds", "length", "durationLabel", "timestamp"];

export async function probeMedia(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-1", "User-Agent": UA },
      redirect: "follow",
      signal: controller.signal,
    });
    await res.body?.cancel().catch(() => {});
    if (!res.ok) return false;
    const type = String(res.headers.get("content-type") || "");
    return /^(audio|video|image)\//i.test(type) || /octet-stream|force-download/i.test(type);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function pickAvatarUrl(result) {
  const links = collectUrls(result);
  const pick = (re) => links.find((c) => re.test(c.path.replace(/[^a-z]/g, "")));
  const found = pick(/avatarlarger|avatarlarge|avatarhd/) || pick(/avatar/) || pick(/profile(pic|image|photo)|picture|photo/);
  return found ? found.url : null;
}
