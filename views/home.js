const ICONS = {
  home: '<path stroke-linecap="round" stroke-linejoin="round" d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  live: '<rect x="2" y="4" width="20" height="14" rx="2.5"/><path stroke-linecap="round" d="M8 21h8"/><path d="M10.5 8.5l4 2.5-4 2.5z" fill="currentColor" stroke="none"/>',
  profile: '<path stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  football: '<circle cx="12" cy="12" r="9"/><path stroke-linejoin="round" d="M12 8l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path stroke-linecap="round" d="M12 3v5M20.5 9.5L15.5 10.5M17.5 19l-3.3-4.5M6.5 19l3.3-4.5M3.5 9.5l5 1"/>',
  tools: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>',
  promote: '<path d="m3 11 18-5v12L3 14v-3z" stroke-linejoin="round"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" stroke-linecap="round"/>',
  react: '<path stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>',
  bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1" fill="currentColor"/><circle cx="15.5" cy="16" r="1" fill="currentColor"/><path stroke-linecap="round" d="M12 11V7M9 3h6"/>',
  api: '<path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
  account: '<circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  admin: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"/>',
  bell: '<path stroke-linecap="round" stroke-linejoin="round" d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"/>',
  search: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
  menu: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path stroke-linecap="round" d="M12 5v14M5 12h14"/>',
  theme: '<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
};

function icon(name, size) {
  const s = size || 20;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ICONS[name]}</svg>`;
}

const NAV = [
  { id: "home", href: "/", label: "Home", icon: "home", active: true },
  { id: "live", href: "/live", label: "Live TV", icon: "live" },
  { id: "profile", href: "/profile", label: "Profile", icon: "profile" },
  { id: "football", href: "/football", label: "Football", icon: "football" },
  { id: "tools", href: "/tools", label: "Tools", icon: "tools" },
  { id: "promote", href: "/promote", label: "Promote", icon: "promote" },
  { id: "react", href: "/channel-react", label: "Channel Reaction", icon: "react" },
  { id: "bot", href: "/deploy-bot", label: "Deploy Bot", icon: "bot" },
  { id: "api", href: "/developers", label: "Developers", icon: "api" },
  { id: "account", href: "/account", label: "Account", icon: "account", dot: true },
];

function navLinks() {
  return NAV.map(
    (item) => `<a href="${item.href}" class="hm-link${item.active ? " active" : ""}" data-nav="${item.id}">${icon(item.icon)}<span>${item.label}</span>${item.dot ? '<i class="hm-dot js-dot"></i>' : ""}</a>`
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
  --red:#FF3B5C;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.5);--muted2:rgba(255,255,255,.26);
  --nav-bg:rgba(10,10,15,.92);
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
a{color:inherit;text-decoration:none}
button,input,textarea{font-family:inherit;color:inherit}
button{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
body.hm-locked{overflow:hidden}

.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.4;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.36;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.24;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}

.glass{background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.16);box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12)}
:root[data-theme="light"] .glass{background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);border:1px solid rgba(255,255,255,.55);box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6)}

.hm-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:10px;border:none;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.82rem;font-weight:700;transition:transform .15s var(--ease),box-shadow .15s var(--ease)}
.hm-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.hm-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.hm-btn.ghost{background:var(--card2);color:var(--text);border:1px solid var(--border-strong)}
.hm-btn.ghost:hover{border-color:var(--accent);box-shadow:none;transform:none}
.hm-btn.small{padding:6px 12px;font-size:.74rem;border-radius:8px}

.hm-nav{position:sticky;top:0;z-index:30;height:58px;display:flex;align-items:center;gap:12px;padding:0 16px;padding-top:env(safe-area-inset-top,0px);box-sizing:content-box;background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px)}
.hm-icon-btn{position:relative;width:38px;height:38px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--muted);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.hm-icon-btn:hover{color:var(--accent);background:var(--card2)}
.hm-menu-btn{display:inline-flex}
.hm-logo{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:.98rem;letter-spacing:-.01em;white-space:nowrap}
.hm-logo img{width:26px;height:26px;border-radius:7px}
.hm-pill{font-family:var(--font-mono);font-size:.56rem;font-weight:600;letter-spacing:.1em;padding:2px 6px;border-radius:5px;background:rgba(255,59,92,.14);color:var(--red);border:1px solid rgba(255,59,92,.3)}
.hm-search{position:relative;flex:1;max-width:420px;margin:0 auto}
.hm-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
.hm-search input{width:100%;height:38px;border-radius:999px;border:1px solid var(--border-strong);background:var(--dark3);padding:0 14px 0 38px;font-size:.84rem;outline:none;transition:border-color .15s}
.hm-search input:focus{border-color:var(--accent)}
.hm-results{position:absolute;top:44px;left:0;right:0;border-radius:14px;padding:6px;display:none;max-height:340px;overflow-y:auto;z-index:40;background:var(--card);border:1px solid var(--border-strong);box-shadow:0 18px 40px rgba(0,0,0,.4)}
.hm-results.show{display:block}
.hm-result{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;width:100%;background:none;border:0;text-align:left}
.hm-result:hover{background:var(--card2)}
.hm-result-info{min-width:0;flex:1}
.hm-nav-right{display:flex;align-items:center;gap:4px;margin-left:auto}
.hm-dot{position:absolute;top:7px;right:7px;width:8px;height:8px;border-radius:50%;background:var(--red);border:2px solid var(--dark);display:none}
.hm-dot.show{display:block}
.hm-link .hm-dot{position:static;margin-left:auto;border-color:transparent}

.hm-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;font-family:var(--font-display);font-weight:700;font-size:.9rem;display:inline-flex;align-items:center;justify-content:center;overflow:hidden}
.hm-avatar img{width:100%;height:100%;object-fit:cover;display:block}
.hm-avatar.sm{width:34px;height:34px;font-size:.78rem}
.hm-avatar.xs{width:30px;height:30px;font-size:.7rem}

.hm-layout{position:relative;z-index:1;max-width:1180px;margin:0 auto;padding:18px 14px 96px;display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-items:start}
.hm-side{display:none}
.hm-aside{display:none}
.hm-main{min-width:0;max-width:640px;width:100%;margin:0 auto}

.hm-drawer-overlay{position:fixed;inset:0;z-index:50;background:rgba(10,10,15,.7);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .2s}
.hm-drawer-overlay.show{opacity:1;pointer-events:auto}
.hm-drawer{position:fixed;top:0;bottom:0;left:0;z-index:60;width:min(300px,84vw);padding:calc(18px + env(safe-area-inset-top,0px)) 14px 18px;background:var(--card);border-right:1px solid var(--border-strong);transform:translateX(-102%);transition:transform .26s var(--ease);overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.hm-drawer.show{transform:none}
.hm-nav-list{display:flex;flex-direction:column;gap:2px}
.hm-link{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;font-size:.9rem;font-weight:600;color:var(--muted);transition:background .15s,color .15s}
.hm-link:hover{background:var(--card2);color:var(--text)}
.hm-link.active{color:var(--text);background:linear-gradient(90deg,rgba(0,224,255,.14),rgba(124,92,255,.14));box-shadow:inset 0 0 0 1px rgba(0,224,255,.25)}
.hm-link.active svg{color:var(--accent)}
.hm-link[hidden]{display:none}
.hm-me{display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:var(--card2);border:1px solid var(--border)}
.hm-me-name{font-weight:700;font-size:.86rem;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-me-user{font-size:.74rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-me-info{min-width:0;flex:1}
.hm-side-foot{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.72rem;color:var(--muted2);padding:0 6px}
.hm-side-foot a:hover,.hm-side-foot button:hover{color:var(--accent)}
.hm-side-foot button{background:none;border:0;color:inherit;font-size:inherit;padding:0}

.hm-card{border-radius:16px;padding:16px}
.hm-composer{display:flex;gap:12px;margin-bottom:14px}
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

.hm-tabs{display:flex;border:1px solid var(--border-strong);border-radius:12px;padding:3px;margin-bottom:14px;background:var(--dark3)}
.hm-tabs button{flex:1;background:none;border:0;padding:9px 10px;border-radius:9px;font-size:.82rem;font-weight:700;color:var(--muted)}
.hm-tabs button.on{background:var(--card2);color:var(--text);box-shadow:inset 0 0 0 1px var(--border)}

.hm-feed{display:flex;flex-direction:column;gap:12px}
.hm-post{border-radius:16px;padding:14px 16px}
.hm-post-head{display:flex;align-items:center;gap:10px}
.hm-post-who{min-width:0;flex:1}
.hm-post-name{font-weight:700;font-size:.88rem;display:inline-flex;align-items:center;gap:5px;max-width:100%}
.hm-post-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-post-name:hover span{color:var(--accent)}
.hm-post-meta{font-size:.72rem;color:var(--muted);margin-top:1px}
.hm-post-meta a:hover{color:var(--accent)}
.hm-check{width:14px;height:14px;color:var(--accent);flex-shrink:0}
.hm-text{margin-top:10px;font-size:.92rem;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.hm-text a{color:var(--accent);font-weight:600}
.hm-text a:hover{text-decoration:underline}
.hm-image{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin-top:10px;background:var(--card2);border:1px solid var(--border)}
.hm-actions{display:flex;align-items:center;gap:4px;margin-top:10px;margin-left:-8px}
.hm-act{display:inline-flex;align-items:center;gap:6px;background:none;border:0;color:var(--muted);padding:7px 10px;border-radius:10px;font-size:.78rem;font-weight:600;transition:color .15s,background .15s}
.hm-act:hover{background:var(--card2);color:var(--text)}
.hm-act svg{width:19px;height:19px}
.hm-act.liked{color:var(--red)}
.hm-act.liked svg{fill:var(--red)}
.hm-act.off{opacity:.35;cursor:not-allowed}
.hm-act.pop svg{animation:hmPop .28s var(--ease)}
@keyframes hmPop{50%{transform:scale(1.28)}}

.hm-comments{display:none;margin-top:6px;padding-top:12px;border-top:1px solid var(--border)}
.hm-comments.show{display:block}
.hm-comment{display:flex;gap:9px;padding:6px 0}
.hm-comment-body{min-width:0;flex:1;background:var(--card2);border-radius:12px;padding:8px 11px}
.hm-comment-name{font-size:.76rem;font-weight:700}
.hm-comment-name:hover{color:var(--accent)}
.hm-comment-text{font-size:.84rem;line-height:1.45;margin-top:2px;white-space:pre-wrap;word-break:break-word}
.hm-comment-form{display:flex;gap:8px;margin-top:8px}
.hm-comment-form input{flex:1;min-width:0;height:38px;border-radius:999px;border:1px solid var(--border-strong);background:var(--dark3);padding:0 14px;font-size:.84rem;outline:none}
.hm-comment-form input:focus{border-color:var(--accent)}
.hm-note{font-size:.78rem;color:var(--muted);text-align:center;padding:8px 0}

.hm-empty{text-align:center;padding:36px 18px;border-radius:16px}
.hm-empty h3{font-family:var(--font-display);font-size:1.02rem;font-weight:700}
.hm-empty p{font-size:.84rem;color:var(--muted);margin:8px auto 16px;max-width:320px;line-height:1.5}
.hm-more{display:block;margin:14px auto 0}
.hm-skel{height:150px;border-radius:16px;background:linear-gradient(90deg,var(--card),var(--card2),var(--card));background-size:200% 100%;animation:hmSk 1.4s linear infinite}
@keyframes hmSk{to{background-position:-200% 0}}

.hm-aside-card{border-radius:16px;padding:16px;margin-bottom:14px}
.hm-aside-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;margin-bottom:12px}
.hm-person{display:flex;align-items:center;gap:10px;padding:7px 0}
.hm-person-info{min-width:0;flex:1}
.hm-person-name{font-size:.84rem;font-weight:700;display:flex;align-items:center;gap:4px}
.hm-person-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-person-name:hover span{color:var(--accent)}
.hm-person-user{font-size:.72rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hm-live-card{display:block;border-radius:16px;padding:16px;margin-bottom:14px;background:linear-gradient(135deg,rgba(0,224,255,.16),rgba(124,92,255,.18));border:1px solid rgba(0,224,255,.28)}
.hm-live-card strong{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-size:.98rem}
.hm-live-card p{font-size:.78rem;color:var(--muted);margin-top:6px;line-height:1.45}
.hm-live-card span.go{display:inline-block;margin-top:10px;font-size:.78rem;font-weight:700;color:var(--accent)}

.hm-bnav{position:fixed;left:0;right:0;bottom:0;z-index:35;display:flex;align-items:stretch;background:var(--nav-bg);border-top:1px solid var(--border);backdrop-filter:blur(20px);padding-bottom:env(safe-area-inset-bottom,0px)}
.hm-bnav a,.hm-bnav button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:9px 4px 8px;background:none;border:0;font-size:.64rem;font-weight:600;color:var(--muted);position:relative}
.hm-bnav a.active{color:var(--accent)}
.hm-bnav .hm-post-fab{flex:0 0 auto;width:48px;height:48px;margin:-14px 6px 0;border-radius:50%;padding:0;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;box-shadow:0 10px 24px rgba(0,224,255,.35)}
.hm-bnav .hm-dot{top:6px;right:calc(50% - 16px)}

.hm-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;z-index:120;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;font-size:.82rem;font-weight:700;padding:10px 16px;border-radius:10px;pointer-events:none;transition:transform .22s var(--ease),opacity .22s;max-width:86vw;text-align:center}
.hm-toast.show{transform:translate(-50%,0);opacity:1}

@media (max-width:899px){.pn-card{bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}}
@media (min-width:900px){
  .hm-menu-btn{display:none}
  .hm-bnav{display:none}
  .hm-layout{grid-template-columns:230px minmax(0,1fr);padding-bottom:40px;gap:24px}
  .hm-side{display:flex;flex-direction:column;gap:14px;position:sticky;top:76px;max-height:calc(100vh - 92px);overflow-y:auto;scrollbar-width:none}
  .hm-side::-webkit-scrollbar{display:none}
  .hm-toast{bottom:28px}
}
.hm-people-mobile .hm-person:nth-child(n+4){display:none}
@media (min-width:1180px){
  .hm-layout{grid-template-columns:230px minmax(0,640px) 300px;justify-content:center}
  .hm-aside{display:block;position:sticky;top:76px;max-height:calc(100vh - 92px);overflow-y:auto;scrollbar-width:none}
  .hm-aside::-webkit-scrollbar{display:none}
  .hm-main{margin:0}
  .hm-people-mobile{display:none!important}
}
@media (max-width:560px){.hm-search{display:none}.hm-search.open{display:block;position:absolute;left:12px;right:12px;top:10px;max-width:none;z-index:45}.hm-search-toggle{display:inline-flex!important}.hm-pill{display:none}}
.hm-search-toggle{display:none}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<div class="aurora"><div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div></div>

<nav class="hm-nav">
  <button class="hm-icon-btn hm-menu-btn" id="hmMenuBtn" type="button" aria-label="Menu">${icon("menu")}</button>
  <a class="hm-logo" href="/"><img src="/icon-32.png" alt="" width="26" height="26">ES TEAMS TV <span class="hm-pill">LIVE</span></a>
  <div class="hm-search" id="hmSearch">
    ${icon("search", 16)}
    <input id="hmSearchInput" type="text" placeholder="Search people" autocomplete="off" spellcheck="false" aria-label="Search people">
    <div class="hm-results" id="hmResults"></div>
  </div>
  <div class="hm-nav-right">
    <button class="hm-icon-btn hm-search-toggle" id="hmSearchToggle" type="button" aria-label="Search">${icon("search")}</button>
    <a class="hm-icon-btn" href="/account" aria-label="Notifications">${icon("bell")}<i class="hm-dot js-dot"></i></a>
    <a class="hm-avatar sm" id="hmNavAvatar" href="/profile" aria-label="Your profile"></a>
  </div>
</nav>

<div class="hm-drawer-overlay" id="hmOverlay"></div>
<aside class="hm-drawer" id="hmDrawer" aria-label="Menu"></aside>

<div class="hm-layout">
  <aside class="hm-side" id="hmSide">
    <a class="hm-me glass" href="/profile" id="hmMeCard" hidden></a>
    <div class="hm-nav-list" id="hmNavList">
        ${navLinks()}
        <a href="/admin" class="hm-link" data-nav="admin" id="hmAdminLink" hidden>${icon("admin")}<span>Admin</span></a>
    </div>
    <div class="hm-side-foot"><a href="/privacy">Privacy</a><a href="/dmca">DMCA</a><button type="button" id="hmThemeBtn">Switch theme</button></div>
  </aside>

  <main class="hm-main" id="hmMain">
    <section class="hm-card glass hm-composer" id="hmComposer">
      <a class="hm-avatar" id="hmComposerAvatar" href="/profile" aria-label="Your profile"></a>
      <div class="hm-composer-body">
        <textarea id="hmText" maxlength="2000" rows="2" placeholder="What is happening?" aria-label="Write a post"></textarea>
        <div class="hm-preview" id="hmPreview"><img id="hmPreviewImg" alt=""><button type="button" id="hmPreviewClear" aria-label="Remove photo">&times;</button></div>
        <div class="hm-composer-bar">
          <label class="hm-icon-btn" for="hmFile" title="Add photo" aria-label="Add photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 16l-5-5-8 8"/></svg>
          </label>
          <input type="file" id="hmFile" accept="image/png,image/jpeg,image/webp" hidden>
          <span class="hm-count" id="hmCount">0/2000</span>
          <button class="hm-btn small" id="hmPost" type="button" disabled>Post</button>
        </div>
        <div class="hm-err" id="hmComposerErr" role="alert"></div>
      </div>
    </section>

    <section class="hm-aside-card glass hm-people-mobile" id="hmPeopleMobileCard" hidden>
      <div class="hm-aside-title">People to follow</div>
      <div id="hmPeopleMobile"></div>
    </section>

    <div class="hm-tabs" id="hmTabs" role="tablist">
      <button type="button" class="on" data-tab="discover" role="tab">For you</button>
      <button type="button" data-tab="following" role="tab">Following</button>
    </div>
    <section class="hm-feed" id="hmFeed" aria-live="polite"></section>
    <button class="hm-btn ghost hm-more" id="hmMore" type="button" hidden>Load more</button>
  </main>

  <aside class="hm-aside" id="hmAside">
    <a class="hm-live-card" href="/live">
      <strong>${icon("live", 20)} Live TV</strong>
      <p>Watch live channels and football in one place.</p>
      <span class="go">Open Live TV &rarr;</span>
    </a>
    <section class="hm-aside-card glass">
      <div class="hm-aside-title">People to follow</div>
      <div id="hmPeople"></div>
    </section>
  </aside>
</div>

<nav class="hm-bnav" id="hmBnav" aria-label="Main">
  <a href="/" class="active">${icon("home", 22)}Home</a>
  <a href="/live">${icon("live", 22)}Live</a>
  <button type="button" class="hm-post-fab" id="hmFab" aria-label="New post">${icon("plus", 24)}</button>
  <a href="/profile">${icon("profile", 22)}Profile</a>
  <button type="button" id="hmBnavMenu">${icon("menu", 22)}More<i class="hm-dot js-dot"></i></button>
</nav>

<div class="hm-toast" id="hmToast" role="status"></div>
<script nonce="__CSP_NONCE__" src="/home.js" defer></script>
</body>
</html>`;
}
