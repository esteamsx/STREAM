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
.db-status-crashed,.db-status-needs_repair{background:rgba(255,59,92,.15);color:var(--red)}

.db-pairing-code{
  font-family:var(--font-mono);font-size:1.3rem;font-weight:700;letter-spacing:.08em;color:var(--accent);
  background:var(--dark3);border:1px dashed var(--border-strong);border-radius:10px;padding:10px 14px;
  text-align:center;margin:8px 0;
}
.db-pairing-help{font-size:.74rem;color:var(--muted);text-align:center;margin-bottom:10px}

.db-bot-meta{font-size:.74rem;color:var(--muted);margin-bottom:10px}

.db-logs{
  background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:10px;
  font-family:var(--font-mono);font-size:.72rem;color:var(--muted);max-height:160px;overflow-y:auto;
  white-space:pre-wrap;word-break:break-all;margin-bottom:10px;display:none;
}
.db-logs.show{display:block}
.db-toggle-logs{font-size:.74rem;color:var(--accent);background:none;border:none;padding:0;margin-bottom:8px;font-weight:600}

.db-bot-actions{display:flex;gap:8px}
.db-bot-actions button{flex:1;padding:8px;font-size:.78rem;border-radius:8px}
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

<script>
  const STATUS_LABELS = {
    starting: 'Starting', installing: 'Installing', pairing: 'Awaiting pairing',
    connected: 'Connected', reconnecting: 'Reconnecting', stopped: 'Stopped',
    crashed: 'Crashed', needs_repair: 'Needs re-pair',
  };

  async function getJSON(url){ const r = await fetch(url); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }
  async function postJSON(url, body){ const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) }); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }
  async function deleteReq(url){ const r = await fetch(url, { method:'DELETE' }); const d = await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||'Request failed'); return d; }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  function botCard(bot){
    const statusClass = 'db-status-' + bot.status;
    const statusLabel = STATUS_LABELS[bot.status] || bot.status;
    const pairing = bot.status === 'pairing' && bot.pairingCode
      ? '<div class="db-pairing-code">' + escapeHtml(bot.pairingCode) + '</div><div class="db-pairing-help">Enter this in WhatsApp → Linked Devices → Link with phone number</div>'
      : '';
    const err = bot.lastError ? '<div class="db-bot-meta" style="color:var(--red)">' + escapeHtml(bot.lastError) + '</div>' : '';
    const canStop = ['starting','installing','pairing','connected','reconnecting'].includes(bot.status);
    return '' +
      '<div class="db-bot" data-id="' + bot.id + '">' +
        '<div class="db-bot-head">' +
          '<div class="db-bot-name">' + escapeHtml(bot.label) + '</div>' +
          '<div class="db-status ' + statusClass + '">' + escapeHtml(statusLabel) + '</div>' +
        '</div>' +
        '<div class="db-bot-meta">Number: ' + escapeHtml(bot.phoneNumber) + '</div>' +
        pairing + err +
        '<button type="button" class="db-toggle-logs">Show logs</button>' +
        '<div class="db-logs"></div>' +
        '<div class="db-bot-actions">' +
          (canStop ? '<button type="button" class="db-btn db-btn-ghost" data-act="stop">Stop</button>' : '<button type="button" class="db-btn db-btn-ghost" data-act="restart">Restart</button>') +
          '<button type="button" class="db-btn db-btn-danger" data-act="delete">Delete</button>' +
        '</div>' +
      '</div>';
  }

  let expandedLogsFor = new Set();

  async function refreshList(){
    let bots;
    try { bots = (await getJSON('/api/bots')).bots; } catch { return; }
    const list = document.getElementById('botsList');
    if (!bots.length) { list.innerHTML = '<div class="db-empty">No deployments yet.</div>'; return; }
    list.innerHTML = bots.map(botCard).join('');
    list.querySelectorAll('.db-bot').forEach((el) => {
      const id = el.dataset.id;
      const logsEl = el.querySelector('.db-logs');
      const toggleBtn = el.querySelector('.db-toggle-logs');
      if (expandedLogsFor.has(id)) { logsEl.classList.add('show'); toggleBtn.textContent = 'Hide logs'; loadLogs(id, logsEl); }
      toggleBtn.addEventListener('click', () => {
        const show = logsEl.classList.toggle('show');
        toggleBtn.textContent = show ? 'Hide logs' : 'Show logs';
        if (show) { expandedLogsFor.add(id); loadLogs(id, logsEl); } else { expandedLogsFor.delete(id); }
      });
      el.querySelectorAll('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const act = btn.dataset.act;
          if (act === 'delete' && !confirm('Delete this deployment? This stops the bot and cannot be undone.')) return;
          btn.disabled = true;
          try {
            if (act === 'stop') await postJSON('/api/bots/' + id + '/stop');
            else if (act === 'restart') await postJSON('/api/bots/' + id + '/restart');
            else if (act === 'delete') await deleteReq('/api/bots/' + id);
            refreshList();
          } catch (e) { alert(e.message); btn.disabled = false; }
        });
      });
    });
  }

  async function loadLogs(id, logsEl){
    try {
      const data = await getJSON('/api/bots/' + id + '/status');
      logsEl.textContent = (data.logs || []).join('\\n') || 'No logs yet.';
      logsEl.scrollTop = logsEl.scrollHeight;
    } catch { /* keep whatever was there */ }
  }

  document.getElementById('deployForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('deployBtn');
    const errEl = document.getElementById('deployErr');
    errEl.classList.remove('show');
    const label = document.getElementById('botLabel').value;
    const phoneNumber = document.getElementById('botNumber').value;
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.innerHTML = '<span class="db-mini-spinner"></span> Deploying…';
    try {
      await postJSON('/api/bots/deploy', { label, phoneNumber });
      document.getElementById('deployForm').reset();
      refreshList();
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
      document.getElementById('capLabel').textContent = data.active + ' / ' + data.max + ' active';
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
