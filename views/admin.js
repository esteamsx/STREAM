import { siteHeadFor } from "../config/site.js";

export function renderAdmin(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("admin")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<title>ES TEAMS TV</title>
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
body{background:var(--dark);color:var(--text);font-family:var(--font-body);min-height:100%;overflow-x:hidden;position:relative}
.aurora{position:fixed;inset:0;overflow:hidden;z-index:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;filter:blur(65px);mix-blend-mode:screen}
.blob-1{width:560px;height:560px;background:radial-gradient(circle,var(--accent),transparent 70%);opacity:.5;top:-160px;left:-140px}
.blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--accent2),transparent 70%);opacity:.45;bottom:-180px;right:-120px}
.blob-3{width:420px;height:420px;background:radial-gradient(circle,#ff5cb8,transparent 70%);opacity:.32;top:38%;left:50%;transform:translate(-50%,-50%)}
:root[data-theme="light"] .blob{filter:blur(70px);mix-blend-mode:normal}
:root[data-theme="light"] .blob-1{background:radial-gradient(circle,rgba(0,224,255,.5),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-2{background:radial-gradient(circle,rgba(124,92,255,.45),transparent 70%);opacity:1}
:root[data-theme="light"] .blob-3{background:radial-gradient(circle,rgba(255,92,184,.35),transparent 70%);opacity:1}
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

.ad-wrap{max-width:560px;margin:0 auto;padding:24px 18px 60px;position:relative;z-index:1}

.ad-hero{
  display:flex;align-items:center;gap:14px;
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
  border-radius:18px;padding:18px;margin-bottom:20px;
}
:root[data-theme="light"] .ad-hero{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
}
.ad-avatar{
  width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.2rem;color:#04141a;background-size:cover;background-position:center;flex-shrink:0;
}
.ad-hero-name{font-family:var(--font-display);font-weight:700;font-size:1.05rem;display:flex;align-items:center;gap:4px}
.ad-hero-sub{font-size:.8rem;color:var(--muted);margin-top:2px}
.ad-verified{display:inline-flex}

.ad-card{
  background:linear-gradient(155deg,rgba(255,255,255,.1),rgba(255,255,255,.02) 40%,rgba(255,255,255,.04) 100%),rgba(255,255,255,.045);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 16px 40px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.12);
  border-radius:16px;margin-bottom:18px;overflow:hidden;border-left-width:3px;
}
.ad-card.accent-blue{border-left-color:var(--accent)}
.ad-card.accent-purple{border-left-color:var(--accent2)}
.ad-card.accent-green{border-left-color:#3DDC84}
.ad-card.accent-gold{border-left-color:#F5B700}
.ad-card.accent-red{border-left-color:#ff3b5c}
.ad-section-label{
  display:flex;align-items:center;gap:10px;margin:28px 0 12px;font-family:var(--font-display);
  font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
}
.ad-section-label::after{content:'';flex:1;height:1px;background:var(--border)}
.ad-section-label:first-child{margin-top:0}
:root[data-theme="light"] .ad-card{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%);
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 16px 40px rgba(20,20,28,.1),inset 0 1px 0 rgba(255,255,255,.6);
}
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

@keyframes adSpin{to{transform:rotate(360deg)}}
.tfa-switch{
  position:relative;width:46px;height:26px;border-radius:20px;background:var(--dark3);
  border:1px solid var(--border-strong);cursor:pointer;flex-shrink:0;transition:background .2s var(--ease);
}
.tfa-switch.on{background:linear-gradient(90deg,var(--accent),var(--accent2));border-color:transparent}
.tfa-switch-dot{
  position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;
  transition:transform .2s var(--ease);box-shadow:0 1px 3px rgba(0,0,0,.3);
}
.tfa-switch.on .tfa-switch-dot{transform:translateX(20px)}
.tfa-switch.busy{pointer-events:none;opacity:.65}
.tfa-switch.busy .tfa-switch-dot{border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;background:#fff;animation:adSpin .6s linear infinite}

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
.mt-row{display:flex;align-items:center;gap:14px}
.mt-icon-btn{
  width:46px;height:46px;flex-shrink:0;border-radius:14px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.18);color:var(--accent);cursor:pointer;
  box-shadow:0 8px 20px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.2);
  transition:border-color .2s var(--ease),transform .15s var(--ease);
}
.mt-icon-btn:hover{border-color:var(--accent);transform:translateY(-1px)}
.mt-icon-btn svg{width:23px;height:23px}
:root[data-theme="light"] .mt-icon-btn{
  background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);
  border-color:rgba(255,255,255,.65);
}
.mt-live-countdown{
  display:flex;align-items:center;gap:9px;margin-top:14px;padding:9px 13px;border-radius:12px;
  background:rgba(255,59,92,.09);border:1px solid rgba(255,59,92,.25);
  font-size:.76rem;font-weight:600;color:var(--red);flex-wrap:wrap;
}
.mt-live-dot{width:7px;height:7px;border-radius:50%;background:var(--red);flex-shrink:0}
.mt-live-countdown b{font-family:var(--font-mono);font-weight:700;letter-spacing:.02em}
.mt-end-btn{
  margin-left:auto;background:transparent;border:1px solid rgba(255,59,92,.4);color:var(--red);
  font-family:inherit;font-size:.7rem;font-weight:700;padding:5px 12px;border-radius:20px;cursor:pointer;
}
.mt-end-btn:hover{background:rgba(255,59,92,.14)}

.mt-clock-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;margin:6px 0 16px}
.mt-clock{width:176px;height:176px;flex-shrink:0;touch-action:none;user-select:none}
.mt-clock-face{
  position:relative;width:100%;height:100%;border-radius:50%;
  background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(255,255,255,.02) 45%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.2);
  box-shadow:0 14px 34px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.24);
}
:root[data-theme="light"] .mt-clock-face{
  background:linear-gradient(155deg,rgba(255,255,255,.7),rgba(255,255,255,.3) 45%,rgba(255,255,255,.4) 100%);
  border-color:rgba(255,255,255,.7);
}
.mt-tick{
  position:absolute;left:50%;top:6px;width:2px;height:8px;border-radius:2px;
  background:var(--muted2);transform-origin:50% 82px;
  transform:translateX(-50%) rotate(calc(var(--i) * 30deg));
}
.mt-tick:nth-child(3n+1){height:12px;background:var(--muted);width:2.5px}
.mt-hand{
  position:absolute;left:50%;bottom:50%;border-radius:4px;transform-origin:50% 100%;
  pointer-events:none;
}
.mt-hand-hour{width:4.5px;height:48px;margin-left:-2.25px;background:var(--text)}
.mt-hand-min{width:3px;height:68px;margin-left:-1.5px;background:var(--accent)}
.mt-pin{
  position:absolute;left:50%;top:50%;width:11px;height:11px;margin:-5.5px 0 0 -5.5px;
  border-radius:50%;background:var(--accent);box-shadow:0 0 0 3px rgba(0,224,255,.18);
}
.mt-hand-picker{display:flex;gap:6px;background:rgba(0,0,0,.22);border-radius:10px;padding:4px}
:root[data-theme="light"] .mt-hand-picker{background:rgba(20,20,28,.07)}
.mt-hand-tab{
  border:none;background:transparent;color:var(--muted);font-family:inherit;font-size:.72rem;font-weight:700;
  padding:6px 16px;border-radius:8px;cursor:pointer;transition:all .18s var(--ease);
}
.mt-hand-tab.active{background:var(--accent);color:#04141a}
.mt-digital{display:flex;align-items:center;gap:2px}
.mt-digital input{
  width:2.1ch;padding:4px 2px;border:none;background:transparent;text-align:center;
  font-family:var(--font-mono);font-size:1.5rem;font-weight:700;letter-spacing:-.01em;color:var(--text);
  border-radius:8px;outline:none;cursor:text;
  border-bottom:2px solid transparent;transition:border-color .18s var(--ease),background .18s var(--ease);
}
.mt-digital input:hover{background:rgba(0,224,255,.07)}
.mt-digital input:focus{border-bottom-color:var(--accent);background:rgba(0,224,255,.09)}
.mt-colon{font-family:var(--font-mono);font-size:1.5rem;font-weight:700;color:var(--text)}
.mt-meridiem{
  margin-left:6px;background:transparent;border:1px solid var(--border-strong);color:var(--muted);
  font-family:inherit;font-size:.72rem;font-weight:700;padding:5px 11px;border-radius:8px;cursor:pointer;
  transition:all .18s var(--ease);
}
.mt-meridiem:hover{border-color:var(--accent);color:var(--accent)}
.mt-hint{font-size:.68rem;color:var(--muted2);letter-spacing:.02em}
.mt-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.mt-field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.mt-field input,.mt-field select{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-size:.9rem;font-family:inherit;outline:none;
  transition:border-color .2s var(--ease);
}
.mt-field input:focus,.mt-field select:focus{border-color:var(--accent)}
.mt-preview{
  font-size:.76rem;color:var(--muted);line-height:1.55;margin-bottom:12px;text-align:center;
  min-height:38px;display:flex;flex-direction:column;justify-content:center;
}
.mt-preview b{color:var(--accent);font-family:var(--font-mono);font-weight:700}
.mt-preview.err{color:var(--red)}

.ad-modal{
  width:100%;max-width:340px;
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.22);border-radius:18px;
  box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3);
  padding:24px 22px;transform:translateY(10px) scale(.97);transition:transform .25s var(--ease);
}
:root[data-theme="light"] .ad-modal{
  background:linear-gradient(155deg,rgba(255,255,255,.6),rgba(255,255,255,.2) 40%,rgba(255,255,255,.3) 100%);
  border:1px solid rgba(255,255,255,.65);
  box-shadow:0 20px 60px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
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

.bonus-form{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.bonus-form select,.bonus-form input{
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:10px 12px;color:var(--text);font-size:.82rem;outline:none;transition:border-color .2s var(--ease);
  flex:1;min-width:110px;font-family:inherit;
}
.bonus-form select:focus,.bonus-form input:focus{border-color:var(--accent)}
.bonus-form button{
  flex-shrink:0;padding:10px 16px;border-radius:10px;border:none;font-weight:700;font-size:.82rem;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;
}
.bonus-form button:disabled{opacity:.55}
.bonus-form .custom-select{flex:1;min-width:110px}
.custom-select{position:relative}
.custom-select-btn{
  width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:10px 12px;color:var(--text);font-size:.82rem;font-family:inherit;cursor:pointer;
  transition:border-color .2s var(--ease);
}
.custom-select-btn:hover,.custom-select.open .custom-select-btn{border-color:var(--accent)}
.custom-select-chevron{width:15px;height:15px;color:var(--muted);flex-shrink:0;transition:transform .2s var(--ease)}
.custom-select.open .custom-select-chevron{transform:rotate(180deg)}
.custom-select-list{
  display:none;position:fixed;z-index:200;max-height:220px;overflow-y:auto;
  background:linear-gradient(155deg,rgba(255,255,255,.14),rgba(255,255,255,.03) 40%,rgba(255,255,255,.05) 100%),rgba(18,18,28,.72);
  backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
  border:1px solid rgba(255,255,255,.18);border-radius:12px;
  box-shadow:0 12px 30px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.12);
  padding:6px;
}
:root[data-theme="light"] .custom-select-list{
  background:linear-gradient(155deg,rgba(255,255,255,.5),rgba(255,255,255,.16) 40%,rgba(255,255,255,.24) 100%),rgba(255,255,255,.72);
  border:1px solid rgba(255,255,255,.6);
  box-shadow:0 12px 30px rgba(20,20,28,.16),inset 0 1px 0 rgba(255,255,255,.7);
}
.custom-select.open .custom-select-list{display:block}
.custom-select-option{
  width:100%;text-align:left;background:transparent;border:none;color:var(--text);font-family:inherit;
  font-size:.8rem;padding:9px 10px;border-radius:8px;cursor:pointer;
}
.custom-select-option:hover,.custom-select-option.active{background:var(--card2);color:var(--accent)}
.bonus-msg{font-size:.76rem;min-height:16px;margin-bottom:10px}
.bonus-msg.err{color:var(--red)}
.bonus-msg.ok{color:#3DDC84}
.bonus-list{display:flex;flex-direction:column;gap:8px;max-height:264px;overflow-y:auto}
.bonus-code-card{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--card2)}
.bonus-code-head{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.bonus-code-text{font-family:monospace;font-weight:700;font-size:.92rem;flex:1;letter-spacing:.03em}
.bonus-copy-btn{
  flex-shrink:0;width:28px;height:28px;border-radius:8px;border:1px solid var(--border-strong);background:var(--dark3);
  color:var(--muted);display:flex;align-items:center;justify-content:center;
}
.bonus-copy-btn svg{width:13px;height:13px}
.bonus-copy-btn:hover{color:var(--accent);border-color:var(--accent)}
.status-pill{font-size:.64rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:3px 8px;border-radius:20px;flex-shrink:0;white-space:nowrap}
.status-pill.ok{background:rgba(61,220,132,.15);color:#3DDC84}
.status-pill.bad{background:rgba(255,59,92,.15);color:var(--red)}
.bonus-code-meta{font-size:.72rem;color:var(--muted)}

.withdrawal-item{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--card2)}
.withdrawal-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.withdrawal-item-amount{font-family:var(--font-display);font-weight:700;font-size:1rem}
.withdrawal-item-meta{font-size:.72rem;color:var(--muted);line-height:1.6;margin-bottom:10px}
.withdrawal-confirm-btn{
  width:100%;padding:9px;border-radius:10px;border:none;font-weight:700;font-size:.8rem;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;
}
.withdrawal-confirm-btn:disabled{opacity:.55}

.crlog-item{border:1px solid var(--border);border-radius:12px;padding:12px;background:var(--card2)}
.crlog-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;gap:8px}
.crlog-item-user{font-family:var(--font-display);font-weight:700;font-size:.86rem}
.crlog-item-link{font-size:.72rem;color:var(--muted);line-height:1.5;margin-bottom:10px;word-break:break-all}
.crlog-item-actions{display:flex;gap:8px}
.crlog-copy-btn,.crlog-resend-btn{
  flex:1;padding:8px;border-radius:10px;font-weight:700;font-size:.76rem;display:flex;align-items:center;justify-content:center;gap:6px;
}
.crlog-copy-btn{background:var(--card);border:1px solid var(--border-strong);color:var(--text)}
.crlog-resend-btn{background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#04141a}
.crlog-resend-btn:disabled,.crlog-copy-btn:disabled{opacity:.55}
.ad-scroll-list{max-height:340px}

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

<div class="aurora">
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>
</div>

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
      <div class="ad-hero-name" id="adName"><span class="sk-line" style="display:inline-block;width:130px;height:15px;vertical-align:-2px"></span></div>
      <div class="ad-hero-sub">Admin / Control Panel account</div>
    </div>
  </div>

  <div class="ad-section-label">Platform</div>

  <div class="ad-card open accent-blue" id="maintenanceCard">
    <div class="ad-card-header" style="cursor:default">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
      <div class="ad-card-header-title">Maintenance Mode</div>
    </div>
    <div class="ad-card-body" style="max-height:none">
      <div class="ad-card-body-inner">
        <div class="mt-row">
          <button type="button" class="mt-icon-btn" id="maintenanceOpenBtn" aria-label="Schedule maintenance">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7.4v5l3.2 2"/></svg>
          </button>
          <div style="min-width:0;flex:1">
            <div style="font-size:.85rem;font-weight:600" id="maintenanceStatusLabel">Site is live</div>
            <div style="font-size:.74rem;color:var(--muted);margin-top:3px;line-height:1.5" id="maintenanceStatusSub">Tap the clock to schedule maintenance. Verified users and you keep full access.</div>
          </div>
        </div>
        <div class="mt-live-countdown" id="maintenanceLiveCountdown" style="display:none">
          <span class="mt-live-dot"></span>
          <span>Ends in <b id="maintenanceLiveText">00d 00:00:00</b></span>
          <button type="button" class="mt-end-btn" id="maintenanceEndBtn">End now</button>
        </div>
      </div>
    </div>
  </div>

  <div class="ad-card open accent-blue" id="pageLocksCard">
    <div class="ad-card-header" style="cursor:default">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
      <div class="ad-card-header-title">Page Locks</div>
    </div>
    <div class="ad-card-body" style="max-height:none">
      <div class="ad-card-body-inner">
        <div class="mt-row">
          <button type="button" class="mt-icon-btn" id="pageLockOpenBtn" aria-label="Lock a page">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7.4v5l3.2 2"/></svg>
          </button>
          <div style="min-width:0;flex:1">
            <div style="font-size:.85rem;font-weight:600">Lock a single page</div>
            <div style="font-size:.74rem;color:var(--muted);margin-top:3px;line-height:1.5">Block one page and its requests without taking the whole site down.</div>
          </div>
        </div>
        <div id="pageLocksList" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div>
      </div>
    </div>
  </div>

  <div class="ad-card open accent-blue" id="pushCard">
    <div class="ad-card-header" style="cursor:default">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <div class="ad-card-header-title">Push Broadcast</div>
    </div>
    <div class="ad-card-body" style="max-height:none">
      <div class="ad-card-body-inner">
        <div style="font-size:.74rem;color:var(--muted);margin-bottom:10px" id="pushStatusLine">Loading subscriber count...</div>
        <input type="text" id="pushTitleInput" placeholder="Notification title" maxlength="80" style="width:100%;margin-bottom:8px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg2,transparent);color:inherit">
        <textarea id="pushBodyInput" placeholder="Message" maxlength="200" rows="3" style="width:100%;margin-bottom:8px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg2,transparent);color:inherit;resize:vertical"></textarea>
        <input type="text" id="pushUrlInput" placeholder="Link to open on click (optional, default /)" style="width:100%;margin-bottom:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg2,transparent);color:inherit">
        <div class="ad-modal-msg" id="pushMsg"></div>
        <button type="button" class="ad-modal-btn primary" id="pushSendBtn" style="width:100%">Send to all users</button>
      </div>
    </div>
  </div>

  <div class="ad-section-label">Finance &amp; Rewards</div>

  <div class="ad-card accent-gold" id="bonusCard">
    <div class="ad-card-header" id="bonusHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
      <div class="ad-card-header-title">Bonus Codes</div>
      <div class="ad-card-count" id="bonusCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="bonus-form">
        <div class="custom-select" id="bonusAmountSelectWrap">
          <button type="button" class="custom-select-btn">
            <span>+5 requests</span>
            <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
          </button>
          <input type="hidden" id="bonusAmountSelect" value="5">
          <div class="custom-select-list">
            <div class="custom-select-option active" data-value="5">+5 requests</div>
            <div class="custom-select-option" data-value="10">+10 requests</div>
            <div class="custom-select-option" data-value="25">+25 requests</div>
            <div class="custom-select-option" data-value="50">+50 requests</div>
            <div class="custom-select-option" data-value="100">+100 requests</div>
          </div>
        </div>
        <input type="number" id="bonusMaxRedemptions" placeholder="Max users" min="1" step="1" value="1">
        <button type="button" id="bonusGenerateBtn">Generate</button>
      </div>
      <div class="bonus-msg" id="bonusMsg"></div>
      <div class="bonus-list" id="bonusList"><div class="sk-stack"><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div></div>
    </div></div>
  </div>

  <div class="ad-card accent-gold" id="withdrawalsCard">
    <div class="ad-card-header" id="withdrawalsHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
      <div class="ad-card-header-title">Withdrawal Requests</div>
      <div class="ad-card-count" id="withdrawalsCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="bonus-list" id="withdrawalsList"><div class="sk-stack"><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div></div>
    </div></div>
  </div>

  <div class="ad-card accent-gold" id="crlogCard">
    <div class="ad-card-header" id="crlogHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>
      <div class="ad-card-header-title">Channel Reactions</div>
      <div class="ad-card-count" id="crlogCount" style="display:none">0</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div class="bonus-list ad-scroll-list" id="crlogList"><div class="sk-stack"><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div></div>
    </div></div>
  </div>

  <div class="ad-section-label">Users &amp; Moderation</div>

  <div class="ad-card accent-purple" id="usersCard">
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

  <div class="ad-card accent-purple" id="bannedCard">
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

  <div class="ad-card accent-purple" id="verifyCard">
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
  <div class="ad-section-label">Bot Deployments</div>

  <div class="ad-card accent-green" id="botsCard">
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

  <div class="ad-card accent-green" id="storageCard">
    <div class="ad-card-header" id="storageHeader">
      <svg class="ad-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>
      <div class="ad-card-header-title">Bot Deployment Storage</div>
      <svg class="ad-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="ad-card-body"><div class="ad-card-body-inner">
      <div id="storageList"><div class="sk-stack"><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div></div>
    </div></div>
  </div>

</div>

<div class="ad-overlay" id="maintenanceOverlay">
  <div class="ad-modal" style="max-width:344px">
    <div class="ad-modal-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" d="M12 7.4v5l3.2 2"/></svg>
      <span id="mtModalTitle">Schedule Maintenance</span>
    </div>
    <div class="ad-modal-sub" id="mtModalSub">Drag the hands to set the time the site should come back, then pick the date.</div>

    <div class="mt-field" id="mtPageFieldWrap" style="display:none">
      <label for="mtPageSelectBtn">Page to lock</label>
      <div class="custom-select" id="mtPageSelectWrap">
        <button type="button" class="custom-select-btn" id="mtPageSelectBtn">
          <span>Choose a page</span>
          <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
        </button>
        <input type="hidden" id="mtPageSelect" value="">
        <div class="custom-select-list" id="mtPageSelectList"></div>
      </div>
    </div>

    <div class="mt-clock-wrap">
      <div class="mt-clock" id="mtClock">
        <div class="mt-clock-face">
          <span class="mt-tick" style="--i:0"></span><span class="mt-tick" style="--i:1"></span>
          <span class="mt-tick" style="--i:2"></span><span class="mt-tick" style="--i:3"></span>
          <span class="mt-tick" style="--i:4"></span><span class="mt-tick" style="--i:5"></span>
          <span class="mt-tick" style="--i:6"></span><span class="mt-tick" style="--i:7"></span>
          <span class="mt-tick" style="--i:8"></span><span class="mt-tick" style="--i:9"></span>
          <span class="mt-tick" style="--i:10"></span><span class="mt-tick" style="--i:11"></span>
          <div class="mt-hand mt-hand-hour" id="mtHandHour"></div>
          <div class="mt-hand mt-hand-min" id="mtHandMin"></div>
          <div class="mt-pin"></div>
        </div>
      </div>
      <div class="mt-hand-picker">
        <button type="button" class="mt-hand-tab active" id="mtPickHour" data-hand="hour">Hour</button>
        <button type="button" class="mt-hand-tab" id="mtPickMin" data-hand="min">Minute</button>
      </div>
      <div class="mt-digital">
        <input type="text" inputmode="numeric" maxlength="2" id="mtDigHour" aria-label="Hour" value="12">
        <span class="mt-colon">:</span>
        <input type="text" inputmode="numeric" maxlength="2" id="mtDigMin" aria-label="Minute" value="00">
        <button type="button" class="mt-meridiem" id="mtMeridiem">AM</button>
      </div>
      <div class="mt-hint">Drag a hand, or tap the numbers to type</div>
    </div>

    <div class="mt-field">
      <label for="mtDate">End date</label>
      <input type="date" id="mtDate">
    </div>

    <div class="mt-preview" id="mtPreview">Set a date to see the countdown.</div>
    <div class="ad-modal-msg" id="maintenanceMsg"></div>
    <div class="ad-modal-actions">
      <button type="button" class="ad-modal-btn ghost" id="maintenanceCancelBtn">Cancel</button>
      <button type="button" class="ad-modal-btn primary" id="maintenanceSetBtn">Set</button>
    </div>
  </div>
</div>

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

<div class="ad-overlay" id="botsOverlay">
  <div class="ad-modal ad-modal-wide">
    <div class="ad-modal-title">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="15.5" cy="16" r="1.2"/><path stroke-linecap="round" d="M12 11V7m-3 0h6"/></svg>
      Bot instances
    </div>
    <div class="ad-modal-sub" id="botsModalSub"></div>
    <div class="ad-bot-list" id="botsModalList"><div class="sk-stack"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div></div>
    <div class="ad-modal-actions single">
      <button type="button" class="ad-modal-btn ghost" id="botsModalCloseBtn">Close</button>
    </div>
  </div>
</div>

<script nonce="__CSP_NONCE__">
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

document.querySelectorAll('.custom-select').forEach((wrap) => {
  const btn = wrap.querySelector('.custom-select-btn');
  const label = btn.querySelector('span');
  const hidden = wrap.querySelector('input[type="hidden"]');
  const list = wrap.querySelector('.custom-select-list');
  function fixedContainingBlock(el){
    let p = el.parentElement;
    while (p && p !== document.body) {
      const s = getComputedStyle(p);
      if (s.transform !== 'none' || s.perspective !== 'none' || s.filter !== 'none' ||
          s.backdropFilter !== 'none' || /transform|perspective|filter/.test(s.willChange || '')) return p;
      p = p.parentElement;
    }
    return null;
  }
  function positionList(){
    const r = btn.getBoundingClientRect();
    let left = r.left;
    let top = r.bottom + 6;
    const anchor = fixedContainingBlock(list);
    if (anchor) {
      const a = anchor.getBoundingClientRect();
      left -= a.left;
      top -= a.top;
    }
    list.style.left = left + 'px';
    list.style.top = top + 'px';
    list.style.width = r.width + 'px';
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.custom-select.open').forEach((w) => { if (w !== wrap) w.classList.remove('open'); });
    const opening = !wrap.classList.contains('open');
    if (opening) positionList();
    wrap.classList.toggle('open');
  });
  list.addEventListener('click', (e) => {
    const opt = e.target.closest('.custom-select-option');
    if (!opt) return;
    hidden.value = opt.getAttribute('data-value');
    label.textContent = opt.textContent;
    list.querySelectorAll('.custom-select-option').forEach((o) => o.classList.remove('active'));
    opt.classList.add('active');
    wrap.classList.remove('open');
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select.open').forEach((w) => w.classList.remove('open'));
});
window.addEventListener('scroll', () => {
  document.querySelectorAll('.custom-select.open').forEach((w) => w.classList.remove('open'));
}, true);

document.getElementById('bonusHeader').addEventListener('click', () => {
  document.getElementById('bonusCard').classList.toggle('open');
});
document.getElementById('withdrawalsHeader').addEventListener('click', () => {
  document.getElementById('withdrawalsCard').classList.toggle('open');
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

const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
const RESET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>';
const BAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2" stroke-linecap="round"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';
const UNBAN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 109-9" stroke-linecap="round"/><path d="M3 4v5h5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
const VERIFIED_BADGE = '<svg width="15" height="15" viewBox="0 0 24 24" aria-label="Admin"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }

const bonusList = document.getElementById('bonusList');
const bonusCount = document.getElementById('bonusCount');
const bonusMsg = document.getElementById('bonusMsg');

function bonusCodeCardHtml(c){
  const used = c.redemptionsCount || 0;
  const max = c.maxRedemptions || 0;
  const active = used < max;
  const created = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '';
  return '<div class="bonus-code-card">' +
    '<div class="bonus-code-head">' +
      '<div class="bonus-code-text">' + esc(c.code) + '</div>' +
      '<button type="button" class="bonus-copy-btn" data-code="' + esc(c.code) + '" aria-label="Copy code">' + COPY_ICON + '</button>' +
      '<span class="status-pill ' + (active ? 'ok' : 'bad') + '">' + (active ? 'Active' : 'Expired') + '</span>' +
    '</div>' +
    '<div class="bonus-code-meta">+' + c.amount + ' requests · ' + used + '/' + max + ' used' + (created ? ' · ' + created : '') + '</div>' +
  '</div>';
}

function renderBonusList(codes){
  if(!codes.length){ bonusList.innerHTML = '<div class="ad-empty">No bonus codes generated yet.</div>'; return; }
  bonusList.innerHTML = codes.map(bonusCodeCardHtml).join('');
  bonusList.querySelectorAll('.bonus-copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.getAttribute('data-code')).then(() => showToast('Code copied.')).catch(() => {});
    });
  });
}

function loadBonusCodes(){
  getJSON('/api/admin/bonus-codes').then((data) => {
    const codes = data.codes || [];
    bonusCount.style.display = codes.length ? '' : 'none';
    bonusCount.textContent = String(codes.length);
    renderBonusList(codes);
  }).catch(() => { bonusList.innerHTML = '<div class="ad-empty">Could not load bonus codes.</div>'; });
}

const withdrawalsList = document.getElementById('withdrawalsList');
const withdrawalsCount = document.getElementById('withdrawalsCount');

function fmtNgnAdmin(n){ return '₦' + Number(n || 0).toLocaleString('en-NG'); }

function withdrawalItemHtml(w){
  const payout = w.payoutAmountNgn != null ? w.payoutAmountNgn : Math.round(w.amountNgn * 0.85);
  return '<div class="withdrawal-item" data-wd-id="' + esc(w.id) + '">' +
    '<div class="withdrawal-item-head">' +
      '<div class="withdrawal-item-amount">' + fmtNgnAdmin(w.amountNgn) + '</div>' +
      '<span class="status-pill bad">Pending</span>' +
    '</div>' +
    '<div class="withdrawal-item-meta">' +
      '@' + esc(w.username || 'user') + (w.email ? ' &middot; ' + esc(w.email) : '') + '<br>' +
      esc((w.bankDetails && w.bankDetails.bankName) || '') + ' &middot; ' +
      esc((w.bankDetails && w.bankDetails.accountNumber) || '') + ' &middot; ' +
      esc((w.bankDetails && w.bankDetails.accountName) || '') + '<br>' +
      'Pay out <strong>' + fmtNgnAdmin(payout) + '</strong> (after 15% fee, requested ' + fmtNgnAdmin(w.amountNgn) + ')' +
    '</div>' +
    '<button type="button" class="withdrawal-confirm-btn" data-confirm-wd="' + esc(w.id) + '">Confirm Paid</button>' +
  '</div>';
}

function renderWithdrawalsList(list){
  if(!list.length){ withdrawalsList.innerHTML = '<div class="ad-empty">No pending withdrawal requests.</div>'; return; }
  withdrawalsList.innerHTML = list.map(withdrawalItemHtml).join('');
  withdrawalsList.querySelectorAll('[data-confirm-wd]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-confirm-wd');
      btn.disabled = true;
      btn.innerHTML = '<span class="ad-spinner"></span> Confirming…';
      try {
        await postJSON('/api/admin/withdrawals/' + encodeURIComponent(id) + '/confirm', {});
        showToast('Marked as paid.');
        loadWithdrawals();
      } catch (err) {
        showToast(err.message || 'Could not confirm this withdrawal.');
        btn.disabled = false;
        btn.textContent = 'Confirm Paid';
      }
    });
  });
}

function loadWithdrawals(){
  getJSON('/api/admin/withdrawals').then((data) => {
    const list = data.withdrawals || [];
    withdrawalsCount.style.display = list.length ? '' : 'none';
    withdrawalsCount.textContent = String(list.length);
    renderWithdrawalsList(list);
  }).catch(() => { withdrawalsList.innerHTML = '<div class="ad-empty">Could not load withdrawal requests.</div>'; });
}

const crlogList = document.getElementById('crlogList');
const crlogCount = document.getElementById('crlogCount');

function fmtCrlogTime(ts){
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ' at ' + d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
}

function crlogItemHtml(entry){
  return '<div class="crlog-item" data-crlog-id="' + esc(entry.id) + '">' +
    '<div class="crlog-item-head">' +
      '<div class="crlog-item-user">@' + esc(entry.username || 'user') + '</div>' +
      '<span class="status-pill ' + (entry.charged ? 'bad' : 'ok') + '">' + (entry.charged ? entry.charged + ' coins' : 'Free') + '</span>' +
    '</div>' +
    '<div class="crlog-item-link">' + esc(entry.link || '') + '<br>' + fmtCrlogTime(entry.createdAt) +
      (entry.lastResendAt ? ' &middot; Last resent ' + fmtCrlogTime(entry.lastResendAt) : '') +
    '</div>' +
    '<div class="crlog-item-actions">' +
      '<button type="button" class="crlog-copy-btn" data-copy-link="' + esc(entry.link || '') + '">Copy Link</button>' +
      '<button type="button" class="crlog-resend-btn" data-resend-id="' + esc(entry.id) + '" data-resend-link="' + esc(entry.link || '') + '">Resend</button>' +
    '</div>' +
  '</div>';
}

function renderCrlogList(list){
  if(!list.length){ crlogList.innerHTML = '<div class="ad-empty">No channel reactions used yet.</div>'; return; }
  crlogList.innerHTML = list.map(crlogItemHtml).join('');
  crlogList.querySelectorAll('[data-copy-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const link = btn.getAttribute('data-copy-link');
      navigator.clipboard.writeText(link).then(() => showToast('Link copied.')).catch(() => showToast('Could not copy link.'));
    });
  });
  crlogList.querySelectorAll('[data-resend-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-resend-id');
      const link = btn.getAttribute('data-resend-link');
      btn.disabled = true;
      btn.innerHTML = '<span class="ad-spinner"></span> Resending…';
      try {
        await postJSON('/api/admin/channel-react-log/' + encodeURIComponent(id) + '/resend', { link });
        showToast('Reaction resent.');
        loadCrlog();
      } catch (err) {
        showToast(err.message || 'Could not resend that reaction.');
        btn.disabled = false;
        btn.textContent = 'Resend';
      }
    });
  });
}

function loadCrlog(){
  getJSON('/api/admin/channel-react-log').then((data) => {
    const list = data.entries || [];
    crlogCount.style.display = list.length ? '' : 'none';
    crlogCount.textContent = String(list.length);
    renderCrlogList(list);
  }).catch(() => { crlogList.innerHTML = '<div class="ad-empty">Could not load channel reactions.</div>'; });
}


document.getElementById('crlogHeader').addEventListener('click', () => {
  document.getElementById('crlogCard').classList.toggle('open');
});

document.getElementById('bonusGenerateBtn').addEventListener('click', () => {
  const btn = document.getElementById('bonusGenerateBtn');
  const amount = Number(document.getElementById('bonusAmountSelect').value);
  const maxRedemptions = Number(document.getElementById('bonusMaxRedemptions').value);
  bonusMsg.className = 'bonus-msg';
  bonusMsg.textContent = '';
  if (!maxRedemptions || maxRedemptions < 1) {
    bonusMsg.className = 'bonus-msg err';
    bonusMsg.textContent = 'Enter how many users can use this code.';
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="ad-spinner"></span> Generating…';
  postJSON('/api/admin/bonus-codes', { amount, maxRedemptions }).then((data) => {
    bonusMsg.className = 'bonus-msg ok';
    bonusMsg.textContent = 'Generated code: ' + data.code.code;
    loadBonusCodes();
  }).catch((err) => {
    bonusMsg.className = 'bonus-msg err';
    bonusMsg.textContent = err.message || 'Could not generate bonus code.';
  }).finally(() => { btn.disabled = false; btn.textContent = 'Generate'; });
});
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
  name.innerHTML = '<span>' + esc(((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
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
  name.innerHTML = '<span>' + esc(((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>';
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
  name.innerHTML = '<span>' + esc(((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username))) + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
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
    list.innerHTML = '<div class="ad-loading"><div class="sk-stack"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div></div></div>';
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
    list.innerHTML = '<div class="ad-loading"><div class="sk-stack"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div><div class="sk-chip" style="width:58px;height:24px"></div></div></div></div>';
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
  list.innerHTML = '<div class="sk-stack"><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div>';
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
  name.innerHTML = '<span>' + esc(displayName) + '</span>' + ((u.isAdmin || u.verified) ? VERIFIED_BADGE : '');
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
      text.textContent = 'No template built yet, nothing deployed so far.';
    } else if (data.latestShaError) {
      row.className = 'ad-tpl-status stale';
      text.textContent = 'Running ' + (data.currentSha || '?').slice(0, 7) + ', could not reach GitHub to compare (' + data.latestShaError + ').';
    } else if (data.upToDate) {
      row.className = 'ad-tpl-status current';
      text.textContent = 'Up to date (' + data.currentSha.slice(0, 7) + '), built ' + formatTplTime(data.builtAt) + '.';
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
  btn.innerHTML = '<span class="ad-spinner"></span> Checking…';
  try {
    const result = await postJSON('/api/admin/bots/check-updates');
    if (!result.checked) {
      showToast(result.reason || 'Could not check right now.');
    } else if (result.updated) {
      showToast('Updated to ' + result.currentSha.slice(0, 7) + ', restarted ' + result.restarted + ' bot(s).');
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
  meta.textContent = 'Number: ' + (bot.phoneNumber || '-') + (bot.lastError ? ' · ' + bot.lastError : '');

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
    stop: ['Stop this bot?', 'It stays deployed, the owner can restart it later without re-pairing.'],
    restart: ['Restart this bot?', 'This pulls the latest code and reconnects using its saved session. No new pairing code needed unless that session is no longer valid.'],
    delete: ['Delete this deployment?', 'This stops the bot and permanently removes it. This cannot be undone.'],
  }[act];
  const ok = await askConfirm(confirmText[0], confirmText[1]);
  if (!ok) return;
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="ad-spinner"></span>';
  try {
    if (act === 'stop') await postJSON('/api/admin/bots/' + botId + '/stop');
    else if (act === 'restart') await postJSON('/api/admin/bots/' + botId + '/restart');
    else if (act === 'delete') await deleteReq('/api/admin/bots/' + botId);
    await refreshBotsModal(targetUid);
    loadBotsUsers();
  } catch (err) {
    showToast(err.message || 'Could not do that.');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function openBotsOverlay(uid, displayName){
  document.getElementById('botsModalSub').textContent = displayName + "'s deployments. Tap an action to manage.";
  document.getElementById('botsModalList').innerHTML = '<div class="sk-stack"><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div><div class="sk-row"><div class="sk-avatar"></div><div class="sk-row-body"><div class="sk-line w60"></div><div class="sk-line w30"></div></div></div></div>';
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
      '<span>' + esc(((me.firstName || me.lastName) ? ((me.firstName || '') + ' ' + (me.lastName || '')).trim() : ('@' + me.username))) + '</span>' + VERIFIED_BADGE;
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

let mtHour = 12;
let mtMinute = 0;
let mtActiveHand = 'hour';
let mtLiveTimer = null;
let mtUntil = null;

const mtClock = document.getElementById('mtClock');
const mtHandHour = document.getElementById('mtHandHour');
const mtHandMin = document.getElementById('mtHandMin');
const mtDigHour = document.getElementById('mtDigHour');
const mtDigMin = document.getElementById('mtDigMin');
const mtMeridiem = document.getElementById('mtMeridiem');
const mtDateInput = document.getElementById('mtDate');
const mtPreview = document.getElementById('mtPreview');
const maintenanceOverlay = document.getElementById('maintenanceOverlay');
const maintenanceMsg = document.getElementById('maintenanceMsg');

function mtPad(n){ return String(n).padStart(2, '0'); }

function mtRenderHands(){
  const hourDeg = ((mtHour % 12) * 30) + (mtMinute * 0.5);
  const minDeg = mtMinute * 6;
  mtHandHour.style.transform = 'rotate(' + hourDeg + 'deg)';
  mtHandMin.style.transform = 'rotate(' + minDeg + 'deg)';
  const h12 = mtHour % 12 === 0 ? 12 : mtHour % 12;
  if (document.activeElement !== mtDigHour) mtDigHour.value = mtPad(h12);
  if (document.activeElement !== mtDigMin) mtDigMin.value = mtPad(mtMinute);
  mtMeridiem.textContent = mtHour < 12 ? 'AM' : 'PM';
  mtUpdatePreview();
}

function mtSetActiveHand(hand){
  mtActiveHand = hand;
  document.querySelectorAll('.mt-hand-tab').forEach((t) => t.classList.toggle('active', t.dataset.hand === hand));
}

function mtTargetDate(){
  if (!mtDateInput.value) return null;
  const parts = mtDateInput.value.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], mtHour, mtMinute, 0, 0);
}

function mtUpdatePreview(){
  const target = mtTargetDate();
  if (!target) {
    mtPreview.className = 'mt-preview';
    mtPreview.textContent = 'Pick an end date to see the countdown.';
    return;
  }
  const remain = target.getTime() - Date.now();
  if (remain < 60000) {
    mtPreview.className = 'mt-preview err';
    mtPreview.textContent = 'That time has already passed. Pick a later time.';
    return;
  }
  const d = Math.floor(remain / 86400000);
  const h = Math.floor((remain % 86400000) / 3600000);
  const m = Math.floor((remain % 3600000) / 60000);
  const s = Math.floor((remain % 60000) / 1000);
  mtPreview.className = 'mt-preview';
  mtPreview.innerHTML = 'Maintenance will run for <b>' + d + 'd ' + mtPad(h) + 'h ' + mtPad(m) + 'm ' + mtPad(s) + 's</b><br>' +
    'Ends ' + target.toLocaleString([], { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
}

function mtAngleFromEvent(ev){
  const rect = mtClock.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - cx;
  const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - cy;
  let deg = Math.atan2(px, -py) * (180 / Math.PI);
  if (deg < 0) deg += 360;
  return deg;
}

function mtApplyAngle(deg){
  if (mtActiveHand === 'min') {
    mtMinute = Math.round(deg / 6) % 60;
  } else {
    const wasPm = mtHour >= 12;
    let h = Math.round(deg / 30) % 12;
    if (h === 0) h = 12;
    let h24 = h % 12;
    if (wasPm) h24 += 12;
    mtHour = h24;
  }
  mtRenderHands();
}

let mtDragging = false;
function mtPickHandFromEvent(ev){
  const rect = mtClock.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - cx;
  const py = (ev.touches ? ev.touches[0].clientY : ev.clientY) - cy;
  const dist = Math.hypot(px, py);
  mtSetActiveHand(dist < rect.width * 0.33 ? 'hour' : 'min');
}
function mtDragStart(ev){
  mtDragging = true;
  mtPickHandFromEvent(ev);
  mtApplyAngle(mtAngleFromEvent(ev));
  ev.preventDefault();
}
function mtDragMove(ev){
  if (!mtDragging) return;
  mtApplyAngle(mtAngleFromEvent(ev));
  ev.preventDefault();
}
function mtDragEnd(){ mtDragging = false; }

mtClock.addEventListener('mousedown', mtDragStart);
mtClock.addEventListener('touchstart', mtDragStart, { passive: false });
window.addEventListener('mousemove', mtDragMove);
window.addEventListener('touchmove', mtDragMove, { passive: false });
window.addEventListener('mouseup', mtDragEnd);
window.addEventListener('touchend', mtDragEnd);

document.querySelectorAll('.mt-hand-tab').forEach((tab) => {
  tab.addEventListener('click', () => mtSetActiveHand(tab.dataset.hand));
});

mtMeridiem.addEventListener('click', () => {
  mtHour = (mtHour + 12) % 24;
  mtRenderHands();
});

function mtCommitHourInput(){
  let v = parseInt(mtDigHour.value.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(v)) v = mtHour % 12 === 0 ? 12 : mtHour % 12;
  v = Math.min(12, Math.max(1, v));
  const isPm = mtHour >= 12;
  let h24 = v % 12;
  if (isPm) h24 += 12;
  mtHour = h24;
  mtDigHour.value = mtPad(v);
  mtRenderHands();
}

function mtCommitMinuteInput(){
  let v = parseInt(mtDigMin.value.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(v)) v = mtMinute;
  mtMinute = Math.min(59, Math.max(0, v));
  mtDigMin.value = mtPad(mtMinute);
  mtRenderHands();
}

mtDigHour.addEventListener('focus', () => { mtSetActiveHand('hour'); mtDigHour.select(); });
mtDigMin.addEventListener('focus', () => { mtSetActiveHand('min'); mtDigMin.select(); });
mtDigHour.addEventListener('input', () => { if (mtDigHour.value.length >= 2) mtCommitHourInput(); });
mtDigMin.addEventListener('input', () => { if (mtDigMin.value.length >= 2) mtCommitMinuteInput(); });
mtDigHour.addEventListener('blur', mtCommitHourInput);
mtDigMin.addEventListener('blur', mtCommitMinuteInput);
[mtDigHour, mtDigMin].forEach((el) => {
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
});

mtDateInput.addEventListener('input', mtUpdatePreview);
mtDateInput.addEventListener('change', mtUpdatePreview);

function mtRenderLive(until){
  const wrap = document.getElementById('maintenanceLiveCountdown');
  const text = document.getElementById('maintenanceLiveText');
  if (mtLiveTimer) { clearInterval(mtLiveTimer); mtLiveTimer = null; }
  if (!until) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  const paint = () => {
    const remain = Math.max(0, until - Date.now());
    const d = Math.floor(remain / 86400000);
    const h = Math.floor((remain % 86400000) / 3600000);
    const m = Math.floor((remain % 3600000) / 60000);
    const s = Math.floor((remain % 60000) / 1000);
    text.textContent = mtPad(d) + 'd ' + mtPad(h) + ':' + mtPad(m) + ':' + mtPad(s);
    if (remain <= 0) {
      clearInterval(mtLiveTimer);
      mtLiveTimer = null;
      loadMaintenanceStatus();
    }
  };
  paint();
  mtLiveTimer = setInterval(paint, 1000);
}

async function loadPushStatus(){
  const line = document.getElementById('pushStatusLine');
  try {
    const data = await getJSON('/api/admin/push/stats');
    if (!data.enabled) {
      line.textContent = 'Push is not configured on the server yet.';
    } else {
      line.textContent = data.subscribers + ' subscriber' + (data.subscribers === 1 ? '' : 's') + ' can receive push notifications.';
    }
  } catch (err) {
    line.textContent = 'Could not load subscriber count.';
  }
}
loadPushStatus();
document.getElementById('pushSendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('pushSendBtn');
  const msg = document.getElementById('pushMsg');
  const title = document.getElementById('pushTitleInput').value.trim();
  const body = document.getElementById('pushBodyInput').value.trim();
  const url = document.getElementById('pushUrlInput').value.trim() || '/';
  msg.className = 'ad-modal-msg';
  msg.textContent = '';
  if (!title || !body) {
    msg.className = 'ad-modal-msg err';
    msg.textContent = 'Title and message are required.';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending...';
  try {
    const result = await postJSON('/api/admin/push/broadcast', { title, body, url });
    msg.className = 'ad-modal-msg ok';
    msg.textContent = 'Sent to ' + result.inApp.sent + ' of ' + result.inApp.total + ' users. Push delivered to ' + result.push.sent + ' device' + (result.push.sent === 1 ? '' : 's') + '.';
    document.getElementById('pushTitleInput').value = '';
    document.getElementById('pushBodyInput').value = '';
    document.getElementById('pushUrlInput').value = '';
    loadPushStatus();
  } catch (err) {
    msg.className = 'ad-modal-msg err';
    msg.textContent = err.message || 'Could not send broadcast.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send to all users';
  }
});
async function loadMaintenanceStatus(){
  const label = document.getElementById('maintenanceStatusLabel');
  const sub = document.getElementById('maintenanceStatusSub');
  try {
    const data = await getJSON('/api/admin/maintenance');
    mtUntil = data.until || null;
    if (data.maintenanceMode) {
      label.textContent = 'Maintenance is ON';
      sub.textContent = 'Verified users and your admin account still have full access.';
    } else {
      label.textContent = 'Site is live';
      sub.textContent = 'Tap the clock to schedule maintenance. Verified users and you keep full access.';
    }
    mtRenderLive(data.maintenanceMode ? mtUntil : null);
  } catch (err) {
    label.textContent = 'Could not load status.';
  }
}

let mtMode = 'maintenance';

document.getElementById('maintenanceOpenBtn').addEventListener('click', () => {
  mtMode = 'maintenance';
  document.getElementById('mtModalTitle').textContent = 'Schedule Maintenance';
  document.getElementById('mtModalSub').textContent = 'Drag the hands to set the time the site should come back, then pick the date.';
  document.getElementById('mtPageFieldWrap').style.display = 'none';
  const now = new Date();
  mtHour = now.getHours();
  mtMinute = now.getMinutes();
  mtSetActiveHand('hour');
  mtDateInput.value = now.getFullYear() + '-' + mtPad(now.getMonth() + 1) + '-' + mtPad(now.getDate());
  mtDateInput.min = now.getFullYear() + '-' + mtPad(now.getMonth() + 1) + '-' + mtPad(now.getDate());
  maintenanceMsg.className = 'ad-modal-msg';
  maintenanceMsg.textContent = '';
  mtRenderHands();
  maintenanceOverlay.classList.add('show');
});

document.getElementById('pageLockOpenBtn').addEventListener('click', () => {
  mtMode = 'pageLock';
  document.getElementById('mtModalTitle').textContent = 'Lock a Page';
  document.getElementById('mtModalSub').textContent = 'Pick a page, then drag the hands to set when it should unlock.';
  document.getElementById('mtPageFieldWrap').style.display = 'flex';
  const now = new Date();
  mtHour = now.getHours();
  mtMinute = now.getMinutes();
  mtSetActiveHand('hour');
  mtDateInput.value = now.getFullYear() + '-' + mtPad(now.getMonth() + 1) + '-' + mtPad(now.getDate());
  mtDateInput.min = now.getFullYear() + '-' + mtPad(now.getMonth() + 1) + '-' + mtPad(now.getDate());
  maintenanceMsg.className = 'ad-modal-msg';
  maintenanceMsg.textContent = '';
  mtRenderHands();
  maintenanceOverlay.classList.add('show');
});

document.getElementById('maintenanceCancelBtn').addEventListener('click', () => {
  maintenanceOverlay.classList.remove('show');
});
maintenanceOverlay.addEventListener('click', (e) => {
  if (e.target === maintenanceOverlay) maintenanceOverlay.classList.remove('show');
});

document.getElementById('maintenanceSetBtn').addEventListener('click', async () => {
  const btn = document.getElementById('maintenanceSetBtn');
  const target = mtTargetDate();
  if (!target) {
    maintenanceMsg.className = 'ad-modal-msg err';
    maintenanceMsg.textContent = 'Pick an end date first.';
    return;
  }
  if (target.getTime() - Date.now() < 60000) {
    maintenanceMsg.className = 'ad-modal-msg err';
    maintenanceMsg.textContent = 'Pick a time at least a minute from now.';
    return;
  }
  if (mtMode === 'pageLock') {
    const pageKey = document.getElementById('mtPageSelect').value;
    if (!pageKey) {
      maintenanceMsg.className = 'ad-modal-msg err';
      maintenanceMsg.textContent = 'Pick a page to lock.';
      return;
    }
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Setting…';
    try {
      await postJSON('/api/admin/page-locks', { pageKey: pageKey, enabled: true, until: target.getTime() });
      maintenanceOverlay.classList.remove('show');
      showToast('Page locked.');
      loadPageLocksStatus();
    } catch (err) {
      maintenanceMsg.className = 'ad-modal-msg err';
      maintenanceMsg.textContent = err.message || 'Could not lock that page.';
    }
    btn.disabled = false;
    btn.textContent = original;
    return;
  }
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Setting…';
  try {
    await postJSON('/api/admin/maintenance', { enabled: true, until: target.getTime() });
    maintenanceOverlay.classList.remove('show');
    showToast('Maintenance scheduled.');
    loadMaintenanceStatus();
  } catch (err) {
    maintenanceMsg.className = 'ad-modal-msg err';
    maintenanceMsg.textContent = err.message || 'Could not schedule maintenance.';
  }
  btn.disabled = false;
  btn.textContent = original;
});

async function loadPageLocksStatus(){
  const list = document.getElementById('pageLocksList');
  const optionsList = document.getElementById('mtPageSelectList');
  const hidden = document.getElementById('mtPageSelect');
  const label = document.querySelector('#mtPageSelectBtn span');
  try {
    const data = await getJSON('/api/admin/page-locks');
    optionsList.innerHTML = data.pages.map((p, i) =>
      '<div class="custom-select-option' + (i === 0 ? ' active' : '') + '" data-value="' + p.key + '">' + p.label + '</div>'
    ).join('');
    if (data.pages.length) {
      hidden.value = data.pages[0].key;
      label.textContent = data.pages[0].label;
    }
    const activeKeys = Object.keys(data.active || {});
    if (!activeKeys.length) {
      list.innerHTML = '<div style="font-size:.76rem;color:var(--muted)">No pages are currently locked.</div>';
      return;
    }
    list.innerHTML = activeKeys.map((key) => {
      const entry = data.active[key];
      const pageInfo = data.pages.find((p) => p.key === key);
      const label = pageInfo ? pageInfo.label : key;
      const untilText = entry.until ? new Date(entry.until).toLocaleString() : 'no end time';
      return '<div class="mt-live-countdown" style="display:flex" data-page-key="' + key + '">' +
        '<span class="mt-live-dot"></span>' +
        '<span>' + label + ' locked until <b>' + untilText + '</b></span>' +
        '<button type="button" class="mt-end-btn" data-unlock="' + key + '">Unlock now</button>' +
      '</div>';
    }).join('');
  } catch (err) {
    list.innerHTML = '<div style="font-size:.76rem;color:var(--muted)">Could not load page locks.</div>';
  }
}
document.getElementById('pageLocksList').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-unlock]');
  if (!btn) return;
  const pageKey = btn.getAttribute('data-unlock');
  btn.disabled = true;
  try {
    await postJSON('/api/admin/page-locks', { pageKey: pageKey, enabled: false });
    showToast('Page unlocked.');
    loadPageLocksStatus();
  } catch (err) {
    showToast(err.message || 'Could not unlock that page.');
    btn.disabled = false;
  }
});
loadPageLocksStatus();


document.getElementById('maintenanceEndBtn').addEventListener('click', async () => {
  const btn = document.getElementById('maintenanceEndBtn');
  btn.disabled = true;
  try {
    await postJSON('/api/admin/maintenance', { enabled: false });
    showToast('Maintenance ended, site is live.');
    loadMaintenanceStatus();
  } catch (err) {
    showToast(err.message || 'Could not end maintenance.');
  }
  btn.disabled = false;
});

loadMaintenanceStatus();
loadBonusCodes();
loadWithdrawals();
loadCrlog();
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
