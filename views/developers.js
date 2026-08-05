import { siteHeadFor } from "../config/site.js";

export function renderDevelopers(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("developers")}
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

.hero{margin-bottom:30px}
.hero h1{font-family:var(--font-display);font-size:1.9rem;margin-bottom:8px}
.hero p{color:var(--muted);line-height:1.6;font-size:.94rem;max-width:56ch}

.tile-list{display:flex;flex-direction:column;gap:16px}

.tile{
  background:var(--card);border:1px solid var(--border);border-radius:20px;
  padding:26px 24px;display:flex;flex-direction:column;gap:16px;position:relative;
  transition:border-color .2s var(--ease),transform .2s var(--ease);
}
.tile:hover{border-color:var(--border-strong);transform:translateY(-2px)}
.tile-icon{
  width:52px;height:52px;border-radius:15px;background:var(--card2);
  display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0;
}
.tile-icon svg{width:26px;height:26px}
.tile-badge{
  position:absolute;top:16px;right:16px;padding:3px 10px;border-radius:20px;
  font-size:.68rem;font-weight:700;letter-spacing:.02em;background:var(--card2);color:var(--muted);
  border:1px solid var(--border-strong);display:none;
}
.tile-badge.show{display:inline-flex}
.tile-title{font-family:var(--font-display);font-size:1.15rem;font-weight:700}
.tile-desc{color:var(--muted);font-size:.86rem;line-height:1.55;flex:1}
.tile-cta{
  display:inline-flex;align-items:center;justify-content:space-between;gap:10px;
  padding:12px 16px;border-radius:12px;font-family:var(--font-body);font-size:.86rem;font-weight:700;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;
  transition:opacity .18s var(--ease),transform .1s var(--ease);
}
.tile-cta:hover{opacity:.92}
.tile-cta:active{transform:scale(.98)}
.tile-cta svg{width:16px;height:16px;flex-shrink:0;transition:transform .18s var(--ease)}
.tile:hover .tile-cta svg{transform:translateX(3px)}
</style>
</head>
<body>
<div class="wrap">

  <div class="back-row">
    <a href="/" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
      Back
    </a>
  </div>

  <div class="page-logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    ES TEAMS TV
  </div>

  <div class="hero">
    <h1>APIs</h1>
    <p>Build with ES TEAMS TV. Pick what you need below.</p>
  </div>

  <div class="tile-list">

    <a href="/developers/live-tv" class="tile">
      <span class="tile-badge" id="liveTvBadge"></span>
      <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 20h8"/><path d="M7 7l3-4M17 7l-3-4"/></svg></div>
      <div class="tile-title">Live Tv Apis</div>
      <div class="tile-desc">Pull live channels into your own site, bot, or app. Signed stream links, embeddable players, and usage you can watch in real time.</div>
      <span class="tile-cta">Get Started<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
    </a>

    <a href="/developers/api" class="tile">
      <span class="tile-badge show" id="devApiBadge">Free</span>
      <div class="tile-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg></div>
      <div class="tile-title">Developer Api</div>
      <div class="tile-desc">Media and AI tools for your own projects: search &amp; download, downloaders, AI, OCR, and more, all under one key.</div>
      <span class="tile-cta">Get Started<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
    </a>

  </div>

</div>
<script nonce="__CSP_NONCE__">
fetch('/api/profile').then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
  if (!data || !data.apiPlan) return;
  var badge = document.getElementById('liveTvBadge');
  badge.textContent = data.apiPlan.name;
  badge.classList.add('show');
}).catch(function(){});
</script>
</body>
</html>`;
}
