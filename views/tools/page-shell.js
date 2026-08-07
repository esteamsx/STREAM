import { siteHeadFor, SITE } from "../../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "../music-player.js";

export function renderToolPage(cfg, { pageKey, iconSvg, heading, subtitle, bodyHtml, extraStyle = "", script }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${SITE.name}</title>
${siteHeadFor(pageKey)}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script nonce="__CSP_NONCE__" async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
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
html,body{min-height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  padding:24px;padding-bottom:60px;overflow-x:hidden;position:relative;
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
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.wrap{width:100%;max-width:640px;margin:0 auto;position:relative;z-index:1}
.back-row{margin-bottom:14px}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.82rem;font-weight:600}
.back-link:hover{color:var(--accent)}
.back-link svg{width:16px;height:16px}
.page-logo{
  display:flex;align-items:center;gap:10px;margin-bottom:20px;
  font-family:var(--font-display);font-size:1.3rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
h1{font-family:var(--font-display);font-size:1.4rem;margin-bottom:6px;display:flex;align-items:center;gap:10px}
h1 svg{width:22px;height:22px;color:var(--accent);flex-shrink:0}
.subtitle{color:var(--muted);font-size:.85rem;margin-bottom:22px;line-height:1.6}

.tool-card{
  position:relative;
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:22px;margin-bottom:16px;
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
}
:root[data-theme="light"] .tool-card{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
}
label{display:block;font-size:.76rem;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
input[type=text],textarea,select{
  width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-family:var(--font-mono);font-size:.85rem;
}
textarea{resize:vertical;min-height:100px}
input[type=text]:focus,textarea:focus,select:focus{outline:2px solid var(--accent);outline-offset:-1px}

.xsel{position:relative}
.xsel>select{position:absolute;opacity:0;width:0;height:0;padding:0;border:0;pointer-events:none}
.xsel-btn{
  width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
  background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-family:var(--font-mono);font-size:.85rem;
  text-align:left;cursor:pointer;transition:border-color .18s var(--ease);
}
.xsel-btn:hover,.xsel.open .xsel-btn{border-color:var(--accent)}
.xsel-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.xsel-chev{width:15px;height:15px;color:var(--muted);flex-shrink:0;transition:transform .2s var(--ease)}
.xsel.open .xsel-chev{transform:rotate(180deg)}
.xsel-list{
  display:none;position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:50;
  max-height:240px;overflow-y:auto;overscroll-behavior:contain;padding:6px;
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),var(--card);
  border:1px solid rgba(255,255,255,.18);border-radius:12px;
  box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);
}
.xsel.open .xsel-list{display:block}
.xsel-opt{
  padding:9px 10px;border-radius:8px;font-family:var(--font-body);font-size:.84rem;
  color:var(--text);cursor:pointer;
}
.xsel-opt:hover,.xsel-opt.active{background:var(--card2);color:var(--accent)}
.xsel-opt.disabled{opacity:.45;cursor:not-allowed}
.xsel-list::-webkit-scrollbar{width:4px}
.xsel-list::-webkit-scrollbar-track{background:transparent}
.xsel-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}
:root[data-theme="light"] .xsel-list{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),var(--card);
  border:1px solid rgba(255,255,255,.6);
  box-shadow:0 12px 30px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
}
:root[data-theme="light"] .xsel-list::-webkit-scrollbar-thumb{background:rgba(20,20,28,.22)}
.field{margin-bottom:14px}
.field-row{display:flex;gap:10px}
.field-row .field{flex:1}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:11px 18px;border-radius:10px;
  font-family:var(--font-body);font-size:.85rem;font-weight:600;cursor:pointer;border:none;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04121a;
  transition:opacity .18s var(--ease),transform .1s var(--ease);width:100%;
}
.btn:hover{opacity:.92}
.btn:active{transform:scale(.98)}
.btn:disabled{opacity:.5;cursor:not-allowed}
@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{width:13px;height:13px;border:2px solid rgba(4,18,26,.35);border-top-color:#04121a;border-radius:50%;display:inline-block;animation:spin .6s linear infinite}

.tool-msg{font-size:.8rem;margin-top:10px;padding:10px 12px;border-radius:9px;display:none;line-height:1.5}
.tool-msg.show{display:block}
.tool-msg.err{background:rgba(255,59,92,.1);color:var(--red);border:1px solid rgba(255,59,92,.25)}
.tool-msg.ok{background:rgba(18,196,139,.1);color:var(--green);border:1px solid rgba(18,196,139,.25)}

.result-box{margin-top:16px;display:none}
.result-box.show{display:block}
.result-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.result-head span{font-size:.76rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.copy-btn{
  background:var(--card2);border:1px solid var(--border-strong);color:var(--text);
  font-size:.72rem;font-weight:600;padding:5px 10px;border-radius:7px;cursor:pointer;
  display:inline-flex;align-items:center;gap:4px;text-decoration:none;
}
.copy-btn:hover{background:var(--dark3)}
.copy-btn:disabled{opacity:.7;cursor:default}
@keyframes spinSm{to{transform:rotate(360deg)}}
.btn-spinner-sm{width:10px;height:10px;border:2px solid rgba(255,255,255,.25);border-top-color:currentColor;border-radius:50%;display:inline-block;animation:spinSm .6s linear infinite}
@keyframes dlPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
.dl-check{width:12px;height:12px;animation:dlPop .3s var(--ease);color:var(--green)}

.file-drop{
  border:1.5px dashed var(--border-strong);border-radius:10px;padding:14px;text-align:center;
  cursor:pointer;transition:border-color .18s var(--ease),background .18s var(--ease);margin-bottom:10px;
}
.file-drop:hover,.file-drop.drag{border-color:var(--accent);background:var(--card2)}
.file-drop input{display:none}
.file-drop-label{font-size:.78rem;color:var(--muted);pointer-events:none}
.file-drop-label b{color:var(--accent)}
.file-drop-name{font-size:.76rem;color:var(--text);margin-top:6px;font-family:var(--font-mono);pointer-events:none}
.or-divider{text-align:center;font-size:.7rem;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin:10px 0}
pre.result-pre{
  background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:14px 16px;
  overflow-x:auto;font-family:var(--font-mono);font-size:.78rem;line-height:1.6;white-space:pre-wrap;word-break:break-all;
  max-height:400px;overflow-y:auto;
}
.result-table{width:100%;border-collapse:collapse;font-size:.82rem}
.result-table td{padding:7px 4px;border-bottom:1px solid var(--border);vertical-align:top}
.result-table td:first-child{color:var(--muted);white-space:nowrap;padding-right:14px;font-weight:600}
.result-img{max-width:220px;display:block;margin:6px auto;border-radius:10px;border:1px solid var(--border-strong)}

.altcha-row{margin:14px 0}
altcha-widget{--altcha-max-width:100%}
.usage-note{font-size:.72rem;color:var(--muted2);text-align:center;margin-top:12px;line-height:1.5}
${musicPlayerStyle()}
${extraStyle}
</style>
</head>
<body>

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

<div class="wrap">
  <div class="back-row">
    <a href="/tools" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
      Back
    </a>
  </div>
  <div class="page-logo">
    <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:24px;height:24px;flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
    ES TEAMS TV
  </div>

  <h1>${iconSvg}${heading}</h1>
  <p class="subtitle">${subtitle}</p>

  <div class="tool-card">
    ${bodyHtml}
    <div class="altcha-row">
      <altcha-widget id="toolAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget>
    </div>
    <button class="btn" id="toolSubmitBtn" type="button" disabled>Run</button>
    <div class="tool-msg" id="toolMsg"></div>
    <div class="result-box" id="toolResult"></div>
  </div>
  <p class="usage-note">Free accounts: ${3} uses per day per tool. <a href="/account#pwCard">Get verified</a> for unlimited use.</p>
</div>
${musicPlayerHtml()}

<script nonce="__CSP_NONCE__">
(function(){
  var toolAltcha = document.getElementById('toolAltcha');
  var submitBtn = document.getElementById('toolSubmitBtn');
  var msgEl = document.getElementById('toolMsg');
  var resultEl = document.getElementById('toolResult');
  var altchaValue = '';
  var altchaPassed = false;
  var extraValid = true;

  function updateSubmitState(){ submitBtn.disabled = !(altchaPassed && extraValid); }
  function setExtraValid(v){ extraValid = v; updateSubmitState(); }

  toolAltcha.addEventListener('statechange', function(ev){
    var state = ev.detail.state;
    altchaPassed = state === 'verified';
    altchaValue = altchaPassed ? ev.detail.payload : '';
    updateSubmitState();
  });

  function showMsg(text, ok){ msgEl.textContent = text; msgEl.className = 'tool-msg show ' + (ok ? 'ok' : 'err'); }
  function hideMsg(){ msgEl.className = 'tool-msg'; }
  function hideResult(){ resultEl.className = 'result-box'; resultEl.innerHTML = ''; }
  function showResult(){ resultEl.className = 'result-box show'; }
  function esc(s){ var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

  async function postTool(url, extraFields){
    var body = Object.assign({}, extraFields, { altcha: altchaValue });
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function resetAltcha(){
    if (toolAltcha.reset) toolAltcha.reset();
    altchaPassed = false; altchaValue = '';
    updateSubmitState();
  }

  function triggerBlobDownload(content, filename, mime){
    var blob = new Blob([content], { type: mime || 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  }

  function triggerDataUrlDownload(dataUrl, filename){
    var a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function bindAnimatedDownload(btnEl, performDownload){
    btnEl.addEventListener('click', function(){
      if (btnEl.disabled) return;
      var original = btnEl.innerHTML;
      btnEl.disabled = true;
      btnEl.innerHTML = '<span class="btn-spinner-sm"></span>Preparing…';
      setTimeout(function(){
        var ok = true;
        try { performDownload(); } catch (e) { ok = false; }
        btnEl.innerHTML = ok
          ? '<svg class="dl-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Downloaded'
          : original;
        setTimeout(function(){ btnEl.disabled = false; btnEl.innerHTML = original; }, 1600);
      }, 450);
    });
  }

  function enhanceSelect(sel){
    if (sel.getAttribute('data-xsel')) return;
    sel.setAttribute('data-xsel', '1');

    var wrap = document.createElement('div');
    wrap.className = 'xsel';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'xsel-btn';
    btn.innerHTML = '<span class="xsel-label"></span><svg class="xsel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>';
    wrap.appendChild(btn);

    var list = document.createElement('div');
    list.className = 'xsel-list';
    wrap.appendChild(list);

    var lbl = btn.querySelector('.xsel-label');

    function syncLabel(){
      var o = sel.options[sel.selectedIndex];
      lbl.textContent = o ? o.textContent : '';
    }
    function buildList(){
      list.innerHTML = '';
      Array.prototype.forEach.call(sel.options, function(o, i){
        var item = document.createElement('div');
        item.className = 'xsel-opt' + (i === sel.selectedIndex ? ' active' : '') + (o.disabled ? ' disabled' : '');
        item.textContent = o.textContent;
        item.setAttribute('data-i', String(i));
        list.appendChild(item);
      });
    }
    function close(){ wrap.classList.remove('open'); }

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var opening = !wrap.classList.contains('open');
      document.querySelectorAll('.xsel.open').forEach(function(w){ w.classList.remove('open'); });
      if (opening) { buildList(); syncLabel(); wrap.classList.add('open'); }
    });

    list.addEventListener('click', function(e){
      var opt = e.target.closest('.xsel-opt');
      if (!opt || opt.classList.contains('disabled')) return;
      e.stopPropagation();
      sel.selectedIndex = Number(opt.getAttribute('data-i'));
      syncLabel();
      close();
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    sel.addEventListener('change', syncLabel);

    if (window.MutationObserver) {
      new MutationObserver(function(){ syncLabel(); if (wrap.classList.contains('open')) buildList(); })
        .observe(sel, { childList: true, subtree: true, characterData: true });
    }

    syncLabel();
  }

  function enhanceAllSelects(){
    document.querySelectorAll('select:not([data-xsel])').forEach(enhanceSelect);
  }
  document.addEventListener('click', function(){
    document.querySelectorAll('.xsel.open').forEach(function(w){ w.classList.remove('open'); });
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') document.querySelectorAll('.xsel.open').forEach(function(w){ w.classList.remove('open'); });
  });
  enhanceAllSelects();

  ${script}

  enhanceAllSelects();
})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
