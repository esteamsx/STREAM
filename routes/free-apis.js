import express from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";
import sharp from "sharp";
import * as cheerio from "cheerio";
import ytdl from "@distube/ytdl-core";
import ytsearch from "yt-search";
import { removeBackground } from "@imgly/background-removal-node";
import { db } from "../config/firebase.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

export const freeApiRouter = express.Router();

const freeApiLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.ip, "Too many requests. Slow down a little.");
freeApiRouter.use("/api/free", freeApiLimiter.middleware());

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw Object.assign(new Error((data && data.message) || `Upstream error (${res.status})`), { status: 502 });
  }
  return data;
}

freeApiRouter.get("/api/free/qrcode", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    if (!text) return res.status(400).json({ error: "Missing ?text=" });
    const size = Math.min(1000, Math.max(100, Number(req.query.size) || 400));
    const buffer = await QRCode.toBuffer(text, { errorCorrectionLevel: "M", margin: 2, width: size, type: "png" });
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not generate that QR code." });
  }
});

const SHORTLINK_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomShortCode(len = 6) {
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += SHORTLINK_ALPHABET[bytes[i] % SHORTLINK_ALPHABET.length];
  return out;
}

freeApiRouter.get("/api/free/shorten", async (req, res) => {
  try {
    const raw = String(req.query.url || "").trim();
    let target;
    try { target = new URL(raw); } catch { return res.status(400).json({ error: "That's not a valid URL." }); }
    if (!/^https?:$/.test(target.protocol)) return res.status(400).json({ error: "Only http/https links are supported." });

    let code;
    for (let attempts = 0; attempts < 5; attempts++) {
      const candidate = randomShortCode();
      const exists = await db.collection("shortlinks").doc(candidate).get();
      if (!exists.exists) { code = candidate; break; }
    }
    if (!code) return res.status(500).json({ error: "Could not allocate a short code, try again." });

    await db.collection("shortlinks").doc(code).set({
      url: target.toString(),
      createdAt: Date.now(),
      clicks: 0,
    });

    const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    res.json({ shortUrl: `${base}/s/${code}`, code, original: target.toString() });
  } catch (err) {
    res.status(500).json({ error: "Could not shorten that link." });
  }
});

export async function handleShortlinkRedirect(req, res) {
  try {
    const ref = db.collection("shortlinks").doc(req.params.code);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).send("Link not found.");
    ref.update({ clicks: (snap.data().clicks || 0) + 1 }).catch(() => {});
    res.redirect(302, snap.data().url);
  } catch (err) {
    res.status(500).send("Could not resolve that link.");
  }
}

const WEATHER_CODES = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Light rain showers", 81: "Rain showers", 82: "Violent rain showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail",
};

freeApiRouter.get("/api/free/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    if (!city) return res.status(400).json({ error: "Missing ?city=" });

    const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const place = geo && geo.results && geo.results[0];
    if (!place) return res.status(404).json({ error: `Could not find a place called "${city}".` });

    const wx = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code,is_day`
    );
    const c = wx.current || {};
    const code = c.weather_code;
    res.json({
      city: place.name,
      country: place.country || "",
      admin1: place.admin1 || "",
      latitude: place.latitude,
      longitude: place.longitude,
      temperature: c.temperature_2m,
      feelsLike: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      pressure: c.surface_pressure,
      windspeed: c.wind_speed_10m,
      winddirection: c.wind_direction_10m,
      weathercode: code,
      description: WEATHER_CODES[code] || "Unknown",
      isDay: c.is_day === 1,
      observedAt: c.time,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch the weather right now." });
  }
});

freeApiRouter.get("/api/free/bible", async (req, res) => {
  try {
    const reference = String(req.query.reference || "").trim();
    if (!reference) return res.status(400).json({ error: "Missing ?reference=, e.g. John 3:16" });
    const data = await fetchJson(`https://bible-api.com/${encodeURIComponent(reference)}`);
    if (!data || data.error) return res.status(404).json({ error: "Could not find that reference." });
    res.json({
      reference: data.reference,
      text: String(data.text || "").trim(),
      translation: (data.translation_name || "World English Bible"),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch that verse right now." });
  }
});

freeApiRouter.get("/api/free/quran", async (req, res) => {
  try {
    const surah = Number(req.query.surah);
    const ayah = Number(req.query.ayah || 1);
    if (!surah || surah < 1 || surah > 114) return res.status(400).json({ error: "Missing or invalid ?surah= (1-114)" });
    const ref = ayah ? `${surah}:${ayah}` : String(surah);
    const [arabic, translation] = await Promise.all([
      fetchJson(`https://api.alquran.cloud/v1/ayah/${ref}/quran-uthmani`),
      fetchJson(`https://api.alquran.cloud/v1/ayah/${ref}/en.sahih`),
    ]);
    if (!arabic || arabic.code !== 200) return res.status(404).json({ error: "Could not find that verse." });
    res.json({
      surah: arabic.data.surah.number,
      surahName: arabic.data.surah.englishName,
      ayah: arabic.data.numberInSurah,
      arabic: arabic.data.text,
      translation: translation && translation.data ? translation.data.text : null,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch that verse right now." });
  }
});

freeApiRouter.get("/api/free/quran/surah", async (req, res) => {
  try {
    const number = Number(req.query.number);
    if (!number || number < 1 || number > 114) return res.status(400).json({ error: "Missing or invalid ?number= (1-114)" });
    const [meta, firstAyah] = await Promise.all([
      fetchJson(`https://api.alquran.cloud/v1/surah/${number}`),
      fetchJson(`https://api.alquran.cloud/v1/ayah/${number}:1/en.sahih`),
    ]);
    if (!meta || meta.code !== 200) return res.status(404).json({ error: "Could not find that surah." });
    const s = meta.data;
    res.json({
      name: { english: s.englishName, arabic: s.name, translation: s.englishNameTranslation },
      ayahCount: s.numberOfAyahs,
      type: s.revelationType,
      openingAyahTranslation: firstAyah && firstAyah.data ? firstAyah.data.text : null,
      recitation: `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${number}.mp3`,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch that surah right now." });
  }
});

freeApiRouter.post("/api/free/tempmail", async (req, res) => {
  try {
    const data = await fetchJson("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1");
    const email = Array.isArray(data) ? data[0] : null;
    if (!email) return res.status(502).json({ error: "Could not create a temp mailbox right now." });
    res.json({ email });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not create a temp mailbox right now." });
  }
});

function splitMailbox(email) {
  const [login, domain] = String(email || "").split("@");
  return { login, domain };
}

freeApiRouter.get("/api/free/tempmail/inbox", async (req, res) => {
  try {
    const { login, domain } = splitMailbox(req.query.email);
    if (!login || !domain) return res.status(400).json({ error: "Missing or invalid ?email=" });
    const messages = await fetchJson(`https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`);
    res.json({ messages: messages || [] });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not check that inbox right now." });
  }
});

freeApiRouter.get("/api/free/tempmail/message", async (req, res) => {
  try {
    const { login, domain } = splitMailbox(req.query.email);
    const id = req.query.id;
    if (!login || !domain || !id) return res.status(400).json({ error: "Missing ?email= or ?id=" });
    const message = await fetchJson(`https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${encodeURIComponent(id)}`);
    res.json(message || {});
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not read that message right now." });
  }
});

function escapeXml(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));
}

function wrapText(text, maxCharsPerLine) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > maxCharsPerLine && line) {
      lines.push(line.trim());
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

freeApiRouter.get("/api/free/canvas/quote", async (req, res) => {
  try {
    const imageUrl = String(req.query.image || "").trim();
    const text = String(req.query.text || "").trim();
    const author = String(req.query.author || "").trim();
    if (!imageUrl || !text) return res.status(400).json({ error: "Missing ?image= or ?text=" });
    if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "?image= must be a full http(s) URL." });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(400).json({ error: "Could not download that image." });
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const base = sharp(imgBuffer).resize(720, 720, { fit: "cover" });
    const meta = await base.metadata();
    const w = meta.width || 720;
    const h = meta.height || 720;

    const lines = wrapText(text, 34).slice(0, 8);
    const lineHeight = 42;
    const blockHeight = lines.length * lineHeight;
    const startY = h / 2 - blockHeight / 2;

    const svg = `
      <svg width="${w}" height="${h}">
        <defs>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="black" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="black" stop-opacity="0.75"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${w}" height="${h}" fill="url(#fade)"/>
        ${lines.map((line, i) => `<text x="${w / 2}" y="${startY + i * lineHeight}" font-size="34" font-family="Georgia, serif" fill="white" text-anchor="middle" font-style="italic">${escapeXml(line)}</text>`).join("")}
        ${author ? `<text x="${w / 2}" y="${startY + lines.length * lineHeight + 40}" font-size="24" font-family="Georgia, serif" fill="#dddddd" text-anchor="middle">by ${escapeXml(author)}</text>` : ""}
      </svg>`;

    const out = await base.composite([{ input: Buffer.from(svg) }]).png().toBuffer();
    res.set("Content-Type", "image/png");
    res.send(out);
  } catch (err) {
    res.status(500).json({ error: "Could not build that quote image." });
  }
});

freeApiRouter.get("/api/free/canvas/jail", async (req, res) => {
  try {
    const imageUrl = String(req.query.image || "").trim();
    if (!imageUrl) return res.status(400).json({ error: "Missing ?image=" });
    if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "?image= must be a full http(s) URL." });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(400).json({ error: "Could not download that image." });
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const base = sharp(imgBuffer).resize(512, 512, { fit: "cover" });
    const barCount = 6;
    const barWidth = 512 / (barCount * 2);
    let bars = "";
    for (let i = 0; i < barCount; i++) {
      const x = i * (512 / barCount);
      bars += `<rect x="${x}" y="0" width="${barWidth}" height="512" fill="black" opacity="0.9"/>`;
    }
    bars += `<rect x="0" y="0" width="512" height="40" fill="black" opacity="0.85"/>`;
    bars += `<rect x="0" y="472" width="512" height="40" fill="black" opacity="0.85"/>`;
    const svg = `<svg width="512" height="512">${bars}</svg>`;

    const out = await base.composite([{ input: Buffer.from(svg) }]).png().toBuffer();
    res.set("Content-Type", "image/png");
    res.send(out);
  } catch (err) {
    res.status(500).json({ error: "Could not build that jail image." });
  }
});


freeApiRouter.get("/api/free/tiktok", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) return res.status(400).json({ error: "Missing ?url=" });
    const data = await fetchJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    if (!data || data.code !== 0 || !data.data) return res.status(404).json({ error: "Could not fetch that TikTok video." });
    const d = data.data;
    res.json({
      title: d.title,
      author: d.author && d.author.unique_id,
      cover: d.cover,
      videoNoWatermark: `https://www.tikwm.com${d.play}`,
      videoWatermarked: d.wmplay ? `https://www.tikwm.com${d.wmplay}` : null,
      audio: d.music ? `https://www.tikwm.com${d.music}` : null,
      duration: d.duration,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch that TikTok video." });
  }
});

freeApiRouter.get("/api/free/tiktok/stalk", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().replace(/^@/, "");
    if (!username) return res.status(400).json({ error: "Missing ?username=" });
    const data = await fetchJson(`https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(username)}`);
    if (!data || data.code !== 0 || !data.data) return res.status(404).json({ error: "Could not find that TikTok user." });
    const u = data.data.user || {};
    const s = data.data.stats || {};
    res.json({
      uniqueId: u.uniqueId,
      nickname: u.nickname,
      verified: !!u.verified,
      bio: u.signature || "",
      avatar: u.avatarLarger,
      followers: s.followerCount,
      following: s.followingCount,
      likes: s.heartCount,
      videos: s.videoCount,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not find that TikTok user." });
  }
});

const TWITTER_GUEST_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
let twitterGuestToken = null;
let twitterGuestTokenAt = 0;

async function getTwitterGuestToken() {
  if (twitterGuestToken && Date.now() - twitterGuestTokenAt < 25 * 60 * 1000) return twitterGuestToken;
  const res = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    method: "POST",
    headers: { Authorization: `Bearer ${decodeURIComponent(TWITTER_GUEST_BEARER)}` },
  });
  const data = await res.json();
  if (!data || !data.guest_token) throw Object.assign(new Error("Could not get a Twitter guest session."), { status: 502 });
  twitterGuestToken = data.guest_token;
  twitterGuestTokenAt = Date.now();
  return twitterGuestToken;
}

freeApiRouter.get("/api/free/twitter", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    const idMatch = url.match(/status(?:es)?\/(\d+)/);
    if (!idMatch) return res.status(400).json({ error: "That doesn't look like a tweet URL." });
    const tweetId = idMatch[1];

    const guestToken = await getTwitterGuestToken();
    const apiRes = await fetch(`https://api.twitter.com/2/timeline/conversation/${tweetId}.json?tweet_mode=extended`, {
      headers: {
        Authorization: `Bearer ${decodeURIComponent(TWITTER_GUEST_BEARER)}`,
        "x-guest-token": guestToken,
      },
    });
    const data = await apiRes.json();
    const tweet = data && data.globalObjects && data.globalObjects.tweets && data.globalObjects.tweets[tweetId];
    const media = tweet && tweet.extended_entities && tweet.extended_entities.media && tweet.extended_entities.media[0];
    const variants = media && media.video_info && media.video_info.variants;
    if (!variants || !variants.length) return res.status(404).json({ error: "No video found on that tweet." });

    const best = variants
      .filter((v) => v.content_type === "video/mp4")
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (!best) return res.status(404).json({ error: "No downloadable video found on that tweet." });

    res.json({ video: best.url, thumbnail: media.media_url_https, text: tweet.full_text });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not fetch that tweet's video right now." });
  }
});

freeApiRouter.get("/api/free/facebook", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) return res.status(400).json({ error: "Missing ?url=" });
    const pageRes = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 10)" } });
    const html = await pageRes.text();
    const hd = html.match(/"browser_native_hd_url":"([^"]+)"/);
    const sd = html.match(/"browser_native_sd_url":"([^"]+)"/);
    const decode = (s) => s.replace(/\\u0025/g, "%").replace(/\\\//g, "/").replace(/&amp;/g, "&");
    const hdUrl = hd ? decode(hd[1]) : null;
    const sdUrl = sd ? decode(sd[1]) : null;
    if (!hdUrl && !sdUrl) return res.status(404).json({ error: "Could not find a downloadable video on that link." });
    res.json({ hd: hdUrl, sd: sdUrl });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch that Facebook video." });
  }
});

freeApiRouter.get("/api/free/instagram", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url) return res.status(400).json({ error: "Missing ?url=" });
    const clean = url.split("?")[0].replace(/\/$/, "");
    const embedRes = await fetch(`${clean}/embed/captioned/`, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await embedRes.text();
    const $ = cheerio.load(html);
    const scriptText = $("script").map((i, el) => $(el).html()).get().join("\n");
    const videoMatch = scriptText.match(/"video_url":"([^"]+)"/) || html.match(/"video_url":"([^"]+)"/);
    const video = videoMatch ? videoMatch[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/") : null;
    if (!video) return res.status(404).json({ error: "Could not find a video on that post (it may be private)." });
    res.json({ video });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch that Instagram video." });
  }
});

freeApiRouter.get("/api/free/youtube/video", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url || !ytdl.validateURL(url)) return res.status(400).json({ error: "That's not a valid YouTube link." });
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: "18" }) || ytdl.chooseFormat(info.formats, { filter: "videoandaudio" });
    if (!format) return res.status(404).json({ error: "No downloadable format found for that video." });
    res.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails.slice(-1)[0]?.url,
      duration: info.videoDetails.lengthSeconds,
      quality: format.qualityLabel || "audio+video",
      downloadUrl: format.url,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch that YouTube video." });
  }
});

freeApiRouter.get("/api/free/song/search", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (!query) return res.status(400).json({ error: "Missing ?query=" });
    const result = await ytsearch(query);
    const video = result.videos && result.videos[0];
    if (!video) return res.status(404).json({ error: "Could not find that song." });
    res.json({
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      duration: video.timestamp,
      author: video.author && video.author.name,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not search for that song." });
  }
});

freeApiRouter.get("/api/free/song/download", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url || !ytdl.validateURL(url)) return res.status(400).json({ error: "That's not a valid YouTube link." });
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    if (!format) return res.status(404).json({ error: "No downloadable audio found for that video." });
    res.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails.slice(-1)[0]?.url,
      duration: info.videoDetails.lengthSeconds,
      downloadUrl: format.url,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch that song's audio." });
  }
});

freeApiRouter.get("/api/free/song/from-query", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (!query) return res.status(400).json({ error: "Missing ?query=" });
    const result = await ytsearch(query);
    const video = result.videos && result.videos[0];
    if (!video) return res.status(404).json({ error: "Could not find that song." });
    const info = await ytdl.getInfo(video.url);
    const format = ytdl.chooseFormat(info.formats, { filter: "audioonly", quality: "highestaudio" });
    if (!format) return res.status(404).json({ error: "No downloadable audio found for that song." });
    res.json({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.timestamp,
      downloadUrl: format.url,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch that song." });
  }
});


freeApiRouter.get("/api/free/lyrics", async (req, res) => {
  try {
    const artist = String(req.query.artist || req.query.a || "").trim();
    const title = String(req.query.title || req.query.t || "").trim();
    if (!artist || !title) return res.status(400).json({ error: "Missing ?artist= and ?title=" });
    const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!data || !data.lyrics) return res.status(404).json({ error: "Lyrics not found." });
    res.json({ lyrics: data.lyrics.trim() });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Lyrics not found." });
  }
});

freeApiRouter.get("/api/free/canvas/book", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    if (!text) return res.status(400).json({ error: "Missing ?text=" });
    const w = 800, h = 1000;
    const lines = wrapText(text, 55).slice(0, 40);
    const svg = `
      <svg width="${w}" height="${h}">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#f5ecd7"/>
        <rect x="30" y="30" width="${w - 60}" height="${h - 60}" fill="none" stroke="#c9b98a" stroke-width="2"/>
        ${lines.map((line, i) => `<text x="60" y="${90 + i * 28}" font-size="20" font-family="Georgia, serif" fill="#2b2214">${escapeXml(line)}</text>`).join("")}
      </svg>`;
    const out = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set("Content-Type", "image/png");
    res.send(out);
  } catch (err) {
    res.status(500).json({ error: "Could not build that page image." });
  }
});

freeApiRouter.get("/api/free/imagine", async (req, res) => {
  try {
    const prompt = String(req.query.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "Missing ?prompt=" });
    const seed = Math.floor(Math.random() * 1e9);
    const imgRes = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&nologo=true`);
    if (!imgRes.ok) return res.status(502).json({ error: "Could not generate that image right now." });
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not generate that image right now." });
  }
});

freeApiRouter.get("/api/free/screenshot", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Missing or invalid ?url=" });
    const shotRes = await fetch(`https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1200&h=900`);
    if (!shotRes.ok) return res.status(502).json({ error: "Could not capture that page right now." });
    const buffer = Buffer.from(await shotRes.arrayBuffer());
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not capture that page right now." });
  }
});

freeApiRouter.get("/api/free/removebg", async (req, res) => {
  try {
    const imageUrl = String(req.query.url || "").trim();
    if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "Missing or invalid ?url=" });
    const blob = await removeBackground(imageUrl);
    const buffer = Buffer.from(await blob.arrayBuffer());
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Could not remove the background from that image." });
  }
});

freeApiRouter.get("/api/free/technews", async (req, res) => {
  try {
    const feedRes = await fetch("https://techcrunch.com/feed/");
    const xml = await feedRes.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    if (!items.length) return res.status(502).json({ error: "Could not fetch tech news right now." });
    const pick = items[Math.floor(Math.random() * Math.min(items.length, 15))];
    const grab = (tag) => {
      const m = pick.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
      return m ? m[1].trim() : null;
    };
    const title = grab("title");
    const link = grab("link");
    const description = (grab("description") || "").replace(/<[^>]+>/g, "").trim();
    const imageMatch = pick.match(/<media:content[^>]+url="([^"]+)"/) || pick.match(/<img[^>]+src="([^"]+)"/);
    res.json({
      title,
      link,
      description,
      image: imageMatch ? imageMatch[1] : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not fetch tech news right now." });
  }
});


freeApiRouter.get("/api/free/canvas/fakewa", async (req, res) => {
  try {
    const name = String(req.query.name || "Unknown").trim();
    const number = String(req.query.number || "").trim();
    const status = String(req.query.status || "").trim();
    const w = 720, h = 300;
    const initial = escapeXml((name[0] || "?").toUpperCase());
    const svg = `
      <svg width="${w}" height="${h}">
        <rect x="0" y="0" width="${w}" height="${h}" fill="#0b141a"/>
        <rect x="0" y="0" width="${w}" height="70" fill="#1f2c34"/>
        <text x="24" y="45" font-size="24" font-family="Helvetica, Arial, sans-serif" fill="#e9edef" font-weight="bold">WhatsApp</text>
        <circle cx="90" cy="170" r="60" fill="#00a884"/>
        <text x="90" y="185" font-size="48" font-family="Helvetica, Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${initial}</text>
        <text x="180" y="150" font-size="30" font-family="Helvetica, Arial, sans-serif" fill="#e9edef" font-weight="bold">${escapeXml(name)}</text>
        <text x="180" y="185" font-size="20" font-family="Helvetica, Arial, sans-serif" fill="#8696a0">${escapeXml(number)}</text>
        ${status ? `<text x="180" y="220" font-size="18" font-family="Helvetica, Arial, sans-serif" fill="#8696a0" font-style="italic">${escapeXml(status)}</text>` : ""}
      </svg>`;
    const out = await sharp(Buffer.from(svg)).png().toBuffer();
    res.set("Content-Type", "image/png");
    res.send(out);
  } catch (err) {
    res.status(500).json({ error: "Could not build that image." });
  }
});

freeApiRouter.get("/api/free/canvas/caption", async (req, res) => {
  try {
    const imageUrl = String(req.query.image || "").trim();
    const text = String(req.query.text || "").trim();
    if (!imageUrl) return res.status(400).json({ error: "Missing ?image=" });
    if (!/^https?:\/\//i.test(imageUrl)) return res.status(400).json({ error: "?image= must be a full http(s) URL." });

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return res.status(400).json({ error: "Could not download that image." });
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

    const base = sharp(imgBuffer).resize(720, null, { withoutEnlargement: true });
    const meta = await base.metadata();
    const w = meta.width || 720;
    const barHeight = 90;
    const lines = wrapText(text, 30).slice(0, 2);
    const svg = `
      <svg width="${w}" height="${barHeight}">
        <rect x="0" y="0" width="${w}" height="${barHeight}" fill="black"/>
        ${lines.map((line, i) => `<text x="${w / 2}" y="${40 + i * 32}" font-size="28" font-family="Impact, Arial, sans-serif" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(line.toUpperCase())}</text>`).join("")}
      </svg>`;
    const barBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const out = await base
      .composite([{ input: barBuffer, gravity: "south" }])
      .png()
      .toBuffer();
    res.set("Content-Type", "image/png");
    res.send(out);
  } catch (err) {
    res.status(500).json({ error: "Could not build that image." });
  }
});

freeApiRouter.post("/api/free/ai/chat", async (req, res) => {
  try {
    const prompt = String(req.body?.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "Missing prompt." });
    const aiRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`);
    if (!aiRes.ok) return res.status(502).json({ error: "AI service is unavailable right now." });
    const text = await aiRes.text();
    res.json({ reply: text.trim(), model: "pollinations/openai (not affiliated with OpenAI)" });
  } catch (err) {
    res.status(500).json({ error: "AI service is unavailable right now." });
  }
});

freeApiRouter.post("/api/free/imgscan", async (req, res) => {
  try {
    const imageUrl = String(req.body?.url || "").trim();
    if (!imageUrl) return res.status(400).json({ error: "Missing image url." });
    if (!process.env.HF_API_TOKEN) {
      return res.status(503).json({ error: "Image scanning is not configured yet (missing HF_API_TOKEN)." });
    }
    const imgRes = await fetch(imageUrl);
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
    const hfRes = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.HF_API_TOKEN}`, "Content-Type": "application/octet-stream" },
      body: imgBuffer,
    });
    const data = await hfRes.json();
    const caption = Array.isArray(data) && data[0] && data[0].generated_text;
    if (!caption) return res.status(502).json({ error: "Could not describe that image right now." });
    res.json({ result: caption });
  } catch (err) {
    res.status(500).json({ error: "Could not describe that image right now." });
  }
});

freeApiRouter.get("/api/free/gdrive", async (req, res) => {
  try {
    const inputUrl = String(req.query.url || "").trim();
    const idMatch = inputUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || inputUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (!idMatch) return res.status(400).json({ error: "Could not find a file ID in that link." });
    const fileId = idMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    let head = await fetch(directUrl, { method: "GET", redirect: "follow" });
    const contentType = head.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await head.text();
      const confirmMatch = html.match(/confirm=([0-9A-Za-z_]+)/);
      if (confirmMatch) {
        head = await fetch(`${directUrl}&confirm=${confirmMatch[1]}`, { method: "GET", redirect: "follow" });
      }
    }

    const disposition = head.headers.get("content-disposition") || "";
    const nameMatch = disposition.match(/filename="?([^";]+)"?/);
    res.json({
      name: nameMatch ? decodeURIComponent(nameMatch[1]) : "Unknown",
      size: head.headers.get("content-length") || "Unknown",
      mimeType: head.headers.get("content-type") || "Unknown",
      downloadLink: head.url,
      thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not read that Google Drive link." });
  }
});

freeApiRouter.get("/api/free/resolve", async (req, res) => {
  try {
    const url = String(req.query.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Missing or invalid ?url=" });
    const head = await fetch(url, { method: "GET", redirect: "follow" });
    res.json({
      finalUrl: head.url,
      contentType: head.headers.get("content-type") || "Unknown",
      size: head.headers.get("content-length") || "Unknown",
      status: head.status,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not resolve that link." });
  }
});

freeApiRouter.get("/api/free/apk", async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (!query) return res.status(400).json({ error: "Missing ?query=" });
    const searchRes = await fetch(`https://apkcombo.com/search?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await searchRes.text();
    const $ = cheerio.load(html);
    const firstResult = $("a.app-w").first();
    const appPath = firstResult.attr("href");
    const appName = firstResult.find(".name").text().trim() || query;
    const icon = firstResult.find("img").attr("src") || firstResult.find("img").attr("data-src");
    if (!appPath) return res.status(404).json({ error: "Could not find that app." });
    res.json({
      name: appName,
      icon,
      infoPage: new URL(appPath, "https://apkcombo.com").toString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Could not search for that app right now." });
  }
});

freeApiRouter.get("/api/free/instagram/stalk", async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().replace(/^@/, "");
    if (!username) return res.status(400).json({ error: "Missing ?username=" });
    const pageRes = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
    });
    const html = await pageRes.text();
    const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!jsonMatch) return res.status(404).json({ error: "Could not find that Instagram profile." });
    const data = JSON.parse(jsonMatch[1]);
    res.json({
      username,
      name: data.name || username,
      bio: data.description || "",
      avatar: data.image || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Could not find that Instagram profile right now." });
  }
});
