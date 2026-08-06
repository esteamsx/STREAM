const FETCH_TIMEOUT_MS = 15000;

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
  const data = await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&entity=movie&limit=1`
  );
  const result = data.results && data.results[0];
  if (!result) throw Object.assign(new Error("Could not find a movie matching that title."), { status: 404 });

  return {
    title: result.trackName,
    artist: result.artistName || null,
    genre: result.primaryGenreName || null,
    releaseDate: result.releaseDate || null,
    priceFormatted: result.trackPrice != null ? `${result.currency} ${result.trackPrice}` : null,
    rating: result.contentAdvisoryRating || null,
    runtimeMinutes: result.trackTimeMillis ? Math.round(result.trackTimeMillis / 60000) : null,
    description: result.longDescription || result.shortDescription || null,
    poster: (result.artworkUrl100 || "").replace("100x100", "600x600") || null,
    trailerUrl: result.previewUrl || null,
    country: result.country || null,
  };
}
