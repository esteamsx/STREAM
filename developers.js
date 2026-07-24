export function renderDevelopers(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Developer API — ES TEAMS TV</title>
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
code,pre{font-family:var(--font-mono)}
code{background:var(--card2);padding:2px 6px;border-radius:5px;font-size:.85em}
pre{
  background:var(--card2);border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;overflow-x:auto;font-size:.82rem;line-height:1.6;margin:10px 0 18px;
  white-space:pre-wrap;word-break:break-all;
}
.wrap{max-width:920px;margin:0 auto;padding:22px 20px 80px}

/* ── HEADER — same back-link + page-logo pattern used across the site (see privacy.js) ── */
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

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:13px;height:13px;border:2px solid rgba(4,18,26,.35);border-top-color:#04121a;
  border-radius:50%;display:inline-block;flex-shrink:0;animation:spin .6s linear infinite;
}
.btn-spinner-muted{border:2px solid var(--border-strong);border-top-color:var(--accent)}

/* ── HERO ── */
.hero{margin-bottom:26px}
.hero h1{font-family:var(--font-display);font-size:1.7rem;margin-bottom:6px}
.hero p{color:var(--muted);line-height:1.6;font-size:.92rem;max-width:52ch}

/* ── VIEW SWITCH ── */
#view-docs{display:none}

/* ── GRID / CARDS ── */
.dash-grid{display:grid;grid-template-columns:1fr;gap:16px}
@media(min-width:760px){ .dash-grid{grid-template-columns:1fr 1fr} .dash-grid .span2{grid-column:1/-1} }
.dcard{
  background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:18px;position:relative;overflow:hidden;
}
.dcard-head{display:flex;align-items:center;gap:9px;margin-bottom:14px}
.dcard-icon{width:28px;height:28px;border-radius:9px;background:var(--card2);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0}
.dcard-icon svg{width:15px;height:15px}
.dcard-title{font-family:var(--font-display);font-size:.95rem;font-weight:700}
.dcard-sub{font-size:.72rem;color:var(--muted);margin-top:1px}

/* ── API KEY CARD ── */
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
.dcard-msg{font-size:.74rem;margin-top:8px;min-height:1em}
.dcard-msg.ok{color:var(--green)}
.dcard-msg.err{color:var(--red)}

/* ── CHANNELS CARD ── */
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

/* ── TRY IT CARD ── */
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
</style>
</head>
<body>
<div class="wrap">

  <!-- ══════════════════════════ DASHBOARD VIEW ══════════════════════════ -->
  <div id="view-dash">

    <div class="back-row">
      <a href="/" class="back-link">
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
      <h1>Developer API</h1>
      <p>Pull live channels into your own site, bot, or app — manage your key, test a real request, and watch your usage, all from one place.</p>
    </div>

    <div class="dash-grid">

      <!-- API KEY -->
      <div class="dcard span2" id="keyCard">
        <div class="dcard-head">
          <span class="dcard-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
          <div>
            <div class="dcard-title">API Key</div>
            <div class="dcard-sub">Up to 5 keys per account · shown once at creation</div>
          </div>
        </div>
        <div id="keyCardBody"><div class="ch-loading">Loading…</div></div>
      </div>

      <!-- CHANNELS -->
      <div class="dcard" id="channelsCard">
        <div class="dcard-head">
          <span class="dcard-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 20h8"/><path d="M7 7l3-4M17 7l-3-4"/></svg>
          </span>
          <div>
            <div class="dcard-title">Channels</div>
            <div class="dcard-sub" id="chCountSub">Loading…</div>
          </div>
        </div>
        <div class="field ch-search">
          <input type="text" id="chSearchInput" placeholder="Filter channels…">
        </div>
        <div class="ch-list" id="chList"><div class="ch-loading">Loading channels…</div></div>
      </div>

      <!-- TRY IT -->
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
            <select id="tryitChannelSelect"></select>
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

    </div>

  </div>

  <!-- ══════════════════════════ DOCUMENTATION VIEW ══════════════════════════ -->
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

    <h1>Developer API</h1>
    <p class="doc-p">Pull live channels into your own site, bot, or app — with a key tied to your account, and a link that never exposes the real stream source.</p>

    <h2 class="doc-h2">Getting a key</h2>
    <p class="doc-p">Create an API key from the <a href="#" id="docsToDashLink1">API Dashboard</a>. The raw key is shown once, so save it somewhere safe. You can have up to 5 keys, and revoke any of them at any time.</p>

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
    <p class="doc-p">Give it a channel id (e.g. <code>nickelodeon</code>) and get back a watermarked, single-use embed link. It is <strong>not</strong> the real stream URL — it's a short-lived link to our own player, which is the only thing that ever talks to the actual source.</p>
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
    <p class="doc-p">Or, in a Telegram bot, send it as a link or a Web App button so it opens in-app. Either way, viewers see the ES TEAMS TV watermark on the player — that stays on regardless of where it's embedded.</p>

    <h2 class="doc-h2">Link lifetime</h2>
    <table>
      <tr><th>Thing</th><th>Expires after</th></tr>
      <tr><td>Embed link (<code>embed_url</code>)</td><td>6 hours</td></tr>
    </table>
    <p class="doc-p">Once a link expires, call <code>/api/v1/stream/:channel</code> again for a fresh one. Don't try to cache or redistribute the underlying player URL past its expiry — it stops working, by design.</p>

    <h2 class="doc-h2">Rate limits &amp; monthly usage</h2>
    <p class="doc-p">30 requests per minute per API key on the issuance endpoints — plenty for normal use, since it's one call per viewer session, not per segment. On top of that, every account has a monthly allowance of 100 requests, shared across all your keys — it's tied to your account, so revoking a key and creating a new one doesn't reset it. Requests past the monthly limit get a <code>429</code> until it resets the following month. Track it on your <a href="#" id="docsToDashLink2">API Dashboard</a>.</p>

    <h2 class="doc-h2">Errors</h2>
    <table>
      <tr><th>Status</th><th>Meaning</th></tr>
      <tr><td>401</td><td>Missing, invalid, or revoked API key</td></tr>
      <tr><td>404</td><td>Unknown channel id — check <code>/api/v1/channels</code></td></tr>
      <tr><td>429</td><td>Per-minute rate limit hit, or the account's monthly request limit is reached</td></tr>
      <tr><td>502</td><td>Could not reach the stream source — try again shortly</td></tr>
    </table>

    <div class="note">This is an early version of the API. Endpoints and limits may change — nothing here is guaranteed stable yet.</div>

  </div>

</div>

<script>
(function(){
  'use strict';

  /* ── view switching ── */
  var viewDash = document.getElementById('view-dash');
  var viewDocs = document.getElementById('view-docs');
  function showDocs(){ viewDash.style.display = 'none'; viewDocs.style.display = 'block'; window.scrollTo(0,0); }
  function showDash(){ viewDocs.style.display = 'none'; viewDash.style.display = 'block'; window.scrollTo(0,0); }
  document.getElementById('toDocsBtn').addEventListener('click', showDocs);
  document.getElementById('backToDashBtn').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink1').addEventListener('click', function(e){ e.preventDefault(); showDash(); });
  document.getElementById('docsToDashLink2').addEventListener('click', function(e){ e.preventDefault(); showDash(); });

  /* ── helpers ── */
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function fmtDate(ms){ if(!ms) return 'never'; var d = new Date(ms); return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }); }
  async function getJSON(url, headers){
    var res = await fetch(url, { headers: headers || {} });
    var data = await res.json().catch(function(){ return {}; });
    return { ok: res.ok, status: res.status, data: data };
  }

  var lastRevealedKey = ''; // filled in only right after creating a key this session
  function revealBoxHtml(key){
    if(!key) return '';
    return '<div class="reveal-box"><div class="reveal-label">Copy this now — you won\\'t be able to see it again.</div>' +
      '<div class="reveal-row"><code>' + esc(key) + '</code><button type="button" class="btn btn-sm" id="copyRevealBtn">Copy</button></div></div>';
  }

  /* ── API KEY CARD ── */
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

  function renderKeys(keys, usage){
    var html = '';

    // Account-level usage — one bar, shared by every key on this account.
    // Revoking a key and making a new one does not reset this.
    if(usage){
      var pct = usage.monthlyLimit ? Math.min(100, Math.round((usage.requestsThisMonth / usage.monthlyLimit) * 100)) : 0;
      html += '<div class="usage-wrap" style="margin-top:0;margin-bottom:16px">' +
        '<div class="usage-top"><span class="usage-label">Account usage this month</span><span class="usage-count">' + usage.requestsThisMonth + ' / ' + usage.monthlyLimit + '</span></div>' +
        '<div class="usage-track"><div class="usage-fill ' + usageLevelClass(pct) + '" style="width:0%" data-pct="' + pct + '"></div></div>' +
        (pct >= 100 ? '<div class="dcard-msg err" style="margin-top:6px">Monthly limit reached — requests will fail until it resets next month.</div>' : '') +
      '</div>';
    }

    if(!keys.length){
      html += '<div class="empty-state" id="noKeysMsg">You don\\'t have an API key yet. Create one to start making requests.</div>';
    } else {
      keys.forEach(function(k){
        html += '<div class="key-row">' +
          '<span class="key-dot"></span>' +
          '<div class="key-info">' +
            '<div class="key-label">' + esc(k.label) + '</div>' +
            '<div class="key-meta">estv_&bull;&bull;&bull;&bull;' + esc(k.last4) + ' &middot; created ' + fmtDate(k.createdAt) + ' &middot; last used ' + fmtDate(k.lastUsedAt) + '</div>' +
          '</div>' +
          '<div class="key-actions"><button type="button" class="icon-btn" data-revoke="' + k.id + '" title="Revoke"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg></button></div>' +
        '</div>';
      });
    }
    var atMax = keys.length >= 5;
    html += '<div class="field" style="margin-top:12px' + (atMax ? ';display:none' : '') + '" id="createKeyField">' +
      '<label>Label a new key</label>' +
      '<input type="text" id="newKeyLabel" placeholder="e.g. My Discord bot" maxlength="60">' +
    '</div>' +
    '<button class="btn btn-primary" id="createKeyBtn" type="button" style="' + (atMax ? 'display:none' : '') + '">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Create API Key' +
    '</button>' +
    (atMax ? '<div class="empty-state">Maximum of 5 keys reached. Revoke one to create another.</div>' : '') +
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

    // animate usage bars in on next frame
    requestAnimationFrame(function(){
      keyCardBody.querySelectorAll('.usage-fill').forEach(function(bar){
        bar.style.width = bar.getAttribute('data-pct') + '%';
      });
    });

    keyCardBody.querySelectorAll('[data-revoke]').forEach(function(btn){
      btn.addEventListener('click', function(){
        if(!confirm('Revoke this API key? Anything using it will stop working immediately.')) return;
        var originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner btn-spinner-muted"></span>';
        fetch('/api/dev/keys/' + encodeURIComponent(btn.getAttribute('data-revoke')), { method: 'DELETE' })
          .then(function(){ loadKeys(); })
          .catch(function(){ btn.disabled = false; btn.innerHTML = originalHtml; });
      });
    });

    var createBtn = document.getElementById('createKeyBtn');
    if(createBtn){
      createBtn.addEventListener('click', function(){
        var label = document.getElementById('newKeyLabel').value.trim();
        var msg = document.getElementById('keyMsg');
        var originalHtml = createBtn.innerHTML;
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="btn-spinner"></span> Creating…';
        fetch('/api/dev/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: label }) })
          .then(function(r){ return r.json().then(function(d){ if(!r.ok) throw new Error(d.error || 'Could not create key.'); return d; }); })
          .then(function(d){
            lastRevealedKey = d.key;
            // auto-fill the Try it panel so a fresh key can be tested immediately
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
      renderKeys(r.data.keys || [], r.data.usage || null);
    }).catch(function(){ renderLoggedOutKeyCard(); });
  }

  /* ── PROFILE (determines logged-in state) ── */
  getJSON('/api/profile').then(function(r){
    if(r.ok) loadKeys(); else renderLoggedOutKeyCard();
  }).catch(function(){ renderLoggedOutKeyCard(); });

  /* ── CHANNELS CARD + Try it channel select ── */
  var chList = document.getElementById('chList');
  var chSearchInput = document.getElementById('chSearchInput');
  var chCountSub = document.getElementById('chCountSub');
  var tryitSelect = document.getElementById('tryitChannelSelect');
  var allChannels = [];

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
        if(tryitSelect) tryitSelect.value = item.getAttribute('data-id');
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
    if(tryitSelect){
      tryitSelect.innerHTML = allChannels.map(function(c){ return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    }
    updateCurl();
  }).catch(function(){ chList.innerHTML = '<div class="ch-loading">Could not load channels.</div>'; });

  chSearchInput.addEventListener('input', function(){ renderChannelList(chSearchInput.value); });

  /* ── TRY IT CARD ── */
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
        resultStatus.innerHTML = '<span class="status-pill bad">—</span>';
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
      resultStatus.innerHTML = '<span class="status-pill bad">—</span>';
      resultBody.textContent = 'Request failed. Check your connection and try again.';
    }).finally(function(){ btn.disabled = false; btn.innerHTML = originalHtml; });
  });

})();
</script>
</body>
</html>`;
}
