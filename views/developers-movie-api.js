import { siteHeadFor, ASSET_VERSION } from "../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "./music-player.js";

const FEATURES = [
  { key: "status", title: "Service Status", desc: "Check whether the ES TEAMS TV Movie API is configured and available.", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/status", live: true, example: "GET /api/v1/movie/status" },
  { key: "home", title: "Movie Home", desc: "Get the home page banner and movie/series rows.", icon: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/home", live: true, example: "GET /api/v1/movie/home" },
  { key: "catalog", title: "Catalog", desc: "Browse movies, TV series, or animation with paging and sorting.", icon: '<path d="M4 5h16M4 12h16M4 19h16"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/catalog/:kind", live: true, example: "GET /api/v1/movie/catalog/movies?page=1&sort=NEWEST" },
  { key: "search", title: "Movie Search", desc: "Search the movie and TV catalog by title.", icon: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/search?q=", live: true, example: "GET /api/v1/movie/search?q=Inception&page=1" },
  { key: "suggest", title: "Search Suggestions", desc: "Get quick title suggestions while a user types.", icon: '<path d="M4 5h16M4 12h10M4 19h7"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/suggest?q=", live: true, example: "GET /api/v1/movie/suggest?q=breaking" },
  { key: "detail", title: "Title Details", desc: "Get normalized details for a movie or series slug.", icon: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>', category: "Movie Data", endpoint: "GET /api/v1/movie/detail/:slug", live: true, example: "GET /api/v1/movie/detail/inception-example-slug" },
  { key: "streams", title: "Stream Sources", desc: "List available qualities and receive ES TEAMS TV playback and download URLs.", icon: '<path d="M4 5h16v14H4z"/><path d="M10 9l5 3-5 3z"/>', category: "Playback & Downloads", endpoint: "GET /api/v1/movie/streams/:subjectId", live: true, example: "GET /api/v1/movie/streams/subject-id?slug=title-slug&se=1&ep=1" },
  { key: "play", title: "Stream Playback", desc: "Proxy an MP4 stream through your API key with range-request support.", icon: '<path d="M5 3l14 9-14 9V3z"/>', category: "Playback & Downloads", endpoint: "GET /api/v1/movie/play/:subjectId", live: true, example: "GET /api/v1/movie/play/subject-id?slug=title-slug&se=1&ep=1&res=360" },
  { key: "download", title: "Direct Download", desc: "Download an MP4 through the ES TEAMS TV Movie API host.", icon: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>', category: "Playback & Downloads", endpoint: "GET /api/v1/movie/download/:subjectId", live: true, example: "GET /api/v1/movie/download/subject-id?slug=title-slug&se=1&ep=1&res=360" },
  { key: "jobs", title: "Download Jobs", desc: "Start, monitor, pause, resume, retry, and cancel server-side downloads.", icon: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>', category: "Playback & Downloads", endpoint: "POST /api/v1/movie/download-jobs", live: true, example: 'POST /api/v1/movie/download-jobs  { "subjectId": "...", "slug": "...", "res": "360" }' },
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

export function renderDevelopersMovieApi(cfg) {
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
<script nonce="__CSP_NONCE__" src="https://js.paystack.co/v2/inline.js"></script>
<script nonce="__CSP_NONCE__" src="/pay-method.js?v=${ASSET_VERSION}"></script>
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
  --nav-bg:rgba(10,10,15,.98);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  min-height:100%;overflow-x:hidden;position:relative;
}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
a{color:var(--accent);text-decoration:none}
code,pre{font-family:var(--font-mono)}
code{background:var(--card2);padding:2px 6px;border-radius:5px;font-size:.85em}
pre{
  background:var(--card2);border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6;margin:10px 0 18px;
  white-space:pre-wrap;word-break:break-all;
}
.wrap{max-width:920px;margin:0 auto;padding:22px 20px 80px;position:relative;z-index:1}

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
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.22);border-radius:16px;
  padding:26px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);
  animation:overlayCardIn .22s var(--ease);
}
:root[data-theme="light"] .overlay-card{
  background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);
  border:1px solid rgba(255,255,255,.65);
  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
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
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:16px;
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
  display:flex;flex-direction:column;gap:12px;position:relative;
  flex:0 0 auto;width:200px;scroll-snap-align:start;
}
:root[data-theme="light"] .plan-card{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
}
@media(min-width:600px){ .plan-card{width:220px} }
.plan-card.current{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.plan-card.highlight{border-color:var(--accent2);background:linear-gradient(160deg,rgba(124,92,255,.16),rgba(255,255,255,.045)),linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%)}
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
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);border-radius:16px;
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
  padding:18px;position:relative;overflow:hidden;
}
:root[data-theme="light"] .dcard{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
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
<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>
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
      <h1>Movie Api</h1>
      <p>Search, browse, stream, and download movies and TV series for your own site or bot, all under one key.</p>
    </div>

    <div class="dash-grid">

      <div class="dcard span2" id="apiPlansCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/></svg></span>
          <div>
            <div class="dcard-title">Plans &amp; Pricing</div>
          <div class="dcard-sub">More API keys, higher rate limits, and no ads from Standard upwards</div>
          </div>
        </div>
        <div class="plans-grid" id="plansGrid" style="margin-top:16px"><div class="sk-grid"><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div></div></div>
        <div id="customAdsWrap" style="display:none;margin-top:16px">
          <div class="field">
            <label>Custom Ads Name <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">(Pro/Max plan, shown on the stream player)</span></label>
            <input type="text" id="customAdsNameInput" placeholder="Your brand name">
          </div>
          <div class="field" style="margin-top:10px">
            <label>Custom Ads Link <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">(Max plan only)</span></label>
            <input type="text" id="customAdsInput" placeholder="https://yoursite.com">
          </div>
          <button class="btn btn-primary btn-sm" id="customAdsSaveBtn" type="button">Save Settings</button>
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
        <div id="keyCardBody"><div class="sk-stack"><div class="sk-card"><div class="sk-title"></div><div class="sk-line w80"></div><div class="sk-line w45"></div></div></div></div>
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

    <h1>Movie Api</h1>
    <p class="doc-p">The ES TEAMS TV Movie API lets you search, browse, inspect, stream, and download movies and TV series from your own site, bot, or app. Every request uses one Movie API key, and every endpoint marked LIVE below is available today.</p>

    <h2 class="doc-h2">Getting a key</h2>
    <p class="doc-p">Create a Movie API key from the <a href="#" id="docsToDashLink1">API Dashboard</a>. The raw key is shown once, so save it somewhere safe. Your Movie API key belongs only to this Movie API product and has its own plan, limits, and usage. How many Movie API keys you can have depends on your Movie API plan; see <a href="#" id="docsToDashLink2">Plans &amp; Pricing</a>. You can revoke any key at any time.</p>

    <h2 class="doc-h2">Authentication</h2>
    <p class="doc-p">Pass your key in the <code>x-api-key</code> header on every request. The keyed Movie API supports browser requests from third-party origins; keep the key in server-side code or a trusted backend where possible, because keys placed in public client JavaScript can be copied and misused.</p>
    <pre>x-api-key: estv_your_key_here</pre>

    <h2 class="doc-h2">Movie API endpoints</h2>
    <table><tr><th>API</th><th>Request</th><th>Status</th></tr>${docsEndpointRows()}</table>
    <h2 class="doc-h2">Movie data</h2>
    <p class="doc-p"><code>/home</code> returns the featured banner and rows. <code>/catalog/:kind</code> accepts <code>movies</code>, <code>tv-series</code>, or <code>animation</code>, plus <code>page</code> and <code>sort</code> (<code>RECOMMEND</code>, <code>NEWEST</code>, or <code>RATING</code>). <code>/search</code> accepts <code>q</code> and <code>page</code>; <code>/suggest</code> accepts <code>q</code>; <code>/detail/:slug</code> returns a normalized title record.</p>
    <pre>curl -H "x-api-key: estv_movie_your_key_here" \
  "https://esteamstv.devs.surf/api/v1/movie/search?q=Inception&amp;page=1"</pre>
    <h2 class="doc-h2">Playback and downloads</h2>
    <p class="doc-p"><code>/streams/:subjectId</code> accepts <code>slug</code>, <code>se</code>, and <code>ep</code>, then returns available qualities and ES TEAMS TV-hosted <code>playUrl</code> and <code>downloadUrl</code> values. Send the API key in the header when requesting those URLs. Playback and download endpoints support HTTP range requests.</p>
    <pre>curl -L -H "x-api-key: estv_movie_your_key_here" \
  "https://esteamstv.devs.surf/api/v1/movie/download/subject-id?slug=title-slug&amp;se=1&amp;ep=1&amp;res=360" \
  -o movie.mp4</pre>
    <h2 class="doc-h2">Server-side download jobs</h2>
    <p class="doc-p">Use <code>POST /download-jobs</code> with JSON such as <code>{"subjectId":"...","slug":"...","se":1,"ep":1,"res":"360"}</code>. Poll <code>GET /download-jobs</code> or <code>GET /download-jobs/:id</code>, control jobs with <code>POST /download-jobs/:id/pause</code>, <code>/resume</code>, or <code>/retry</code>, cancel with <code>DELETE /download-jobs/:id</code>, and fetch the file with <code>GET /download-jobs/:id/file</code>.</p>
    <h2 class="doc-h2">Branding and ads</h2>
    <p class="doc-p">Free and Starter responses include a <code>branding</code> object for ES TEAMS TV attribution and a client-side Adsterra placement notice. Standard, Pro, and Max responses have no ES TEAMS TV or Adsterra requirement. Pro users can set a custom stream-player name; Max users can set both a custom name and link. Stream responses also include <code>X-ES-Teams-TV-Name</code> and <code>X-ES-Teams-TV-Link</code> headers.</p>
    <h2 class="doc-h2">Errors</h2>
    <table><tr><th>Status</th><th>Meaning</th></tr><tr><td>400</td><td>Invalid query, slug, subject, quality, or range.</td></tr><tr><td>401</td><td>Missing, invalid, or revoked Movie API key.</td></tr><tr><td>404</td><td>Title, source, or download job was not found.</td></tr><tr><td>429</td><td>Daily, weekly, monthly, or upstream service limit reached.</td></tr><tr><td>502/503</td><td>The Moviebox API or selected source is temporarily unavailable.</td></tr></table>
    <h2 class="doc-h2">Rate limits &amp; usage</h2>
    <p class="doc-p">Free includes 5 daily, 25 weekly, and 50 monthly requests. Starter includes 50 daily, 250 weekly, and 500 monthly; Standard 100 daily, 500 weekly, and 1,000 monthly; Pro 250 daily, 1,250 weekly, and 2,250 monthly; and Max 500 daily, 2,500 weekly, and 5,000 monthly. Requests past any plan limit receive a <code>429</code> response until that period resets. Track daily, weekly, and monthly usage from the <a href="#" id="docsToDashLink3">API Dashboard</a>.</p>
    <div class="note">This is an early version of the Movie API. Endpoints and limits may change, and more useful movie features will be added over time.</div>
  </div>
</div>
<div class="page-overlay" id="planPayOverlay">
  <div class="overlay-card">
    <div class="overlay-step active" id="planPayStepIntro">
      <div class="overlay-title" id="planPayTitle">Upgrade plan</div>
      <div class="overlay-sub" id="planPaySub"></div>
      <div class="dcard-hint" style="font-size:.72rem;line-height:1.55;margin-bottom:10px">Your card is saved securely for renewals. Auto-renew stays off until you switch it on in Account settings, and you can remove the card there any time.</div>
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
    <div class="overlay-sub">You need at least one Movie Api key before you can test an endpoint.</div>
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

    <div class="field" id="tryitParamWrap">
      <label id="tryitParamLabel">Image URL</label>
      <input type="text" id="tryitParamInput" placeholder="https://example.com/image.png" autocomplete="off">
    </div>

    <div class="field" id="tryitParam2Wrap" style="display:none">
      <label id="tryitParam2Label">Field 2</label>
      <input type="text" id="tryitParam2Input" autocomplete="off">
    </div>

    <div class="field" id="tryitParam3Wrap" style="display:none">
      <label id="tryitParam3Label">Field 3</label>
      <input type="text" id="tryitParam3Input" autocomplete="off">
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
    { key: 'free', name: 'Free', priceNgn: 0, apiKeys: 1, dailyRequests: 5, weeklyRequests: 25, monthlyRequests: 50, noAds: false, customAdsName: false, customAdsLink: false, note: 'Default plan' },
    { key: 'starter', name: 'Starter', priceNgn: 0, apiKeys: 3, dailyRequests: 50, weeklyRequests: 250, monthlyRequests: 500, noAds: false, customAdsName: false, customAdsLink: false, note: 'Auto with account verification' },
    { key: 'standard', name: 'Standard', priceNgn: 7500, apiKeys: 5, dailyRequests: 100, weeklyRequests: 500, monthlyRequests: 1000, noAds: true, customAdsName: false, customAdsLink: false, note: '30 days' },
    { key: 'pro', name: 'Pro', priceNgn: 13500, apiKeys: 10, dailyRequests: 250, weeklyRequests: 1250, monthlyRequests: 2250, noAds: true, customAdsName: true, customAdsLink: false, note: '30 days', highlight: true },
    { key: 'max', name: 'Max', priceNgn: 20500, apiKeys: 15, dailyRequests: 500, weeklyRequests: 2500, monthlyRequests: 5000, noAds: true, customAdsName: true, customAdsLink: true, note: '30 days' },
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
  var currentMovieApiCustomAdsName = '';
  var currentMovieApiCustomAdsUrl = '';
  var loggedInForPlans = false;
  var premiumDiscountRate = 0;
  function displayedPlanPrice(plan){ return premiumDiscountRate ? Math.round(plan.priceNgn * (1 - premiumDiscountRate)) : plan.priceNgn; }

  function renderPlans(planData, customAdsName, customAdsUrl, loggedIn){
    var grid = document.getElementById('plansGrid');
    currentPlanKey = planData ? planData.key : 'free';
    currentMovieApiCustomAdsName = customAdsName || '';
    currentMovieApiCustomAdsUrl = customAdsUrl || '';
    loggedInForPlans = !!loggedIn;

    grid.innerHTML = PLAN_DEFS.map(function(p){
      var isCurrent = loggedIn && p.key === currentPlanKey;
      var cls = 'plan-card' + (isCurrent ? ' current' : '') + (p.highlight ? ' highlight' : '');
      var priceHtml = p.priceNgn === 0
        ? (p.key === 'starter' ? '<div class="plan-price">Free<span> · with verification</span></div>' : '<div class="plan-price">Free</div>')
        : '<div class="plan-price">' + fmtNgn(displayedPlanPrice(p)) + '<span> / 30 days' + (premiumDiscountRate ? ' &middot; verified 15% off' : '') + ' &middot; &asymp; ' + esPay.fmtUsd(displayedPlanPrice(p)) + '</span></div>';

      var cta;
      if(!loggedIn){
        cta = '<a class="btn btn-primary plan-cta" href="/login?next=%2Fdevelopers%2Fmovie-api">Log in to upgrade</a>';
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
          planFeatureRow(true, p.dailyRequests + ' req/day') +
          planFeatureRow(true, p.weeklyRequests + ' req/week') +
          planFeatureRow(true, p.monthlyRequests + ' req/month') +
          planFeatureRow(p.noAds, 'No ads') +
          planFeatureRow(p.customAdsName, 'Custom ads name') +
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
    if(loggedIn && planDef && (planDef.customAdsName || planDef.customAdsLink)){
      customWrap.style.display = 'block';
      document.getElementById('customAdsNameInput').value = currentMovieApiCustomAdsName;
      document.getElementById('customAdsInput').value = currentMovieApiCustomAdsUrl;
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
    document.getElementById('planPaySub').textContent = fmtNgn(displayedPlanPrice(def)) + ' (≈ ' + esPay.fmtUsd(displayedPlanPrice(def)) + ')' + (premiumDiscountRate ? ' with the verified 15% discount' : '') + ' for 30 days: ' + def.apiKeys + ' API keys, ' + def.dailyRequests + ' req/day, ' + def.weeklyRequests + ' req/week, ' + def.monthlyRequests + ' req/month' + (def.noAds ? ', no ads' : '') + (def.customAdsLink ? ', custom ads link' : '') + '.';
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
    var planDef = PLAN_DEFS.filter(function(p){ return p.key === plan; })[0] || {};
    esPay.choose({ ngn: displayedPlanPrice(planDef) }).then(function(payMethod){
    if(!payMethod) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Starting…';
    fetch('/api/movieplan/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan, method: payMethod }) })
      .then(function(r){ return r.json().then(function(data){ return { ok: r.ok, data: data }; }); })
      .then(function(res){
        btn.disabled = false;
        btn.textContent = 'Pay & Upgrade';
        if(!res.ok){ msg.textContent = res.data.error || 'Could not start payment.'; return; }
        esPay.open(res.data, {
          onSuccess: function(reference){
            showPlanPayStep('planPayStepProcessing');
            confirmPlanPayment(reference);
          },
          onError: function(err){ msg.textContent = (err && err.message) || 'Could not open payment.'; },
        });
      })
      .catch(function(){
        btn.disabled = false;
        btn.textContent = 'Pay & Upgrade';
        msg.textContent = 'Could not start payment.';
      });
    });
  });

  function confirmPlanPayment(reference){
    fetch('/api/movieplan/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: reference }) })
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
    var nameInput = document.getElementById('customAdsNameInput');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!value && !name) {
      msg.textContent = 'Enter a custom ad name or link first.';
      msg.className = 'dcard-msg err';
      (nameInput || input).focus();
      return;
    }
    btn.disabled = true;
    var originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="btn-spinner"></span>Saving…';
    fetch('/api/movieapi/custom-ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, url: value }) })
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
    fetch('/api/movieapi/keys/' + encodeURIComponent(btn.getAttribute('data-revoke')), { method: 'DELETE' })
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
  var movieApiKeyCount = 0;

  function usageLevelClass(pct){
    if(pct >= 90) return 'lvl-hot';
    if(pct >= 65) return 'lvl-warn';
    return '';
  }
  function usageBarHtml(label, current, limit, marginTop){
    var used = Math.max(0, Number(current) || 0);
    var max = Math.max(0, Number(limit) || 0);
    var pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
    return '<div class="usage-wrap" style="margin-top:' + marginTop + 'px">' +
      '<div class="usage-top"><span class="usage-label">' + label + '</span><span class="usage-count">' + used + ' / ' + max + '</span></div>' +
      '<div class="usage-track"><div class="usage-fill ' + usageLevelClass(pct) + '" style="width:0%" data-pct="' + pct + '"></div></div>' +
    '</div>';
  }

  function renderLoggedOutKeyCard(){
    movieApiKeyCount = 0;
    keyCardBody.innerHTML =
      '<div class="empty-state">Log in to create and manage an API key for your account.</div>' +
      '<a class="btn btn-primary" href="/login?next=%2Fdevelopers%2Fmovie-api">Log in</a>';
  }

  function renderKeys(keys, usage, plan){
    movieApiKeyCount = keys.length;
    var html = '';
    var keyLimit = plan ? plan.apiKeys : 1;
    var expiresPart = plan && plan.expiresAt ? ' &middot; expires ' + fmtDate(plan.expiresAt) : '';

    if(usage){
      html += '<div style="margin-bottom:16px">' +
        usageBarHtml('Daily requests', usage.dailyRequests, usage.dailyRequestsLimit, 0) +
        usageBarHtml('Weekly requests', usage.weeklyRequests, usage.weeklyRequestsLimit, 10) +
        usageBarHtml('Monthly requests', usage.monthlyRequests, usage.monthlyRequestsLimit, 10) +
      '</div>';
    }

    html += '<div class="field" style="margin-top:0;margin-bottom:16px">' +
      '<label>Redeem Bonus Code</label>' +
      '<div style="display:flex;gap:8px">' +
        '<input type="text" id="bonusRedeemInput" placeholder="Enter code" style="flex:1" maxlength="16">' +
        '<button class="btn btn-ghost" id="bonusRedeemBtn" type="button" style="flex-shrink:0">Redeem</button>' +
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
    (atMax ? '<div class="empty-state">Maximum of ' + keyLimit + ' key' + (keyLimit === 1 ? '' : 's') + ' reached for your Movie Api plan. Revoke one to create a new key.</div>' : '') +
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
        fetch('/api/movieapi/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label }) })
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
        fetch('/api/movieapi/bonus-redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
          .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Could not redeem that code.'); return d; }); })
          .then(function(d){
            loadKeys();
            requestAnimationFrame(function(){
              var newMsg = document.getElementById('bonusRedeemMsg');
              if(newMsg){ newMsg.className = 'dcard-msg ok'; newMsg.textContent = d.type === 'plan' ? (d.planName || d.plan) + ' Movie API plan activated.' : '+' + d.amount + ' requests added to your monthly limit.'; }
            });
          })
          .catch(function(err){
            msg.className = 'dcard-msg err'; msg.textContent = err.message;
            bonusRedeemBtn.disabled = false; bonusRedeemBtn.innerHTML = originalHtml;
          });
      });
    }
  }

  function loadKeys(){
    getJSON('/api/movieapi/keys').then(function(r){
      if(!r.ok){ premiumDiscountRate = 0; renderLoggedOutKeyCard(); renderPlans(null, null, null, false); return; }
      premiumDiscountRate = Number(r.data.premiumDiscountRate) || 0;
      renderKeys(r.data.keys || [], r.data.usage || null, r.data.plan || null);
      renderPlans(r.data.plan || null, r.data.movieApiCustomAdsName || null, r.data.movieApiCustomAdsUrl || null, true);
    }).catch(function(){ premiumDiscountRate = 0; renderLoggedOutKeyCard(); renderPlans(null, null, null, false); });
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
    status: { title: 'Try it - Service Status', method: 'GET', path: '/api/v1/movie/status', optional: true },
    home: { title: 'Try it - Movie Home', method: 'GET', path: '/api/v1/movie/home', optional: true },
    catalog: { title: 'Try it - Catalog', method: 'GET', path: '/api/v1/movie/catalog/movies', param: 'page', label: 'Page', placeholder: '1', optional: true },
    search: { title: 'Try it - Movie Search', method: 'GET', path: '/api/v1/movie/search', param: 'q', label: 'Title', placeholder: 'Inception' },
    suggest: { title: 'Try it - Suggestions', method: 'GET', path: '/api/v1/movie/suggest', param: 'q', label: 'Search text', placeholder: 'breaking' },
    detail: { title: 'Try it - Title Details', method: 'GET', path: '/api/v1/movie/detail/{slug}', fields: [
      { key: 'slug', where: 'path', label: 'Title slug', placeholder: 'slug from search results' }
    ] },
    streams: { title: 'Try it - Stream Sources', method: 'GET', path: '/api/v1/movie/streams/{subjectId}', fields: [
      { key: 'subjectId', where: 'path', label: 'Subject ID', placeholder: 'id from search results' },
      { key: 'slug', where: 'query', label: 'Title slug', placeholder: 'slug from search results' }
    ] },
    play: { title: 'Try it - Stream Playback', method: 'GET', path: '/api/v1/movie/play/{subjectId}', fields: [
      { key: 'subjectId', where: 'path', label: 'Subject ID', placeholder: 'id from search results' },
      { key: 'slug', where: 'query', label: 'Title slug', placeholder: 'slug from search results' },
      { key: 'res', where: 'query', label: 'Quality (360, 480, 720 or 1080)', placeholder: '360', def: '360' }
    ] },
    download: { title: 'Try it - Direct Download', method: 'GET', path: '/api/v1/movie/download/{subjectId}', fields: [
      { key: 'subjectId', where: 'path', label: 'Subject ID', placeholder: 'id from search results' },
      { key: 'slug', where: 'query', label: 'Title slug', placeholder: 'slug from search results' },
      { key: 'res', where: 'query', label: 'Quality (360, 480, 720 or 1080)', placeholder: '360', def: '360' }
    ] },
    jobs: { title: 'Try it - Download Jobs', method: 'POST', path: '/api/v1/movie/download-jobs', body: true, fields: [
      { key: 'subjectId', where: 'body', label: 'Subject ID', placeholder: 'id from search results' },
      { key: 'slug', where: 'body', label: 'Title slug', placeholder: 'slug from search results' },
      { key: 'res', where: 'body', label: 'Quality (360, 480, 720 or 1080)', placeholder: '360', def: '360' }
    ] }
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

  function tryitFields(ep){
    if(ep.fields) return ep.fields;
    if(ep.param) return [{ key: ep.param, where: ep.body ? 'body' : 'query', label: ep.label, placeholder: ep.placeholder, optional: !!ep.optional }];
    return [];
  }
  function tryitInputs(){ return [tryitParamInput, tryitParam2Input, tryitParam3Input]; }
  function tryitResolve(ep, forCurl){
    var inputs = tryitInputs();
    var path = ep.path, query = {}, body = {};
    tryitFields(ep).forEach(function(f, i){
      var v = inputs[i].value.trim();
      if(!v && f.def) v = f.def;
      if(!v && forCurl) v = f.placeholder;
      if(f.where === 'path') path = path.replace('{' + f.key + '}', encodeURIComponent(v));
      else if(f.where === 'body') body[f.key] = v;
      else query[f.key] = v;
    });
    return { path: path, query: query, body: body };
  }

  var tryitEndpoint = 'ocr';
  var tryitOverlay = document.getElementById('tryitOverlay');
  var tryitOverlayTitle = document.getElementById('tryitOverlayTitle');
  var tryitKeyInput = document.getElementById('tryitKeyInput');
  var tryitParamLabel = document.getElementById('tryitParamLabel');
  var tryitParamInput = document.getElementById('tryitParamInput');
  var tryitParam2Input = document.getElementById('tryitParam2Input');
  var tryitParam3Input = document.getElementById('tryitParam3Input');
  var tryitCurlEl = document.getElementById('tryitCurl');
  var tryitResultBox = document.getElementById('tryitResultBox');
  var tryitResultStatus = document.getElementById('tryitResultStatus');
  var tryitResultBody = document.getElementById('tryitResultBody');

  function openTryitOverlay(name){
    tryitEndpoint = name;
    var ep = TRYIT_ENDPOINTS[name];
    tryitOverlayTitle.textContent = ep.title;
    var fields = tryitFields(ep);
    var wraps = ['tryitParamWrap', 'tryitParam2Wrap', 'tryitParam3Wrap'];
    var labels = ['tryitParamLabel', 'tryitParam2Label', 'tryitParam3Label'];
    var inputs = tryitInputs();
    for(var i = 0; i < 3; i++){
      var f = fields[i];
      document.getElementById(wraps[i]).style.display = f ? '' : 'none';
      if(f){
        document.getElementById(labels[i]).textContent = f.label;
        inputs[i].placeholder = f.placeholder;
      }
      inputs[i].value = '';
    }
    tryitResultBox.style.display = 'none';
    updateTryitCurl();
    tryitOverlay.classList.add('show');
  }

  var noKeyOverlay = document.getElementById('noKeyOverlay');
  document.querySelectorAll('.tryit-open-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(movieApiKeyCount < 1){ noKeyOverlay.classList.add('show'); return; }
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
    var resolved = tryitResolve(ep, true);
    if(ep.body){
      var bodyJson = JSON.stringify(resolved.body);
      tryitCurlEl.textContent = 'curl -X POST -H "x-api-key: ' + key + '" -H "Content-Type: application/json" \\\\\\n  -d \\'' + bodyJson + '\\' \\\\\\n  "' + origin + resolved.path + '"';
    } else {
      var params = resolved.query;
      var qs = Object.keys(params).map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
      tryitCurlEl.textContent = 'curl -H "x-api-key: ' + key + '" \\\\\\n  "' + origin + resolved.path + (qs ? '?' + qs : '') + '"';
    }
  }
  tryitKeyInput.addEventListener('input', updateTryitCurl);
  tryitParamInput.addEventListener('input', updateTryitCurl);
  tryitParam2Input.addEventListener('input', updateTryitCurl);
  tryitParam3Input.addEventListener('input', updateTryitCurl);

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
    if(!key){
      tryitResultBox.style.display = 'block';
      tryitResultStatus.innerHTML = '<span class="status-pill bad">-</span>';
      tryitResultBody.textContent = 'Paste your API key above first.';
      return;
    }
    var sendFields = tryitFields(ep), sendInputs = tryitInputs();
    for(var fi = 0; fi < sendFields.length; fi++){
      if(!sendFields[fi].optional && !sendFields[fi].def && !sendInputs[fi].value.trim()){
        tryitResultBox.style.display = 'block';
        tryitResultStatus.innerHTML = '<span class="status-pill bad">-</span>';
        tryitResultBody.textContent = 'Fill in ' + sendFields[fi].label + ' first.';
        return;
      }
    }
    var url, opts = { headers: { 'x-api-key': key } };
    var resolved = tryitResolve(ep, false);
    if(ep.body){
      url = resolved.path;
      opts.method = 'POST';
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(resolved.body);
    } else {
      var params = resolved.query;
      var qs = Object.keys(params).map(function(k){ return k + '=' + encodeURIComponent(params[k]); }).join('&');
      url = resolved.path + (qs ? '?' + qs : '');
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
      var contentType = res.headers.get('content-type') || '';
      if(res.ok && contentType.indexOf('json') === -1){
        if(res.body && res.body.cancel) res.body.cancel();
        tryitResultBox.style.display = 'block';
        tryitResultStatus.innerHTML = statusHtml;
        tryitResultBody.textContent = 'Stream started (' + contentType + ', ' + (res.headers.get('content-length') || 'unknown') + ' bytes). The test stopped early so it does not download the whole file.';
        return;
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
