import { siteHeadFor } from "../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "./music-player.js";

const FEATURES = [
  {
    key: "mp3",
    title: "MP3 Downloader",
    desc: "Search and download MP3 audio by title or artist.",
    icon: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/mp3?query=",
    live: true,
    example: "GET /api/v1/dev/mp3?query=your song here",
  },
  {
    key: "mp4",
    title: "MP4 Downloader",
    desc: "Search and download MP4 video by title.",
    icon: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/mp4?query=",
    live: true,
    example: "GET /api/v1/dev/mp4?query=your video here",
  },
  {
    key: "facebook",
    title: "Facebook Downloader",
    desc: "Pull a direct video file from a Facebook link.",
    icon: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/facebook?url=",
    live: true,
    example: "GET /api/v1/dev/facebook?url=https://facebook.com/watch/?v=...",
  },
  {
    key: "tiktok",
    title: "TikTok Downloader",
    desc: "Pull a direct video (no watermark) or image set from a public TikTok link.",
    icon: '<path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/tiktok?url=",
    live: true,
    example: "GET /api/v1/dev/tiktok?url=https://www.tiktok.com/@user/video/...",
  },
  {
    key: "instagram",
    title: "Instagram Downloader",
    desc: "Pull a direct video or image file from a public Instagram post or reel.",
    icon: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/instagram?url=",
    live: true,
    example: "GET /api/v1/dev/instagram?url=https://www.instagram.com/reel/...",
  },
  {
    key: "ai",
    title: "AI",
    desc: "Send a prompt, get a real AI response back.",
    icon: '<path d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M8 14v2a4 4 0 004 4 4 4 0 004-4v-2"/><path d="M12 20v2"/>',
    category: "AI & Vision",
    endpoint: "POST /api/v1/dev/ai",
    live: true,
    example: 'POST /api/v1/dev/ai  { "prompt": "..." }',
  },
  {
    key: "ocr",
    title: "OCR",
    desc: "Extract text from an image.",
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/>',
    category: "AI & Vision",
    endpoint: "GET /api/v1/dev/ocr?url=",
    live: true,
    example: "GET /api/v1/dev/ocr?url=https://example.com/image.png",
  },
  {
    key: "imgscan",
    title: "Image Analysis",
    desc: "Get a written description of what's in an image.",
    icon: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>',
    category: "AI & Vision",
    endpoint: "GET /api/v1/dev/imgscan?url=",
    live: true,
    example: "GET /api/v1/dev/imgscan?url=https://example.com/image.png",
  },
  {
    key: "videogen",
    title: "AI Video Generation",
    desc: "Generate a short video from a text prompt. Experimental — generation can take 30-120 seconds.",
    icon: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M22 8l-5 3.5L22 15V8z"/>',
    category: "AI & Vision",
    endpoint: "POST /api/v1/dev/videogen",
    live: true,
    example: 'POST /api/v1/dev/videogen  { "prompt": "a cat surfing a wave" }',
  },
  {
    key: "qrcode",
    title: "QR Code",
    desc: "Generate a QR code image for any text or link.",
    icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM19 14v3M14 19h3M19 19h2"/>',
    category: "Tools",
    endpoint: "GET /api/v1/dev/qrcode?text=",
    live: true,
    example: "GET /api/v1/dev/qrcode?text=https://esteamstv.devs.surf",
  },
  {
    key: "shorten",
    title: "URL Shortener",
    desc: "Turn a long link into a short esteamstv.devs.surf/s/ link.",
    icon: '<path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 007.07 7.07l1.5-1.5"/>',
    category: "Tools",
    endpoint: "POST /api/v1/dev/shorten",
    live: true,
    example: 'POST /api/v1/dev/shorten  { "url": "..." }',
  },
  {
    key: "tempmail",
    title: "Temp Mail",
    desc: "Spin up a disposable inbox, then poll it for incoming mail. Handy for OTP/verification flows.",
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    category: "Tools",
    endpoint: "POST /api/v1/dev/tempmail/create",
    live: true,
    example: "POST /api/v1/dev/tempmail/create",
  },
  {
    key: "weather",
    title: "Weather",
    desc: "Current weather for any city.",
    icon: '<path d="M17.5 19a4.5 4.5 0 000-9 6 6 0 00-11.5 2.5A4 4 0 007 20h10.5z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/weather?location=",
    live: true,
    example: "GET /api/v1/dev/weather?location=Lagos",
  },
  {
    key: "lyrics",
    title: "Lyrics",
    desc: "Song lyrics by artist and title.",
    icon: '<path d="M7 7h4v4a4 4 0 01-4 4H6v-2h1a2 2 0 002-2H7V7z"/><path d="M15 7h4v4a4 4 0 01-4 4h-1v-2h1a2 2 0 002-2h-2V7z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/lyrics?artist=&title=",
    live: true,
    example: "GET /api/v1/dev/lyrics?artist=Alan Walker&title=Faded",
  },
  {
    key: "bible",
    title: "Bible",
    desc: "Look up a Bible verse by reference.",
    icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/bible?reference=",
    live: true,
    example: "GET /api/v1/dev/bible?reference=John 3:16",
  },
  {
    key: "quran",
    title: "Quran",
    desc: "Look up a Quran verse by reference.",
    icon: '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/quran?reference=",
    live: true,
    example: "GET /api/v1/dev/quran?reference=2:255",
  },
  {
    key: "technews",
    title: "Tech News",
    desc: "Top tech stories right now.",
    icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/technews?limit=",
    live: true,
    example: "GET /api/v1/dev/technews?limit=5",
  },
  {
    key: "currency",
    title: "Currency Exchange",
    desc: "Convert between currencies at the latest rate.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M9 8h4a2 2 0 010 4H9m0 0h4a2 2 0 010 4H9m3-10v12"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/currency?from=&to=",
    live: true,
    example: "GET /api/v1/dev/currency?from=USD&to=NGN&amount=1",
  },
  {
    key: "dictionary",
    title: "Dictionary",
    desc: "Definitions for any English word.",
    icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/><path d="M9 7h7M9 11h5"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/dictionary?word=",
    live: true,
    example: "GET /api/v1/dev/dictionary?word=hello",
  },
  {
    key: "iplookup",
    title: "IP Lookup",
    desc: "Location and network info for any IP address.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 3a15 15 0 010 18 15 15 0 010-18z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/iplookup?ip=",
    live: true,
    example: "GET /api/v1/dev/iplookup?ip=8.8.8.8",
  },
  {
    key: "country",
    title: "Country Info",
    desc: "Capital, population, region, and currency for any country.",
    icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v14"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/country?name=",
    live: true,
    example: "GET /api/v1/dev/country?name=Nigeria",
  },
  {
    key: "trivia",
    title: "Trivia",
    desc: "A random trivia question, optionally by category or difficulty.",
    icon: '<path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1.5 2-2.25 2.75S12 13 12 14"/><circle cx="12" cy="17.5" r=".5" fill="currentColor"/><circle cx="12" cy="12" r="9"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/trivia?category=&difficulty=",
    live: true,
    example: "GET /api/v1/dev/trivia?difficulty=easy",
  },
  {
    key: "joke",
    title: "Joke",
    desc: "A random Chuck Norris style joke.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/joke",
    live: true,
    example: "GET /api/v1/dev/joke",
  },
  {
    key: "advice",
    title: "Advice",
    desc: "A random piece of advice.",
    icon: '<path d="M12 2a7 7 0 00-4 12.7V17a2 2 0 002 2h4a2 2 0 002-2v-2.3A7 7 0 0012 2z"/><path d="M10 22h4"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/advice",
    live: true,
    example: "GET /api/v1/dev/advice",
  },
  {
    key: "catfact",
    title: "Cat Fact",
    desc: "A random fact about cats.",
    icon: '<path d="M4 8l4-4 4 4M12 8l4-4 4 4M6 8v8a6 6 0 006 6 6 6 0 006-6V8"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/catfact",
    live: true,
    example: "GET /api/v1/dev/catfact",
  },
  {
    key: "holidays",
    title: "Public Holidays",
    desc: "Public holidays for a country and year.",
    icon: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/holidays?year=&country=",
    live: true,
    example: "GET /api/v1/dev/holidays?year=2026&country=NG",
  },
  {
    key: "githubuser",
    title: "GitHub User",
    desc: "Public profile info for a GitHub username.",
    icon: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2-.2 4.5-1 4.5-4.5 0-1-.5-2-1-2.5.1-.5.5-1.5-.1-3 0 0-1 0-3 1.5-1.8-.5-3.2-.5-5 0C8 4 7 4 7 4c-.6 1.5-.2 2.5-.1 3-.5.5-1 1.5-1 2.5 0 3.5 2.5 4.3 4.5 4.5-.3.3-.5.7-.5 1.5"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/githubuser?username=",
    live: true,
    example: "GET /api/v1/dev/githubuser?username=torvalds",
  },
  {
    key: "movie",
    title: "Movie Info",
    desc: "Overview, genres, poster, and rating for any movie title.",
    icon: '<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M7 3v18M17 3v18M2 8h5M2 16h5M17 8h5M17 16h5"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/movie?query=",
    live: true,
    example: "GET /api/v1/dev/movie?query=Inception",
  },
  {
    key: "sportsteam",
    title: "Sports Team",
    desc: "League, stadium, and background info for any sports team.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/sportsteam?name=",
    live: true,
    example: "GET /api/v1/dev/sportsteam?name=Arsenal",
  },
  {
    key: "crypto",
    title: "Crypto Price",
    desc: "Live USD/NGN price and 24h change for any coin, by name or symbol.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 6v12M9 9h4.5a2 2 0 010 4H9m0 0h4.5a2 2 0 010 4H9"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/crypto?coin=",
    live: true,
    example: "GET /api/v1/dev/crypto?coin=BTC",
  },
  {
    key: "wikipedia",
    title: "Wikipedia Summary",
    desc: "Short summary, thumbnail, and link for any Wikipedia article.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M8 9l2 6 2-4 2 4 2-6"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/wikipedia?title=",
    live: true,
    example: "GET /api/v1/dev/wikipedia?title=Lagos",
  },
  {
    key: "dogimage",
    title: "Dog Image",
    desc: "A random dog image URL.",
    icon: '<path d="M10 5.5C8 4 5 4 4 6c-1 2 0 4 2 5m8-5.5c2-1.5 5-1.5 6 .5 1 2 0 4-2 5"/><path d="M6 11c0 5 3 8 6 8s6-3 6-8c0-2-2-4-6-4s-6 2-6 4z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/dogimage",
    live: true,
    example: "GET /api/v1/dev/dogimage",
  },
  {
    key: "quote",
    title: "Random Quote",
    desc: "A random inspirational quote and its author.",
    icon: '<path d="M7 7h4v4a4 4 0 01-4 4H6v-2h1a2 2 0 002-2H7V7z"/><path d="M15 7h4v4a4 4 0 01-4 4h-1v-2h1a2 2 0 002-2h-2V7z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/quote",
    live: true,
    example: "GET /api/v1/dev/quote",
  },
  {
    key: "minecraft",
    title: "Minecraft Server Status",
    desc: "Online status, player count, and version for any Minecraft server.",
    icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h2v2H7zM11 8h2v2h-2zM15 8h2v2h-2zM7 12h10v6H7z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/minecraft?address=",
    live: true,
    example: "GET /api/v1/dev/minecraft?address=mc.hypixel.net",
  },
  {
    key: "npm",
    title: "NPM Package Info",
    desc: "Latest version, description, and license for any npm package.",
    icon: '<path d="M3 3h18v18H3z"/><path d="M8 8h8v8h-3v-6h-2v6H8z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/npm?package=",
    live: true,
    example: "GET /api/v1/dev/npm?package=express",
  },
  {
    key: "youtube",
    title: "YouTube Info",
    desc: "Title, channel, and thumbnail for any YouTube video link.",
    icon: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/youtube?url=",
    live: true,
    example: "GET /api/v1/dev/youtube?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    key: "githubrepo",
    title: "GitHub Repo",
    desc: "Stars, forks, language, and description for any public GitHub repo.",
    icon: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2-.2 4.5-1 4.5-4.5 0-1-.5-2-1-2.5.1-.5.5-1.5-.1-3 0 0-1 0-3 1.5-1.8-.5-3.2-.5-5 0C8 4 7 4 7 4c-.6 1.5-.2 2.5-.1 3-.5.5-1 1.5-1 2.5 0 3.5 2.5 4.3 4.5 4.5-.3.3-.5.7-.5 1.5"/>',
    category: "Lookup",
    endpoint: "GET /api/v1/dev/githubrepo?repo=",
    live: true,
    example: "GET /api/v1/dev/githubrepo?repo=facebook/react",
  },
];

const CATEGORIES = [];
FEATURES.forEach((f) => {
  if (!CATEGORIES.includes(f.category)) CATEGORIES.push(f.category);
});

function featureCardHtml(f) {
  return `<div class="dcard feature-card${f.live ? " is-live" : ""}" data-search="${(f.title + " " + f.desc).toLowerCase().replace(/"/g, "&quot;")}">
      <div class="feature-top">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${f.icon}</svg></span>
          <div>
            <div class="dcard-title">${f.title}</div>
            <div class="dcard-sub">${f.desc}</div>
          </div>
          <span class="feature-badge${f.live ? " is-live" : ""}">${f.live ? "LIVE" : "SOON"}</span>
        </div>
        ${f.example ? `<div class="feature-example">${f.example}</div>` : ""}
      </div>
      ${f.live ? `<button class="btn btn-sm tryit-open-btn" type="button" data-endpoint="${f.key}" style="width:100%;justify-content:center;margin-top:12px">Try it</button>` : ""}
    </div>`;
}

function docsEndpointRows() {
  return FEATURES.map(
    (f) =>
      `<tr><td>${f.title}</td><td><code>${f.endpoint}</code></td><td>${f.live ? '<span class="badge badge-get">LIVE</span>' : '<span class="badge" style="background:var(--card2);color:var(--muted)">SOON</span>'}</td></tr>`
  ).join("\n      ");
}

export function renderDevelopersApi(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("developersApi")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<script nonce="__CSP_NONCE__" src="https://js.paystack.co/v1/inline.js"></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--red-dim:#8f1530;--amber:#F5A623;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
  --card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  min-height:100%;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
a{color:var(--accent);text-decoration:none}
code,pre{font-family:var(--font-mono)}
code{background:var(--card2);padding:2px 6px;border-radius:5px;font-size:.85em}
pre{
  background:var(--card2);border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6;margin:10px 0 18px;
  white-space:pre-wrap;word-break:break-all;
}
.wrap{max-width:920px;margin:0 auto;padding:22px 20px 80px}

#view-docs{display:none}

.back-row{margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.back-link{
  display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;
  font-size:.82rem;font-weight:600;background:none;border:none;cursor:pointer;padding:0;font-family:var(--font-body);
}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}
.docs-link-btn{
  display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:9px;
  font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);
}
.docs-link-btn:hover{background:var(--card)}
.docs-link-btn svg{width:14px;height:14px}

.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}

.btn{
  display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px;
  font-family:var(--font-body);font-size:.8rem;font-weight:600;cursor:pointer;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);transition:background .18s var(--ease),transform .1s var(--ease);
}
.btn:hover{background:var(--card)}
.btn:active{transform:scale(.97)}
.btn svg{width:14px;height:14px;flex-shrink:0}
.btn-primary{
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;border-color:transparent;
}
.btn-primary:hover{opacity:.92;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.btn-sm{padding:6px 10px;font-size:.72rem;border-radius:8px}
.btn:disabled,.icon-btn:disabled{opacity:.6;cursor:not-allowed}
.btn-primary:disabled{background:var(--card2);color:var(--muted);opacity:1;box-shadow:none}

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:13px;height:13px;border:2px solid rgba(4,18,26,.35);border-top-color:#04121a;
  border-radius:50%;display:inline-block;flex-shrink:0;animation:spin .6s linear infinite;
}

@keyframes overlayCardIn{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;
}
.page-overlay.show{display:flex}
body:has(.page-overlay.show){overflow:hidden}
.overlay-card{
  width:100%;max-width:360px;max-height:calc(100vh - 48px);overflow-y:auto;
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;
  padding:26px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
  animation:overlayCardIn .22s var(--ease);
}
.overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.overlay-sub{font-size:.82rem;color:var(--muted);line-height:1.5}
.overlay-sub b{color:var(--text)}
.overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline;cursor:pointer}
.overlay-step{display:none;flex-direction:column;gap:14px}
.overlay-step.active{display:flex}
.ch-loading{padding:20px;text-align:center;font-size:.8rem;color:var(--muted)}

.plans-grid{
  display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity;
  -webkit-overflow-scrolling:touch;
}
.plan-card{
  background:var(--card2);border:1px solid var(--border-strong);border-radius:14px;padding:16px;
  display:flex;flex-direction:column;gap:12px;position:relative;
  flex:0 0 auto;width:200px;scroll-snap-align:start;
}
@media(min-width:600px){ .plan-card{width:220px} }
.plan-card.current{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.plan-card.highlight{border-color:var(--accent2);background:linear-gradient(160deg,rgba(124,92,255,.1),var(--card2))}
.plan-name{font-family:var(--font-display);font-weight:700;font-size:1rem}
.plan-price{font-family:var(--font-display);font-weight:700;font-size:1.4rem}
.plan-price span{font-size:.68rem;font-weight:500;color:var(--muted)}
.plan-note{font-size:.68rem;color:var(--muted);min-height:14px}
.plan-features{display:flex;flex-direction:column;gap:7px;flex:1}
.plan-feature{display:flex;align-items:center;gap:7px;font-size:.76rem;color:var(--text)}
.plan-feature svg{width:13px;height:13px;color:var(--green);flex-shrink:0}
.plan-feature.off{color:var(--muted2)}
.plan-feature.off svg{color:var(--muted2)}
.plan-cta{width:100%;justify-content:center;font-size:.78rem;padding:9px 10px}
.plan-current-badge{
  align-self:flex-start;font-size:.62rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  padding:3px 9px;border-radius:20px;background:rgba(0,224,255,.14);color:var(--accent);border:1px solid rgba(0,224,255,.3);
}

.hero{margin-bottom:26px}
.hero h1{font-family:var(--font-display);font-size:1.7rem;margin-bottom:6px}
.hero p{color:var(--muted);line-height:1.6;font-size:.92rem;max-width:52ch}

.dash-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:760px){ .dash-grid{grid-template-columns:1fr 1fr} .dash-grid .span2{grid-column:1/-1} }
.dcard{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:18px;position:relative;overflow:hidden;
}
.dcard-head{display:flex;align-items:center;gap:9px;margin-bottom:14px}
.dcard-icon{width:28px;height:28px;border-radius:9px;background:var(--card2);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0}
.dcard-icon svg{width:15px;height:15px}
.dcard-title{font-family:var(--font-display);font-size:.95rem;font-weight:700}
.dcard-sub{font-size:.72rem;color:var(--muted);margin-top:1px}
.dcard-msg{font-size:.74rem;margin-top:8px;min-height:1em}
.dcard-msg.ok{color:var(--green)}
.dcard-msg.err{color:var(--red)}

.field{margin-bottom:10px}
.field label{display:block;font-size:.72rem;color:var(--muted);margin-bottom:6px;font-weight:600}
.field input,.field select{
  width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);font-size:.83rem;outline:none;
}
.field input:focus,.field select:focus{border-color:var(--accent)}

.key-row{
  display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:11px;
  background:var(--card2);border:1px solid var(--border);margin-bottom:10px;
}
.key-dot{width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;box-shadow:0 0 0 3px rgba(18,196,139,.15)}
.key-info{flex:1;min-width:0}
.key-label{font-size:.82rem;font-weight:600}
.key-meta{font-size:.68rem;color:var(--muted);font-family:var(--font-mono);margin-top:2px}
.key-actions{display:flex;gap:6px;flex-shrink:0}
.icon-btn{
  width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  background:transparent;border:1px solid var(--border);color:var(--muted);cursor:pointer;
}
.icon-btn:hover{color:var(--red);border-color:rgba(255,59,92,.3);background:rgba(255,59,92,.06)}
.icon-btn svg{width:13px;height:13px}
.reveal-box{margin-top:10px;padding:12px;border-radius:10px;background:rgba(0,224,255,.08);border:1px solid rgba(0,224,255,.25)}
.reveal-label{font-size:.72rem;color:var(--muted);margin-bottom:7px}
.reveal-row{display:flex;gap:8px;align-items:center}
.reveal-row code{flex:1;font-size:.76rem;word-break:break-all;background:transparent;padding:0}

.usage-wrap{margin-top:14px}
.usage-top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px}
.usage-label{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.usage-count{font-family:var(--font-mono);font-size:.74rem;color:var(--text);font-weight:600}
.usage-track{height:7px;border-radius:5px;background:var(--card2);border:1px solid var(--border);overflow:hidden}
.usage-fill{height:100%;width:0%;border-radius:5px;background:linear-gradient(90deg,var(--accent),var(--accent2));transition:width 1s var(--ease),background .4s var(--ease)}
.usage-fill.lvl-warn{background:linear-gradient(90deg,var(--amber),#ffcf6b)}
.usage-fill.lvl-hot{background:linear-gradient(90deg,var(--red),#ff7a8d)}

.empty-state{font-size:.8rem;color:var(--muted);line-height:1.6;padding:6px 2px 14px}

.browse-head{margin:32px 0 16px}
.browse-head h2{font-family:var(--font-display);font-size:1.15rem;margin-bottom:2px}
.browse-total{font-size:.78rem;color:var(--muted);margin-bottom:10px;font-variant-numeric:tabular-nums}
.browse-total-count{font-weight:700;color:var(--accent);font-family:var(--font-display)}
.category-count{font-weight:400;color:var(--muted);opacity:.75}
.search-box{position:relative}
.search-box svg{
  position:absolute;left:13px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--muted);pointer-events:none;
}
.search-box input{
  width:100%;padding:11px 14px 11px 38px;border-radius:11px;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);font-size:.85rem;outline:none;
}
.search-box input:focus{border-color:var(--accent)}

.category-section{margin-bottom:26px}
.category-title{font-family:var(--font-display);font-size:.9rem;font-weight:700;margin-bottom:12px;color:var(--muted)}
.hscroll{
  display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x proximity;
  -webkit-overflow-scrolling:touch;
}
.no-results{display:none;color:var(--muted);font-size:.85rem;padding:20px 0;text-align:center}
.no-results.show{display:block}

.feature-card{
  opacity:.55;flex:0 0 auto;width:230px;scroll-snap-align:start;
  display:flex;flex-direction:column;
}
.feature-top{flex:1}
.feature-card.is-live{opacity:1}
.feature-card.hide{display:none}
.feature-badge{
  display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;
  font-size:.68rem;font-weight:700;letter-spacing:.02em;background:var(--card2);color:var(--muted);
  margin-left:auto;flex-shrink:0;
}
.feature-badge.is-live{background:rgba(18,196,139,.14);color:var(--green)}
.feature-example{
  margin-top:12px;background:var(--card2);border-radius:8px;padding:9px 11px;
  font-family:ui-monospace,monospace;font-size:.74rem;color:var(--text);overflow-x:auto;white-space:nowrap;
}

table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:.85rem}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600}
.badge{display:inline-block;padding:3px 9px;border-radius:6px;font-size:.72rem;font-weight:700;font-family:var(--font-mono)}
.badge-get{background:rgba(0,224,255,.12);color:var(--accent)}
.badge-post{background:rgba(124,92,255,.15);color:var(--accent2)}
.note{
  background:rgba(0,224,255,.06);border:1px solid rgba(0,224,255,.2);border-radius:10px;
  padding:12px 14px;font-size:.85rem;color:var(--text);margin:14px 0;
}
h2.doc-h2{font-family:var(--font-display);font-size:1.15rem;margin:34px 0 10px;padding-top:14px;border-top:1px solid var(--border)}
p.doc-p{color:var(--muted);line-height:1.65;margin-bottom:10px;font-size:.92rem}

.result-box{margin-top:4px}
.result-status{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.76rem;font-family:var(--font-mono)}
.status-pill{padding:3px 9px;border-radius:6px;font-weight:700;font-size:.72rem}
.status-pill.ok{background:rgba(18,196,139,.14);color:var(--green)}
.status-pill.bad{background:rgba(255,59,92,.14);color:var(--red)}
.result-time{color:var(--muted)}
.curl-label{display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:6px}
.curl-label span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
#tryitResultBody,#tryitCurl{max-height:220px;overflow-y:auto}
${musicPlayerStyle()}
</style>
</head>
<body>
<div class="wrap">

  <div id="view-dash">

    <div class="back-row">
      <a href="/developers" class="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
        Back
      </a>
      <button type="button" class="docs-link-btn" id="toDocsBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        Documentation
      </button>
    </div>

    <div class="page-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      ES TEAMS TV
    </div>

    <div class="hero">
      <h1>Developer Api</h1>
      <p>Media and AI tools for your own site or bot, all under one key. Being built out below.</p>
    </div>

    <div class="dash-grid">

      <div class="dcard span2" id="apiPlansCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/></svg></span>
          <div>
            <div class="dcard-title">Plans &amp; Pricing</div>
            <div class="dcard-sub">More API keys, higher rate limits, no ads on the higher tiers</div>
          </div>
        </div>
        <div class="plans-grid" id="plansGrid" style="margin-top:16px"><div class="ch-loading">Loading…</div></div>
        <div id="customAdsWrap" style="display:none;margin-top:16px">
          <div class="field">
            <label>Custom Ads Link <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">(Pro/Max plan, shown on error responses instead of our default promo)</span></label>
            <input type="text" id="customAdsInput" placeholder="https://yoursite.com">
          </div>
          <button class="btn btn-primary btn-sm" id="customAdsSaveBtn" type="button">Save Link</button>
          <div class="dcard-msg" id="customAdsMsg"></div>
        </div>
      </div>

      <div class="dcard span2" id="keyCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
          <div>
            <div class="dcard-title">API Key</div>
            <div class="dcard-sub">Separate from your Live Tv Api key &middot; shown once at creation</div>
          </div>
        </div>
        <div id="keyCardBody"><div class="empty-state">Loading…</div></div>
      </div>

    </div>

    <div class="browse-head">
      <h2>Browse APIs</h2>
      <div class="browse-total"><span class="browse-total-count" id="browseTotalCount">0</span> APIs available and growing</div>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="apiSearchInput" placeholder="Search APIs…">
      </div>
    </div>

    ${CATEGORIES.map((cat) => {
      const catFeatures = FEATURES.filter((f) => f.category === cat);
      return `<div class="category-section" data-category>
      <div class="category-title">${cat} <span class="category-count">(${catFeatures.length})</span></div>
      <div class="hscroll">
        ${catFeatures.map(featureCardHtml).join("\n        ")}
      </div>
    </div>`;
    }).join("\n    ")}

    <div class="no-results" id="noResults">No APIs match your search.</div>

  </div>

  <div id="view-docs">

    <div class="back-row">
      <a href="#" class="back-link" id="backToDashBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
        Back
      </a>
    </div>

    <div class="page-logo">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      ES TEAMS TV
    </div>

    <h1>Developer Api</h1>
    <p class="doc-p">Media and AI tools for your own site or bot: downloaders, AI, and OCR, all under one key. Endpoints are rolling out one at a time; anything marked LIVE below works today.</p>

    <h2 class="doc-h2">Getting a key</h2>
    <p class="doc-p">Create an API key from the <a href="#" id="docsToDashLink1">API Dashboard</a>. The raw key is shown once, so save it somewhere safe. This key is specific to the Developer Api, separate from the <a href="/developers/live-tv" target="_blank" rel="noopener">Live Tv Api</a>'s key, each has its own plan, limits, and usage. How many keys you can have depends on your plan; see <a href="#" id="docsToDashLink2">Plans &amp; Pricing</a>. You can revoke any key at any time.</p>

    <h2 class="doc-h2">Authentication</h2>
    <p class="doc-p">Pass your key in the <code>x-api-key</code> header on every request.</p>
    <pre>x-api-key: estv_your_key_here</pre>

    <h2 class="doc-h2">Endpoints</h2>
    <table>
      <tr><th>API</th><th>Request</th><th>Status</th></tr>
      ${docsEndpointRows()}
    </table>

    <h2 class="doc-h2">Downloaded files &amp; links</h2>
    <p class="doc-p">MP3, MP4, Facebook Downloader, Instagram Downloader, and TikTok Downloader don't hand back a raw source URL. Instead they return a <code>download_url</code> (or <code>hd_download_url</code> / <code>sd_download_url</code> for Facebook, or <code>image_urls</code> for TikTok photo posts) hosted on <code>esteamstv.devs.surf</code>, the same way the <a href="/developers/live-tv" target="_blank" rel="noopener">Live Tv Api</a>'s <code>embed_url</code> never exposes the real stream source. Each link is signed and expires after 6 hours; fetch a fresh one by calling the endpoint again.</p>

    <h2 class="doc-h2">MP3 Downloader</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/mp3?query=</code></p>
    <p class="doc-p">Search by song title or artist. Returns the best match's audio as a branded download link.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/mp3?query=your song here"</pre>
    <pre>{
  "title": "Song Title",
  "thumbnail": "https://...",
  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "expires_at": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">MP4 Downloader</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/mp4?query=</code></p>
    <p class="doc-p">Search by video title. Returns the best match's video (with audio) as a branded download link.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/mp4?query=your video here"</pre>
    <pre>{
  "title": "Video Title",
  "thumbnail": "https://...",
  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "expires_at": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">Facebook Downloader</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/facebook?url=</code></p>
    <p class="doc-p">Give it a public facebook.com or fb.watch video link. Returns HD and/or SD branded download links, whichever the video has.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/facebook?url=https://facebook.com/watch/?v=..."</pre>
    <pre>{
  "title": "Video Title",
  "hd_download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "sd_download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "expires_at": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">Instagram Downloader</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/instagram?url=</code></p>
    <p class="doc-p">Give it a public instagram.com post, reel, or IGTV link. Returns a branded download link for the video or image.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/instagram?url=https://www.instagram.com/reel/..."</pre>
    <pre>{
  "type": "video",
  "title": "Post Title",
  "caption": "...",
  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "expires_at": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">TikTok Downloader</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/tiktok?url=</code></p>
    <p class="doc-p">Give it a public tiktok.com video or photo-post link. Video posts return a no-watermark <code>download_url</code>; photo posts return an <code>image_urls</code> array instead.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/tiktok?url=https://www.tiktok.com/@user/video/..."</pre>
    <pre>{
  "type": "video",
  "title": "Post Title",
  "author": "username",
  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",
  "expires_at": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">AI</h2>
    <p class="doc-p"><span class="badge badge-post">POST</span> <code>/api/v1/dev/ai</code></p>
    <p class="doc-p">Send a prompt (4000 character limit), get a real AI response back.</p>
    <pre>curl -X POST -H "x-api-key: estv_your_key_here" -H "Content-Type: application/json" \\
  -d '{"prompt":"Give me 3 dinner ideas"}' \\
  "https://esteamstv.devs.surf/api/v1/dev/ai"</pre>
    <pre>{
  "response": "1. ...\n2. ...\n3. ..."
}</pre>

    <h2 class="doc-h2">AI Video Generation</h2>
    <p class="doc-p"><span class="badge badge-post">POST</span> <code>/api/v1/dev/videogen</code></p>
    <p class="doc-p">Send a text prompt (500 character limit), get back a link to a generated video. Experimental and slow &mdash; generation can take 30-120 seconds, so use a generous client timeout. Limited to 2 requests per hour per key.</p>
    <pre>curl -X POST -H "x-api-key: estv_your_key_here" -H "Content-Type: application/json" \\
  -d '{"prompt":"a cat surfing a wave"}' \\
  "https://esteamstv.devs.surf/api/v1/dev/videogen"</pre>
    <pre>{
  "video_url": "https://files.catbox.moe/xxxxx.mp4"
}</pre>

    <h2 class="doc-h2">OCR</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/ocr?url=</code></p>
    <p class="doc-p">Give it a direct image URL (jpeg, png, bmp, webp, or gif, up to 10MB) and get the text found in it back.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/ocr?url=https://example.com/image.png"</pre>
    <pre>{
  "text": "Whatever text was in the image",
  "confidence": 96
}</pre>

    <h2 class="doc-h2">Image Analysis</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/imgscan?url=</code></p>
    <p class="doc-p">Give it a direct image URL, get back a written description of what's in it.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/imgscan?url=https://example.com/image.png"</pre>
    <pre>{
  "description": "A golden retriever sitting in a park."
}</pre>

    <h2 class="doc-h2">QR Code</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/qrcode?text=</code></p>
    <p class="doc-p">Give it any text or link, get back a PNG image directly (not JSON). Optional <code>size</code> param, 100-1000px, defaults to 400.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/qrcode?text=https://esteamstv.devs.surf" \\
  --output qrcode.png</pre>

    <h2 class="doc-h2">URL Shortener</h2>
    <p class="doc-p"><span class="badge badge-post">POST</span> <code>/api/v1/dev/shorten</code></p>
    <p class="doc-p">Give it a URL, get back a short <code>esteamstv.devs.surf/s/</code> link that 302-redirects to it.</p>
    <pre>curl -X POST -H "x-api-key: estv_your_key_here" -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com/a/very/long/path"}' \\
  "https://esteamstv.devs.surf/api/v1/dev/shorten"</pre>
    <pre>{
  "short_url": "https://esteamstv.devs.surf/s/aB3xY9",
  "original_url": "https://example.com/a/very/long/path"
}</pre>

    <h2 class="doc-h2">Temp Mail</h2>
    <p class="doc-p">Three endpoints for a disposable inbox flow: create an inbox, list what's arrived, read a message. Handy for reading OTP/verification codes in a bot.</p>
    <p class="doc-p"><span class="badge badge-post">POST</span> <code>/api/v1/dev/tempmail/create</code></p>
    <pre>curl -X POST -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/tempmail/create"</pre>
    <pre>{
  "email": "a1b2c3d4e5@somedomain.tld",
  "password": "...",
  "token": "eyJhbGciOi..."
}</pre>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/tempmail/inbox?token=</code></p>
    <p class="doc-p">Poll this with the <code>token</code> from create to see what's arrived.</p>
    <pre>{
  "messages": [
    { "id": "abc123", "from": "noreply@example.com", "subject": "Your code", "intro": "Your code is...", "seen": false, "createdAt": "2026-08-05T20:00:00.000Z" }
  ]
}</pre>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/tempmail/message?token=&amp;id=</code></p>
    <p class="doc-p">Read the full body of one message by its <code>id</code> from the inbox list.</p>
    <pre>{
  "id": "abc123",
  "from": "noreply@example.com",
  "subject": "Your code",
  "text": "Your code is 482913.",
  "html": "...",
  "createdAt": "2026-08-05T20:00:00.000Z"
}</pre>

    <h2 class="doc-h2">Weather</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/weather?location=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/weather?location=Lagos"</pre>
    <pre>{
  "location": "Lagos, Lagos, Nigeria",
  "temperature_c": 29.5,
  "windspeed_kmh": 12,
  "condition": "Mainly clear",
  "observed_at": "2026-08-06T10:00"
}</pre>

    <h2 class="doc-h2">Lyrics</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/lyrics?artist=&amp;title=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/lyrics?artist=Alan Walker&title=Faded"</pre>
    <pre>{
  "artist": "Alan Walker",
  "title": "Faded",
  "lyrics": "You were the shadow to my light..."
}</pre>

    <h2 class="doc-h2">Bible</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/bible?reference=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/bible?reference=John 3:16"</pre>
    <pre>{
  "reference": "John 3:16",
  "text": "For God so loved the world...",
  "translation": "World English Bible"
}</pre>

    <h2 class="doc-h2">Quran</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/quran?reference=</code></p>
    <p class="doc-p">Reference is <code>surah:ayah</code>, e.g. <code>2:255</code> for Ayat al-Kursi.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/quran?reference=2:255"</pre>
    <pre>{
  "reference": "2:255",
  "text": "Allah - there is no deity except Him...",
  "surah": "Al-Baqarah",
  "numberInSurah": 255
}</pre>

    <h2 class="doc-h2">Tech News</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/technews?limit=</code></p>
    <p class="doc-p">Top stories, ranked by score. Optional <code>limit</code> param, 1-20, defaults to 10.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/technews?limit=3"</pre>
    <pre>{
  "stories": [
    { "title": "...", "url": "https://...", "score": 412, "author": "..." }
  ]
}</pre>

    <h2 class="doc-h2">Currency Exchange</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/currency?from=&amp;to=</code></p>
    <p class="doc-p">3-letter currency codes. Optional <code>amount</code> param, defaults to 1.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/currency?from=USD&to=NGN&amount=1"</pre>
    <pre>{
  "from": "USD",
  "to": "NGN",
  "amount": 1,
  "result": 1550.23,
  "date": "2026-08-05"
}</pre>

    <h2 class="doc-h2">Dictionary</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/dictionary?word=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/dictionary?word=hello"</pre>
    <pre>{
  "word": "hello",
  "phonetic": null,
  "meanings": [
    { "partOfSpeech": "noun", "definitions": ["An expression of greeting."] }
  ]
}</pre>

    <h2 class="doc-h2">IP Lookup</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/iplookup?ip=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/iplookup?ip=8.8.8.8"</pre>
    <pre>{
  "ip": "8.8.8.8",
  "city": "Mountain View",
  "region": "California",
  "country": "United States",
  "country_code": "US",
  "latitude": 37.4,
  "longitude": -122.08,
  "timezone": "America/Los_Angeles",
  "org": "GOOGLE"
}</pre>

    <h2 class="doc-h2">Country Info</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/country?name=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/country?name=Nigeria"</pre>
    <pre>{
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "subregion": "Western Africa",
  "population": 206139589,
  "flag": "https://flagcdn.com/w320/ng.png",
  "currencies": ["NGN"]
}</pre>

    <h2 class="doc-h2">Trivia</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/trivia?category=&amp;difficulty=</code></p>
    <p class="doc-p">Both params are optional. <code>difficulty</code> is <code>easy</code>, <code>medium</code>, or <code>hard</code>.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/trivia?difficulty=easy"</pre>
    <pre>{
  "category": "Science: Computers",
  "difficulty": "easy",
  "question": "What does 'HTTP' stand for?",
  "correct_answer": "HyperText Transfer Protocol",
  "incorrect_answers": ["...", "...", "..."]
}</pre>

    <h2 class="doc-h2">Joke</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/joke</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/joke"</pre>
    <pre>{
  "joke": "Chuck Norris can divide by zero.",
  "url": "https://api.chucknorris.io/jokes/abc123"
}</pre>

    <h2 class="doc-h2">Advice</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/advice</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/advice"</pre>
    <pre>{
  "advice": "Don't be afraid to ask questions."
}</pre>

    <h2 class="doc-h2">Cat Fact</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/catfact</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/catfact"</pre>
    <pre>{
  "fact": "Cats sleep for 70% of their lives."
}</pre>

    <h2 class="doc-h2">Public Holidays</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/holidays?year=&amp;country=</code></p>
    <p class="doc-p"><code>country</code> is a 2-letter country code, e.g. <code>NG</code> or <code>US</code>.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/holidays?year=2026&country=NG"</pre>
    <pre>{
  "holidays": [
    { "date": "2026-01-01", "name": "New Year's Day", "localName": "New Year's Day", "global": true }
  ]
}</pre>

    <h2 class="doc-h2">Movie Info</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/movie?query=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/movie?query=Inception"</pre>
    <pre>{
  "title": "Inception",
  "overview": "...",
  "releaseDate": "2010-07-15",
  "rating": 8.4,
  "genres": ["Action", "Science Fiction", "Adventure"],
  "runtimeMinutes": 148,
  "poster": "https://image.tmdb.org/t/p/w500/...jpg",
  "backdrop": "https://image.tmdb.org/t/p/w500/...jpg"
}</pre>

    <h2 class="doc-h2">Crypto Price</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/crypto?coin=</code></p>
    <p class="doc-p">Give it a coin name or symbol (e.g. <code>BTC</code>, <code>bitcoin</code>, <code>solana</code>). Returns the live USD and NGN price.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/crypto?coin=BTC"</pre>
    <pre>{
  "id": "bitcoin",
  "name": "Bitcoin",
  "symbol": "BTC",
  "priceUsd": 64000.12,
  "priceNgn": 99000000,
  "change24hPercent": 1.53,
  "thumbnail": "https://..."
}</pre>

    <h2 class="doc-h2">Wikipedia Summary</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/wikipedia?title=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/wikipedia?title=Lagos"</pre>
    <pre>{
  "title": "Lagos",
  "extract": "Lagos is the largest city in Nigeria...",
  "thumbnail": "https://...",
  "url": "https://en.wikipedia.org/wiki/Lagos"
}</pre>

    <h2 class="doc-h2">Sports Team</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/sportsteam?name=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/sportsteam?name=Arsenal"</pre>
    <pre>{
  "name": "Arsenal",
  "sport": "Soccer",
  "league": "English Premier League",
  "country": "England",
  "stadium": "Emirates Stadium",
  "founded": "1886",
  "description": "...",
  "badge": "https://...",
  "jersey": "https://...",
  "website": "www.arsenal.com"
}</pre>

    <h2 class="doc-h2">GitHub User</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/githubuser?username=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/githubuser?username=torvalds"</pre>
    <pre>{
  "login": "torvalds",
  "name": "Linus Torvalds",
  "avatar": "https://avatars.githubusercontent.com/u/1024025",
  "bio": null,
  "company": "Linux Foundation",
  "location": "Portland, OR",
  "blog": "",
  "public_repos": 8,
  "followers": 250000,
  "following": 0,
  "created_at": "2011-09-03T15:26:22Z"
}</pre>

    <h2 class="doc-h2">Dog Image</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/dogimage</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/dogimage"</pre>
    <pre>{
  "imageUrl": "https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg"
}</pre>

    <h2 class="doc-h2">Random Quote</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/quote</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/quote"</pre>
    <pre>{
  "quote": "The only way to do great work is to love what you do.",
  "author": "Steve Jobs"
}</pre>

    <h2 class="doc-h2">Minecraft Server Status</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/minecraft?address=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/minecraft?address=mc.hypixel.net"</pre>
    <pre>{
  "online": true,
  "hostname": "mc.hypixel.net",
  "ip": "...",
  "port": 25565,
  "version": "Requires MC 1.8 / 1.21",
  "playersOnline": 25000,
  "playersMax": 200000,
  "motd": "Hypixel Network..."
}</pre>

    <h2 class="doc-h2">NPM Package Info</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/npm?package=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/npm?package=express"</pre>
    <pre>{
  "name": "express",
  "version": "4.21.2",
  "description": "Fast, unopinionated, minimalist web framework",
  "license": "MIT",
  "homepage": "http://expressjs.com/",
  "author": "TJ Holowaychuk"
}</pre>

    <h2 class="doc-h2">YouTube Info</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/youtube?url=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/youtube?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"</pre>
    <pre>{
  "title": "Rick Astley - Never Gonna Give You Up",
  "author": "Rick Astley",
  "authorUrl": "https://www.youtube.com/@RickAstleyYT",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
}</pre>

    <h2 class="doc-h2">GitHub Repo</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/githubrepo?repo=</code></p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/githubrepo?repo=facebook/react"</pre>
    <pre>{
  "fullName": "facebook/react",
  "description": "The library for web and native user interfaces.",
  "stars": 230000,
  "forks": 47000,
  "openIssues": 900,
  "language": "JavaScript",
  "url": "https://github.com/facebook/react",
  "createdAt": "2013-05-24T16:15:54Z"
}</pre>

    <h2 class="doc-h2">Rate limits &amp; monthly usage</h2>
    <p class="doc-p">20 requests per minute per API key on each endpoint (15 for AI, 15 for Temp Mail, 2 per hour for AI Video Generation). On top of that, every account has a monthly allowance shared across <strong>all</strong> your Developer Api keys, separate from the Live Tv Api's own allowance. Requests past the monthly limit get a <code>429</code> until it resets the following month. Track it on your <a href="#" id="docsToDashLink3">API Dashboard</a>.</p>

    <h2 class="doc-h2">Errors</h2>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td>400</td><td>Missing or invalid parameter</td></tr>
      <tr><td>401</td><td>Missing, invalid, or revoked API key</td></tr>
      <tr><td>404</td><td>No results found for that search, or the download link expired</td></tr>
      <tr><td>413</td><td>Image too large (10MB limit)</td></tr>
      <tr><td>415</td><td>URL did not return a supported file type</td></tr>
      <tr><td>429</td><td>Per-minute rate limit hit, or the account's monthly request limit is reached</td></tr>
      <tr><td>502</td><td>Could not reach the given URL or source, try again shortly</td></tr>
    </table>

    <div class="note">This is an early version of the API. Endpoints and limits may change, nothing here is guaranteed stable yet.</div>

  </div>

</div>

<div class="page-overlay" id="planPayOverlay">
  <div class="overlay-card">
    <div class="overlay-step active" id="planPayStepIntro">
      <div class="overlay-title" id="planPayTitle">Upgrade plan</div>
      <div class="overlay-sub" id="planPaySub"></div>
      <div class="dcard-msg err" id="planPayMsg"></div>
      <button class="btn btn-primary" id="planPayBtn" type="button" style="width:100%;justify-content:center">Pay &amp; Upgrade</button>
      <button class="overlay-cancel" id="planPayCancel1" type="button">Cancel</button>
    </div>
    <div class="overlay-step" id="planPayStepProcessing">
      <div class="ch-loading">Confirming your payment…</div>
    </div>
    <div class="overlay-step" id="planPayStepSuccess">
      <div class="overlay-title">Plan upgraded</div>
      <div class="overlay-sub" id="planPaySuccessSub"></div>
      <button class="btn btn-primary" id="planPayCancel2" type="button" style="width:100%;justify-content:center">Done</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="revokeKeyOverlay">
  <div class="overlay-card">
    <div class="overlay-title">Revoke this API key?</div>
    <div class="overlay-sub">Anything using it will stop working <b>immediately</b>. This can't be undone.</div>
    <button class="btn btn-primary" id="revokeKeyConfirmBtn" type="button" style="width:100%;justify-content:center;background:linear-gradient(90deg,var(--red),#ff7a8d)">Revoke Key</button>
    <button class="overlay-cancel" id="revokeKeyCancelBtn" type="button">Cancel</button>
  </div>
</div>

<div class="page-overlay" id="noKeyOverlay">
  <div class="overlay-card">
    <div class="overlay-title">Generate an API key first</div>
    <div class="overlay-sub">You need at least one Developer Api key before you can test an endpoint.</div>
    <button class="btn btn-primary" id="noKeyGoBtn" type="button" style="width:100%;justify-content:center">Go to API Key</button>
    <button class="overlay-cancel" id="noKeyCancelBtn" type="button">Cancel</button>
  </div>
</div>

<div class="page-overlay" id="tryitOverlay">
  <div class="overlay-card" style="max-width:420px">
    <div class="overlay-title" id="tryitOverlayTitle">Try it</div>

    <div class="field">
      <label>Your API key</label>
      <input type="text" id="tryitKeyInput" placeholder="estv_… (pasted, never stored)" autocomplete="off">
    </div>

    <div class="field">
      <label id="tryitParamLabel">Image URL</label>
      <input type="text" id="tryitParamInput" placeholder="https://example.com/image.png">
    </div>

    <button class="btn btn-primary" id="tryitSendBtn" type="button" style="width:100%;justify-content:center;margin-bottom:4px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      Send test request
    </button>

    <div class="result-box" id="tryitResultBox" style="display:none">
      <div class="result-status" id="tryitResultStatus"></div>
      <pre id="tryitResultBody"></pre>
    </div>

    <div class="curl-label"><span>Equivalent curl</span><button class="btn btn-sm" id="tryitCopyCurl" type="button">Copy</button></div>
    <pre id="tryitCurl"></pre>

    <button class="overlay-cancel" id="tryitCancelBtn" type="button">Cancel</button>
  </div>
</div>
${musicPlayerHtml()}

<script nonce="__CSP_NONCE__">
(function(){

  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function fmtDate(ms){ if(!ms) return 'never'; var d = new Date(ms); return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }); }
  async function getJSON(url, headers){
    var res = await fetch(url, { headers: headers || {} });
    var data = await res.json().catch(function(){ return {}; });
    return { ok: res.ok, status: res.status, data: data };
  }

  var lastRevealedKey = '';
  function revealBoxHtml(key){
    if(!key) return '';
    return '<div class="reveal-box"><div class="reveal-label">Copy this now. You won\\'t be able to see it again.</div>' +
      '<div class="reveal-row"><code>' + esc(key) + '</code><button type="button" class="btn btn-sm" id="copyRevealBtn">Copy</button></div></div>';
  }

  function usageLevelClass(pct){
    if(pct >= 90) return 'lvl-hot';
    if(pct >= 65) return 'lvl-warn';
    return '';
  }

  var PAYSTACK_PUBLIC_KEY = ${JSON.stringify(cfg.paystackPublicKey || "")};

  var PLAN_DEFS = [
    { key: 'free', name: 'Free', priceNgn: 0, apiKeys: 1, requestsPerSecond: 3, monthlyRequests: 100, noAds: false, customAdsLink: false, note: 'Default plan' },
    { key: 'starter', name: 'Starter', priceNgn: 0, apiKeys: 3, requestsPerSecond: 10, monthlyRequests: 200, noAds: false, customAdsLink: false, note: 'Auto with account verification' },
    { key: 'standard', name: 'Standard', priceNgn: 3000, apiKeys: 5, requestsPerSecond: 20, monthlyRequests: 350, noAds: false, customAdsLink: false, note: '30 days' },
    { key: 'pro', name: 'Pro', priceNgn: 5000, apiKeys: 10, requestsPerSecond: 35, monthlyRequests: 500, noAds: true, customAdsLink: false, note: '30 days', highlight: true },
    { key: 'max', name: 'Max', priceNgn: 10000, apiKeys: 15, requestsPerSecond: 50, monthlyRequests: 1000, noAds: true, customAdsLink: true, note: '30 days' },
  ];

  function fmtNgn(n){ return '₦' + n.toLocaleString('en-NG'); }

  function planFeatureRow(included, label){
    return '<div class="plan-feature' + (included ? '' : ' off') + '">' +
      (included
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>'
      ) + label + '</div>';
  }

  var currentPlanKey = null;
  var currentDevApiCustomAdsUrl = '';
  var loggedInForPlans = false;

  function renderPlans(planData, customAdsUrl, loggedIn){
    var grid = document.getElementById('plansGrid');
    currentPlanKey = planData ? planData.key : 'free';
    currentDevApiCustomAdsUrl = customAdsUrl || '';
    loggedInForPlans = !!loggedIn;

    grid.innerHTML = PLAN_DEFS.map(function(p){
      var isCurrent = loggedIn && p.key === currentPlanKey;
      var cls = 'plan-card' + (isCurrent ? ' current' : '') + (p.highlight ? ' highlight' : '');
      var priceHtml = p.priceNgn === 0
        ? (p.key === 'starter' ? '<div class="plan-price">Free<span> · with verification</span></div>' : '<div class="plan-price">Free</div>')
        : '<div class="plan-price">' + fmtNgn(p.priceNgn) + '<span> / 30 days</span></div>';

      var cta;
      if(!loggedIn){
        cta = '<a class="btn btn-primary plan-cta" href="/login?next=%2Fdevelopers%2Fapi">Log in to upgrade</a>';
      } else if(isCurrent){
        cta = '<div class="plan-current-badge">Current plan</div>';
      } else if(p.key === 'free'){
        cta = '';
      } else if(p.key === 'starter'){
        cta = '<a class="btn plan-cta" href="/account" target="_blank" rel="noopener">Get Verified</a>';
      } else {
        cta = '<button class="btn btn-primary plan-cta" type="button" data-upgrade="' + p.key + '">Upgrade</button>';
      }

      return '<div class="' + cls + '">' +
        '<div class="plan-name">' + p.name + '</div>' +
        priceHtml +
        '<div class="plan-note">' + (isCurrent ? '' : p.note) + '</div>' +
        '<div class="plan-features">' +
          planFeatureRow(true, p.apiKeys + ' API key' + (p.apiKeys === 1 ? '' : 's')) +
          planFeatureRow(true, p.requestsPerSecond + ' req/sec') +
          planFeatureRow(true, p.monthlyRequests + ' req/month') +
          planFeatureRow(p.noAds, 'No ads') +
          planFeatureRow(p.customAdsLink, 'Custom ads link') +
        '</div>' +
        cta +
      '</div>';
    }).join('');

    grid.querySelectorAll('[data-upgrade]').forEach(function(btn){
      btn.addEventListener('click', function(){ openPlanPay(btn.getAttribute('data-upgrade')); });
    });

    var customWrap = document.getElementById('customAdsWrap');
    var planDef = PLAN_DEFS.filter(function(p){ return p.key === currentPlanKey; })[0];
    if(loggedIn && planDef && planDef.customAdsLink){
      customWrap.style.display = 'block';
      document.getElementById('customAdsInput').value = currentDevApiCustomAdsUrl;
    } else {
      customWrap.style.display = 'none';
    }
  }

  var planPayOverlay = document.getElementById('planPayOverlay');
  function showPlanPayStep(id){
    planPayOverlay.querySelectorAll('.overlay-step').forEach(function(el){ el.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }
  function openPlanPay(planKey){
    var matches = PLAN_DEFS.filter(function(p){ return p.key === planKey; });
    var def = matches[0];
    if(!def) return;
    document.getElementById('planPayTitle').textContent = 'Upgrade to ' + def.name;
    document.getElementById('planPaySub').textContent = fmtNgn(def.priceNgn) + ' for 30 days: ' + def.apiKeys + ' API keys, ' + def.requestsPerSecond + ' req/sec, ' + def.monthlyRequests + ' req/month' + (def.noAds ? ', no ads' : '') + (def.customAdsLink ? ', custom ads link' : '') + '.';
    var payBtn = document.getElementById('planPayBtn');
    payBtn.setAttribute('data-plan', planKey);
    payBtn.disabled = false;
    payBtn.textContent = 'Pay & Upgrade';
    document.getElementById('planPayMsg').textContent = '';
    showPlanPayStep('planPayStepIntro');
    planPayOverlay.classList.add('show');
  }
  document.getElementById('planPayCancel1').addEventListener('click', function(){ planPayOverlay.classList.remove('show'); });
  document.getElementById('planPayCancel2').addEventListener('click', function(){ planPayOverlay.classList.remove('show'); loadKeys(); });
  planPayOverlay.addEventListener('click', function(e){ if(e.target === planPayOverlay) planPayOverlay.classList.remove('show'); });

  document.getElementById('planPayBtn').addEventListener('click', function(){
    var btn = this;
    var plan = btn.getAttribute('data-plan');
    var msg = document.getElementById('planPayMsg');
    msg.textContent = '';
    if(!PAYSTACK_PUBLIC_KEY || typeof PaystackPop === 'undefined'){
      msg.textContent = 'Payments are temporarily unavailable. Please try again later.';
      return;
    }
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Starting…';
    fetch('/api/devplan/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan }) })
      .then(function(r){ return r.json().then(function(data){ return { ok: r.ok, data: data }; }); })
      .then(function(res){
        btn.disabled = false;
        btn.textContent = 'Pay & Upgrade';
        if(!res.ok){ msg.textContent = res.data.error || 'Could not start payment.'; return; }
        var handler = PaystackPop.setup({
          key: res.data.publicKey,
          email: res.data.email,
          amount: res.data.amountKobo,
          ref: res.data.reference,
          currency: 'NGN',
          onClose: function(){},
          callback: function(response){
            showPlanPayStep('planPayStepProcessing');
            confirmPlanPayment(response.reference);
          },
        });
        handler.openIframe();
      })
      .catch(function(){
        btn.disabled = false;
        btn.textContent = 'Pay & Upgrade';
        msg.textContent = 'Could not start payment.';
      });
  });

  function confirmPlanPayment(reference){
    fetch('/api/devplan/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: reference }) })
      .then(function(r){ return r.json().then(function(data){ return { ok: r.ok, data: data }; }); })
      .then(function(res){
        if(!res.ok){
          showPlanPayStep('planPayStepIntro');
          document.getElementById('planPayMsg').textContent = res.data.error || 'Could not confirm payment.';
          return;
        }
        var matches = PLAN_DEFS.filter(function(p){ return p.key === res.data.plan; });
        var def = matches[0];
        document.getElementById('planPaySuccessSub').textContent = 'You are now on the ' + (def ? def.name : res.data.plan) + ' plan.';
        showPlanPayStep('planPayStepSuccess');
      })
      .catch(function(){
        showPlanPayStep('planPayStepIntro');
        document.getElementById('planPayMsg').textContent = 'Could not confirm payment.';
      });
  }

  document.getElementById('customAdsSaveBtn').addEventListener('click', function(){
    var btn = this;
    var input = document.getElementById('customAdsInput');
    var msg = document.getElementById('customAdsMsg');
    var value = input.value.trim();
    if (!value) {
      msg.textContent = 'Enter a link first.';
      msg.className = 'dcard-msg err';
      input.focus();
      return;
    }
    btn.disabled = true;
    var originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span>Saving…';
    fetch('/api/devplan/custom-ads-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: value }) })
      .then(function(r){ return r.json().then(function(data){ return { ok: r.ok, data: data }; }); })
      .then(function(res){
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        if(!res.ok){ msg.textContent = res.data.error || 'Could not save that link.'; msg.className = 'dcard-msg err'; return; }
        msg.textContent = 'Saved.';
        msg.className = 'dcard-msg ok';
      })
      .catch(function(){
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        msg.textContent = 'Could not save that link.';
        msg.className = 'dcard-msg err';
      });
  });

  var pendingRevokeBtn = null;
  var revokeKeyOverlay = document.getElementById('revokeKeyOverlay');
  document.getElementById('revokeKeyCancelBtn').addEventListener('click', function(){
    pendingRevokeBtn = null;
    revokeKeyOverlay.classList.remove('show');
  });
  document.getElementById('revokeKeyConfirmBtn').addEventListener('click', function(){
    var confirmBtn = this;
    var btn = pendingRevokeBtn;
    if(!btn) return;
    var originalHtml = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-spinner"></span> Revoking…';
    fetch('/api/devapi/keys/' + encodeURIComponent(btn.getAttribute('data-revoke')), { method: 'DELETE' })
      .then(function(){
        pendingRevokeBtn = null;
        revokeKeyOverlay.classList.remove('show');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHtml;
        loadKeys();
      })
      .catch(function(){
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHtml;
      });
  });

  var keyCardBody = document.getElementById('keyCardBody');
  var devApiKeyCount = 0;

  function renderLoggedOutKeyCard(){
    devApiKeyCount = 0;
    keyCardBody.innerHTML =
      '<div class="empty-state">Log in to create and manage an API key for your account.</div>' +
      '<a class="btn btn-primary" href="/login?next=%2Fdevelopers%2Fapi">Log in</a>';
  }

  function renderKeys(keys, usage, plan){
    devApiKeyCount = keys.length;
    var html = '';
    var keyLimit = plan ? plan.apiKeys : 1;
    var expiresPart = plan && plan.expiresAt ? ' &middot; expires ' + fmtDate(plan.expiresAt) : '';

    if(usage && usage.monthlyLimit == null){
      html += '<div class="usage-wrap" style="margin-top:0;margin-bottom:16px">' +
        '<div class="usage-top"><span class="usage-label">Account usage this month</span><span class="usage-count">' + usage.requestsThisMonth + ' / Unlimited</span></div>' +
      '</div>';
    } else if(usage){
      var pct = usage.monthlyLimit ? Math.min(100, Math.round((usage.requestsThisMonth / usage.monthlyLimit) * 100)) : 0;
      html += '<div class="usage-wrap" style="margin-top:0;margin-bottom:16px">' +
        '<div class="usage-top"><span class="usage-label">Account usage this month</span><span class="usage-count">' + usage.requestsThisMonth + ' / ' + usage.monthlyLimit + '</span></div>' +
        '<div class="usage-track"><div class="usage-fill ' + usageLevelClass(pct) + '" style="width:0%" data-pct="' + pct + '"></div></div>' +
        (pct >= 100 ? '<div class="dcard-msg err" style="margin-top:6px">Monthly limit reached, requests will fail until it resets next month.</div>' : '') +
      '</div>';
    }

    html += '<div class="field" style="margin-top:0;margin-bottom:16px">' +
      '<label>Redeem Bonus Code</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input type="text" id="bonusRedeemInput" placeholder="Enter code" style="flex:1" maxlength="16">' +
        '<button class="btn" id="bonusRedeemBtn" type="button" style="flex-shrink:0">Redeem</button>' +
      '</div>' +
      '<div class="dcard-msg" id="bonusRedeemMsg"></div>' +
    '</div>';

    if(!keys.length){
      html += '<div class="empty-state" id="noKeysMsg">You don\\'t have an API key yet. Create one to start making requests.</div>';
    } else {
      keys.forEach(function(k){
        html += '<div class="key-row">' +
          '<span class="key-dot"></span>' +
          '<div class="key-info">' +
            '<div class="key-label">' + esc(k.label) + '</div>' +
            '<div class="key-meta">estv_&bull;&bull;&bull;&bull;' + esc(k.last4) + ' &middot; created ' + fmtDate(k.createdAt) + expiresPart + ' &middot; last used ' + fmtDate(k.lastUsedAt) + '</div>' +
          '</div>' +
          '<div class="key-actions"><button type="button" class="icon-btn" data-revoke="' + k.id + '" title="Revoke"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg></button></div>' +
        '</div>';
      });
    }
    var atMax = keys.length >= keyLimit;
    html += '<div class="field" style="margin-top:12px' + (atMax ? ';display:none' : '') + '" id="createKeyField">' +
      '<label>Label a new key</label>' +
      '<input type="text" id="newKeyLabel" placeholder="e.g. My Discord bot" maxlength="60">' +
    '</div>' +
    '<button class="btn btn-primary" id="createKeyBtn" type="button" disabled style="' + (atMax ? 'display:none' : '') + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Create API Key' +
    '</button>' +
    (atMax ? '<div class="empty-state">Maximum of ' + keyLimit + ' key' + (keyLimit === 1 ? '' : 's') + ' reached for your Developer Api plan. Revoke one to create a new key.</div>' : '') +
    '<div id="revealBoxWrap">' + revealBoxHtml(lastRevealedKey) + '</div>' +
    '<div class="dcard-msg" id="keyMsg"></div>';

    keyCardBody.innerHTML = html;

    var copyRevealBtn = document.getElementById('copyRevealBtn');
    if(copyRevealBtn){
      copyRevealBtn.addEventListener('click', function(){
        navigator.clipboard.writeText(lastRevealedKey).catch(function(){});
        this.textContent = 'Copied!';
      });
    }

    requestAnimationFrame(function(){
      keyCardBody.querySelectorAll('.usage-fill').forEach(function(bar){
        bar.style.width = bar.getAttribute('data-pct') + '%';
      });
    });

    var bonusRedeemBtn = document.getElementById('bonusRedeemBtn');
    var bonusRedeemInput = document.getElementById('bonusRedeemInput');
    if(bonusRedeemBtn && bonusRedeemInput){
      bonusRedeemBtn.addEventListener('click', function(){
        var code = bonusRedeemInput.value.trim();
        var msg = document.getElementById('bonusRedeemMsg');
        if(!code){
          msg.className = 'dcard-msg err';
          msg.textContent = 'Enter a bonus code first.';
          bonusRedeemInput.focus();
          return;
        }
        var originalHtml = bonusRedeemBtn.innerHTML;
        bonusRedeemBtn.disabled = true;
        bonusRedeemBtn.innerHTML = '<span class="btn-spinner"></span> Redeeming…';
        fetch('/api/devapi/bonus-redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
          .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Could not redeem that code.'); return d; }); })
          .then(function(d){
            loadKeys();
            requestAnimationFrame(function(){
              var newMsg = document.getElementById('bonusRedeemMsg');
              if(newMsg){ newMsg.className = 'dcard-msg ok'; newMsg.textContent = '+' + d.amount + ' requests added to your monthly limit.'; }
            });
          })
          .catch(function(err){
            msg.className = 'dcard-msg err'; msg.textContent = err.message;
            bonusRedeemBtn.disabled = false; bonusRedeemBtn.innerHTML = originalHtml;
          });
      });
    }

    keyCardBody.querySelectorAll('[data-revoke]').forEach(function(btn){
      btn.addEventListener('click', function(){
        pendingRevokeBtn = btn;
        document.getElementById('revokeKeyOverlay').classList.add('show');
      });
    });

    var createBtn = document.getElementById('createKeyBtn');
    var newKeyLabelInput = document.getElementById('newKeyLabel');
    if(createBtn && newKeyLabelInput){
      newKeyLabelInput.addEventListener('input', function(){
        createBtn.disabled = !newKeyLabelInput.value.trim();
      });
      createBtn.addEventListener('click', function(){
        var label = newKeyLabelInput.value.trim();
        var msg = document.getElementById('keyMsg');
        if(!label){
          msg.className = 'dcard-msg err';
          msg.textContent = 'Give the key a name first.';
          newKeyLabelInput.focus();
          return;
        }
        var originalHtml = createBtn.innerHTML;
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="btn-spinner"></span> Creating…';
        fetch('/api/devapi/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label }) })
          .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Could not create key.'); return d; }); })
          .then(function(d){
            lastRevealedKey = d.key;
            loadKeys();
          })
          .catch(function(err){
            msg.className = 'dcard-msg err'; msg.textContent = err.message;
            createBtn.disabled = false; createBtn.innerHTML = originalHtml;
          });
      });
    }
  }

  function loadKeys(){
    getJSON('/api/devapi/keys').then(function(r){
      if(!r.ok){ renderLoggedOutKeyCard(); renderPlans(null, null, false); return; }
      renderKeys(r.data.keys || [], r.data.usage || null, r.data.plan || null);
      renderPlans(r.data.plan || null, r.data.devApiCustomAdsUrl || null, true);
    }).catch(function(){ renderLoggedOutKeyCard(); renderPlans(null, null, false); });
  }

  loadKeys();

  var searchInput = document.getElementById('apiSearchInput');
  var categorySections = document.querySelectorAll('[data-category]');
  var noResults = document.getElementById('noResults');
  searchInput.addEventListener('input', function(){
    var q = searchInput.value.trim().toLowerCase();
    var anyVisible = false;
    categorySections.forEach(function(section){
      var cards = section.querySelectorAll('.feature-card');
      var sectionHasMatch = false;
      cards.forEach(function(card){
        var match = !q || card.getAttribute('data-search').indexOf(q) !== -1;
        card.classList.toggle('hide', !match);
        if(match) sectionHasMatch = true;
      });
      section.style.display = sectionHasMatch ? '' : 'none';
      if(sectionHasMatch) anyVisible = true;
    });
    noResults.classList.toggle('show', !anyVisible);
  });

  (function animateTotalCount(){
    var el = document.getElementById('browseTotalCount');
    if(!el) return;
    var target = ${FEATURES.length};
    var start = null;
    var duration = 1100;
    function tick(ts){
      if(start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if(progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  })();

  var TRYIT_ENDPOINTS = {
    ocr: { title: 'Try it — OCR', method: 'GET', path: '/api/v1/dev/ocr', param: 'url', label: 'Image URL', placeholder: 'https://example.com/image.png' },
    mp3: { title: 'Try it — MP3 Downloader', method: 'GET', path: '/api/v1/dev/mp3', param: 'query', label: 'Search', placeholder: 'Song title or artist' },
    mp4: { title: 'Try it — MP4 Downloader', method: 'GET', path: '/api/v1/dev/mp4', param: 'query', label: 'Search', placeholder: 'Video title' },
    facebook: { title: 'Try it — Facebook Downloader', method: 'GET', path: '/api/v1/dev/facebook', param: 'url', label: 'Facebook URL', placeholder: 'https://facebook.com/watch/?v=...' },
    instagram: { title: 'Try it — Instagram Downloader', method: 'GET', path: '/api/v1/dev/instagram', param: 'url', label: 'Instagram post/reel URL', placeholder: 'https://www.instagram.com/reel/...' },
    tiktok: { title: 'Try it — TikTok Downloader', method: 'GET', path: '/api/v1/dev/tiktok', param: 'url', label: 'TikTok URL', placeholder: 'https://www.tiktok.com/@user/video/...' },
    ai: { title: 'Try it — AI', method: 'POST', path: '/api/v1/dev/ai', param: 'prompt', label: 'Prompt', placeholder: 'Ask anything…', body: true },
    qrcode: { title: 'Try it — QR Code', method: 'GET', path: '/api/v1/dev/qrcode', param: 'text', label: 'Text or link', placeholder: 'https://esteamstv.devs.surf', isImage: true },
    shorten: { title: 'Try it — URL Shortener', method: 'POST', path: '/api/v1/dev/shorten', param: 'url', label: 'URL to shorten', placeholder: 'https://example.com/a/very/long/path', body: true },
    weather: { title: 'Try it — Weather', method: 'GET', path: '/api/v1/dev/weather', param: 'location', label: 'City', placeholder: 'Lagos' },
    lyrics: { title: 'Try it — Lyrics', method: 'GET', path: '/api/v1/dev/lyrics', label: 'Artist - Title', placeholder: 'Alan Walker - Faded', parts: ['artist', 'title'], splitOn: ' - ' },
    bible: { title: 'Try it — Bible', method: 'GET', path: '/api/v1/dev/bible', param: 'reference', label: 'Reference', placeholder: 'John 3:16' },
    quran: { title: 'Try it — Quran', method: 'GET', path: '/api/v1/dev/quran', param: 'reference', label: 'Reference (surah:ayah)', placeholder: '2:255' },
    technews: { title: 'Try it — Tech News', method: 'GET', path: '/api/v1/dev/technews', param: 'limit', label: 'How many (1-20)', placeholder: '5' },
    imgscan: { title: 'Try it — Image Analysis', method: 'GET', path: '/api/v1/dev/imgscan', param: 'url', label: 'Image URL', placeholder: 'https://example.com/image.png' },
    currency: { title: 'Try it — Currency Exchange', method: 'GET', path: '/api/v1/dev/currency', label: 'From currency - To currency (e.g. USD - NGN)', placeholder: 'USD - NGN', parts: ['from', 'to'], splitOn: ' - ' },
    dictionary: { title: 'Try it — Dictionary', method: 'GET', path: '/api/v1/dev/dictionary', param: 'word', label: 'Word', placeholder: 'hello' },
    iplookup: { title: 'Try it — IP Lookup', method: 'GET', path: '/api/v1/dev/iplookup', param: 'ip', label: 'IP address', placeholder: '8.8.8.8' },
    country: { title: 'Try it — Country Info', method: 'GET', path: '/api/v1/dev/country', param: 'name', label: 'Country name', placeholder: 'Nigeria' },
    trivia: { title: 'Try it — Trivia', method: 'GET', path: '/api/v1/dev/trivia', param: 'difficulty', label: 'Difficulty (optional)', placeholder: 'easy', optional: true },
    joke: { title: 'Try it — Joke', method: 'GET', path: '/api/v1/dev/joke', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true },
    advice: { title: 'Try it — Advice', method: 'GET', path: '/api/v1/dev/advice', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true },
    catfact: { title: 'Try it — Cat Fact', method: 'GET', path: '/api/v1/dev/catfact', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true },
    holidays: { title: 'Try it — Public Holidays', method: 'GET', path: '/api/v1/dev/holidays', label: 'Year - Country code', placeholder: '2026 - NG', parts: ['year', 'country'], splitOn: ' - ' },
    githubuser: { title: 'Try it — GitHub User', method: 'GET', path: '/api/v1/dev/githubuser', param: 'username', label: 'GitHub username', placeholder: 'torvalds' },
    dogimage: { title: 'Try it — Dog Image', method: 'GET', path: '/api/v1/dev/dogimage', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true },
    quote: { title: 'Try it — Random Quote', method: 'GET', path: '/api/v1/dev/quote', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true },
    minecraft: { title: 'Try it — Minecraft Server Status', method: 'GET', path: '/api/v1/dev/minecraft', param: 'address', label: 'Server address', placeholder: 'mc.hypixel.net' },
    npm: { title: 'Try it — NPM Package Info', method: 'GET', path: '/api/v1/dev/npm', param: 'package', label: 'Package name', placeholder: 'express' },
    youtube: { title: 'Try it — YouTube Info', method: 'GET', path: '/api/v1/dev/youtube', param: 'url', label: 'YouTube URL', placeholder: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    githubrepo: { title: 'Try it — GitHub Repo', method: 'GET', path: '/api/v1/dev/githubrepo', param: 'repo', label: 'owner/repo', placeholder: 'facebook/react' },
    movie: { title: 'Try it — Movie Info', method: 'GET', path: '/api/v1/dev/movie', param: 'query', label: 'Movie title', placeholder: 'Inception' },
    sportsteam: { title: 'Try it — Sports Team', method: 'GET', path: '/api/v1/dev/sportsteam', param: 'name', label: 'Team name', placeholder: 'Arsenal' },
    crypto: { title: 'Try it — Crypto Price', method: 'GET', path: '/api/v1/dev/crypto', param: 'coin', label: 'Coin name or symbol', placeholder: 'BTC' },
    wikipedia: { title: 'Try it — Wikipedia Summary', method: 'GET', path: '/api/v1/dev/wikipedia', param: 'title', label: 'Article title', placeholder: 'Lagos' },
    tempmail: { title: 'Try it — Temp Mail', method: 'POST', path: '/api/v1/dev/tempmail/create', param: 'note', label: 'No input needed', placeholder: '(optional)', optional: true, body: true },
    videogen: { title: 'Try it — AI Video Generation', method: 'POST', path: '/api/v1/dev/videogen', param: 'prompt', label: 'Prompt', placeholder: 'a cat surfing a wave', body: true },
  };

  function buildQueryParams(ep, val){
    if(ep.parts){
      var pieces = val.split(ep.splitOn);
      var out = {};
      ep.parts.forEach(function(name, i){ out[name] = (pieces[i] || '').trim(); });
      return out;
    }
    var single = {};
    single[ep.param] = val;
    return single;
  }

  var tryitEndpoint = 'ocr';
  var tryitOverlay = document.getElementById('tryitOverlay');
  var tryitOverlayTitle = document.getElementById('tryitOverlayTitle');
  var tryitKeyInput = document.getElementById('tryitKeyInput');
  var tryitParamLabel = document.getElementById('tryitParamLabel');
  var tryitParamInput = document.getElementById('tryitParamInput');
  var tryitCurlEl = document.getElementById('tryitCurl');
  var tryitResultBox = document.getElementById('tryitResultBox');
  var tryitResultStatus = document.getElementById('tryitResultStatus');
  var tryitResultBody = document.getElementById('tryitResultBody');

  function openTryitOverlay(name){
    tryitEndpoint = name;
    var ep = TRYIT_ENDPOINTS[name];
    tryitOverlayTitle.textContent = ep.title;
    tryitParamLabel.textContent = ep.label;
    tryitParamInput.placeholder = ep.placeholder;
    tryitParamInput.value = '';
    tryitResultBox.style.display = 'none';
    updateTryitCurl();
    tryitOverlay.classList.add('show');
  }

  var noKeyOverlay = document.getElementById('noKeyOverlay');
  document.querySelectorAll('.tryit-open-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(devApiKeyCount < 1){ noKeyOverlay.classList.add('show'); return; }
      openTryitOverlay(btn.getAttribute('data-endpoint'));
    });
  });
  document.getElementById('noKeyCancelBtn').addEventListener('click', function(){
    noKeyOverlay.classList.remove('show');
  });
  document.getElementById('noKeyGoBtn').addEventListener('click', function(){
    noKeyOverlay.classList.remove('show');
    var target = document.getElementById('keyCard');
    if(target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('tryitCancelBtn').addEventListener('click', function(){
    tryitOverlay.classList.remove('show');
  });

  function updateTryitCurl(){
    var origin = window.location.origin;
    var ep = TRYIT_ENDPOINTS[tryitEndpoint];
    var key = tryitKeyInput.value.trim() || 'estv_your_key_here';
    var val = tryitParamInput.value.trim() || ep.placeholder;
    if(ep.body){
      var bodyObj = {}; bodyObj[ep.param] = val;
      var bodyJson = JSON.stringify(bodyObj);
      tryitCurlEl.textContent = 'curl -X POST -H "x-api-key: ' + key + '" -H "Content-Type: application/json" \\\\\\n  -d \\'' + bodyJson + '\\' \\\\\\n  "' + origin + ep.path + '"';
    } else {
      var params = buildQueryParams(ep, val);
      var qs = Object.keys(params).map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
      tryitCurlEl.textContent = 'curl -H "x-api-key: ' + key + '" \\\\\\n  "' + origin + ep.path + '?' + qs + '"';
    }
  }
  tryitKeyInput.addEventListener('input', updateTryitCurl);
  tryitParamInput.addEventListener('input', updateTryitCurl);

  document.getElementById('tryitCopyCurl').addEventListener('click', function(){
    navigator.clipboard.writeText(tryitCurlEl.textContent).catch(function(){});
    this.textContent = 'Copied!';
    var self = this;
    setTimeout(function(){ self.textContent = 'Copy'; }, 1400);
  });

  document.getElementById('tryitSendBtn').addEventListener('click', function(){
    var btn = this;
    var ep = TRYIT_ENDPOINTS[tryitEndpoint];
    var key = tryitKeyInput.value.trim();
    var val = tryitParamInput.value.trim();
    if(!key){
      tryitResultBox.style.display = 'block';
      tryitResultStatus.innerHTML = '<span class="status-pill bad">-</span>';
      tryitResultBody.textContent = 'Paste your API key above first.';
      return;
    }
    if(!val && !ep.optional){
      tryitResultBox.style.display = 'block';
      tryitResultStatus.innerHTML = '<span class="status-pill bad">-</span>';
      tryitResultBody.textContent = 'Fill in ' + ep.label + ' first.';
      return;
    }
    var url, opts = { headers: { 'x-api-key': key } };
    if(ep.body){
      url = ep.path;
      opts.method = 'POST';
      opts.headers['Content-Type'] = 'application/json';
      var b = {}; b[ep.param] = val;
      opts.body = JSON.stringify(b);
    } else {
      var params = buildQueryParams(ep, val);
      var qs = Object.keys(params).map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
      url = ep.path + '?' + qs;
    }
    var start = performance.now();
    var originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Sending…';
    fetch(url, opts).then(function(res){
      var ms = Math.round(performance.now() - start);
      var statusHtml = '<span class="status-pill ' + (res.ok ? 'ok' : 'bad') + '">' + res.status + '</span><span class="result-time">' + ms + 'ms</span>';
      if(ep.isImage && res.ok){
        return res.blob().then(function(blob){
          var objUrl = URL.createObjectURL(blob);
          tryitResultBox.style.display = 'block';
          tryitResultStatus.innerHTML = statusHtml;
          tryitResultBody.innerHTML = '<img src="' + objUrl + '" style="max-width:100%;border-radius:8px;display:block">';
        });
      }
      return res.json().catch(function(){ return {}; }).then(function(data){
        tryitResultBox.style.display = 'block';
        tryitResultStatus.innerHTML = statusHtml;
        tryitResultBody.textContent = JSON.stringify(data, null, 2);
      });
    }).catch(function(){
      tryitResultBox.style.display = 'block';
      tryitResultStatus.innerHTML = '<span class="status-pill bad">-</span>';
      tryitResultBody.textContent = 'Request failed. Check your connection and try again.';
    }).finally(function(){ btn.disabled = false; btn.innerHTML = originalHtml; });
  });

  var viewDash = document.getElementById('view-dash');
  var viewDocs = document.getElementById('view-docs');
  function showDocs(){ viewDash.style.display = 'none'; viewDocs.style.display = 'block'; window.scrollTo(0,0); }
  function showDash(){ viewDocs.style.display = 'none'; viewDash.style.display = 'block'; window.scrollTo(0,0); }
  document.getElementById('toDocsBtn').addEventListener('click', showDocs);
  document.getElementById('backToDashBtn').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink1').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink2').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink3').addEventListener('click', function(e){ e.preventDefault(); showDash(); });

})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
