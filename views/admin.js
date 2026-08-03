import { siteHeadFor } from "../config/site.js";

export function renderAdmin(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("admin")}
<script>(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>Admin — ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark3:#ECEEF3;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
  --nav-bg:rgba(255,255,255,.92);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{background:var(--dark);color:var(--text);font-family:var(--font-body);min-height:100%}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.ad-nav{
  position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
}
.ad-back{display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600;background:transparent;border:none;cursor:pointer;font-family:inherit;padding:0}
.ad-back:hover{color:var(--accent)}
.ad-back svg{width:18px;height:18px}
.ad-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem}

.ad-wrap{max-width:560px;margin:0 auto;padding:24px 18px 60px}

.ad-hero{
  display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--border);
  border-radius:18px;padding:18px;margin-bottom:20px;
}
.ad-avatar{
  width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.2rem;color:#04141a;background-size:cover;background-position:center;flex-shrink:0;
}
.ad-hero-name{font-family:var(--font-display);font-weight:700;font-size:1.05rem;display:flex;align-items:center;gap:4px}
.ad-hero-sub{font-size:.8rem;color:var(--muted);margin-top:2px}
.ad-verified{display:inline-flex}

.ad-card{background:var(--card);border:1px solid var(--border);border-radius:16px;margin-bottom:18px;overflow:hidden}
.ad-card-header{
  display:flex;align-items:center;gap:10px;padding:16px 18px;cursor:pointer;user-select:none;
}
.ad-card-header svg.ad-icon{width:19px;height:19px;color:var(--accent);flex-shrink:0}
.ad-card-header-title{font-family:var(--font-display);font-weight:700;font-size:.92rem;flex:1}
.ad-card-count{font-size:.72rem;color:var(--muted);font-weight:700;background:var(--card2);padding:2px 9px;border-radius:20px;margin-right:2px}
.ad-chevron{width:16px;height:16px;color:var(--muted);transition:transform .25s var(--ease);flex-shrink:0}
.ad-card.open .ad-chevron{transform:rotate(180deg)}
.ad-card-body{max-height:0;overflow:hidden;transition:max-height .35s var(--ease)}
.ad-card.open .ad-card-body{max-height:2400px}
.ad-card-body-inner{padding:0 18px 18px}

.ad-search-wrap{position:relative;margin-bottom:14px}
.ad-search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;opacity:.4;pointer-events:none}
.ad-search-wrap input{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 12px 11px 36px;color:var(--text);font-size:.85rem;outline:none;transition:border-color .2s var(--ease);
}
.ad-search-wrap input:focus{border-color:var(--accent)}

.ad-list{display:flex;flex-direction:column;gap:8px;min-height:20px}
.ad-row{
  display:flex;align-items:center;gap:10px;padding:10px;border-radius:12px;background:var(--card2);
  border:1px solid var(--border);transition:opacity .25s var(--ease),transform .25s var(--ease);
}
.ad-row.removing{opacity:0;transform:scale(.96)}
.ad-row-avatar{
  width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#04141a;
  flex-shrink:0;background-size:cover;background-position:center;
}
.ad-row-info{flex:1;min-width:0}
.ad-row-name{font-size:.85rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px}
.ad-row-email{font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ad-row-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.ad-act-btn{
  width:33px;height:33px;border-radius:50%;border:1px solid var(--border-strong);background:var(--dark3);
  color:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all .18s var(--ease);
}
.ad-act-btn svg{width:15px;height:15px}
.ad-act-btn:hover{color:var(--accent);border-color:var(--accent)}
.ad-act-btn:disabled{opacity:.55;cursor:default}
.ad-act-btn.reset:hover{color:var(--accent2);border-color:var(--accent2)}
.ad-act-btn.ban:hover{color:#FFB020;border-color:#FFB020}
.ad-act-btn.delete:hover{color:var(--red);border-color:var(--red)}
.ad-act-btn.unban:hover{color:#3DDC84;border-color:#3DDC84}
.ad-act-btn.verify{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;border-color:transparent}
.ad-act-btn.verify:hover{color:#04141a;border-color:transparent;opacity:.9}
.ad-act-btn.verified{color:var(--muted2);border-color:var(--border);background:var(--dark3);opacity:.85}
.ad-act-btn.verified:hover{color:#FFB020;border-color:#FFB020}
.ad-act-btn.done{color:#3DDC84;border-color:#3DDC84;background:rgba(61,220,132,.12)}
.ad-act-btn.done.danger-done{color:var(--red);border-color:var(--red);background:rgba(255,59,92,.12)}

.ad-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:currentColor;border-radius:50%;display:inline-block;animation:adSpin .6s linear infinite}
@keyframes adSpin{to{transform:rotate(360deg)}}

.ad-empty,.ad-hint{font-size:.8rem;color:var(--muted);text-align:center;padding:18px 8px}
.ad-loadmore{
  width:100%;padding:10px;border-radius:10px;border:1px solid var(--border-strong);background:transparent;
  color:var(--accent);font-size:.8rem;font-weight:700;margin-top:10px;
}
.ad-loadmore:disabled{opacity:.5}

.ad-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:60;
  display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;pointer-events:none;
  transition:opacity .25s var(--ease);
}
.ad-overlay.show{opacity:1;pointer-events:auto}
body:has(.ad-overlay.show){overflow:hidden}

.ad-storage-row{margin-bottom:16px}
.ad-storage-row:last-child{margin-bottom:0}
.ad-storage-label{display:flex;justify-content:space-between;align-items:baseline;font-size:.85rem;font-weight:700;margin-bottom:7px}
.ad-storage-amt{font-size:.74rem;color:var(--muted);font-weight:600}
.ad-storage-track{height:10px;border-radius:6px;background:var(--card2);overflow:hidden;border:1px solid var(--border)}
.ad-storage-fill{height:100%;border-radius:6px;transition:width .4s var(--ease);background:linear-gradient(90deg,var(--accent),var(--accent2))}
.ad-storage-fill.warn{background:var(--red)}
.ad-storage-err{font-size:.78rem;color:var(--muted)}
.ad-modal{
  width:100%;max-width:340px;background:var(--card);border:1px solid var(--border-strong);border-radius:18px;
  padding:24px 22px;transform:translateY(10px) scale(.97);transition:transform .25s var(--ease);
}
.ad-overlay.show .ad-modal{transform:translateY(0) scale(1)}
.ad-modal-title{font-family:var(--font-display);font-weight:700;font-size:1rem;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.ad-modal-sub{font-size:.8rem;color:var(--muted);margin-bottom:18px;line-height:1.5}
.ad-modal input{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 12px;color:var(--text);font-size:.85rem;outline:none;margin-bottom:10px;transition:border-color .2s var(--ease);
}
.ad-modal input:focus{border-color:var(--accent)}
.ad-modal-msg{font-size:.76rem;min-height:16px;margin-bottom:8px}
.ad-modal-msg.err{color:var(--red)}
.ad-modal-msg.ok{color:#3DDC84}
.ad-modal-actions{display:flex;gap:10px;margin-top:6px}
.ad-modal-actions.single{justify-content:center}
.ad-modal-actions.single .ad-modal-btn{flex:none;min-width:130px}
.ad-modal-btn{
  flex:1;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.84rem;
  display:flex;align-items:center;justify-content:center;gap:7px;
}
.ad-modal-btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a}
.ad-modal-btn.danger{background:var(--red);color:#fff}
.ad-modal-btn.ghost{background:var(--card2);color:var(--text);border:1px solid var(--border-strong)}
.ad-modal-btn:disabled{opacity:.55}

.ad-modal-wide{max-width:460px}
.ad-bot-list{display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow-y:auto;margin-bottom:4px}
.ad-bot-card{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--card2)}
.ad-bot-card-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.ad-bot-card-name{font-weight:700;font-size:.86rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ad-bot-badge{
  font-size:.64rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:20px;
  flex-shrink:0;white-space:nowrap;
}
.ad-bot-badge.b-starting,.ad-bot-badge.b-installing,.ad-bot-badge.b-downloading,.ad-bot-badge.b-extracting{background:rgba(245,166,35,.15);color:#FFB020}
.ad-bot-badge.b-pairing{background:rgba(0,224,255,.15);color:var(--accent)}
.ad-bot-badge.b-connected{background:rgba(61,220,132,.15);color:#3DDC84}
.ad-bot-badge.b-reconnecting{background:rgba(245,166,35,.15);color:#FFB020}
.ad-bot-badge.b-stopped{background:rgba(255,255,255,.08);color:var(--muted)}
.ad-bot-badge.b-crashed,.ad-bot-badge.b-needs_repair,.ad-bot-badge.b-disconnected{background:rgba(255,59,92,.15);color:var(--red)}
.ad-bot-card-meta{font-size:.72rem;color:var(--muted);margin-bottom:8px}
.ad-bot-card-actions{display:flex;gap:6px}
.ad-bot-card-actions button{flex:1;padding:7px;font-size:.72rem;border-radius:8px}

.ad-tpl-status{
  display:flex;align-items:center;gap:10px;justify-content:space-between;margin-bottom:12px;
  padding:10px 12px;background:var(--card2);border:1px solid var(--border);border-radius:10px;
  font-size:.76rem;color:var(--muted);
}
.ad-tpl-status.stale{color:#FFB020}
.ad-tpl-status.current{color:#3DDC84}
.ad-tpl-check-btn{
  flex-shrink:0;background:transparent;border:1px solid var(--border);color:var(--text);
  border-radius:8px;padding:6px 12px;font-size:.72rem;font-weight:700;
}
.ad-tpl-check-btn:disabled{opacity:.5}

.ad-toast{
  position:fixed;bottom:26px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--card2);
  border:1px solid var(--border-strong);color:var(--text);padding:11px 18px;border-radius:12px;font-size:.82rem;
  font-weight:600;z-index:80;opacity:0;transition:all .3s var(--ease);max-width:88vw;text-align:center;
  box-shadow:0 10px 30px rgba(0,0,0,.4);
}
.ad-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>

<div class="ad-nav">
  <button type="button" class="ad-back" id="adBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </button>
  <div class="ad-nav-title">Admin</div>
</div>

<div class="ad-wrap">

  <div class="ad-hero">
    <div class="ad-avatar" id="adAvatar">A</div>
    <div>
      <div class="ad-hero-name" id="adName">Loading…</div>
      <div class="ad-hero-sub">Admin / Control Panel account</div>
    </div>
  </div>

  <div class="ad-card" id="usersCard">
    <div class="ad-card-header" id="usersHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <div class="ad-card-header-title">User Accounts</div>
      <div class="ad-card-count" id="usersCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="ad-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="userSearchInput" placeholder="Search by username, Telegram ID, or GitHub…" autocomplete="off">
      </div>
      <div class="ad-list" id="usersList"></div>
      <button type="button" class="ad-loadmore" id="usersLoadMore" style="display:none">Load more</button>
    </div></div>
  </div>

  <div class="ad-card" id="bannedCard">
    <div class="ad-card-header" id="bannedHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8" stroke-linecap="round"/></svg>
      <div class="ad-card-header-title">Banned Users</div>
      <div class="ad-card-count" id="bannedCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="ad-list" id="bannedList"></div>
    </div></div>
  </div>

  <div class="ad-card" id="verifyCard">
    <div class="ad-card-header" id="verifyHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>
      <div class="ad-card-header-title">Account Verification</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="ad-search-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" d="M21 21l-4.3-4.3"/></svg>
        <input type="text" id="verifySearchInput" placeholder="Search by username, Telegram ID, or GitHub…" autocomplete="off">
      </div>
      <div class="ad-list" id="verifyList"></div>
      <button type="button" class="ad-loadmore" id="verifyLoadMore" style="display:none">Load more</button>
    </div></div>
  </div>
  <div class="ad-card" id="botsCard">
    <div class="ad-card-header" id="botsHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="15.5" cy="16" r="1.2"/><path stroke-linecap="round" d="M12 11V7m-3 0h6"/></svg>
      <div class="ad-card-header-title">Bot Deployments</div>
      <div class="ad-card-count" id="botsUsersCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="ad-tpl-status" id="tplStatusRow">
        <span id="tplStatusText">Checking template status…</span>
        <button type="button" class="ad-tpl-check-btn" id="tplCheckBtn">Check now</button>
      </div>
      <div class="ad-list" id="botsUsersList"></div>
    </div></div>
  </div>

  <div class="ad-card" id="storageCard">
    <div class="ad-card-header" id="storageHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>
      <div class="ad-card-header-title">Bot Deployment Storage</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div id="storageList"><div class="ad-empty">Loading…</div></div>
    </div></div>
  </div>

</div>

<!-- Reset password overlay -->
<div class="ad-overlay" id="resetOverlay">
  <div class="ad-modal">
    <div class="ad-modal-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
      Reset Password
    </div>
    <div class="ad-modal-sub" id="resetModalSub">Set a new password for this account.</div>
    <input type="password" id="resetNewPw" placeholder="New password" autocomplete="new-password">
    <input type="password" id="resetConfirmPw" placeholder="Confirm new password" autocomplete="new-password">
    <div class="ad-modal-msg" id="resetMsg"></div>
    <div class="ad-modal-actions">
      <button type="button" class="ad-modal-btn ghost" id="resetCancelBtn">Cancel</button>
      <button type="button" class="ad-modal-btn primary" id="resetApplyBtn">Apply Changes</button>
    </div>
  </div>
</div>

<!-- Confirm overlay (used for ban + delete) -->
<div class="ad-overlay" id="confirmOverlay">
  <div class="ad-modal">
    <div class="ad-modal-title" id="confirmTitle">Are you sure?</div>
    <div class="ad-modal-sub" id="confirmSub"></div>
    <div class="ad-modal-actions">
      <button type="button" class="ad-modal-btn ghost" id="confirmCancelBtn">Cancel</button>
      <button type="button" class="ad-modal-btn danger" id="confirmOkBtn">Confirm</button>
    </div>
  </div>
</div>

<!-- A specific user's bot instances (opened by tapping a row in Bot Deployments) -->
<div class="ad-overlay" id="botsOverlay">
  <div class="ad-modal ad-modal-wide">
    <div class="ad-modal-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="15.5" cy="16" r="1.2"/><path stroke-linecap="round" d="M12 11V7m-3 0h6"/></svg>
      Bot instances
    </div>
    <div class="ad-modal-sub" id="botsModalSub"></div>
    <div class="ad-bot-list" id="botsModalList"><div class="ad-empty">Loading…</div></div>
    <div class="ad-modal-actions single">
      <button type="button" class="ad-modal-btn ghost" id="botsModalCloseBtn">Close</button>
    </div>
  </div>
</div>

<script>
(function(){

function showToast(message){
  const toast = document.createElement('div');
  toast.className = 'ad-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

async function getJSON(url){
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
async function deleteReq(url){
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

document.getElementById('adBackBtn').addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = '/';
});

document.getElementById('usersHeader').addEventListener('click', () => {
  document.getElementById('usersCard').classList.toggle('open');
});
document.getElementById('bannedHeader').addEventListener('click', () => {
  document.getElementById('bannedCard').classList.toggle('open');
});
document.getElementById('verifyHeader').addEventListener('click', () => {
  document.getElementById('verifyCard').classList.toggle('open');
});
document.getElementById('botsHeader').addEventListener('click', () => {
  document.getElementById('botsCard').classList.toggle('open');
});
document.getElementById('storageHeader').addEventListener('click', () => {
  document.getElementById('storageCard').classList.toggle('open');
});

const RESET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>';
const BAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2" stroke-linecap="round"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';
const UNBAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 109-9" stroke-linecap="round"/><path d="M3 4v5h5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
const VERIFIED_BADGE = '<svg width="15" height="15" viewBox="0 0 24 24" aria-label="Admin"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
const PROFILE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1" stroke-linecap="round"/></svg>';
const PROFILE_VERIFIED_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0116 0v1" stroke-linecap="round"/><g transform="translate(13.5,12.5) scale(0.6)"><path fill="currentColor" stroke="none" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path stroke="var(--card2)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></g></svg>';

function initialsOf(u){
  return (((u.firstName || '')[0] || '') + ((u.lastName || '')[0] || '')) || (u.username ? u.username[0].toUpperCase() : '?');
}

function askConfirm(title, sub){
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmSub').textContent = sub;
    overlay.classList.add('show');
    function cleanup(result){
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    function onOk(){ cleanup(true); }
    function onCancel(){ cleanup(false); }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function renderUserRow(u){
  const row = document.createElement('div');
  row.className = 'ad-row';
  row.dataset.uid = u.uid;

  const avatar = document.createElement('div');
  avatar.className = 'ad-row-avatar';
  if (u.photoURL) { avatar.style.backgroundImage = 'url(' + u.photoURL + ')'; }
  else { avatar.textContent = initialsOf(u); }

  const info = document.createElement('div');
  info.className = 'ad-row-info';
  const name = document.createElement('div');
  name.className = 'ad-row-name';
  name.innerHTML = '<span>' + (((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
  const email = document.createElement('div');
  email.className = 'ad-row-email';
  email.textContent = u.email || (u.telegramId ? 'Telegram ID: ' + u.telegramId : (u.githubLogin ? 'GitHub: @' + u.githubLogin : ''));
  info.appendChild(name);
  info.appendChild(email);

  const actions = document.createElement('div');
  actions.className = 'ad-row-actions';

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'ad-act-btn reset';
  resetBtn.innerHTML = RESET_ICON;
  resetBtn.setAttribute('aria-label', 'Reset password');
  resetBtn.addEventListener('click', () => openResetOverlay(u));

  const banBtn = document.createElement('button');
  banBtn.type = 'button';
  banBtn.className = 'ad-act-btn ban';
  banBtn.innerHTML = BAN_ICON;
  banBtn.setAttribute('aria-label', 'Ban account');
  banBtn.addEventListener('click', () => handleBan(u, row, banBtn));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'ad-act-btn delete';
  delBtn.innerHTML = DELETE_ICON;
  delBtn.setAttribute('aria-label', 'Delete account');
  delBtn.addEventListener('click', () => handleDelete(u, row, delBtn));

  actions.appendChild(resetBtn);
  actions.appendChild(banBtn);
  actions.appendChild(delBtn);

  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(actions);
  return row;
}

function renderBannedRow(u){
  const row = document.createElement('div');
  row.className = 'ad-row';
  row.dataset.uid = u.uid;

  const avatar = document.createElement('div');
  avatar.className = 'ad-row-avatar';
  if (u.photoURL) { avatar.style.backgroundImage = 'url(' + u.photoURL + ')'; }
  else { avatar.textContent = initialsOf(u); }

  const info = document.createElement('div');
  info.className = 'ad-row-info';
  const name = document.createElement('div');
  name.className = 'ad-row-name';
  name.innerHTML = '<span>' + (((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>';
  const email = document.createElement('div');
  email.className = 'ad-row-email';
  email.textContent = u.email || (u.telegramId ? 'Telegram ID: ' + u.telegramId : (u.githubLogin ? 'GitHub: @' + u.githubLogin : ''));
  info.appendChild(name);
  info.appendChild(email);

  const actions = document.createElement('div');
  actions.className = 'ad-row-actions';

  const unbanBtn = document.createElement('button');
  unbanBtn.type = 'button';
  unbanBtn.className = 'ad-act-btn unban';
  unbanBtn.innerHTML = UNBAN_ICON;
  unbanBtn.setAttribute('aria-label', 'Unban account');
  unbanBtn.addEventListener('click', () => handleUnban(u, row, unbanBtn));

  actions.appendChild(unbanBtn);
  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(actions);
  return row;
}

function renderVerifyRow(u){
  const row = document.createElement('div');
  row.className = 'ad-row';
  row.dataset.uid = u.uid;

  const avatar = document.createElement('div');
  avatar.className = 'ad-row-avatar';
  if (u.photoURL) { avatar.style.backgroundImage = 'url(' + u.photoURL + ')'; }
  else { avatar.textContent = initialsOf(u); }

  const info = document.createElement('div');
  info.className = 'ad-row-info';
  const name = document.createElement('div');
  name.className = 'ad-row-name';
  name.innerHTML = '<span>' + (((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
  const email = document.createElement('div');
  email.className = 'ad-row-email';
  email.textContent = u.email || (u.telegramId ? 'Telegram ID: ' + u.telegramId : (u.githubLogin ? 'GitHub: @' + u.githubLogin : ''));
  info.appendChild(name);
  info.appendChild(email);

  const actions = document.createElement('div');
  actions.className = 'ad-row-actions';

  const verifyBtn = document.createElement('button');
  verifyBtn.type = 'button';
  const isVerified = u.isAdmin || u.verified;
  verifyBtn.className = 'ad-act-btn' + (isVerified ? ' verified' : ' verify');
  verifyBtn.innerHTML = isVerified ? PROFILE_VERIFIED_ICON : PROFILE_ICON;
  verifyBtn.setAttribute('aria-label', isVerified ? 'Remove verification' : 'Grant verification');
  if (u.isAdmin) {
    verifyBtn.disabled = true;
  } else {
    verifyBtn.addEventListener('click', () => handleVerifyToggle(u, row, verifyBtn));
  }

  actions.appendChild(verifyBtn);
  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(actions);
  return row;
}

async function handleVerifyToggle(u, row, btn){
  const wasVerified = btn.classList.contains('verified');
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span>';
  try {
    if (wasVerified) {
      await postJSON('/api/admin/users/' + u.uid + '/unverify', {});
      btn.innerHTML = PROFILE_ICON;
      btn.className = 'ad-act-btn verify';
      btn.setAttribute('aria-label', 'Grant verification');
      const nameSpan = row.querySelector('.ad-row-name');
      const badge = nameSpan && nameSpan.querySelector('svg[aria-label="Admin"]');
      if (badge) badge.remove();
      showToast('@' + u.username + ' is no longer verified.');
      btn.disabled = false;
    } else {
      await postJSON('/api/admin/users/' + u.uid + '/verify', {});
      btn.innerHTML = CHECK_ICON;
      btn.classList.add('done');
      const nameSpan = row.querySelector('.ad-row-name');
      if (nameSpan && !nameSpan.innerHTML.includes('aria-label="Admin"')) {
        nameSpan.innerHTML += VERIFIED_BADGE;
      }
      showToast('@' + u.username + ' is now verified.');
      setTimeout(() => {
        btn.innerHTML = PROFILE_VERIFIED_ICON;
        btn.className = 'ad-act-btn verified';
        btn.setAttribute('aria-label', 'Remove verification');
        btn.disabled = false;
      }, 700);
    }
  } catch (err) {
    showToast(err.message || 'Could not update verification.');
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

function fadeRemoveRow(row, after){
  row.classList.add('removing');
  setTimeout(() => {
    row.remove();
    if (after) after();
    refreshEmptyStates();
  }, 260);
}

function refreshEmptyStates(){
  const usersList = document.getElementById('usersList');
  const bannedList = document.getElementById('bannedList');
  if (!usersList.querySelector('.ad-row') && !usersList.querySelector('.ad-loading')) {
    if (!usersList.querySelector('.ad-empty')) {
      const empty = document.createElement('div');
      empty.className = 'ad-empty';
      empty.textContent = 'No accounts found.';
      usersList.appendChild(empty);
    }
  }
  if (!bannedList.querySelector('.ad-row')) {
    bannedList.innerHTML = '<div class="ad-empty">No banned users right now.</div>';
  } else {
    bannedList.querySelectorAll('.ad-empty').forEach((el) => el.remove());
  }
  document.getElementById('bannedCount').style.display = bannedList.querySelectorAll('.ad-row').length ? 'inline-block' : 'none';
  document.getElementById('bannedCount').textContent = bannedList.querySelectorAll('.ad-row').length;
}

async function handleBan(u, row, btn){
  const ok = await askConfirm('Ban this account?', '@' + u.username + ' will be signed out and blocked from logging in until unbanned.');
  if (!ok) return;
  const buttons = row.querySelectorAll('.ad-act-btn');
  buttons.forEach((b) => b.disabled = true);
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span>';
  try {
    await postJSON('/api/admin/users/' + u.uid + '/ban', {});
    btn.innerHTML = CHECK_ICON;
    btn.classList.add('done');
    showToast('@' + u.username + ' has been banned.');
    setTimeout(() => {
      fadeRemoveRow(row, () => {
        document.getElementById('bannedList').querySelectorAll('.ad-empty').forEach((el) => el.remove());
        document.getElementById('bannedList').prepend(renderBannedRow({ ...u, banned: true }));
        refreshEmptyStates();
      });
    }, 700);
  } catch (err) {
    showToast(err.message || 'Could not ban that account.');
    btn.innerHTML = original;
    buttons.forEach((b) => b.disabled = false);
  }
}

async function handleUnban(u, row, btn){
  const buttons = row.querySelectorAll('.ad-act-btn');
  buttons.forEach((b) => b.disabled = true);
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span>';
  try {
    await postJSON('/api/admin/users/' + u.uid + '/unban', {});
    btn.innerHTML = CHECK_ICON;
    btn.classList.add('done');
    showToast('@' + u.username + ' has been unbanned.');
    setTimeout(() => {
      fadeRemoveRow(row, () => {
        document.getElementById('usersList').querySelectorAll('.ad-empty').forEach((el) => el.remove());
        document.getElementById('usersList').prepend(renderUserRow({ ...u, banned: false }));
        refreshEmptyStates();
      });
    }, 700);
  } catch (err) {
    showToast(err.message || 'Could not unban that account.');
    btn.innerHTML = original;
    buttons.forEach((b) => b.disabled = false);
  }
}

async function handleDelete(u, row, btn){
  const ok = await askConfirm('Delete this account?', 'This permanently removes @' + u.username + ' from Firebase. This cannot be undone.');
  if (!ok) return;
  const buttons = row.querySelectorAll('.ad-act-btn');
  buttons.forEach((b) => b.disabled = true);
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span>';
  try {
    await postJSON('/api/admin/users/' + u.uid + '/delete', {});
    btn.innerHTML = CHECK_ICON;
    btn.classList.add('done', 'danger-done');
    showToast('@' + u.username + "'s account was deleted.");
    setTimeout(() => fadeRemoveRow(row), 700);
  } catch (err) {
    showToast(err.message || 'Could not delete that account.');
    btn.innerHTML = original;
    buttons.forEach((b) => b.disabled = false);
  }
}

let resetTarget = null;
function openResetOverlay(u){
  resetTarget = u;
  document.getElementById('resetModalSub').textContent = 'Set a new password for @' + u.username + '.';
  document.getElementById('resetNewPw').value = '';
  document.getElementById('resetConfirmPw').value = '';
  const msg = document.getElementById('resetMsg');
  msg.textContent = '';
  msg.className = 'ad-modal-msg';
  document.getElementById('resetOverlay').classList.add('show');
  setTimeout(() => document.getElementById('resetNewPw').focus(), 150);
}
document.getElementById('resetCancelBtn').addEventListener('click', () => {
  document.getElementById('resetOverlay').classList.remove('show');
  resetTarget = null;
});
document.getElementById('resetOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'resetOverlay') {
    document.getElementById('resetOverlay').classList.remove('show');
    resetTarget = null;
  }
});
document.getElementById('resetApplyBtn').addEventListener('click', async () => {
  if (!resetTarget) return;
  const pw = document.getElementById('resetNewPw').value;
  const confirmPw = document.getElementById('resetConfirmPw').value;
  const msg = document.getElementById('resetMsg');
  if (!pw || pw.length < 6) { msg.textContent = 'Password must be at least 6 characters.'; msg.className = 'ad-modal-msg err'; return; }
  if (pw !== confirmPw) { msg.textContent = 'Passwords do not match.'; msg.className = 'ad-modal-msg err'; return; }
  const btn = document.getElementById('resetApplyBtn');
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span> Applying…';
  try {
    await postJSON('/api/admin/users/' + resetTarget.uid + '/reset-password', { newPassword: pw });
    btn.innerHTML = CHECK_ICON + ' Done';
    msg.textContent = 'Password updated.';
    msg.className = 'ad-modal-msg ok';
    showToast("@" + resetTarget.username + "'s password was changed.");
    setTimeout(() => {
      document.getElementById('resetOverlay').classList.remove('show');
      btn.innerHTML = original;
      btn.disabled = false;
      resetTarget = null;
    }, 900);
  } catch (err) {
    msg.textContent = err.message || 'Could not update password.';
    msg.className = 'ad-modal-msg err';
    btn.innerHTML = original;
    btn.disabled = false;
  }
});

let nextCursor = null;
let loadingMore = false;
async function loadUsersPage(reset){
  const list = document.getElementById('usersList');
  const loadMoreBtn = document.getElementById('usersLoadMore');
  if (reset) {
    list.innerHTML = '<div class="ad-loading ad-hint">Loading accounts…</div>';
    nextCursor = null;
  }
  loadingMore = true;
  try {
    const data = await getJSON('/api/admin/users' + (nextCursor ? ('?cursor=' + encodeURIComponent(nextCursor)) : ''));
    if (reset) list.innerHTML = '';
    list.querySelectorAll('.ad-loading').forEach((el) => el.remove());
    (data.results || []).forEach((u) => list.appendChild(renderUserRow(u)));
    nextCursor = data.nextCursor || null;
    loadMoreBtn.style.display = nextCursor ? 'block' : 'none';
    const countEl = document.getElementById('usersCount');
    const total = list.querySelectorAll('.ad-row').length;
    countEl.style.display = total ? 'inline-block' : 'none';
    countEl.textContent = total + (nextCursor ? '+' : '');
    refreshEmptyStates();
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load accounts.</div>';
  }
  loadingMore = false;
}
document.getElementById('usersLoadMore').addEventListener('click', () => {
  if (loadingMore) return;
  loadUsersPage(false);
});

let searchDebounce = null;
const searchInput = document.getElementById('userSearchInput');
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = searchInput.value.trim();
  if (!q) {
    document.getElementById('usersLoadMore').style.display = nextCursor ? 'block' : 'none';
    loadUsersPage(true);
    return;
  }
  document.getElementById('usersLoadMore').style.display = 'none';
  searchDebounce = setTimeout(async () => {
    const list = document.getElementById('usersList');
    list.innerHTML = '<div class="ad-loading ad-hint">Searching…</div>';
    try {
      const data = await getJSON('/api/admin/users/search?q=' + encodeURIComponent(q));
      list.innerHTML = '';
      const results = data.results || [];
      if (!results.length) {
        list.innerHTML = '<div class="ad-empty">No matching accounts.</div>';
      } else {
        results.forEach((u) => list.appendChild(renderUserRow(u)));
      }
    } catch (err) {
      list.innerHTML = '<div class="ad-empty">Search failed.</div>';
    }
  }, 300);
});

let verifyNextCursor = null;
let verifyLoadingMore = false;
async function loadVerifyPage(reset){
  const list = document.getElementById('verifyList');
  const loadMoreBtn = document.getElementById('verifyLoadMore');
  if (reset) {
    list.innerHTML = '<div class="ad-loading ad-hint">Loading accounts…</div>';
    verifyNextCursor = null;
  }
  verifyLoadingMore = true;
  try {
    const data = await getJSON('/api/admin/users' + (verifyNextCursor ? ('?cursor=' + encodeURIComponent(verifyNextCursor)) : ''));
    if (reset) list.innerHTML = '';
    list.querySelectorAll('.ad-loading').forEach((el) => el.remove());
    (data.results || []).forEach((u) => list.appendChild(renderVerifyRow(u)));
    verifyNextCursor = data.nextCursor || null;
    loadMoreBtn.style.display = verifyNextCursor ? 'block' : 'none';
    if (!list.querySelector('.ad-row')) {
      list.innerHTML = '<div class="ad-empty">No accounts found.</div>';
    }
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load accounts.</div>';
  }
  verifyLoadingMore = false;
}
document.getElementById('verifyLoadMore').addEventListener('click', () => {
  if (verifyLoadingMore) return;
  loadVerifyPage(false);
});

let verifySearchDebounce = null;
const verifySearchInput = document.getElementById('verifySearchInput');
verifySearchInput.addEventListener('input', () => {
  clearTimeout(verifySearchDebounce);
  const q = verifySearchInput.value.trim();
  const list = document.getElementById('verifyList');
  if (!q) {
    document.getElementById('verifyLoadMore').style.display = verifyNextCursor ? 'block' : 'none';
    loadVerifyPage(true);
    return;
  }
  document.getElementById('verifyLoadMore').style.display = 'none';
  list.innerHTML = '<div class="ad-loading ad-hint">Searching…</div>';
  verifySearchDebounce = setTimeout(async () => {
    try {
      const data = await getJSON('/api/admin/users/search?q=' + encodeURIComponent(q));
      list.innerHTML = '';
      const results = data.results || [];
      if (!results.length) {
        list.innerHTML = '<div class="ad-empty">No matching accounts.</div>';
      } else {
        results.forEach((u) => list.appendChild(renderVerifyRow(u)));
      }
    } catch (err) {
      list.innerHTML = '<div class="ad-empty">Search failed.</div>';
    }
  }, 300);
});

async function loadBannedUsers(){
  const list = document.getElementById('bannedList');
  list.innerHTML = '<div class="ad-hint">Loading…</div>';
  try {
    const data = await getJSON('/api/admin/users/banned');
    list.innerHTML = '';
    const results = data.results || [];
    if (!results.length) {
      list.innerHTML = '<div class="ad-empty">No banned users right now.</div>';
    } else {
      results.forEach((u) => list.appendChild(renderBannedRow(u)));
    }
    const countEl = document.getElementById('bannedCount');
    countEl.style.display = results.length ? 'inline-block' : 'none';
    countEl.textContent = results.length;
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load banned users.</div>';
  }
}

function renderBotUserRow(u){
  const row = document.createElement('div');
  row.className = 'ad-row';
  row.style.cursor = 'pointer';
  row.dataset.uid = u.uid;

  const avatar = document.createElement('div');
  avatar.className = 'ad-row-avatar';
  if (u.photoURL) { avatar.style.backgroundImage = 'url(' + u.photoURL + ')'; }
  else { avatar.textContent = initialsOf(u); }

  const info = document.createElement('div');
  info.className = 'ad-row-info';
  const name = document.createElement('div');
  name.className = 'ad-row-name';
  const displayName = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : (u.username ? '@' + u.username : u.uid));
  name.innerHTML = '<span>' + displayName + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
  const email = document.createElement('div');
  email.className = 'ad-row-email';
  email.textContent = (u.email ? u.email + '  ·  ' : '') + u.activeCount + ' active / ' + u.count + ' total';
  info.appendChild(name);
  info.appendChild(email);

  row.appendChild(avatar);
  row.appendChild(info);
  row.addEventListener('click', () => openBotsOverlay(u.uid, displayName));
  return row;
}

function formatTplTime(ms){
  if (!ms) return 'never';
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

async function loadTemplateStatus(){
  const row = document.getElementById('tplStatusRow');
  const text = document.getElementById('tplStatusText');
  try {
    const data = await getJSON('/api/admin/bots/template-status');
    if (!data.exists) {
      row.className = 'ad-tpl-status';
      text.textContent = 'No template built yet — nothing deployed so far.';
    } else if (data.latestShaError) {
      row.className = 'ad-tpl-status stale';
      text.textContent = 'Running ' + (data.currentSha || '?').slice(0, 7) + ' — could not reach GitHub to compare (' + data.latestShaError + ').';
    } else if (data.upToDate) {
      row.className = 'ad-tpl-status current';
      text.textContent = 'Up to date (' + data.currentSha.slice(0, 7) + ') — built ' + formatTplTime(data.builtAt) + '.';
    } else {
      row.className = 'ad-tpl-status stale';
      text.textContent = 'Update available: running ' + (data.currentSha || '?').slice(0, 7) + ', latest is ' + data.latestSha.slice(0, 7) + '.';
    }
  } catch (err) {
    row.className = 'ad-tpl-status stale';
    text.textContent = 'Could not load template status.';
  }
}

document.getElementById('tplCheckBtn').addEventListener('click', async () => {
  const btn = document.getElementById('tplCheckBtn');
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Checking…';
  try {
    const result = await postJSON('/api/admin/bots/check-updates');
    if (!result.checked) {
      showToast(result.reason || 'Could not check right now.');
    } else if (result.updated) {
      showToast('Updated to ' + result.currentSha.slice(0, 7) + ' — restarted ' + result.restarted + ' bot(s).');
      loadBotsUsers();
    } else {
      showToast('Already up to date.');
    }
    loadTemplateStatus();
  } catch (err) {
    showToast(err.message || 'Update check failed.');
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});

async function loadBotsUsers(){
  const list = document.getElementById('botsUsersList');
  const countEl = document.getElementById('botsUsersCount');
  try {
    const data = await getJSON('/api/admin/bots/users');
    const users = data.users || [];
    countEl.style.display = users.length ? '' : 'none';
    countEl.textContent = String(users.length);
    if (!users.length) { list.innerHTML = '<div class="ad-empty">No one has deployed a bot yet.</div>'; return; }
    list.innerHTML = '';
    users.forEach((u) => list.appendChild(renderBotUserRow(u)));
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load bot deployments.</div>';
  }
}

const BOT_STATUS_LABELS = {
  downloading: 'Downloading', extracting: 'Extracting', installing: 'Installing', starting: 'Starting',
  pairing: 'Awaiting pairing', connected: 'Connected', reconnecting: 'Reconnecting', stopped: 'Stopped',
  crashed: 'Crashed', needs_repair: 'Needs re-pair', disconnected: 'Disconnected',
};
const BOT_RUNNING_STATUSES = ['downloading', 'extracting', 'installing', 'starting', 'pairing', 'connected', 'reconnecting'];

function renderBotCard(bot, targetUid){
  const card = document.createElement('div');
  card.className = 'ad-bot-card';
  card.dataset.id = bot.id;

  const head = document.createElement('div');
  head.className = 'ad-bot-card-head';
  const name = document.createElement('div');
  name.className = 'ad-bot-card-name';
  name.textContent = bot.label || 'Bot';
  const badge = document.createElement('div');
  badge.className = 'ad-bot-badge b-' + bot.status;
  badge.textContent = BOT_STATUS_LABELS[bot.status] || bot.status;
  head.appendChild(name);
  head.appendChild(badge);

  const meta = document.createElement('div');
  meta.className = 'ad-bot-card-meta';
  meta.textContent = 'Number: ' + (bot.phoneNumber || '—') + (bot.lastError ? ' · ' + bot.lastError : '');

  const actions = document.createElement('div');
  actions.className = 'ad-bot-card-actions';
  const running = BOT_RUNNING_STATUSES.includes(bot.status);

  if (running) {
    const stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'ad-modal-btn ghost';
    stopBtn.textContent = 'Stop';
    stopBtn.addEventListener('click', () => runBotAction(bot.id, targetUid, 'stop', stopBtn));
    actions.appendChild(stopBtn);
  }

  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'ad-modal-btn ghost';
  restartBtn.textContent = 'Restart';
  restartBtn.addEventListener('click', () => runBotAction(bot.id, targetUid, 'restart', restartBtn));

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'ad-modal-btn danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', () => runBotAction(bot.id, targetUid, 'delete', delBtn));

  actions.appendChild(restartBtn);
  actions.appendChild(delBtn);

  card.appendChild(head);
  card.appendChild(meta);
  card.appendChild(actions);
  return card;
}

async function refreshBotsModal(targetUid){
  const list = document.getElementById('botsModalList');
  try {
    const data = await getJSON('/api/admin/bots/users/' + targetUid);
    const bots = data.bots || [];
    if (!bots.length) { list.innerHTML = '<div class="ad-empty">No deployments left for this user.</div>'; return; }
    list.innerHTML = '';
    bots.forEach((bot) => list.appendChild(renderBotCard(bot, targetUid)));
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load this user&#39;s deployments.</div>';
  }
}

async function runBotAction(botId, targetUid, act, btn){
  const confirmText = {
    stop: ['Stop this bot?', 'It stays deployed — the owner can restart it later without re-pairing.'],
    restart: ['Restart this bot?', 'This pulls the latest code and reconnects using its saved session — no new pairing code needed unless that session is no longer valid.'],
    delete: ['Delete this deployment?', 'This stops the bot and permanently removes it. This cannot be undone.'],
  }[act];
  const ok = await askConfirm(confirmText[0], confirmText[1]);
  if (!ok) return;
  btn.disabled = true;
  try {
    if (act === 'stop') await postJSON('/api/admin/bots/' + botId + '/stop');
    else if (act === 'restart') await postJSON('/api/admin/bots/' + botId + '/restart');
    else if (act === 'delete') await deleteReq('/api/admin/bots/' + botId);
    await refreshBotsModal(targetUid);
    loadBotsUsers();
  } catch (err) {
    showToast(err.message || 'Could not do that.');
    btn.disabled = false;
  }
}

function openBotsOverlay(uid, displayName){
  document.getElementById('botsModalSub').textContent = displayName + "'s deployments — tap an action to manage.";
  document.getElementById('botsModalList').innerHTML = '<div class="ad-empty">Loading…</div>';
  document.getElementById('botsOverlay').classList.add('show');
  refreshBotsModal(uid);
}

document.getElementById('botsModalCloseBtn').addEventListener('click', () => {
  document.getElementById('botsOverlay').classList.remove('show');
});

(async function initHero(){
  try {
    const me = await getJSON('/api/admin/me');
    const avatar = document.getElementById('adAvatar');
    if (me.photoURL) {
      avatar.style.backgroundImage = 'url(' + me.photoURL + ')';
      avatar.textContent = '';
    } else {
      avatar.textContent = (((me.firstName || '')[0] || '') + ((me.lastName || '')[0] || '')) || 'A';
    }
    document.getElementById('adName').innerHTML =
      '<span>' + (((me.firstName || me.lastName) ? ((me.firstName || '') + ' ' + (me.lastName || '')).trim() : ('@' + me.username))) + '</span>' + VERIFIED_BADGE;
  } catch (err) {
    document.getElementById('adName').textContent = 'Admin';
  }
})();

async function loadStorage(){
  const list = document.getElementById('storageList');
  try {
    const data = await getJSON('/api/admin/system/storage');
    const REFERENCE_MB = 1024;
    const pct = Math.min((data.usedMB / REFERENCE_MB) * 100, 100);
    const warn = data.usedMB >= 500;
    list.innerHTML =
      '<div class="ad-storage-row">' +
        '<div class="ad-storage-label"><span>' + data.usedMB + ' MB used</span>' +
        '<span class="ad-storage-amt">' + data.activeDeployments + ' active deployment' + (data.activeDeployments === 1 ? '' : 's') + '</span></div>' +
        '<div class="ad-storage-track"><div class="ad-storage-fill' + (warn ? ' warn' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="ad-storage-sub" style="font-size:.72rem;color:var(--muted);margin-top:6px">Disk used by downloaded bot templates and saved sessions.</div>' +
      '</div>';
  } catch (err) {
    list.innerHTML = '<div class="ad-empty">Could not load storage info.</div>';
  }
}

loadUsersPage(true);
loadBannedUsers();
loadVerifyPage(true);
loadBotsUsers();
loadTemplateStatus();
loadStorage();

})();
</script>
</body>
</html>`;
}
