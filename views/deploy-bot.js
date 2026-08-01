export function renderDeployBot(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deploy Bot — ES TEAMS TV</title>
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
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.db-nav{
  position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
}
.db-back{
  display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600;
  background:transparent;border:none;cursor:pointer;font-family:inherit;padding:0;
}
.db-back:hover{color:var(--accent)}
.db-back svg{width:18px;height:18px}
.db-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;flex:1}
.db-cap{font-size:.72rem;color:var(--muted);font-weight:600;font-family:var(--font-mono)}

.db-wrap{max-width:720px;margin:0 auto;padding:20px 16px 60px}

.db-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;margin-bottom:18px;
}
.db-card-title{font-family:var(--font-display);font-weight:700;font-size:1rem;margin-bottom:4px}
.db-card-sub{font-size:.8rem;color:var(--muted);margin-bottom:14px}

.db-field{margin-bottom:12px}
.db-label{display:block;font-size:.76rem;font-weight:600;color:var(--muted);margin-bottom:6px}
.db-input{
  width:100%;background:var(--card2);border:1px solid var(--border);border-radius:10px;color:var(--text);
  padding:11px 14px;font-size:.9rem;transition:border-color .2s var(--ease);
}
.db-input:focus{border-color:var(--accent)}
.db-hint{font-size:.72rem;color:var(--muted2);margin-top:5px}

.db-btn{
  width:100%;background:var(--accent);color:#04141a;border:none;border-radius:10px;padding:12px;
  font-size:.88rem;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;
  transition:filter .2s var(--ease);
}
.db-btn:hover{filter:brightness(1.08)}
.db-btn:disabled{opacity:.5;cursor:not-allowed}
.db-btn-dead{opacity:.4;filter:grayscale(.5)}
.db-btn-danger{background:var(--red);color:#fff}
.db-btn-ghost{background:var(--card2);color:var(--text);border:1px solid var(--border)}
.db-err{color:var(--red);font-size:.8rem;margin-top:8px;display:none}
.db-err.show{display:block}

.db-mini-spinner{width:14px;height:14px;border-radius:50%;border:2px solid rgba(0,0,0,.25);border-top-color:#04141a;animation:db-spin .7s linear infinite}
@keyframes db-spin{to{transform:rotate(360deg)}}

.db-empty{color:var(--muted);font-size:.85rem;text-align:center;padding:24px 0}

.db-bot{border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px;background:var(--card2)}
.db-bot-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.db-bot-name{font-weight:700;font-size:.92rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.db-status{
  font-size:.68rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:20px;
  flex-shrink:0;white-space:nowrap;
}
.db-status-starting,.db-status-installing{background:rgba(245,166,35,.15);color:var(--amber)}
.db-status-pairing{background:rgba(0,224,255,.15);color:var(--accent)}
.db-status-connected{background:rgba(18,196,139,.15);color:var(--green)}
.db-status-reconnecting{background:rgba(245,166,35,.15);color:var(--amber)}
.db-status-stopped{background:rgba(255,255,255,.08);color:var(--muted)}
.db-status-crashed,.db-status-needs_repair,.db-status-disconnected{background:rgba(255,59,92,.15);color:var(--red)}

.db-pairing-row{display:flex;align-items:stretch;gap:8px;margin:8px 0}
.db-pairing-code{
  flex:1;min-width:0;font-family:var(--font-mono);font-size:1.2rem;font-weight:700;letter-spacing:.08em;color:var(--accent);
  background:var(--dark3);border:1px dashed var(--border-strong);border-radius:10px;padding:10px 12px;
  text-align:center;overflow-x:auto;white-space:nowrap;
}
.db-copy-btn{
  flex-shrink:0;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:10px;
  padding:0 14px;font-size:.76rem;font-weight:700;display:flex;align-items:center;gap:5px;transition:all .2s var(--ease);
}
.db-copy-btn svg{width:14px;height:14px}
.db-copy-btn.copied{background:rgba(18,196,139,.15);color:var(--green);border-color:var(--green)}
.db-pairing-help{font-size:.74rem;color:var(--muted);text-align:center;margin-bottom:10px}

.db-progress{margin:10px 0}
.db-progress-track{height:6px;border-radius:6px;background:var(--dark3);overflow:hidden;margin-bottom:7px;position:relative}
.db-progress-fill{
  height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:6px;
  transition:width .5s var(--ease);position:relative;overflow:hidden;
}
.db-progress-fill::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);
  width:40%;animation:db-progress-shimmer 1.3s linear infinite;
}
@keyframes db-progress-shimmer{from{transform:translateX(-100%)}to{transform:translateX(250%)}}
.db-progress-labels{display:flex;justify-content:space-between;font-size:.64rem;color:var(--muted2);font-weight:700}
.db-progress-labels span.done{color:var(--muted)}
.db-progress-labels span.active{color:var(--accent)}

.db-bot-meta{font-size:.74rem;color:var(--muted);margin-bottom:6px}
.db-bot-err{color:var(--red);margin-bottom:10px}

.db-logs{
  background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px;
  font-family:var(--font-mono);font-size:.72rem;color:var(--muted);max-height:160px;overflow-y:auto;
  white-space:pre-wrap;word-break:break-all;margin-bottom:10px;display:none;
}
.db-logs.show{display:block}
.db-log-err{color:var(--red);background:rgba(255,59,92,.08);margin:0 -10px;padding:1px 10px}
.db-toggle-logs{font-size:.74rem;color:var(--accent);background:none;border:none;padding:0;margin-bottom:8px;font-weight:600}

.db-bot-actions{display:flex;gap:8px}
.db-bot-actions button{flex:1;padding:8px;font-size:.78rem;border-radius:8px}

/* ── confirmation overlay — same pattern as the rest of the site's
   .page-overlay/.overlay-card modals (see logoutOverlay etc. on the main
   pages), rebuilt here since this page doesn't share their markup ── */
.db-overlay{
  position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:20px;
  background:rgba(0,0,0,.6);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s var(--ease);
}
.db-overlay.show{opacity:1;pointer-events:auto}
.db-overlay-card{
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:22px;
  max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);
}
.db-overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem;margin-bottom:8px}
.db-overlay-sub{font-size:.85rem;color:var(--muted);margin-bottom:18px;line-height:1.4}
.db-overlay-actions{display:flex;gap:10px}
.db-overlay-actions .db-btn{width:auto;flex:1;padding:11px}
</style>
</head>
<body>

<div class="db-nav">
  <button class="db-back" onclick="location.href='/'">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </button>
  <div class="db-nav-title">Deploy Bot</div>
  <div class="db-cap" id="capLabel">…</div>
</div>

<div class="db-wrap">

  <div class="db-card">
    <div class="db-card-title">Deploy ES_TEAMS-V1</div>
    <div class="db-card-sub">Deploys your own instance of the bot, tied to a WhatsApp number you provide.</div>
    <form id="deployForm">
      <div class="db-field">
        <label class="db-label" for="botLabel">Name (just for you to tell instances apart)</label>
        <input class="db-input" id="botLabel" maxlength="60" placeholder="e.g. My WhatsApp bot" autocomplete="off">
      </div>
      <div class="db-field">
        <label class="db-label" for="botNumber">WhatsApp number</label>
        <input class="db-input" id="botNumber" placeholder="e.g. 2348012345678" autocomplete="off" inputmode="numeric">
        <div class="db-hint">Digits only, with country code, no + or spaces. You'll get a pairing code to enter in WhatsApp → Linked Devices → Link with phone number.</div>
      </div>
      <button type="submit" class="db-btn" id="deployBtn">Deploy</button>
      <div class="db-err" id="deployErr"></div>
    </form>
  </div>

  <div class="db-card">
    <div class="db-card-title">Your deployments</div>
    <div id="botsList"><div class="db-empty">Loading…</div></div>
  </div>

</div>

<div class="db-overlay" id="confirmOverlay">
  <div class="db-overlay-card">
    <div class="db-overlay-title" id="confirmTitle">Are you sure?</div>
    <div class="db-overlay-sub" id="confirmSub"></div>
    <div class="db-overlay-actions">
      <button type="button" class="db-btn db-btn-ghost" id="confirmCancelBtn">Cancel</button>
      <button type="button" class="db-btn db-btn-danger" id="confirmOkBtn">Confirm</button>
    </div>
  </div>
</div>

<script>
  const STATUS_LABELS = {
    downloading: 'Downloading', extracting: 'Extracting', starting: 'Starting', installing: 'Installing',
    pairing: 'Awaiting pairing', connected: 'Connected', reconnecting: 'Reconnecting', stopped: 'Stopped',
    crashed: 'Crashed', needs_repair: 'Needs re-pair', disconnected: 'Disconnected',
  };
  const RUNNING_STATUSES = ['downloading','extracting','installing','starting','pairing','connected','reconnecting'];
  // Steps shown in the progress bar, in order. "connected" isn't included —
  // once connected the bar's job is done and the status badge alone covers it.
  const PROGRESS_STAGES = [
    { key: 'downloading', label: 'Download' },
    { key: 'extracting', label: 'Extract' },
    { key: 'installing', label: 'Install' },
    { key: 'starting', label: 'Start' },
    { key: 'pairing', label: 'Pair' },
  ];

  async function getJSON(url){ const r = await fetch(url); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }
  async function postJSON(url, body){ const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) }); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }
  async function deleteReq(url){ const r = await fetch(url, { method:'DELETE' }); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  /* ── confirmation overlay (replaces native confirm()) ── */
  function confirmAction(title, sub, onConfirm){
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmSub').textContent = sub;
    overlay.classList.add('show');
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    // Replace with clones so previous actions' listeners never stack up.
    const newOk = okBtn.cloneNode(true);
    okBtn.replaceWith(newOk);
    const newCancel = cancelBtn.cloneNode(true);
    cancelBtn.replaceWith(newCancel);
    function close(){ overlay.classList.remove('show'); }
    newCancel.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { once: true });
    newOk.addEventListener('click', () => { close(); onConfirm(); });
  }

  /* ── copy-to-clipboard for the pairing code ── */
  async function copyCode(code, btn){
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      ta.remove();
    }
    const original = btn.innerHTML;
    btn.innerHTML = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = original; btn.classList.remove('copied'); }, 1500);
  }

  function copyBtnHtml(){
    return '<button type="button" class="db-copy-btn">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>' +
      'Copy</button>';
  }

  /* ── build a brand-new card (only called once per bot id) ── */
  function botCardEl(bot){
    const wrap = document.createElement('div');
    wrap.className = 'db-bot';
    wrap.dataset.id = bot.id;
    wrap.innerHTML =
      '<div class="db-bot-head">' +
        '<div class="db-bot-name"></div>' +
        '<div class="db-status"></div>' +
      '</div>' +
      '<div class="db-bot-meta db-bot-number"></div>' +
      '<div class="db-progress-slot"></div>' +
      '<div class="db-pairing-slot"></div>' +
      '<div class="db-bot-meta db-bot-err" style="display:none"></div>' +
      '<button type="button" class="db-toggle-logs">Show logs</button>' +
      '<div class="db-logs"></div>' +
      '<div class="db-bot-actions"></div>';
    wrap.querySelector('.db-bot-name').textContent = bot.label;
    wrap.querySelector('.db-bot-number').textContent = 'Number: ' + bot.phoneNumber;

    const logsEl = wrap.querySelector('.db-logs');
    const toggleBtn = wrap.querySelector('.db-toggle-logs');
    toggleBtn.addEventListener('click', () => {
      const show = logsEl.classList.toggle('show');
      toggleBtn.textContent = show ? 'Hide logs' : 'Show logs';
      if (show) { expandedLogsFor.add(bot.id); loadLogs(bot.id, logsEl); } else { expandedLogsFor.delete(bot.id); }
    });

    return wrap;
  }

  /* ── patch an existing card's mutable bits in place — never touches the
     logs box's open/closed state or scroll position, which is what was
     making the logs panel look like it was opening/closing on its own
     (the old code rebuilt every card's whole HTML every 5s poll) ── */
  function patchBotCard(el, bot){
    const statusEl = el.querySelector('.db-status');
    statusEl.className = 'db-status db-status-' + bot.status;
    statusEl.textContent = STATUS_LABELS[bot.status] || bot.status;

    const progressSlot = el.querySelector('.db-progress-slot');
    const stageIndex = PROGRESS_STAGES.findIndex((s) => s.key === bot.status);
    if (stageIndex !== -1) {
      if (progressSlot.dataset.stage !== bot.status) {
        progressSlot.dataset.stage = bot.status;
        const pct = Math.round(((stageIndex + 1) / PROGRESS_STAGES.length) * 100);
        const labels = PROGRESS_STAGES.map((s, i) =>
          '<span class="' + (i < stageIndex ? 'done' : i === stageIndex ? 'active' : '') + '">' + s.label + '</span>'
        ).join('');
        progressSlot.innerHTML =
          '<div class="db-progress">' +
            '<div class="db-progress-track"><div class="db-progress-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="db-progress-labels">' + labels + '</div>' +
          '</div>';
      }
    } else if (progressSlot.dataset.stage) {
      progressSlot.innerHTML = '';
      delete progressSlot.dataset.stage;
    }

    const pairingSlot = el.querySelector('.db-pairing-slot');
    if (bot.status === 'pairing' && bot.pairingCode) {
      if (pairingSlot.dataset.code !== bot.pairingCode) {
        pairingSlot.dataset.code = bot.pairingCode;
        pairingSlot.innerHTML =
          '<div class="db-pairing-row"><div class="db-pairing-code"></div>' + copyBtnHtml() + '</div>' +
          '<div class="db-pairing-help">Enter this in WhatsApp → Linked Devices → Link with phone number</div>';
        pairingSlot.querySelector('.db-pairing-code').textContent = bot.pairingCode;
        pairingSlot.querySelector('.db-copy-btn').addEventListener('click', (e) => copyCode(bot.pairingCode, e.currentTarget));
      }
    } else if (pairingSlot.dataset.code) {
      pairingSlot.innerHTML = '';
      delete pairingSlot.dataset.code;
    }

    const errEl = el.querySelector('.db-bot-err');
    if (bot.lastError) { errEl.textContent = bot.lastError; errEl.style.display = ''; }
    else { errEl.style.display = 'none'; }

    const running = RUNNING_STATUSES.includes(bot.status);
    const actionsEl = el.querySelector('.db-bot-actions');
    const wantKey = running ? 'stop+restart+delete' : 'restart+delete';
    if (actionsEl.dataset.key !== wantKey) {
      actionsEl.dataset.key = wantKey;
      actionsEl.innerHTML =
        (running ? '<button type="button" class="db-btn db-btn-ghost" data-act="stop">Stop</button>' : '') +
        '<button type="button" class="db-btn db-btn-ghost" data-act="restart">Restart</button>' +
        '<button type="button" class="db-btn db-btn-danger" data-act="delete">Delete</button>';
      wireActions(el, bot.id);
    }
  }

  function wireActions(el, id){
    el.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        const confirmText = {
          stop: ['Stop this bot?', 'It stays deployed — you can restart it later without re-pairing.'],
          restart: ['Restart this bot?', 'This pulls the latest code and reconnects using its saved session — no new pairing code needed unless that session is no longer valid.'],
          delete: ['Delete this deployment?', 'This stops the bot and permanently removes it. This cannot be undone.'],
        }[act];
        confirmAction(confirmText[0], confirmText[1], async () => {
          btn.disabled = true;
          try {
            if (act === 'stop') await postJSON('/api/bots/' + id + '/stop');
            else if (act === 'restart') await postJSON('/api/bots/' + id + '/restart');
            else if (act === 'delete') { await deleteReq('/api/bots/' + id); refreshCap(); }
            refreshList();
          } catch (e) {
            showInlineError(el, e.message);
            btn.disabled = false;
          }
        });
      });
    });
  }

  function showInlineError(el, message){
    let err = el.querySelector('.db-action-err');
    if (!err) {
      err = document.createElement('div');
      err.className = 'db-bot-meta db-action-err';
      err.style.color = 'var(--red)';
      el.querySelector('.db-bot-actions').insertAdjacentElement('afterend', err);
    }
    err.textContent = message;
  }

  let expandedLogsFor = new Set();
  const cardsById = new Map();

  async function refreshList(){
    let bots;
    try { bots = (await getJSON('/api/bots')).bots; } catch { return; }
    const list = document.getElementById('botsList');

    if (!bots.length) {
      cardsById.clear();
      list.innerHTML = '<div class="db-empty">No deployments yet.</div>';
      return;
    }
    if (list.querySelector('.db-empty')) list.innerHTML = '';

    const seen = new Set();
    for (const bot of bots) {
      seen.add(bot.id);
      let el = cardsById.get(bot.id);
      if (!el) {
        el = botCardEl(bot);
        cardsById.set(bot.id, el);
        list.appendChild(el);
      }
      patchBotCard(el, bot);
    }
    // Remove cards for deployments that no longer exist (deleted elsewhere).
    for (const [id, el] of cardsById) {
      if (!seen.has(id)) { el.remove(); cardsById.delete(id); expandedLogsFor.delete(id); }
    }
  }

  async function loadLogs(id, logsEl){
    const wasAtBottom = logsEl.scrollTop + logsEl.clientHeight >= logsEl.scrollHeight - 4;
    try {
      const data = await getJSON('/api/bots/' + id + '/status');
      const lines = data.logs || [];
      if (!lines.length) {
        logsEl.textContent = 'No logs yet.';
      } else {
        logsEl.innerHTML = '';
        lines.forEach((entry) => {
          // Backward compatible: older entries were plain strings before
          // stdout/stderr got tagged separately.
          const isErr = typeof entry === 'object' && entry && entry.t === 'err';
          const text = typeof entry === 'object' && entry ? entry.l : entry;
          const row = document.createElement('div');
          if (isErr) row.className = 'db-log-err';
          row.textContent = text;
          logsEl.appendChild(row);
        });
      }
      if (wasAtBottom) logsEl.scrollTop = logsEl.scrollHeight;
    } catch { /* keep whatever was there */ }
  }

  // Poll open logs panels independently of the main list refresh, so
  // switching tabs/statuses doesn't interrupt someone reading a log.
  setInterval(() => {
    for (const id of expandedLogsFor) {
      const el = cardsById.get(id);
      if (el) loadLogs(id, el.querySelector('.db-logs'));
    }
  }, 4000);

  let userCapInfo = { mine: 0, maxMine: 3, isAdmin: false };

  function atUserCap(){
    return !userCapInfo.isAdmin && userCapInfo.maxMine != null && userCapInfo.mine >= userCapInfo.maxMine;
  }

  function updateDeployBtnLook(){
    document.getElementById('deployBtn').classList.toggle('db-btn-dead', atUserCap());
  }

  document.getElementById('deployForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('deployBtn');
    const errEl = document.getElementById('deployErr');
    errEl.classList.remove('show');
    if (atUserCap()) {
      errEl.textContent = 'You can only deploy ' + userCapInfo.maxMine + ' instances.';
      errEl.classList.add('show');
      return;
    }
    const label = document.getElementById('botLabel').value;
    const phoneNumber = document.getElementById('botNumber').value;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="db-mini-spinner"></span> Deploying…';
    try {
      await postJSON('/api/bots/deploy', { label, phoneNumber });
      document.getElementById('deployForm').reset();
      refreshList();
      refreshCap();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  async function refreshCap(){
    try {
      const data = await getJSON('/api/bots/cap');
      document.getElementById('capLabel').textContent = data.active + '/' + data.max;
      userCapInfo = data;
      updateDeployBtnLook();
    } catch { document.getElementById('capLabel').textContent = ''; }
  }

  refreshList();
  refreshCap();
  setInterval(refreshList, 5000);
  setInterval(refreshCap, 15000);
</script>
</body>
</html>`;
}
