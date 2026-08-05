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

export async function getCurrencyRate(from, to, amount) {
  const data = await fetchJson(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  if (data.result !== "success" || !data.rates || data.rates[to] == null) {
    throw Object.assign(new Error("Could not find a rate for that currency pair."), { status: 404 });
  }
  const rate = data.rates[to];
  return {
    from: data.base_code || from,
    to,
    amount,
    result: Number((rate * amount).toFixed(6)),
    date: data.time_last_update_utc || null,
  };
}

export async function getDictionaryDefinition(word) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal: controller.signal });
  } catch {
    throw Object.assign(new Error("Could not reach the dictionary service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) throw Object.assign(new Error("No definition found for that word."), { status: 404 });
  if (!res.ok) throw Object.assign(new Error(`Dictionary service responded ${res.status}.`), { status: 502 });
  let data;
  try {
    data = await res.json();
  } catch {
    throw Object.assign(new Error("Dictionary service returned an unexpected response."), { status: 502 });
  }
  const entry = data[0];
  if (!entry) throw Object.assign(new Error("No definition found for that word."), { status: 404 });
  return {
    word: entry.word,
    phonetic: entry.phonetic || null,
    meanings: (entry.meanings || []).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: (m.definitions || []).slice(0, 3).map((d) => d.definition),
    })),
  };
}

export async function lookupIp(ip) {
  const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`);
  if (!data.success) throw Object.assign(new Error(data.message || "Could not look up that IP address."), { status: 404 });
  return {
    ip: data.ip,
    city: data.city || null,
    region: data.region || null,
    country: data.country || null,
    country_code: data.country_code || null,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: (data.timezone && data.timezone.id) || null,
    org: (data.connection && data.connection.isp) || null,
  };
}

export async function getCountryInfo(name) {
  const data = await fetchJson(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,region,subregion,population,flags,currencies`);
  const country = Array.isArray(data) ? data[0] : null;
  if (!country) throw Object.assign(new Error("Could not find that country."), { status: 404 });
  return {
    name: country.name && country.name.common,
    capital: (country.capital && country.capital[0]) || null,
    region: country.region || null,
    subregion: country.subregion || null,
    population: country.population || null,
    flag: country.flags && (country.flags.png || country.flags.svg),
    currencies: country.currencies ? Object.keys(country.currencies) : [],
  };
}

export async function getTriviaQuestion(category, difficulty) {
  let url = "https://opentdb.com/api.php?amount=1&encode=url3986";
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (difficulty) url += `&difficulty=${encodeURIComponent(difficulty)}`;
  const data = await fetchJson(url);
  const q = data.results && data.results[0];
  if (!q) throw Object.assign(new Error("Could not fetch a trivia question right now."), { status: 502 });
  return {
    category: decodeURIComponent(q.category),
    difficulty: decodeURIComponent(q.difficulty),
    question: decodeURIComponent(q.question),
    correct_answer: decodeURIComponent(q.correct_answer),
    incorrect_answers: q.incorrect_answers.map((a) => decodeURIComponent(a)),
  };
}
