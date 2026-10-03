import { siteHeadFor } from "../config/site.js";

export function renderPromote(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("promote")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>Promote | ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script nonce="__CSP_NONCE__" src="https://js.paystack.co/v1/inline.js"></script>
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.5);--muted2:rgba(255,255,255,.26);
  --nav-bg:rgba(10,10,15,.98);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark3:#ECEEF3;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.15);
  --text:#14141C;--muted:rgba(20,20,28,.6);--muted2:rgba(20,20,28,.32);
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{background:var(--dark);color:var(--text);font-family:var(--font-body);overflow-x:hidden;position:relative}
button,input,select,textarea{font-family:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}

.pm-nav{position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px)}
.pm-back{display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600;background:transparent;border:none;cursor:pointer;font-family:inherit;padding:0}
.pm-back:hover{color:var(--accent)}
.pm-back svg{width:18px;height:18px}
.pm-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;flex:1}

.pm-wrap{position:relative;z-index:1;max-width:900px;margin:0 auto;padding:28px 18px 80px}
.pm-eyebrow{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.pm-head{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between;margin-bottom:28px}
.pm-head h1{font-family:var(--font-display);font-size:clamp(1.55rem,4.4vw,2.1rem);line-height:1.12;letter-spacing:-.025em;font-weight:700;margin-top:10px;max-width:520px}
.pm-head p{margin-top:10px;font-size:.9rem;line-height:1.55;color:var(--muted);max-width:520px}
.pm-head p b{color:var(--text);font-weight:600}

.pm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border-radius:10px;border:none;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.85rem;font-weight:700;transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.pm-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.pm-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.pm-btn.ghost{background:var(--card2);color:var(--text);border:1px solid var(--border-strong)}
.pm-btn.ghost:hover{border-color:var(--accent);box-shadow:none;transform:none}
.pm-btn.small{padding:8px 13px;font-size:.78rem;border-radius:9px}
.pm-btn.danger{background:transparent;color:var(--red);border:1px solid rgba(255,59,92,.3)}
.pm-btn.danger:hover{background:rgba(255,59,92,.1);box-shadow:none}
.pm-btn.danger-solid{background:var(--red);color:#fff;border:none}
.pm-btn.danger-solid:hover{box-shadow:0 8px 20px rgba(255,59,92,.28)}

.pm-stat,.pm-panel,.pm-ad,.pm-empty,.pm-modal{background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.16);box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
:root[data-theme="light"] .pm-stat,:root[data-theme="light"] .pm-panel,:root[data-theme="light"] .pm-ad,:root[data-theme="light"] .pm-empty,:root[data-theme="light"] .pm-modal{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);border:1px solid rgba(255,255,255,.55);box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6)}
.pm-empty{border-style:solid}
.pm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.pm-stat{border-radius:16px;padding:16px}
.pm-label{font-family:var(--font-mono);font-size:.63rem;letter-spacing:.11em;text-transform:uppercase;color:var(--muted)}
.pm-value{font-family:var(--font-display);font-size:1.65rem;font-weight:700;letter-spacing:-.02em;margin-top:8px;font-variant-numeric:tabular-nums}
.pm-sub{font-size:.72rem;color:var(--muted);margin-top:3px}

.pm-panel{border-radius:16px;padding:18px;margin-bottom:28px}
.pm-panel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.pm-seg{display:inline-flex;border:1px solid var(--border-strong);border-radius:9px;padding:2px}
.pm-seg button{background:none;border:0;padding:5px 12px;border-radius:7px;font-size:.74rem;font-weight:600;color:var(--muted)}
.pm-seg button.on{background:var(--card2);color:var(--text)}
.pm-chart{width:100%;height:170px;display:block}
.pm-chart text{font-family:var(--font-mono);font-size:10px;fill:var(--muted)}
.pm-chart .bar{fill:url(#pmBar)}
.pm-chart .bar:hover{opacity:.8}
.pm-chart .grid{stroke:var(--border);stroke-width:1}

.pm-section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.pm-section-title h2{font-family:var(--font-display);font-size:1.05rem;font-weight:700;letter-spacing:-.01em}

.pm-list{display:flex;flex-direction:column;gap:12px}
.pm-ad{border-radius:16px;padding:16px}
.pm-ad-top{display:flex;gap:14px;align-items:flex-start}
.pm-thumb{flex:0 0 112px;height:63px;border-radius:9px;background:var(--card2) center/cover no-repeat;border:1px solid var(--border)}
.pm-ad-info{min-width:0;flex:1}
.pm-ad-title{font-weight:600;font-size:.95rem;line-height:1.3;word-break:break-word}
.pm-ad-body{font-size:.8rem;color:var(--muted);line-height:1.45;margin-top:3px;word-break:break-word}
.pm-ad-url{font-family:var(--font-mono);font-size:.68rem;color:var(--muted2);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pm-pill{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;font-family:var(--font-mono);font-size:.64rem;letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:999px;border:1px solid var(--border-strong);color:var(--muted)}
.pm-pill i{width:6px;height:6px;border-radius:50%;background:var(--muted2);display:block}
.pm-pill.live{color:var(--green);border-color:rgba(18,196,139,.4)}
.pm-pill.live i{background:var(--green)}
.pm-metrics{display:grid;grid-template-columns:repeat(4,1fr) 1.4fr;gap:14px;align-items:end;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)}
.pm-metric .pm-label{font-size:.58rem}
.pm-metric .pm-num{font-family:var(--font-display);font-size:1.15rem;font-weight:600;margin-top:5px;font-variant-numeric:tabular-nums}
.pm-spark{width:100%;height:34px;display:block}
.pm-spark polyline{fill:none;stroke:var(--accent);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.pm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}

.pm-empty{border-radius:16px;padding:40px 20px;text-align:center}
.pm-empty h3{font-family:var(--font-display);font-size:1.05rem;font-weight:600}
.pm-empty p{font-size:.84rem;color:var(--muted);margin:8px auto 18px;max-width:380px;line-height:1.5}
.pm-skel{height:150px;border-radius:14px;background:linear-gradient(90deg,var(--card),var(--card2),var(--card));background-size:200% 100%;animation:pmsk 1.4s linear infinite}
@keyframes pmsk{to{background-position:-200% 0}}

.pm-overlay{position:fixed;inset:0;z-index:100;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);display:none;align-items:flex-end;justify-content:center;padding:0}
.pm-overlay.show{display:flex}
.pm-modal{width:100%;max-width:760px;max-height:92vh;overflow-y:auto;border-radius:16px 16px 0 0;padding:24px 22px;scrollbar-width:thin}
body:has(.pm-overlay.show){overflow:hidden}
.pm-modal.narrow{max-width:460px}
.pm-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:18px}
.pm-modal-head h3{font-family:var(--font-display);font-size:1.05rem;font-weight:700;letter-spacing:-.01em}
.pm-modal-head p{font-size:.8rem;color:var(--muted);margin-top:4px;line-height:1.45}
.pm-x{background:none;border:0;font-size:1.4rem;line-height:1;color:var(--muted);padding:2px 6px;border-radius:6px}
.pm-x:hover{color:var(--text)}
.pm-cols{display:grid;grid-template-columns:1fr;gap:20px}
.pm-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.pm-field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em;display:flex;justify-content:space-between}
.pm-field label span{font-family:var(--font-mono);font-weight:400;color:var(--muted)}
.pm-in{width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;padding:11px 12px;font-size:.88rem;outline:none;transition:border-color .15s}
.pm-in:focus{border-color:var(--accent)}
textarea.pm-in{resize:vertical;min-height:74px;line-height:1.45}
.pm-file{display:flex;align-items:center;gap:10px}
.pm-file input{display:none}
.pm-hint{font-size:.7rem;color:var(--muted);line-height:1.4}
.pm-preview-label{margin-bottom:8px}
.pm-prev{display:flex;gap:12px;padding:10px;border-radius:14px;background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),var(--card2);border:1px solid var(--border-strong);box-shadow:0 12px 32px rgba(0,0,0,.25)}
.pm-prev-media{flex:0 0 88px;align-self:center;height:50px;border-radius:8px;background:var(--card) center/cover no-repeat;display:none}
.pm-prev-media.on{display:block}
.pm-prev-body{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.pm-prev-meta{font-size:.6rem;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
.pm-prev-title{font-size:.84rem;font-weight:600;line-height:1.3;word-break:break-word}
.pm-prev-text{font-size:.73rem;line-height:1.35;color:var(--muted);word-break:break-word}
.pm-prev-cta{align-self:flex-start;margin-top:4px;padding:5px 11px;border-radius:7px;font-size:.72rem;font-weight:700;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a}
.pm-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.pm-chip{background:var(--dark3);border:1px solid var(--border-strong);border-radius:9px;padding:8px 13px;font-size:.8rem;font-weight:600;color:var(--muted)}
.pm-chip.on{color:var(--text);border-color:var(--accent)}
.pm-sum{border:1px solid var(--border-strong);border-radius:12px;padding:14px;margin:6px 0 16px;background:var(--dark3)}
.pm-sum-row{display:flex;justify-content:space-between;font-size:.82rem;color:var(--muted);padding:3px 0}
.pm-sum-row.total{color:var(--text);font-weight:600;font-size:.95rem;border-top:1px solid var(--border);margin-top:8px;padding-top:10px}
.pm-sum-row span:last-child{font-variant-numeric:tabular-nums}
.pm-note{font-size:.7rem;color:var(--muted);line-height:1.5;margin-top:12px}
.pm-err{color:var(--red);font-size:.78rem;min-height:1.1em;margin:0 0 10px}
.pm-toast{position:fixed;left:50%;bottom:24px;transform:translate(-50%,20px);opacity:0;z-index:120;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.82rem;font-weight:700;padding:10px 16px;border-radius:10px;pointer-events:none;transition:transform .22s var(--ease),opacity .22s}
.pm-toast.show{transform:translate(-50%,0);opacity:1}

@media (min-width:720px){
  .pm-overlay{align-items:center;padding:20px}
  .pm-modal{border-radius:16px}
  .pm-cols{grid-template-columns:1.1fr .9fr}
}
@media (max-width:640px){
  .pm-stats{grid-template-columns:repeat(2,1fr)}
  .pm-metrics{grid-template-columns:repeat(2,1fr)}
  .pm-metrics .pm-spark-cell{grid-column:1 / -1}
  .pm-thumb{flex-basis:88px;height:50px}
  .pm-ad-top{flex-wrap:wrap;align-items:center}
  .pm-ad-info{flex:1 1 100%;order:3}
  .pm-pill{margin-left:auto}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="aurora"><div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div></div>

<nav class="pm-nav">
  <a class="pm-back" href="/" id="pmBack">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </a>
  <div class="pm-nav-title">Promote</div>
</nav>

<main class="pm-wrap">
  <header class="pm-head">
    <div>
      <div class="pm-eyebrow">Advertising</div>
      <h1>Put your link in front of everyone watching</h1>
      <p>Your ad rotates on every page of the site. Verified members do not see ads, and you never see your own. <b>2,500 naira per 24 hours</b>, for as many days as you choose.</p>
    </div>
    <button class="pm-btn" id="pmNew" type="button">Create ad</button>
  </header>

  <section id="pmSummary">
    <div class="pm-skel"></div>
  </section>

  <div class="pm-section-title"><h2>Your ads</h2></div>
  <section class="pm-list" id="pmList"></section>
</main>

<div class="pm-overlay" id="pmOverlay" role="dialog" aria-modal="true">
  <div class="pm-modal" id="pmModal"></div>
</div>
<div class="pm-toast" id="pmToast" role="status"></div>

<script nonce="__CSP_NONCE__">window.PM_PAYSTACK_KEY = ${JSON.stringify(cfg.paystackPublicKey || "")};</script>
<script nonce="__CSP_NONCE__" src="/select-overlay.js" defer></script>
<script nonce="__CSP_NONCE__" src="/promote.js" defer></script>
</body>
</html>`;
}
