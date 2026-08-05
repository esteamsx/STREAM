const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach that source right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function getLyrics(artist, title) {
  const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
  if (!data.lyrics) throw Object.assign(new Error("No lyrics found for that artist and title."), { status: 404 });
  return { artist, title, lyrics: data.lyrics.trim() };
}

export async function getBibleVerse(reference) {
  const data = await fetchJson(`https://bible-api.com/${encodeURIComponent(reference)}`);
  if (!data.text) throw Object.assign(new Error("Could not find that Bible reference."), { status: 404 });
  return {
    reference: data.reference,
    text: data.text.trim(),
    translation: data.translation_name || null,
  };
}

export async function getQuranVerse(reference) {
  const data = await fetchJson(`https://api.alquran.cloud/v1/ayah/${encodeURIComponent(reference)}/en.asad`);
  if (!data.data || !data.data.text) throw Object.assign(new Error("Could not find that Quran reference."), { status: 404 });
  const d = data.data;
  return {
    reference,
    text: d.text,
    surah: d.surah ? d.surah.englishName : null,
    numberInSurah: d.numberInSurah || null,
  };
}

export async function getTopTechNews(limit) {
  const ids = await fetchJson("https://hacker-news.firebaseio.com/v0/topstories.json");
  const topIds = ids.slice(0, limit);
  const items = await Promise.all(
    topIds.map((id) => fetchJson(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null))
  );
  return items
    .filter(Boolean)
    .map((item) => ({
      title: item.title,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      score: item.score || 0,
      author: item.by || null,
    }));
}
