const FETCH_TIMEOUT_MS = 15000;
const UA = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";

const JSON_FIELD_KEYS = [
  "browser_native_hd_url",
  "playable_url_quality_hd",
  "browser_native_sd_url",
  "playable_url",
  "hd_src",
  "sd_src",
];

function decodeEscapedUrl(raw) {
  return raw.replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\u0026/g, "&").replace(/&amp;/g, "&");
}

function extractJsonField(html, key) {
  const re = new RegExp(`"${key}":"(https:[^"]+?)"`);
  const match = html.match(re);
  return match ? decodeEscapedUrl(match[1]) : null;
}

function extractVideoTagSrc(html) {
  const match = html.match(/<video[^>]+src="([^"]+)"/i);
  return match ? decodeEscapedUrl(match[1]) : null;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) throw Object.assign(new Error(`Facebook responded ${res.status}.`), { status: 502 });
    return await res.text();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach that Facebook URL."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveFacebookVideo(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("Invalid Facebook URL."), { status: 400 });
  }
  if (!/(^|\.)facebook\.com$|(^|\.)fb\.watch$/.test(parsed.hostname)) {
    throw Object.assign(new Error("URL must be a facebook.com or fb.watch link."), { status: 400 });
  }
  parsed.hostname = "mbasic.facebook.com";
  parsed.protocol = "https:";

  const html = await fetchHtml(parsed);

  let hd = null;
  let sd = null;
  for (const key of JSON_FIELD_KEYS) {
    const value = extractJsonField(html, key);
    if (!value) continue;
    if (key.includes("hd") || key === "playable_url_quality_hd") hd = hd || value;
    else sd = sd || value;
  }
  if (!hd && !sd) {
    const direct = extractVideoTagSrc(html);
    if (direct) sd = direct;
  }

  if (!hd && !sd) {
    throw Object.assign(
      new Error("Could not find a downloadable video on that page. It may be private, age-restricted, or the link is wrong."),
      { status: 404 }
    );
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*Facebook$/, "").trim() : "facebook-video";

  return { hd, sd, title };
}
