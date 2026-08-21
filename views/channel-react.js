import { siteHeadFor } from "../config/site.js";

const PAGE_BUILD = "cr-16";

export function renderChannelReact(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("channelReact")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<script nonce="__CSP_NONCE__" async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--accent:#00E0FF;--accent2:#7c5cff;--green:#12C48B;--amber:#F5A623;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
  --card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);
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
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);min-height:100%;
  overflow-x:hidden;position:relative;
}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
.cr-support-fab{
  position:fixed;right:20px;bottom:24px;z-index:90;width:48px;height:48px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#04141a;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4);
  cursor:pointer;transition:transform .15s var(--ease);
}
.cr-support-fab:active{transform:scale(.94)}
.cr-support-fab svg{width:21px;height:21px}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.cr-nav{
  position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
}
.cr-back{
  display:inline-flex;align-items:center;gap:5px;background:none;border:none;color:var(--muted);
  font-size:.83rem;font-weight:600;padding:6px 2px;transition:color .2s var(--ease);
}
.cr-back:hover{color:var(--accent)}
.cr-back svg{width:18px;height:18px}
.cr-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;flex:1}
.cr-hero-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.cr-coin{display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 6px;border-radius:20px;
  text-decoration:none;flex-shrink:0;
  background:rgba(0,224,255,.09);border:1px solid rgba(0,224,255,.28);
  font-size:.8rem;font-weight:700;color:var(--accent);font-family:var(--font-mono);
  transition:border-color .2s var(--ease),background .2s var(--ease)}
.cr-coin:hover{background:rgba(0,224,255,.16);border-color:rgba(0,224,255,.5)}
.cr-coin-ico{width:21px;height:21px;position:relative;flex-shrink:0}
.cr-coin-ico i{position:absolute;left:0;width:21px;height:14px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.32)}
.cr-coin-ico i:nth-child(1){top:7px;opacity:.5}
.cr-coin-ico i:nth-child(2){top:3.5px;opacity:.75}
.cr-coin-ico i:nth-child(3){top:0;box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.4),0 0 8px rgba(0,224,255,.3)}
.cr-coin-ico i:nth-child(3)::after{content:"";position:absolute;inset:3.5px 6px;border-radius:50%;
  border:1.2px solid rgba(4,18,26,.45)}
.cr-coin.bump{animation:coinBump .5s var(--ease)}
@keyframes coinBump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}
.cr-build{font-family:var(--font-mono);font-size:.62rem;color:var(--muted2);letter-spacing:.04em}

.cr-wrap{position:relative;z-index:1;max-width:660px;margin:0 auto;padding:22px 18px 60px;display:flex;flex-direction:column;gap:16px}

.cr-card{
  background:linear-gradient(155deg,rgba(255,255,255,.06),rgba(255,255,255,.02) 60%);
  border:1px solid var(--border);border-radius:16px;padding:18px;backdrop-filter:blur(12px);
}
:root[data-theme="light"] .cr-card{background:var(--card);box-shadow:0 2px 14px rgba(20,20,28,.06)}
.cr-card-title{font-family:var(--font-display);font-size:1rem;font-weight:700;margin-bottom:5px}
.cr-card-sub{font-size:.79rem;color:var(--muted);line-height:1.55;margin-bottom:16px}

.cr-field{margin-bottom:14px}
.cr-label{display:block;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:7px}
.cr-input{
  width:100%;padding:12px 13px;border-radius:11px;background:rgba(255,255,255,.05);
  border:1px solid var(--border-strong);color:var(--text);font-size:.85rem;outline:none;
  transition:border-color .2s var(--ease);
}
:root[data-theme="light"] .cr-input{background:var(--dark3)}
.cr-input:focus{border-color:rgba(0,224,255,.55)}
.cr-input::placeholder{color:var(--muted2)}

.cr-btn{
  width:100%;padding:13px;border:none;border-radius:12px;font-size:.87rem;font-weight:700;color:#04121a;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;gap:8px;transition:opacity .2s var(--ease);
}
.cr-btn:disabled{opacity:.5;cursor:not-allowed}
.cr-btn svg{width:16px;height:16px}

.cr-spin{
  width:15px;height:15px;border-radius:50%;border:2px solid rgba(4,18,26,.28);border-top-color:#04121a;
  animation:crSpin .7s linear infinite;
}
@keyframes crSpin{to{transform:rotate(360deg)}}

.cr-msg{margin-top:13px;font-size:.79rem;text-align:center;line-height:1.55;min-height:1.1em}
.cr-msg.err{color:var(--red)}
.cr-msg.ok{color:var(--green)}

.cr-bots{display:flex;flex-direction:column;gap:9px}
.cr-bot{
  display:flex;align-items:center;gap:11px;padding:12px;border-radius:12px;
  background:rgba(255,255,255,.04);border:1px solid var(--border);
}
:root[data-theme="light"] .cr-bot{background:var(--dark3)}
.cr-bot-body{flex:1;min-width:0}
.cr-bot-name{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cr-bot-meta{font-size:.71rem;color:var(--muted);margin-top:3px}
.cr-dot{width:9px;height:9px;border-radius:50%;background:var(--muted2);flex-shrink:0}
.cr-dot.on{background:var(--green);box-shadow:0 0 0 3px rgba(18,196,139,.18)}
.cr-dot.off{background:var(--red);box-shadow:0 0 0 3px rgba(255,59,92,.16)}
.cr-role{
  font-size:.63rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  padding:3px 8px;border-radius:20px;background:rgba(0,224,255,.14);color:var(--accent);
  border:1px solid rgba(0,224,255,.28);flex-shrink:0;
}
.cr-role.recv{background:rgba(124,92,255,.14);color:var(--accent2);border-color:rgba(124,92,255,.3)}

.cr-flow{
  display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;margin-bottom:14px;
  background:rgba(0,224,255,.06);border:1px solid rgba(0,224,255,.18);font-size:.75rem;color:var(--muted);
}
.cr-flow b{color:var(--text);font-weight:600}
.cr-flow-arrow{color:var(--accent);font-weight:700}

.cr-empty{text-align:center;padding:26px 14px;font-size:.82rem;color:var(--muted);line-height:1.6}
.cr-empty a{color:var(--accent);text-decoration:none;font-weight:600}

.cr-cmd{
  margin-top:12px;padding:11px 13px;border-radius:10px;background:rgba(0,0,0,.28);
  border:1px solid var(--border);font-family:var(--font-mono);font-size:.72rem;
  color:var(--muted);word-break:break-all;line-height:1.5;
}
:root[data-theme="light"] .cr-cmd{background:var(--dark3);color:var(--text)}
.cr-diag{margin-top:12px;padding:12px 13px;border-radius:11px;background:rgba(255,59,92,.07);
  border:1px solid rgba(255,59,92,.22);font-size:.75rem;line-height:1.6}
.cr-diag-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
.cr-diag-row:last-child{margin-bottom:0}
.cr-diag-mark{font-weight:700;flex-shrink:0}
.cr-diag-mark.on{color:var(--green)}
.cr-diag-mark.off{color:var(--red)}
.cr-diag-detail{color:var(--muted);display:block;margin-top:2px}
.cr-block{color:var(--amber);margin:0 0 10px}
altcha-widget{--altcha-max-width:100%}
.altcha-row{margin:14px 0}
.cr-hint{font-size:.72rem;color:var(--muted);margin-top:7px;line-height:1.5}
.cr-quota{font-size:.73rem;color:var(--muted);margin:-8px 0 14px;line-height:1.5}
.cr-quota a{color:var(--accent);text-decoration:none;font-weight:600}
.cr-hero{padding:4px 2px 2px}
.cr-hero-badge{display:inline-block;flex-shrink:0;font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  padding:5px 10px;border-radius:20px;background:rgba(0,224,255,.12);color:var(--accent);
  border:1px solid rgba(0,224,255,.26)}
.cr-hero-title{font-family:var(--font-display);font-size:1.5rem;font-weight:700;line-height:1.2;letter-spacing:-.02em}
.cr-hero-sub{font-size:.82rem;color:var(--muted);line-height:1.6;margin-top:8px}
.cr-steps{display:flex;flex-direction:column;gap:10px}
.cr-step{display:flex;gap:12px;align-items:flex-start;padding:13px 14px;border-radius:13px;
  background:rgba(255,255,255,.035);border:1px solid var(--border)}
:root[data-theme="light"] .cr-step{background:var(--card)}
.cr-step b{display:block;font-size:.82rem;font-weight:600;margin-bottom:3px}
.cr-step span{font-size:.74rem;color:var(--muted);line-height:1.55}
.cr-step-n{width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  font-size:.7rem;font-weight:700;color:#04121a;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.cr-rules{list-style:none;display:flex;flex-direction:column;gap:10px}
.cr-rules li{position:relative;padding-left:18px;font-size:.77rem;color:var(--muted);line-height:1.6}
.cr-rules li::before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2))}
.cr-rules b{color:var(--text);font-weight:600}
.cr-rules a{color:var(--accent);text-decoration:none;font-weight:600}
.cr-foot{text-align:center;font-size:.68rem;color:var(--muted2);line-height:1.6;padding:4px 0 10px}
.cr-hide{display:none}
</style>
</head>
<body>

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

<div class="cr-nav">
  <button class="cr-back" id="crBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </button>
  <div class="cr-nav-title">Channel Reaction</div>
  <div class="cr-build">${PAGE_BUILD}</div>
</div>

<a href="/account?openSupport=1" class="cr-support-fab" aria-label="Customer Care" title="Customer Care">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13v-1a8 8 0 0116 0v1"/><rect x="2" y="13" width="5" height="7" rx="2"/><rect x="17" y="13" width="5" height="7" rx="2"/><path d="M20 20a4 4 0 01-4 4h-2"/></svg>
</a>

<div class="cr-wrap">

  <div class="cr-hero">
    <div class="cr-hero-top">
      <div class="cr-hero-badge">WhatsApp Tool</div>
      <a class="cr-coin cr-hide" id="coinChip" href="/account#rewards">
        <span class="cr-coin-ico"><i></i><i></i><i></i></span><span id="coinValue">0</span>
      </a>
    </div>
    <h1 class="cr-hero-title">WhatsApp Channel Reaction</h1>
    <p class="cr-hero-sub">Drop a channel post link and reactions land on it in seconds. No app switching, no manual work.</p>
  </div>

  <div id="crSkeleton" class="cr-card">
    <div class="sk-stack">
      <div class="sk-title"></div>
      <div class="sk-line w80"></div>
      <div class="sk-pill"></div>
      <div class="sk-line w30"></div>
      <div class="sk-input"></div>
      <div class="sk-btn full"></div>
    </div>
  </div>

  <script nonce="__CSP_NONCE__">
  setTimeout(function(){
    var sk = document.getElementById('crSkeleton');
    var mn = document.getElementById('crMain');
    if (mn && mn.classList.contains('cr-hide')) {
      mn.classList.remove('cr-hide');
      if (sk) sk.classList.add('cr-hide');
    }
  }, 6000);
  </script>

  <div class="cr-card cr-hide" id="crMain">
    <div class="cr-card-title">React to a channel post</div>
    <div class="cr-card-sub">Paste a WhatsApp channel post link and your own connected bot reacts to that post for you.</div>
    <div class="cr-quota" id="quotaNote"></div>

    <div id="flowBox" class="cr-flow cr-hide">
      <span id="flowText"></span>
    </div>

    <form id="reactForm">
      <div class="cr-field">
        <label class="cr-label" for="channelLink">Channel post link</label>
        <input class="cr-input" id="channelLink" placeholder="https://whatsapp.com/channel/..." autocomplete="off" spellcheck="false">
      </div>
      <div class="altcha-row"><altcha-widget id="crAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget></div>
      <div class="cr-hint cr-block cr-hide" id="blockNote"></div>
      <button class="cr-btn" id="sendBtn" type="submit">
        <span class="cr-spin cr-hide" id="sendSpin"></span>
        <svg id="sendIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
        <span id="sendLabel">Send reaction</span>
      </button>
    </form>
    <div class="cr-msg" id="msg"></div>
    <div class="cr-diag cr-hide" id="diagBox"></div>
    <div class="cr-cmd cr-hide" id="cmdBox"></div>
  </div>

  <div class="cr-steps">
    <div class="cr-step">
      <span class="cr-step-n">1</span>
      <div><b>Copy the post link</b><span>Open the channel post, tap the menu and choose Copy link.</span></div>
    </div>
    <div class="cr-step">
      <span class="cr-step-n">2</span>
      <div><b>Paste it above</b><span>The link ends with the post number, like /5749.</span></div>
    </div>
    <div class="cr-step">
      <span class="cr-step-n">3</span>
      <div><b>Send</b><span>Reactions are delivered from our servers. Nothing runs on your phone.</span></div>
    </div>
  </div>

  <div class="cr-card">
    <div class="cr-card-title">Before you send</div>
    <ul class="cr-rules">
      <li><a href="/account#rewards">5 coins</a> are deducted from your balance for every successful reaction. Nothing is charged if it fails.</li>
      <li>Free accounts get <b>3 reactions a day</b>. Verified accounts get unlimited reactions, still at 5 coins each.</li>
      <li>You get a notification in your account each time coins are deducted.</li>
      <li>The link must be a channel <b>post</b> link, ending with the post number.</li>
    </ul>
  </div>

  <div class="cr-foot">Reactions are processed on ES TEAMS TV servers.</div>

</div>

<script nonce="__CSP_NONCE__">
  const STATUS_LABELS = {
    downloading: 'Downloading', extracting: 'Extracting', starting: 'Starting', installing: 'Installing',
    pairing: 'Awaiting pairing', connected: 'Connected', reconnecting: 'Reconnecting', stopped: 'Stopped',
    crashed: 'Crashed', needs_repair: 'Needs re-pair', disconnected: 'Disconnected', unknown: 'Unknown',
  };
  const LINK_RE = /^https:\\/\\/(?:www\\.)?whatsapp\\.com\\/channel\\/[A-Za-z0-9_-]{8,64}(?:\\/\\d{1,12})?$/;

  const linkInput = document.getElementById('channelLink');
  const sendBtn = document.getElementById('sendBtn');
  const sendLabel = document.getElementById('sendLabel');
  const msg = document.getElementById('msg');
  const cmdBox = document.getElementById('cmdBox');
  const flowBox = document.getElementById('flowBox');
  const flowText = document.getElementById('flowText');
  const quotaNote = document.getElementById('quotaNote');
  const diagBox = document.getElementById('diagBox');
  const blockNote = document.getElementById('blockNote');
  const crSkeleton = document.getElementById('crSkeleton');
  const crMain = document.getElementById('crMain');
  const sendSpin = document.getElementById('sendSpin');
  const sendIcon = document.getElementById('sendIcon');
  const coinChip = document.getElementById('coinChip');
  const coinValue = document.getElementById('coinValue');

  function setCoins(value, bump){
    if (typeof value !== 'number' || !isFinite(value)) return;
    coinValue.textContent = String(value);
    coinChip.classList.remove('cr-hide');
    if (bump) {
      coinChip.classList.remove('bump');
      void coinChip.offsetWidth;
      coinChip.classList.add('bump');
    }
  }
  const crAltcha = document.getElementById('crAltcha');
  let altchaValue = '';
  let altchaPassed = false;
  crAltcha.addEventListener('statechange', function(ev){
    altchaPassed = ev.detail.state === 'verified';
    altchaValue = altchaPassed ? ev.detail.payload : '';
    syncButton();
  });

  let state = { ready: false, free: false, loaded: false, sending: false };

  document.getElementById('crBackBtn').addEventListener('click', function(){
    if (window.history.length > 1) window.history.back();
    else location.href = '/tools';
  });

  function escapeHtml(s){ const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  async function getJSON(url){
    const r = await fetch(url);
    const d = await r.json().catch(function(){ return {}; });
    if(!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }
  async function postJSON(url, body){
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body || {}) });
    const d = await r.json().catch(function(){ return {}; });
    if(!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }

  function setMsg(text, kind){
    msg.textContent = text || '';
    msg.className = 'cr-msg' + (kind ? ' ' + kind : '');
  }

  function blockedReason(){
    if(!state.loaded) return 'Checking availability\u2026';
    if(!state.ready) return 'The reaction service is not available right now.';
    if(!altchaPassed) return 'Complete the verification above first.';
    return '';
  }

  function syncButton(){
    sendBtn.disabled = state.sending || !state.ready || !altchaPassed;
    const why = state.sending ? '' : blockedReason();
    blockNote.textContent = why;
    blockNote.className = why ? 'cr-hint cr-block' : 'cr-hint cr-block cr-hide';
  }



  async function loadStatus(){
    try {
      const data = await getJSON('/api/channel/targets');
      state.ready = !!data.ready;
      state.free = !!data.free;
      state.loaded = true;
      setCoins(data.coinBalance, false);
      crSkeleton.classList.add('cr-hide');
      crMain.classList.remove('cr-hide');
      flowBox.classList.remove('cr-hide');
      flowText.innerHTML = data.free
        ? 'Admin access, no coins and no daily limit'
        : (data.coinCost || 5) + ' coins per reaction' +
          (data.unlimited ? ', unlimited uses' : ', ' + (data.dailyLimit || 3) + ' a day');
      quotaNote.innerHTML = data.unlimited || data.free
        ? ''
        : '<a href="/verify">Get verified</a> for unlimited uses.';
      syncButton();
    } catch (err) {
      state.loaded = true;
      state.ready = false;
      crSkeleton.classList.add('cr-hide');
      crMain.classList.remove('cr-hide');
      syncButton();
    }
  }


  linkInput.addEventListener('input', function(){
    setMsg('');
    cmdBox.classList.add('cr-hide');
  });

  document.getElementById('reactForm').addEventListener('submit', async function(e){
    e.preventDefault();
    if(state.sending) return;

    const link = linkInput.value.trim();
    if(!link){ setMsg('Paste a channel post link first.', 'err'); return; }
    if(!/^https:\\/\\/(www\\.)?whatsapp\\.com\\/channel\\//i.test(link)){
      setMsg('The link must start with https://whatsapp.com/channel/', 'err');
      return;
    }
    if(!LINK_RE.test(link)){
      setMsg('That link is missing the post number at the end, like /5749.', 'err');
      return;
    }
    const blocked = blockedReason();
    if(blocked){ setMsg(blocked, 'err'); return; }

    state.sending = true;
    syncButton();
    sendLabel.textContent = 'Sending…';
    sendSpin.classList.remove('cr-hide');
    sendIcon.classList.add('cr-hide');
    setMsg('');
    cmdBox.classList.add('cr-hide');
    try {
      const body = { link: link, altcha: altchaValue };
      const res = await postJSON('/api/channel/react', body);
      setMsg(res.message || 'Whatsapp Channel Reaction Sent', 'ok');
      setCoins(res.coinBalance, true);
      if (crAltcha.reset) crAltcha.reset();
      altchaPassed = false; altchaValue = '';
      linkInput.value = '';
    } catch (err) {
      setMsg(err.message || 'Could not send that command.', 'err');
      if(state.free) runDiagnose();
    } finally {
      state.sending = false;
      sendLabel.textContent = 'Send reaction';
      sendSpin.classList.add('cr-hide');
      sendIcon.classList.remove('cr-hide');
      syncButton();
    }
  });

  async function runDiagnose(){
    try {
      const d = await getJSON('/api/channel/diagnose');
      if (d.ok) { diagBox.classList.add('cr-hide'); return; }
      diagBox.innerHTML = d.steps.map(function(step){
        return '<div class="cr-diag-row"><span class="cr-diag-mark ' + (step.ok ? 'on' : 'off') + '">' +
          (step.ok ? 'OK' : 'X') + '</span><span>' + escapeHtml(step.name) +
          (step.detail ? '<span class="cr-diag-detail">' + escapeHtml(step.detail) + '</span>' : '') +
          '</span></div>';
      }).join('');
      diagBox.classList.remove('cr-hide');
    } catch (e) {
      diagBox.classList.add('cr-hide');
    }
  }

  loadStatus();
  setInterval(loadStatus, 30000);
</script>
</body>
</html>`;
}
