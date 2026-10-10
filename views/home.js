const BUILD = Date.now().toString(36);

const ICONS = {
  home: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  live: '<rect x="2" y="4" width="20" height="14" rx="2.5"/><path stroke-linecap="round" d="M8 21h8"/><path d="M10.5 8.5l4 2.5-4 2.5z" fill="currentColor" stroke="none"/>',
  profile: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  football: '<circle cx="12" cy="12" r="9"/><path stroke-linejoin="round" d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path stroke-linecap="round" d="M12 3v5M20.5 9.5L15.5 10.5M17.5 19l-3.3-4.5M6.5 19l3.3-4.5M3.5 9.5l5 1"/>',
  tools: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>',
  promote: '<path d="m3 11 18-5v12L3 14v-3z" stroke-linejoin="round"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" stroke-linecap="round"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"/><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5"/>',
  react: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><path stroke-linecap="round" d="M12 11V7M9 3h6"/>',
  api: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  account: '<circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  admin: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/>',
  bell: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
  search: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
  theme: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
  logout: '<path stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
};

function icon(name, size) {
  const s = size || 20;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICONS[name]}</svg>`;
}

const SIDE_LINKS = [
  { href: "/", label: "Home", icon: "home", active: true },
  { href: "/live", label: "Live TV", icon: "live" },
  { href: "/profile", label: "Profile", icon: "profile" },
  { href: "/football", label: "Football", icon: "football" },
  { href: "/tools", label: "Tools", icon: "tools" },
  { href: "/promote", label: "Promote", icon: "promote" },
  { href: "/giveaway", label: "Giveaway", icon: "gift" },
  { href: "/channel-react", label: "Channel Reaction", icon: "react" },
  { href: "/deploy-bot", label: "Deploy Bot", icon: "bot" },
  { href: "/developers", label: "Developers", icon: "api" },
  { href: "/account", label: "Account", icon: "account", dot: true },
];

function sideLinks() {
  return SIDE_LINKS.map(
    (l) => `<a href="${l.href}" class="hm-link${l.active ? " active" : ""}">${icon(l.icon)}<span>${l.label}</span>${l.dot ? '<i class="hm-dot js-dot"></i>' : ""}</a>`
  ).join("\n        ");
}

export function renderHome({ DOMAIN_LOCK_SCRIPT, siteHeadFor }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${DOMAIN_LOCK_SCRIPT || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
${siteHeadFor("home")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --red:#FF3B5C;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);--surface-tint:rgba(255,255,255,.07);--text-dim:rgba(255,255,255,.28);
  --nav-h:58px;--bnav-h:58px;
  --sk-base:rgba(255,255,255,.09);--sk-hi:rgba(255,255,255,.22);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
  --nav-bg:rgba(255,255,255,.92);--surface-tint:rgba(0,0,0,.05);--text-dim:rgba(20,20,28,.4);
  --sk-base:rgba(20,20,28,.08);--sk-hi:rgba(20,20,28,.17);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{min-height:100%}
body{background:var(--dark);color:var(--text);font-family:var(--font-body);overflow-x:hidden;position:relative;padding-top:calc(var(--nav-h) + env(safe-area-inset-top,0px))}
a{color:inherit;text-decoration:none}
button,input,textarea{font-family:inherit;color:inherit}
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

.hm-glass{background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.16);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
:root[data-theme="light"] .hm-glass{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);border:1px solid rgba(255,255,255,.55);box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6)}

.hm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:9px 16px;border-radius:10px;border:none;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.8rem;font-weight:700;transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.hm-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.hm-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.hm-btn.ghost{background:var(--card2);color:var(--text);border:1px solid var(--border-strong)}
.hm-btn.ghost:hover{border-color:var(--accent);box-shadow:none;transform:none}
.hm-btn.small{padding:6px 12px;font-size:.74rem;border-radius:8px}

.hm-nav{position:fixed;top:0;left:0;right:0;z-index:250;height:calc(var(--nav-h) + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) 16px 0;display:flex;align-items:center;gap:12px;background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 24px rgba(0,0,0,.35)}
.hm-logo{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-size:1.05rem;font-weight:700;letter-spacing:-.02em;white-space:nowrap;flex-shrink:0}
.hm-logo-text{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hm-logo img{width:26px;height:26px;border-radius:7px}
.hm-pill{font-family:var(--font-mono);font-size:.6rem;font-weight:600;letter-spacing:.12em;background:var(--surface-tint);color:var(--text-dim);padding:3px 8px;border-radius:20px;border:1px solid var(--border-strong)}
.search-wrap{flex:1;position:relative;max-width:340px;margin-left:auto}
.search-wrap>svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:15px;height:15px;opacity:.32;pointer-events:none;transition:opacity .2s var(--ease);z-index:1}
.search-input{width:100%;background:var(--card2);border:1.5px solid var(--border);border-radius:40px;padding:8px 16px 8px 38px;color:var(--text);font-size:.82rem;font-family:var(--font-body);outline:none;transition:border-color .22s var(--ease),background .22s var(--ease),box-shadow .22s var(--ease)}
.search-input::placeholder{color:var(--muted2)}
.search-input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(0,224,255,.14),0 4px 18px rgba(0,224,255,.08)}
.search-input:focus-visible{outline:none}
.search-wrap:has(.search-input:focus)>svg{opacity:.7}
.search-dropdown{position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:500;background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(18,18,28,.72);border:1.5px solid rgba(0,224,255,.22);border-radius:14px;backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset;overflow:hidden;display:none;animation:dropIn .18s var(--ease)}
:root[data-theme="light"] .search-dropdown{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),rgba(255,255,255,.78);border-color:rgba(0,170,200,.3)}
.search-dropdown.open{display:block}
@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.sd-list{max-height:260px;overflow-y:auto}
.sd-item{width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;background:none;border:none;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text);font-size:.8rem;font-weight:500;text-align:left;cursor:pointer;transition:background .14s var(--ease),color .14s var(--ease),padding-left .18s var(--ease)}
.sd-item:last-child{border-bottom:none}
.sd-item:hover{background:rgba(0,224,255,.09);color:var(--accent);padding-left:18px}
.sd-item:active{background:rgba(0,224,255,.16)}
.sd-avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent2)) center/cover no-repeat;color:#04141a;font-family:var(--font-display);font-weight:700;font-size:.72rem;display:flex;align-items:center;justify-content:center}
.sd-info{min-width:0;flex:1}
.sd-name{font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sd-user{font-size:.72rem;color:var(--muted)}
.sd-no-result{padding:14px 16px;font-size:.78rem;color:var(--muted);text-align:center;font-family:var(--font-mono)}
.fs-loading{display:flex;align-items:center;justify-content:center;gap:8px;font-size:.8rem;color:var(--muted);padding:18px 8px}
.fs-loading-dots{display:inline-flex;gap:4px}
.fs-loading-dots span{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:fsDotBounce 1.1s ease-in-out infinite}
.fs-loading-dots span:nth-child(2){animation-delay:.15s}
.fs-loading-dots span:nth-child(3){animation-delay:.3s}
@keyframes fsDotBounce{0%,80%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-5px);opacity:1}}

.hm-nav-right{display:flex;align-items:center;gap:6px;flex-shrink:0}
.hm-icon-btn{position:relative;width:36px;height:36px;border-radius:50%;background:var(--surface-tint);border:1px solid var(--border);color:var(--text);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s var(--ease),transform .15s var(--ease),border-color .2s var(--ease)}
.hm-icon-btn:hover{border-color:var(--accent);color:var(--accent)}
.hm-icon-btn:active{transform:scale(.94)}
.hm-search-toggle{display:none}
.hm-user-wrap{position:relative}
.hm-avatar{width:36px;height:36px;border-radius:50%;flex-shrink:0;border:1px solid var(--border-strong);background:linear-gradient(135deg,var(--accent),var(--accent2)) center/cover no-repeat;color:#04141a;font-family:var(--font-display);font-weight:700;font-size:.8rem;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.hm-avatar.big{width:42px;height:42px;font-size:.9rem;cursor:default}
.hm-menu{position:absolute;top:44px;right:0;min-width:200px;padding:6px;display:none;flex-direction:column;gap:2px;z-index:600;background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(18,18,28,.72);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border:1px solid rgba(255,255,255,.16);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1);animation:dropIn .18s var(--ease)}
:root[data-theme="light"] .hm-menu{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.55)}
.hm-menu.open{display:flex}
.hm-menu-head{padding:8px 10px 10px;border-bottom:1px solid var(--border);margin-bottom:4px}
.hm-menu-name{font-weight:700;font-size:.85rem;line-height:1.2}
.hm-me-name,.hm-menu-name,.sd-name{display:flex;align-items:center;min-width:0}
.hm-name-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.hm-me-name .pf-verified,.hm-menu-name .pf-verified,.sd-name .pf-verified,.hm-person-name .pf-verified{top:0;vertical-align:baseline;flex-shrink:0}
.hm-menu-user{font-size:.72rem;color:var(--muted)}
.hm-menu-item{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;border:none;background:transparent;color:var(--text);font-size:.82rem;font-weight:600;width:100%;text-align:left;transition:background .15s var(--ease)}
.hm-menu-item:hover{background:rgba(0,224,255,.09);color:var(--accent)}
.hm-menu-item svg{width:16px;height:16px;flex-shrink:0}
.hm-menu-item[hidden]{display:none}
.hm-menu-item.logout{color:var(--red)}
.hm-menu-item.logout:hover{background:rgba(255,59,92,.1);color:var(--red)}
.hm-dot{position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid var(--nav-bg);display:none}
.hm-dot.show{display:block}
.hm-link .hm-dot{position:static;margin-left:auto;border-color:transparent}

.hm-layout{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:18px 14px 96px;display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:start}
.hm-side{display:none}
.hm-aside{display:none}
.hm-main{min-width:0;max-width:640px;width:100%;margin:0 auto}

.hm-nav-list{display:flex;flex-direction:column;gap:2px}
.hm-link{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;font-size:.9rem;font-weight:600;color:var(--muted);background:none;border:0;width:100%;text-align:left;transition:background .15s,color .15s}
.hm-link:hover{background:var(--card2);color:var(--text)}
.hm-link.active{color:var(--text);background:linear-gradient(90deg,rgba(0,224,255,.14),rgba(124,92,255,.14));box-shadow:inset 0 0 0 1px rgba(0,224,255,.25)}
.hm-link.active svg{color:var(--accent)}
.hm-link[hidden]{display:none}
.hm-link.logout{color:var(--red)}
.hm-link.logout:hover{background:rgba(255,59,92,.1)}
.hm-me{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px}
.hm-me[hidden]{display:none}
.hm-me-info{min-width:0;flex:1}
.hm-me-name{font-weight:700;font-size:.86rem;line-height:1.2}
.hm-me-user{font-size:.74rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-side-foot{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.72rem;color:var(--muted2);padding:0 6px}
.hm-side-foot a:hover{color:var(--accent)}

.hm-composer{display:flex;gap:12px;padding:14px 16px;margin-bottom:14px}
.hm-composer-body{flex:1;min-width:0}
.hm-composer textarea{width:100%;min-height:52px;max-height:220px;resize:none;background:transparent;border:0;outline:none;font-size:.95rem;line-height:1.5;padding:8px 0}
.hm-composer textarea::placeholder{color:var(--muted)}
.hm-preview{position:relative;margin:6px 0 10px;border-radius:12px;overflow:hidden;border:1px solid var(--border);display:none}
.hm-preview.show{display:block}
.hm-preview img{display:block;width:100%;max-height:300px;object-fit:cover}
.hm-preview button{position:absolute;top:8px;right:8px;width:30px;height:30px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:1.1rem;line-height:1}
.hm-composer-bar{display:flex;align-items:center;gap:8px;padding-top:10px;border-top:1px solid var(--border)}
.hm-count{margin-left:auto;font-family:var(--font-mono);font-size:.68rem;color:var(--muted)}
.hm-count.warn{color:var(--red)}
.hm-err{color:var(--red);font-size:.76rem;margin-top:8px;min-height:1em}

.hm-tabs{display:flex;padding:3px;margin-bottom:14px;border-radius:12px}
.hm-tabs button{flex:1;background:none;border:0;padding:9px 10px;border-radius:9px;font-size:.82rem;font-weight:700;color:var(--muted);transition:background .2s var(--ease),color .2s var(--ease)}
.hm-tabs button.on{background:var(--card2);color:var(--text);box-shadow:inset 0 0 0 1px var(--border)}

.hm-feed-card{padding:6px 16px 0}
.hm-feed-card .feed-post:first-child,.hm-feed-card .pf-post:first-child{border-top:0}
.hm-feed-card .feed-empty{padding:30px 10px;text-align:center;color:var(--muted);font-size:.85rem;line-height:1.6}
.hm-more-wrap{padding:6px 0 16px;text-align:center}
.hm-people-inline{padding:14px 0;border-top:1px solid var(--border)}
.hm-section-title{font-family:var(--font-display);font-weight:700;font-size:.92rem;margin-bottom:10px}
.hm-person{display:flex;align-items:center;gap:10px;padding:7px 0}
.hm-person-info{min-width:0;flex:1}
.hm-person-name{font-size:.84rem;font-weight:700;display:flex;align-items:center}
.hm-person-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-person-user{font-size:.72rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-aside-card{padding:16px;margin-bottom:14px}
.hm-live-card{display:block;border-radius:16px;padding:16px;margin-bottom:14px;background:linear-gradient(135deg,rgba(0,224,255,.16),rgba(124,92,255,.18));border:1px solid rgba(0,224,255,.28)}
.hm-live-card strong{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-size:.98rem}
.hm-live-card p{font-size:.78rem;color:var(--muted);margin-top:6px;line-height:1.45}
.hm-live-card .go{display:inline-block;margin-top:10px;font-size:.78rem;font-weight:700;color:var(--accent)}

@media (max-width:899px){.pn-card{bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}}
@media (min-width:900px){
  .hm-layout{grid-template-columns:230px minmax(0,1fr);padding-bottom:40px;gap:24px}
  .hm-side{display:flex;flex-direction:column;gap:14px;position:sticky;top:76px;max-height:calc(100vh - 92px);overflow-y:auto;scrollbar-width:none}
  .hm-side::-webkit-scrollbar{display:none}
}
@media (min-width:1180px){
  .hm-layout{grid-template-columns:230px minmax(0,640px) 300px;justify-content:center}
  .hm-aside{display:block;position:sticky;top:76px;max-height:calc(100vh - 92px);overflow-y:auto;scrollbar-width:none}
  .hm-aside::-webkit-scrollbar{display:none}
  .hm-main{margin:0}
  .hm-people-inline{display:none!important}
}
@media (max-width:560px){
  .hm-pill{display:none}
  .hm-nav-right{margin-left:auto}
  .hm-search-toggle{display:inline-flex}
  .search-wrap{display:none}
  .search-wrap.open{display:block;position:fixed;left:12px;right:12px;top:calc(8px + env(safe-area-inset-top,0px));max-width:none;z-index:320}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="aurora"><div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div></div>

<nav class="hm-nav">
  <a class="hm-logo" href="/"><img src="/icon-32.png" alt="" width="26" height="26"><span class="hm-logo-text">ES TEAMS TV</span><span class="hm-pill">LIVE</span></a>
  <div class="search-wrap" id="hmSearchWrap">
    ${icon("search", 15)}
    <input class="search-input" id="hmSearchInput" type="text" placeholder="Search people..." autocomplete="off" spellcheck="false" aria-label="Search people">
    <div class="search-dropdown" id="hmSearchDrop"></div>
  </div>
  <div class="hm-nav-right">
    <button class="hm-icon-btn hm-search-toggle" id="hmSearchToggle" type="button" aria-label="Search">${icon("search", 18)}</button>
    <button class="hm-icon-btn" id="hmBell" type="button" aria-label="Notifications">${icon("bell", 18)}<i class="hm-dot js-dot"></i></button>
    <div class="hm-user-wrap">
      <button class="hm-avatar" id="hmNavAvatar" type="button" aria-label="Account menu" aria-haspopup="true"></button>
      <div class="hm-menu" id="hmUserMenu" role="menu">
        <div class="hm-menu-head"><div class="hm-menu-name" id="hmMenuName"></div><div class="hm-menu-user" id="hmMenuUser"></div></div>
        <a class="hm-menu-item" href="/profile" role="menuitem">${icon("profile", 16)}My profile</a>
        <a class="hm-menu-item" href="/account" role="menuitem">${icon("account", 16)}Account</a>
        <a class="hm-menu-item" href="/admin" id="hmMenuAdmin" role="menuitem" hidden>${icon("admin", 16)}Admin</a>
        <button class="hm-menu-item" id="hmMenuTheme" type="button" role="menuitem">${icon("theme", 16)}Switch theme</button>
        <button class="hm-menu-item logout" id="hmMenuLogout" type="button" role="menuitem">${icon("logout", 16)}Logout</button>
      </div>
    </div>
  </div>
</nav>

<div class="hm-layout">
  <aside class="hm-side" id="hmSide">
    <a class="hm-me hm-glass" href="/profile" id="hmMeCard" hidden></a>
    <div class="hm-nav-list">
        ${sideLinks()}
        <a href="/admin" class="hm-link" id="hmAdminLink" hidden>${icon("admin")}<span>Admin</span></a>
        <button type="button" class="hm-link logout" id="hmSideLogout">${icon("logout")}<span>Logout</span></button>
    </div>
    <div class="hm-side-foot"><a href="/privacy">Privacy</a><a href="/dmca">DMCA</a></div>
  </aside>

  <main class="hm-main" id="hmMain">
    <section class="hm-glass hm-composer" id="hmComposer">
      <div class="hm-avatar big" id="hmComposerAvatar"></div>
      <div class="hm-composer-body">
        <textarea id="hmText" maxlength="2000" rows="2" placeholder="What is happening?" aria-label="Write a post"></textarea>
        <div class="hm-preview" id="hmPreview"><img id="hmPreviewImg" alt=""><button type="button" id="hmPreviewClear" aria-label="Remove photo" data-nospin>&times;</button></div>
        <div class="hm-composer-bar">
          <label class="hm-icon-btn" for="hmFile" title="Add photo" aria-label="Add photo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 16l-5-5-8 8"/></svg>
          </label>
          <input type="file" id="hmFile" accept="image/png,image/jpeg,image/webp" hidden>
          <span class="hm-count" id="hmCount">0/2000</span>
          <button class="hm-btn small" id="hmPost" type="button" disabled>Post</button>
        </div>
        <div class="hm-err" id="hmComposerErr" role="alert"></div>
      </div>
    </section>

    <div class="hm-tabs hm-glass" id="hmTabs" role="tablist">
      <button type="button" class="on" data-tab="discover" role="tab" data-nospin>For you</button>
      <button type="button" data-tab="following" role="tab" data-nospin>Following</button>
    </div>
    <section class="hm-glass hm-feed-card" aria-live="polite"><div id="hmFeed"></div><div class="hm-more-wrap" id="hmMoreWrap" hidden><button class="hm-btn ghost" id="hmMore" type="button">Load more</button></div></section>
  </main>

  <aside class="hm-aside" id="hmAside">
    <a class="hm-live-card" href="/live">
      <strong>${icon("live", 20)} Live TV</strong>
      <p>Watch live channels and football in one place.</p>
      <span class="go">Open Live TV &rarr;</span>
    </a>
    <section class="hm-aside-card hm-glass">
      <div class="hm-section-title">People to follow</div>
      <div id="hmPeople"></div>
    </section>
  </aside>
</div>

<script nonce="__CSP_NONCE__" src="/site-ui.js?v=${BUILD}" defer></script>
<script nonce="__CSP_NONCE__" src="/devtools-guard.js?v=${BUILD}" defer></script>
<script nonce="__CSP_NONCE__" src="/post-ui.js?v=${BUILD}" defer></script>
<script nonce="__CSP_NONCE__" src="/status-ui.js?v=${BUILD}" defer></script>
<script nonce="__CSP_NONCE__" src="/home.js?v=${BUILD}" defer></script>
<script nonce="__CSP_NONCE__">
setTimeout(function(){
  if (window.__hmReady) return;
  var f = document.getElementById("hmFeed");
  if (!f || f.children.length) return;
  var box = document.createElement("div");
  box.className = "feed-empty";
  box.appendChild(document.createTextNode("The feed did not load. This is usually an out of date saved copy of the page."));
  box.appendChild(document.createElement("br"));
  var b = document.createElement("button");
  b.type = "button";
  b.className = "hm-btn small";
  b.style.marginTop = "12px";
  b.textContent = "Reload fresh copy";
  b.onclick = function(){
    var jobs = [];
    if (window.caches && caches.keys) jobs.push(caches.keys().then(function(k){ return Promise.all(k.map(function(x){ return caches.delete(x); })); }));
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) jobs.push(navigator.serviceWorker.getRegistrations().then(function(r){ return Promise.all(r.map(function(x){ return x.unregister(); })); }));
    Promise.all(jobs).catch(function(){}).then(function(){ location.reload(); });
  };
  box.appendChild(b);
  f.appendChild(box);
}, 6000);
</script>
</body>
</html>`;
}
