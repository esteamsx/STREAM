import { siteHeadFor } from "../config/site.js";

const FEATURES = [
  {
    title: "Play",
    desc: "Search and fetch music by title or artist.",
    icon: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  },
  {
    title: "Video",
    desc: "Search and fetch video by title.",
    icon: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  },
  {
    title: "Facebook Downloader",
    desc: "Pull a direct video file from a Facebook link.",
    icon: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>',
  },
  {
    title: "AI",
    desc: "Send a prompt, get a real AI response back.",
    icon: '<path d="M12 2a5 5 0 015 5v1a5 5 0 01-10 0V7a5 5 0 015-5z"/><path d="M8 14v2a4 4 0 004 4 4 4 0 004-4v-2"/><path d="M12 20v2"/>',
  },
  {
    title: "OCR",
    desc: "Extract text from an image.",
    icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h6M7 17h4"/>',
    live: true,
    example: "GET /api/v1/dev/ocr?url=https://example.com/image.png",
  },
  {
    title: "Audiomack",
    desc: "Search and fetch tracks from Audiomack.",
    icon: '<circle cx="12" cy="12" r="9"/><path d="M9 9v6l6-3-6-3z"/>',
  },
];

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
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
.wrap{max-width:920px;margin:0 auto;padding:22px 20px 80px}

.back-row{margin-bottom:14px}
.back-link{
  display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;
  font-size:.82rem;font-weight:600;background:none;border:none;cursor:pointer;padding:0;font-family:var(--font-body);
}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}
.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
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
.dcard-title{font-weight:700;font-size:.92rem}
.dcard-sub{font-size:.76rem;color:var(--muted);margin-top:2px}

.dcard-collapsible .dcard-head{cursor:pointer;user-select:none}
.dcard-chevron{width:16px;height:16px;color:var(--muted);transition:transform .25s var(--ease);flex-shrink:0;margin-left:auto}
.dcard-collapsible.open .dcard-chevron{transform:rotate(180deg)}
.dcard-collapse-body{max-height:0;overflow:hidden;transition:max-height .35s var(--ease)}
.dcard-collapsible.open .dcard-collapse-body{max-height:800px}
.pricing-placeholder{
  margin-top:14px;padding:16px;border-radius:12px;background:var(--card2);
  color:var(--muted);font-size:.84rem;line-height:1.6;text-align:center;
}

.feature-card{opacity:.55}
.feature-card.is-live{opacity:1}
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
</style>
</head>
<body>
<div class="wrap">

  <div class="back-row">
    <a href="/developers" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
      Back
    </a>
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

    <div class="dcard span2 dcard-collapsible" id="apiPlansCard">
      <div class="dcard-head" id="apiPlansHead">
        <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/></svg></span>
        <div>
          <div class="dcard-title">Plans &amp; Pricing</div>
          <div class="dcard-sub">Coming once the APIs below are live</div>
        </div>
        <svg class="dcard-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="dcard-collapse-body" id="apiPlansCollapseBody">
        <div class="pricing-placeholder">Pricing will be posted here once these APIs are ready.</div>
      </div>
    </div>

    ${FEATURES.map(
      (f) => `<div class="dcard feature-card${f.live ? " is-live" : ""}">
      <div class="dcard-head">
        <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${f.icon}</svg></span>
        <div>
          <div class="dcard-title">${f.title}</div>
          <div class="dcard-sub">${f.desc}</div>
        </div>
        <span class="feature-badge${f.live ? " is-live" : ""}">${f.live ? "LIVE" : "SOON"}</span>
      </div>
      ${f.example ? `<div class="feature-example">${f.example}</div>` : ""}
    </div>`
    ).join("\n    ")}

  </div>

</div>
<script nonce="__CSP_NONCE__">
document.getElementById('apiPlansHead').addEventListener('click', function(){
  document.getElementById('apiPlansCard').classList.toggle('open');
});
</script>
</body>
</html>`;
}
