import { siteHeadFor } from "../config/site.js";

export function renderAccount(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("account")}
<script>(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet">
<script async defer src="https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js" type="module"></script>
<script src="https://js.paystack.co/v1/inline.js"></script>
<style>
${cfg.protectionCSS || ""}
:root{
  --red:#FF3B5C;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --font-script:'Dancing Script',cursive;
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
html,body{height:100%}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);min-height:100%;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
}
button{font-family:inherit;cursor:pointer}
input{font-family:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

.acc-deploy-fab{
  position:fixed;right:20px;bottom:20px;z-index:90;width:52px;height:52px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#04141a;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4);
  cursor:pointer;transition:transform .15s var(--ease);text-decoration:none;
}
.acc-deploy-fab:active{transform:scale(.94)}
.acc-deploy-fab svg{width:24px;height:24px}

.acc-cert-fab{
  position:fixed;right:20px;bottom:84px;z-index:90;width:48px;height:48px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;color:#04141a;
  display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4);
  cursor:pointer;transition:transform .15s var(--ease),opacity .2s var(--ease);
}
.acc-cert-fab:active{transform:scale(.94)}
.acc-cert-fab svg{width:21px;height:21px}
.acc-cert-fab.dead{background:var(--card2);color:var(--muted2);box-shadow:none;border:1px solid var(--border-strong);opacity:.65}
.acc-cert-fab.dead:active{transform:none}

.acc-nav{
  position:sticky;top:0;z-index:10;height:58px;display:flex;align-items:center;gap:14px;padding:0 18px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
}
.acc-back{
  display:flex;align-items:center;gap:6px;color:var(--muted);text-decoration:none;font-size:.85rem;font-weight:600;
  background:transparent;border:none;cursor:pointer;font-family:inherit;padding:0;
}
.acc-back:hover{color:var(--accent)}
.acc-back svg{width:18px;height:18px}
.acc-nav-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;flex:1}
.notif-bell{
  position:relative;background:transparent;border:none;color:var(--muted);width:38px;height:38px;
  border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;
  transition:all .2s var(--ease);flex-shrink:0;
}
.notif-bell:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.notif-bell svg{width:20px;height:20px}
.notif-dot{
  position:absolute;top:7px;right:7px;width:8px;height:8px;border-radius:50%;background:var(--red);
  border:2px solid var(--nav-bg);display:none;
}
.notif-dot.show{display:block}

.acc-wrap{max-width:520px;margin:0 auto;padding:28px 18px 60px}

.acc-hero{display:flex;align-items:center;gap:16px;margin-bottom:28px}
.acc-avatar{
  width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.4rem;color:#04141a;flex-shrink:0;background-size:cover;background-position:center;
}
.acc-hero-name{font-family:var(--font-display);font-weight:700;font-size:1.1rem}
.verified-badge{display:inline-flex;vertical-align:middle;margin-left:4px;position:relative;top:-1px}
.acc-hero-email{font-size:.8rem;color:var(--muted);margin-top:2px}

.acc-verify-link{
  display:flex;align-items:center;gap:5px;flex-shrink:0;border:none;cursor:pointer;
  background:linear-gradient(90deg,var(--accent),var(--accent2));color:#04141a;
  font-size:.72rem;font-weight:700;padding:7px 12px;border-radius:20px;text-decoration:none;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.acc-verify-link:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,224,255,.25)}

.acc-settings-icon{
  background:transparent;border:none;color:var(--muted);display:flex;align-items:center;justify-content:center;
  width:40px;height:40px;border-radius:8px;cursor:pointer;transition:all .2s var(--ease);flex-shrink:0;
}
.acc-settings-icon:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.acc-settings-icon svg{width:20px;height:20px}

.acc-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 20px;margin-bottom:18px;
}
.acc-card-title{font-family:var(--font-display);font-weight:700;font-size:.95rem;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.acc-card-title svg{width:17px;height:17px;color:var(--accent)}

.field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.field:last-child{margin-bottom:0}
.field label{font-size:.72rem;font-weight:600;color:var(--muted);letter-spacing:.02em}
.field-row{display:flex;gap:10px}
.field-row .field{flex:1}
.field input{
  width:100%;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 13px;color:var(--text);font-size:.9rem;transition:border-color .2s var(--ease);
}
.field input:disabled{color:var(--muted);cursor:not-allowed}
.acc-inline-link{
  background:transparent;border:none;color:var(--muted);font-size:.72rem;font-weight:600;
  text-decoration:underline;align-self:flex-start;cursor:pointer;padding:0;margin-top:2px;
}
.acc-inline-link:hover{color:var(--accent)}
.pw-dead{background:var(--dark3) !important;opacity:.55;letter-spacing:2px}
.field input:focus{border-color:var(--accent)}
.input-wrap{position:relative}
.pw-toggle{
  position:absolute;right:6px;top:50%;transform:translateY(-50%);background:transparent;border:none;
  padding:6px;color:var(--muted);display:flex;border-radius:6px;
}
.pw-toggle:hover{color:var(--accent)}
.pw-toggle svg{width:18px;height:18px}
.pw-toggle .eye-off{display:none}
.pw-toggle.shown .eye{display:none}
.pw-toggle.shown .eye-off{display:block}

.acc-btn{
  background:linear-gradient(90deg,var(--accent),var(--accent2));border:none;color:#04141a;
  font-weight:700;font-size:.85rem;padding:11px 16px;border-radius:10px;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.acc-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(0,224,255,.25)}
.acc-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;box-shadow:none}
.acc-btn-ghost{
  background:var(--card2);color:var(--text);border:1px solid var(--border-strong);
}
.acc-btn-ghost:hover{border-color:var(--accent);box-shadow:none;transform:none}
.acc-btn-danger{background:transparent;color:var(--red);border:1px solid rgba(255,59,92,.3)}
.acc-btn-danger:hover{background:rgba(255,59,92,.1);box-shadow:none;transform:none}
.legal-links{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:16px}
.legal-links a{color:var(--muted);text-decoration:underline;font-weight:500;font-size:.72rem;transition:color .2s var(--ease)}
.legal-links a:hover{color:var(--text)}

.acc-msg{font-size:.78rem;padding:9px 12px;border-radius:8px;margin-top:12px;display:none}
.acc-msg.show{display:block}
.acc-msg.ok{background:rgba(0,224,255,.1);border:1px solid rgba(0,224,255,.3);color:var(--accent)}

.edit-wrap{position:relative}
.edit-wrap input{padding-right:70px}
.edit-icons{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:flex;gap:2px}
.edit-icons button{background:transparent;border:none;padding:6px;border-radius:6px;color:var(--muted);display:flex}
.edit-icons button:hover{color:var(--accent)}
.edit-icons svg{width:16px;height:16px}
.edit-icons .ic-cancel,.edit-icons .ic-confirm{display:none}
.edit-wrap.editing .ic-pencil{display:none}
.edit-wrap.editing .ic-cancel,.edit-wrap.editing .ic-confirm{display:flex}
.edit-icons .ic-cancel:hover{color:var(--red)}
.edit-icons .ic-confirm{color:var(--muted2);cursor:not-allowed}
.edit-icons .ic-confirm.ready{color:var(--accent);cursor:pointer}

.uname-status{font-size:.72rem;color:var(--muted);display:flex;align-items:center;gap:6px;min-height:14px;margin-top:6px}
.uname-status.ok{color:var(--accent)}
.uname-status.taken{color:var(--red)}
.uname-status svg{width:12px;height:12px;flex-shrink:0}
.uname-spinner{width:11px;height:11px;border:2px solid var(--muted2);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0}
.acc-msg.err{background:rgba(255,59,92,.1);border:1px solid rgba(255,59,92,.3);color:var(--red)}

.alt-uname-list{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
.alt-uname-chip{display:flex;align-items:center;gap:6px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-size:.82rem;font-weight:600;padding:6px 8px 6px 14px;border-radius:20px}
.alt-uname-chip button{background:transparent;border:none;color:var(--muted);display:flex;padding:2px;border-radius:50%;flex-shrink:0}
.alt-uname-chip button:hover{color:var(--red)}
.alt-uname-chip button svg{width:13px;height:13px}
.alt-uname-add{display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed var(--border-strong);color:var(--accent);font-size:.82rem;font-weight:700;padding:9px 14px;border-radius:10px;width:100%;justify-content:center}
.alt-uname-add:hover{border-color:var(--accent);background:rgba(0,224,255,.06)}
.alt-uname-add svg{width:15px;height:15px}
.alt-uname-input-row{display:flex;gap:8px;margin-top:8px}
.alt-uname-input-row input{flex:1;background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;padding:11px 13px;color:var(--text);font-size:.9rem;outline:none;transition:border-color .2s var(--ease)}
.alt-uname-input-row input:focus{border-color:var(--accent)}
.alt-uname-input-row button{width:38px;height:38px;border-radius:10px;border:1px solid var(--border-strong);background:var(--card2);color:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.alt-uname-input-row button svg{width:16px;height:16px}
.alt-uname-input-row button:hover{color:var(--accent);border-color:var(--accent)}
.alt-uname-input-row #altUnameConfirmBtn{color:var(--muted2);cursor:not-allowed}
.alt-uname-input-row #altUnameConfirmBtn.ready{color:var(--accent);border-color:var(--accent);cursor:pointer}
.alt-uname-msg{font-size:.76rem;margin-top:6px;min-height:14px;display:flex;align-items:center;gap:6px}
.alt-uname-msg.err{color:var(--red)}
.alt-uname-msg.ok{color:var(--accent)}
.alt-uname-msg svg{width:12px;height:12px;flex-shrink:0}

.pw-view{display:flex;align-items:center;justify-content:space-between}
.pw-dots{font-family:var(--font-mono);letter-spacing:3px;color:var(--muted)}

@keyframes spin{to{transform:rotate(360deg)}}
.btn-spinner{
  width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;
  border-radius:50%;display:inline-block;vertical-align:-3px;margin-right:8px;
  animation:spin .6s linear infinite;
}
.btn-spinner-light{border:2px solid rgba(255,255,255,.35);border-top-color:#fff}

.tfa-card{
  background:var(--card);border:1px solid var(--border);border-radius:16px;margin-bottom:18px;overflow:hidden;
}
.tfa-header{
  display:flex;align-items:center;gap:10px;padding:16px 18px;cursor:pointer;user-select:none;
}
.tfa-header svg.tfa-icon{width:18px;height:18px;color:var(--accent);flex-shrink:0}
.tfa-header-title{font-family:var(--font-display);font-weight:700;font-size:.9rem;flex:1}
.tfa-chevron{width:16px;height:16px;color:var(--muted);transition:transform .25s var(--ease);flex-shrink:0}
.tfa-card.open .tfa-chevron{transform:rotate(180deg)}
.tfa-body{max-height:0;overflow:hidden;transition:max-height .3s var(--ease)}
.tfa-card.open .tfa-body{max-height:500px;overflow:visible}
.tfa-card.open{overflow:visible}
.tfa-body-inner{padding:0 18px 18px}
.tfa-setup-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;
  background:var(--card2);border:1px dashed var(--border-strong);color:var(--accent);
  font-weight:700;font-size:.85rem;padding:13px;border-radius:10px;transition:border-color .2s var(--ease);
}
.tfa-setup-btn:hover{border-color:var(--accent)}
.tfa-setup-btn svg{width:16px;height:16px}
.tfa-toggle-row{display:flex;align-items:center;justify-content:space-between}
.tfa-toggle-label{font-size:.85rem;color:var(--text);font-weight:600}
.tfa-toggle-sub{font-size:.72rem;color:var(--muted);margin-top:2px}
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
.tfa-switch.busy .tfa-switch-dot{border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;background:#fff;animation:spin .6s linear infinite}
.tfa-support-link{display:block;margin-top:12px;font-size:.72rem;color:var(--muted)}

.pv-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;position:relative}
.pv-configure{background:transparent;border:none;color:var(--accent);font-weight:700;font-size:.78rem;text-decoration:underline;padding:4px;flex-shrink:0}
.pv-menu{position:absolute;right:0;top:calc(100% + 4px);background:var(--card);border:1px solid var(--border-strong);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.4);z-index:20;overflow:hidden;min-width:130px}
.pv-menu.pv-menu-up{top:auto;bottom:calc(100% + 4px)}
.pv-menu button{display:block;width:100%;text-align:left;padding:10px 14px;background:transparent;border:none;color:var(--text);font-size:.82rem}
.pv-menu button:hover{background:var(--dark3)}
.pv-menu button.active{color:var(--accent);font-weight:700}

.pk-row{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  background:var(--dark3);border:1px solid var(--border);border-radius:10px;
  padding:11px 13px;margin-bottom:8px;
}
.pk-row-name{font-size:.82rem;font-weight:600;color:var(--text)}
.pk-row-time{font-size:.68rem;color:var(--muted);margin-top:2px}
.pk-delete-btn{
  display:flex;align-items:center;gap:5px;background:transparent;border:none;color:var(--red);
  font-size:.72rem;font-weight:600;flex-shrink:0;padding:6px 8px;border-radius:6px;
}
.pk-delete-btn:hover{background:rgba(255,59,92,.1)}
.pk-delete-btn svg{width:13px;height:13px}
.tfa-support-link a{color:var(--accent);text-decoration:none;font-weight:600}

.danger-card{
  background:var(--card);border:1px solid rgba(255,59,92,.25);border-radius:16px;margin-bottom:18px;overflow:hidden;
}
.danger-header{
  display:flex;align-items:center;gap:10px;padding:16px 18px;cursor:pointer;user-select:none;
}
.danger-header svg.danger-icon{width:18px;height:18px;color:var(--red);flex-shrink:0}
.danger-header-title{font-family:var(--font-display);font-weight:700;font-size:.9rem;color:var(--red);flex:1}
.danger-chevron{width:16px;height:16px;color:var(--muted);transition:transform .25s var(--ease);flex-shrink:0}
.danger-card.open .danger-chevron{transform:rotate(180deg)}
.danger-body{max-height:0;overflow:hidden;transition:max-height .3s var(--ease)}
.danger-card.open .danger-body{max-height:600px}
.danger-body-inner{padding:0 18px 18px}
.danger-warning-box{
  background:rgba(255,59,92,.06);border:1px solid rgba(255,59,92,.2);border-radius:10px;padding:14px 16px;margin-bottom:14px;
}
.danger-warning-box p{font-size:.78rem;color:var(--muted);margin-bottom:6px;font-weight:600}
.danger-warning-box ol{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px}
.danger-warning-box li{font-size:.76rem;color:var(--text);line-height:1.4}

.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:100;padding:24px;
}
.page-overlay.show{display:flex}
body:has(.page-overlay.show){overflow:hidden}
.overlay-card{
  width:100%;max-width:360px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;
  padding:26px 22px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);
}
.overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.overlay-sub{font-size:.82rem;color:var(--muted);line-height:1.5}
.overlay-sub b{color:var(--text)}
.overlay-step{display:none;flex-direction:column;gap:14px}
.overlay-step.active{display:flex}
.code-row{display:flex;gap:8px;justify-content:center}
.code-digit{
  width:40px;height:48px;text-align:center;font-size:1.2rem;font-weight:700;
  background:var(--dark3);border:1px solid var(--border-strong);border-radius:10px;color:var(--text);
  font-family:var(--font-mono);
}
.code-digit:focus{border-color:var(--accent)}
.overlay-timer{font-family:var(--font-mono);font-size:.8rem;color:var(--muted);text-align:center}
.overlay-timer b{color:var(--red)}
.overlay-timer.expired b{color:var(--red)}
.overlay-resend{background:transparent;border:none;color:var(--accent);font-size:.78rem;font-weight:600;align-self:center}
.overlay-resend:disabled{color:var(--muted2);cursor:not-allowed}
.overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline}
.acc-loader{
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  min-height:70vh;
}
.acc-loader-ring{
  width:34px;height:34px;border:3px solid var(--border-strong);border-top-color:var(--accent);
  border-radius:50%;animation:accSpin .7s linear infinite;
}
.acc-loader-text{color:var(--muted);font-size:.82rem}
@keyframes accSpin{to{transform:rotate(360deg)}}

.flist-card{
  width:100%;max-width:400px;max-height:78vh;background:var(--card);border:1px solid var(--border-strong);
  border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;
}
.flist-header{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}
.flist-title{font-family:var(--font-display);font-weight:700;font-size:1.02rem}
.flist-close{
  background:transparent;border:none;color:var(--muted);width:32px;height:32px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s var(--ease);
}
.flist-close:hover{color:var(--accent);background:rgba(0,224,255,.1)}
.flist-close svg{width:18px;height:18px}
.flist-search-wrap{padding:14px 18px}
.flist-list{overflow-y:auto;padding:0 10px 14px;flex:1}
#notifList{max-height:340px;flex:none}
.flist-empty{padding:30px 10px;text-align:center;color:var(--muted);font-size:.84rem}

.notif-mark-read{
  background:transparent;border:none;color:var(--accent);font-size:.76rem;font-weight:600;
  text-decoration:underline;cursor:pointer;flex-shrink:0;
}
.notif-row{position:relative;overflow:hidden;touch-action:pan-y;border-radius:10px;margin-bottom:2px}
.notif-row-inner{
  display:flex;flex-direction:column;gap:3px;padding:12px 10px;border-radius:10px;
  background:var(--card);position:relative;z-index:1;transition:transform .2s var(--ease);
}
.notif-row-inner.unread{background:rgba(0,224,255,.06)}
.notif-row.dragging .notif-row-inner{transition:none}
.notif-top{display:flex;align-items:center;gap:10px}
.notif-msg{font-size:.85rem;color:var(--text);line-height:1.4;flex:1}
.notif-time{font-size:.7rem;color:var(--muted)}
.notif-follow-btn{
  flex-shrink:0;display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;border:none;
  font-size:.72rem;font-weight:700;
}
.notif-follow-btn.following{background:transparent;border:1px solid var(--border-strong);color:var(--muted)}
.notif-follow-btn:disabled{opacity:.6;cursor:default}
.notif-view-post-btn{
  flex-shrink:0;padding:6px 12px;border-radius:20px;background:var(--dark3);border:1px solid var(--border-strong);
  color:var(--text);font-size:.72rem;font-weight:700;
}
.notif-view-post-btn:hover{border-color:var(--accent);color:var(--accent)}
@keyframes flashHighlight{
  0%,100%{background:transparent;box-shadow:none}
  50%{background:rgba(0,224,255,.14);box-shadow:0 0 0 1px rgba(0,224,255,.4)}
}
.flash-highlight{border-radius:10px;animation:flashHighlight .55s ease-in-out 3}

.acc-toast{
  position:fixed;left:50%;bottom:28px;transform:translate(-50%,12px);opacity:0;z-index:400;
  background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:11px 16px;
  font-size:.82rem;color:var(--text);box-shadow:0 12px 32px rgba(0,0,0,.5);transition:all .3s var(--ease);
  max-width:88vw;text-align:center;
}
.acc-toast.show{transform:translate(-50%,0);opacity:1}

.notif-swipe-bg{
  position:absolute;inset:0;display:flex;align-items:center;gap:8px;font-size:.78rem;font-weight:700;
  border-radius:10px;padding:0 16px;
}
.notif-swipe-bg.mode-read{background:linear-gradient(90deg,rgba(0,224,255,.2),rgba(0,224,255,.04));color:var(--accent);justify-content:flex-start}
.notif-swipe-bg.mode-delete{background:linear-gradient(270deg,rgba(255,59,92,.2),rgba(255,59,92,.04));color:var(--red);justify-content:flex-end}
.notif-swipe-icon svg{width:16px;height:16px;display:block}

.verify-icon-wrap{
  width:56px;height:56px;border-radius:16px;margin:0 auto;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;
}
.verify-icon-wrap svg{width:28px;height:28px}
.verify-benefits{display:flex;flex-direction:column;gap:9px;margin:2px 0}
.verify-benefit{display:flex;align-items:center;gap:9px;font-size:.82rem;color:var(--text)}
.verify-benefit svg{width:16px;height:16px;color:var(--green);flex-shrink:0}
.verify-price-row{
  display:flex;align-items:baseline;justify-content:center;gap:6px;padding:14px 0;
  border-top:1px dashed var(--border-strong);border-bottom:1px dashed var(--border-strong);
}
.verify-price{font-family:var(--font-display);font-size:1.9rem;font-weight:700;color:var(--text)}
.verify-price-period{font-size:.78rem;color:var(--muted)}
.acc-msg{font-size:.78rem;line-height:1.4;display:none}
.acc-msg.show{display:block}
.acc-msg.err{color:var(--red)}
.acc-msg.ok{color:var(--green)}
.verify-success-icon{
  width:64px;height:64px;border-radius:50%;margin:4px auto 0;display:flex;align-items:center;justify-content:center;
  background:rgba(18,196,139,.12);color:var(--green);
}
.verify-success-icon svg{width:32px;height:32px}

.cert-overlay-inner{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:420px}
.cert-close{position:absolute;top:16px;right:16px;background:rgba(0,0,0,.3);color:#fff;z-index:2}
.cert-close:hover{background:rgba(0,0,0,.5);color:#fff}
.cert-card{
  position:relative;width:100%;background:linear-gradient(160deg,var(--card),var(--card2));
  border:1px solid var(--border-strong);border-radius:18px;padding:26px 24px 20px;
  box-shadow:0 20px 60px rgba(0,0,0,.5);transition:filter .2s var(--ease);
}
.cert-card::before{
  content:"";position:absolute;inset:8px;border:1px solid rgba(0,224,255,.18);border-radius:12px;pointer-events:none;
}
.cert-card.expired{filter:grayscale(.85) opacity(.8) contrast(.92)}
.cert-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.cert-brand{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:.95rem;
  background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.cert-brand svg{width:20px;height:20px;color:var(--accent);flex-shrink:0}
.cert-status-chip{
  font-size:.66rem;font-weight:700;letter-spacing:.06em;padding:4px 10px;border-radius:20px;
  background:rgba(18,196,139,.12);color:var(--green);border:1px solid rgba(18,196,139,.3);
}
.cert-status-chip.expired{background:rgba(255,59,92,.12);color:var(--red);border-color:rgba(255,59,92,.3)}
.cert-status-chip.neutral{background:var(--card2);color:var(--muted);border-color:var(--border-strong)}
.cert-label{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:14px}
.cert-name{font-family:var(--font-display);font-weight:700;font-size:1.3rem;color:var(--text);text-align:center;margin-bottom:2px}
.cert-username{font-size:.82rem;color:var(--muted);text-align:center;margin-bottom:18px}
.cert-divider{height:1px;background:var(--border-strong);margin-bottom:16px}
.cert-meta-row{display:flex;justify-content:space-between;margin-bottom:20px}
.cert-meta-label{display:block;font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.cert-meta-val{display:block;font-family:var(--font-mono);font-size:.82rem;color:var(--text)}
.cert-meta-row div:last-child{text-align:right}
.cert-signature-wrap{display:flex;flex-direction:column;align-items:center}
.cert-signature{
  font-family:var(--font-script);font-size:2rem;font-weight:700;color:var(--accent2);line-height:1;
  letter-spacing:-1px;transform:rotate(-4deg) skewX(-8deg);
}
.cert-signature-flourish{width:150px;height:24px;color:var(--accent2);opacity:.7;margin-top:-4px;transform:rotate(-2deg)}
.cert-signature-label{font-size:.64rem;color:var(--muted);text-align:center;margin-top:4px;text-transform:uppercase;letter-spacing:.06em}
.cert-tear-edge{display:none;height:14px;margin:16px -24px -20px;
  background:
    linear-gradient(135deg, var(--dark) 25%, transparent 25%) -7px 0,
    linear-gradient(225deg, var(--dark) 25%, transparent 25%) -7px 0,
    linear-gradient(315deg, var(--dark) 25%, transparent 25%) 0 0,
    linear-gradient(45deg,  var(--dark) 25%, transparent 25%) 0 0;
  background-size:14px 14px;background-repeat:repeat-x;
}
.cert-card.expired .cert-tear-edge{display:block}
.cert-download-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px}
.cert-download-btn svg{width:16px;height:16px}
</style>
</head>
<body>

<div class="acc-nav">
  <button type="button" class="acc-back" id="accBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6"/></svg>
    Back
  </button>
  <div class="acc-nav-title">Account Settings</div>
  <button type="button" class="notif-bell" id="notifBellBtn" aria-label="Notifications">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
    <span class="notif-dot" id="notifDot"></span>
  </button>
</div>

<div class="acc-loader" id="accLoader">
  <div class="acc-loader-ring"></div>
  <div class="acc-loader-text">Loading your account…</div>
</div>

<div class="acc-wrap" id="accWrap" style="display:none">
  <div class="acc-hero">
    <div class="acc-avatar" id="heroAvatar">–</div>
    <div style="flex:1">
      <div class="acc-hero-name" id="heroName">Hi, –</div>
      <div class="acc-hero-email" id="heroEmail">–</div>
    </div>
    <button type="button" class="acc-verify-link" id="getVerifiedLink" style="display:none">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>
      Get Verified
    </button>
    <button class="acc-settings-icon" id="themeToggle" aria-label="Toggle theme">
      <svg id="themeIconMoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      <svg id="themeIconSun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="display:none"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    </button>
  </div>

  <div class="acc-card">
    <div class="acc-card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      Profile
    </div>
    <div class="field-row">
      <div class="field">
        <label>First Name</label>
        <div class="edit-wrap" data-field="firstName">
          <input type="text" id="firstName" disabled>
          <div class="edit-icons">
            <button type="button" class="ic-pencil" aria-label="Edit first name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="ic-cancel" aria-label="Cancel edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
            <button type="button" class="ic-confirm" aria-label="Confirm edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="field">
        <label>Last Name</label>
        <div class="edit-wrap" data-field="lastName">
          <input type="text" id="lastName" disabled>
          <div class="edit-icons">
            <button type="button" class="ic-pencil" aria-label="Edit last name">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="ic-cancel" aria-label="Cancel edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
            <button type="button" class="ic-confirm" aria-label="Confirm edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="field">
      <label>Username</label>
      <div class="edit-wrap" data-field="username">
        <input type="text" id="username" disabled autocomplete="off" minlength="3" maxlength="20">
        <div class="edit-icons">
          <button type="button" class="ic-pencil" aria-label="Edit username">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="ic-cancel" aria-label="Cancel edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
          <button type="button" class="ic-confirm" aria-label="Confirm edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
          </button>
        </div>
      </div>
      <div class="uname-status" id="acctUsernameStatus"></div>
    </div>
    <div class="field" id="altUsernamesField" style="display:none">
      <label>Other Usernames</label>
      <div class="alt-uname-list" id="altUnameList"></div>
      <button type="button" class="alt-uname-add" id="altUnameAddBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
        Add username
      </button>
      <div class="alt-uname-input-row" id="altUnameInputRow" style="display:none">
        <input type="text" id="altUnameInput" placeholder="username" autocomplete="off" minlength="3" maxlength="20">
        <button type="button" id="altUnameConfirmBtn" aria-label="Confirm add username">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button type="button" id="altUnameCancelBtn" aria-label="Cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="alt-uname-msg" id="altUnameMsg"></div>
    </div>
    <div class="field">
      <label id="emailFieldLabel">Email</label>
      <input type="email" id="emailField" disabled>
      <button type="button" class="acc-inline-link" id="addEmailLink" style="display:none">Add Email</button>
    </div>
    <button class="acc-btn" id="saveProfileBtn" style="margin-top:6px" disabled>Save Changes</button>
    <div class="acc-msg" id="profileMsg"></div>
  </div>

  <div class="acc-card" id="pwCard">
    <div class="acc-card-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      Password
    </div>
    <div class="field">
      <label>Current Password</label>
      <div class="input-wrap">
        <input type="password" id="currentPasswordDead" value="••••••••••" disabled class="pw-dead">
        <button type="button" class="pw-toggle" data-target="currentPasswordDead" aria-label="Show password">
          <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
        </button>
      </div>
    </div>
    <div id="pwDefaultView" class="pw-view">
      <button class="acc-btn acc-btn-ghost" id="startPwChange" style="width:100%">Change Password</button>
    </div>
    <div id="pwResetView" style="display:none">
      <div class="field">
        <label>New Password</label>
        <div class="input-wrap">
          <input type="password" id="newPassword" placeholder="At least 6 characters" minlength="6">
          <button type="button" class="pw-toggle" data-target="newPassword" aria-label="Show password">
            <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
          </button>
        </div>
      </div>
      <div class="field">
        <label>Confirm New Password</label>
        <div class="input-wrap">
          <input type="password" id="confirmNewPassword" placeholder="Re-enter new password" minlength="6">
          <button type="button" class="pw-toggle" data-target="confirmNewPassword" aria-label="Show password">
            <svg class="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a21.6 21.6 0 015.06-6.06M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a21.6 21.6 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><path d="M1 1l22 22"/></svg>
          </button>
        </div>
      </div>
      <button class="acc-btn" id="confirmPwBtn">Set New Password</button>
    </div>
    <div class="acc-msg" id="pwMsg"></div>
  </div>

  <div class="tfa-card" id="passkeyCard">
    <div class="tfa-header" id="passkeyHeader">
      <svg class="tfa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="15" r="4"/><path d="M9.5 12.5L20 2" stroke-linecap="round"/><path d="M16 6l3 3M13 9l3 3" stroke-linecap="round"/></svg>
      <div class="tfa-header-title">Passkeys</div>
      <svg class="tfa-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="tfa-body">
      <div class="tfa-body-inner">
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:12px;line-height:1.5">Sign in with your fingerprint or face — no password needed. <span id="passkeyLimitText">Up to 1 passkey per account.</span></div>
        <div id="passkeyList"></div>
        <div id="passkeyAddRow">
          <div class="field" style="margin-bottom:10px">
            <label>Name this passkey</label>
            <input type="text" id="passkeyNameInput" placeholder="e.g. My iPhone" maxlength="40">
          </div>
          <button class="tfa-setup-btn" id="addPasskeyBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 18v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="8" cy="7" r="4"/><path d="M15 8h5m-2 0v4"/></svg>
            Add Passkey
          </button>
        </div>
        <div id="passkeyMaxMsg" style="display:none;font-size:.76rem;color:var(--muted);text-align:center;padding:8px 0">Maximum passkeys reached for your account. Delete one to add another, or get verified for more.</div>
        <div class="acc-msg" id="passkeyMsg"></div>
      </div>
    </div>
  </div>

  <div class="tfa-card" id="tfaCard">
    <div class="tfa-header" id="tfaHeader">
      <svg class="tfa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <div class="tfa-header-title">Two-Factor Authentication</div>
      <svg class="tfa-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="tfa-body">
      <div class="tfa-body-inner">
        <div id="tfaSetupPrompt">
          <button class="tfa-setup-btn" id="tfaSetupBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
            Set Up Authenticator
          </button>
        </div>
        <div id="tfaToggleRow" class="tfa-toggle-row" style="display:none">
          <div>
            <div class="tfa-toggle-label">Authenticator App</div>
            <div class="tfa-toggle-sub" id="tfaToggleSub">Off</div>
          </div>
          <div class="tfa-switch" id="tfaSwitch"><div class="tfa-switch-dot"></div></div>
        </div>
        <div class="tfa-support-link">Lost access to your authenticator? <a href="https://telegram.me/examsolutionteam" target="_blank" rel="noopener">Contact Support</a></div>
      </div>
    </div>
  </div>

  <div class="tfa-card" id="privacyCard">
    <div class="tfa-header" id="privacyHeader">
      <svg class="tfa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 16c0-3 4-5 9-5s9 2 9 5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12c1-3 4-5 7-5s6 2 7 5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="15" r="1.6"/><circle cx="16" cy="15" r="1.6"/><path d="M9.6 15h4.8" stroke-linecap="round"/></svg>
      <div class="tfa-header-title">Privacy Settings</div>
      <svg class="tfa-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="tfa-body">
      <div class="tfa-body-inner">

        <div class="tfa-toggle-row" style="margin-bottom:16px">
          <div>
            <div class="tfa-toggle-label">Show Active Status</div>
            <div class="tfa-toggle-sub" id="activeStatusSub">On</div>
          </div>
          <div class="tfa-switch" id="activeStatusSwitch"><div class="tfa-switch-dot"></div></div>
        </div>

        <div class="tfa-toggle-row" style="margin-bottom:16px">
          <div>
            <div class="tfa-toggle-label">Show Last Seen</div>
            <div class="tfa-toggle-sub" id="lastSeenSub">On</div>
          </div>
          <div class="tfa-switch" id="lastSeenSwitch"><div class="tfa-switch-dot"></div></div>
        </div>

        <div class="tfa-toggle-row" id="lockProfileRow" style="margin-bottom:16px">
          <div>
            <div class="tfa-toggle-label">Lock Profile</div>
            <div class="tfa-toggle-sub" id="lockProfileSub">Off</div>
          </div>
          <div class="tfa-switch" id="lockProfileSwitch"><div class="tfa-switch-dot"></div></div>
        </div>

        <div class="tfa-toggle-row" style="margin-bottom:16px">
          <div>
            <div class="tfa-toggle-label">Show Profile Photo</div>
            <div class="tfa-toggle-sub" id="showPhotoSub">On</div>
          </div>
          <div class="tfa-switch" id="showPhotoSwitch"><div class="tfa-switch-dot"></div></div>
        </div>

        <div class="pv-row">
          <div>
            <div class="tfa-toggle-label">See My Followers</div>
            <div class="tfa-toggle-sub" id="followersVisSub">Everyone</div>
          </div>
          <button type="button" class="pv-configure" id="followersConfigureBtn">Configure</button>
          <div class="pv-menu" id="followersMenu" style="display:none">
            <button type="button" data-value="everyone">Everyone</button>
            <button type="button" data-value="friends">Friends</button>
            <button type="button" data-value="only_me">Only Me</button>
          </div>
        </div>

        <div class="pv-row">
          <div>
            <div class="tfa-toggle-label">See My Following</div>
            <div class="tfa-toggle-sub" id="followingVisSub">Everyone</div>
          </div>
          <button type="button" class="pv-configure" id="followingConfigureBtn">Configure</button>
          <div class="pv-menu pv-menu-up" id="followingMenu" style="display:none">
            <button type="button" data-value="everyone">Everyone</button>
            <button type="button" data-value="friends">Friends</button>
            <button type="button" data-value="only_me">Only Me</button>
          </div>
        </div>

        <div class="acc-msg" id="privacyMsg"></div>
      </div>
    </div>
  </div>

  <div class="tfa-card" id="apiCard">
    <div class="tfa-header" id="apiHeader">
      <svg class="tfa-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
      <div class="tfa-header-title">Developer API</div>
      <svg class="tfa-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="tfa-body">
      <div class="tfa-body-inner">
        <div style="font-size:.78rem;color:var(--muted);margin-bottom:8px;line-height:1.5">Use an API key to pull ES TEAMS TV channels into your own site or bot. <span id="apiKeyLimitText">Up to 1 key per account.</span> <a href="/developers" target="_blank" rel="noopener" class="acc-inline-link" style="display:inline">Open the API Dashboard</a> to test requests, see usage, upgrade your plan, and read the docs.</div>
        <div id="apiPlanBadgeRow" style="display:none;margin-bottom:12px"><span class="cert-status-chip" id="apiPlanBadge">Free</span></div>
        <div id="apiKeyList"></div>
        <div id="apiKeyAddRow">
          <div class="field" style="margin-bottom:10px">
            <label>Label this key</label>
            <input type="text" id="apiKeyLabelInput" placeholder="e.g. My Discord bot" maxlength="60">
          </div>
          <button class="tfa-setup-btn" id="createApiKeyBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
            Create API Key
          </button>
        </div>
        <div id="apiKeyMaxMsg" style="display:none;font-size:.76rem;color:var(--muted);text-align:center;padding:8px 0">Maximum API keys reached for your plan. Revoke one, or <a href="/developers" target="_blank" rel="noopener" class="acc-inline-link" style="display:inline">upgrade your plan</a>.</div>
        <div id="apiKeyRevealBox" style="display:none;margin-top:12px;padding:12px;border-radius:10px;background:rgba(0,224,255,.08);border:1px solid rgba(0,224,255,.25)">
          <div style="font-size:.76rem;color:var(--muted);margin-bottom:8px">Copy this now — you won't be able to see it again.</div>
          <div style="display:flex;gap:8px;align-items:center">
            <code id="apiKeyRevealValue" style="flex:1;font-size:.78rem;word-break:break-all;font-family:var(--font-mono)"></code>
            <button type="button" class="acc-inline-link" id="apiKeyCopyBtn" style="display:inline;white-space:nowrap">Copy</button>
          </div>
        </div>
        <div class="acc-msg" id="apiKeyMsg"></div>
      </div>
    </div>
  </div>

  <div class="danger-card" id="dangerCard">
    <div class="danger-header" id="dangerHeader">
      <svg class="danger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
      <div class="danger-header-title">Danger Zone</div>
      <svg class="danger-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
    </div>
    <div class="danger-body">
      <div class="danger-body-inner">
        <div class="danger-warning-box">
          <p>Please note the following before deleting your account:</p>
          <ol>
            <li>You won't be able to access your account or use this email again until after 24 hours.</li>
            <li>All your saved preferences, watch history, and settings will be permanently erased after the 24-hour period.</li>
            <li>Any active sessions on other devices will be logged out immediately.</li>
            <li>This action cannot be undone once the 24-hour window has passed — recovery will not be possible.</li>
            <li>If you change your mind within the 24 hours, contact support before the grace period ends.</li>
          </ol>
        </div>
        <button class="acc-btn acc-btn-danger" id="deleteAccountBtn" style="width:100%;border-color:var(--red)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;vertical-align:-2px;margin-right:6px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          Delete Account
        </button>
      </div>
    </div>
  </div>

  <button class="acc-btn acc-btn-danger" id="logoutBtn" style="width:100%">Log Out</button>

  <div class="legal-links">
    <a href="/privacy">Privacy</a>
    <a href="/dmca">DMCA</a>
  </div>
</div>

<div class="page-overlay" id="tfaOverlay">
  <div class="overlay-card">
    <div class="overlay-step active" id="tfaStepScan">
      <div class="overlay-title">Set up authenticator</div>
      <div class="overlay-sub">Scan this QR code with Google Authenticator (or any TOTP app), or enter the key manually.</div>
      <div style="display:flex;justify-content:center">
        <img id="tfaQrImg" src="" alt="2FA QR code" style="width:180px;height:180px;border-radius:10px;background:#fff;padding:8px">
      </div>
      <div class="field">
        <label>Manual entry key</label>
        <div class="input-wrap">
          <input type="text" id="tfaSecretText" readonly style="padding-right:40px;font-family:var(--font-mono);font-size:.8rem">
          <button type="button" class="pw-toggle" id="tfaCopyBtn" aria-label="Copy key">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      </div>
      <button class="acc-btn" id="tfaScanContinueBtn" style="width:100%">Continue</button>
      <button class="overlay-cancel" id="tfaCancel1">Cancel</button>
    </div>
    <div class="overlay-step" id="tfaStepVerify">
      <div class="overlay-title">Enter authenticator code</div>
      <div class="overlay-sub">Enter the 6-digit code currently shown in your authenticator app.</div>
      <div class="code-row">
        <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="acc-msg" id="tfaVerifyMsg"></div>
      <button class="acc-btn" id="tfaVerifyBtn" style="width:100%">Verify & Enable</button>
      <button class="overlay-cancel" id="tfaCancel2">Cancel</button>
    </div>
    <div class="overlay-step" id="tfaStepDisable">
      <div class="overlay-title">Confirm disabling 2FA</div>
      <div class="overlay-sub">Enter the 6-digit code currently shown in your authenticator app to turn two-factor authentication off.</div>
      <div class="code-row">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit tfa-disable-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="acc-msg" id="tfaDisableMsg"></div>
      <button class="acc-btn acc-btn-danger" id="tfaDisableBtn" style="width:100%;border-color:var(--red)">Confirm & Disable</button>
      <button class="overlay-cancel" id="tfaCancel3">Cancel</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="logoutOverlay">
  <div class="overlay-card">
    <div class="overlay-title">Log out?</div>
    <div class="overlay-sub">Are you sure you want to logout?</div>
    <button class="acc-btn acc-btn-danger" id="confirmLogoutBtn" style="width:100%;border-color:var(--red)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:15px;height:15px;vertical-align:-2px;margin-right:6px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      Logout
    </button>
    <button class="overlay-cancel" id="cancelLogoutBtn">Cancel</button>
  </div>
</div>

<div class="page-overlay" id="deleteOverlay">
  <div class="overlay-card">
    <div class="overlay-step active" id="deleteStepCaptcha">
      <div class="overlay-title">Confirm it's you</div>
      <div class="overlay-sub">Complete the check below to continue deleting your account.</div>
      <altcha-widget id="deleteAltcha" name="deleteAltcha" challengeurl="/api/captcha/challenge" workers="4"></altcha-widget>
      <div class="acc-msg" id="deleteCaptchaMsg"></div>
      <button class="acc-btn acc-btn-danger" id="deleteContinueBtn" style="width:100%;border-color:var(--red)" disabled>Continue</button>
      <button class="overlay-cancel" id="cancelDelete1">Cancel</button>
    </div>
    <div class="overlay-step" id="deleteStepCode">
      <div class="overlay-title">Enter deletion code</div>
      <div class="overlay-sub"><span id="deleteCodeIntro">We sent a 6-digit code to</span><br><b id="deleteEmailLabel"></b></div>
      <div class="code-row">
        <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="overlay-timer" id="deleteTimer">Code expires in <b id="deleteTimerVal">5:00</b></div>
      <div class="acc-msg" id="deleteCodeMsg"></div>
      <button class="acc-btn acc-btn-danger" id="confirmDeleteBtn" style="width:100%;border-color:var(--red)">Confirm Deletion</button>
      <button class="overlay-resend" id="deleteResend" disabled>Resend code (<span id="deleteResendWait">30</span>s)</button>
      <button class="overlay-cancel" id="cancelDelete2">Cancel</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="addEmailOverlay">
  <div class="overlay-card">
    <div class="overlay-step active" id="addEmailStepInput">
      <div class="overlay-title">Add Email</div>
      <div class="overlay-sub">Add an email so you can also sign in and recover your account with it.</div>
      <div class="field" style="margin-bottom:0">
        <label>Email Address</label>
        <input type="email" id="addEmailInput" placeholder="you@example.com" autocomplete="email">
      </div>
      <div class="acc-msg" id="addEmailInputMsg"></div>
      <button class="acc-btn" id="addEmailSendBtn" style="width:100%">Send Code</button>
      <button class="overlay-cancel" id="addEmailCancel1">Cancel</button>
    </div>
    <div class="overlay-step" id="addEmailStepCode">
      <div class="overlay-title">Enter verification code</div>
      <div class="overlay-sub">We sent a 6-digit code to<br><b id="addEmailCodeTarget"></b></div>
      <div class="code-row">
        <input class="code-digit" maxlength="1" inputmode="numeric" autocomplete="one-time-code">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
        <input class="code-digit" maxlength="1" inputmode="numeric">
      </div>
      <div class="acc-msg" id="addEmailCodeMsg"></div>
      <button class="acc-btn" id="addEmailConfirmBtn" style="width:100%">Verify & Add</button>
      <button class="overlay-resend" id="addEmailResend" disabled>Resend code (<span id="addEmailResendWait">30</span>s)</button>
      <button class="overlay-cancel" id="addEmailCancel2">Cancel</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="notifOverlay">
  <div class="flist-card">
    <div class="flist-header">
      <div class="flist-title" id="notifTitle">Notifications</div>
      <button type="button" class="flist-close" id="notifCloseBtn" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flist-search-wrap" style="padding-top:0;display:flex;justify-content:flex-end">
      <button type="button" class="notif-mark-read" id="notifMarkReadBtn">Mark all as read</button>
    </div>
    <div class="flist-list" id="notifList"></div>
  </div>
</div>

<div class="page-overlay" id="verifyOverlay">
  <div class="overlay-card" style="max-width:380px">
    <div class="overlay-step active" id="verifyStepIntro">
      <div class="verify-icon-wrap">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>
      </div>
      <div class="overlay-title" style="text-align:center">Get Verified</div>
      <div class="overlay-sub" style="text-align:center">Stand out with a verified badge and a personal ES TEAMS TV certificate.</div>
      <div class="verify-benefits">
        <div class="verify-benefit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Verified badge on your profile</div>
        <div class="verify-benefit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Unlimited use of every free tool</div>
        <div class="verify-benefit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>A downloadable verification certificate</div>
      </div>
      <div class="verify-price-row">
        <span class="verify-price" id="verifyPriceLabel">₦1,500</span>
        <span class="verify-price-period">/ 30 days</span>
      </div>
      <div class="acc-msg err" id="verifyIntroMsg"></div>
      <button class="acc-btn" id="verifyPayBtn" style="width:100%">Pay & Verify</button>
      <button class="overlay-cancel" id="verifyCancel1">Cancel</button>
    </div>
    <div class="overlay-step" id="verifyStepProcessing">
      <div class="acc-loader-ring" style="margin:6px auto"></div>
      <div class="overlay-sub" style="text-align:center">Confirming your payment…</div>
    </div>
    <div class="overlay-step" id="verifyStepSuccess">
      <div class="verify-success-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
      </div>
      <div class="overlay-title" style="text-align:center">You are now Verified</div>
      <div class="overlay-sub" style="text-align:center">Your certificate is ready — valid for 30 days.</div>
      <button class="acc-btn" id="verifyViewCertBtn" style="width:100%">View Certificate</button>
      <button class="overlay-cancel" id="verifyCancel2">Close</button>
    </div>
  </div>
</div>

<div class="page-overlay" id="certOverlay">
  <div class="cert-overlay-inner">
    <button type="button" class="flist-close cert-close" id="certCloseBtn" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <div class="cert-card" id="certCard">
      <div class="cert-card-top">
        <div class="cert-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          ES TEAMS TV
        </div>
        <div class="cert-status-chip" id="certStatusChip">VALID</div>
      </div>
      <div class="cert-label">Certificate of Verification</div>
      <div class="cert-name" id="certName">–</div>
      <div class="cert-username" id="certUsername">–</div>
      <div class="cert-divider"></div>
      <div class="cert-meta-row">
        <div>
          <span class="cert-meta-label">Issued</span>
          <span class="cert-meta-val" id="certIssued">–</span>
        </div>
        <div>
          <span class="cert-meta-label">Expires</span>
          <span class="cert-meta-val" id="certExpires">–</span>
        </div>
      </div>
      <div class="cert-signature-wrap">
        <div class="cert-signature">Es Teams</div>
        <svg class="cert-signature-flourish" viewBox="0 0 220 40" preserveAspectRatio="none">
          <path d="M6 22 C 34 4, 58 36, 90 16 S 148 2, 176 24 S 210 8, 214 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="cert-signature-label">Authorized Signature — ES TEAMS TV</div>
      <div class="cert-tear-edge"></div>
    </div>
    <button type="button" class="acc-btn cert-download-btn" id="certDownloadBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>
      Download Certificate
    </button>
  </div>
</div>

<button type="button" class="acc-cert-fab dead" id="certFab" aria-label="Certificate" title="Certificate">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/></svg>
</button>

<a class="acc-deploy-fab" href="/deploy-bot" aria-label="Deploy Bot" title="Deploy Bot">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="8.5" cy="16" r="1.2" fill="currentColor" stroke="none"/>
    <circle cx="15.5" cy="16" r="1.2" fill="currentColor" stroke="none"/>
    <path d="M12 11V7m-3 0h6"/>
  </svg>
</a>

<script>
const params = new URLSearchParams(window.location.search);
const resetToken = params.get('resetToken');
const VERIFIED_BADGE = '<svg class="verified-badge" viewBox="0 0 24 24" width="15" height="15" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
const PAYSTACK_PUBLIC_KEY = ${JSON.stringify(cfg.paystackPublicKey || "")};

document.getElementById('accBackBtn').addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = '/';
});

async function postJSON(url, body, timeoutMs){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 12000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: controller.signal });
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'This is taking longer than expected.' : 'Request failed');
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
async function getJSON(url){
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
async function deleteJSON(url){
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function md5(str){
  function rotl(n,c){return (n<<c)|(n>>>(32-c));}
  function toHex(n){let s='';for(let i=0;i<4;i++){s+=((n>>(i*8))&255).toString(16).padStart(2,'0');}return s;}
  const K=[];for(let i=0;i<64;i++){K[i]=Math.floor(Math.abs(Math.sin(i+1))*4294967296);}
  const S=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  const bytes=[];for(let i=0;i<str.length;i++){let c=str.charCodeAt(i);if(c<128){bytes.push(c);}else if(c<2048){bytes.push(192|(c>>6),128|(c&63));}else{bytes.push(224|(c>>12),128|((c>>6)&63),128|(c&63));}}
  const bitLen=bytes.length*8;
  bytes.push(0x80);while(bytes.length%64!==56){bytes.push(0);}
  for(let i=0;i<8;i++){bytes.push((bitLen/Math.pow(2,i*8))&255);}
  let a0=1732584193,b0=-271733879,c0=-1732584194,d0=271733878;
  for(let chunk=0;chunk<bytes.length;chunk+=64){
    const M=[];for(let i=0;i<16;i++){M[i]=bytes[chunk+i*4]|(bytes[chunk+i*4+1]<<8)|(bytes[chunk+i*4+2]<<16)|(bytes[chunk+i*4+3]<<24);}
    let A=a0,B=b0,C=c0,D=d0;
    for(let i=0;i<64;i++){
      let F,g;
      if(i<16){F=(B&C)|(~B&D);g=i;}
      else if(i<32){F=(D&B)|(~D&C);g=(5*i+1)%16;}
      else if(i<48){F=B^C^D;g=(3*i+5)%16;}
      else{F=C^(B|~D);g=(7*i)%16;}
      F=(F+A+K[i]+M[g])|0;
      A=D;D=C;C=B;B=(B+rotl(F,S[i]))|0;
    }
    a0=(a0+A)|0;b0=(b0+B)|0;c0=(c0+C)|0;d0=(d0+D)|0;
  }
  return [a0,b0,c0,d0].map(n=>{
    const bytesN=[n&255,(n>>8)&255,(n>>16)&255,(n>>24)&255];
    return bytesN.map(b=>b.toString(16).padStart(2,'0')).join('');
  }).join('');
}

let profile = null;
const editableFieldNames = ['firstName', 'lastName', 'username'];
const fieldState = {};

function updateHeroIdentity(){
  document.getElementById('heroEmail').textContent = profile.username ? ('@' + profile.username) : profile.email;
}

function updateSaveButtonState(){
  const anyConfirmed = editableFieldNames.some(f => fieldState[f]?.confirmed);
  document.getElementById('saveProfileBtn').disabled = !anyConfirmed;
}

function initEditableField(name){
  const wrap = document.querySelector('.edit-wrap[data-field="' + name + '"]');
  const input = document.getElementById(name);
  const pencilBtn = wrap.querySelector('.ic-pencil');
  const cancelBtn = wrap.querySelector('.ic-cancel');
  const confirmBtn = wrap.querySelector('.ic-confirm');
  fieldState[name] = { confirmed: false, original: '' };

  function enterEdit(){
    fieldState[name].original = input.value;
    input.disabled = false;
    wrap.classList.add('editing');
    confirmBtn.classList.remove('ready');
    input.focus();
    input.select();
  }
  function cancelEdit(){
    input.value = fieldState[name].original;
    input.disabled = true;
    wrap.classList.remove('editing');
    fieldState[name].confirmed = false;
    if (name === 'username') {
      const status = document.getElementById('acctUsernameStatus');
      status.className = 'uname-status';
      status.innerHTML = '';
    }
    updateSaveButtonState();
  }
  function confirmEdit(){
    if (!confirmBtn.classList.contains('ready')) return;
    input.disabled = true;
    wrap.classList.remove('editing');
    fieldState[name].confirmed = input.value.trim() !== fieldState[name].original.trim();
    updateSaveButtonState();
  }

  pencilBtn.addEventListener('click', enterEdit);
  cancelBtn.addEventListener('click', cancelEdit);
  confirmBtn.addEventListener('click', confirmEdit);

  return { input, confirmBtn };
}

const firstNameField = initEditableField('firstName');
firstNameField.input.addEventListener('input', () => {
  firstNameField.confirmBtn.classList.toggle('ready', firstNameField.input.value.trim().length > 0);
});

const lastNameField = initEditableField('lastName');
lastNameField.input.addEventListener('input', () => {
  lastNameField.confirmBtn.classList.toggle('ready', lastNameField.input.value.trim().length > 0);
});

const usernameField = initEditableField('username');
let acctUsernameCheckSeq = 0;
usernameField.input.addEventListener('input', () => {
  usernameField.confirmBtn.classList.remove('ready');
  const status = document.getElementById('acctUsernameStatus');
  const val = usernameField.input.value.trim().toLowerCase();
  const seq = ++acctUsernameCheckSeq;

  if (!val) { status.className = 'uname-status'; status.innerHTML = ''; return; }
  if (val === (profile.username || '').toLowerCase()) {
    status.className = 'uname-status'; status.innerHTML = '';
    return;
  }
  if (!/^[a-z0-9_]{3,20}$/.test(val)) {
    status.className = 'uname-status taken';
    status.textContent = '3-20 characters: letters, numbers, underscore only.';
    return;
  }
  status.className = 'uname-status';
  status.innerHTML = '<span class="uname-spinner"></span>Checking Username ..';
  setTimeout(async () => {
    if (seq !== acctUsernameCheckSeq) return;
    try {
      const res = await fetch('/api/account/check-username?username=' + encodeURIComponent(val));
      const data = await res.json();
      if (seq !== acctUsernameCheckSeq) return;
      if (data.available) {
        usernameField.confirmBtn.classList.add('ready');
        status.className = 'uname-status ok';
        status.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Username available';
      } else {
        usernameField.confirmBtn.classList.remove('ready');
        status.className = 'uname-status taken';
        status.textContent = data.error || 'Username has already been used.';
      }
    } catch {
      if (seq !== acctUsernameCheckSeq) return;
      status.className = 'uname-status taken';
      status.textContent = 'Could not check username right now — try again in a moment.';
    }
  }, 450);
});

function renderAltUsernameChips(){
  const list = document.getElementById('altUnameList');
  list.innerHTML = '';
  (profile.altUsernames || []).forEach((name) => {
    const chip = document.createElement('div');
    chip.className = 'alt-uname-chip';
    const label = document.createElement('span');
    label.textContent = '@' + name;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', 'Remove @' + name);
    removeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';
    removeBtn.addEventListener('click', async () => {
      removeBtn.disabled = true;
      try {
        const data = await postJSON('/api/account/alt-usernames/remove', { username: name });
        profile.altUsernames = data.altUsernames || [];
        renderAltUsernameChips();
        showToast('@' + name + ' removed.');
      } catch (err) {
        showToast(err.message || 'Could not remove that username.');
        removeBtn.disabled = false;
      }
    });
    chip.appendChild(label);
    chip.appendChild(removeBtn);
    list.appendChild(chip);
  });
}

function initAltUsernames(){
  if (!profile.isAdmin) return;
  document.getElementById('altUsernamesField').style.display = 'block';
  renderAltUsernameChips();

  const addBtn = document.getElementById('altUnameAddBtn');
  const inputRow = document.getElementById('altUnameInputRow');
  const input = document.getElementById('altUnameInput');
  const msg = document.getElementById('altUnameMsg');
  const confirmBtn = document.getElementById('altUnameConfirmBtn');
  const cancelBtn = document.getElementById('altUnameCancelBtn');

  let altUnameCheckSeq = 0;

  addBtn.addEventListener('click', () => {
    addBtn.style.display = 'none';
    inputRow.style.display = 'flex';
    msg.textContent = '';
    msg.className = 'alt-uname-msg';
    confirmBtn.classList.remove('ready');
    input.value = '';
    input.focus();
  });
  cancelBtn.addEventListener('click', () => {
    inputRow.style.display = 'none';
    addBtn.style.display = 'flex';
    msg.textContent = '';
    msg.className = 'alt-uname-msg';
    confirmBtn.classList.remove('ready');
    altUnameCheckSeq++;
  });

  input.addEventListener('input', () => {
    confirmBtn.classList.remove('ready');
    const val = input.value.trim().toLowerCase();
    const seq = ++altUnameCheckSeq;
    msg.className = 'alt-uname-msg';

    if (!val) { msg.innerHTML = ''; return; }
    if (!/^[a-z0-9_]{3,20}$/.test(val)) {
      msg.classList.add('err');
      msg.textContent = '3-20 characters: letters, numbers, underscore only.';
      return;
    }
    if (val === (profile.username || '').toLowerCase()) {
      msg.classList.add('err');
      msg.textContent = "That's already your main username.";
      return;
    }
    if ((profile.altUsernames || []).includes(val)) {
      msg.classList.add('err');
      msg.textContent = 'That username is already added.';
      return;
    }

    msg.innerHTML = '<span class="uname-spinner"></span>Checking Username ..';
    setTimeout(async () => {
      if (seq !== altUnameCheckSeq) return;
      try {
        const res = await fetch('/api/account/check-username?username=' + encodeURIComponent(val));
        if (res.status === 429) {
          if (seq !== altUnameCheckSeq) return;
          msg.className = 'alt-uname-msg err';
          msg.textContent = "You're checking a bit fast — wait a few seconds and try again.";
          return;
        }
        let data = null;
        try { data = await res.json(); } catch {  }
        if (seq !== altUnameCheckSeq) return;
        if (data && data.available) {
          confirmBtn.classList.add('ready');
          msg.className = 'alt-uname-msg ok';
          msg.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>Username available';
        } else if (data) {
          confirmBtn.classList.remove('ready');
          msg.className = 'alt-uname-msg err';
          msg.textContent = data.error || 'Username has already been used.';
        } else {
          msg.className = 'alt-uname-msg err';
          msg.textContent = 'Could not check username right now — try again in a moment.';
        }
      } catch {
        if (seq !== altUnameCheckSeq) return;
        msg.className = 'alt-uname-msg err';
        msg.textContent = 'Could not check username right now — try again in a moment.';
      }
    }, 450);
  });

  const confirmBtnOriginalHTML = confirmBtn.innerHTML;

  confirmBtn.addEventListener('click', async () => {
    if (!confirmBtn.classList.contains('ready')) return;
    const val = input.value.trim().toLowerCase();
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="uname-spinner"></span>';
    try {
      const data = await postJSON('/api/account/alt-usernames', { username: val }, 20000);
      profile.altUsernames = data.altUsernames || [];
      renderAltUsernameChips();
      inputRow.style.display = 'none';
      addBtn.style.display = 'flex';
      confirmBtn.classList.remove('ready');
      msg.textContent = '';
      msg.className = 'alt-uname-msg';
      showToast('@' + val + ' added.');
    } catch (err) {
      msg.textContent = err.message || 'Could not add that username.';
      msg.className = 'alt-uname-msg err';
      confirmBtn.classList.remove('ready');
    }
    confirmBtn.innerHTML = confirmBtnOriginalHTML;
    confirmBtn.disabled = false;
  });
}

async function loadProfile(){
  try {
    profile = await getJSON('/api/profile');
  } catch (err) {
    window.location.href = '/login';
    return;
  }
  document.getElementById('accLoader').style.display = 'none';
  document.getElementById('accWrap').style.display = 'block';
  
  const initials = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '');
  const avatar = document.getElementById('heroAvatar');
  avatar.textContent = initials;

  if (profile.photoURL) {
    avatar.style.backgroundImage = 'url(' + profile.photoURL + ')';
    avatar.textContent = '';
  } else if (profile.email) {
    const hash = md5(profile.email.trim().toLowerCase());
    avatar.style.backgroundImage = 'url(https://www.gravatar.com/avatar/' + hash + '?s=200&d=identicon)';
    avatar.textContent = '';
  }
  
  document.getElementById('heroName').innerHTML = 'Hi, ' + profile.firstName + ((profile.isAdmin || profile.verified) ? VERIFIED_BADGE : '');
  updateVerificationUI();
  updateHeroIdentity();
  document.getElementById('firstName').value = profile.firstName || '';
  document.getElementById('lastName').value = profile.lastName || '';
  document.getElementById('username').value = profile.username || '';
  const emailField = document.getElementById('emailField');
  const emailFieldLabel = document.getElementById('emailFieldLabel');
  const addEmailLink = document.getElementById('addEmailLink');
  if (profile.email) {
    emailFieldLabel.textContent = 'Email';
    emailField.type = 'email';
    emailField.value = profile.email;
    addEmailLink.style.display = 'none';
  } else if (profile.telegramId) {
    emailFieldLabel.textContent = 'Telegram ID';
    emailField.type = 'text';
    emailField.value = profile.telegramId;
    addEmailLink.style.display = 'inline-block';
  } else {
    emailFieldLabel.textContent = 'Email';
    emailField.type = 'email';
    emailField.value = '';
    addEmailLink.style.display = 'none';
  }

  initAltUsernames();

  renderTfaState();
  renderPrivacyState();

  if (window.location.hash === '#lockProfile') {
    document.getElementById('privacyCard').classList.add('open');
    setTimeout(() => {
      document.getElementById('privacyCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
      const row = document.getElementById('lockProfileRow');
      row.classList.add('flash-highlight');
      setTimeout(() => row.classList.remove('flash-highlight'), 1800);
    }, 350);
  }
  if (window.location.hash === '#addEmail' && addEmailLink.style.display !== 'none') {
    document.getElementById('addEmailOverlay').classList.add('show');
  }
}
loadProfile();

function notifFormatTime(ts){
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
function showToast(message){
  const toast = document.createElement('div');
  toast.className = 'acc-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

function updateNotifTitle(list){
  const unreadCount = list.filter(n => !n.read).length;
  document.getElementById('notifTitle').textContent = 'Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '');
}

const NOTIF_CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>';
const NOTIF_TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6"/></svg>';

function refreshNotifTitleFromDOM(){
  const unreadCount = document.querySelectorAll('#notifList .notif-row-inner.unread').length;
  document.getElementById('notifTitle').textContent = 'Notifications' + (unreadCount > 0 ? ' (' + unreadCount + ')' : '');
}

function wireNotifSwipe(row, notifId){
  const inner = row.querySelector('.notif-row-inner');
  const bg = row.querySelector('.notif-swipe-bg');
  const bgIcon = bg.querySelector('.notif-swipe-icon');
  const bgLabel = bg.querySelector('.notif-swipe-label');
  let startX = null;
  let currentX = 0;
  let dismissed = false;

  function onStart(x, target){
    if (target && target.closest('button')) { startX = null; return; }
    startX = x; currentX = 0; row.classList.add('dragging');
  }
  function onMove(x){
    if (startX === null) return;
    currentX = x - startX;
    inner.style.transform = 'translateX(' + currentX + 'px)';
    if (currentX > 0) {
      bg.classList.remove('mode-delete');
      bg.classList.add('mode-read');
      bgIcon.innerHTML = NOTIF_CHECK_ICON;
      bgLabel.textContent = inner.classList.contains('unread') ? 'Mark as read' : 'Mark as unread';
    } else if (currentX < 0) {
      bg.classList.remove('mode-read');
      bg.classList.add('mode-delete');
      bgIcon.innerHTML = NOTIF_TRASH_ICON;
      bgLabel.textContent = 'Delete';
    }
  }
  async function onEnd(){
    if (startX === null) return;
    row.classList.remove('dragging');
    startX = null;
    if (dismissed) return;

    if (currentX > 90) {
      dismissed = true;
      const wasUnread = inner.classList.contains('unread');
      inner.style.transform = 'translateX(100%)';
      inner.style.opacity = '0';
      try {
        const result = await postJSON('/api/notifications/' + notifId + '/toggle-read', {});
        inner.classList.toggle('unread', !result.read);
        if (result.read) {
          showToast('Marked as Read');
        } else {
          showToast('Marked as Unread');
          document.getElementById('notifDot').classList.add('show');
        }
      } catch (err) {}
      setTimeout(() => {
        inner.style.transform = '';
        inner.style.opacity = '1';
        refreshNotifTitleFromDOM();
        dismissed = false;
      }, 250);
    } else if (currentX < -90) {
      dismissed = true;
      inner.style.transform = 'translateX(-100%)';
      inner.style.opacity = '0';
      try {
        await postJSON('/api/notifications/' + notifId + '/delete', {});
        showToast('Notification deleted');
        setTimeout(() => {
          row.remove();
          refreshNotifTitleFromDOM();
          if (!document.getElementById('notifList').children.length) {
            document.getElementById('notifList').innerHTML = '<div class="flist-empty">No notifications yet.</div>';
          }
        }, 220);
      } catch (err) {
        dismissed = false;
        inner.style.transform = '';
        inner.style.opacity = '1';
      }
    } else {
      inner.style.transform = '';
    }
  }

  row.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX, e.target), { passive: true });
  row.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true });
  row.addEventListener('touchend', onEnd);
  row.addEventListener('mousedown', (e) => onStart(e.clientX, e.target));
  row.addEventListener('mousemove', (e) => { if (startX !== null) onMove(e.clientX); });
  row.addEventListener('mouseup', onEnd);
  row.addEventListener('mouseleave', () => { if (startX !== null) onEnd(); });
}

function notifRender(list){
  const listEl = document.getElementById('notifList');
  listEl.innerHTML = '';
  updateNotifTitle(list);
  if (!list.length) {
    listEl.innerHTML = '<div class="flist-empty">No notifications yet.</div>';
    return;
  }
  list.forEach(n => {
    const row = document.createElement('div');
    row.className = 'notif-row';
    row.dataset.id = n.id;

    const swipeBg = document.createElement('div');
    swipeBg.className = 'notif-swipe-bg';
    swipeBg.innerHTML = '<span class="notif-swipe-icon"></span><span class="notif-swipe-label"></span>';
    row.appendChild(swipeBg);

    const inner = document.createElement('div');
    inner.className = 'notif-row-inner' + (n.read ? '' : ' unread');

    const top = document.createElement('div');
    top.className = 'notif-top';
    const msg = document.createElement('div');
    msg.className = 'notif-msg';
    msg.textContent = n.message;
    top.appendChild(msg);
    if (n.type === 'follow' && n.meta && n.meta.followerUid) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notif-follow-btn' + (n.followingBack ? ' following' : '');
      btn.textContent = n.followingBack ? 'Following' : 'Follow back';
      btn.dataset.uid = n.meta.followerUid;
      top.appendChild(btn);
    }
    if ((n.type === 'like' || n.type === 'tag' || n.type === 'reshare' || n.type === 'comment') && n.meta && n.meta.postUrl) {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View Post';
      viewBtn.addEventListener('click', () => { window.location.href = n.meta.postUrl; });
      top.appendChild(viewBtn);
    }
    if (n.type === 'verified') {
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'notif-view-post-btn';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => {
        document.getElementById('notifOverlay').classList.remove('show');
        openCertOverlay();
      });
      top.appendChild(viewBtn);
    }
    const time = document.createElement('div');
    time.className = 'notif-time';
    time.textContent = notifFormatTime(n.createdAt);
    inner.appendChild(top);
    inner.appendChild(time);
    row.appendChild(inner);
    listEl.appendChild(row);
    if (n.id) wireNotifSwipe(row, n.id);
  });
}
document.getElementById('notifList').addEventListener('click', async (e) => {
  const btn = e.target.closest('.notif-follow-btn');
  if (!btn || btn.disabled) return;
  const isFollowingNow = btn.classList.contains('following');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="btn-spinner" style="margin-right:0"></span>';
  try {
    const res = await fetch('/api/' + (isFollowingNow ? 'unfollow' : 'follow') + '/' + btn.dataset.uid, { method: 'POST' });
    if (!res.ok) throw new Error();
    btn.classList.toggle('following', !isFollowingNow);
    btn.textContent = !isFollowingNow ? 'Following' : 'Follow back';
  } catch (err) {
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
});
async function loadNotifDot(){
  try {
    const data = await getJSON('/api/notifications/unread');
    document.getElementById('notifDot').classList.toggle('show', !!data.hasUnread);
  } catch (err) {}
}
async function openNotifOverlay(){
  const overlay = document.getElementById('notifOverlay');
  document.getElementById('notifList').innerHTML = '<div class="flist-empty">Loading…</div>';
  overlay.classList.add('show');
  try {
    const data = await getJSON('/api/notifications');
    notifRender(data.results || []);
  } catch (err) {
    document.getElementById('notifList').innerHTML = '<div class="flist-empty">Could not load notifications. Try again.</div>';
  }
}
document.getElementById('notifBellBtn').addEventListener('click', openNotifOverlay);
document.getElementById('notifCloseBtn').addEventListener('click', () => {
  document.getElementById('notifOverlay').classList.remove('show');
});
document.getElementById('notifOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'notifOverlay') document.getElementById('notifOverlay').classList.remove('show');
});
document.getElementById('notifMarkReadBtn').addEventListener('click', async () => {
  const btn = document.getElementById('notifMarkReadBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner" style="margin-right:4px"></span>Marking…';
  try {
    await postJSON('/api/notifications/mark-all-read', {});
    document.getElementById('notifDot').classList.remove('show');
    document.querySelectorAll('#notifList .notif-row-inner.unread').forEach(el => el.classList.remove('unread'));
    document.getElementById('notifTitle').textContent = 'Notifications';
  } catch (err) {}
  btn.textContent = originalText;
  btn.disabled = false;
});
loadNotifDot();
setInterval(loadNotifDot, 20000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadNotifDot();
});

function flashMsg(el, msg, ok){
  el.textContent = msg;
  el.className = 'acc-msg show ' + (ok ? 'ok' : 'err');
  setTimeout(() => el.classList.remove('show'), 3500);
}

document.getElementById('passkeyHeader').addEventListener('click', () => {
  document.getElementById('passkeyCard').classList.toggle('open');
});

function timeAgo(ts){
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + 'd ago';
  return new Date(ts).toLocaleDateString();
}

async function loadPasskeys(){
  try {
    const { passkeys, maxPasskeys } = await getJSON('/api/passkey/list');
    const listEl = document.getElementById('passkeyList');
    const addRow = document.getElementById('passkeyAddRow');
    const maxMsg = document.getElementById('passkeyMaxMsg');
    const limit = maxPasskeys || 1;
    document.getElementById('passkeyLimitText').textContent = 'Up to ' + limit + ' passkey' + (limit === 1 ? '' : 's') + ' per account.';
    listEl.innerHTML = passkeys.map(p =>
      '<div class="pk-row" data-id="' + p.id + '">' +
        '<div>' +
          '<div class="pk-row-name">' + p.name + '</div>' +
          '<div class="pk-row-time">Added ' + timeAgo(p.createdAt) + '</div>' +
        '</div>' +
        '<button class="pk-delete-btn" data-delete-id="' + p.id + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>' +
          'Delete' +
        '</button>' +
      '</div>'
    ).join('');
    listEl.querySelectorAll('.pk-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deletePasskeyRow(btn.dataset.deleteId, btn));
    });
    const atMax = passkeys.length >= limit;
    addRow.style.display = atMax ? 'none' : 'block';
    maxMsg.style.display = atMax ? 'block' : 'none';
  } catch (err) {
  }
}

async function deletePasskeyRow(id, btn){
  const msg = document.getElementById('passkeyMsg');
  const originalHtml = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner" style="margin-right:0;border-color:rgba(255,59,92,.35);border-top-color:var(--red)"></span>'; }
  try {
    await postJSON('/api/passkey/delete', { credentialId: id });
    await loadPasskeys();
    flashMsg(msg, 'Passkey deleted.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

document.getElementById('apiHeader').addEventListener('click', () => {
  document.getElementById('apiCard').classList.toggle('open');
});

async function loadApiKeys(){
  try {
    const { keys, plan } = await getJSON('/api/dev/keys');
    const listEl = document.getElementById('apiKeyList');
    const addRow = document.getElementById('apiKeyAddRow');
    const maxMsg = document.getElementById('apiKeyMaxMsg');
    if (plan) {
      document.getElementById('apiKeyLimitText').textContent = 'Up to ' + plan.apiKeys + ' key' + (plan.apiKeys === 1 ? '' : 's') + ' per account.';
      const badgeRow = document.getElementById('apiPlanBadgeRow');
      const badge = document.getElementById('apiPlanBadge');
      badgeRow.style.display = 'block';
      badge.textContent = plan.name + ' Plan';
      badge.className = 'cert-status-chip' + (plan.key === 'free' ? ' neutral' : '');
    }
    listEl.innerHTML = keys.map(k =>
      '<div class="pk-row" data-id="' + k.id + '">' +
        '<div>' +
          '<div class="pk-row-name">' + (k.label || 'Unnamed key') + ' <span style="color:var(--muted);font-weight:400">••••' + k.last4 + '</span></div>' +
          '<div class="pk-row-time">Created ' + timeAgo(k.createdAt) + (k.lastUsedAt ? ' · last used ' + timeAgo(k.lastUsedAt) : ' · never used') + '</div>' +
        '</div>' +
        '<button class="pk-delete-btn" data-delete-id="' + k.id + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>' +
          'Revoke' +
        '</button>' +
      '</div>'
    ).join('');
    listEl.querySelectorAll('.pk-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => revokeApiKeyRow(btn.dataset.deleteId, btn));
    });
    const atMax = keys.length >= (plan ? plan.apiKeys : 1);
    addRow.style.display = atMax ? 'none' : 'block';
    maxMsg.style.display = atMax ? 'block' : 'none';
  } catch (err) {
  }
}

async function revokeApiKeyRow(id, btn){
  const msg = document.getElementById('apiKeyMsg');
  const originalHtml = btn ? btn.innerHTML : null;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-spinner" style="margin-right:0;border-color:rgba(255,59,92,.35);border-top-color:var(--red)"></span>'; }
  try {
    await deleteJSON('/api/dev/keys/' + encodeURIComponent(id));
    document.getElementById('apiKeyRevealBox').style.display = 'none';
    await loadApiKeys();
    flashMsg(msg, 'API key revoked.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
    if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
  }
}

document.getElementById('createApiKeyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('createApiKeyBtn');
  const msg = document.getElementById('apiKeyMsg');
  const labelInput = document.getElementById('apiKeyLabelInput');
  const label = labelInput.value.trim();
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Creating…';
  try {
    const { key } = await postJSON('/api/dev/keys', { label });
    labelInput.value = '';
    const revealBox = document.getElementById('apiKeyRevealBox');
    document.getElementById('apiKeyRevealValue').textContent = key;
    revealBox.style.display = 'block';
    await loadApiKeys();
    flashMsg(msg, 'API key created.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
});

document.getElementById('apiKeyCopyBtn').addEventListener('click', () => {
  const val = document.getElementById('apiKeyRevealValue').textContent;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('apiKeyCopyBtn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1500);
  }).catch(() => {});
});

document.getElementById('addPasskeyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('addPasskeyBtn');
  const msg = document.getElementById('passkeyMsg');
  const nameInput = document.getElementById('passkeyNameInput');
  const name = nameInput.value.trim();
  if (!name) { flashMsg(msg, 'Give this passkey a name first.', false); return; }
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Waiting for fingerprint…';
  try {
    const { startRegistration } = await import('/vendor/simplewebauthn-browser.v13.js');
    const options = await postJSON('/api/passkey/registration-options', {});
    if (!options || !options.challenge || !options.user || !options.user.id) throw new Error('Could not start passkey setup. Try again.');
    const response = await startRegistration({ optionsJSON: options });
    await postJSON('/api/passkey/registration-verify', { ...response, name });
    nameInput.value = '';
    await loadPasskeys();
    flashMsg(msg, 'Passkey added.', true);
  } catch (err) {
    flashMsg(msg, err.name === 'NotAllowedError' ? 'Passkey setup was cancelled.' : (err.message || 'Could not add passkey.'), false);
  }
  btn.disabled = false;
  btn.innerHTML = originalHTML;
});
loadPasskeys();
loadApiKeys();

document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveProfileBtn');
  const msg = document.getElementById('profileMsg');
  const payload = {};
  if (fieldState.firstName.confirmed) payload.firstName = document.getElementById('firstName').value.trim();
  if (fieldState.lastName.confirmed) payload.lastName = document.getElementById('lastName').value.trim();
  if (fieldState.username.confirmed) payload.username = document.getElementById('username').value.trim().toLowerCase();

  if (Object.keys(payload).length === 0) {
    flashMsg(msg, 'No Changes Added', true);
    return;
  }

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<span class="btn-spinner"></span>Saving…';
  try {
    await postJSON('/api/update-profile', payload);
    Object.assign(profile, payload);
    editableFieldNames.forEach(f => { fieldState[f].confirmed = false; });
    updateHeroIdentity();
    flashMsg(msg, 'Saved.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.innerHTML = originalHtml;
  updateSaveButtonState();
});

document.getElementById('startPwChange').addEventListener('click', async () => {
  const btn = document.getElementById('startPwChange');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Sending code…';
  try {
    await postJSON('/api/request-password-change');
    window.location.href = '/verify?uid=' + encodeURIComponent(profile.uid) + '&email=' + encodeURIComponent(profile.email) + '&purpose=password_reset';
  } catch (err) {
    flashMsg(document.getElementById('pwMsg'), err.message, false);
    btn.disabled = false;
    btn.textContent = 'Change Password';
  }
});

document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const shown = btn.classList.toggle('shown');
    input.type = shown ? 'text' : 'password';
  });
});

if (resetToken) {
  document.getElementById('pwDefaultView').style.display = 'none';
  document.getElementById('pwResetView').style.display = 'block';
}

document.getElementById('confirmPwBtn').addEventListener('click', async () => {
  const btn = document.getElementById('confirmPwBtn');
  const msg = document.getElementById('pwMsg');
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  if (newPassword.length < 6) { flashMsg(msg, 'Password must be at least 6 characters.', false); return; }
  if (newPassword !== confirmNewPassword) { flashMsg(msg, 'Passwords do not match.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Updating…';
  try {
    await postJSON('/api/change-password', { resetToken, newPassword });
    flashMsg(msg, 'Password updated.', true);
    document.getElementById('pwResetView').style.display = 'none';
    document.getElementById('pwDefaultView').style.display = 'flex';
    window.history.replaceState({}, '', '/account');
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.disabled = false;
  btn.textContent = 'Set New Password';
});

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeIconMoon').style.display = theme === 'light' ? 'none' : 'block';
  document.getElementById('themeIconSun').style.display = theme === 'light' ? 'block' : 'none';
  var themeColorMeta = document.getElementById('themeColorMeta');
  if (themeColorMeta) themeColorMeta.setAttribute('content', theme === 'light' ? '#F5F6FA' : '#0A0A0F');
}
applyTheme(localStorage.getItem('theme') || 'dark');

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = localStorage.getItem('theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('logoutOverlay').classList.add('show');
});
document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
  document.getElementById('logoutOverlay').classList.remove('show');
});
document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
  await postJSON('/api/logout');
  window.location.href = '/login?logged_out=1';
});

document.getElementById('dangerHeader').addEventListener('click', () => {
  document.getElementById('dangerCard').classList.toggle('open');
});

let deleteCaptchaPassed = false;
let deleteCaptchaValue = '';
const deleteAltcha = document.getElementById('deleteAltcha');
if (deleteAltcha) {
  deleteAltcha.addEventListener('statechange', (ev) => {
    const state = ev.detail.state;
    deleteCaptchaPassed = state === 'verified';
    deleteCaptchaValue = deleteCaptchaPassed ? ev.detail.payload : '';
    document.getElementById('deleteContinueBtn').disabled = !deleteCaptchaPassed;
  });
}

const deleteOverlay = document.getElementById('deleteOverlay');
const deleteStepCaptcha = document.getElementById('deleteStepCaptcha');
const deleteStepCode = document.getElementById('deleteStepCode');
let deleteTimerInterval = null;

function closeDeleteOverlay(){
  deleteOverlay.classList.remove('show');
  deleteStepCaptcha.classList.add('active');
  deleteStepCode.classList.remove('active');
  if (deleteTimerInterval) clearInterval(deleteTimerInterval);
}
document.getElementById('cancelDelete1').addEventListener('click', closeDeleteOverlay);
document.getElementById('cancelDelete2').addEventListener('click', closeDeleteOverlay);

document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
  const btn = document.getElementById('deleteAccountBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner btn-spinner-light" style="border-top-color:var(--red)"></span>Deleting Account…';
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    deleteOverlay.classList.add('show');
  }, 700);
});

document.getElementById('deleteContinueBtn').addEventListener('click', async () => {
  const btn = document.getElementById('deleteContinueBtn');
  const msg = document.getElementById('deleteCaptchaMsg');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner btn-spinner-light" style="border-top-color:var(--red)"></span>Sending code…';
  try {
    const result = await postJSON('/api/request-account-deletion', { altcha: deleteCaptchaValue });
    document.getElementById('deleteEmailLabel').textContent = result.via === 'telegram' ? 'your Telegram' : profile.email;
    document.getElementById('deleteCodeIntro').textContent = result.via === 'telegram'
      ? 'We sent a 6-digit code via Telegram to'
      : 'We sent a 6-digit code to';
    deleteStepCaptcha.classList.remove('active');
    deleteStepCode.classList.add('active');
    startDeleteTimer();
    startDeleteResendCooldown();
  } catch (err) {
    flashMsg(msg, err.message, false);
    btn.disabled = false;
    btn.textContent = 'Continue';
  }
});

const deleteDigits = Array.from(document.querySelectorAll('#deleteStepCode .code-digit'));
deleteDigits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < deleteDigits.length - 1) deleteDigits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) deleteDigits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (deleteDigits[idx]) deleteDigits[idx].value = ch; });
    if (deleteDigits[text.length - 1]) deleteDigits[text.length - 1].focus();
  });
});

function startDeleteTimer(){
  let secondsLeft = 300;
  const timerVal = document.getElementById('deleteTimerVal');
  const timerWrap = document.getElementById('deleteTimer');
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  timerWrap.classList.remove('expired');
  confirmBtn.disabled = false;
  if (deleteTimerInterval) clearInterval(deleteTimerInterval);
  deleteTimerInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(deleteTimerInterval);
      timerVal.textContent = 'expired';
      timerWrap.classList.add('expired');
      confirmBtn.disabled = true;
      return;
    }
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    timerVal.textContent = m + ':' + String(s).padStart(2, '0');
  }, 1000);
}

function startDeleteResendCooldown(){
  let wait = 30;
  const resendBtn = document.getElementById('deleteResend');
  const waitEl = document.getElementById('deleteResendWait');
  resendBtn.disabled = true;
  resendBtn.textContent = 'Resend code (30s)';
  const interval = setInterval(() => {
    wait--;
    if (wait <= 0) { clearInterval(interval); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
    else { resendBtn.textContent = 'Resend code (' + wait + 's)'; }
  }, 1000);
}

document.getElementById('deleteResend').addEventListener('click', async () => {
  const msg = document.getElementById('deleteCodeMsg');
  const resendBtn = document.getElementById('deleteResend');
  resendBtn.disabled = true;
  try {
    await postJSON('/api/resend-code', { uid: profile.uid, purpose: 'delete_account' });
    startDeleteTimer();
    startDeleteResendCooldown();
  } catch (err) {
    flashMsg(msg, err.message, false);
    resendBtn.disabled = false;
  }
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  const btn = document.getElementById('confirmDeleteBtn');
  const msg = document.getElementById('deleteCodeMsg');
  const code = deleteDigits.map(d => d.value).join('');
  if (code.length !== 6) { flashMsg(msg, 'Enter all 6 digits.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner btn-spinner-light" style="border-top-color:var(--red)"></span>Processing…';
  try {
    await postJSON('/api/confirm-account-deletion', { code });
    btn.innerHTML = '<span class="btn-spinner btn-spinner-light" style="border-top-color:var(--red)"></span>Logging out…';
    setTimeout(() => { window.location.href = '/login'; }, 900);
  } catch (err) {
    flashMsg(msg, err.message, false);
    btn.disabled = false;
    btn.textContent = 'Confirm Deletion';
  }
});

const addEmailOverlay = document.getElementById('addEmailOverlay');
const addEmailStepInput = document.getElementById('addEmailStepInput');
const addEmailStepCode = document.getElementById('addEmailStepCode');
let addEmailResendInterval = null;

function closeAddEmailOverlay(){
  addEmailOverlay.classList.remove('show');
  addEmailStepInput.classList.add('active');
  addEmailStepCode.classList.remove('active');
  document.getElementById('addEmailInput').value = '';
  addEmailDigits.forEach(d => d.value = '');
  if (addEmailResendInterval) clearInterval(addEmailResendInterval);
}
document.getElementById('addEmailCancel1').addEventListener('click', closeAddEmailOverlay);
document.getElementById('addEmailCancel2').addEventListener('click', closeAddEmailOverlay);

document.getElementById('addEmailLink').addEventListener('click', () => {
  addEmailOverlay.classList.add('show');
});

document.getElementById('addEmailSendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('addEmailSendBtn');
  const msg = document.getElementById('addEmailInputMsg');
  const email = document.getElementById('addEmailInput').value.trim();
  if (!email || !email.includes('@')) { flashMsg(msg, 'Enter a valid email address.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Sending code…';
  try {
    await postJSON('/api/account/request-email', { email });
    document.getElementById('addEmailCodeTarget').textContent = email;
    addEmailStepInput.classList.remove('active');
    addEmailStepCode.classList.add('active');
    startAddEmailResendCooldown();
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.disabled = false;
  btn.textContent = 'Send Code';
});

const addEmailDigits = Array.from(document.querySelectorAll('#addEmailStepCode .code-digit'));
addEmailDigits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < addEmailDigits.length - 1) addEmailDigits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) addEmailDigits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (addEmailDigits[idx]) addEmailDigits[idx].value = ch; });
    if (addEmailDigits[text.length - 1]) addEmailDigits[text.length - 1].focus();
  });
});

function startAddEmailResendCooldown(){
  let wait = 30;
  const resendBtn = document.getElementById('addEmailResend');
  resendBtn.disabled = true;
  resendBtn.textContent = 'Resend code (30s)';
  if (addEmailResendInterval) clearInterval(addEmailResendInterval);
  addEmailResendInterval = setInterval(() => {
    wait--;
    if (wait <= 0) { clearInterval(addEmailResendInterval); resendBtn.disabled = false; resendBtn.textContent = 'Resend code'; }
    else { resendBtn.textContent = 'Resend code (' + wait + 's)'; }
  }, 1000);
}

document.getElementById('addEmailResend').addEventListener('click', async () => {
  const msg = document.getElementById('addEmailCodeMsg');
  const email = document.getElementById('addEmailCodeTarget').textContent;
  const resendBtn = document.getElementById('addEmailResend');
  resendBtn.disabled = true;
  try {
    await postJSON('/api/account/request-email', { email });
    startAddEmailResendCooldown();
  } catch (err) {
    flashMsg(msg, err.message, false);
    resendBtn.disabled = false;
  }
});

document.getElementById('addEmailConfirmBtn').addEventListener('click', async () => {
  const btn = document.getElementById('addEmailConfirmBtn');
  const msg = document.getElementById('addEmailCodeMsg');
  const code = addEmailDigits.map(d => d.value).join('');
  if (code.length !== 6) { flashMsg(msg, 'Enter all 6 digits.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Verifying…';
  try {
    const result = await postJSON('/api/account/confirm-email', { code });
    profile.email = result.email;
    document.getElementById('emailFieldLabel').textContent = 'Email';
    const emailField = document.getElementById('emailField');
    emailField.type = 'email';
    emailField.value = result.email;
    document.getElementById('addEmailLink').style.display = 'none';
    closeAddEmailOverlay();
    flashMsg(document.getElementById('profileMsg'), 'Email added.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.disabled = false;
  btn.textContent = 'Verify & Add';
});

document.getElementById('tfaHeader').addEventListener('click', () => {
  document.getElementById('tfaCard').classList.toggle('open');
});

document.getElementById('privacyHeader').addEventListener('click', () => {
  document.getElementById('privacyCard').classList.toggle('open');
});

function visibilityLabel(v){
  return v === 'only_me' ? 'Only Me' : v === 'friends' ? 'Friends' : 'Everyone';
}

function renderPrivacyState(){
  document.getElementById('activeStatusSwitch').classList.toggle('on', profile.showActiveStatus !== false);
  document.getElementById('activeStatusSub').textContent = profile.showActiveStatus !== false ? 'On' : 'Off';

  document.getElementById('lastSeenSwitch').classList.toggle('on', profile.showLastSeen !== false);
  document.getElementById('lastSeenSub').textContent = profile.showLastSeen !== false ? 'On' : 'Off';

  document.getElementById('lockProfileSwitch').classList.toggle('on', !!profile.lockProfile);
  document.getElementById('lockProfileSub').textContent = profile.lockProfile ? 'On' : 'Off';

  document.getElementById('showPhotoSwitch').classList.toggle('on', profile.showProfilePhoto !== false);
  document.getElementById('showPhotoSub').textContent = profile.showProfilePhoto !== false ? 'On' : 'Off';

  document.getElementById('followersVisSub').textContent = visibilityLabel(profile.followersVisibility);
  document.getElementById('followingVisSub').textContent = visibilityLabel(profile.followingVisibility);
}

async function togglePrivacySwitch(switchId, subId, field){
  const sw = document.getElementById(switchId);
  const sub = document.getElementById(subId);
  const next = !sw.classList.contains('on');
  const body = {};
  body[field] = next;
  sw.classList.add('busy');
  try {
    await postJSON('/api/privacy/update', body);
    profile[field] = next;
    sw.classList.toggle('on', next);
    sub.textContent = next ? 'On' : 'Off';
    flashMsg(document.getElementById('privacyMsg'), 'Saved.', true);
  } catch (err) {
    flashMsg(document.getElementById('privacyMsg'), err.message || 'Could not update setting.', false);
  }
  sw.classList.remove('busy');
}

document.getElementById('activeStatusSwitch').addEventListener('click', () => {
  togglePrivacySwitch('activeStatusSwitch', 'activeStatusSub', 'showActiveStatus');
});
document.getElementById('lastSeenSwitch').addEventListener('click', () => {
  togglePrivacySwitch('lastSeenSwitch', 'lastSeenSub', 'showLastSeen');
});
document.getElementById('lockProfileSwitch').addEventListener('click', () => {
  togglePrivacySwitch('lockProfileSwitch', 'lockProfileSub', 'lockProfile');
});
document.getElementById('showPhotoSwitch').addEventListener('click', () => {
  togglePrivacySwitch('showPhotoSwitch', 'showPhotoSub', 'showProfilePhoto');
});

function setupVisibilityMenu(configureBtnId, menuId, subId, field){
  const menu = document.getElementById(menuId);
  document.getElementById(configureBtnId).addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll('.pv-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  });
  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.value;
      const originalText = btn.textContent;
      const allBtns = menu.querySelectorAll('button');
      allBtns.forEach(b => b.disabled = true);
      btn.innerHTML = '<span class="btn-spinner" style="margin-right:4px"></span>Saving…';
      try {
        const body = {};
        body[field] = value;
        await postJSON('/api/privacy/update', body);
        profile[field] = value;
        document.getElementById(subId).textContent = visibilityLabel(value);
        menu.style.display = 'none';
        flashMsg(document.getElementById('privacyMsg'), 'Saved.', true);
      } catch (err) {
        flashMsg(document.getElementById('privacyMsg'), err.message || 'Could not update setting.', false);
      }
      btn.textContent = originalText;
      allBtns.forEach(b => b.disabled = false);
    });
  });
}
setupVisibilityMenu('followersConfigureBtn', 'followersMenu', 'followersVisSub', 'followersVisibility');
setupVisibilityMenu('followingConfigureBtn', 'followingMenu', 'followingVisSub', 'followingVisibility');
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pv-row')) {
    document.querySelectorAll('.pv-menu').forEach(m => { m.style.display = 'none'; });
  }
});

function renderTfaState(){
  const setupPrompt = document.getElementById('tfaSetupPrompt');
  const toggleRow = document.getElementById('tfaToggleRow');
  const sw = document.getElementById('tfaSwitch');
  const sub = document.getElementById('tfaToggleSub');
  if (profile.twoFactorSetUp) {
    setupPrompt.style.display = 'none';
    toggleRow.style.display = 'flex';
    sw.classList.toggle('on', !!profile.twoFactorEnabled);
    sub.textContent = profile.twoFactorEnabled ? 'On' : 'Off';
  } else {
    setupPrompt.style.display = 'block';
    toggleRow.style.display = 'none';
  }
}

const tfaOverlay = document.getElementById('tfaOverlay');
const tfaStepScan = document.getElementById('tfaStepScan');
const tfaStepVerify = document.getElementById('tfaStepVerify');
const tfaStepDisable = document.getElementById('tfaStepDisable');

function closeTfaOverlay(){
  tfaOverlay.classList.remove('show');
  tfaStepScan.classList.remove('active');
  tfaStepVerify.classList.remove('active');
  tfaStepDisable.classList.remove('active');
  tfaStepScan.classList.add('active');
}
document.getElementById('tfaCancel1').addEventListener('click', closeTfaOverlay);
document.getElementById('tfaCancel3').addEventListener('click', closeTfaOverlay);
document.getElementById('tfaCancel2').addEventListener('click', closeTfaOverlay);

document.getElementById('tfaSetupBtn').addEventListener('click', async () => {
  const btn = document.getElementById('tfaSetupBtn');
  btn.disabled = true;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<span class="btn-spinner"></span>Preparing…';
  try {
    const { qrDataUrl, secretBase32 } = await postJSON('/api/2fa/setup');
    document.getElementById('tfaQrImg').src = qrDataUrl;
    document.getElementById('tfaSecretText').value = secretBase32;
    tfaOverlay.classList.add('show');
  } catch (err) {
    flashMsg(document.getElementById('profileMsg'), err.message, false);
  }
  btn.disabled = false;
  btn.innerHTML = originalHTML;
});

document.getElementById('tfaCopyBtn').addEventListener('click', () => {
  const input = document.getElementById('tfaSecretText');
  navigator.clipboard.writeText(input.value).catch(() => {});
});

document.getElementById('tfaScanContinueBtn').addEventListener('click', () => {
  tfaStepScan.classList.remove('active');
  tfaStepVerify.classList.add('active');
});

const tfaDigits = Array.from(document.querySelectorAll('#tfaStepVerify .code-digit'));
tfaDigits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < tfaDigits.length - 1) tfaDigits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) tfaDigits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (tfaDigits[idx]) tfaDigits[idx].value = ch; });
    if (tfaDigits[text.length - 1]) tfaDigits[text.length - 1].focus();
  });
});

document.getElementById('tfaVerifyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('tfaVerifyBtn');
  const msg = document.getElementById('tfaVerifyMsg');
  const code = tfaDigits.map(d => d.value).join('');
  if (code.length !== 6) { flashMsg(msg, 'Enter all 6 digits.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Verifying…';
  try {
    await postJSON('/api/2fa/verify-setup', { code });
    profile.twoFactorSetUp = true;
    profile.twoFactorEnabled = true;
    renderTfaState();
    closeTfaOverlay();
    flashMsg(document.getElementById('profileMsg'), 'Two-factor authentication enabled.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.disabled = false;
  btn.textContent = 'Verify & Enable';
});

document.getElementById('tfaSwitch').addEventListener('click', async () => {
  const sw = document.getElementById('tfaSwitch');
  const sub = document.getElementById('tfaToggleSub');
  const next = !profile.twoFactorEnabled;

  if (!next) {
    tfaStepScan.classList.remove('active');
    tfaStepVerify.classList.remove('active');
    tfaStepDisable.classList.add('active');
    tfaOverlay.classList.add('show');
    tfaDisableDigits.forEach(d => d.value = '');
    document.getElementById('tfaDisableMsg').textContent = '';
    tfaDisableDigits[0].focus();
    return;
  }

  sw.classList.add('busy');
  try {
    await postJSON('/api/2fa/toggle', { enabled: next });
    profile.twoFactorEnabled = next;
    sw.classList.toggle('on', next);
    sub.textContent = next ? 'On' : 'Off';
  } catch (err) {
    flashMsg(document.getElementById('profileMsg'), err.message, false);
  }
  sw.classList.remove('busy');
});

const tfaDisableDigits = Array.from(document.querySelectorAll('.tfa-disable-digit'));
tfaDisableDigits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/[^0-9]/g, '');
    if (d.value && i < tfaDisableDigits.length - 1) tfaDisableDigits[i + 1].focus();
  });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !d.value && i > 0) tfaDisableDigits[i - 1].focus();
  });
  d.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, 6);
    text.split('').forEach((ch, idx) => { if (tfaDisableDigits[idx]) tfaDisableDigits[idx].value = ch; });
    if (tfaDisableDigits[text.length - 1]) tfaDisableDigits[text.length - 1].focus();
  });
});

document.getElementById('tfaDisableBtn').addEventListener('click', async () => {
  const btn = document.getElementById('tfaDisableBtn');
  const msg = document.getElementById('tfaDisableMsg');
  const code = tfaDisableDigits.map(d => d.value).join('');
  if (code.length !== 6) { flashMsg(msg, 'Enter all 6 digits.', false); return; }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Disabling…';
  try {
    await postJSON('/api/2fa/toggle', { enabled: false, code });
    profile.twoFactorEnabled = false;
    document.getElementById('tfaSwitch').classList.toggle('on', false);
    document.getElementById('tfaToggleSub').textContent = 'Off';
    closeTfaOverlay();
    flashMsg(document.getElementById('profileMsg'), 'Two-factor authentication disabled.', true);
  } catch (err) {
    flashMsg(msg, err.message, false);
  }
  btn.disabled = false;
  btn.textContent = 'Confirm & Disable';
});

function updateVerificationUI(){
  const heroBtn = document.getElementById('getVerifiedLink');
  const fab = document.getElementById('certFab');
  heroBtn.style.display = (profile.verified || profile.isAdmin) ? 'none' : 'flex';
  fab.classList.toggle('dead', !profile.verified);
}
document.getElementById('getVerifiedLink').addEventListener('click', openVerifyOverlay);
document.getElementById('certFab').addEventListener('click', () => {
  if (profile.verified) openCertOverlay();
  else showToast('No verified certificate found');
});

function showVerifyStep(id){
  document.querySelectorAll('#verifyOverlay .overlay-step').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function openVerifyOverlay(){
  showVerifyStep('verifyStepIntro');
  const btn = document.getElementById('verifyPayBtn');
  btn.disabled = false;
  btn.textContent = 'Pay & Verify';
  document.getElementById('verifyOverlay').classList.add('show');
}
function closeVerifyOverlay(){
  document.getElementById('verifyOverlay').classList.remove('show');
}
document.getElementById('verifyCancel1').addEventListener('click', closeVerifyOverlay);
document.getElementById('verifyCancel2').addEventListener('click', closeVerifyOverlay);
document.getElementById('verifyOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'verifyOverlay') closeVerifyOverlay();
});

document.getElementById('verifyPayBtn').addEventListener('click', async () => {
  const btn = document.getElementById('verifyPayBtn');
  const msg = document.getElementById('verifyIntroMsg');
  if (!PAYSTACK_PUBLIC_KEY || typeof PaystackPop === 'undefined') {
    flashMsg(msg, 'Payments are temporarily unavailable. Please try again later.', false);
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Starting…';
  let data;
  try {
    data = await postJSON('/api/verification/initialize', {});
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Pay & Verify';
    flashMsg(msg, err.message || 'Could not start payment.', false);
    return;
  }
  btn.disabled = false;
  btn.textContent = 'Pay & Verify';
  const handler = PaystackPop.setup({
    key: data.publicKey,
    email: data.email,
    amount: data.amountKobo,
    ref: data.reference,
    currency: 'NGN',
    onClose: function(){},
    callback: function(response){
      showVerifyStep('verifyStepProcessing');
      confirmVerificationPayment(response.reference);
    },
  });
  handler.openIframe();
});

async function confirmVerificationPayment(reference){
  try {
    const result = await postJSON('/api/verification/confirm', { reference });
    profile.verified = true;
    profile.verifiedAt = profile.verifiedAt || Date.now();
    profile.verifiedExpiresAt = result.expiresAt;
    document.getElementById('heroName').innerHTML = 'Hi, ' + profile.firstName + VERIFIED_BADGE;
    updateVerificationUI();
    showVerifyStep('verifyStepSuccess');
  } catch (err) {
    showVerifyStep('verifyStepIntro');
    flashMsg(document.getElementById('verifyIntroMsg'), err.message || 'Could not confirm your payment. If you were charged, please contact support.', false);
  }
}
document.getElementById('verifyViewCertBtn').addEventListener('click', () => {
  closeVerifyOverlay();
  openCertOverlay();
});

function formatCertDate(ts){
  if (!ts) return '–';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function openCertOverlay(){
  const card = document.getElementById('certCard');
  const fullName = ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim() || ('@' + profile.username);
  const expired = !!(profile.verifiedExpiresAt && Date.now() > profile.verifiedExpiresAt);
  document.getElementById('certName').textContent = fullName;
  document.getElementById('certUsername').textContent = '@' + (profile.username || '');
  document.getElementById('certIssued').textContent = formatCertDate(profile.verifiedAt);
  document.getElementById('certExpires').textContent = formatCertDate(profile.verifiedExpiresAt);
  const chip = document.getElementById('certStatusChip');
  chip.textContent = expired ? 'EXPIRED' : 'VALID';
  chip.className = 'cert-status-chip' + (expired ? ' expired' : '');
  card.classList.toggle('expired', expired);
  document.getElementById('certOverlay').classList.add('show');
}
document.getElementById('certCloseBtn').addEventListener('click', () => {
  document.getElementById('certOverlay').classList.remove('show');
});
document.getElementById('certOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'certOverlay') document.getElementById('certOverlay').classList.remove('show');
});

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function drawCertificateCanvas(data){
  if (document.fonts && document.fonts.load) {
    await Promise.all([
      document.fonts.load('700 42px "Space Grotesk"'),
      document.fonts.load('700 46px "Dancing Script"'),
      document.fonts.load('600 18px "Inter"'),
      document.fonts.load('600 17px "JetBrains Mono"'),
    ]).catch(() => {});
  }
  const W = 1000, H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isLight = data.theme === 'light';
  const bg = isLight ? '#F5F6FA' : '#0A0A0F';
  const card = isLight ? '#FFFFFF' : '#15151F';
  const text = isLight ? '#14141C' : '#F3F3FA';
  const muted = isLight ? 'rgba(20,20,28,.55)' : 'rgba(255,255,255,.5)';
  const accent = '#00E0FF';
  const accent2 = '#7c5cff';
  const green = '#12C48B';
  const red = '#FF3B5C';
  const pad = 30;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = card;
  roundRect(ctx, pad, pad, W - pad * 2, H - pad * 2, 22);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,224,255,.25)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, pad + 16, pad + 16, W - (pad + 16) * 2, H - (pad + 16) * 2, 16);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '700 26px "Space Grotesk", sans-serif';
  const grad = ctx.createLinearGradient(pad + 50, 0, pad + 300, 0);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, accent2);
  ctx.fillStyle = grad;
  ctx.fillText('ES TEAMS TV', pad + 50, pad + 70);

  const chipText = data.expired ? 'EXPIRED' : 'VALID';
  const chipColor = data.expired ? red : green;
  ctx.font = '700 14px "Inter", sans-serif';
  const chipW = ctx.measureText(chipText).width + 36;
  const chipX = W - pad - 50 - chipW;
  const chipY = pad + 46;
  ctx.fillStyle = data.expired ? 'rgba(255,59,92,.12)' : 'rgba(18,196,139,.12)';
  roundRect(ctx, chipX, chipY - 24, chipW, 34, 17);
  ctx.fill();
  ctx.strokeStyle = chipColor;
  ctx.lineWidth = 1;
  roundRect(ctx, chipX, chipY - 24, chipW, 34, 17);
  ctx.stroke();
  ctx.fillStyle = chipColor;
  ctx.textAlign = 'center';
  ctx.fillText(chipText, chipX + chipW / 2, chipY);

  ctx.font = '700 13px "Inter", sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText('C E R T I F I C A T E   O F   V E R I F I C A T I O N', W / 2, pad + 130);

  ctx.font = '700 42px "Space Grotesk", sans-serif';
  ctx.fillStyle = text;
  ctx.fillText(data.fullName, W / 2, pad + 195);

  ctx.font = '500 18px "Inter", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText(data.username, W / 2, pad + 228);

  ctx.strokeStyle = isLight ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.13)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad + 60, pad + 270);
  ctx.lineTo(W - pad - 60, pad + 270);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '700 12px "Inter", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText('ISSUED', pad + 60, pad + 310);
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillStyle = text;
  ctx.fillText(data.issued, pad + 60, pad + 335);

  ctx.textAlign = 'right';
  ctx.font = '700 12px "Inter", sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText('EXPIRES', W - pad - 60, pad + 310);
  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillStyle = text;
  ctx.fillText(data.expires, W - pad - 60, pad + 335);

  ctx.save();
  ctx.translate(W / 2, pad + 415);
  ctx.rotate(-0.08);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.textAlign = 'center';
  ctx.font = '700 50px "Dancing Script", cursive';
  ctx.fillStyle = accent2;
  ctx.fillText('Es Teams', 0, 0);
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = accent2;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-72, 18);
  ctx.bezierCurveTo(-38, -2, -8, 30, 22, 8);
  ctx.bezierCurveTo(48, -10, 68, 4, 74, -2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.font = '700 12px "Inter", sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  ctx.fillText('AUTHORIZED SIGNATURE — ES TEAMS TV', W / 2, pad + 450);

  if (data.expired) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.25);
    ctx.strokeStyle = red;
    ctx.lineWidth = 6;
    ctx.strokeRect(-190, -46, 380, 92);
    ctx.font = '800 44px "Space Grotesk", sans-serif';
    ctx.fillStyle = red;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXPIRED', 0, 4);
    ctx.restore();
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'VERIFIED.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

document.getElementById('certDownloadBtn').addEventListener('click', async () => {
  const btn = document.getElementById('certDownloadBtn');
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span>Preparing…';
  try {
    const fullName = ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim() || ('@' + profile.username);
    const expired = !!(profile.verifiedExpiresAt && Date.now() > profile.verifiedExpiresAt);
    await drawCertificateCanvas({
      fullName,
      username: '@' + (profile.username || ''),
      issued: formatCertDate(profile.verifiedAt),
      expires: formatCertDate(profile.verifiedExpiresAt),
      expired,
      theme: document.documentElement.getAttribute('data-theme') || 'dark',
    });
  } catch (err) {
    showToast('Could not generate certificate image.');
  }
  btn.disabled = false;
  btn.innerHTML = originalHTML;
});
</script>
</body>
</html>`;
}
