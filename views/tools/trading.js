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
.tr-wallet{margin-left:auto;text-align:right}
.tr-wallet .label{font-size:.6rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700}
.tr-wallet .value{font-family:var(--font-mono);font-size:.86rem;font-weight:600}
.tr-wrap{max-width:640px;margin:0 auto;padding:14px 14px 0}

.tr-pair-bar{display:flex;align-items:center;gap:10px;margin-bottom:12px}
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
.tr-chart-tools{display:flex;justify-content:flex-end;padding:8px 4px 2px}
.tr-chart-share-btn{
  display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--card2);border:1px solid var(--border-strong);
  border-radius:9px;color:var(--muted);font-size:.76rem;font-weight:700;font-family:var(--font-display);
}
.tr-chart-share-btn svg{width:14px;height:14px}

.tr-positions-section{margin-bottom:14px}
.tr-section-label{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:700;margin-bottom:8px;padding:0 2px}
.tr-positions-row{display:flex;gap:10px;overflow-x:auto;padding-bottom:2px;scroll-snap-type:x proximity}
.tr-positions-row::-webkit-scrollbar{display:none}
.tr-position-card{
  scroll-snap-align:start;flex-shrink:0;width:250px;background:var(--card);border:1px solid var(--border-strong);
  border-radius:14px;padding:14px;
}
.tr-position-card.long{border-color:rgba(18,196,139,.35)}
.tr-position-card.short{border-color:rgba(255,59,92,.35)}
.tr-position-card.active{outline:2px solid var(--accent)}
.tr-pc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.tr-pc-symbol{font-family:var(--font-display);font-weight:700;font-size:.88rem}
.tr-pc-side{font-family:var(--font-display);font-weight:800;font-size:.66rem;text-transform:uppercase;letter-spacing:.03em;padding:3px 8px;border-radius:7px}
.tr-pc-side.long{background:rgba(18,196,139,.15);color:var(--green)}
.tr-pc-side.short{background:rgba(255,59,92,.15);color:var(--red)}
.tr-pc-lev{font-size:.68rem;color:var(--muted);margin-left:6px}
.tr-pc-pnl{font-family:var(--font-mono);font-size:1.3rem;font-weight:700;margin-bottom:8px}
.tr-pc-pnl.pos{color:var(--green)}
.tr-pc-pnl.neg{color:var(--red)}
.tr-pc-meta{display:flex;justify-content:space-between;font-size:.7rem;color:var(--muted);margin-bottom:10px}
.tr-pc-meta b{color:var(--text);font-weight:600;font-family:var(--font-mono)}
.tr-pc-actions{display:flex;gap:6px}
.tr-pc-btn{flex:1;padding:7px 4px;border-radius:8px;background:var(--card2);border:1px solid var(--border-strong);color:var(--text);font-size:.7rem;font-weight:700}
.tr-pc-btn.danger{color:var(--red);border-color:rgba(255,59,92,.3)}
.tr-positions-empty{color:var(--muted);font-size:.82rem;padding:16px;background:var(--card);border:1px solid var(--border-strong);border-radius:14px;text-align:center}

.tr-order-card{background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:16px;margin-bottom:14px}
.tr-order-row{display:flex;gap:10px;margin-bottom:12px}
.tr-order-field{flex:1}
.tr-order-field label{display:block;font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700;margin-bottom:6px}
.tr-order-field select,.tr-order-field input{
  width:100%;padding:9px 10px;background:var(--card2);border:1px solid var(--border-strong);border-radius:9px;
  color:var(--text);font-family:var(--font-mono);font-size:.86rem;
}
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

.tr-overlay{
  position:fixed;inset:0;z-index:100;background:rgba(10,10,15,.75);backdrop-filter:blur(10px);
  display:none;align-items:flex-start;justify-content:center;padding:24px 14px;overflow-y:auto;
}
:root[data-theme="light"] .tr-overlay{background:rgba(20,20,28,.45)}
.tr-overlay.show{display:flex}

.tr-search-panel{width:100%;max-width:420px;max-height:80vh;margin-top:36px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.tr-search-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border)}
.tr-search-input-row input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:.92rem;font-family:var(--font-body)}
.tr-search-close{background:transparent;border:none;color:var(--muted);display:flex}
.tr-search-close svg{width:20px;height:20px}
.tr-search-list{overflow-y:auto;padding:6px}
.tr-search-group-label{font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:8px 10px 4px}
.tr-search-item{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:11px 14px;background:transparent;border:none;color:var(--text);font-family:var(--font-display);font-weight:600;font-size:.86rem;border-radius:10px;user-select:none;-webkit-user-select:none}
.tr-search-item:active{background:var(--card2)}
.tr-search-item .star{width:16px;height:16px;flex-shrink:0;color:var(--muted)}
.tr-search-item.favorited .star{color:#FFC53D}
.tr-search-item.favorited .star svg{fill:#FFC53D}

.tr-confirm-panel{width:100%;max-width:360px;margin:auto 0;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:20px}
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

.tr-tpsl-panel{width:100%;max-width:360px;margin:auto 0;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:20px}
.tr-tpsl-panel .tr-order-field{margin-bottom:12px}
.tr-tpsl-save{width:100%;padding:12px;border-radius:11px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;font-family:var(--font-display);font-weight:700;font-size:.86rem}

.tr-share-inner{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:380px;margin:auto 0;position:relative}
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
.tr-share-meta-row{display:flex;justify-content:space-between;margin-bottom:16px;position:relative}
.tr-share-meta-label{display:block;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.tr-share-meta-val{display:block;font-family:var(--font-mono);font-size:.82rem;color:var(--text)}
.tr-share-meta-row div:last-child{text-align:right}
.tr-share-footer{text-align:center;position:relative}
.tr-share-footer-brand{font-family:var(--font-display);font-weight:800;font-size:.88rem;color:var(--text)}
.tr-share-footer-url{font-size:.66rem;color:var(--muted);margin-top:2px}
.tr-share-footer-ts{font-size:.62rem;color:var(--muted);margin-top:8px;font-family:var(--font-mono)}
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
.tr-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--card2);border:1px solid var(--border-strong);color:var(--text);padding:11px 18px;border-radius:11px;font-size:.82rem;font-weight:600;opacity:0;transition:opacity .25s var(--ease),transform .25s var(--ease);z-index:200;pointer-events:none}
.tr-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.tr-share-canvas-wrap{display:none}
</style>
</head>
<body>

<div class="tr-nav">
  <button type="button" class="tr-back" id="trBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
  </button>
  <div class="tr-title">Trading</div>
  <div class="tr-wallet">
    <div class="label">Equity</div>
    <div class="value" id="trEquity">--</div>
  </div>
</div>

<div class="tr-wrap">
  <div class="tr-pair-bar">
    <button type="button" class="tr-pair-btn" id="trPairBtn">
      <div class="tr-pair-btn-left">
        <span class="tr-pair-symbol" id="trPairSymbol">BTCUSDT</span>
        <span class="tr-pair-price" id="trPairPrice">--</span>
      </div>
      <span class="tr-pair-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg></span>
    </button>
  </div>

  <div class="tr-chart-card">
    <div id="tvChartContainer"></div>
    <div class="tr-chart-tools">
      <button type="button" class="tr-chart-share-btn" id="trChartShareBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14"/></svg>
        Share Chart
      </button>
    </div>
  </div>

  <div class="tr-positions-section">
    <div class="tr-section-label">Open Positions</div>
    <div class="tr-positions-row" id="trPositionsRow">
      <div class="tr-positions-empty" id="trPositionsEmpty">No open positions.</div>
    </div>
  </div>

  <div class="tr-order-card">
    <div class="tr-order-row">
      <div class="tr-order-field">
        <label>Leverage</label>
        <select id="trLeverageSelect"></select>
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
    <label class="tr-order-toggle"><input type="checkbox" id="trTpslToggle"> Set TP / SL with entry</label>
    <div class="tr-order-row" id="trTpslRow" style="display:none">
      <div class="tr-order-field"><label>Take Profit</label><input type="number" id="trTpInput" step="any" placeholder="Optional"></div>
      <div class="tr-order-field"><label>Stop Loss</label><input type="number" id="trSlInput" step="any" placeholder="Optional"></div>
    </div>
    <div class="tr-side-buttons">
      <button type="button" class="tr-side-btn long" id="trLongBtn">Long</button>
      <button type="button" class="tr-side-btn short" id="trShortBtn">Short</button>
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

<div class="tr-overlay" id="trConfirmOverlay" style="align-items:center">
  <div class="tr-confirm-panel">
    <div class="tr-confirm-title" id="trConfirmTitle">Confirm Order</div>
    <div id="trConfirmBody"></div>
    <div class="tr-confirm-actions">
      <button type="button" class="tr-confirm-cancel" id="trConfirmCancelBtn">Cancel</button>
      <button type="button" class="tr-confirm-ok" id="trConfirmOkBtn">Confirm</button>
    </div>
  </div>
</div>

<div class="tr-overlay" id="trTpslOverlay" style="align-items:center">
  <div class="tr-tpsl-panel">
    <div class="tr-confirm-title" id="trTpslTitle">Edit TP / SL</div>
    <div class="tr-order-field"><label>Take Profit</label><input type="number" id="trEditTpInput" step="any" placeholder="Optional"></div>
    <div class="tr-order-field"><label>Stop Loss</label><input type="number" id="trEditSlInput" step="any" placeholder="Optional"></div>
    <div class="tr-confirm-actions">
      <button type="button" class="tr-confirm-cancel" id="trTpslCancelBtn">Cancel</button>
      <button type="button" class="tr-tpsl-save" id="trTpslSaveBtn" style="flex:1">Save</button>
    </div>
  </div>
</div>

<div class="tr-overlay" id="trShareOverlay" style="align-items:center">
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
        <div><span class="tr-share-meta-label">Mark</span><span class="tr-share-meta-val" id="trShareMark">-</span></div>
      </div>
      <div class="tr-share-footer">
        <div class="tr-share-footer-brand">ES TEAMS TV</div>
        <div class="tr-share-footer-url">esteamstv.devs.surf</div>
        <div class="tr-share-footer-ts" id="trShareTimestamp">-</div>
      </div>
    </div>
    <button type="button" class="tr-share-save-btn" id="trShareSaveBtn">
      <svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>
      <span id="trShareSaveLabel">Save Image</span>
    </button>
  </div>
</div>

<div class="tr-share-canvas-wrap"><canvas id="trShareCanvas" width="760" height="760"></canvas></div>
<div class="tr-toast" id="trToast"></div>

<script nonce="__CSP_NONCE__">
(function(){
  var CATEGORY = 'linear';
  var symbol = 'BTCUSDT';
  var allSymbols = [];
  var instrumentInfo = null;
  var tvWidget = null;
  var positionsTimer = null;
  var positions = [];
  var lastPrice = null;
  var firstPrice = null;
  var shareUsdt = false;
  var FAVORITES_KEY = 'trFavoritePairs';
  var LAST_SYMBOL_KEY = 'trLastSymbol';
  var pressTimer = null;

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
    var res = await fetch(url);
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  async function postJSON(url, body){
    var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
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

  function initChart(){
    var container = document.getElementById('tvChartContainer');
    container.innerHTML = '';
    var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    tvWidget = new TradingView.widget({
      autosize: true,
      symbol: 'BYBIT:' + symbol + '.P',
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

  async function loadTicker(){
    try {
      var data = await getJSON('/api/tools/trading/klines?category=' + CATEGORY + '&symbol=' + symbol + '&interval=15');
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
  }

  function positionRoi(pos){
    return pos.positionValue ? (pos.unrealizedPnl / pos.positionValue) * 100 * (pos.leverage || 1) : 0;
  }

  function renderPositions(){
    var row = document.getElementById('trPositionsRow');
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
      return '<div class="tr-position-card ' + sideLower + (isActive ? ' active' : '') + '" data-symbol="' + esc(pos.symbol) + '">' +
        '<div class="tr-pc-head">' +
          '<span class="tr-pc-symbol">' + esc(pos.symbol) + '</span>' +
          '<span><span class="tr-pc-side ' + sideLower + '">' + sideLabel + '</span><span class="tr-pc-lev">' + pos.leverage + 'x</span></span>' +
        '</div>' +
        '<div class="tr-pc-pnl ' + pnlSign + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</div>' +
        '<div class="tr-pc-meta"><span>Entry <b>' + formatPrice(pos.entryPrice) + '</b></span><span>Mark <b>' + formatPrice(pos.markPrice) + '</b></span></div>' +
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
    try {
      var data = await getJSON('/api/tools/trading/positions?category=' + CATEGORY);
      positions = data.positions || [];
      renderPositions();
      var equityEl = document.getElementById('trEquity');
      var availEl = document.getElementById('trAvailable');
      if (data.equity != null) equityEl.textContent = '$' + data.equity.toFixed(2);
      if (data.available != null) availEl.textContent = data.available.toFixed(2);
      updateEstMargin();
    } catch (err) {
      console.error(err);
    }
  }

  function startPositionsPolling(){
    if (positionsTimer) clearInterval(positionsTimer);
    pollPositions();
    positionsTimer = setInterval(pollPositions, 3000);
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

  function closeConfirmOverlay(){
    document.getElementById('trConfirmOverlay').classList.remove('show');
  }
  document.getElementById('trConfirmCancelBtn').addEventListener('click', closeConfirmOverlay);
  document.getElementById('trConfirmOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trConfirmOverlay') closeConfirmOverlay();
  });

  function openTpslEditor(sym){
    var pos = positions.find(function(p){ return p.symbol === sym; });
    if (!pos) return;
    document.getElementById('trTpslTitle').textContent = 'Edit TP / SL \\u00b7 ' + sym;
    document.getElementById('trEditTpInput').value = pos.takeProfit || '';
    document.getElementById('trEditSlInput').value = pos.stopLoss || '';
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
  });

  async function loadInstrumentInfo(){
    try {
      instrumentInfo = await getJSON('/api/tools/trading/instrument?category=' + CATEGORY + '&symbol=' + symbol);
      var levSelect = document.getElementById('trLeverageSelect');
      var maxLev = Math.max(1, Math.floor(Number(instrumentInfo.maxLeverage) || 1));
      var options = [1, 2, 3, 5, 10, 15, 20, 25, 35, 50, 75, 100].filter(function(l){ return l <= maxLev; });
      if (!options.length) options = [1];
      if (options[options.length - 1] !== maxLev) options.push(maxLev);
      levSelect.innerHTML = options.map(function(l){ return '<option value="' + l + '">' + l + 'x</option>'; }).join('');
      levSelect.value = options[Math.min(2, options.length - 1)];
    } catch (err) {
      instrumentInfo = null;
    }
  }

  function updateEstMargin(){
    var qty = Number(document.getElementById('trQtyInput').value || 0);
    var lev = Number(document.getElementById('trLeverageSelect').value || 1);
    var margin = lastPrice && qty ? (qty * lastPrice) / lev : 0;
    document.getElementById('trEstMargin').textContent = margin ? margin.toFixed(2) : '--';
  }
  document.getElementById('trQtyInput').addEventListener('input', updateEstMargin);
  document.getElementById('trLeverageSelect').addEventListener('change', updateEstMargin);

  document.getElementById('trSizeSlider').addEventListener('input', function(e){
    document.getElementById('trSizePct').textContent = e.target.value + '%';
    applySizePct(Number(e.target.value));
  });
  document.querySelectorAll('.tr-size-preset').forEach(function(btn){
    btn.addEventListener('click', function(){
      var pct = Number(btn.getAttribute('data-pct'));
      document.getElementById('trSizeSlider').value = pct;
      document.getElementById('trSizePct').textContent = pct + '%';
      applySizePct(pct);
    });
  });
  function applySizePct(pct){
    var available = Number((document.getElementById('trAvailable').textContent || '0').replace(/,/g, '')) || 0;
    var lev = Number(document.getElementById('trLeverageSelect').value || 1);
    if (!lastPrice || !available) return;
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
    var lev = document.getElementById('trLeverageSelect').value;
    if (!qty || Number(qty) <= 0) { toast('Enter a quantity first.'); return; }
    var tpsl = document.getElementById('trTpslToggle').checked;
    var tp = tpsl ? document.getElementById('trTpInput').value : '';
    var sl = tpsl ? document.getElementById('trSlInput').value : '';
    document.getElementById('trConfirmTitle').textContent = side === 'Buy' ? 'Confirm Long' : 'Confirm Short';
    document.getElementById('trConfirmBody').innerHTML =
      '<div class="tr-confirm-row"><span>Symbol</span><span>' + esc(symbol) + '</span></div>' +
      '<div class="tr-confirm-row"><span>Side</span><span>' + (side === 'Buy' ? 'Long' : 'Short') + '</span></div>' +
      '<div class="tr-confirm-row"><span>Leverage</span><span>' + lev + 'x</span></div>' +
      '<div class="tr-confirm-row"><span>Quantity</span><span>' + qty + '</span></div>' +
      (tp ? '<div class="tr-confirm-row"><span>Take Profit</span><span>' + tp + '</span></div>' : '') +
      (sl ? '<div class="tr-confirm-row"><span>Stop Loss</span><span>' + sl + '</span></div>' : '');
    var okBtn = document.getElementById('trConfirmOkBtn');
    okBtn.className = 'tr-confirm-ok ' + (side === 'Buy' ? 'long' : 'short');
    okBtn.textContent = side === 'Buy' ? 'Confirm Long' : 'Confirm Short';
    okBtn.onclick = async function(){
      okBtn.disabled = true;
      try {
        await postJSON('/api/tools/trading/order', { category: CATEGORY, symbol: symbol, side: side, qty: qty, leverage: lev });
        if (tp || sl) {
          await postJSON('/api/tools/trading/tpsl', { category: CATEGORY, symbol: symbol, takeProfit: tp, stopLoss: sl }).catch(function(){});
        }
        toast('Order placed.');
        closeConfirmOverlay();
        document.getElementById('trQtyInput').value = '';
        document.getElementById('trSizeSlider').value = 0;
        document.getElementById('trSizePct').textContent = '0%';
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
    var isProfit = pct >= 0;
    var pnlColor = isProfit ? '#12C48B' : '#FF3B5C';
    var sideColor = sideLower === 'long' ? '#12C48B' : '#FF3B5C';

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#15151F');
    bg.addColorStop(1, '#0A0A0F');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W * 0.18, 44, 30, W * 0.18, 44, 360);
    glow.addColorStop(0, sideLower === 'long' ? 'rgba(18,196,139,.16)' : 'rgba(255,59,92,.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00E0FF';
    ctx.font = '700 21px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', 48, 70);

    var chipLabel = sideLabel.toUpperCase() + '  \\u00b7  ' + (pos.leverage || 1) + 'x';
    ctx.font = '800 17px "Space Grotesk", sans-serif';
    var chipW = ctx.measureText(chipLabel).width + 32;
    var chipX = W - 48 - chipW, chipY = 44, chipH = 34;
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
    ctx.font = '700 28px "Space Grotesk", sans-serif';
    ctx.fillText(pos.symbol, W / 2, 162);

    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 15px Inter, sans-serif';
    ctx.fillText('ROI', W / 2, 210);

    ctx.fillStyle = pnlColor;
    ctx.font = '800 90px "Space Grotesk", sans-serif';
    ctx.fillText((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', W / 2, 315);

    var nextY = 345;
    if (shareUsdt) {
      ctx.fillStyle = pnlColor;
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillText((pos.unrealizedPnl >= 0 ? '+' : '') + pos.unrealizedPnl.toFixed(2) + ' USDT', W / 2, nextY);
      nextY += 30;
    }

    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(48, nextY + 20);
    ctx.lineTo(W - 48, nextY + 20);
    ctx.stroke();

    var rowY = nextY + 60;
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY', 48, rowY);
    ctx.textAlign = 'right';
    ctx.fillText('MARK', W - 48, rowY);

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 21px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(pos.entryPrice), 48, rowY + 28);
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(pos.markPrice), W - 48, rowY + 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', W / 2, H - 68);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.fillText('esteamstv.devs.surf', W / 2, H - 44);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText(timestampText, W / 2, H - 22);
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
    try {
      var data = await getJSON('/api/tools/trading/symbols?category=' + CATEGORY);
      allSymbols = data.symbols || [];
    } catch (err) {
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

    var favSet = getFavorites();
    list.querySelectorAll('[data-symbol]').forEach(function(item){
      var sym = item.getAttribute('data-symbol');
      bindPressAndTap(item, sym);
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
    var timer = null;
    var start = function(){
      longPressed = false;
      timer = setTimeout(function(){
        longPressed = true;
        toggleFavorite(sym);
        renderSearchList(document.getElementById('trSearchInput').value);
      }, 500);
    };
    var cancel = function(){ if (timer) clearTimeout(timer); };
    item.addEventListener('touchstart', start, { passive: true });
    item.addEventListener('touchend', function(){ cancel(); if (!longPressed) { switchSymbol(sym); closeSearch(); } });
    item.addEventListener('touchmove', cancel);
    item.addEventListener('mousedown', start);
    item.addEventListener('mouseup', function(){ cancel(); if (!longPressed) { switchSymbol(sym); closeSearch(); } });
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
