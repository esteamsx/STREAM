import { siteHeadFor } from "../config/site.js";

const FEATURES = [
  {
    title: "MP3 Downloader",
    desc: "Search and download MP3 audio by title or artist.",
    icon: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/mp3?query=",
  },
  {
    title: "MP4 Downloader",
    desc: "Search and download MP4 video by title.",
    icon: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/mp4?query=",
  },
  {
    title: "Facebook Downloader",
    desc: "Pull a direct video file from a Facebook link.",
    icon: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/facebook?url=",
  },
  {
    title: "Audiomack",
    desc: "Search and fetch tracks from Audiomack.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M9 9v6l6-3-6-3z"/>',
    category: "Downloaders",
    endpoint: "GET /api/v1/dev/audiomack?query=",
  },
  {
    title: "AI",
    desc: "Send a prompt, get a real AI response back.",
    icon: '<path d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M8 14v2a4 4 0 004 4 4 4 0 004-4v-2"/><path d="M12 20v2"/>',
    category: "AI & Vision",
    endpoint: "POST /api/v1/dev/ai",
  },
  {
    title: "OCR",
    desc: "Extract text from an image.",
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/>',
    category: "AI & Vision",
    endpoint: "GET /api/v1/dev/ocr?url=",
    live: true,
    example: "GET /api/v1/dev/ocr?url=https://example.com/image.png",
  },
];

const CATEGORIES = [];
FEATURES.forEach((f) => {
  if (!CATEGORIES.includes(f.category)) CATEGORIES.push(f.category);
});

function featureCardHtml(f) {
  return `<div class="dcard feature-card${f.live ? " is-live" : ""}" data-search="${(f.title + " " + f.desc).toLowerCase().replace(/"/g, "&quot;")}">
      <div class="dcard-head">
        <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${f.icon}</svg></span>
        <div>
          <div class="dcard-title">${f.title}</div>
          <div class="dcard-sub">${f.desc}</div>
        </div>
        <span class="feature-badge${f.live ? " is-live" : ""}">${f.live ? "LIVE" : "SOON"}</span>
      </div>
      ${f.example ? `<div class="feature-example">${f.example}</div>` : ""}
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
  width:100%;max-width:360px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;
  padding:26px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
  animation:overlayCardIn .22s var(--ease);
}
.overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.overlay-sub{font-size:.82rem;color:var(--muted);line-height:1.5}
.overlay-sub b{color:var(--text)}
.overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline;cursor:pointer}

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

.pricing-placeholder{
  padding:16px;border-radius:12px;background:var(--card2);
  color:var(--muted);font-size:.84rem;line-height:1.6;text-align:center;
}

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
.browse-head h2{font-family:var(--font-display);font-size:1.15rem;margin-bottom:10px}
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
}
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
.note{
  background:rgba(0,224,255,.06);border:1px solid rgba(0,224,255,.2);border-radius:10px;
  padding:12px 14px;font-size:.85rem;color:var(--text);margin:14px 0;
}
h2.doc-h2{font-family:var(--font-display);font-size:1.15rem;margin:34px 0 10px;padding-top:14px;border-top:1px solid var(--border)}
p.doc-p{color:var(--muted);line-height:1.65;margin-bottom:10px;font-size:.92rem}
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
            <div class="dcard-sub">Coming once the APIs below are live</div>
          </div>
        </div>
        <div class="pricing-placeholder">Pricing will be posted here once these APIs are ready.</div>
      </div>

      <div class="dcard span2" id="keyCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
          <div>
            <div class="dcard-title">API Key</div>
            <div class="dcard-sub">Same key works across Live Tv &amp; Developer Api &middot; shown once at creation</div>
          </div>
        </div>
        <div id="keyCardBody"><div class="empty-state">Loading…</div></div>
      </div>

    </div>

    <div class="browse-head">
      <h2>Browse APIs</h2>
      <div class="search-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="apiSearchInput" placeholder="Search APIs…">
      </div>
    </div>

    ${CATEGORIES.map(
      (cat) => `<div class="category-section" data-category>
      <div class="category-title">${cat}</div>
      <div class="hscroll">
        ${FEATURES.filter((f) => f.category === cat)
          .map(featureCardHtml)
          .join("\n        ")}
      </div>
    </div>`
    ).join("\n    ")}

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
    <p class="doc-p">Create an API key from the <a href="#" id="docsToDashLink1">API Dashboard</a>. The raw key is shown once, so save it somewhere safe. This is the same key system used by the <a href="/developers/live-tv" target="_blank" rel="noopener">Live Tv Api</a>, one key works for both. How many keys you can have depends on your plan; see <a href="#" id="docsToDashLink2">Plans &amp; Pricing</a>. You can revoke any key at any time.</p>

    <h2 class="doc-h2">Authentication</h2>
    <p class="doc-p">Pass your key in the <code>x-api-key</code> header on every request.</p>
    <pre>x-api-key: estv_your_key_here</pre>

    <h2 class="doc-h2">Endpoints</h2>
    <table>
      <tr><th>API</th><th>Request</th><th>Status</th></tr>
      ${docsEndpointRows()}
    </table>

    <h2 class="doc-h2">OCR</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/dev/ocr?url=</code></p>
    <p class="doc-p">Give it a direct image URL (jpeg, png, bmp, webp, or gif, up to 10MB) and get the text found in it back.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  "https://esteamstv.devs.surf/api/v1/dev/ocr?url=https://example.com/image.png"</pre>
    <pre>{
  "text": "Whatever text was in the image",
  "confidence": 96
}</pre>

    <h2 class="doc-h2">Rate limits &amp; monthly usage</h2>
    <p class="doc-p">20 requests per minute per API key on the OCR endpoint. On top of that, every account has a monthly allowance shared across <strong>all</strong> your keys and across both the Developer Api and the Live Tv Api, since it's tied to your account, not any one product. Requests past the monthly limit get a <code>429</code> until it resets the following month. Track it on your <a href="#" id="docsToDashLink3">API Dashboard</a>.</p>

    <h2 class="doc-h2">Errors</h2>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td>400</td><td>Missing or invalid parameter</td></tr>
      <tr><td>401</td><td>Missing, invalid, or revoked API key</td></tr>
      <tr><td>413</td><td>Image too large (10MB limit)</td></tr>
      <tr><td>415</td><td>URL did not return a supported file type</td></tr>
      <tr><td>429</td><td>Per-minute rate limit hit, or the account's monthly request limit is reached</td></tr>
      <tr><td>502</td><td>Could not reach the given URL, try again shortly</td></tr>
    </table>

    <div class="note">This is an early version of the API. Endpoints and limits may change, nothing here is guaranteed stable yet.</div>

  </div>

</div>

<div class="page-overlay" id="revokeKeyOverlay">
  <div class="overlay-card">
    <div class="overlay-title">Revoke this API key?</div>
    <div class="overlay-sub">Anything using it will stop working <b>immediately</b>, including on the Live Tv Api. This can't be undone.</div>
    <button class="btn btn-primary" id="revokeKeyConfirmBtn" type="button" style="width:100%;justify-content:center;background:linear-gradient(90deg,var(--red),#ff7a8d)">Revoke Key</button>
    <button class="overlay-cancel" id="revokeKeyCancelBtn" type="button">Cancel</button>
  </div>
</div>

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
    fetch('/api/dev/keys/' + encodeURIComponent(btn.getAttribute('data-revoke')), { method: 'DELETE' })
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

  function renderLoggedOutKeyCard(){
    keyCardBody.innerHTML =
      '<div class="empty-state">Log in to create and manage an API key for your account.</div>' +
      '<a class="btn btn-primary" href="/login?next=%2Fdevelopers%2Fapi">Log in</a>';
  }

  function renderKeys(keys, usage, plan){
    var html = '';
    var keyLimit = plan ? plan.apiKeys : 1;

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

    if(!keys.length){
      html += '<div class="empty-state" id="noKeysMsg">You don\\'t have an API key yet. Create one to start making requests.</div>';
    } else {
      keys.forEach(function(k){
        html += '<div class="key-row">' +
          '<span class="key-dot"></span>' +
          '<div class="key-info">' +
            '<div class="key-label">' + esc(k.label) + '</div>' +
            '<div class="key-meta">estv_&bull;&bull;&bull;&bull;' + esc(k.last4) + ' &middot; created ' + fmtDate(k.createdAt) + ' &middot; last used ' + fmtDate(k.lastUsedAt) + '</div>' +
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
    (atMax ? '<div class="empty-state">Maximum of ' + keyLimit + ' key' + (keyLimit === 1 ? '' : 's') + ' reached for your plan. Revoke one, or upgrade your plan on the <a href="/developers/live-tv">Live Tv Api</a> page.</div>' : '') +
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
        fetch('/api/dev/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label }) })
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
    getJSON('/api/dev/keys').then(function(r){
      if(!r.ok){ renderLoggedOutKeyCard(); return; }
      renderKeys(r.data.keys || [], r.data.usage || null, r.data.plan || null);
    }).catch(function(){ renderLoggedOutKeyCard(); });
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
</script>
</body>
</html>`;
}
