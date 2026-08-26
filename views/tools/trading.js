import { siteHeadFor } from "../../config/site.js";

export function renderTrading(cfg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${cfg.devToolsBlock || ""}
<script nonce="__CSP_NONCE__">document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
${siteHeadFor("trading")}
<script nonce="__CSP_NONCE__">(function(){var m=document.getElementById("themeColorMeta");if(m)m.setAttribute("content",document.documentElement.getAttribute("data-theme")==="light"?"#F5F6FA":"#0A0A0F");})();</script>
<script nonce="__CSP_NONCE__" src="/interactive.js" defer></script>
<script nonce="__CSP_NONCE__" src="https://s3.tradingview.com/tv.js"></script>
<title>Trading - ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --red:#FF3B5C;--green:#12C48B;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark3:#13131C;--card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark3:#ECEEF3;--card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);
}
*{box-sizing:border-box}
body{margin:0;background:var(--dark);color:var(--text);font-family:var(--font-body);padding-bottom:40px}
a{color:inherit}
button{font-family:inherit}
.tr-nav{
  position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:14px 16px;
  background:rgba(10,10,15,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);
}
:root[data-theme="light"] .tr-nav{background:rgba(245,246,250,.88)}
.tr-back{background:transparent;border:none;color:var(--text);display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;flex-shrink:0}
.tr-back svg{width:20px;height:20px}
.tr-title{font-family:var(--font-display);font-weight:700;font-size:1rem}
.tr-demo-badge{display:inline-block;margin-left:8px;padding:2px 8px;border-radius:8px;background:rgba(255,196,0,.16);border:1px solid rgba(255,196,0,.4);color:#FFC400;font-size:.6rem;font-weight:800;letter-spacing:.06em;vertical-align:middle}
.tr-wallet{margin-left:auto;text-align:right}
.tr-wallet .label{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.tr-wallet .value{font-family:var(--font-mono);font-size:.86rem;font-weight:600}
.tr-wrap{max-width:640px;margin:0 auto;padding:14px 14px 0}

.tr-pair-bar{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.tr-margin-mode-btn{margin-left:auto;padding:7px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-family:var(--font-mono);font-weight:600;font-size:.76rem;flex-shrink:0}
.tr-pair-btn{
  flex:1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;
  background:var(--card);border:1px solid var(--border-strong);border-radius:14px;color:var(--text);font-family:var(--font-display);
}
.tr-pair-btn-left{display:flex;align-items:center;gap:8px}
.tr-pair-symbol{font-weight:700;font-size:1rem}
.tr-pair-price{font-family:var(--font-mono);font-size:.86rem;font-weight:600}
.tr-pair-price.up{color:var(--green)}
.tr-pair-price.down{color:var(--red)}
.tr-pair-chevron svg{width:16px;height:16px;color:var(--muted)}

.tr-chart-card{
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:6px;margin-bottom:14px;overflow:hidden;
}
#tvChartContainer{width:100%;height:420px;border-radius:10px;overflow:hidden}
.tr-chart-tools{display:flex;justify-content:space-between;gap:8px;padding:8px 4px 2px}
.tr-chart-tool-btn{
  display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--card2);border:1px solid var(--border-strong);
  border-radius:9px;color:var(--muted);font-size:.76rem;font-weight:700;font-family:var(--font-display);
}
.tr-chart-tool-btn svg{width:14px;height:14px}
.tr-chart-card.expanded{
  position:fixed;inset:0;z-index:300;border-radius:0;padding:0;margin:0;display:flex;flex-direction:column;background:var(--dark);
}
.tr-chart-card.expanded #tvChartContainer{flex:1;height:auto;border-radius:0}
.tr-chart-card.expanded .tr-chart-tools{padding:8px 10px;border-bottom:1px solid var(--border)}
.tr-chart-card:not(.expanded) .tr-contract-only{display:none}
.tr-chart-card.expanded .tr-expand-only{display:none}

.tr-tabs{display:flex;gap:6px;margin-bottom:10px;background:var(--card);border:1px solid var(--border-strong);border-radius:12px;padding:4px}
.tr-view-tabs{display:flex;gap:6px;margin:0 16px 12px;background:var(--card);border:1px solid var(--border-strong);border-radius:12px;padding:4px}
.tr-view-tab{flex:1;padding:9px;border-radius:9px;background:transparent;border:none;color:var(--muted);font-family:var(--font-display);font-weight:700;font-size:.82rem}
.tr-view-tab.active{background:linear-gradient(135deg,#22d1ee,#7c6bff);color:#04141a}
.tr-views-clip{overflow:hidden;transition:height .3s var(--ease)}
.tr-views-track{display:flex;align-items:flex-start;width:200%;transition:transform .4s cubic-bezier(.22,.61,.36,1)}
.tr-views-track.show-auto{transform:translateX(-50%)}
.tr-view-panel{width:50%;flex-shrink:0;min-width:0}
.tr-tab-btn{flex:1;padding:9px 4px;border-radius:9px;background:transparent;border:none;color:var(--muted);font-family:var(--font-display);font-weight:700;font-size:.8rem}
.tr-tab-btn.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a}
.tr-tab-panel{display:none}
.tr-tab-panel.active{display:block}

.tr-positions-section{margin-bottom:14px}
.tr-section-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:700;margin-bottom:8px;padding:0 2px}
.tr-positions-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:2px;scroll-snap-type:x proximity}
.tr-positions-row::-webkit-scrollbar{display:none}
.tr-position-card{
  scroll-snap-align:start;flex-shrink:0;width:260px;background:var(--card);border:1px solid var(--border-strong);
  border-radius:14px;padding:14px;
}
.tr-position-card.single{width:100%}
.tr-position-card.long{border-color:rgba(18,196,139,.35)}
.tr-position-card.short{border-color:rgba(255,59,92,.35)}
.tr-position-card.active{outline:2px solid var(--accent)}
.tr-pc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.tr-pc-symbol{font-family:var(--font-display);font-weight:700;font-size:.88rem}
.tr-pc-margin-mode{margin-left:7px;font-family:var(--font-body);font-weight:600;font-size:.64rem;color:var(--muted);background:var(--card2);border:1px solid var(--border-strong);border-radius:6px;padding:2px 6px;vertical-align:middle}
.tr-pc-side{font-family:var(--font-display);font-weight:800;font-size:.66rem;text-transform:uppercase;letter-spacing:.03em;padding:3px 8px;border-radius:7px}
.tr-pc-side.long{background:rgba(18,196,139,.15);color:var(--green)}
.tr-pc-side.short{background:rgba(255,59,92,.15);color:var(--red)}
.tr-pc-lev{font-size:.68rem;color:var(--muted);margin-left:6px}
.tr-pc-pnl-row{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}
.tr-pc-pnl{font-family:var(--font-mono);font-size:1.3rem;font-weight:700}
.tr-pc-pnl.pos{color:var(--green)}
.tr-pc-pnl.neg{color:var(--red)}
.tr-pc-pnl-usdt{font-family:var(--font-mono);font-size:.76rem;font-weight:600}
.tr-pc-pnl-usdt.pos{color:var(--green)}
.tr-pc-pnl-usdt.neg{color:var(--red)}
.tr-pc-tpsl{display:flex;gap:6px;margin:6px 0}
.tr-pc-tpsl span{font-size:.64rem;padding:2px 7px;border-radius:6px;background:var(--card2);color:var(--muted);font-family:var(--font-mono)}
.tr-pc-meta{display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);margin:8px 0 10px}
.tr-pc-meta b{color:var(--text);font-weight:600;font-family:var(--font-mono)}
.tr-pc-actions{display:flex;gap:6px}
.tr-pc-btn{flex:1;padding:7px 4px;border-radius:8px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-size:.7rem;font-weight:700}
.tr-pc-btn.danger{color:var(--red);border-color:rgba(255,59,92,.3)}
.tr-positions-empty{color:var(--muted);font-size:.82rem;padding:16px;background:var(--card);border:1px solid var(--border-strong);border-radius:14px;text-align:center}

.tr-list-item{background:var(--card);border:1px solid var(--border-strong);border-radius:14px;padding:13px 14px;margin-bottom:10px}
.tr-list-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.tr-list-symbol{font-family:var(--font-display);font-weight:700;font-size:.88rem}
.tr-list-meta{display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted)}
.tr-list-meta b{color:var(--text);font-family:var(--font-mono);font-weight:600}
.tr-list-pnl{font-family:var(--font-mono);font-weight:700;font-size:.94rem}
.tr-list-pnl.pos{color:var(--green)}
.tr-list-pnl.neg{color:var(--red)}
.tr-list-cancel{margin-top:10px;width:100%;padding:8px;border-radius:8px;background:var(--card2);border:1px solid rgba(255,59,92,.3);color:var(--red);font-size:.74rem;font-weight:700}
.tr-list-date{font-size:.66rem;color:var(--muted);margin-top:4px}

.tr-order-card{background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:16px;margin-bottom:14px}
.tr-auto-card{background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:16px;margin-bottom:14px}
.tr-auto-card-title{font-family:var(--font-display);font-weight:800;font-size:.94rem;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.tr-auto-admin-tag{font-size:.6rem;font-weight:800;letter-spacing:.06em;color:#FFC400;background:rgba(255,196,0,.14);border:1px solid rgba(255,196,0,.35);border-radius:6px;padding:2px 6px}
.tr-auto-help{font-size:.74rem;color:var(--muted);line-height:1.5;margin:0 0 14px}
.tr-select-native{width:100%;padding:12px;border-radius:10px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-family:var(--font-mono);font-weight:600;font-size:.86rem}
.tr-bulk-start-btn{width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#ff5c7a,#ff8a5c);border:none;color:#1a0508;font-family:var(--font-display);font-weight:800;font-size:.92rem;margin-top:6px}
.tr-bulk-result{margin-top:12px;font-size:.76rem;color:var(--muted);background:var(--card2);border-radius:10px;padding:10px;line-height:1.6;max-height:180px;overflow-y:auto}
.tr-auto-toggle-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;font-family:var(--font-display);font-weight:700;font-size:.84rem}
.tr-auto-save-btn{width:100%;padding:14px;border-radius:12px;background:linear-gradient(135deg,#22d1ee,#7c6bff);border:none;color:#04141a;font-family:var(--font-display);font-weight:800;font-size:.92rem;margin-top:4px}
.tr-auto-save-msg{margin-top:10px;font-size:.76rem;color:var(--muted)}
.tr-order-type-tabs{display:flex;gap:6px;margin-bottom:12px;background:var(--card2);border-radius:10px;padding:4px}
.tr-order-type-btn{flex:1;padding:8px;border-radius:8px;background:transparent;border:none;color:var(--muted);font-family:var(--font-display);font-weight:700;font-size:.78rem}
.tr-order-type-btn.active{background:var(--card);color:var(--text);box-shadow:0 0 0 1px var(--border-strong)}
.tr-order-row{display:flex;gap:10px;margin-bottom:12px}
.tr-order-field{flex:1}
.tr-order-field label{display:block;font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:6px}
.tr-order-field input{
  width:100%;padding:9px 10px;background:var(--card2);border:1px solid var(--border-strong);border-radius:9px;
  color:var(--text);font-family:var(--font-mono);font-size:.86rem;
}
.tr-select-btn{
  width:100%;display:flex;align-items:center;justify-content:space-between;padding:9px 10px;background:var(--card2);
  border:1px solid var(--border-strong);border-radius:9px;color:var(--text);font-family:var(--font-mono);font-size:.86rem;
}
.tr-select-btn svg{width:14px;height:14px;color:var(--muted)}
.tr-size-row{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.tr-size-row input[type=range]{flex:1;accent-color:var(--accent)}
.tr-size-pct{font-family:var(--font-mono);font-size:.8rem;color:var(--muted);width:38px;text-align:right}
.tr-size-presets{display:flex;gap:6px;margin-bottom:12px}
.tr-size-preset{flex:1;padding:5px;border-radius:7px;background:var(--card2);border:1px solid var(--border);color:var(--muted);font-size:.7rem;font-weight:700}
.tr-order-avail{font-size:.7rem;color:var(--muted);margin-bottom:12px}
.tr-side-buttons{display:flex;gap:10px}
.tr-side-btn{
  flex:1;padding:13px;border-radius:12px;border:none;font-family:var(--font-display);font-weight:800;font-size:.9rem;color:#fff;
}
.tr-side-btn.long{background:var(--green)}
.tr-side-btn.short{background:var(--red)}
.tr-order-toggle{display:flex;align-items:center;gap:8px;font-size:.78rem;color:var(--muted);margin-bottom:10px}
.tr-order-toggle input{accent-color:var(--accent)}
.tr-tpsl-preview{font-size:.68rem;color:var(--muted);margin:-6px 0 12px;line-height:1.6}
.tr-liq-preview{font-size:.68rem;color:var(--muted);margin:-2px 0 12px;line-height:1.6}
.tr-liq-preview b{color:var(--text);font-family:var(--font-mono)}
.tr-positions-head{display:flex;justify-content:flex-end;margin-bottom:8px}
.tr-close-all-btn{padding:6px 14px;border-radius:10px;background:rgba(255,59,92,.12);border:1px solid rgba(255,59,92,.35);color:var(--red);font-family:var(--font-display);font-weight:700;font-size:.78rem}
.tr-tpsl-preview b{font-family:var(--font-mono)}
.tr-tpsl-preview b.pos{color:var(--green)}
.tr-tpsl-preview b.neg{color:var(--red)}

.tr-overlay{
  position:fixed;inset:0;z-index:100;background:rgba(10,10,15,.75);backdrop-filter:blur(10px);
  display:none;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 14px;overflow-y:auto;
}
:root[data-theme="light"] .tr-overlay{background:rgba(20,20,28,.45)}
.tr-overlay.show{display:flex}
.tr-overlay.tr-overlay-center{justify-content:center}

.tr-search-panel{width:100%;max-width:420px;max-height:80vh;margin-top:36px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.tr-overlay.tr-overlay-center .tr-select-panel{margin-top:0}
.tr-search-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border)}
.tr-search-input-row input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:.92rem;font-family:var(--font-body)}
.tr-search-close{background:transparent;border:none;color:var(--muted);display:flex}
.tr-search-close svg{width:20px;height:20px}
.tr-search-list{overflow-y:auto;padding:6px}
.tr-search-group-label{font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:8px 10px 4px}
.tr-search-item{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:11px 14px;background:transparent;border:none;color:var(--text);font-family:var(--font-display);font-weight:600;font-size:.86rem;border-radius:10px;user-select:none;-webkit-user-select:none}
.tr-search-item:active{background:var(--card2)}
.tr-search-item .star{width:26px;height:26px;flex-shrink:0;color:var(--muted);display:flex;align-items:center;justify-content:center;border-radius:50%}
.tr-search-item .star svg{width:16px;height:16px}
.tr-search-item.favorited .star{color:#FFC53D}
.tr-search-item.favorited .star svg{fill:#FFC53D}

.tr-select-panel{width:100%;max-width:320px;max-height:70vh;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.tr-select-header{padding:14px;border-bottom:1px solid var(--border);font-family:var(--font-display);font-weight:700;font-size:.9rem}
.tr-select-list{overflow-y:auto;padding:6px}
.tr-select-item{width:100%;text-align:center;padding:12px;background:transparent;border:none;color:var(--text);font-family:var(--font-mono);font-weight:600;font-size:.9rem;border-radius:10px}
.tr-select-item.active{background:var(--card2);color:var(--accent)}
.tr-select-header-row{display:flex;align-items:center;justify-content:space-between}
.tr-select-close-btn{width:26px;height:26px;border-radius:50%;background:var(--card2);border:none;color:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tr-settings-back-btn{width:26px;height:26px;border-radius:50%;background:var(--card2);border:none;color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tr-settings-back-btn svg{width:15px;height:15px}
.tr-settings-nav-btn{width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 14px;margin-top:6px;border-radius:12px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-family:var(--font-display);font-weight:700;font-size:.82rem}
.tr-settings-nav-btn svg{width:17px;height:17px;color:var(--muted)}
.tr-keys-scroll{max-height:70vh;overflow-y:auto;padding-right:2px}
.tr-key-block{background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:12px;margin-bottom:10px}
.tr-key-block-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.tr-key-block-title{font-family:var(--font-display);font-weight:700;font-size:.82rem}
.tr-key-block-status{font-size:.68rem;color:var(--muted)}
.tr-key-block-status.connected{color:#12c48b}
.tr-key-block-view{display:flex;align-items:center;justify-content:space-between;font-family:var(--font-mono);font-size:.8rem;color:var(--muted)}
.tr-key-pencil{width:28px;height:28px;border-radius:8px;background:var(--card);border:1px solid var(--border-strong);color:var(--text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tr-key-pencil svg{width:14px;height:14px}
.tr-key-block-form input{width:100%;padding:11px;border-radius:9px;background:var(--card);border:1px solid var(--border-strong);color:var(--text);font-family:var(--font-mono);font-size:.82rem;margin-bottom:8px}
.tr-key-form-actions{display:flex;gap:8px}
.tr-key-cancel{flex:1;padding:10px;border-radius:9px;background:var(--card);border:1px solid var(--border-strong);color:var(--muted);font-family:var(--font-display);font-weight:700;font-size:.78rem}
.tr-key-save{flex:1;padding:10px;border-radius:9px;background:linear-gradient(135deg,#22d1ee,#7c6bff);border:none;color:#04141a;font-family:var(--font-display);font-weight:800;font-size:.78rem}
.tr-key-instructions{background:var(--card2);border:1px solid var(--border-strong);border-radius:12px;padding:14px;margin-top:4px}
.tr-key-instructions-title{font-family:var(--font-display);font-weight:700;font-size:.82rem;margin-bottom:8px}
.tr-key-instructions p{font-size:.72rem;color:var(--muted);line-height:1.6;margin:0 0 10px}
.tr-key-instructions p:last-child{margin-bottom:0}
.tr-select-close-btn svg{width:14px;height:14px}
.tr-demo-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border)}
.tr-demo-toggle-text{font-family:var(--font-display);font-weight:700;font-size:.82rem;color:var(--text)}
.tr-toggle-switch{width:42px;height:24px;border-radius:20px;background:var(--card2);border:1px solid var(--border-strong);position:relative;flex-shrink:0;transition:background .2s var(--ease)}
.tr-toggle-knob{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:var(--muted);transition:transform .2s var(--ease),background .2s var(--ease)}
.tr-toggle-switch.on{background:rgba(255,196,0,.18);border-color:rgba(255,196,0,.4)}
.tr-toggle-switch.on .tr-toggle-knob{transform:translateX(18px);background:#FFC400}

.tr-settings-fab{
  position:fixed;right:16px;bottom:22px;z-index:90;width:48px;height:48px;border-radius:50%;
  background:var(--card);border:1px solid var(--border-strong);color:var(--text);display:flex;
  align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.28);
}
.tr-settings-fab svg{width:22px;height:22px}
.tr-settings-fab.spin svg{animation:trGearSpin .5s var(--ease)}
@keyframes trGearSpin{from{transform:rotate(0)}to{transform:rotate(90deg)}}
.tr-exchange-item{
  width:100%;display:flex;align-items:center;gap:12px;padding:12px;background:transparent;border:none;
  color:var(--text);font-family:var(--font-display);font-weight:700;font-size:.88rem;border-radius:12px;text-align:left;
}
.tr-exchange-item:active{background:var(--card2)}
.tr-exchange-item.active{background:var(--card2);outline:1.5px solid var(--accent)}
.tr-exchange-icon{width:34px;height:34px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:.86rem;color:#04141a;overflow:hidden}
.tr-exchange-icon-img{width:100%;height:100%;object-fit:contain}
.tr-exchange-name{flex:1}
.tr-exchange-sub{display:block;font-family:var(--font-body);font-weight:500;font-size:.7rem;color:var(--muted);margin-top:1px}
.tr-exchange-check{width:18px;height:18px;color:var(--accent);flex-shrink:0;visibility:hidden}
.tr-exchange-item.active .tr-exchange-check{visibility:visible}

.tr-confirm-panel{width:100%;max-width:360px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:20px}
.tr-confirm-title{font-family:var(--font-display);font-weight:700;font-size:1rem;margin-bottom:14px}
.tr-confirm-row{display:flex;justify-content:space-between;font-size:.82rem;padding:7px 0;border-bottom:1px solid var(--border)}
.tr-confirm-row span:first-child{color:var(--muted)}
.tr-confirm-row span:last-child{font-family:var(--font-mono);font-weight:600}
.tr-confirm-actions{display:flex;gap:10px;margin-top:16px}
.tr-confirm-actions button{flex:1;padding:12px;border-radius:11px;font-family:var(--font-display);font-weight:700;font-size:.86rem;border:none}
.tr-confirm-cancel{background:var(--card2);color:var(--text)}
.tr-confirm-ok{color:#fff}
.tr-confirm-ok.long{background:var(--green)}
.tr-confirm-ok.short{background:var(--red)}

.tr-tpsl-panel{width:100%;max-width:360px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:20px}
.tr-tpsl-panel .tr-order-field{margin-bottom:12px}
.tr-tpsl-save{width:100%;padding:12px;border-radius:11px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;font-family:var(--font-display);font-weight:700;font-size:.86rem}

.tr-share-inner{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:380px;position:relative}
.tr-share-close{position:absolute;top:-46px;right:0;background:rgba(255,255,255,.1);border:none;color:var(--text);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.tr-share-close svg{width:18px;height:18px}
.tr-share-card{
  position:relative;width:100%;background:linear-gradient(165deg,var(--card),var(--card2));
  border:1px solid var(--border-strong);border-radius:20px;padding:28px 24px 18px;overflow:hidden;
  box-shadow:0 24px 60px rgba(0,0,0,.5);
}
.tr-share-card::before{
  content:"";position:absolute;inset:0;background:radial-gradient(circle at 18% -10%,rgba(18,196,139,.14),transparent 55%);pointer-events:none;
}
.tr-share-card.short::before{background:radial-gradient(circle at 18% -10%,rgba(255,59,92,.14),transparent 55%)}
.tr-share-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;position:relative}
.tr-share-brand{display:flex;align-items:center;gap:7px;font-family:var(--font-display);font-weight:700;font-size:.84rem;
  background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
.tr-share-brand svg{width:18px;height:18px;color:var(--accent);flex-shrink:0}
.tr-share-side-chip{font-family:var(--font-display);font-weight:800;font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;padding:5px 11px;border-radius:20px;border:1px solid transparent}
.tr-share-side-chip.long{background:rgba(18,196,139,.14);color:var(--green);border-color:rgba(18,196,139,.3)}
.tr-share-side-chip.short{background:rgba(255,59,92,.14);color:var(--red);border-color:rgba(255,59,92,.3)}
.tr-share-symbol{font-family:var(--font-display);font-weight:700;font-size:1.1rem;color:var(--text);text-align:center;margin-bottom:22px;position:relative}
.tr-share-roi-label{display:flex;align-items:center;justify-content:center;gap:8px;font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);text-align:center;margin-bottom:6px;position:relative}
.tr-usdt-toggle{width:22px;height:22px;border-radius:50%;background:var(--card2);border:1px solid var(--border-strong);color:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tr-usdt-toggle svg{width:12px;height:12px}
.tr-usdt-toggle.on{background:rgba(0,224,255,.16);color:var(--accent);border-color:rgba(0,224,255,.35)}
.tr-share-roi{font-family:var(--font-display);font-weight:800;font-size:2.7rem;text-align:center;line-height:1;margin-bottom:6px;position:relative}
.tr-share-roi.pos{color:var(--green)}
.tr-share-roi.neg{color:var(--red)}
.tr-share-usdt{text-align:center;font-family:var(--font-mono);font-size:.86rem;margin-bottom:18px;position:relative}
.tr-share-usdt.pos{color:var(--green)}
.tr-share-usdt.neg{color:var(--red)}
.tr-share-divider{height:1px;background:var(--border-strong);margin-bottom:16px;position:relative}
.tr-share-meta-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;position:relative}
.tr-share-meta-label{display:block;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.tr-share-meta-val{display:block;font-family:var(--font-mono);font-size:.82rem;color:var(--text)}
.tr-share-meta-row div:last-child{text-align:right}
.tr-share-meta-ts{text-align:center;font-size:.6rem;color:var(--muted);opacity:.65;font-family:var(--font-mono)}
.tr-share-footer{text-align:center;position:relative}
.tr-share-footer-brand{font-family:var(--font-display);font-weight:800;font-size:.88rem;color:var(--text)}
.tr-share-footer-url{font-size:.66rem;color:var(--muted);margin-top:2px}
.tr-share-demo-stamp{
  position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);
  font-family:var(--font-display);font-weight:800;font-size:2.6rem;letter-spacing:.14em;
  color:rgba(255,196,0,.16);border:5px solid rgba(255,196,0,.16);border-radius:14px;
  padding:6px 22px;pointer-events:none;z-index:1;white-space:nowrap;
}
.tr-share-save-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:12px;color:#04141a;
  font-family:var(--font-display);font-weight:700;font-size:.86rem;transition:transform .15s var(--ease),background .2s var(--ease);
}
.tr-share-save-btn:active{transform:scale(.97)}
.tr-share-save-btn:disabled{opacity:.7}
.tr-share-save-btn svg{width:16px;height:16px;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.tr-share-save-btn.saved{background:linear-gradient(135deg,var(--green),#0a9d6f)}
.tr-share-save-btn.saved svg{transform:scale(1.25) rotate(-4deg)}
@keyframes trSpin{to{transform:rotate(360deg)}}
.tr-btn-spinner{width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;border-radius:50%;display:inline-block;animation:trSpin .6s linear infinite}
.tr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--card2);border:1px solid var(--border-strong);color:var(--text);padding:11px 18px;border-radius:11px;font-size:.82rem;font-weight:600;opacity:0;transition:opacity .25s var(--ease),transform .25s var(--ease);z-index:400;pointer-events:none}
.tr-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.tr-share-canvas-wrap{display:none}
</style>
</head>
<body>

<div class="tr-nav">
  <button type="button" class="tr-back" id="trBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
  </button>
  <div class="tr-title">Trading<span class="tr-demo-badge" id="trDemoBadge" style="display:none">DEMO</span></div>
  <div class="tr-wallet">
    <div class="label">Equity</div>
    <div class="value" id="trEquity">--</div>
  </div>
</div>

<div class="tr-view-tabs">
  <button type="button" class="tr-view-tab active" id="trViewTabManual">Manual</button>
  <button type="button" class="tr-view-tab" id="trViewTabAuto">Auto Trading</button>
</div>

<div class="tr-views-clip" id="trViewsClip">
<div class="tr-views-track" id="trViewsTrack">
<div class="tr-view-panel" id="trViewManual">

<div class="tr-wrap">
  <div class="tr-pair-bar">
    <button type="button" class="tr-pair-btn" id="trPairBtn">
      <div class="tr-pair-btn-left">
        <span class="tr-pair-symbol" id="trPairSymbol">BTCUSDT</span>
        <span class="tr-pair-price" id="trPairPrice">--</span>
      </div>
      <span class="tr-pair-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg></span>
    </button>
    <button type="button" class="tr-margin-mode-btn" id="trMarginModeBtn">Isolated</button>
  </div>

  <div class="tr-chart-card" id="trChartCard">
    <div id="tvChartContainer"></div>
    <div class="tr-chart-tools">
      <button type="button" class="tr-chart-tool-btn tr-expand-only" id="trExpandBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m11-5v3a2 2 0 01-2 2h-3"/></svg>
        Expand
      </button>
      <button type="button" class="tr-chart-tool-btn tr-contract-only" id="trContractBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 3v4a1 1 0 01-1 1H4M20 8h-4a1 1 0 01-1-1V3M4 15h4a1 1 0 011 1v4M15 20v-4a1 1 0 011-1h4"/></svg>
        Contract
      </button>
      <button type="button" class="tr-chart-tool-btn" id="trChartShareBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14"/></svg>
        Share Chart
      </button>
    </div>
  </div>

  <div class="tr-tabs">
    <button type="button" class="tr-tab-btn active" data-tab="positions">Positions</button>
    <button type="button" class="tr-tab-btn" data-tab="orders">Orders</button>
    <button type="button" class="tr-tab-btn" data-tab="history">History</button>
  </div>

  <div class="tr-tab-panel active" id="trTabPositions">
    <div class="tr-positions-head" id="trPositionsHead" style="display:none">
      <button type="button" class="tr-close-all-btn" id="trCloseAllBtn">Close All</button>
    </div>
    <div class="tr-positions-row" id="trPositionsRow">
      <div class="tr-positions-empty" id="trPositionsEmpty">No open positions.</div>
    </div>
  </div>

  <div class="tr-tab-panel" id="trTabOrders">
    <div id="trOrdersList"><div class="tr-positions-empty">No pending orders.</div></div>
  </div>

  <div class="tr-tab-panel" id="trTabHistory">
    <div id="trHistoryList"><div class="tr-positions-empty">No closed trades yet.</div></div>
  </div>

  <div class="tr-order-card">
    <div class="tr-order-type-tabs">
      <button type="button" class="tr-order-type-btn active" data-order-type="Market">Market</button>
      <button type="button" class="tr-order-type-btn" data-order-type="Limit">Limit</button>
    </div>
    <div class="tr-order-row" id="trLimitPriceRow" style="display:none">
      <div class="tr-order-field"><label>Limit Price</label><input type="number" id="trLimitPriceInput" step="any" placeholder="0.00"></div>
    </div>
    <div class="tr-order-row">
      <div class="tr-order-field">
        <label>Leverage</label>
        <button type="button" class="tr-select-btn" id="trLeverageBtn">
          <span id="trLeverageValue">--</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="tr-order-field">
        <label>Quantity</label>
        <input type="number" id="trQtyInput" step="any" placeholder="0.00">
      </div>
    </div>
    <div class="tr-size-row">
      <input type="range" id="trSizeSlider" min="0" max="100" value="0">
      <span class="tr-size-pct" id="trSizePct">0%</span>
    </div>
    <div class="tr-size-presets">
      <button type="button" class="tr-size-preset" data-pct="25">25%</button>
      <button type="button" class="tr-size-preset" data-pct="50">50%</button>
      <button type="button" class="tr-size-preset" data-pct="75">75%</button>
      <button type="button" class="tr-size-preset" data-pct="100">100%</button>
    </div>
    <div class="tr-order-avail">Available: <span id="trAvailable">--</span> USDT · Est. margin: <span id="trEstMargin">--</span> USDT</div>
    <div class="tr-liq-preview" id="trLiqPreview" style="display:none"></div>
    <label class="tr-order-toggle"><input type="checkbox" id="trTpslToggle"> Set TP / SL with entry</label>
    <div class="tr-order-row" id="trTpslRow" style="display:none">
      <div class="tr-order-field"><label>Take Profit</label><input type="number" id="trTpInput" step="any" placeholder="Optional"></div>
      <div class="tr-order-field"><label>Stop Loss</label><input type="number" id="trSlInput" step="any" placeholder="Optional"></div>
    </div>
    <div class="tr-tpsl-preview" id="trTpslPreview" style="display:none"></div>
    <div class="tr-side-buttons">
      <button type="button" class="tr-side-btn long" id="trLongBtn">Long</button>
      <button type="button" class="tr-side-btn short" id="trShortBtn">Short</button>
    </div>
  </div>
</div>

</div>
<div class="tr-view-panel" id="trViewAuto">

<div class="tr-wrap">
  <div class="tr-auto-card">
    <div class="tr-auto-card-title">Bulk Operation <span class="tr-auto-admin-tag">Admin</span></div>
    <p class="tr-auto-help">Opens a position for every user who has enabled Auto Trading and saved their own API keys, sized by each user's own USDT-per-trade setting.</p>
    <div class="tr-order-field"><label>Pair</label><input type="text" id="trBulkSymbol" placeholder="e.g. BTCUSDT" autocomplete="off"></div>
    <div class="tr-order-row">
      <div class="tr-order-field"><label>Leverage</label><input type="number" id="trBulkLeverage" min="1" max="125" value="10"></div>
      <div class="tr-order-field">
        <label>Position</label>
        <select id="trBulkSide" class="tr-select-native"><option value="Buy">Long</option><option value="Sell">Short</option></select>
      </div>
    </div>
    <button type="button" class="tr-bulk-start-btn" id="trBulkStartBtn">Bulk Start</button>
    <div class="tr-bulk-result" id="trBulkResult" style="display:none"></div>
  </div>

  <div class="tr-auto-card">
    <div class="tr-auto-card-title">Your Auto Trading Settings</div>
    <div class="tr-auto-toggle-row">
      <div>Enable Auto Trading<span class="tr-exchange-sub">Let bulk operations trade on your account</span></div>
      <button type="button" class="tr-toggle-switch" id="trAutoEnableToggle" aria-label="Toggle auto trading"><span class="tr-toggle-knob"></span></button>
    </div>
    <div class="tr-order-row">
      <div class="tr-order-field">
        <label>Exchange</label>
        <select id="trAutoExchange" class="tr-select-native"><option value="bybit">Bybit</option><option value="weex">WEEX</option></select>
      </div>
      <div class="tr-order-field">
        <label>Mode</label>
        <select id="trAutoMode" class="tr-select-native"><option value="demo">Demo</option><option value="live">Live</option></select>
      </div>
    </div>
    <div class="tr-order-field"><label>USDT per Trade (3 to 1000)</label><input type="number" id="trAutoUsdt" min="3" max="1000" value="10"></div>
    <button type="button" class="tr-auto-save-btn" id="trAutoSaveBtn">Save Settings</button>
    <div class="tr-auto-save-msg" id="trAutoSaveMsg" style="display:none"></div>
  </div>
</div>

</div>
</div>
</div>

<div class="tr-overlay" id="trSearchOverlay">
  <div class="tr-search-panel">
    <div class="tr-search-input-row">
      <input type="text" id="trSearchInput" placeholder="Search pair, e.g. ETH" autocomplete="off">
      <button type="button" class="tr-search-close" id="trSearchCloseBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="tr-search-list" id="trSearchList"></div>
  </div>
</div>

<div class="tr-overlay tr-overlay-center" id="trLeverageOverlay">
  <div class="tr-select-panel">
    <div class="tr-select-header">Select Leverage</div>
    <div class="tr-select-list" id="trLeverageList"></div>
  </div>
</div>

<div class="tr-overlay tr-overlay-center" id="trMarginModeOverlay">
  <div class="tr-select-panel">
    <div class="tr-select-header">Margin Mode</div>
    <div class="tr-select-list">
      <button type="button" class="tr-select-item" data-mode="isolated">Isolated</button>
      <button type="button" class="tr-select-item" data-mode="cross">Cross</button>
    </div>
  </div>
</div>

<div class="tr-overlay tr-overlay-center" id="trConfirmOverlay">
  <div class="tr-confirm-panel">
    <div class="tr-confirm-title" id="trConfirmTitle">Confirm Order</div>
    <div id="trConfirmBody"></div>
    <div class="tr-confirm-actions">
      <button type="button" class="tr-confirm-cancel" id="trConfirmCancelBtn">Cancel</button>
      <button type="button" class="tr-confirm-ok" id="trConfirmOkBtn">Confirm</button>
    </div>
  </div>
</div>

<div class="tr-overlay tr-overlay-center" id="trTpslOverlay">
  <div class="tr-tpsl-panel">
    <div class="tr-confirm-title" id="trTpslTitle">Edit TP / SL</div>
    <div class="tr-order-field"><label>Take Profit</label><input type="number" id="trEditTpInput" step="any" placeholder="Optional"></div>
    <div class="tr-order-field"><label>Stop Loss</label><input type="number" id="trEditSlInput" step="any" placeholder="Optional"></div>
    <div class="tr-tpsl-preview" id="trEditTpslPreview"></div>
    <div class="tr-confirm-actions">
      <button type="button" class="tr-confirm-cancel" id="trTpslCancelBtn">Cancel</button>
      <button type="button" class="tr-tpsl-save" id="trTpslSaveBtn" style="flex:1">Save</button>
    </div>
  </div>
</div>

<div class="tr-overlay tr-overlay-center" id="trShareOverlay">
  <div class="tr-share-inner">
    <button type="button" class="tr-share-close" id="trShareCloseBtn" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
    <div class="tr-share-card" id="trShareCard">
      <div class="tr-share-top">
        <div class="tr-share-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          ES TEAMS TV
        </div>
        <span class="tr-share-side-chip" id="trShareSideChip">LONG · 1x</span>
      </div>
      <div class="tr-share-symbol" id="trShareSymbol">BTCUSDT</div>
      <div class="tr-share-roi-label">
        ROI
        <button type="button" class="tr-usdt-toggle" id="trUsdtToggle" aria-label="Show USDT amount">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M6.5 6.7C4.5 8 3 10 3 10s3.5 6 9 6c1.5 0 2.8-.4 4-1.1M17.5 17.3C19.5 16 21 14 21 14s-1-1.8-2.7-3.4"/></svg>
        </button>
      </div>
      <div class="tr-share-roi" id="trShareRoi">+0.00%</div>
      <div class="tr-share-usdt" id="trShareUsdt" style="display:none">+0.00 USDT</div>
      <div class="tr-share-divider"></div>
      <div class="tr-share-meta-row">
        <div><span class="tr-share-meta-label">Entry</span><span class="tr-share-meta-val" id="trShareEntry">-</span></div>
        <div class="tr-share-meta-ts" id="trShareTimestamp">-</div>
        <div><span class="tr-share-meta-label" id="trShareMarkLabel">Mark</span><span class="tr-share-meta-val" id="trShareMark">-</span></div>
      </div>
      <div class="tr-share-demo-stamp" id="trShareDemoStamp" style="display:none">DEMO</div>
      <div class="tr-share-footer">
        <div class="tr-share-footer-brand">ES TEAMS TV</div>
        <div class="tr-share-footer-url">esteamstv.devs.surf</div>
      </div>
    </div>
    <button type="button" class="tr-share-save-btn" id="trShareSaveBtn">
      <svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>
      <span id="trShareSaveLabel">Save Image</span>
    </button>
  </div>
</div>

<button type="button" class="tr-settings-fab" id="trSettingsFab" aria-label="Exchange settings">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
</button>

<div class="tr-overlay tr-overlay-center" id="trExchangeOverlay">
  <div class="tr-select-panel">

    <div class="tr-settings-page" id="trSettingsPageExchange">
      <div class="tr-select-header tr-select-header-row">
        <span>Trading Exchange</span>
        <button type="button" class="tr-select-close-btn" id="trExchangeCloseBtn" aria-label="Cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="tr-demo-toggle-row">
        <div class="tr-demo-toggle-text">Demo Trading<span class="tr-exchange-sub">Practice with virtual funds</span></div>
        <button type="button" class="tr-toggle-switch" id="trDemoToggle" aria-label="Toggle demo trading"><span class="tr-toggle-knob"></span></button>
      </div>
      <div class="tr-select-list">
        <button type="button" class="tr-exchange-item" id="trExchangeBybit" data-exchange="bybit">
          <span class="tr-exchange-icon" style="background:#000000">
            <img src="/bybit-logo.png" alt="Bybit" class="tr-exchange-icon-img">
          </span>
          <span class="tr-exchange-name">Continue with Bybit<span class="tr-exchange-sub">USDT perpetual futures</span></span>
          <svg class="tr-exchange-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
        </button>
        <button type="button" class="tr-exchange-item" id="trExchangeWeex" data-exchange="weex">
          <span class="tr-exchange-icon" style="background:#CEAF21">
            <img src="/weex-logo.png" alt="WEEX" class="tr-exchange-icon-img">
          </span>
          <span class="tr-exchange-name">Continue with WEEX<span class="tr-exchange-sub">USDT perpetual futures</span></span>
          <svg class="tr-exchange-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>
        </button>
      </div>
      <button type="button" class="tr-settings-nav-btn" id="trGoApiKeysBtn">
        <span>AI Trading &middot; API Keys</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>

    <div class="tr-settings-page" id="trSettingsPageKeys" style="display:none">
      <div class="tr-select-header tr-select-header-row">
        <button type="button" class="tr-settings-back-btn" id="trKeysBackBtn" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span>AI Trading</span>
        <button type="button" class="tr-select-close-btn" id="trKeysCloseBtn" aria-label="Cancel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="tr-keys-scroll" id="trKeysScroll">

        <div class="tr-key-block" data-exchange="bybit" data-mode="live">
          <div class="tr-key-block-head">
            <span class="tr-key-block-title">Bybit &middot; Live</span>
            <span class="tr-key-block-status" data-status>Not connected</span>
          </div>
          <div class="tr-key-block-view" data-view>
            <span data-masked>--</span>
            <button type="button" class="tr-key-pencil" data-pencil aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
          <div class="tr-key-block-form" data-form style="display:none">
            <input type="text" placeholder="API Key" data-field="apiKey" autocomplete="off">
            <input type="password" placeholder="API Secret" data-field="apiSecret" autocomplete="off">
            <div class="tr-key-form-actions">
              <button type="button" class="tr-key-cancel" data-cancel>Cancel</button>
              <button type="button" class="tr-key-save" data-save>Save</button>
            </div>
          </div>
        </div>

        <div class="tr-key-block" data-exchange="bybit" data-mode="demo">
          <div class="tr-key-block-head">
            <span class="tr-key-block-title">Bybit &middot; Demo</span>
            <span class="tr-key-block-status" data-status>Not connected</span>
          </div>
          <div class="tr-key-block-view" data-view>
            <span data-masked>--</span>
            <button type="button" class="tr-key-pencil" data-pencil aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
          <div class="tr-key-block-form" data-form style="display:none">
            <input type="text" placeholder="API Key" data-field="apiKey" autocomplete="off">
            <input type="password" placeholder="API Secret" data-field="apiSecret" autocomplete="off">
            <div class="tr-key-form-actions">
              <button type="button" class="tr-key-cancel" data-cancel>Cancel</button>
              <button type="button" class="tr-key-save" data-save>Save</button>
            </div>
          </div>
        </div>

        <div class="tr-key-block" data-exchange="weex" data-mode="live">
          <div class="tr-key-block-head">
            <span class="tr-key-block-title">WEEX &middot; Live</span>
            <span class="tr-key-block-status" data-status>Not connected</span>
          </div>
          <div class="tr-key-block-view" data-view>
            <span data-masked>--</span>
            <button type="button" class="tr-key-pencil" data-pencil aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
          <div class="tr-key-block-form" data-form style="display:none">
            <input type="text" placeholder="API Key" data-field="apiKey" autocomplete="off">
            <input type="password" placeholder="API Secret" data-field="apiSecret" autocomplete="off">
            <input type="password" placeholder="API Passphrase" data-field="passphrase" autocomplete="off">
            <div class="tr-key-form-actions">
              <button type="button" class="tr-key-cancel" data-cancel>Cancel</button>
              <button type="button" class="tr-key-save" data-save>Save</button>
            </div>
          </div>
        </div>

        <div class="tr-key-block" data-exchange="weex" data-mode="demo">
          <div class="tr-key-block-head">
            <span class="tr-key-block-title">WEEX &middot; Demo</span>
            <span class="tr-key-block-status" data-status>Not connected</span>
          </div>
          <div class="tr-key-block-view" data-view>
            <span data-masked>--</span>
            <button type="button" class="tr-key-pencil" data-pencil aria-label="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
          </div>
          <div class="tr-key-block-form" data-form style="display:none">
            <input type="text" placeholder="API Key" data-field="apiKey" autocomplete="off">
            <input type="password" placeholder="API Secret" data-field="apiSecret" autocomplete="off">
            <input type="password" placeholder="API Passphrase" data-field="passphrase" autocomplete="off">
            <div class="tr-key-form-actions">
              <button type="button" class="tr-key-cancel" data-cancel>Cancel</button>
              <button type="button" class="tr-key-save" data-save>Save</button>
            </div>
          </div>
        </div>

        <div class="tr-key-instructions">
          <div class="tr-key-instructions-title">How to get your API keys</div>
          <p><b>Bybit:</b> there is no one-click connect, since Bybit only issues keys through a formal Broker/OAuth partner program, which this app isn't registered for. Log in to Bybit, then Profile icon, then API, then Create New Key, then System-generated, then enable "Contract: Orders &amp; Positions" only (leave withdrawal off), then copy the Key and Secret. For demo keys, switch to Bybit's "Demo Trading" mode first (top nav), then repeat the same steps; demo keys are separate from live keys.</p>
          <p><b>WEEX:</b> log in, then Account, then API Management, then Create API Key, then enable trading permission only (leave withdrawal off), then copy the Key, Secret, and Passphrase (WEEX requires all three). Demo/simulated keys are generated from WEEX's own demo trading section the same way.</p>
          <p>For your safety, only ever enable trading permissions on these keys, never withdrawal.</p>
        </div>

      </div>
    </div>

  </div>
</div>

<div class="tr-share-canvas-wrap"><canvas id="trShareCanvas" width="680" height="600"></canvas></div>
<div class="tr-toast" id="trToast"></div>


<script nonce="__CSP_NONCE__">
(function(){
  var CATEGORY = 'linear';
  var symbol = 'BTCUSDT';
  var allSymbols = [];
  var instrumentInfo = null;
  var tvWidget = null;
  var positionsTimer = null;
  var dataGen = 0;
  var positions = [];
  var lastPrice = null;
  var firstPrice = null;
  var shareUsdt = false;
  var orderType = 'Market';
  var activeTab = 'positions';
  var FAVORITES_KEY = 'trFavoritePairs';
  var LAST_SYMBOL_KEY = 'trLastSymbol';
  var EXCHANGE_KEY = 'trExchange';
  var EXCHANGE = localStorage.getItem(EXCHANGE_KEY) === 'weex' ? 'weex' : 'bybit';
  var DEMO_KEY = 'trDemoMode';
  var DEMO_MODE = localStorage.getItem(DEMO_KEY) === '1';
  var MARGIN_MODE_KEY = 'trMarginMode';
  var MARGIN_MODE = localStorage.getItem(MARGIN_MODE_KEY) === 'cross' ? 'cross' : 'isolated';

  var saved = localStorage.getItem(LAST_SYMBOL_KEY);
  if (saved) symbol = saved;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function toast(msg){
    var el = document.getElementById('trToast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function(){ el.classList.remove('show'); }, 2400);
  }

  async function getJSON(url){
    var sep = url.indexOf('?') === -1 ? '?' : '&';
    var res = await fetch(url + sep + 'exchange=' + EXCHANGE + '&demo=' + (DEMO_MODE ? '1' : '0'));
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  async function postJSON(url, body){
    var payload = Object.assign({ exchange: EXCHANGE, demo: DEMO_MODE }, body || {});
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function getFavorites(){
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch (e) { return []; }
  }
  function setFavorites(list){
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  }
  function toggleFavorite(sym){
    var list = getFavorites();
    var idx = list.indexOf(sym);
    if (idx === -1) { list.push(sym); toast(sym + ' added to favorites'); }
    else { list.splice(idx, 1); toast(sym + ' removed from favorites'); }
    setFavorites(list);
    return list;
  }

  document.getElementById('trBackBtn').addEventListener('click', function(){
    if (window.history.length > 1) window.history.back();
    else location.href = '/tools';
  });

  function formatPrice(p){
    if (p == null) return '--';
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  }

  document.querySelectorAll('.tr-tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      activeTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.tr-tab-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
      document.getElementById('trTabPositions').classList.toggle('active', activeTab === 'positions');
      document.getElementById('trTabOrders').classList.toggle('active', activeTab === 'orders');
      document.getElementById('trTabHistory').classList.toggle('active', activeTab === 'history');
      if (activeTab === 'orders') pollOrders();
      if (activeTab === 'history') pollHistory();
    });
  });

  function initChart(){
    var container = document.getElementById('tvChartContainer');
    container.innerHTML = '';
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    tvWidget = new TradingView.widget({
      autosize: true,
      symbol: (EXCHANGE === 'weex' ? 'WEEX:' : 'BYBIT:') + symbol + '.P',
      interval: '15',
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1',
      locale: 'en',
      toolbar_bg: theme === 'light' ? '#FFFFFF' : '#15151F',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      container_id: 'tvChartContainer',
    });
  }

  document.getElementById('trExpandBtn').addEventListener('click', async function(){
    var card = document.getElementById('trChartCard');
    card.classList.add('expanded');
    try { await card.requestFullscreen(); } catch (e) {}
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) {}
    setTimeout(initChart, 200);
  });
  document.getElementById('trContractBtn').addEventListener('click', async function(){
    var card = document.getElementById('trChartCard');
    card.classList.remove('expanded');
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    setTimeout(initChart, 200);
  });
  document.addEventListener('fullscreenchange', function(){
    if (!document.fullscreenElement) {
      document.getElementById('trChartCard').classList.remove('expanded');
      setTimeout(initChart, 200);
    }
  });

  async function loadTicker(){
    var gen = dataGen;
    try {
      var data = await getJSON('/api/tools/trading/klines?category=' + CATEGORY + '&symbol=' + symbol + '&interval=15');
      if (gen !== dataGen) return;
      var list = (data.list || []);
      if (list.length) {
        var latest = list[0];
        var oldest = list[list.length - 1];
        updatePairPrice(Number(latest[4]), Number(oldest[1]));
      }
    } catch (err) {}
  }

  function updatePairPrice(price, openRef){
    lastPrice = price;
    if (openRef != null) firstPrice = openRef;
    var priceEl = document.getElementById('trPairPrice');
    priceEl.textContent = formatPrice(price);
    if (firstPrice != null) {
      priceEl.classList.toggle('up', price >= firstPrice);
      priceEl.classList.toggle('down', price < firstPrice);
    }
    updateTpslPreview();
  }

  function positionRoi(pos){
    var margin = pos.margin || (pos.positionValue && pos.leverage ? pos.positionValue / pos.leverage : 0);
    return margin ? (pos.unrealizedPnl / margin) * 100 : 0;
  }

  function renderPositions(){
    var row = document.getElementById('trPositionsRow');
    document.getElementById('trPositionsHead').style.display = positions.length > 1 ? 'flex' : 'none';
    if (!positions.length) {
      row.innerHTML = '<div class="tr-positions-empty" id="trPositionsEmpty">No open positions.</div>';
      return;
    }
    row.innerHTML = positions.map(function(pos){
      var sideLower = pos.side === 'Buy' ? 'long' : 'short';
      var sideLabel = sideLower === 'long' ? 'Long' : 'Short';
      var pct = positionRoi(pos);
      var pnlSign = pct >= 0 ? 'pos' : 'neg';
      var isActive = pos.symbol === symbol;
      var tpslBadges = '';
      if (pos.takeProfit || pos.stopLoss) {
        tpslBadges = '<div class="tr-pc-tpsl">' +
          (pos.takeProfit ? '<span>TP ' + formatPrice(pos.takeProfit) + '</span>' : '') +
          (pos.stopLoss ? '<span>SL ' + formatPrice(pos.stopLoss) + '</span>' : '') +
        '</div>';
      }
      return '<div class="tr-position-card ' + sideLower + (isActive ? ' active' : '') + (positions.length === 1 ? ' single' : '') + '" data-symbol="' + esc(pos.symbol) + '">' +
        '<div class="tr-pc-head">' +
          '<span class="tr-pc-symbol">' + esc(pos.symbol) + '<span class="tr-pc-margin-mode">' + (pos.marginMode === 'cross' ? 'Cross' : 'Isolated') + '</span></span>' +
          '<span><span class="tr-pc-side ' + sideLower + '">' + sideLabel + '</span><span class="tr-pc-lev">' + pos.leverage + 'x</span></span>' +
        '</div>' +
        '<div class="tr-pc-pnl-row">' +
          '<span class="tr-pc-pnl ' + pnlSign + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</span>' +
          '<span class="tr-pc-pnl-usdt ' + pnlSign + '">' + (pos.unrealizedPnl >= 0 ? '+' : '') + pos.unrealizedPnl.toFixed(2) + ' USDT</span>' +
        '</div>' +
        tpslBadges +
        '<div class="tr-pc-meta"><span>Entry <b>' + formatPrice(pos.entryPrice) + '</b></span><span>Liq <b>' + (pos.liqPrice ? formatPrice(pos.liqPrice) : '--') + '</b></span><span>Mark <b>' + formatPrice(pos.markPrice) + '</b></span></div>' +
        '<div class="tr-pc-actions">' +
          '<button type="button" class="tr-pc-btn" data-action="tpsl" data-symbol="' + esc(pos.symbol) + '">TP/SL</button>' +
          '<button type="button" class="tr-pc-btn" data-action="share" data-symbol="' + esc(pos.symbol) + '">Share</button>' +
          '<button type="button" class="tr-pc-btn danger" data-action="close" data-symbol="' + esc(pos.symbol) + '">Close</button>' +
        '</div>' +
      '</div>';
    }).join('');

    row.querySelectorAll('.tr-position-card').forEach(function(card){
      card.addEventListener('click', function(e){
        if (e.target.closest('[data-action]')) return;
        switchSymbol(card.getAttribute('data-symbol'));
      });
    });
    row.querySelectorAll('[data-action="tpsl"]').forEach(function(btn){
      btn.addEventListener('click', function(){ openTpslEditor(btn.getAttribute('data-symbol')); });
    });
    row.querySelectorAll('[data-action="share"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pos = positions.find(function(p){ return p.symbol === btn.getAttribute('data-symbol'); });
        if (pos) openShareOverlay(pos);
      });
    });
    row.querySelectorAll('[data-action="close"]').forEach(function(btn){
      btn.addEventListener('click', function(){ confirmClosePosition(btn.getAttribute('data-symbol')); });
    });
  }

  async function pollPositions(){
    var gen = dataGen;
    try {
      var data = await getJSON('/api/tools/trading/positions?category=' + CATEGORY);
      if (gen !== dataGen) return;
      positions = data.positions || [];
      renderPositions();
      var equityEl = document.getElementById('trEquity');
      var availEl = document.getElementById('trAvailable');
      equityEl.textContent = data.equity != null ? '$' + data.equity.toFixed(2) : '--';
      availEl.textContent = data.available != null ? data.available.toFixed(2) : '--';
      updateEstMargin();
    } catch (err) {
      if (gen !== dataGen) return;
      document.getElementById('trEquity').textContent = '--';
      document.getElementById('trAvailable').textContent = '--';
      positions = [];
      renderPositions();
      console.error(err);
    }
  }

  function startPositionsPolling(){
    if (positionsTimer) clearInterval(positionsTimer);
    pollPositions();
    positionsTimer = setInterval(pollPositions, 3000);
  }

  function fmtDate(ts){
    var d = new Date(ts);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear() + ' ' + hh + ':' + min;
  }

  async function pollOrders(){
    var gen = dataGen;
    try {
      var data = await getJSON('/api/tools/trading/orders?category=' + CATEGORY);
      if (gen !== dataGen) return;
      var orders = data.orders || [];
      var list = document.getElementById('trOrdersList');
      if (!orders.length) { list.innerHTML = '<div class="tr-positions-empty">No pending orders.</div>'; return; }
      list.innerHTML = orders.map(function(o){
        return '<div class="tr-list-item">' +
          '<div class="tr-list-head"><span class="tr-list-symbol">' + esc(o.symbol) + '</span><span>' + esc(o.side === 'Buy' ? 'Buy' : 'Sell') + ' \\u00b7 ' + esc(o.orderType) + '</span></div>' +
          '<div class="tr-list-meta"><span>Qty <b>' + esc(o.qty) + '</b></span><span>Price <b>' + esc((Number(o.price) > 0 ? o.price : null) || (Number(o.triggerPrice) > 0 ? o.triggerPrice : null) || 'Market') + '</b></span></div>' +
          '<div class="tr-list-date">' + fmtDate(o.createdTime) + '</div>' +
          '<button type="button" class="tr-list-cancel" data-order-id="' + esc(o.orderId) + '" data-symbol="' + esc(o.symbol) + '">Cancel Order</button>' +
        '</div>';
      }).join('');
      list.querySelectorAll('.tr-list-cancel').forEach(function(btn){
        btn.addEventListener('click', async function(){
          btn.disabled = true;
          try {
            await postJSON('/api/tools/trading/orders/cancel', { category: CATEGORY, symbol: btn.getAttribute('data-symbol'), orderId: btn.getAttribute('data-order-id') });
            toast('Order cancelled.');
            pollOrders();
          } catch (err) {
            toast(err.message || 'Could not cancel order.');
            btn.disabled = false;
          }
        });
      });
    } catch (err) {
      if (gen !== dataGen) return;
      document.getElementById('trOrdersList').innerHTML = '<div class="tr-positions-empty">' + esc(err.message || 'Could not load orders.') + '</div>';
    }
  }

  async function pollHistory(){
    var gen = dataGen;
    try {
      var data = await getJSON('/api/tools/trading/closed-pnl?category=' + CATEGORY);
      if (gen !== dataGen) return;
      var trades = data.trades || [];
      var list = document.getElementById('trHistoryList');
      if (!trades.length) { list.innerHTML = '<div class="tr-positions-empty">No closed trades yet.</div>'; return; }
      list.innerHTML = trades.map(function(t, i){
        var pnlSign = t.closedPnl >= 0 ? 'pos' : 'neg';
        return '<div class="tr-list-item" style="cursor:pointer" data-trade-index="' + i + '">' +
          '<div class="tr-list-head"><span class="tr-list-symbol">' + esc(t.symbol) + '</span><span class="tr-list-pnl ' + pnlSign + '">' + (t.closedPnl >= 0 ? '+' : '') + t.closedPnl.toFixed(2) + ' USDT</span></div>' +
          '<div class="tr-list-meta"><span>' + esc(t.side === 'Buy' ? 'Long' : 'Short') + ' \\u00b7 ' + t.leverage + 'x</span><span>Qty <b>' + esc(t.qty) + '</b></span></div>' +
          '<div class="tr-list-meta"><span>Entry <b>' + formatPrice(t.entryPrice) + '</b></span><span>Exit <b>' + formatPrice(t.exitPrice) + '</b></span></div>' +
          '<div class="tr-list-date">' + fmtDate(t.updatedTime || t.createdTime) + '</div>' +
        '</div>';
      }).join('');
      list.querySelectorAll('[data-trade-index]').forEach(function(item){
        item.addEventListener('click', function(){
          var t = trades[Number(item.getAttribute('data-trade-index'))];
          if (!t) return;
          openShareOverlay({
            symbol: t.symbol,
            side: t.side,
            leverage: t.leverage,
            entryPrice: t.entryPrice,
            markPrice: t.exitPrice,
            unrealizedPnl: t.closedPnl,
            positionValue: t.entryPrice * Number(t.qty),
            isClosed: true,
          });
        });
      });
    } catch (err) {
      if (gen !== dataGen) return;
      document.getElementById('trHistoryList').innerHTML = '<div class="tr-positions-empty">' + esc(err.message || 'Could not load history.') + '</div>';
    }
  }

  function confirmClosePosition(sym){
    var pos = positions.find(function(p){ return p.symbol === sym; });
    if (!pos) return;
    document.getElementById('trConfirmTitle').textContent = 'Close Position';
    document.getElementById('trConfirmBody').innerHTML =
      '<div class="tr-confirm-row"><span>Symbol</span><span>' + esc(sym) + '</span></div>' +
      '<div class="tr-confirm-row"><span>Side</span><span>' + (pos.side === 'Buy' ? 'Long' : 'Short') + '</span></div>' +
      '<div class="tr-confirm-row"><span>Size</span><span>' + pos.size + '</span></div>';
    var okBtn = document.getElementById('trConfirmOkBtn');
    okBtn.className = 'tr-confirm-ok ' + (pos.side === 'Buy' ? 'short' : 'long');
    okBtn.textContent = 'Close Position';
    okBtn.onclick = async function(){
      okBtn.disabled = true;
      try {
        await postJSON('/api/tools/trading/close', { category: CATEGORY, symbol: sym, percent: 100 });
        toast('Position closed.');
        closeConfirmOverlay();
        pollPositions();
      } catch (err) {
        toast(err.message || 'Could not close position.');
      } finally {
        okBtn.disabled = false;
      }
    };
    document.getElementById('trConfirmOverlay').classList.add('show');
  }

  function confirmCloseAllPositions(){
    if (!positions.length) return;
    var totalPnl = positions.reduce(function(sum, p){ return sum + (p.unrealizedPnl || 0); }, 0);
    document.getElementById('trConfirmTitle').textContent = 'Close All Positions';
    document.getElementById('trConfirmBody').innerHTML =
      '<div class="tr-confirm-row"><span>Positions</span><span>' + positions.length + '</span></div>' +
      '<div class="tr-confirm-row"><span>Total PnL</span><span>' + (totalPnl >= 0 ? '+' : '') + totalPnl.toFixed(2) + ' USDT</span></div>';
    var okBtn = document.getElementById('trConfirmOkBtn');
    okBtn.className = 'tr-confirm-ok short';
    okBtn.textContent = 'Close All';
    okBtn.onclick = async function(){
      okBtn.disabled = true;
      var syms = positions.map(function(p){ return p.symbol; });
      var failed = 0;
      for (var i = 0; i < syms.length; i++) {
        try {
          await postJSON('/api/tools/trading/close', { category: CATEGORY, symbol: syms[i], percent: 100 });
        } catch (err) {
          failed++;
        }
      }
      toast(failed ? ('Closed ' + (syms.length - failed) + ' of ' + syms.length + '.') : 'All positions closed.');
      closeConfirmOverlay();
      pollPositions();
      okBtn.disabled = false;
    };
    document.getElementById('trConfirmOverlay').classList.add('show');
  }
  document.getElementById('trCloseAllBtn').addEventListener('click', confirmCloseAllPositions);

  function closeConfirmOverlay(){
    document.getElementById('trConfirmOverlay').classList.remove('show');
  }
  document.getElementById('trConfirmCancelBtn').addEventListener('click', closeConfirmOverlay);
  document.getElementById('trConfirmOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trConfirmOverlay') closeConfirmOverlay();
  });

  function computePreview(entryPrice, qty, leverage, sideLabel, tp, sl){
    var margin = entryPrice && qty && leverage ? (qty * entryPrice) / leverage : 0;
    var lines = [];
    if (!margin) return '';
    if (tp) {
      var tpPnl = sideLabel === 'Long' ? (tp - entryPrice) * qty : (entryPrice - tp) * qty;
      var tpRoi = (tpPnl / margin) * 100;
      lines.push('TP: <b class="' + (tpPnl >= 0 ? 'pos' : 'neg') + '">' + (tpPnl >= 0 ? '+' : '') + tpPnl.toFixed(2) + ' USDT (' + (tpRoi >= 0 ? '+' : '') + tpRoi.toFixed(2) + '%)</b>');
    }
    if (sl) {
      var slPnl = sideLabel === 'Long' ? (sl - entryPrice) * qty : (entryPrice - sl) * qty;
      var slRoi = (slPnl / margin) * 100;
      lines.push('SL: <b class="' + (slPnl >= 0 ? 'pos' : 'neg') + '">' + (slPnl >= 0 ? '+' : '') + slPnl.toFixed(2) + ' USDT (' + (slRoi >= 0 ? '+' : '') + slRoi.toFixed(2) + '%)</b>');
    }
    return lines.join(' &nbsp;\\u00b7&nbsp; ');
  }

  function updateTpslPreview(){
    var box = document.getElementById('trTpslPreview');
    var tp = Number(document.getElementById('trTpInput').value || 0);
    var sl = Number(document.getElementById('trSlInput').value || 0);
    if (!tp && !sl) { box.style.display = 'none'; return; }
    var qty = Number(document.getElementById('trQtyInput').value || 0);
    var lev = Number(document.getElementById('trLeverageValue').textContent) || 1;
    var entry = orderType === 'Limit' ? Number(document.getElementById('trLimitPriceInput').value || 0) || lastPrice : lastPrice;
    if (!entry || !qty) { box.style.display = 'none'; return; }
    var longPreview = computePreview(entry, qty, lev, 'Long', tp, sl);
    var shortPreview = computePreview(entry, qty, lev, 'Short', tp, sl);
    box.innerHTML = 'If Long: ' + longPreview + '<br>If Short: ' + shortPreview;
    box.style.display = 'block';
  }
  document.getElementById('trTpInput').addEventListener('input', updateTpslPreview);
  document.getElementById('trSlInput').addEventListener('input', updateTpslPreview);
  document.getElementById('trLimitPriceInput').addEventListener('input', updateTpslPreview);
  document.getElementById('trLimitPriceInput').addEventListener('input', updateLiqPreview);

  function updateLiqPreview(){
    var box = document.getElementById('trLiqPreview');
    var qty = Number(document.getElementById('trQtyInput').value || 0);
    var lev = currentLeverage();
    var entry = orderType === 'Limit' ? Number(document.getElementById('trLimitPriceInput').value || 0) || lastPrice : lastPrice;
    if (!entry || !qty || !lev || lev <= 1) { box.style.display = 'none'; return; }
    var mmr = 0.005;
    var longLiq = entry * (1 - 1 / lev + mmr);
    var shortLiq = entry * (1 + 1 / lev - mmr);
    box.innerHTML = 'Est. Liquidation &nbsp;\\u00b7&nbsp; If Long: <b>' + formatPrice(longLiq) + '</b> &nbsp;\\u00b7&nbsp; If Short: <b>' + formatPrice(shortLiq) + '</b>';
    box.style.display = 'block';
  }

  function updateEditTpslPreview(pos){
    var box = document.getElementById('trEditTpslPreview');
    var tp = Number(document.getElementById('trEditTpInput').value || 0);
    var sl = Number(document.getElementById('trEditSlInput').value || 0);
    if (!tp && !sl) { box.innerHTML = ''; return; }
    var sideLabel = pos.side === 'Buy' ? 'Long' : 'Short';
    box.innerHTML = computePreview(pos.entryPrice, pos.size, pos.leverage, sideLabel, tp, sl);
  }

  function openTpslEditor(sym){
    var pos = positions.find(function(p){ return p.symbol === sym; });
    if (!pos) return;
    document.getElementById('trTpslTitle').textContent = 'Edit TP / SL \\u00b7 ' + sym;
    document.getElementById('trEditTpInput').value = pos.takeProfit || '';
    document.getElementById('trEditSlInput').value = pos.stopLoss || '';
    updateEditTpslPreview(pos);
    document.getElementById('trEditTpInput').oninput = function(){ updateEditTpslPreview(pos); };
    document.getElementById('trEditSlInput').oninput = function(){ updateEditTpslPreview(pos); };
    document.getElementById('trTpslOverlay').classList.add('show');
    document.getElementById('trTpslSaveBtn').onclick = async function(){
      var tp = document.getElementById('trEditTpInput').value;
      var sl = document.getElementById('trEditSlInput').value;
      var btn = document.getElementById('trTpslSaveBtn');
      btn.disabled = true;
      try {
        await postJSON('/api/tools/trading/tpsl', { category: CATEGORY, symbol: sym, takeProfit: tp, stopLoss: sl });
        toast('TP/SL updated.');
        document.getElementById('trTpslOverlay').classList.remove('show');
        pollPositions();
      } catch (err) {
        toast(err.message || 'Could not update TP/SL.');
      } finally {
        btn.disabled = false;
      }
    };
  }
  document.getElementById('trTpslCancelBtn').addEventListener('click', function(){
    document.getElementById('trTpslOverlay').classList.remove('show');
  });
  document.getElementById('trTpslOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trTpslOverlay') document.getElementById('trTpslOverlay').classList.remove('show');
  });
  document.getElementById('trTpslToggle').addEventListener('change', function(e){
    document.getElementById('trTpslRow').style.display = e.target.checked ? 'flex' : 'none';
    if (!e.target.checked) { document.getElementById('trTpInput').value = ''; document.getElementById('trSlInput').value = ''; }
    updateTpslPreview();
  });

  document.querySelectorAll('.tr-order-type-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      orderType = btn.getAttribute('data-order-type');
      document.querySelectorAll('.tr-order-type-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
      document.getElementById('trLimitPriceRow').style.display = orderType === 'Limit' ? 'flex' : 'none';
      updateTpslPreview();
      updateLiqPreview();
    });
  });

  async function loadInstrumentInfo(){
    var gen = dataGen;
    try {
      var result = await getJSON('/api/tools/trading/instrument?category=' + CATEGORY + '&symbol=' + symbol);
      if (gen !== dataGen) return;
      instrumentInfo = result;
      var maxLev = Math.max(1, Math.floor(Number(instrumentInfo.maxLeverage) || 1));
      var options = [1, 2, 3, 5, 10, 15, 20, 25, 35, 50, 75, 100].filter(function(l){ return l <= maxLev; });
      if (!options.length) options = [1];
      if (options[options.length - 1] !== maxLev) options.push(maxLev);
      var listEl = document.getElementById('trLeverageList');
      listEl.innerHTML = options.map(function(l){ return '<button type="button" class="tr-select-item" data-lev="' + l + '">' + l + 'x</button>'; }).join('');
      var defaultLev = options[Math.min(2, options.length - 1)];
      document.getElementById('trLeverageValue').textContent = defaultLev + 'x';
      listEl.querySelectorAll('[data-lev]').forEach(function(item){
        item.classList.toggle('active', Number(item.getAttribute('data-lev')) === defaultLev);
        item.addEventListener('click', function(){
          document.getElementById('trLeverageValue').textContent = item.getAttribute('data-lev') + 'x';
          listEl.querySelectorAll('[data-lev]').forEach(function(i){ i.classList.toggle('active', i === item); });
          document.getElementById('trLeverageOverlay').classList.remove('show');
          if (currentSizePct > 0) applySizePct(currentSizePct);
          else updateEstMargin();
          updateTpslPreview();
        });
      });
    } catch (err) {
      if (gen !== dataGen) return;
      instrumentInfo = null;
    }
  }
  document.getElementById('trLeverageBtn').addEventListener('click', function(){
    document.getElementById('trLeverageOverlay').classList.add('show');
  });
  document.getElementById('trLeverageOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trLeverageOverlay') document.getElementById('trLeverageOverlay').classList.remove('show');
  });

  function renderMarginModeBtn(){
    document.getElementById('trMarginModeBtn').textContent = MARGIN_MODE === 'cross' ? 'Cross' : 'Isolated';
  }
  renderMarginModeBtn();
  document.getElementById('trMarginModeBtn').addEventListener('click', function(){
    document.querySelectorAll('#trMarginModeOverlay [data-mode]').forEach(function(btn){
      btn.classList.toggle('active', btn.getAttribute('data-mode') === MARGIN_MODE);
    });
    document.getElementById('trMarginModeOverlay').classList.add('show');
  });
  document.getElementById('trMarginModeOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trMarginModeOverlay') document.getElementById('trMarginModeOverlay').classList.remove('show');
  });
  document.querySelectorAll('#trMarginModeOverlay [data-mode]').forEach(function(btn){
    btn.addEventListener('click', async function(){
      var mode = btn.getAttribute('data-mode');
      MARGIN_MODE = mode;
      localStorage.setItem(MARGIN_MODE_KEY, MARGIN_MODE);
      renderMarginModeBtn();
      document.getElementById('trMarginModeOverlay').classList.remove('show');
      if (EXCHANGE === 'bybit') {
        try {
          await postJSON('/api/tools/trading/margin-mode', { category: CATEGORY, symbol: symbol, marginMode: mode });
          toast('Margin mode set to ' + (mode === 'cross' ? 'Cross' : 'Isolated') + '.');
        } catch (err) {
          toast(err.message || 'Could not update margin mode on the exchange, but new orders will use ' + mode + '.');
        }
      } else {
        toast('Margin mode set to ' + (mode === 'cross' ? 'Cross' : 'Isolated') + '.');
      }
    });
  });

  function currentLeverage(){
    return Number((document.getElementById('trLeverageValue').textContent || '1x').replace('x', '')) || 1;
  }

  var currentSizePct = 0;

  function updateEstMargin(){
    var qty = Number(document.getElementById('trQtyInput').value || 0);
    var lev = currentLeverage();
    var margin = lastPrice && qty ? (qty * lastPrice) / lev : 0;
    document.getElementById('trEstMargin').textContent = margin ? margin.toFixed(2) : '--';
    updateTpslPreview();
    updateLiqPreview();
  }
  document.getElementById('trQtyInput').addEventListener('input', function(){
    currentSizePct = 0;
    document.getElementById('trSizeSlider').value = 0;
    document.getElementById('trSizePct').textContent = '0%';
    updateEstMargin();
  });

  document.getElementById('trSizeSlider').addEventListener('input', function(e){
    var pct = Number(e.target.value);
    currentSizePct = pct;
    document.getElementById('trSizePct').textContent = pct + '%';
    applySizePct(pct);
  });
  document.querySelectorAll('.tr-size-preset').forEach(function(btn){
    btn.addEventListener('click', function(){
      var pct = Number(btn.getAttribute('data-pct'));
      currentSizePct = pct;
      document.getElementById('trSizeSlider').value = pct;
      document.getElementById('trSizePct').textContent = pct + '%';
      applySizePct(pct);
    });
  });
  function applySizePct(pct){
    var available = Number((document.getElementById('trAvailable').textContent || '0').replace(/,/g, '')) || 0;
    var lev = currentLeverage();
    if (!lastPrice || !available || !lev) { updateEstMargin(); return; }
    var marginToUse = (available * pct) / 100;
    var notional = marginToUse * lev;
    var qty = notional / lastPrice;
    if (instrumentInfo && instrumentInfo.qtyStep) {
      var step = Number(instrumentInfo.qtyStep);
      qty = Math.floor(qty / step) * step;
    }
    document.getElementById('trQtyInput').value = qty > 0 ? qty.toFixed(6).replace(/0+$/, '').replace(/\\.$/, '') : '';
    updateEstMargin();
  }

  function openOrderConfirm(side){
    var qty = document.getElementById('trQtyInput').value;
    var lev = currentLeverage();
    if (!lev) { toast('Select a leverage first.'); return; }
    if (!qty || Number(qty) <= 0) { toast('Enter a quantity first.'); return; }
    var limitPrice = orderType === 'Limit' ? document.getElementById('trLimitPriceInput').value : '';
    if (orderType === 'Limit' && (!limitPrice || Number(limitPrice) <= 0)) { toast('Enter a limit price.'); return; }
    var tpsl = document.getElementById('trTpslToggle').checked;
    var tp = tpsl ? document.getElementById('trTpInput').value : '';
    var sl = tpsl ? document.getElementById('trSlInput').value : '';
    document.getElementById('trConfirmTitle').textContent = side === 'Buy' ? 'Confirm Long' : 'Confirm Short';
    document.getElementById('trConfirmBody').innerHTML =
      '<div class="tr-confirm-row"><span>Symbol</span><span>' + esc(symbol) + '</span></div>' +
      '<div class="tr-confirm-row"><span>Type</span><span>' + orderType + '</span></div>' +
      '<div class="tr-confirm-row"><span>Side</span><span>' + (side === 'Buy' ? 'Long' : 'Short') + '</span></div>' +
      '<div class="tr-confirm-row"><span>Leverage</span><span>' + lev + 'x</span></div>' +
      '<div class="tr-confirm-row"><span>Margin Mode</span><span>' + (MARGIN_MODE === 'cross' ? 'Cross' : 'Isolated') + '</span></div>' +
      '<div class="tr-confirm-row"><span>Quantity</span><span>' + qty + '</span></div>' +
      (limitPrice ? '<div class="tr-confirm-row"><span>Limit Price</span><span>' + limitPrice + '</span></div>' : '') +
      (tp ? '<div class="tr-confirm-row"><span>Take Profit</span><span>' + tp + '</span></div>' : '') +
      (sl ? '<div class="tr-confirm-row"><span>Stop Loss</span><span>' + sl + '</span></div>' : '');
    var okBtn = document.getElementById('trConfirmOkBtn');
    okBtn.className = 'tr-confirm-ok ' + (side === 'Buy' ? 'long' : 'short');
    okBtn.textContent = side === 'Buy' ? 'Confirm Long' : 'Confirm Short';
    okBtn.onclick = async function(){
      okBtn.disabled = true;
      try {
        await postJSON('/api/tools/trading/order', { category: CATEGORY, symbol: symbol, side: side, qty: qty, leverage: lev, orderType: orderType, price: limitPrice, marginMode: MARGIN_MODE });
        if (tp || sl) {
          await postJSON('/api/tools/trading/tpsl', { category: CATEGORY, symbol: symbol, takeProfit: tp, stopLoss: sl }).catch(function(){});
        }
        toast('Order placed.');
        closeConfirmOverlay();
        document.getElementById('trQtyInput').value = '';
        document.getElementById('trSizeSlider').value = 0;
        document.getElementById('trSizePct').textContent = '0%';
        currentSizePct = 0;
        pollPositions();
      } catch (err) {
        toast(err.message || 'Could not place order.');
      } finally {
        okBtn.disabled = false;
      }
    };
    document.getElementById('trConfirmOverlay').classList.add('show');
  }
  document.getElementById('trLongBtn').addEventListener('click', function(){ openOrderConfirm('Buy'); });
  document.getElementById('trShortBtn').addEventListener('click', function(){ openOrderConfirm('Sell'); });

  function openShareOverlay(pos){
    var sideLower = pos.side === 'Buy' ? 'long' : 'short';
    var sideLabel = sideLower === 'long' ? 'Long' : 'Short';
    var pct = positionRoi(pos);
    var pnlSign = pct >= 0 ? 'pos' : 'neg';
    document.getElementById('trShareCard').className = 'tr-share-card ' + sideLower;
    var chip = document.getElementById('trShareSideChip');
    chip.className = 'tr-share-side-chip ' + sideLower;
    chip.textContent = sideLabel.toUpperCase() + ' \\u00b7 ' + (pos.leverage || 1) + 'x';
    document.getElementById('trShareSymbol').textContent = pos.symbol;
    var roiEl = document.getElementById('trShareRoi');
    roiEl.className = 'tr-share-roi ' + pnlSign;
    roiEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    var usdtEl = document.getElementById('trShareUsdt');
    usdtEl.className = 'tr-share-usdt ' + pnlSign;
    usdtEl.textContent = (pos.unrealizedPnl >= 0 ? '+' : '') + pos.unrealizedPnl.toFixed(2) + ' USDT';
    usdtEl.style.display = shareUsdt ? 'block' : 'none';
    document.getElementById('trUsdtToggle').classList.toggle('on', shareUsdt);
    document.getElementById('trShareEntry').textContent = formatPrice(pos.entryPrice);
    document.getElementById('trShareMark').textContent = formatPrice(pos.markPrice);
    document.getElementById('trShareMarkLabel').textContent = pos.isClosed ? 'Exit' : 'Mark';
    document.getElementById('trShareDemoStamp').style.display = DEMO_MODE ? 'block' : 'none';
    var now = new Date();
    var dd = String(now.getDate()).padStart(2, '0');
    var mm = String(now.getMonth() + 1).padStart(2, '0');
    var yyyy = now.getFullYear();
    var hh = String(now.getHours()).padStart(2, '0');
    var min = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('trShareTimestamp').textContent = dd + '/' + mm + '/' + yyyy + ' \\u00b7 ' + hh + ':' + min;
    document.getElementById('trShareOverlay').dataset.pos = JSON.stringify(pos);
    document.getElementById('trShareOverlay').classList.add('show');
  }

  document.getElementById('trUsdtToggle').addEventListener('click', function(){
    shareUsdt = !shareUsdt;
    var overlay = document.getElementById('trShareOverlay');
    var pos = JSON.parse(overlay.dataset.pos || '{}');
    if (pos.symbol) openShareOverlay(pos);
  });

  document.getElementById('trChartShareBtn').addEventListener('click', function(){
    var pos = positions.find(function(p){ return p.symbol === symbol; });
    if (pos) { openShareOverlay(pos); return; }
    openShareOverlay({ symbol: symbol, side: 'Buy', leverage: 1, entryPrice: lastPrice, markPrice: lastPrice, unrealizedPnl: 0, positionValue: 1 });
  });

  function closeShareOverlay(){ document.getElementById('trShareOverlay').classList.remove('show'); }
  document.getElementById('trShareCloseBtn').addEventListener('click', closeShareOverlay);
  document.getElementById('trShareOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trShareOverlay') closeShareOverlay();
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

  function drawShareCanvas(pos, sideLower, sideLabel, pct, timestampText){
    var canvas = document.getElementById('trShareCanvas');
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var pnlColor = pct >= 0 ? '#12C48B' : '#FF3B5C';
    var sideColor = sideLower === 'long' ? '#12C48B' : '#FF3B5C';

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#15151F');
    bg.addColorStop(1, '#0A0A0F');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W * 0.18, 44, 30, W * 0.18, 44, 320);
    glow.addColorStop(0, sideLower === 'long' ? 'rgba(18,196,139,.16)' : 'rgba(255,59,92,.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00E0FF';
    ctx.font = '700 21px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', 44, 66);

    var chipLabel = sideLabel.toUpperCase() + '  \\u00b7  ' + (pos.leverage || 1) + 'x';
    ctx.font = '800 17px "Space Grotesk", sans-serif';
    var chipW = ctx.measureText(chipLabel).width + 32;
    var chipX = W - 44 - chipW, chipY = 38, chipH = 34;
    ctx.fillStyle = sideLower === 'long' ? 'rgba(18,196,139,.16)' : 'rgba(255,59,92,.16)';
    roundRect(ctx, chipX, chipY, chipW, chipH, 17);
    ctx.fill();
    ctx.strokeStyle = sideLower === 'long' ? 'rgba(18,196,139,.4)' : 'rgba(255,59,92,.4)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, chipX, chipY, chipW, chipH, 17);
    ctx.stroke();
    ctx.fillStyle = sideColor;
    ctx.textAlign = 'center';
    ctx.fillText(chipLabel, chipX + chipW / 2, chipY + 23);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '700 26px "Space Grotesk", sans-serif';
    ctx.fillText(pos.symbol, W / 2, 148);

    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 15px Inter, sans-serif';
    ctx.fillText('ROI', W / 2, 192);

    ctx.fillStyle = pnlColor;
    ctx.font = '800 76px "Space Grotesk", sans-serif';
    ctx.fillText((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', W / 2, 284);

    var nextY = 312;
    if (shareUsdt) {
      ctx.fillStyle = pnlColor;
      ctx.font = '600 21px "JetBrains Mono", monospace';
      ctx.fillText((pos.unrealizedPnl >= 0 ? '+' : '') + pos.unrealizedPnl.toFixed(2) + ' USDT', W / 2, nextY);
      nextY += 28;
    }

    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(44, nextY + 18);
    ctx.lineTo(W - 44, nextY + 18);
    ctx.stroke();

    var rowY = nextY + 58;
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY', 44, rowY);
    ctx.textAlign = 'right';
    ctx.fillText(pos.isClosed ? 'EXIT' : 'MARK', W - 44, rowY);

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(pos.entryPrice), 44, rowY + 27);
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(pos.markPrice), W - 44, rowY + 27);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillText(timestampText, W / 2, rowY + 8);

    var footerY = rowY + 27 + 100;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 23px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', W / 2, footerY);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillText('esteamstv.devs.surf', W / 2, footerY + 24);

    if (DEMO_MODE) {
      ctx.save();
      ctx.translate(W / 2, H * 0.46);
      ctx.rotate(-18 * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.font = '800 54px "Space Grotesk", sans-serif';
      ctx.strokeStyle = 'rgba(255,196,0,.35)';
      ctx.lineWidth = 5;
      roundRect(ctx, -150, -42, 300, 84, 14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,196,0,.3)';
      ctx.fillText('DEMO', 0, 16);
      ctx.restore();
    }
  }

  document.getElementById('trShareSaveBtn').addEventListener('click', function(){
    var overlay = document.getElementById('trShareOverlay');
    var pos = JSON.parse(overlay.dataset.pos || '{}');
    if (!pos.symbol) return;
    var sideLower = pos.side === 'Buy' ? 'long' : 'short';
    var sideLabel = sideLower === 'long' ? 'Long' : 'Short';
    var pct = positionRoi(pos);
    var btn = document.getElementById('trShareSaveBtn');
    var icon = document.getElementById('trShareSaveIcon');
    var label = document.getElementById('trShareSaveLabel');
    btn.disabled = true;
    btn.classList.remove('saved');
    icon.outerHTML = '<span class="tr-btn-spinner" id="trShareSaveIcon"></span>';
    label.textContent = 'Saving\\u2026';
    try {
      var timestampText = document.getElementById('trShareTimestamp').textContent;
      drawShareCanvas(pos, sideLower, sideLabel, pct, timestampText);
      var canvas = document.getElementById('trShareCanvas');
      var dataUrl = canvas.toDataURL('image/png');
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = pos.symbol + '-pnl-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      document.getElementById('trShareSaveIcon').outerHTML =
        '<svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/></svg>';
      btn.classList.add('saved');
      label.textContent = 'Saved';
      setTimeout(function(){
        document.getElementById('trShareSaveIcon').outerHTML =
          '<svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>';
        btn.classList.remove('saved');
        label.textContent = 'Save Image';
        btn.disabled = false;
      }, 1400);
    } catch (err) {
      document.getElementById('trShareSaveIcon').outerHTML =
        '<svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>';
      label.textContent = 'Save Image';
      btn.disabled = false;
      toast('Could not save image.');
    }
  });

  async function loadSymbols(){
    var gen = dataGen;
    try {
      var data = await getJSON('/api/tools/trading/symbols?category=' + CATEGORY);
      if (gen !== dataGen) return;
      allSymbols = data.symbols || [];
    } catch (err) {
      if (gen !== dataGen) return;
      allSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    }
  }

  function renderSearchList(filter){
    var list = document.getElementById('trSearchList');
    var f = (filter || '').toUpperCase();
    var favorites = getFavorites();
    var html = '';
    if (!f && favorites.length) {
      html += '<div class="tr-search-group-label">Favorites</div>';
      html += favorites.map(searchItemHtml).join('');
      html += '<div class="tr-search-group-label">All Pairs</div>';
    }
    var pool = f ? allSymbols.filter(function(s){ return s.indexOf(f) !== -1; }) : allSymbols;
    var matches = pool.slice(0, 80);
    if (!matches.length && !favorites.length) {
      list.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:.82rem">No matches.</div>';
      return;
    }
    html += matches.map(searchItemHtml).join('');
    list.innerHTML = html;

    list.querySelectorAll('[data-symbol]').forEach(function(item){
      var sym = item.getAttribute('data-symbol');
      bindPressAndTap(item, sym);
      var starEl = item.querySelector('.star');
      if (starEl) {
        starEl.addEventListener('click', function(e){
          e.stopPropagation();
          toggleFavorite(sym);
          renderSearchList(document.getElementById('trSearchInput').value);
        });
      }
    });
  }

  function searchItemHtml(sym){
    var isFav = getFavorites().indexOf(sym) !== -1;
    return '<button type="button" class="tr-search-item' + (isFav ? ' favorited' : '') + '" data-symbol="' + esc(sym) + '">' +
      '<span>' + esc(sym) + '</span>' +
      '<span class="star"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg></span>' +
    '</button>';
  }

  function bindPressAndTap(item, sym){
    var longPressed = false;
    var moved = false;
    var startX = 0, startY = 0;
    var timer = null;
    var start = function(e){
      if (e.target.closest('.star')) return;
      longPressed = false;
      moved = false;
      var t = e.touches ? e.touches[0] : e;
      startX = t.clientX;
      startY = t.clientY;
      timer = setTimeout(function(){
        longPressed = true;
        toggleFavorite(sym);
        renderSearchList(document.getElementById('trSearchInput').value);
      }, 500);
    };
    var move = function(e){
      var t = e.touches ? e.touches[0] : e;
      if (Math.abs(t.clientX - startX) > 10 || Math.abs(t.clientY - startY) > 10) {
        moved = true;
        if (timer) clearTimeout(timer);
      }
    };
    var cancel = function(){ if (timer) clearTimeout(timer); };
    item.addEventListener('touchstart', start, { passive: true });
    item.addEventListener('touchmove', move, { passive: true });
    item.addEventListener('touchend', function(e){
      cancel();
      if (e.target.closest('.star')) return;
      if (!longPressed && !moved) { switchSymbol(sym); closeSearch(); }
    });
    item.addEventListener('mousedown', start);
    item.addEventListener('mousemove', move);
    item.addEventListener('mouseup', function(e){
      cancel();
      if (e.target.closest('.star')) return;
      if (!longPressed && !moved) { switchSymbol(sym); closeSearch(); }
    });
    item.addEventListener('mouseleave', cancel);
    item.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }

  function openSearch(){
    document.getElementById('trSearchOverlay').classList.add('show');
    document.getElementById('trSearchInput').value = '';
    renderSearchList('');
    document.getElementById('trSearchInput').focus();
  }
  function closeSearch(){ document.getElementById('trSearchOverlay').classList.remove('show'); }

  document.getElementById('trPairBtn').addEventListener('click', openSearch);
  document.getElementById('trSearchCloseBtn').addEventListener('click', closeSearch);
  document.getElementById('trSearchOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trSearchOverlay') closeSearch();
  });
  document.getElementById('trSearchInput').addEventListener('input', function(e){
    renderSearchList(e.target.value);
  });

  function switchSymbol(newSymbol){
    symbol = newSymbol;
    localStorage.setItem(LAST_SYMBOL_KEY, symbol);
    document.getElementById('trPairSymbol').textContent = symbol;
    firstPrice = null;
    initChart();
    loadTicker();
    loadInstrumentInfo();
    renderPositions();
  }

  function renderExchangeOverlay(){
    document.getElementById('trExchangeBybit').classList.toggle('active', EXCHANGE === 'bybit');
    document.getElementById('trExchangeWeex').classList.toggle('active', EXCHANGE === 'weex');
    document.getElementById('trDemoToggle').classList.toggle('on', DEMO_MODE);
  }
  function openExchangeOverlay(){
    renderExchangeOverlay();
    showSettingsPage('exchange');
    document.getElementById('trExchangeOverlay').classList.add('show');
  }
  function closeExchangeOverlay(){
    document.getElementById('trExchangeOverlay').classList.remove('show');
  }
  function updateDemoBadge(){
    document.getElementById('trDemoBadge').style.display = DEMO_MODE ? 'inline-block' : 'none';
  }
  function refreshTradingData(){
    dataGen++;
    firstPrice = null;
    instrumentInfo = null;
    positions = [];
    renderPositions();
    document.getElementById('trEquity').textContent = '--';
    document.getElementById('trAvailable').textContent = '--';
    if (activeTab === 'orders') document.getElementById('trOrdersList').innerHTML = '<div class="tr-positions-empty">Loading orders...</div>';
    if (activeTab === 'history') document.getElementById('trHistoryList').innerHTML = '<div class="tr-positions-empty">Loading history...</div>';
    initChart();
    loadTicker();
    loadSymbols();
    loadInstrumentInfo();
    startPositionsPolling();
    if (activeTab === 'orders') pollOrders();
    if (activeTab === 'history') pollHistory();
  }
  function switchExchange(next){
    if (next !== 'bybit' && next !== 'weex') return;
    if (next === EXCHANGE) { closeExchangeOverlay(); return; }
    EXCHANGE = next;
    localStorage.setItem(EXCHANGE_KEY, EXCHANGE);
    closeExchangeOverlay();
    toast('Switched to ' + (EXCHANGE === 'weex' ? 'WEEX' : 'Bybit') + (DEMO_MODE ? ' Demo.' : '.'));
    refreshTradingData();
  }
  function toggleDemoMode(){
    DEMO_MODE = !DEMO_MODE;
    localStorage.setItem(DEMO_KEY, DEMO_MODE ? '1' : '0');
    document.getElementById('trDemoToggle').classList.toggle('on', DEMO_MODE);
    updateDemoBadge();
    toast(DEMO_MODE ? 'Demo trading enabled.' : 'Demo trading disabled.');
    refreshTradingData();
  }
  document.getElementById('trSettingsFab').addEventListener('click', function(){
    this.classList.remove('spin'); void this.offsetWidth; this.classList.add('spin');
    openExchangeOverlay();
  });
  document.getElementById('trExchangeCloseBtn').addEventListener('click', closeExchangeOverlay);
  document.getElementById('trDemoToggle').addEventListener('click', toggleDemoMode);
  document.getElementById('trExchangeOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trExchangeOverlay') closeExchangeOverlay();
  });
  document.querySelectorAll('.tr-exchange-item').forEach(function(btn){
    btn.addEventListener('click', function(){ switchExchange(btn.getAttribute('data-exchange')); });
  });

  function showSettingsPage(name){
    document.getElementById('trSettingsPageExchange').style.display = name === 'exchange' ? 'block' : 'none';
    document.getElementById('trSettingsPageKeys').style.display = name === 'keys' ? 'block' : 'none';
  }
  document.getElementById('trGoApiKeysBtn').addEventListener('click', function(){
    showSettingsPage('keys');
    loadKeysStatus();
  });
  document.getElementById('trKeysBackBtn').addEventListener('click', function(){ showSettingsPage('exchange'); });
  document.getElementById('trKeysCloseBtn').addEventListener('click', closeExchangeOverlay);

  async function loadKeysStatus(){
    try {
      var status = await getJSON('/api/tools/trading/keys/status');
      document.querySelectorAll('.tr-key-block').forEach(function(block){
        var ex = block.getAttribute('data-exchange');
        var mode = block.getAttribute('data-mode');
        var info = (status[ex] || {})[mode] || { saved: false };
        var statusEl = block.querySelector('[data-status]');
        var maskedEl = block.querySelector('[data-masked]');
        statusEl.textContent = info.saved ? 'Connected' : 'Not connected';
        statusEl.classList.toggle('connected', !!info.saved);
        maskedEl.textContent = info.saved ? ('•••• ' + (info.last4 || '----')) : 'Not connected';
      });
      var auto = status.autoTrading || {};
      document.getElementById('trAutoEnableToggle').classList.toggle('on', !!auto.enabled);
      document.getElementById('trAutoExchange').value = auto.exchange === 'weex' ? 'weex' : 'bybit';
      document.getElementById('trAutoMode').value = auto.mode === 'live' ? 'live' : 'demo';
      document.getElementById('trAutoUsdt').value = auto.usdtPerTrade || 10;
    } catch (err) {}
  }

  document.querySelectorAll('.tr-key-block').forEach(function(block){
    var view = block.querySelector('[data-view]');
    var form = block.querySelector('[data-form]');
    var pencil = block.querySelector('[data-pencil]');
    var cancelBtn = block.querySelector('[data-cancel]');
    var saveBtn = block.querySelector('[data-save]');
    pencil.addEventListener('click', function(){
      form.querySelectorAll('input').forEach(function(inp){ inp.value = ''; });
      view.style.display = 'none';
      form.style.display = 'block';
    });
    cancelBtn.addEventListener('click', function(){
      form.style.display = 'none';
      view.style.display = 'flex';
    });
    saveBtn.addEventListener('click', async function(){
      var exchange = block.getAttribute('data-exchange');
      var mode = block.getAttribute('data-mode');
      var payload = { exchange: exchange, mode: mode };
      form.querySelectorAll('input[data-field]').forEach(function(inp){
        payload[inp.getAttribute('data-field')] = inp.value.trim();
      });
      if (!payload.apiKey || !payload.apiSecret || (exchange === 'weex' && !payload.passphrase)) {
        toast('Please fill in all fields.');
        return;
      }
      saveBtn.disabled = true;
      try {
        await postJSON('/api/tools/trading/keys', payload);
        toast('API keys saved.');
        form.style.display = 'none';
        view.style.display = 'flex';
        loadKeysStatus();
      } catch (err) {
        toast(err.message || 'Could not save API keys.');
      }
      saveBtn.disabled = false;
    });
  });

  document.getElementById('trAutoEnableToggle').addEventListener('click', function(){
    this.classList.toggle('on');
  });

  document.getElementById('trAutoSaveBtn').addEventListener('click', async function(){
    var btn = this;
    var usdt = Number(document.getElementById('trAutoUsdt').value || 0);
    var msg = document.getElementById('trAutoSaveMsg');
    if (usdt < 3 || usdt > 1000) {
      msg.style.display = 'block';
      msg.textContent = 'USDT per trade must be between 3 and 1000.';
      return;
    }
    btn.disabled = true;
    try {
      await postJSON('/api/tools/trading/auto-settings', {
        enabled: document.getElementById('trAutoEnableToggle').classList.contains('on'),
        exchange: document.getElementById('trAutoExchange').value,
        mode: document.getElementById('trAutoMode').value,
        usdtPerTrade: usdt,
      });
      msg.style.display = 'block';
      msg.textContent = 'Saved.';
      toast('Auto trading settings saved.');
    } catch (err) {
      msg.style.display = 'block';
      msg.textContent = err.message || 'Could not save settings.';
    }
    btn.disabled = false;
  });

  document.getElementById('trBulkStartBtn').addEventListener('click', async function(){
    var btn = this;
    var pair = document.getElementById('trBulkSymbol').value.trim().toUpperCase();
    var lev = Number(document.getElementById('trBulkLeverage').value || 10);
    var side = document.getElementById('trBulkSide').value;
    var resultBox = document.getElementById('trBulkResult');
    if (!pair) { toast('Enter a pair, e.g. BTCUSDT.'); return; }
    btn.disabled = true;
    btn.textContent = 'Starting...';
    resultBox.style.display = 'none';
    try {
      var data = await postJSON('/api/tools/trading/auto/bulk-start', { category: CATEGORY, symbol: pair, leverage: lev, side: side });
      resultBox.style.display = 'block';
      if (!data.total) {
        resultBox.textContent = 'No users are opted into Auto Trading yet.';
      } else {
        var lines = [data.succeeded + ' of ' + data.total + ' succeeded.'];
        data.results.forEach(function(r){
          lines.push((r.ok ? '✓ ' : '✗ ') + r.uid.slice(0, 8) + (r.ok ? (' : ' + r.qty + ' ' + pair) : (' : ' + r.error)));
        });
        resultBox.innerHTML = lines.map(esc).join('<br>');
      }
    } catch (err) {
      resultBox.style.display = 'block';
      resultBox.textContent = err.message || 'Bulk start failed.';
    }
    btn.disabled = false;
    btn.textContent = 'Bulk Start';
  });

  var TR_VIEW_KEY = 'trActiveView';
  function syncTrPanelHeight(){
    var clip = document.getElementById('trViewsClip');
    var track = document.getElementById('trViewsTrack');
    var activePanel = track.classList.contains('show-auto') ? document.getElementById('trViewAuto') : document.getElementById('trViewManual');
    clip.style.height = activePanel.scrollHeight + 'px';
  }
  window.addEventListener('resize', syncTrPanelHeight);
  function showManualView(){
    document.getElementById('trViewsTrack').classList.remove('show-auto');
    document.getElementById('trViewTabManual').classList.add('active');
    document.getElementById('trViewTabAuto').classList.remove('active');
    localStorage.setItem(TR_VIEW_KEY, 'manual');
    syncTrPanelHeight();
  }
  function showAutoView(){
    document.getElementById('trViewsTrack').classList.add('show-auto');
    document.getElementById('trViewTabAuto').classList.add('active');
    document.getElementById('trViewTabManual').classList.remove('active');
    localStorage.setItem(TR_VIEW_KEY, 'auto');
    syncTrPanelHeight();
    loadKeysStatus();
  }
  document.getElementById('trViewTabManual').addEventListener('click', showManualView);
  document.getElementById('trViewTabAuto').addEventListener('click', showAutoView);
  if (localStorage.getItem(TR_VIEW_KEY) === 'auto') {
    showAutoView();
  } else {
    setTimeout(syncTrPanelHeight, 300);
  }

  updateDemoBadge();
  document.getElementById('trPairSymbol').textContent = symbol;
  initChart();
  loadTicker();
  loadSymbols();
  loadInstrumentInfo();
  startPositionsPolling();
  setInterval(loadTicker, 5000);
})();
</script>
</body>
</html>`;
}
