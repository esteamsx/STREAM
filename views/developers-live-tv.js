import { siteHeadFor } from "../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "./music-player.js";

export function renderDevelopersLiveTv(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("developersLiveTv")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script nonce="__CSP_NONCE__" src="https://js.paystack.co/v1/inline.js"></script>
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

.back-row{margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px}
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
.docs-link-btn{
  display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:9px;
  font-size:.78rem;font-weight:600;cursor:pointer;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);
}
.docs-link-btn:hover{background:var(--card)}
.docs-link-btn svg{width:14px;height:14px}

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
.btn-ghost{background:transparent;border-color:var(--border)}
.btn:disabled,.icon-btn:disabled{opacity:.6;cursor:not-allowed}
.btn-primary:disabled{background:var(--card2);color:var(--muted);opacity:1;box-shadow:none}

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:13px;height:13px;border:2px solid rgba(4,18,26,.35);border-top-color:#04121a;
  border-radius:50%;display:inline-block;flex-shrink:0;animation:spin .6s linear infinite;
}
.btn-spinner-muted{border:2px solid var(--border-strong);border-top-color:var(--accent)}

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

.hero{margin-bottom:26px}
.hero h1{font-family:var(--font-display);font-size:1.7rem;margin-bottom:6px}
.hero p{color:var(--muted);line-height:1.6;font-size:.92rem;max-width:52ch}

#view-docs{display:none}

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

.key-row{
  display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:11px;
  background:var(--card2);border:1px solid var(--border);margin-bottom:10px;
}
.key-dot{width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;box-shadow:0 0 0 3px rgba(18,196,139,.15)}
.key-info{flex:1;min-width:0}
.key-label{font-size:.82rem;font-weight:600}
.key-meta{font-size:.68rem;color:var(--muted);font-family:var(--font-mono);margin-top:2px}
.key-value{font-family:var(--font-mono);font-size:.78rem;color:var(--muted)}
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
.field{margin-bottom:10px}
.field label{display:block;font-size:.72rem;color:var(--muted);margin-bottom:6px;font-weight:600}
.field input,.field select{
  width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);font-size:.83rem;outline:none;
}
.field input:focus,.field select:focus{border-color:var(--accent)}
.custom-select{position:relative}
.custom-select input[type="text"]{
  width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);font-family:var(--font-body);font-size:.83rem;outline:none;
}
.custom-select input[type="text"]:focus{border-color:var(--accent)}
.custom-select-list{
  display:none;position:fixed;z-index:200;max-height:220px;overflow-y:auto;
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(18,18,28,.72);
  backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.18);border-radius:12px;
  box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);
  padding:6px;
}
:root[data-theme="light"] .custom-select-list{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),rgba(255,255,255,.72);
  border:1px solid rgba(255,255,255,.6);
  box-shadow:0 12px 30px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
}
.custom-select.open .custom-select-list{display:block}
.custom-select-option{
  width:100%;text-align:left;background:transparent;border:none;color:var(--text);font-family:inherit;
  font-size:.83rem;padding:9px 10px;border-radius:8px;cursor:pointer;
}
.custom-select-option:hover,.custom-select-option.active{background:var(--card2);color:var(--accent)}
.custom-select-empty{font-size:.8rem;color:var(--muted);text-align:center;padding:12px 4px}
.dcard-msg{font-size:.74rem;margin-top:8px;min-height:1em}
.dcard-msg.ok{color:var(--green)}
.dcard-msg.err{color:var(--red)}

.ch-search{margin-bottom:10px}
.ch-list{max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:11px}
.ch-cat-label{
  position:sticky;top:0;background:var(--card2);padding:7px 12px;font-size:.66rem;font-weight:700;
  text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--border);
}
.ch-item{
  display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;
  font-size:.8rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s var(--ease);
}
.ch-item:last-child{border-bottom:none}
.ch-item:hover{background:var(--card2)}
.ch-item code{font-size:.68rem;color:var(--muted)}
.ch-loading{padding:20px;text-align:center;font-size:.8rem;color:var(--muted)}

.link-item{
  display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 12px;
  font-size:.8rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background .15s var(--ease);
}
.link-item:last-child{border-bottom:none}
.link-item:hover{background:var(--card2)}
.link-item-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.link-channel{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.link-created{font-size:.68rem;color:var(--muted)}
.link-item-status{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0}
.link-timeleft{font-size:.68rem;color:var(--muted);font-family:var(--font-mono);white-space:nowrap}

.tryit-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.tryit-tab{
  padding:7px 12px;border-radius:8px;font-size:.74rem;font-weight:600;cursor:pointer;
  border:1px solid var(--border-strong);background:var(--card2);color:var(--muted);font-family:var(--font-mono);
}
.tryit-tab.active{background:rgba(0,224,255,.12);border-color:rgba(0,224,255,.3);color:var(--accent)}
.tryit-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px}
.tryit-row .field{flex:1;min-width:160px;margin-bottom:0}
.result-box{margin-top:4px}
.result-status{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:.76rem;font-family:var(--font-mono)}
.status-pill{padding:3px 9px;border-radius:6px;font-weight:700;font-size:.72rem}
.status-pill.ok{background:rgba(18,196,139,.14);color:var(--green)}
.status-pill.bad{background:rgba(255,59,92,.14);color:var(--red)}
.result-time{color:var(--muted)}
.curl-label{display:flex;align-items:center;justify-content:space-between;margin-top:14px;margin-bottom:6px}
.curl-label span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:600}

table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:.85rem}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border)}
th{color:var(--muted);font-weight:600}
.badge{display:inline-block;padding:3px 9px;border-radius:6px;font-size:.72rem;font-weight:700;font-family:var(--font-mono)}
.badge-get{background:rgba(0,224,255,.12);color:var(--accent)}
.badge-post{background:rgba(124,92,255,.15);color:var(--accent2)}
.badge-delete{background:rgba(255,59,92,.12);color:var(--red)}
.note{
  background:rgba(0,224,255,.06);border:1px solid rgba(0,224,255,.2);border-radius:10px;
  padding:12px 14px;font-size:.85rem;color:var(--text);margin:14px 0;
}
h2.doc-h2{font-family:var(--font-display);font-size:1.15rem;margin:34px 0 10px;padding-top:14px;border-top:1px solid var(--border)}
p.doc-p{color:var(--muted);line-height:1.65;margin-bottom:10px;font-size:.92rem}
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
      <h1>Live Tv Apis</h1>
      <p>Pull live channels into your own site, bot, or app. Manage your key, test a real request, and watch your usage, all from one place.</p>
    </div>

    <div class="dash-grid">

      <div class="dcard span2" id="plansCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/></svg></span>
          <div>
            <div class="dcard-title">Plans &amp; Pricing</div>
            <div class="dcard-sub">More API keys, longer-lived links, no watermark on the higher tiers</div>
          </div>
        </div>
        <div class="plans-grid" id="plansGrid" style="margin-top:16px"><div class="sk-grid"><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div><div class="sk-card"><div class="sk-line w60"></div><div class="sk-line"></div><div class="sk-line w45"></div></div></div></div>
        <div id="customVisitWrap" style="display:none;margin-top:16px">
          <div class="field">
            <label>Custom Visit Page URL <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0">(Max plan, shown on expired stream links)</span></label>
            <input type="text" id="customVisitInput" placeholder="https://yoursite.com">
          </div>
          <button class="btn btn-primary btn-sm" id="customVisitSaveBtn" type="button">Save Link</button>
          <div class="dcard-msg" id="customVisitMsg"></div>
        </div>
      </div>

      <div class="dcard span2" id="keyCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
          <div>
            <div class="dcard-title">API Key</div>
            <div class="dcard-sub">Key limit depends on your plan · shown once at creation</div>
          </div>
        </div>
        <div id="keyCardBody"><div class="sk-stack"><div class="sk-card"><div class="sk-title"></div><div class="sk-line w80"></div><div class="sk-line w45"></div></div></div></div>
      </div>

      <div class="dcard" id="channelsCard">
        <div class="dcard-head">
          <span class="dcard-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 20h8"/><path d="M7 7l3-4M17 7l-3-4"/></svg>
          </span>
          <div>
            <div class="dcard-title">Channels</div>
            <div class="dcard-sub" id="chCountSub"><span class="sk-line" style="display:inline-block;width:104px;height:9px;vertical-align:-1px"></span></div>
          </div>
        </div>
        <div class="field ch-search">
          <input type="text" id="chSearchInput" placeholder="Filter channels…">
        </div>
        <div class="ch-list" id="chList"><div class="ch-item" style="cursor:default"><div class="sk-line" style="width:42%;height:10px"></div><div class="sk-line" style="width:22%;height:9px"></div></div><div class="ch-item" style="cursor:default"><div class="sk-line" style="width:42%;height:10px"></div><div class="sk-line" style="width:22%;height:9px"></div></div><div class="ch-item" style="cursor:default"><div class="sk-line" style="width:42%;height:10px"></div><div class="sk-line" style="width:22%;height:9px"></div></div><div class="ch-item" style="cursor:default"><div class="sk-line" style="width:42%;height:10px"></div><div class="sk-line" style="width:22%;height:9px"></div></div><div class="ch-item" style="cursor:default"><div class="sk-line" style="width:42%;height:10px"></div><div class="sk-line" style="width:22%;height:9px"></div></div></div>
      </div>

      <div class="dcard" id="tryitCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg></span>
          <div>
            <div class="dcard-title">Try it</div>
            <div class="dcard-sub">Send a real request from your browser</div>
          </div>
        </div>

        <div class="tryit-tabs">
          <div class="tryit-tab active" data-endpoint="channels">GET /api/v1/channels</div>
          <div class="tryit-tab" data-endpoint="stream">GET /api/v1/stream/:channel</div>
        </div>

        <div id="tryitKeyRow" class="field" style="display:none">
          <label>Your API key</label>
          <input type="text" id="tryitKeyInput" placeholder="estv_… (pasted, never stored)" autocomplete="off">
        </div>

        <div class="tryit-row" id="tryitChannelRow" style="display:none">
          <div class="field">
            <label>Channel</label>
            <div class="custom-select" id="tryitChannelSelectWrap">
              <input type="text" id="tryitChannelSearch" placeholder="Search channel…" autocomplete="off">
              <input type="hidden" id="tryitChannelSelect">
              <div class="custom-select-list" id="tryitChannelSelectList"></div>
            </div>
          </div>
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
        <pre id="tryitCurl">curl https://esteamstv.devs.surf/api/v1/channels</pre>
      </div>

      <div class="dcard span2" id="linksCard">
        <div class="dcard-head">
          <span class="dcard-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-2.83 2.83a5 5 0 007.07 7.07l1.5-1.5"/></svg>
          </span>
          <div>
            <div class="dcard-title">Generated Links</div>
            <div class="dcard-sub" id="linksCountSub"><span class="sk-line" style="display:inline-block;width:104px;height:9px;vertical-align:-1px"></span></div>
          </div>
        </div>
        <div class="field ch-search">
          <input type="text" id="linksSearchInput" placeholder="Filter by channel, or paste a link/token to check its status…">
        </div>
        <div class="ch-list" id="linksList"><div class="ch-item" style="cursor:default;align-items:flex-start"><div class="sk-row-body"><div class="sk-line" style="width:56%;height:10px"></div><div class="sk-line" style="width:34%;height:8px"></div></div><div class="sk-chip" style="width:54px;height:20px"></div></div><div class="ch-item" style="cursor:default;align-items:flex-start"><div class="sk-row-body"><div class="sk-line" style="width:56%;height:10px"></div><div class="sk-line" style="width:34%;height:8px"></div></div><div class="sk-chip" style="width:54px;height:20px"></div></div><div class="ch-item" style="cursor:default;align-items:flex-start"><div class="sk-row-body"><div class="sk-line" style="width:56%;height:10px"></div><div class="sk-line" style="width:34%;height:8px"></div></div><div class="sk-chip" style="width:54px;height:20px"></div></div><div class="ch-item" style="cursor:default;align-items:flex-start"><div class="sk-row-body"><div class="sk-line" style="width:56%;height:10px"></div><div class="sk-line" style="width:34%;height:8px"></div></div><div class="sk-chip" style="width:54px;height:20px"></div></div></div>
      </div>

    </div>

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

    <h1>Live Tv Apis</h1>
    <p class="doc-p">Pull live channels into your own site, bot, or app, with a key tied to your account, and a link that never exposes the real stream source.</p>

    <h2 class="doc-h2">Getting a key</h2>
    <p class="doc-p">Create an API key from the <a href="#" id="docsToDashLink1">API Dashboard</a>. The raw key is shown once, so save it somewhere safe. How many keys you can have (1 to 15) depends on your plan; see <a href="#" id="docsToDashLink3">Plans &amp; Pricing</a>. You can revoke any key at any time.</p>

    <h2 class="doc-h2">Authentication</h2>
    <p class="doc-p">Pass your key in the <code>x-api-key</code> header on every request.</p>
    <pre>x-api-key: estv_your_key_here</pre>

    <h2 class="doc-h2">List channels</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/channels</code></p>
    <p class="doc-p">Returns every channel id you can request, grouped by category. No key required.</p>
    <pre>curl https://esteamstv.devs.surf/api/v1/channels</pre>
    <pre>{
  "channels": [
    { "id": "nickelodeon", "name": "Nickelodeon", "category": "Kids" },
    { "id": "espn", "name": "ESPN", "category": "Sports" },
    ...
  ]
}</pre>

    <h2 class="doc-h2">Get a stream link</h2>
    <p class="doc-p"><span class="badge badge-get">GET</span> <code>/api/v1/stream/:channel</code></p>
    <p class="doc-p">Give it a channel id (e.g. <code>nickelodeon</code>) and get back a watermarked, single-use embed link. It is <strong>not</strong> the real stream URL, it's a short-lived link to our own player, which is the only thing that ever talks to the actual source.</p>
    <pre>curl -H "x-api-key: estv_your_key_here" \\
  https://esteamstv.devs.surf/api/v1/stream/nickelodeon</pre>
    <pre>{
  "channel": "nickelodeon",
  "embed_url": "https://esteamstv.devs.surf/embed/nickelodeon?token=...",
  "expires_at": "2026-07-24T18:00:00.000Z",
  "note": "Embed this URL in an iframe (or open it directly)."
}</pre>

    <h2 class="doc-h2">Using the link</h2>
    <p class="doc-p">Drop <code>embed_url</code> straight into an iframe on your site:</p>
    <pre>&lt;iframe src="https://esteamstv.devs.surf/embed/nickelodeon?token=..." 
        width="100%" height="400" frameborder="0" allowfullscreen&gt;
&lt;/iframe&gt;</pre>
    <p class="doc-p">Or, in a Telegram bot, send it as a link or a Web App button so it opens in-app. On the Free, Starter and Standard plans, viewers see the ES TEAMS TV watermark on the player; Pro and Max remove it.</p>

    <h2 class="doc-h2">Link lifetime</h2>
    <table>
      <tr><th>Plan</th><th>Embed link expires after</th></tr>
      <tr><td>Free</td><td>6 hours</td></tr>
      <tr><td>Starter</td><td>12 hours</td></tr>
      <tr><td>Standard</td><td>24 hours</td></tr>
      <tr><td>Pro</td><td>3 days</td></tr>
      <tr><td>Max</td><td>7 days</td></tr>
    </table>
    <p class="doc-p">Once a link expires, call <code>/api/v1/stream/:channel</code> again for a fresh one. It's issued with whatever lifetime your current plan allows. Don't try to cache or redistribute the underlying player URL past its expiry, it stops working, by design.</p>
    <p class="doc-p">Every link is also tied to the specific API key that generated it. If you revoke that key (from the dashboard, whether or not the link has hit its expiry yet), the link stops working immediately too. There's no way to keep a link alive past its key's lifetime, so revoking a key is a clean, complete way to cut off everything it was used for.</p>

    <h2 class="doc-h2">Rate limits &amp; monthly usage</h2>
    <p class="doc-p">30 requests per minute per API key on the issuance endpoints, plenty for normal use, since it's one call per viewer session, not per segment. On top of that, every account has a monthly allowance of 100 requests, shared across all your keys. It's tied to your account, so revoking a key and creating a new one doesn't reset it. Requests past the monthly limit get a <code>429</code> until it resets the following month. Track it on your <a href="#" id="docsToDashLink2">API Dashboard</a>.</p>

    <h2 class="doc-h2">Errors</h2>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td>401</td><td>Missing, invalid, or revoked API key</td></tr>
      <tr><td>404</td><td>Unknown channel id, check <code>/api/v1/channels</code></td></tr>
      <tr><td>429</td><td>Per-minute rate limit hit, or the account's monthly request limit is reached</td></tr>
      <tr><td>502</td><td>Could not reach the stream source, try again shortly</td></tr>
    </table>

    <div class="note">This is an early version of the API. Endpoints and limits may change, nothing here is guaranteed stable yet.</div>

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

<div class="page-overlay" id="linkUrlOverlay">
  <div class="overlay-card">
    <div class="overlay-title" id="linkUrlOverlayTitle">Direct URL</div>
    <div class="overlay-sub" id="linkUrlOverlaySub"></div>
    <div class="field">
      <label>Embed URL</label>
      <div style="display:flex;gap:6px">
        <input type="text" id="linkUrlOverlayInput" readonly style="flex:1;font-family:var(--font-mono);font-size:.7rem">
        <button class="btn btn-sm" id="linkUrlCopyBtn" type="button">Copy</button>
      </div>
    </div>
    <button class="overlay-cancel" id="linkUrlCloseBtn" type="button">Close</button>
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
${musicPlayerHtml()}

<script nonce="__CSP_NONCE__">
(function(){
  'use strict';

  var PAYSTACK_PUBLIC_KEY = ${JSON.stringify(cfg.paystackPublicKey || "")};
  var currentProfile = null;

  var PLAN_DEFS = [
    { key: 'free', name: 'Free', priceNgn: 0, apiKeys: 1, streamHours: 6, watermark: true, customVisitPage: false, monthlyRequests: 50, note: 'Default plan' },
    { key: 'starter', name: 'Starter', priceNgn: 0, apiKeys: 3, streamHours: 12, watermark: true, customVisitPage: false, monthlyRequests: 50, note: 'Auto with account verification' },
    { key: 'standard', name: 'Standard', priceNgn: 3000, apiKeys: 5, streamHours: 24, watermark: true, customVisitPage: false, monthlyRequests: 100, note: '30 days' },
    { key: 'pro', name: 'Pro', priceNgn: 5000, apiKeys: 10, streamHours: 72, watermark: false, customVisitPage: false, monthlyRequests: 100, note: '30 days' },
    { key: 'max', name: 'Max', priceNgn: 10000, apiKeys: 15, streamHours: 168, watermark: false, customVisitPage: true, monthlyRequests: null, note: '30 days', highlight: true },
  ];

  function fmtNgn(n){ return '₦' + n.toLocaleString('en-NG'); }
  function fmtHours(h){ return h >= 24 ? Math.round(h / 24) + ' day' + (Math.round(h / 24) === 1 ? '' : 's') : h + ' hours'; }

  function planFeatureRow(ok, label){
    return '<div class="plan-feature' + (ok ? '' : ' off') + '">' +
      (ok
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>'
      ) + label + '</div>';
  }

  function renderPlans(){
    var grid = document.getElementById('plansGrid');
    var currentKey = currentProfile && currentProfile.apiPlan ? currentProfile.apiPlan.key : 'free';
    var loggedIn = !!currentProfile;

    grid.innerHTML = PLAN_DEFS.map(function(p){
      var isCurrent = p.key === currentKey;
      var cls = 'plan-card' + (isCurrent ? ' current' : '') + (p.highlight ? ' highlight' : '');
      var priceHtml = p.priceNgn === 0
        ? (p.key === 'starter' ? '<div class="plan-price">Free<span> · with verification</span></div>' : '<div class="plan-price">Free</div>')
        : '<div class="plan-price">' + fmtNgn(p.priceNgn) + '<span> / 30 days</span></div>';

      var cta;
      if(!loggedIn){
        cta = '<a class="btn btn-primary plan-cta" href="/login?next=%2Fdevelopers">Log in to upgrade</a>';
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
          planFeatureRow(true, (p.monthlyRequests == null ? 'Unlimited' : p.monthlyRequests) + ' requests/mo') +
          planFeatureRow(true, fmtHours(p.streamHours) + ' link lifetime') +
          planFeatureRow(!p.watermark, 'No watermark') +
          planFeatureRow(p.customVisitPage, 'Custom visit page link') +
        '</div>' +
        cta +
      '</div>';
    }).join('');

    grid.querySelectorAll('[data-upgrade]').forEach(function(btn){
      btn.addEventListener('click', function(){ openPlanPay(btn.getAttribute('data-upgrade')); });
    });

    var customWrap = document.getElementById('customVisitWrap');
    if(currentKey === 'max'){
      customWrap.style.display = 'block';
      document.getElementById('customVisitInput').value = (currentProfile && currentProfile.customVisitPageUrl) || '';
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
    document.getElementById('planPaySub').textContent = fmtNgn(def.priceNgn) + ' for 30 days: ' + def.apiKeys + ' API keys, ' + fmtHours(def.streamHours) + ' links' + (!def.watermark ? ', no watermark' : '') + (def.customVisitPage ? ', custom visit page' : '') + '.';
    var payBtn = document.getElementById('planPayBtn');
    payBtn.setAttribute('data-plan', planKey);
    payBtn.disabled = false;
    payBtn.textContent = 'Pay & Upgrade';
    document.getElementById('planPayMsg').textContent = '';
    showPlanPayStep('planPayStepIntro');
    planPayOverlay.classList.add('show');
  }
  document.getElementById('planPayCancel1').addEventListener('click', function(){ planPayOverlay.classList.remove('show'); });
  document.getElementById('planPayCancel2').addEventListener('click', function(){ planPayOverlay.classList.remove('show'); refreshProfileAndPlans(); });
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
    fetch('/api/plan/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: plan }) })
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
    fetch('/api/plan/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: reference }) })
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

  function refreshProfileAndPlans(){
    getJSON('/api/profile').then(function(r){
      if(r.ok){ currentProfile = r.data; renderPlans(); loadKeys(); }
    });
  }

  document.getElementById('customVisitSaveBtn').addEventListener('click', function(){
    var btn = this;
    var input = document.getElementById('customVisitInput');
    var msg = document.getElementById('customVisitMsg');
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
    fetch('/api/plan/custom-visit-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: value }) })
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

  var viewDash = document.getElementById('view-dash');
  var viewDocs = document.getElementById('view-docs');
  function showDocs(){ viewDash.style.display = 'none'; viewDocs.style.display = 'block'; window.scrollTo(0,0); }
  function showDash(){ viewDocs.style.display = 'none'; viewDash.style.display = 'block'; window.scrollTo(0,0); }
  document.getElementById('toDocsBtn').addEventListener('click', showDocs);
  document.getElementById('backToDashBtn').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink1').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink2').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink3').addEventListener('click', function(e){ e.preventDefault(); showDash(); });

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

  function usageLevelClass(pct){
    if(pct >= 90) return 'lvl-hot';
    if(pct >= 65) return 'lvl-warn';
    return '';
  }

  function renderLoggedOutKeyCard(){
    keyCardBody.innerHTML =
      '<div class="empty-state">Log in to create and manage an API key for your account.</div>' +
      '<a class="btn btn-primary" href="/login?next=%2Fdevelopers">Log in</a>';
  }

  function renderKeys(keys, usage, plan){
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
    (atMax ? '<div class="empty-state">Maximum of ' + keyLimit + ' key' + (keyLimit === 1 ? '' : 's') + ' reached for your plan. Revoke one, or upgrade your plan above.</div>' : '') +
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
        fetch('/api/dev/bonus-redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code }) })
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
        fetch('/api/dev/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label }) })
          .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Could not create key.'); return d; }); })
          .then(function(d){
            lastRevealedKey = d.key;
            var tryitInput = document.getElementById('tryitKeyInput');
            if(tryitInput) tryitInput.value = d.key;
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

  var linksList = document.getElementById('linksList');
  var linksSearchInput = document.getElementById('linksSearchInput');
  var linksCountSub = document.getElementById('linksCountSub');
  var allLinks = [];
  var currentRenderedLinks = [];

  var linkUrlOverlay = document.getElementById('linkUrlOverlay');
  var linkUrlOverlaySub = document.getElementById('linkUrlOverlaySub');
  var linkUrlOverlayInput = document.getElementById('linkUrlOverlayInput');
  var linkUrlCopyBtn = document.getElementById('linkUrlCopyBtn');
  document.getElementById('linkUrlCloseBtn').addEventListener('click', function(){
    linkUrlOverlay.classList.remove('show');
  });
  linkUrlCopyBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(linkUrlOverlayInput.value).catch(function(){});
    linkUrlCopyBtn.textContent = 'Copied!';
    setTimeout(function(){ linkUrlCopyBtn.textContent = 'Copy'; }, 1500);
  });
  function openLinkUrlOverlay(l){
    linkUrlOverlaySub.innerHTML = esc(l.channel_name) + ': <span class="status-pill ' +
      (l.status === 'active' ? 'ok' : 'bad') + '" style="margin-left:2px">' + (l.status === 'active' ? 'Active' : 'Inactive') + '</span>';
    linkUrlOverlayInput.value = l.embed_url || '';
    linkUrlCopyBtn.textContent = 'Copy';
    linkUrlOverlay.classList.add('show');
  }

  function formatDuration(ms){
    var totalMin = Math.round(Math.abs(ms) / 60000);
    var h = Math.floor(totalMin / 60);
    var m = totalMin % 60;
    return (h > 0 ? h + 'h ' : '') + m + 'm';
  }
  function formatCreated(iso){
    return new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });
  }
  function formatShortDate(iso){
    return new Date(iso).toLocaleDateString(undefined, { month:'short', day:'numeric' });
  }
  function linkItemHtml(l, i){
    var isActive = l.status === 'active';
    var expiredMs = Date.now() - new Date(l.expires_at).getTime();
    var timeText = isActive
      ? (formatDuration(l.ms_left) + ' left')
      : (expiredMs >= 24 * 60 * 60 * 1000
          ? ('Expired ' + formatShortDate(l.expires_at))
          : ('Expired ' + formatDuration(expiredMs) + ' ago'));
    return '<div class="link-item" data-idx="' + i + '">' +
      '<div class="link-item-main">' +
        '<span class="link-channel">' + esc(l.channel_name) + '</span>' +
        '<code class="link-created">Created ' + esc(formatCreated(l.created_at)) + '</code>' +
      '</div>' +
      '<div class="link-item-status">' +
        '<span class="status-pill ' + (isActive ? 'ok' : 'bad') + '">' + (isActive ? 'Active' : 'Inactive') + '</span>' +
        '<span class="link-timeleft">' + esc(timeText) + '</span>' +
      '</div>' +
    '</div>';
  }
  function renderLinksList(links){
    if(!links.length){ linksList.innerHTML = '<div class="ch-loading">No generated links yet.</div>'; return; }
    currentRenderedLinks = links;
    linksList.innerHTML = links.map(function(l, i){ return linkItemHtml(l, i); }).join('');
    linksList.querySelectorAll('.link-item').forEach(function(item){
      item.addEventListener('click', function(){
        openLinkUrlOverlay(currentRenderedLinks[Number(item.getAttribute('data-idx'))]);
      });
    });
  }
  function looksLikeTokenOrUrl(s){
    return /token=/.test(s) || /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(s.trim());
  }

  function loadLinks(){
    getJSON('/api/dev/links').then(function(r){
      if(!r.ok){ linksList.innerHTML = '<div class="ch-loading">Log in to see your generated links.</div>'; linksCountSub.textContent = ''; return; }
      allLinks = r.data.links || [];
      linksCountSub.textContent = allLinks.length + (allLinks.length === 1 ? ' link generated' : ' links generated');
      renderLinksList(allLinks);
    }).catch(function(){ linksList.innerHTML = '<div class="ch-loading">Could not load links.</div>'; });
  }

  var linksLookupTimer = null;
  linksSearchInput.addEventListener('input', function(){
    var q = linksSearchInput.value.trim();
    if(!q){ renderLinksList(allLinks); return; }
    if(looksLikeTokenOrUrl(q)){
      linksList.innerHTML = '<div class="ch-loading">Checking…</div>';
      clearTimeout(linksLookupTimer);
      linksLookupTimer = setTimeout(function(){
        getJSON('/api/dev/links/lookup?q=' + encodeURIComponent(q)).then(function(r){
          if(!r.ok || !r.data.valid){ linksList.innerHTML = '<div class="ch-loading">That link is invalid or malformed.</div>'; return; }
          renderLinksList([r.data]);
        }).catch(function(){ linksList.innerHTML = '<div class="ch-loading">Could not check that link.</div>'; });
      }, 300);
    } else {
      var f = q.toLowerCase();
      renderLinksList(allLinks.filter(function(l){
        return l.channel_name.toLowerCase().indexOf(f) !== -1 || l.channel.toLowerCase().indexOf(f) !== -1;
      }));
    }
  });

  getJSON('/api/profile').then(function(r){
    if(r.ok){ currentProfile = r.data; loadKeys(); loadLinks(); } else {
      currentProfile = null;
      renderLoggedOutKeyCard();
      linksList.innerHTML = '<div class="ch-loading">Log in to see your generated links.</div>';
      linksCountSub.textContent = '';
    }
    renderPlans();
  }).catch(function(){
    currentProfile = null;
    renderLoggedOutKeyCard();
    linksList.innerHTML = '<div class="ch-loading">Could not load your links. Please refresh.</div>';
    linksCountSub.textContent = '';
    renderPlans();
  });

  var chList = document.getElementById('chList');
  var chSearchInput = document.getElementById('chSearchInput');
  var chCountSub = document.getElementById('chCountSub');
  var tryitSelect = document.getElementById('tryitChannelSelect');
  var tryitSearch = document.getElementById('tryitChannelSearch');
  var tryitList = document.getElementById('tryitChannelSelectList');
  var tryitWrap = document.getElementById('tryitChannelSelectWrap');
  var allChannels = [];

  function setTryitChannel(id, name){
    if(!tryitSelect) return;
    tryitSelect.value = id;
    if(tryitSearch) tryitSearch.value = name || id;
    tryitWrap.classList.remove('open');
    tryitSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function renderTryitOptions(filter){
    if(!tryitList) return;
    var f = (filter || '').trim().toLowerCase();
    var matches = allChannels.filter(function(c){ return !f || c.name.toLowerCase().indexOf(f) !== -1; });
    if(!matches.length){ tryitList.innerHTML = '<div class="custom-select-empty">No channels match.</div>'; return; }
    tryitList.innerHTML = matches.map(function(c){
      return '<div class="custom-select-option' + (c.id === tryitSelect.value ? ' active' : '') + '" data-value="' + esc(c.id) + '">' + esc(c.name) + '</div>';
    }).join('');
    tryitList.querySelectorAll('.custom-select-option').forEach(function(opt){
      opt.addEventListener('click', function(){
        setTryitChannel(opt.getAttribute('data-value'), opt.textContent);
      });
    });
  }

  function positionTryitList(){
    var r = tryitSearch.getBoundingClientRect();
    tryitList.style.left = r.left + 'px';
    tryitList.style.top = (r.bottom + 6) + 'px';
    tryitList.style.width = r.width + 'px';
  }

  if(tryitSearch){
    tryitSearch.addEventListener('focus', function(){ positionTryitList(); tryitWrap.classList.add('open'); renderTryitOptions(''); });
    tryitSearch.addEventListener('input', function(){ positionTryitList(); tryitWrap.classList.add('open'); renderTryitOptions(tryitSearch.value); });
    document.addEventListener('click', function(e){
      if(!tryitWrap.contains(e.target)) tryitWrap.classList.remove('open');
    });
    window.addEventListener('scroll', function(){ tryitWrap.classList.remove('open'); }, true);
  }

  function renderChannelList(filter){
    var f = (filter || '').trim().toLowerCase();
    var byCategory = {};
    allChannels.forEach(function(c){
      if(f && c.name.toLowerCase().indexOf(f) === -1) return;
      (byCategory[c.category] = byCategory[c.category] || []).push(c);
    });
    var cats = Object.keys(byCategory);
    if(!cats.length){ chList.innerHTML = '<div class="ch-loading">No channels match.</div>'; return; }
    var html = '';
    cats.forEach(function(cat){
      html += '<div class="ch-cat-label">' + esc(cat) + '</div>';
      byCategory[cat].forEach(function(c){
        html += '<div class="ch-item" data-id="' + esc(c.id) + '"><span>' + esc(c.name) + '</span><code>' + esc(c.id) + '</code></div>';
      });
    });
    chList.innerHTML = html;
    chList.querySelectorAll('.ch-item').forEach(function(item){
      item.addEventListener('click', function(){
        setTryitChannel(item.getAttribute('data-id'), item.querySelector('span').textContent);
        setEndpointTab('stream');
        document.getElementById('tryitCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  getJSON('/api/v1/channels').then(function(r){
    if(!r.ok){ chList.innerHTML = '<div class="ch-loading">Could not load channels.</div>'; return; }
    allChannels = r.data.channels || [];
    chCountSub.textContent = allChannels.length + ' channels available';
    renderChannelList('');
    if(tryitSelect && allChannels.length){
      tryitSelect.value = allChannels[0].id;
      if(tryitSearch) tryitSearch.value = allChannels[0].name;
    }
    renderTryitOptions('');
    updateCurl();
  }).catch(function(){ chList.innerHTML = '<div class="ch-loading">Could not load channels.</div>'; });

  chSearchInput.addEventListener('input', function(){ renderChannelList(chSearchInput.value); });

  var tabs = document.querySelectorAll('.tryit-tab');
  var currentEndpoint = 'channels';
  var tryitKeyRow = document.getElementById('tryitKeyRow');
  var tryitChannelRow = document.getElementById('tryitChannelRow');
  var tryitKeyInput = document.getElementById('tryitKeyInput');
  var curlEl = document.getElementById('tryitCurl');
  var resultBox = document.getElementById('tryitResultBox');
  var resultStatus = document.getElementById('tryitResultStatus');
  var resultBody = document.getElementById('tryitResultBody');

  function setEndpointTab(name){
    currentEndpoint = name;
    tabs.forEach(function(t){ t.classList.toggle('active', t.getAttribute('data-endpoint') === name); });
    tryitKeyRow.style.display = name === 'stream' ? 'block' : 'none';
    tryitChannelRow.style.display = name === 'stream' ? 'flex' : 'none';
    updateCurl();
  }
  tabs.forEach(function(t){ t.addEventListener('click', function(){ setEndpointTab(t.getAttribute('data-endpoint')); }); });

  function updateCurl(){
    var origin = window.location.origin;
    if(currentEndpoint === 'channels'){
      curlEl.textContent = 'curl ' + origin + '/api/v1/channels';
    } else {
      var chId = (tryitSelect && tryitSelect.value) || 'nickelodeon';
      var key = (tryitKeyInput && tryitKeyInput.value.trim()) || 'estv_your_key_here';
      curlEl.textContent = 'curl -H "x-api-key: ' + key + '" \\\\\\n  ' + origin + '/api/v1/stream/' + chId;
    }
  }
  if(tryitSelect) tryitSelect.addEventListener('change', updateCurl);
  if(tryitKeyInput) tryitKeyInput.addEventListener('input', updateCurl);

  document.getElementById('tryitCopyCurl').addEventListener('click', function(){
    navigator.clipboard.writeText(curlEl.textContent).catch(function(){});
    this.textContent = 'Copied!';
    var self = this;
    setTimeout(function(){ self.textContent = 'Copy'; }, 1400);
  });

  document.getElementById('tryitSendBtn').addEventListener('click', function(){
    var btn = this;
    var start = performance.now();
    var url, headers = {};
    if(currentEndpoint === 'channels'){
      url = '/api/v1/channels';
    } else {
      var chId = (tryitSelect && tryitSelect.value) || '';
      if(!chId){ return; }
      var key = tryitKeyInput ? tryitKeyInput.value.trim() : '';
      if(!key){
        resultBox.style.display = 'block';
        resultStatus.innerHTML = '<span class="status-pill bad">-</span>';
        resultBody.textContent = 'Paste your API key above first.';
        return;
      }
      headers['x-api-key'] = key;
      url = '/api/v1/stream/' + encodeURIComponent(chId);
    }
    var originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Sending…';
    fetch(url, { headers: headers }).then(function(res){
      var ms = Math.round(performance.now() - start);
      return res.json().catch(function(){ return {}; }).then(function(data){
        resultBox.style.display = 'block';
        resultStatus.innerHTML = '<span class="status-pill ' + (res.ok ? 'ok' : 'bad') + '">' + res.status + '</span><span class="result-time">' + ms + 'ms</span>';
        resultBody.textContent = JSON.stringify(data, null, 2);
      });
    }).catch(function(){
      resultBox.style.display = 'block';
      resultStatus.innerHTML = '<span class="status-pill bad">-</span>';
      resultBody.textContent = 'Request failed. Check your connection and try again.';
    }).finally(function(){ btn.disabled = false; btn.innerHTML = originalHtml; });
  });

})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
