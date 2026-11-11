const BASE = "https://esteamstv.devs.surf";

const ICON = {
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  spotify: '<circle cx="12" cy="12" r="9"/><path d="M8 10c3-1 6-.5 8 1M8.5 13c2.5-.7 5-.3 7 .8M9 16c2-.5 4-.2 5.5.6"/>',
  soundcloud: '<path d="M3 15v-3M6 17V9M9 18V7M12 18V6a6 6 0 018 5 3.5 3.5 0 011 7H12"/>',
  pinterest: '<circle cx="12" cy="12" r="9"/><path d="M11 8c3-1 5 1 4 4s-3 3-4 1l-1 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  video: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z"/>',
  tiktok: '<path d="M9 12a4 4 0 104 4V4a5 5 0 005 5"/>',
  github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 00-1-2.6c3.3-.4 6.9-1.6 6.9-7.4A5.8 5.8 0 0020 5.8 5.4 5.4 0 0019.9 2s-1.3-.4-4.1 1.5a14.4 14.4 0 00-7.6 0C5.4 1.6 4.1 2 4.1 2A5.4 5.4 0 004 5.8 5.8 5.8 0 002.5 9.9c0 5.8 3.6 7 6.9 7.4a3.4 3.4 0 00-1 2.6V22"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 5h-5L8 10z"/>',
  cloud: '<path d="M18 10a6 6 0 00-11.5-1.5A4.5 4.5 0 007 18h11a4 4 0 000-8z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  speaker: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14"/>',
  lines: '<path d="M4 6h16M4 12h10M4 18h14"/>',
};

const SPECS = [
  {
    key: "ytdl", title: "YouTube Downloader", category: "Downloaders", icon: ICON.download,
    desc: "Download a YouTube link as MP3 or MP4 in the quality you choose.",
    endpoint: "GET /api/v1/dev/ytdl?url=&format=",
    example: "GET /api/v1/dev/ytdl?url=https://youtu.be/...&format=mp3",
    tryit: { param: "url", label: "YouTube URL | format (mp3, mp4, 360, 720, 1080)", placeholder: "https://youtu.be/dQw4w9WgXcQ | mp3", parts: ["url", "format"], splitOn: " | " },
    docs: {
      path: "ytdl?url=&format=",
      text: "Give it a YouTube link. <code>format</code> is <code>mp3</code>, <code>mp4</code> (default, 720p) or a quality such as <code>360</code>, <code>480</code>, <code>720</code>, <code>1080</code>. Returns a branded download link.",
      curl: "ytdl?url=https://youtu.be/...&format=mp3",
      json: '{\n  "title": "Video Title",\n  "thumbnail": "https://...",\n  "duration": 212,\n  "format": "mp3",\n  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",\n  "expires_at": "2026-08-05T20:00:00.000Z"\n}',
    },
  },
  {
    key: "spotify", title: "Spotify Downloader", category: "Downloaders", icon: ICON.spotify,
    desc: "Get a Spotify track as MP3 from its link or song title.",
    endpoint: "GET /api/v1/dev/spotify?url=",
    example: "GET /api/v1/dev/spotify?url=https://open.spotify.com/track/...",
    tryit: { param: "url", label: "Spotify link or song title", placeholder: "https://open.spotify.com/track/..." },
    docs: {
      path: "spotify?url=",
      text: "Give it a Spotify track link (or a song title). Returns the track as a branded MP3 download link.",
      curl: "spotify?url=https://open.spotify.com/track/...",
      json: '{\n  "title": "Song Title",\n  "artist": "Artist",\n  "thumbnail": "https://...",\n  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",\n  "expires_at": "2026-08-05T20:00:00.000Z"\n}',
    },
  },
  {
    key: "soundcloud", title: "SoundCloud Downloader", category: "Downloaders", icon: ICON.soundcloud,
    desc: "Download a SoundCloud track as MP3 from its link.",
    endpoint: "GET /api/v1/dev/soundcloud?url=",
    example: "GET /api/v1/dev/soundcloud?url=https://soundcloud.com/artist/track",
    tryit: { param: "url", label: "SoundCloud track URL", placeholder: "https://soundcloud.com/artist/track" },
    docs: {
      path: "soundcloud?url=",
      text: "Give it a public SoundCloud track link. Returns the track as a branded MP3 download link.",
      curl: "soundcloud?url=https://soundcloud.com/artist/track",
      json: '{\n  "title": "Track Title",\n  "artist": "Artist",\n  "thumbnail": "https://...",\n  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",\n  "expires_at": "2026-08-05T20:00:00.000Z"\n}',
    },
  },
  {
    key: "pinterest", title: "Pinterest Downloader", category: "Downloaders", icon: ICON.pinterest,
    desc: "Pull the image or video from a Pinterest pin (pin.it links work too).",
    endpoint: "GET /api/v1/dev/pinterest?url=",
    example: "GET /api/v1/dev/pinterest?url=https://pin.it/...",
    tryit: { param: "url", label: "Pinterest pin URL", placeholder: "https://pin.it/..." },
    docs: {
      path: "pinterest?url=",
      text: "Give it a pinterest.com pin or pin.it short link. Returns a branded download link for the pin's image or video.",
      curl: "pinterest?url=https://pin.it/...",
      json: '{\n  "type": "image",\n  "title": "Pin Title",\n  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",\n  "expires_at": "2026-08-05T20:00:00.000Z"\n}',
    },
  },
  {
    key: "websearch", title: "Web Search", category: "Lookup", icon: ICON.search,
    desc: "Search the web (Google, with Bing as backup) and get clean results.",
    endpoint: "GET /api/v1/dev/websearch?query=&engine=&limit=",
    example: "GET /api/v1/dev/websearch?query=lagos weather",
    tryit: { param: "query", label: "Search", placeholder: "lagos weather" },
    docs: {
      path: "websearch?query=&engine=&limit=",
      text: "Search the web. <code>engine</code> is optional (<code>google</code> or <code>bing</code>); without it Google is used and Bing steps in if Google fails. <code>limit</code> (1-30) applies to Bing.",
      curl: "websearch?query=lagos weather",
      json: '{\n  "engine": "google",\n  "query": "lagos weather",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "imagesearch", title: "Image Search", category: "Lookup", icon: ICON.image,
    desc: "Search images and get direct image links.",
    endpoint: "GET /api/v1/dev/imagesearch?query=&limit=",
    example: "GET /api/v1/dev/imagesearch?query=lagos skyline",
    tryit: { param: "query", label: "Search", placeholder: "lagos skyline" },
    docs: {
      path: "imagesearch?query=&limit=",
      text: "Search images. <code>limit</code> is optional (1-30, default 10).",
      curl: "imagesearch?query=lagos skyline",
      json: '{\n  "query": "lagos skyline",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "ytsearch", title: "YouTube Search", category: "Lookup", icon: ICON.video,
    desc: "Search YouTube videos by keyword.",
    endpoint: "GET /api/v1/dev/ytsearch?query=",
    example: "GET /api/v1/dev/ytsearch?query=afrobeats mix",
    tryit: { param: "query", label: "Search", placeholder: "afrobeats mix" },
    docs: {
      path: "ytsearch?query=",
      text: "Search YouTube and get matching videos with their links.",
      curl: "ytsearch?query=afrobeats mix",
      json: '{\n  "query": "afrobeats mix",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "tiktoksearch", title: "TikTok Search", category: "Lookup", icon: ICON.tiktok,
    desc: "Search TikTok videos by keyword.",
    endpoint: "GET /api/v1/dev/tiktoksearch?query=&count=&region=",
    example: "GET /api/v1/dev/tiktoksearch?query=dance&count=5",
    tryit: { param: "query", label: "Search", placeholder: "dance" },
    docs: {
      path: "tiktoksearch?query=&count=&region=",
      text: "Search TikTok videos. <code>count</code> (1-30) and <code>region</code> (for example <code>NG</code>) are optional.",
      curl: "tiktoksearch?query=dance&count=5",
      json: '{\n  "query": "dance",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "pinterestsearch", title: "Pinterest Search", category: "Lookup", icon: ICON.pinterest,
    desc: "Search Pinterest pins by keyword.",
    endpoint: "GET /api/v1/dev/pinterestsearch?query=",
    example: "GET /api/v1/dev/pinterestsearch?query=interior design",
    tryit: { param: "query", label: "Search", placeholder: "interior design" },
    docs: {
      path: "pinterestsearch?query=",
      text: "Search Pinterest and get matching pins with images and pinner info.",
      curl: "pinterestsearch?query=interior design",
      json: '{\n  "query": "interior design",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "githubsearch", title: "GitHub Repo Search", category: "Lookup", icon: ICON.github,
    desc: "Search GitHub repositories, sorted by stars.",
    endpoint: "GET /api/v1/dev/githubsearch?query=",
    example: "GET /api/v1/dev/githubsearch?query=telegram bot",
    tryit: { param: "query", label: "Search", placeholder: "telegram bot" },
    docs: {
      path: "githubsearch?query=",
      text: "Search public GitHub repositories. Top results come back sorted by stars.",
      curl: "githubsearch?query=telegram bot",
      json: '{\n  "query": "telegram bot",\n  "results": [ ... ]\n}',
    },
  },
  {
    key: "ytchannel", title: "YouTube Channel Analyzer", category: "Lookup", icon: ICON.user,
    desc: "Get a channel's profile, subscribers, views and engagement stats.",
    endpoint: "GET /api/v1/dev/ytchannel?channel=&limit=",
    example: "GET /api/v1/dev/ytchannel?channel=@mkbhd",
    tryit: { param: "channel", label: "Channel link, @handle or ID", placeholder: "@mkbhd" },
    docs: {
      path: "ytchannel?channel=&limit=",
      text: "Give it a channel link, <code>@handle</code> or channel ID. <code>limit</code> (1-30) sets how many recent videos are analyzed.",
      curl: "ytchannel?channel=@mkbhd",
      json: '{\n  "channel": "@mkbhd",\n  "result": { ... }\n}',
    },
  },
  {
    key: "livescore", title: "Football Live Scores", category: "Lookup", icon: ICON.ball,
    desc: "Live and upcoming football match scores grouped by competition.",
    endpoint: "GET /api/v1/dev/livescore?edition=",
    example: "GET /api/v1/dev/livescore",
    tryit: { param: "edition", label: "Edition (optional)", placeholder: "leave blank for default", optional: true },
    docs: {
      path: "livescore?edition=",
      text: "Live and upcoming football scores grouped by competition. <code>edition</code> is optional.",
      curl: "livescore",
      json: '{\n  "matches": [ ... ]\n}',
    },
  },
  {
    key: "forecast", title: "10-Day Forecast", category: "Lookup", icon: ICON.cloud,
    desc: "A 10-day weather forecast for any city.",
    endpoint: "GET /api/v1/dev/forecast?city=",
    example: "GET /api/v1/dev/forecast?city=Lagos",
    tryit: { param: "city", label: "City", placeholder: "Lagos" },
    docs: {
      path: "forecast?city=",
      text: "A 10-day forecast for a city. For current conditions use the Weather API.",
      curl: "forecast?city=Lagos",
      json: '{\n  "city": "Lagos",\n  "forecast": [ ... ]\n}',
    },
  },
  {
    key: "pastquestions", title: "Past Questions (JAMB, WAEC, NECO)", category: "Lookup", icon: ICON.book,
    desc: "Browse exams, subjects and years, then pull questions with answers.",
    endpoint: "GET /api/v1/dev/pastquestions?exam=&subject=&year=",
    example: "GET /api/v1/dev/pastquestions?exam=jamb&subject=english-language&year=2019",
    tryit: { param: "exam", label: "Exam | subject | year (leave blank to browse)", placeholder: "jamb | english-language | 2019", parts: ["exam", "subject", "year"], splitOn: " | ", optional: true },
    docs: {
      path: "pastquestions?exam=&subject=&year=",
      text: "One endpoint, four steps. No parameters lists exams; <code>exam</code> (<code>jamb</code>, <code>waec</code>, <code>neco</code>) lists subjects; add <code>subject</code> (a slug such as <code>english-language</code>) to list years; add <code>year</code> to get that year's questions with answers. Pass <code>explain=</code> with a question id (and <code>subject</code>) for a worked explanation. The <code>step</code> field tells you which step you got.",
      curl: "pastquestions?exam=jamb&subject=english-language&year=2019",
      json: '{\n  "step": "questions",\n  "exam": "jamb",\n  "subject": "english-language",\n  "year": 2019,\n  "result": [ ... ]\n}',
    },
  },
  {
    key: "tts", title: "Text to Speech", category: "Tools", icon: ICON.speaker,
    desc: "Turn text into natural speech with neural voices.",
    endpoint: "GET /api/v1/dev/tts?text=&voice=",
    example: "GET /api/v1/dev/tts?text=Hello from ES TEAMS TV&voice=aria",
    tryit: { param: "text", label: "Text | voice (optional)", placeholder: "Hello from ES TEAMS TV | aria", parts: ["text", "voice"], splitOn: " | " },
    docs: {
      path: "tts?text=&voice=",
      text: "Convert up to 1000 characters of text to speech. <code>voice</code> is optional (for example <code>aria</code> or <code>en-US-AriaNeural</code>). Returns a branded audio download link.",
      curl: "tts?text=Hello from ES TEAMS TV&voice=aria",
      json: '{\n  "voice": "aria",\n  "download_url": "https://esteamstv.devs.surf/api/v1/dev/dl/eyJ1cmwi...",\n  "expires_at": "2026-08-05T20:00:00.000Z"\n}',
    },
  },
  {
    key: "ytsummary", title: "YouTube Video Summarizer", category: "AI & Vision", icon: ICON.lines,
    desc: "Summarize a YouTube video from its subtitles with AI.",
    endpoint: "GET /api/v1/dev/ytsummary?url=&lang=",
    example: "GET /api/v1/dev/ytsummary?url=https://youtu.be/...",
    tryit: { param: "url", label: "YouTube URL", placeholder: "https://youtu.be/dQw4w9WgXcQ" },
    docs: {
      path: "ytsummary?url=&lang=",
      text: "Give it a YouTube link with subtitles. <code>lang</code> is optional. The summary is passed through from the provider.",
      curl: "ytsummary?url=https://youtu.be/...",
      json: '{\n  "title": "Video Title",\n  "duration": null,\n  "result": { ... }\n}',
    },
  },
];

export const EMMY_FEATURES = SPECS.map((s) => ({
  key: s.key,
  title: s.title,
  desc: s.desc,
  icon: s.icon,
  category: s.category,
  endpoint: s.endpoint,
  live: true,
  example: s.example,
}));

export const EMMY_TRYIT = Object.fromEntries(
  SPECS.map((s) => [
    s.key,
    { title: `Try it - ${s.title}`, method: "GET", path: `/api/v1/dev/${s.key}`, ...s.tryit },
  ])
);

export const EMMY_DOCS_HTML = SPECS.map((s) => `    <h2 class="doc-h2">${s.title}</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/${s.docs.path}</code></p>
    <p class="doc-p">${s.docs.text}</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "${BASE}/api/v1/dev/${s.docs.curl}"</pre>
    <pre>${s.docs.json}</pre>
`).join("\n");
