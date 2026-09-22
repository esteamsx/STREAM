const GUEST_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";

let guestToken = null;
let guestTokenAt = 0;

async function getGuestToken() {
  if (guestToken && Date.now() - guestTokenAt < 25 * 60 * 1000) return guestToken;
  const res = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${decodeURIComponent(GUEST_BEARER)}` },
  });
  const data = await res.json();
  if (!data || !data.guest_token) throw Object.assign(new Error("Could not get a Twitter guest session."), { status: 502 });
  guestToken = data.guest_token;
  guestTokenAt = Date.now();
  return guestToken;
}

export async function resolveTwitterVideo(url) {
  const idMatch = String(url || "").match(/status(?:es)?\/(\d+)/);
  if (!idMatch) throw Object.assign(new Error("That doesn't look like a tweet URL."), { status: 400 });
  const tweetId = idMatch[1];

  const token = await getGuestToken();
  const apiRes = await fetch(`https://api.twitter.com/2/timeline/conversation/${tweetId}.json?tweet_mode=extended`, {
    headers: { Authorization: `Bearer ${decodeURIComponent(GUEST_BEARER)}`, "x-guest-token": token },
  });
  const data = await apiRes.json();
  const tweet = data && data.globalObjects && data.globalObjects.tweets && data.globalObjects.tweets[tweetId];
  const media = tweet && tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media[0];
  const variants = media && media.video_info && media.video_info.variants;
  if (!variants || !variants.length) {
    throw Object.assign(new Error("No video found on that tweet."), { status: 404 });
  }

  const best = variants
    .filter((v) => v.content_type === "video/mp4")
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  if (!best) throw Object.assign(new Error("No downloadable video found on that tweet."), { status: 404 });

  return { video: best.url, thumbnail: media.media_url_https, text: tweet.full_text };
}
