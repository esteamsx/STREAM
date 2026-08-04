import { siteHeadFor, SITE } from "../../config/site.js";
import { musicPlayerStyle, musicPlayerHtml, musicPlayerScript } from "../music-player.js";

export function renderToolPage(cfg, { pageKey, iconSvg, heading, subtitle, bodyHtml, extraStyle = "", script }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${SITE.name}</title>
${siteHeadFor(pageKey)}
<script>(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
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
  padding:24px;padding-bottom:60px;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
a{color:var(--accent);text-decoration:none}
button{font-family:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.wrap{width:100%;max-width:640px;margin:0 auto}
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

.tool-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:16px}
label{display:block;font-size:.76rem;font-weight:600;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}
input[type=text],textarea,select{
  width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-family:var(--font-mono);font-size:.85rem;
}
textarea{resize:vertical;min-height:100px}
input[type=text]:focus,textarea:focus,select:focus{outline:2px solid var(--accent);outline-offset:-1px}
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

<script>
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

  ${script}
})();
${musicPlayerScript()}
</script>
</body>
</html>`;
}
