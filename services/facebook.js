const FETCH_TIMEOUT_MS = 15000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function extractField(html, key) {
  const re = new RegExp(`"${key}":"(https:[^"]+?)"`);
  const match = html.match(re);
  if (!match) return null;
  return match[1].replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/\\u0026/g, "&");
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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(parsed, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: controller.signal,
    });
  } catch {
    throw Object.assign(new Error("Could not reach that Facebook URL."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw Object.assign(new Error(`Facebook responded ${res.status}.`), { status: 502 });
  const html = await res.text();

  const hd = extractField(html, "browser_native_hd_url") || extractField(html, "hd_src");
  const sd = extractField(html, "browser_native_sd_url") || extractField(html, "sd_src");
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
