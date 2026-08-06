const FETCH_TIMEOUT_MS = 15000;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ESTeamsTV/1.0; +https://esteamstv.devs.surf)",
  Accept: "application/json",
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: REQUEST_HEADERS });
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

const PART_OF_SPEECH_NAMES = { n: "noun", v: "verb", adj: "adjective", adv: "adverb", u: "other" };

export async function getDictionaryDefinition(word) {
  const data = await fetchJson(`https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`);
  const entry = Array.isArray(data) ? data[0] : null;
  if (!entry || !Array.isArray(entry.defs) || !entry.defs.length) {
    throw Object.assign(new Error("No definition found for that word."), { status: 404 });
  }
  const grouped = {};
  const order = [];
  for (const raw of entry.defs) {
    const [tag, ...rest] = raw.split("\t");
    const partOfSpeech = PART_OF_SPEECH_NAMES[tag] || "other";
    const definition = rest.join("\t");
    if (!grouped[partOfSpeech]) {
      grouped[partOfSpeech] = [];
      order.push(partOfSpeech);
    }
    if (grouped[partOfSpeech].length < 3) grouped[partOfSpeech].push(definition);
  }
  return {
    word: entry.word,
    phonetic: null,
    meanings: order.map((partOfSpeech) => ({ partOfSpeech, definitions: grouped[partOfSpeech] })),
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

export async function getRandomJoke() {
  const data = await fetchJson("https://api.chucknorris.io/jokes/random");
  if (!data.value) throw Object.assign(new Error("Could not fetch a joke right now."), { status: 502 });
  return { joke: data.value, url: data.url || null };
}

export async function getRandomAdvice() {
  const data = await fetchJson("https://api.adviceslip.com/advice");
  if (!data.slip || !data.slip.advice) throw Object.assign(new Error("Could not fetch advice right now."), { status: 502 });
  return { advice: data.slip.advice };
}

export async function getCatFact() {
  const data = await fetchJson("https://catfact.ninja/fact");
  if (!data.fact) throw Object.assign(new Error("Could not fetch a cat fact right now."), { status: 502 });
  return { fact: data.fact };
}

export async function getPublicHolidays(year, countryCode) {
  const cleanYear = String(year || new Date().getFullYear()).trim();
  const cleanCode = String(countryCode || "").trim().toUpperCase();
  if (!/^\d{4}$/.test(cleanYear)) throw Object.assign(new Error("Enter a valid 4-digit year."), { status: 400 });
  if (!/^[A-Z]{2}$/.test(cleanCode)) throw Object.assign(new Error("Enter a valid 2-letter country code, e.g. NG or US."), { status: 400 });
  const data = await fetchJson(`https://date.nager.at/api/v3/PublicHolidays/${encodeURIComponent(cleanYear)}/${encodeURIComponent(cleanCode)}`);
  if (!Array.isArray(data)) throw Object.assign(new Error("Could not find holidays for that country."), { status: 404 });
  return data.map((h) => ({ date: h.date, name: h.name, localName: h.localName, global: !!h.global }));
}

export async function getGithubUser(username) {
  const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`);
  if (!data.login) throw Object.assign(new Error("Could not find that GitHub user."), { status: 404 });
  return {
    login: data.login,
    name: data.name || null,
    avatar: data.avatar_url || null,
    bio: data.bio || null,
    company: data.company || null,
    location: data.location || null,
    blog: data.blog || null,
    public_repos: data.public_repos,
    followers: data.followers,
    following: data.following,
    created_at: data.created_at,
  };
}

export async function getRandomDogImage() {
  const data = await fetchJson("https://dog.ceo/api/breeds/image/random");
  if (!data.message) throw Object.assign(new Error("Could not fetch a dog image right now."), { status: 502 });
  return { imageUrl: data.message };
}
