const FETCH_TIMEOUT_MS = 15000;
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Movie service responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the movie service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchMovie(query) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw Object.assign(new Error("Movie lookup is not configured on this server."), { status: 503 });

  const searchData = await fetchJson(
    `${TMDB_BASE}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`
  );
  const result = searchData.results && searchData.results[0];
  if (!result) throw Object.assign(new Error("Could not find a movie matching that title."), { status: 404 });

  const details = await fetchJson(`${TMDB_BASE}/movie/${result.id}?api_key=${apiKey}`).catch(() => null);
  const genres = details && Array.isArray(details.genres) ? details.genres.map((g) => g.name) : [];

  return {
    title: result.title,
    overview: result.overview || null,
    releaseDate: result.release_date || null,
    rating: result.vote_average != null ? result.vote_average : null,
    genres,
    runtimeMinutes: (details && details.runtime) || null,
    poster: result.poster_path ? `${TMDB_IMAGE_BASE}${result.poster_path}` : null,
    backdrop: result.backdrop_path ? `${TMDB_IMAGE_BASE}${result.backdrop_path}` : null,
  };
}
