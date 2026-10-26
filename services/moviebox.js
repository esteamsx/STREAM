/* Movies page data. ES Teams never talks to the movie API from the browser: this module is the only place that does.

   The API is the self-hosted Moviebox-API (https://github.com/faisaljs/Moviebox-API, a small FastAPI service).
   It is not a public service, so it only works once you run it somewhere and set:

       MOVIEBOX_API_URL=https://your-moviebox-api-host        (no trailing slash needed)

   Until then every call here fails with the code "not_configured" and the page says so.

   Why it goes through the server: the browser never sees the API address, results are cached (the API's own README warns that
   heavy polling gets throttled upstream), the site's login and rate limits apply, and a bad answer from the API can never break the page. */

const FETCH_TIMEOUT_MS = 12000;
const MAX_BODY_CHARS = 2_500_000;
const MAX_CACHE_ENTRIES = 300;
const STALE_OK_MS = 60 * 60 * 1000;      // if the API is down, a result up to an hour old is better than an empty page

const TTL = { home: 10 * 60 * 1000, catalog: 10 * 60 * 1000, search: 3 * 60 * 1000, suggest: 2 * 60 * 1000, detail: 30 * 60 * 1000, streams: 5 * 60 * 1000 };
export const CATALOGS = { movies: { path: "/movies", title: "Movies" }, "tv-series": { path: "/tv-series", title: "TV Series" }, animation: { path: "/animation", title: "Animation" } };
export const SORTS = ["RECOMMEND", "NEWEST", "RATING"];
const SLUG_RE = /^[A-Za-z0-9._~-]{2,160}$/;
const SUBJECT_ID_RE = /^[A-Za-z0-9_-]{2,64}$/;

export class MovieError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

/* ------------------------------------------------------------------ connection */
export function apiBase() {
  const raw = String(process.env.MOVIEBOX_API_URL || "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin + u.pathname.replace(/\/+$/, "");
  } catch { return null; }
}
export const isConfigured = () => !!apiBase();

function retryDelay(res) {
  const raw = res && res.headers && res.headers.get("retry-after");
  const seconds = raw && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : 0.35;
  return Math.min(2500, Math.max(100, seconds * 1000));
}
function pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function upstream(path, params = {}) {
  const base = apiBase();
  if (!base) throw new MovieError(503, "not_configured", "The movie service is not connected yet.");
  const url = new URL(base + path);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") url.searchParams.set(k, String(v));
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
      if (res.status === 429) {
        if (attempt === 0) { await pause(retryDelay(res)); continue; }
        throw new MovieError(429, "rate_limited", "The movie service is rate-limited. Please wait a moment and try again.");
      }
      if (res.status === 404) throw new MovieError(404, "not_found", "That title could not be found.");
      if (!res.ok) throw new MovieError(502, "upstream", "The movie service had a problem (" + res.status + ").");
      const text = await res.text();
      if (text.length > MAX_BODY_CHARS) throw new MovieError(502, "upstream", "The movie service sent too much data.");
      try { return JSON.parse(text); } catch { throw new MovieError(502, "upstream", "The movie service sent something unreadable."); }
    } catch (e) {
      if (e instanceof MovieError) throw e;
      throw new MovieError(502, "upstream", e && e.name === "AbortError" ? "The movie service took too long to answer." : "Could not reach the movie service.");
    } finally { clearTimeout(timer); }
  }
  throw new MovieError(429, "rate_limited", "The movie service is rate-limited. Please wait a moment and try again.");
}

export async function proxyStream(subjectId, slug, season = 1, episode = 1, resolution = "360") {
  subjectId = String(subjectId || ""); slug = String(slug || ""); resolution = String(resolution || "").replace(/p$/i, "");
  if (!SUBJECT_ID_RE.test(subjectId) || !SLUG_RE.test(slug) || !/^(?:360|480|720|1080)$/.test(resolution)) {
    throw new MovieError(400, "bad_request", "That download request is not valid.");
  }
  const base = apiBase();
  if (!base) throw new MovieError(503, "not_configured", "The movie service is not connected yet.");
  const url = new URL(base + "/api/stream/" + encodeURIComponent(subjectId) + "/proxy");
  url.searchParams.set("detail_path", slug);
  url.searchParams.set("se", String(Math.min(99, Math.max(1, Math.floor(Number(season)) || 1))));
  url.searchParams.set("ep", String(Math.min(999, Math.max(1, Math.floor(Number(episode)) || 1))));
  url.searchParams.set("res", resolution);
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers: { accept: "video/mp4" }, signal: controller.signal });
      if (response.status === 429) { if (attempt === 0) { await pause(retryDelay(response)); continue; } throw new MovieError(429, "rate_limited", "The download service is busy. Please wait a moment and try again."); }
      if (!response.ok) throw new MovieError(502, "upstream", "The download service returned an error (" + response.status + ").");
      return response;
    } catch (e) {
      if (e instanceof MovieError) throw e;
      throw new MovieError(502, "upstream", e && e.name === "AbortError" ? "The download service took too long to answer." : "Could not reach the download service.");
    } finally { clearTimeout(timer); }
  }
  throw new MovieError(429, "rate_limited", "The download service is busy. Please wait a moment and try again.");
}

/* ------------------------------------------------------------------ cache (with "stale if the API is down") */
const cache = new Map();      // key -> { at, value }
const inflight = new Map();   // key -> promise, so a burst of identical requests makes one call
export function resetCache() { cache.clear(); inflight.clear(); }

async function cached(key, ttl, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const p = (async () => {
    try {
      const value = await loader();
      cache.set(key, { at: Date.now(), value });
      if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
      return value;
    } catch (e) {
      if (hit && Date.now() - hit.at < STALE_OK_MS && e.code !== "not_configured") return hit.value;
      throw e;
    } finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

/* ------------------------------------------------------------------ turning the API's answers into one shape the page can trust */
const str = (v, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" && Number.isFinite(v) ? String(v) : "");
function httpsUrl(u) {
  if (typeof u !== "string") return null;
  try { const x = new URL(u.trim()); return x.protocol === "https:" ? x.href : null; } catch { return null; }
}
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 && n <= 10 ? Math.round(n * 10) / 10 : null; };
function bytesOf(v) {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v <= 100 * 1024 * 1024 * 1024 ? Math.round(v) : null;
  const m = String(v == null ? "" : v).trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB)?$/i);
  if (!m) return null;
  const n = Number(m[1]), unit = (m[2] || "B").toUpperCase();
  const mult = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }[unit];
  const bytes = n * mult;
  return Number.isFinite(bytes) && bytes > 0 && bytes <= 100 * 1024 * 1024 * 1024 ? Math.round(bytes) : null;
}
const yearOf = (v) => { const m = String(v == null ? "" : v).match(/(19|20)\d{2}/); return m ? m[0] : null; };

/* one movie or series, from a banner row, a subject row, a catalog or a search result */
export function normalizeItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = str(raw.name || raw.title || raw.subject_title, 200);
  const slugRaw = str(raw.slug || raw.detail_path || raw.detailPath, 200);
  const slug = SLUG_RE.test(slugRaw) ? slugRaw : "";
  const id = str(raw.subject_id || raw.subjectId || raw.id, 40);
  if (!title || (!slug && !id)) return null;
  const cover = raw.cover && typeof raw.cover === "object" ? raw.cover.url : raw.cover;
  return {
    id, slug, title,
    poster: httpsUrl(raw.poster_url || raw.posterUrl || cover || raw.image || raw.poster),
    rating: num(raw.rating != null ? raw.rating : raw.imdbRatingValue),
    year: yearOf(raw.year != null ? raw.year : raw.releaseDate),
    badge: str(raw.badge, 24) || null,
  };
}
function normalizeList(list, limit = 60) {
  const seen = new Set(), out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const item = normalizeItem(raw);
    if (!item) continue;
    const key = item.slug || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/* The detail endpoint is a raw passthrough of the upstream tree, so this only keeps what it can recognise and leaves out the rest. */
export function normalizeDetail(raw, slug) {
  const d = raw && typeof raw === "object" ? (raw.data && typeof raw.data === "object" ? raw.data : raw) : {};
  const s = (d.subject && typeof d.subject === "object" ? d.subject : null) || (d.detail && typeof d.detail === "object" ? d.detail : null) || d;
  const title = str(s.title || s.name, 200);
  if (!title) throw new MovieError(404, "not_found", "That title could not be found.");
  const cover = s.cover && typeof s.cover === "object" ? s.cover.url : s.cover;
  const stills = Array.isArray(d.stills) ? d.stills : Array.isArray(s.stills) ? s.stills : [];
  const still = stills.map((x) => (x && typeof x === "object" ? x.url : x)).map(httpsUrl).find(Boolean) || (s.stills && typeof s.stills === "object" ? httpsUrl(s.stills.url) : null);
  const genreRaw = s.genre != null ? s.genre : s.genres;
  const genres = (Array.isArray(genreRaw) ? genreRaw.map((g) => (g && typeof g === "object" ? g.name : g)) : String(genreRaw || "").split(/[,/|]/)).map((g) => str(g, 30)).filter(Boolean).slice(0, 8);
  const seasonsRaw = (d.resource && Array.isArray(d.resource.seasons) ? d.resource.seasons : null) || (Array.isArray(d.seasons) ? d.seasons : []);
  const seasons = seasonsRaw.map((x, i) => ({ season: Number(x && (x.se != null ? x.se : x.season)) || i + 1, episodes: Number(x && (x.maxEp != null ? x.maxEp : x.episodes)) || 0 })).filter((x) => x.episodes > 0).slice(0, 60);
  const starsRaw = Array.isArray(d.stars) ? d.stars : Array.isArray(d.cast) ? d.cast : [];
  const cast = starsRaw.map((x) => ({ name: str(x && (x.name || x.staffName), 80), role: str(x && (x.character || x.role), 80) || null, photo: httpsUrl(x && (x.avatarUrl || x.photo)) })).filter((x) => x.name).slice(0, 14);
  const durationSec = Number(s.duration);
  const typeRaw = s.subjectType != null ? Number(s.subjectType) : null;
  return {
    slug, id: str(s.subjectId || s.subject_id || s.id, 40),
    title,
    description: str(s.description || s.overview || s.synopsis, 2500) || null,
    poster: httpsUrl(cover || s.poster_url || s.poster),
    backdrop: still,
    year: yearOf(s.releaseDate != null ? s.releaseDate : s.year),
    rating: num(s.imdbRatingValue != null ? s.imdbRatingValue : s.rating),
    genres,
    country: str(s.countryName || s.country, 60) || null,
    minutes: Number.isFinite(durationSec) && durationSec > 0 ? Math.round(durationSec > 600 ? durationSec / 60 : durationSec) : null,
    kind: typeRaw === 2 || seasons.length > 0 ? "tv" : "movie",
    seasons, cast,
  };
}

/* ------------------------------------------------------------------ what the page asks for */
export const getStatus = () => ({ configured: isConfigured() });

const rowPriority = (title) => (/trend|hot|popular|top/i.test(title) ? 0 : /action/i.test(title) ? 1 : 2);

export function getHome() {
  return cached("home", TTL.home, async () => {
    const [homeRes, ...catalogRes] = await Promise.allSettled([
      upstream("/home"),
      ...Object.entries(CATALOGS).map(([kind, c]) => upstream(c.path, { page: 1, sort: "RECOMMEND" }).then((r) => ({ kind, items: normalizeList(r && (r.items || r.data)) }))),
    ]);
    const sections = homeRes.status === "fulfilled" && homeRes.value ? (homeRes.value.sections || (homeRes.value.data && homeRes.value.data.sections) || []) : [];
    let banner = [];
    const rows = [];
    for (const sec of Array.isArray(sections) ? sections : []) {
      const title = str(sec && (sec.section || sec.title || sec.name), 60);
      const items = normalizeList(sec && sec.items, 30);
      if (!title || !items.length) continue;
      if (/banner/i.test(title)) { banner = banner.concat(items.filter((i) => i.poster)).slice(0, 8); continue; }
      if (items.length >= 3) rows.push({ title, kind: null, items });
    }
    rows.sort((a, b) => rowPriority(a.title) - rowPriority(b.title));
    for (const r of catalogRes) {
      if (r.status !== "fulfilled" || !r.value.items.length) continue;
      const title = CATALOGS[r.value.kind].title;
      if (!rows.some((x) => x.title.toLowerCase() === title.toLowerCase())) rows.push({ title, kind: r.value.kind, items: r.value.items.slice(0, 24) });
    }
    if (!rows.length && !banner.length) {
      const firstError = [homeRes, ...catalogRes].find((r) => r.status === "rejected");
      throw firstError ? firstError.reason : new MovieError(502, "upstream", "The movie service returned nothing.");
    }
    if (!banner.length && rows.length) banner = rows[0].items.filter((i) => i.poster).slice(0, 5);
    return { banner, rows };
  });
}

export function getCatalog(kind, page = 1, sort = "RECOMMEND") {
  const c = Object.hasOwn(CATALOGS, kind) ? CATALOGS[kind] : null;
  if (!c) return Promise.reject(new MovieError(400, "bad_request", "Unknown category."));
  page = Math.min(50, Math.max(1, Math.floor(Number(page)) || 1));
  if (!SORTS.includes(sort)) sort = "RECOMMEND";
  return cached(`catalog:${kind}:${page}:${sort}`, TTL.catalog, async () => {
    const r = await upstream(c.path, { page, sort });
    const items = normalizeList(r && (r.items || r.data), 60);
    const total = Number(r && r.total) || 0, perPage = Number(r && r.per_page) || items.length;
    return { kind, title: c.title, page, items, total, hasMore: items.length > 0 && (total ? page * (perPage || 24) < total : items.length >= 20) };
  });
}

export function getSearch(q, page = 1) {
  q = String(q || "").trim().slice(0, 60);
  if (!q) return Promise.reject(new MovieError(400, "bad_request", "Type something to search for."));
  page = Math.min(50, Math.max(1, Math.floor(Number(page)) || 1));
  return cached(`search:${q.toLowerCase()}:${page}`, TTL.search, async () => {
    const r = await upstream("/search", { q, page });
    const items = normalizeList(r && (r.items || r.data), 60);
    const total = Number(r && r.total) || 0;
    return { query: q, page, items, total, hasMore: items.length > 0 && (total ? page * 24 < total : items.length >= 20) };
  });
}

export function getSuggest(q) {
  q = String(q || "").trim().slice(0, 60);
  if (!q) return Promise.resolve({ suggestions: [] });
  return cached(`suggest:${q.toLowerCase()}`, TTL.suggest, async () => {
    const r = await upstream("/search/suggest", { q, enrich: "true" });
    const list = Array.isArray(r && r.suggestions) ? r.suggestions : [];
    const out = [];
    for (const x of list) {
      const title = str(x && (x.title || x.name), 120), slug = str(x && x.slug, 200);
      if (title && SLUG_RE.test(slug)) out.push({ title, slug, id: str(x.subject_id || x.id, 40) });
      if (out.length >= 8) break;
    }
    return { suggestions: out };
  });
}


/* Stream sources are fetched only when the API exposes them explicitly. The page never invents a
   download URL; actual downloads are served through the authenticated server-side proxy. */
export function getStreams(subjectId, slug, season = 1, episode = 1) {
  subjectId = String(subjectId || "");
  slug = String(slug || "");
  if (!SUBJECT_ID_RE.test(subjectId) || !SLUG_RE.test(slug)) return Promise.reject(new MovieError(400, "bad_request", "That title has no valid stream reference."));
  const se = Math.min(99, Math.max(1, Math.floor(Number(season)) || 1));
  const ep = Math.min(999, Math.max(1, Math.floor(Number(episode)) || 1));
  return cached(`streams:${subjectId}:${slug}:${se}:${ep}`, TTL.streams, async () => {
    const r = await upstream(`/api/stream/${encodeURIComponent(subjectId)}`, { detail_path: slug, se, ep });
    const sources = Array.isArray(r && r.sources) ? r.sources : [];
    return {
      subjectId, season: se, episode: ep, hasResource: !!(r && r.has_resource),
      sources: sources.map((x) => ({
        resolution: str(x && x.resolution, 20) || null,
        format: str(x && x.format, 20) || null,
        url: httpsUrl(x && x.url),
        size: bytesOf(x && x.size),
        duration: Number.isFinite(Number(x && x.duration)) && Number(x.duration) > 0 ? Number(x.duration) : null,
      })).filter((x) => x.url && /mp4/i.test(x.format || "")),
    };
  });
}

export function getDetail(slug) {
  slug = String(slug || "");
  if (!SLUG_RE.test(slug)) return Promise.reject(new MovieError(400, "bad_request", "That is not a valid title link."));
  return cached(`detail:${slug}`, TTL.detail, async () => normalizeDetail(await upstream("/detail/" + encodeURIComponent(slug)), slug));
}
