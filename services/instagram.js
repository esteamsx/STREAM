const FETCH_TIMEOUT_MS = 15000;
const UA = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Instagram 302.0.0.23.114";

function extractMetaContent(html, property) {
  const re = new RegExp(`<meta[^>]+property="${property}"[^>]+content="([^"]+)"`, "i");
  const match = html.match(re);
  if (match) return match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  const reversed = new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${property}"`, "i");
  const match2 = html.match(reversed);
  return match2 ? match2[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"') : null;
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
    if (!res.ok) throw Object.assign(new Error(`Instagram responded ${res.status}.`), { status: 502 });
    return await res.text();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach that Instagram URL."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveInstagramMedia(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw Object.assign(new Error("Invalid Instagram URL."), { status: 400 });
  }
  if (!/(^|\.)instagram\.com$/.test(parsed.hostname)) {
    throw Object.assign(new Error("URL must be an instagram.com link."), { status: 400 });
  }
  if (!/^\/(p|reel|reels|tv)\//.test(parsed.pathname)) {
    throw Object.assign(new Error("URL must be a post, reel, or IGTV link."), { status: 400 });
  }

  const html = await fetchHtml(parsed);

  const video = extractMetaContent(html, "og:video") || extractMetaContent(html, "og:video:secure_url");
  const image = extractMetaContent(html, "og:image");
  const title = extractMetaContent(html, "og:title") || "instagram-media";
  const description = extractMetaContent(html, "og:description");

  if (!video && !image) {
    throw Object.assign(
      new Error("Could not find downloadable media on that link. It may be private, age-restricted, or the link is wrong."),
      { status: 404 }
    );
  }

  return {
    type: video ? "video" : "image",
    videoUrl: video,
    imageUrl: image,
    title: title.replace(/\s*•.*$/, "").trim(),
    caption: description || null,
  };
}
