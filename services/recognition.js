const FETCH_TIMEOUT_MS = 30000;

export async function recognizeSong(mediaUrl) {
  const token = process.env.AUDD_API_TOKEN;
  if (!token) {
    throw Object.assign(
      new Error("Song recognition is not configured on this server yet. Add AUDD_API_TOKEN to enable it."),
      { status: 503 }
    );
  }

  let parsed;
  try {
    parsed = new URL(mediaUrl);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    throw Object.assign(new Error("Please pass a valid http(s) url to an audio or video file."), { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch("https://api.audd.io/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ url: parsed.toString(), api_token: token, return: "spotify,apple_music" }),
      signal: controller.signal,
    });
  } catch (err) {
    throw Object.assign(new Error("Could not reach the recognition service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
  }

  const data = await res.json().catch(() => null);
  if (!data || data.status !== "success") {
    throw Object.assign(new Error((data && data.error && data.error.error_message) || "Could not process that media."), { status: 502 });
  }

  const match = data.result;
  if (!match) {
    return { matched: false };
  }

  return {
    matched: true,
    title: match.title || null,
    artist: match.artist || null,
    album: match.album || null,
    releaseDate: match.release_date || null,
    label: match.label || null,
    spotifyUrl: match.spotify?.external_urls?.spotify || null,
    appleMusicUrl: match.apple_music?.url || null,
    songLink: match.song_link || null,
  };
}
