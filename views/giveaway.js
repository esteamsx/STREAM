import { siteHeadFor } from "../config/site.js";

export function renderGiveaway(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("giveaway")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>Giveaway | ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script nonce="__CSP_NONCE__" async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
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


.gv-nav{position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px)}
.gv-back{display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600}
.gv-back:hover{color:var(--accent)}
.gv-back svg{width:18px;height:18px}
.gv-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;flex:1}
.gv-wrap{position:relative;z-index:1;max-width:520px;margin:0 auto;padding:28px 18px 80px}
.gv-card{background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.16);box-shadow:0 20px 50px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.18);border-radius:18px;padding:24px 20px}
:root[data-theme="light"] .gv-card{background:linear-gradient(155deg,rgba(255,255,255,.7),rgba(255,255,255,.4)),#fff;border-color:rgba(0,0,0,.08);box-shadow:0 12px 34px rgba(20,20,40,.1)}
.gv-eyebrow{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);text-align:center}
.gv-gift{width:68px;height:68px;margin:6px auto 14px;border-radius:20px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;box-shadow:0 10px 28px rgba(124,92,255,.35);animation:gvfloat 3s ease-in-out infinite}
.gv-gift svg{width:34px;height:34px}
@keyframes gvfloat{50%{transform:translateY(-5px)}}
.gv-title{font-family:var(--font-display);font-size:clamp(1.4rem,5vw,1.8rem);line-height:1.15;letter-spacing:-.02em;font-weight:700;text-align:center;margin-top:8px}
.gv-prize{margin:12px auto 0;display:table;padding:7px 15px;border-radius:999px;font-weight:700;font-size:.9rem;color:#04141a;background:linear-gradient(90deg,var(--accent),var(--accent2))}
.gv-sub{text-align:center;color:var(--muted);font-size:.84rem;line-height:1.55;margin-top:12px}
.gv-timer{display:flex;justify-content:center;gap:8px;margin:20px 0 6px}
.gv-t{min-width:62px;padding:10px 6px;border-radius:12px;background:var(--dark3);border:1px solid var(--border-strong);text-align:center}
.gv-t b{display:block;font-family:var(--font-display);font-size:1.5rem;font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.gv-t span{font-family:var(--font-mono);font-size:.56rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.gv-label-timer{text-align:center;font-size:.7rem;color:var(--muted);margin-bottom:18px}
.gv-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.gv-field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.gv-in{width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;padding:12px;font-size:.9rem;outline:none;transition:border-color .15s}
.gv-in:focus{border-color:var(--accent)}
.gv-in[readonly]{opacity:.7;cursor:not-allowed}
.gv-hint{font-size:.7rem;color:var(--muted);line-height:1.45}
.gv-btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 18px;border-radius:12px;border:none;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.9rem;font-weight:700;transition:transform .15s,box-shadow .15s}
.gv-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.gv-btn:disabled{opacity:.5;cursor:not-allowed}
.gv-spin{width:15px;height:15px;border-radius:50%;border:2px solid rgba(4,20,26,.3);border-top-color:#04141a;animation:gvspin .7s linear infinite}
@keyframes gvspin{to{transform:rotate(360deg)}}
.gv-msg{font-size:.78rem;padding:9px 12px;border-radius:8px;margin:0 0 12px;display:none;line-height:1.45}
.gv-msg.show{display:block}
.gv-msg.err{background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red)}
.gv-state{text-align:center;padding:14px 4px}
.gv-state h2{font-family:var(--font-display);font-size:1.35rem;font-weight:700;letter-spacing:-.02em;margin-top:10px}
.gv-state p{color:var(--muted);font-size:.88rem;line-height:1.55;margin-top:8px}
.gv-ico{width:60px;height:60px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center}
.gv-ico svg{width:30px;height:30px}
.gv-ico.ok{background:rgba(18,196,139,.14);color:var(--green)}
.gv-ico.off{background:rgba(255,255,255,.07);color:var(--muted)}
.gv-wrap.gv-center{min-height:calc(100vh - 58px);min-height:calc(100dvh - 58px);display:flex;align-items:center;justify-content:center;padding-top:0;padding-bottom:58px}
.gv-wrap.gv-center .gv-card{width:100%}
.gv-wrap.gv-center .gv-views-clip{width:100%}
.gv-share{margin-top:22px;padding-top:18px;border-top:1px solid var(--border)}
.gv-share h3{font-family:var(--font-display);font-size:1.02rem;font-weight:700;text-align:center;letter-spacing:-.01em}
.gv-share p{text-align:center;color:var(--muted);font-size:.78rem;line-height:1.5;margin:6px 0 14px}
.gv-share-row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
.gv-sbtn{display:flex;flex-direction:column;align-items:center;gap:6px;width:58px;background:none;border:none;color:var(--text);font-size:.64rem;font-weight:600}
.gv-sbtn i{display:flex;align-items:center;justify-content:center;width:50px;height:50px;border-radius:50%;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.3);transition:transform .15s}
.gv-sbtn:active i{transform:scale(.9)}
.gv-sbtn svg{width:25px;height:25px}
.gv-sbtn.s-link i{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a}
.gv-sbtn.s-wa i{background:#25D366}
.gv-sbtn.s-fb i{background:#1877F2}
.gv-sbtn.s-ig i{background:linear-gradient(45deg,#F9A825,#E1306C 55%,#833AB4)}
.gv-sbtn.s-tg i{background:#229ED9}
.gv-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:50;background:rgba(20,20,30,.95);color:#fff;border:1px solid var(--border-strong);padding:10px 18px;border-radius:999px;font-size:.8rem;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.4)}
.gv-skel{height:260px;border-radius:14px;background:linear-gradient(90deg,var(--card),var(--card2),var(--card));background-size:200% 100%;animation:gvsk 1.4s linear infinite}
@keyframes gvsk{to{background-position:-200% 0}}
.gv-steps{margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:6px;font-size:.74rem;color:var(--muted)}

/* ---- two sections that slide, like the account page ---- */
.gv-views-clip{overflow:hidden;width:100%;transition:height .3s var(--ease)}
.gv-views-track{display:flex;align-items:flex-start;width:200%;transition:transform .4s cubic-bezier(.22,.61,.36,1)}
.gv-views-track.show-spin{transform:translateX(-50%)}
.gv-view-panel{width:50%;flex-shrink:0;min-width:0}
.gv-swipe-hint{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:20;background:var(--card);border:1px solid var(--border-strong);border-right:none;border-radius:12px 0 0 12px;padding:12px 8px;color:var(--muted);display:flex;align-items:center;cursor:pointer;box-shadow:-4px 0 14px rgba(0,0,0,.18)}
.gv-swipe-hint:hover{color:var(--accent)}
.swipe-hint-icon{width:16px;height:16px;animation:swipeHintPulse 1.8s ease-in-out infinite}
@keyframes swipeHintPulse{0%,100%{transform:translateX(0);opacity:.5}50%{transform:translateX(-3px);opacity:1}}

/* ---- spin the wheel ---- */
.cr-coin{display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 6px;border-radius:20px;text-decoration:none;flex-shrink:0;background:rgba(0,224,255,.09);border:1px solid rgba(0,224,255,.28);font-size:.8rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);transition:border-color .2s var(--ease),background .2s var(--ease)}
.cr-coin:hover{background:rgba(0,224,255,.16);border-color:rgba(0,224,255,.5)}
.cr-coin-ico{width:21px;height:21px;position:relative;flex-shrink:0;display:inline-block}
.cr-coin-ico i{position:absolute;left:0;width:21px;height:14px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.32)}
.cr-coin-ico i:nth-child(1){top:7px;opacity:.5}
.cr-coin-ico i:nth-child(2){top:3.5px;opacity:.75}
.cr-coin-ico i:nth-child(3){top:0;box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.4),0 0 8px rgba(0,224,255,.3)}
.cr-coin-ico i:nth-child(3)::after{content:"";position:absolute;inset:3.5px 6px;border-radius:50%;border:1.2px solid rgba(4,18,26,.45)}
.cr-coin.bump{animation:coinBump .5s var(--ease)}
@keyframes coinBump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
.sw-top{display:flex;justify-content:center;margin-bottom:10px}
.sw-stage{position:relative;width:min(300px,76vw);aspect-ratio:1;margin:22px auto 20px}
.sw-pointer{position:absolute;left:50%;top:-8px;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid var(--accent);filter:drop-shadow(0 0 7px rgba(0,224,255,.75));z-index:3}
.sw-ring{position:absolute;inset:-7px;border-radius:50%;border:1px solid rgba(255,255,255,.2);box-shadow:0 0 34px rgba(0,224,255,.16),inset 0 0 22px rgba(124,92,255,.1);animation:swGlow 3s ease-in-out infinite;pointer-events:none}
@keyframes swGlow{0%,100%{box-shadow:0 0 22px rgba(0,224,255,.12),inset 0 0 18px rgba(124,92,255,.08)}50%{box-shadow:0 0 40px rgba(0,224,255,.3),inset 0 0 26px rgba(124,92,255,.18)}}
.sw-wheel{position:absolute;inset:0;border-radius:50%;transition:transform 5.2s cubic-bezier(.12,.72,.12,1);background:rgba(255,255,255,.04);box-shadow:0 14px 40px rgba(0,0,0,.35)}
.sw-wheel svg{width:100%;height:100%;display:block;overflow:visible}
.sw-wheel .seg{stroke:rgba(255,255,255,.3);stroke-width:.8}
.sw-wheel .seg.livetv{fill:rgba(0,224,255,.3)}
.sw-wheel .seg.devapi{fill:rgba(124,92,255,.34)}
.sw-wheel .seg.verify1d{fill:rgba(18,196,139,.3)}
.sw-wheel .seg.naira{fill:rgba(255,201,60,.36)}
.sw-wheel .seg.nothing{fill:rgba(255,255,255,.07)}
.sw-wheel text{fill:var(--text);font-family:var(--font-display);font-weight:700;text-anchor:middle}
.sw-wheel text.dim{fill:var(--muted);font-weight:600}
:root[data-theme="light"] .sw-wheel .seg{stroke:rgba(20,20,40,.18)}
:root[data-theme="light"] .sw-wheel .seg.nothing{fill:rgba(20,20,40,.06)}
:root[data-theme="light"] .sw-ring{border-color:rgba(20,20,40,.14)}
.sw-hub{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;z-index:2;display:flex;align-items:center;justify-content:center;background:linear-gradient(155deg,rgba(255,255,255,.18),rgba(255,255,255,.04)),rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 6px 18px rgba(0,0,0,.3)}
:root[data-theme="light"] .sw-hub{background:linear-gradient(155deg,rgba(255,255,255,.8),rgba(255,255,255,.4));border-color:rgba(255,255,255,.8)}
.sw-hub .cr-coin-ico{transform:scale(1.25)}
.sw-msg{min-height:1.2em;text-align:center;font-size:.78rem;color:var(--muted);margin-bottom:10px}
.sw-msg.err{color:var(--red)}
.sw-btn .cr-coin-ico{margin-left:2px}
.sw-btn[disabled]{opacity:.6;cursor:default}
.sw-learn{margin-top:14px;text-align:center}
.sw-learn summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;list-style:none;font-size:.78rem;font-weight:700;color:var(--muted);padding:6px 0}
.sw-learn summary::-webkit-details-marker{display:none}
.sw-learn summary::after{content:"";width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg) translateY(-2px);transition:transform .25s var(--ease)}
.sw-learn[open] summary::after{transform:rotate(-135deg) translateY(-1px)}
.sw-learn summary:hover{color:var(--accent)}
.sw-learn ul{list-style:none;display:flex;flex-direction:column;gap:6px;margin-top:6px;font-size:.78rem;color:var(--muted);text-align:left}
.sw-learn li b{color:var(--text)}

/* ---- result popup (same look as the gift popup) ---- */
@keyframes spIn{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
@keyframes spShake{0%,100%{transform:rotate(0)}10%{transform:rotate(-12deg) scale(1.04)}20%{transform:rotate(11deg) scale(1.04)}30%{transform:rotate(-9deg)}40%{transform:rotate(8deg)}50%{transform:rotate(-5deg)}60%{transform:rotate(3deg)}70%,90%{transform:rotate(0)}}
@keyframes spGlow{0%,100%{box-shadow:0 0 0 0 rgba(0,224,255,.35),0 12px 30px rgba(0,0,0,.35)}50%{box-shadow:0 0 0 14px rgba(0,224,255,0),0 12px 30px rgba(0,0,0,.35)}}
@keyframes spSpark{0%{opacity:0;transform:translate(0,0) scale(.3)}25%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
@keyframes spPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12);opacity:1}100%{transform:scale(1)}}
.sp-ov{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,10,15,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.sp-card{position:relative;width:100%;max-width:340px;padding:30px 22px 22px;border-radius:20px;text-align:center;overflow:hidden;background:linear-gradient(155deg,rgba(255,255,255,.16),rgba(255,255,255,.03) 40%,rgba(255,255,255,.06) 100%),rgba(255,255,255,.06);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.24);box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.32);animation:spIn .45s cubic-bezier(.2,.9,.3,1.2) both}
:root[data-theme="light"] .sp-card{background:linear-gradient(155deg,rgba(255,255,255,.75),rgba(255,255,255,.35)),rgba(255,255,255,.7);border-color:rgba(255,255,255,.7);box-shadow:0 24px 70px rgba(20,20,28,.2),inset 0 1px 0 rgba(255,255,255,.8)}
.sp-glow{position:absolute;left:50%;top:-60px;width:260px;height:260px;margin-left:-130px;border-radius:50%;background:radial-gradient(circle,rgba(0,224,255,.28),rgba(124,92,255,.14) 45%,transparent 70%);pointer-events:none}
.sp-box{position:relative;width:84px;height:84px;margin:0 auto 14px;border-radius:24px;display:flex;align-items:center;justify-content:center;color:#04141a;background:linear-gradient(135deg,var(--accent),var(--accent2));animation:spShake 1.5s .5s ease-in-out 2,spGlow 2s 1.9s ease-out infinite}
.sp-box svg{width:48px;height:48px}
.sp-spark{position:absolute;left:50%;top:42px;width:7px;height:7px;margin-left:-3px;border-radius:50%;background:var(--accent);opacity:0;animation:spSpark 1.6s ease-out infinite}
.sp-title{position:relative;font-family:var(--font-display);font-size:1.15rem;font-weight:700;letter-spacing:-.01em;color:var(--text)}
.sp-sub{position:relative;margin-top:8px;font-size:.84rem;line-height:1.5;color:var(--muted)}
.sp-amt{position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:2px;margin:16px 0 4px;padding:10px 22px;border-radius:20px;font-family:var(--font-mono);font-size:1.6rem;font-weight:800;color:var(--text);background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.2);animation:spPop .6s .35s both}
.sp-amt small{font-size:.66rem;font-weight:700;color:var(--muted);letter-spacing:.06em}
.sp-btn{position:relative;width:100%;margin-top:18px;padding:14px;border:none;border-radius:13px;font-weight:700;font-size:.92rem;cursor:pointer;font-family:inherit;color:#04141a;background:linear-gradient(90deg,var(--accent),var(--accent2));box-shadow:0 8px 22px rgba(0,224,255,.25)}
:root[data-theme="light"] .sw-top{align-items:center}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="aurora"><div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div></div>

<nav class="gv-nav">
  <a class="gv-back" href="/">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </a>
  <div class="gv-nav-title">Giveaway</div>
</nav>

<button type="button" class="gv-swipe-hint" id="gvSwipeHint" aria-label="Swipe for Spin the Wheel">
  <svg class="swipe-hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l-6 6 6 6M15 6l6 6-6 6"/></svg>
</button>

<main class="gv-wrap">
  <div class="gv-views-clip" id="gvViewsClip">
  <div class="gv-views-track" id="gvViewsTrack">
    <div class="gv-view-panel" id="view-giveaway"><div class="gv-card" id="gvCard"><div class="gv-skel"></div></div></div>
    <div class="gv-view-panel" id="view-spin"><div class="gv-card" id="spinCard"></div></div>
  </div>
  </div>
</main>

<script nonce="__CSP_NONCE__" type="module">
const card = document.getElementById('gvCard');
const wrap = document.querySelector('.gv-wrap');
function setCenter(on){ wrap.classList.toggle('gv-center', !!on); }
const GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

let status = null;
let clockOffset = 0;
let tick = null;
let captchaValue = '';

function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function pad(n){ return String(n).padStart(2, '0'); }

async function api(path, body){
  const opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { status: res.status });
  return data;
}

function displayTitle(raw){
  const t = String(raw || '').replace(/\\s+/g, ' ').trim();
  if (!t) return 'ES TEAMS TV GIVEAWAY';
  const hasWord = /\\bgiveaway\\b/i.test(t);
  const rest = t.replace(/\\bgiveaway\\b/ig, '').replace(/\\s+/g, ' ').trim();
  const caps = /[A-Za-z]/.test(rest) && rest === rest.toUpperCase();
  if (caps) return (hasWord ? t : t + ' giveaway').toUpperCase();
  return hasWord ? t : t + ' Giveaway';
}

const SHARE_ICONS = {
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.41 1.41"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.41-1.41"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3z"/><path fill="currentColor" stroke="none" d="M8.7 8.3c.3 2.9 3.1 5.7 6 6l1.3-1.4-2-1-1 .8c-1-.4-1.9-1.4-2.3-2.3l.8-1-1-2z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7h2.4l.4-2.8h-2.8V9.5c0-.8.3-1.4 1.5-1.4h1.4V5.6c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2.1H8.4V14h2.4v7z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><circle cx="16.7" cy="7.3" r="1" fill="currentColor" stroke="none"/></svg>',
  tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.7 4.3L3.2 11c-.8.3-.8 1.3 0 1.6l4.4 1.4 1.7 5.2c.2.6 1 .8 1.4.3l2.4-2.5 4.4 3.2c.6.4 1.4.1 1.5-.6L22 5.4c.1-.8-.6-1.4-1.3-1.1zM9 13.5l8.4-5.2-6.6 6.3-.3 3.1z"/></svg>'
};

let toastTimer = null;
function gvToast(msg){
  let t = document.getElementById('gvToast');
  if (!t) { t = document.createElement('div'); t.id = 'gvToast'; t.className = 'gv-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2200);
}

function copyText(text){
  const legacy = () => new Promise((resolve, reject) => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const done = document.execCommand('copy'); ta.remove();
      done ? resolve() : reject(new Error('copy failed'));
    } catch (e) { reject(e); }
  });
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(legacy);
  return legacy();
}

function shareLink(){ return status.shareUrl || (location.origin + '/giveaway'); }
function shareText(){ return 'Join the ' + displayTitle(status.title) + ' and win ' + status.prize + '!'; }

function openOut(url){
  const w = window.open(url, '_blank', 'noopener');
  if (!w) location.href = url;
}

function onShare(kind){
  const url = shareLink(), text = shareText();
  if (kind === 'link') {
    copyText(url).then(() => gvToast('Link copied'), () => gvToast('Could not copy. Hold the address to copy it.'));
    return;
  }
  copyText(url).catch(() => {});
  if (kind === 'wa') {
    gvToast('Link copied. Opening WhatsApp...');
    openOut('https://wa.me/?text=' + encodeURIComponent(text + ' ' + url));
  } else if (kind === 'fb') {
    gvToast('Link copied. Opening Facebook...');
    openOut('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url));
  } else if (kind === 'tg') {
    gvToast('Link copied. Opening Telegram...');
    openOut('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text));
  } else if (kind === 'ig') {
    gvToast('Link copied. Opening Instagram...');
    location.href = 'instagram://app';
    setTimeout(() => { if (!document.hidden) openOut('https://www.instagram.com/'); }, 1300);
  }
}

function shareHtml(){
  const b = (k, cls, label) => '<button type="button" class="gv-sbtn ' + cls + '" data-share="' + k + '" aria-label="' + label + '"><i>' + SHARE_ICONS[k] + '</i>' + label + '</button>';
  return '<div class="gv-share"><h3>Share to Friends</h3>' +
    '<p>Invite friends with your personal link. When someone joins with it, you earn coins too.</p>' +
    '<div class="gv-share-row">' + b('link', 's-link', 'Copy link') + b('wa', 's-wa', 'WhatsApp') + b('fb', 's-fb', 'Facebook') + b('ig', 's-ig', 'Instagram') + b('tg', 's-tg', 'Telegram') + '</div></div>';
}

function showEnded(){
  clearInterval(tick);
  setCenter(true);
  card.innerHTML = '<div class="gv-state"><div class="gv-ico off">' + CLOCK + '</div><h2>Giveaway has Ended</h2><p>Please try again later.</p></div>';
}

function showEntered(){
  setCenter(true);
  card.innerHTML =
    '<div class="gv-state"><div class="gv-ico ok">' + CHECK + '</div><h2>You are in!</h2>' +
    '<p>Your entry for <b>' + esc(status.prize) + '</b> is saved. If you win, you will get a notification in the app with your recharge card PIN.</p></div>' +
    '<div class="gv-timer" id="gvTimer"></div><div class="gv-label-timer">Entries close in</div>' +
    shareHtml();
  card.querySelectorAll('[data-share]').forEach((btn) => btn.addEventListener('click', () => onShare(btn.getAttribute('data-share'))));
  startTick();
}

function timerHtml(ms){
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const cells = (d ? [[d, 'days']] : []).concat([[pad(h), 'hours'], [pad(m), 'mins'], [pad(s), 'secs']]);
  return cells.map((c) => '<div class="gv-t"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>').join('');
}

function startTick(){
  clearInterval(tick);
  const paint = () => {
    const left = status.endsAt - (Date.now() + clockOffset);
    if (left <= 0) { showEnded(); return; }
    const el = document.getElementById('gvTimer');
    if (el) el.innerHTML = timerHtml(left);
  };
  paint();
  tick = setInterval(paint, 1000);
}

function showForm(){
  setCenter(false);
  card.innerHTML =
    '<div class="gv-eyebrow">Live giveaway</div>' +
    '<div class="gv-gift">' + GIFT + '</div>' +
    '<div class="gv-title">' + esc(displayTitle(status.title)) + '</div>' +
    '<div class="gv-prize">' + esc(status.prize) + '</div>' +
    '<div class="gv-sub">One entry per person. A winner is picked at random and gets the recharge card PIN in the app.</div>' +
    '<div class="gv-timer" id="gvTimer"></div><div class="gv-label-timer">Entries close in</div>' +
    '<div class="gv-msg err" id="gvMsg"></div>' +
    '<div class="gv-field"><label for="gvName">Full name</label><input class="gv-in" id="gvName" maxlength="60" autocomplete="name" value="' + esc(status.name) + '"></div>' +
    '<div class="gv-field"><label for="gvUser">Username</label><input class="gv-in" id="gvUser" readonly value="' + esc(status.username) + '"><div class="gv-hint">This is your ES TEAMS TV username.</div></div>' +
    '<div class="gv-field"><label for="gvPhone">Phone number</label><input class="gv-in" id="gvPhone" type="tel" inputmode="tel" maxlength="16" autocomplete="tel" placeholder="08012345678"></div>' +
    '<div style="margin:6px 0 14px"><altcha-widget id="gvAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget></div>' +
    '<button class="gv-btn" id="gvEnter" type="button" disabled>Enter giveaway</button>' +
    '<div class="gv-steps"><div>1. Fill in your details and pass the captcha.</div><div>2. ' +
    (status.hasFaceId ? 'Scan your face. It is checked against the Face ID already on your account.' : 'You have no Face ID yet. A one-time scan sets it up and saves it to your account for next time.') +
    '</div><div>3. Done. Wait for the draw.</div></div>';
  startTick();

  const btn = document.getElementById('gvEnter');
  document.getElementById('gvAltcha').addEventListener('statechange', (ev) => {
    captchaValue = ev.detail.state === 'verified' ? ev.detail.payload : '';
    btn.disabled = !captchaValue;
  });
  btn.addEventListener('click', onEnter);
}

function setMsg(text){
  const el = document.getElementById('gvMsg');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('show', !!text);
  if (text) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function loadClaimFaceModule() {
  try { return await import('/claim-face.js'); }
  catch (e) { return await import('/claim-face.js?r=' + Date.now()); }
}

async function onEnter(){
  const btn = document.getElementById('gvEnter');
  const name = document.getElementById('gvName').value.trim();
  const phone = document.getElementById('gvPhone').value.trim();
  setMsg('');
  if (name.length < 2) return setMsg('Enter your full name.');
  if (!/^(\\+?234\\d{10}|0\\d{10})$/.test(phone.replace(/[\\s-]/g, ''))) return setMsg('Enter a valid phone number, like 08012345678.');
  if (!captchaValue) return setMsg('Please complete the captcha first.');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return setMsg('Camera access is not supported on this browser.');

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="gv-spin"></span>Opening camera...';
  try {
    let cap;
    if (status.hasFaceId) {
      const claim = await loadClaimFaceModule();
      cap = await claim.captureClaimFace();
      btn.innerHTML = '<span class="gv-spin"></span>Submitting...';
    } else {
      const { captureFaceDescriptor } = await import('/face-scan.js');
      cap = await captureFaceDescriptor({ returnSamples: true });
      btn.innerHTML = '<span class="gv-spin"></span>Saving your Face ID...';
      await api('/api/facescan/enroll', { descriptor: [cap.descriptor].concat(cap.samples), snapshot: cap.snapshot });
      status.hasFaceId = true;
      btn.innerHTML = '<span class="gv-spin"></span>Submitting...';
    }
    await api('/api/giveaway/enter', {
      name,
      phone,
      altcha: captchaValue,
      faceDescriptor: (cap.samples && cap.samples.length) ? cap.samples.map((v) => ({ v })) : cap.descriptor,
      snapshot: cap.snapshot,
    });
    status.entered = true;
    showEntered();
  } catch (err) {
    if (err.status === 409 && /ended/i.test(err.message)) { showEnded(); return; }
    if (/Face Id not Set/i.test(err.message || '')) {
      status.hasFaceId = false;
      setMsg('Your Face ID is not set yet. Tap Enter giveaway again to set it up once.');
    } else {
      setMsg(err.message || 'Could not enter the giveaway.');
    }
    if (/captcha/i.test(err.message)) { captchaValue = ''; const w = document.getElementById('gvAltcha'); if (w && w.reset) w.reset(); }
    btn.innerHTML = original;
    btn.disabled = !captchaValue;
  }
}

async function load(){
  try {
    status = await api('/api/giveaway/status');
  } catch (err) {
    setCenter(true);
    card.innerHTML = '<div class="gv-state"><div class="gv-ico off">' + CLOCK + '</div><h2>Could not load</h2><p>' + esc(err.message) + '</p></div>';
    return;
  }
  clockOffset = (status.serverNow || Date.now()) - Date.now();
  if (!status.open) return showEnded();
  if (status.entered) return showEntered();
  showForm();
  if (status.hasFaceId) import('/claim-face.js').then((m) => m.preloadClaimFaceModels()).catch(() => {});
  else import('/face-scan.js').then((m) => m.preloadFaceModels()).catch(() => {});
}
load();

var gvClip = document.getElementById('gvViewsClip');
var gvTrack = document.getElementById('gvViewsTrack');
var gvPanelGive = document.getElementById('view-giveaway');
var gvPanelSpin = document.getElementById('view-spin');
function gvSyncHeight(){
  var p = gvTrack.classList.contains('show-spin') ? gvPanelSpin : gvPanelGive;
  gvClip.style.height = p.scrollHeight + 'px';
}
if (window.ResizeObserver) { var gvRo = new ResizeObserver(gvSyncHeight); gvRo.observe(gvPanelGive); gvRo.observe(gvPanelSpin); }
window.addEventListener('resize', gvSyncHeight);
function showGiveawayView(){ gvTrack.classList.remove('show-spin'); gvSyncHeight(); window.scrollTo(0, 0); }
function showSpinView(){ gvTrack.classList.add('show-spin'); gvSyncHeight(); window.scrollTo(0, 0); swLoad(); }
document.getElementById('gvSwipeHint').addEventListener('click', function(){
  if (gvTrack.classList.contains('show-spin')) showGiveawayView(); else showSpinView();
});
(function(){
  var startX = 0, startY = 0, dragging = false, moved = false;
  function skip(t){ return t && t.closest && t.closest('input,textarea,select,video,canvas'); }
  function onStart(x, y, t){ if (skip(t)) return; startX = x; startY = y; dragging = true; moved = false; }
  function onMove(x, y, evt){
    if (!dragging) return;
    var dx = x - startX, dy = y - startY;
    if (!moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
    if (moved && evt && evt.cancelable) evt.preventDefault();
  }
  function onEnd(x){
    if (!dragging) return;
    dragging = false;
    if (moved && Math.abs(x - startX) > 50) { if (gvTrack.classList.contains('show-spin')) showGiveawayView(); else showSpinView(); }
  }
  gvClip.addEventListener('touchstart', function(e){ onStart(e.touches[0].clientX, e.touches[0].clientY, e.target); }, { passive: true });
  gvClip.addEventListener('touchmove', function(e){ onMove(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
  gvClip.addEventListener('touchend', function(e){ onEnd(e.changedTouches[0].clientX); });
  gvClip.addEventListener('mousedown', function(e){ onStart(e.clientX, e.clientY, e.target); });
  gvClip.addEventListener('mousemove', function(e){ onMove(e.clientX, e.clientY, e); });
  window.addEventListener('mouseup', function(e){ onEnd(e.clientX); });
})();

var SW_COIN = '<span class="cr-coin-ico"><i></i><i></i><i></i></span>';
var SW_LABELS = {
  livetv: ['+5', 'Live TV API'],
  devapi: ['+5', 'Dev API'],
  verify1d: ['1 Day', 'Verified'],
  naira: ['₦100', ''],
  nothing: ['Nothing', '']
};
var sw = { loaded: false, loading: false, cost: 10, coins: 0, segments: [], rot: 0, busy: false };

var swAudio = null;
var swSoundOn = true;
function swCtx(){
  try {
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!swAudio) swAudio = new C();
    if (swAudio.state === 'suspended') swAudio.resume();
    return swAudio;
  } catch (e) { return null; }
}
function swTone(freq, at, len, vol, type, endFreq){
  if (!swSoundOn) return;
  var c = swCtx();
  if (!c) return;
  var t = c.currentTime + at;
  var o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + len);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + len + 0.02);
}
function swTick(){ swTone(1500 + Math.random() * 90, 0, 0.05, 0.1, 'square', 800); }
function swWinSound(){
  [523.25, 659.25, 783.99, 1046.5].forEach(function(f, i){ swTone(f, i * 0.11, 0.34, 0.16, 'triangle'); });
  swTone(1568, 0.5, 0.5, 0.1, 'sine');
  swTone(2093, 0.6, 0.55, 0.07, 'sine');
}
function swNothingSound(){
  swTone(330, 0, 0.3, 0.14, 'sine', 220);
  swTone(247, 0.24, 0.45, 0.14, 'sine', 150);
}
function swTickLoop(wheel, startRot, ms){
  var segDeg = 360 / (sw.segments.length || 6);
  var cum = startRot, last = 0, lastSeg = Math.floor(startRot / segDeg), lastAt = 0, begin = performance.now();
  function angle(){
    var m = getComputedStyle(wheel).transform;
    if (!m || m === 'none') return 0;
    var v = m.slice(m.indexOf('(') + 1, m.indexOf(')')).split(',');
    return Math.atan2(parseFloat(v[1]), parseFloat(v[0])) * 180 / Math.PI;
  }
  last = angle();
  function frame(now){
    var a = angle(), d = a - last;
    if (d < -180) d += 360;
    if (d > 180) d -= 360;
    cum += d; last = a;
    var seg = Math.floor(cum / segDeg);
    if (seg !== lastSeg) { lastSeg = seg; if (now - lastAt > 30) { swTick(); lastAt = now; } }
    if (now - begin < ms) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
var swCard = document.getElementById('spinCard');
swCard.innerHTML = '<div class="gv-skel"></div>';

function swWheelSvg(segments){
  var n = segments.length, R = 100, out = '';
  function pt(deg, r){ var a = deg * Math.PI / 180; return (r * Math.sin(a)).toFixed(2) + ' ' + (-r * Math.cos(a)).toFixed(2); }
  for (var i = 0; i < n; i++) {
    var a0 = i * 360 / n, a1 = (i + 1) * 360 / n, mid = (a0 + a1) / 2;
    var lab = SW_LABELS[segments[i].type] || ['', ''];
    out += '<path class="seg ' + segments[i].type + '" d="M0 0 L' + pt(a0, R) + ' A' + R + ' ' + R + ' 0 0 1 ' + pt(a1, R) + ' Z"/>';
    out += '<g transform="rotate(' + mid + ')"><text y="-70" font-size="' + (n > 8 ? (lab[0].length > 5 ? 7.5 : 9.5) : (lab[0].length > 6 ? 9 : 12)) + '">' + esc(lab[0]) + '</text>' +
      (lab[1] ? '<text class="dim" y="-60" font-size="' + (n > 8 ? 5.2 : 7.5) + '">' + esc(lab[1]) + '</text>' : '') + '</g>';
  }
  return '<svg viewBox="-100 -100 200 200" aria-hidden="true">' + out + '</svg>';
}

function swRender(){
  swCard.innerHTML =
    '<div class="gv-eyebrow">Spin the Wheel</div>' +
    '<div class="gv-title">Spin to win</div>' +
    '<div class="gv-sub">Each spin costs ' + sw.cost + ' coins. Win API requests, free verification or cash.</div>' +
    '<div class="sw-top" style="margin-top:14px"><a class="cr-coin" id="swChip" href="/account#rewards">' + SW_COIN + '<span id="swCoins">' + sw.coins + '</span></a>' +
    '</div>' +
    '<div class="sw-stage"><div class="sw-ring"></div><div class="sw-pointer"></div>' +
    '<div class="sw-wheel" id="swWheel">' + swWheelSvg(sw.segments) + '</div>' +
    '<div class="sw-hub">' + SW_COIN + '</div></div>' +
    '<div class="sw-msg" id="swMsg"></div>' +
    '<button class="gv-btn sw-btn" id="swSpin" type="button"></button>' +
    '<details class="sw-learn"><summary>What can I win?</summary><ul>' +
    '<li><b>+5 Live TV API requests</b> added to your monthly limit</li>' +
    '<li><b>+5 Developer API requests</b> added to your monthly limit</li>' +
    '<li><b>1 day of account verification</b></li>' +
    '<li><b>₦100</b> added to your wallet</li></ul></details>';
  document.getElementById('swSpin').addEventListener('click', swSpin);
  document.getElementById('swWheel').style.transform = 'rotate(' + sw.rot + 'deg)';
  swButton();
  gvSyncHeight();
}

function swButton(){
  var b = document.getElementById('swSpin');
  if (!b) return;
  if (sw.busy) { b.disabled = true; b.innerHTML = 'Spinning...'; return; }
  b.disabled = false;
  b.innerHTML = sw.coins < sw.cost ? 'Get coins' : 'Spin for ' + SW_COIN + ' ' + sw.cost;
}
function swMsg(text, err){ var m = document.getElementById('swMsg'); if (m) { m.textContent = text || ''; m.className = 'sw-msg' + (err ? ' err' : ''); } }
function swSetCoins(v, bump){
  sw.coins = v;
  var el = document.getElementById('swCoins'), chip = document.getElementById('swChip');
  if (el) el.textContent = String(v);
  if (bump && chip) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
  swButton();
}
function swGoCoins(){
  swMsg('You need ' + sw.cost + ' coins to spin. Taking you to your account...', true);
  setTimeout(function(){ location.href = '/account#rewards'; }, 900);
}

async function swLoad(){
  if (sw.loaded || sw.loading) return;
  sw.loading = true;
  try {
    var d = await api('/api/giveaway/spin');
    sw.cost = d.cost || 10; sw.coins = d.coinBalance || 0; sw.segments = d.segments || [];
    sw.loaded = true;
    swRender();
  } catch (err) {
    swCard.innerHTML = '<div class="gv-state"><div class="gv-ico off">' + CLOCK + '</div><h2>Could not load</h2><p>' + esc(err.message) + '</p></div>';
    gvSyncHeight();
  }
  sw.loading = false;
}

async function swSpin(){
  if (sw.busy) return;
  if (sw.coins < sw.cost) return swGoCoins();
  swCtx();   // this tap lets the browser play sound
  sw.busy = true; swMsg(''); swButton();
  var res;
  try {
    res = await api('/api/giveaway/spin', {});
  } catch (err) {
    sw.busy = false; swButton();
    if (err.status === 402) { sw.coins = 0; return swGoCoins(); }
    return swMsg(err.message, true);
  }
  swSetCoins(res.coinBalance, true);
  var n = sw.segments.length, per = 360 / n;
  var jitter = (Math.random() - 0.5) * per * 0.6;
  var want = (((-(res.segment * per + per / 2 + jitter)) % 360) + 360) % 360;
  var cur = ((sw.rot % 360) + 360) % 360;
  var startRot = sw.rot;
  sw.rot = sw.rot + 360 * 6 + ((want - cur + 360) % 360);
  var wheel = document.getElementById('swWheel');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  wheel.style.transform = 'rotate(' + sw.rot + 'deg)';
  swTickLoop(wheel, startRot, reduce ? 300 : 5300);
  setTimeout(function(){
    if (res.outcome === 'nothing') swNothingSound(); else swWinSound();
    swPopup(res, function(){ sw.busy = false; swButton(); });
  }, reduce ? 250 : 5400);
}

function swPopup(res, onClose){
  var win = res.outcome !== 'nothing';
  var info = {
    livetv: ['You won!', '+5', 'LIVE TV API REQUESTS', 'Added to your Live TV API limit for this month.'],
    devapi: ['You won!', '+5', 'DEVELOPER API REQUESTS', 'Added to your Developer API limit for this month.'],
    verify1d: ['You won!', '1 DAY', 'VERIFIED', res.verifiedUntil ? 'Your account is verified until ' + new Date(res.verifiedUntil).toLocaleString() + '.' : 'Your account is verified for a day.'],
    naira: ['You won!', '₦100', 'ADDED TO YOUR WALLET', 'See it under Rewards on your account page.'],
    nothing: ['No luck this time', '', '', 'Nothing on this spin. Give it another go!']
  }[res.outcome] || ['Done', '', '', ''];
  var ov = document.createElement('div');
  ov.className = 'sp-ov';
  var card = document.createElement('div');
  card.className = 'sp-card';
  var html = '<div class="sp-glow"></div>';
  if (win) {
    for (var i = 0; i < 10; i++) {
      var ang = Math.PI * 2 * i / 10;
      html += '<i class="sp-spark" style="--dx:' + Math.round(Math.cos(ang) * (70 + (i % 3) * 14)) + 'px;--dy:' + Math.round(Math.sin(ang) * (60 + (i % 3) * 12)) + 'px;animation-delay:' + (0.5 + (i % 5) * 0.12) + 's"></i>';
    }
  }
  html += '<div class="sp-box">' + GIFT + '</div><div class="sp-title">' + esc(info[0]) + '</div>';
  if (win) html += '<div class="sp-amt">' + esc(info[1]) + '<small>' + esc(info[2]) + '</small></div>';
  html += '<div class="sp-sub">' + esc(info[3]) + '</div><button class="sp-btn" type="button">' + (win ? 'Awesome' : 'Spin again') + '</button>';
  card.innerHTML = html;
  ov.appendChild(card);
  document.body.appendChild(ov);
  function close(){ document.removeEventListener('keydown', onKey); ov.remove(); onClose(); }
  function onKey(e){ if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  card.querySelector('.sp-btn').addEventListener('click', close);
}

gvSyncHeight();
if (location.hash === '#spin') showSpinView();
</script>
<script nonce="__CSP_NONCE__" src="/select-overlay.js" defer></script>
</body>
</html>`;
}
