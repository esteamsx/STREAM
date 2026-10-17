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

<main class="gv-wrap">
  <div class="gv-card" id="gvCard"><div class="gv-skel"></div></div>
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
</script>
<script nonce="__CSP_NONCE__" src="/select-overlay.js" defer></script>
</body>
</html>`;
}
