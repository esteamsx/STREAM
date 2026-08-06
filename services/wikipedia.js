const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "ESTeamsTV/1.0 (+https://esteamstv.devs.surf)" },
    });
    if (res.status === 404) throw Object.assign(new Error("No Wikipedia article found for that title."), { status: 404 });
    if (!res.ok) throw Object.assign(new Error(`Wikipedia responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach Wikipedia right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function getWikipediaSummary(title) {
  const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (data.type === "disambiguation") {
    throw Object.assign(new Error("That title is ambiguous, try a more specific one."), { status: 404 });
  }
  return {
    title: data.title,
    extract: data.extract || null,
    thumbnail: (data.thumbnail && data.thumbnail.source) || null,
    url: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null,
  };
}
