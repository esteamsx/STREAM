import express from "express";
import crypto from "node:crypto";
import QRCode from "qrcode";
import sharp from "sharp";
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
