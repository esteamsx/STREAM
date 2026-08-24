import { siteHeadFor } from "../../config/site.js";

const PAGE_BUILD = "trading-2";

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
<script nonce="__CSP_NONCE__" src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
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
.tr-nav{
  position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:12px;padding:14px 16px;
  background:rgba(10,10,15,.85);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);
}
:root[data-theme="light"] .tr-nav{background:rgba(245,246,250,.88)}
.tr-back{background:transparent;border:none;color:var(--text);display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px}
.tr-back svg{width:20px;height:20px}
.tr-title{font-family:var(--font-display);font-weight:700;font-size:1rem}
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

.tr-interval-row{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto}
.tr-interval-btn{
  flex-shrink:0;padding:7px 14px;border-radius:10px;background:var(--card);border:1px solid var(--border-strong);
  color:var(--muted);font-size:.78rem;font-weight:700;font-family:var(--font-display);
}
.tr-interval-btn.active{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;border-color:transparent}

.tr-chart-card{
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:10px 4px 4px;margin-bottom:14px;overflow:hidden;
}
#trChart{width:100%;height:320px}
.tr-live-dot{display:inline-flex;align-items:center;gap:5px;font-size:.68rem;color:var(--muted);padding:0 10px 8px}
.tr-live-dot .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:trPulse 1.6s ease-in-out infinite}
@keyframes trPulse{0%,100%{opacity:1}50%{opacity:.3}}

.tr-pnl-card{
  position:relative;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:18px;margin-bottom:14px;
}
.tr-pnl-card.has-pos.long{border-color:rgba(18,196,139,.4)}
.tr-pnl-card.has-pos.short{border-color:rgba(255,59,92,.4)}
.tr-pnl-empty{text-align:center;color:var(--muted);font-size:.86rem;padding:20px 0}
.tr-pnl-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.tr-pnl-side{
  display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:800;font-size:.78rem;
  padding:4px 10px;border-radius:8px;text-transform:uppercase;letter-spacing:.03em;
}
.tr-pnl-side.long{background:rgba(18,196,139,.15);color:var(--green)}
.tr-pnl-side.short{background:rgba(255,59,92,.15);color:var(--red)}
.tr-pnl-lev{font-size:.76rem;color:var(--muted);font-weight:600}
.tr-pnl-label{font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:4px}
.tr-pnl-amount{font-family:var(--font-display);font-size:2.1rem;font-weight:800;line-height:1}
.tr-pnl-amount.pos{color:var(--green)}
.tr-pnl-amount.neg{color:var(--red)}
.tr-pnl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.tr-pnl-stat{background:var(--card2);border-radius:10px;padding:9px 12px}
.tr-pnl-stat .label{font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.tr-pnl-stat .value{font-family:var(--font-mono);font-size:.86rem;font-weight:600;margin-top:2px}
.tr-share-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-top:16px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:12px;color:#04141a;
  font-family:var(--font-display);font-weight:700;font-size:.86rem;
}
.tr-share-btn svg{width:16px;height:16px}

.tr-overlay{
  position:fixed;inset:0;z-index:100;background:rgba(10,10,15,.75);backdrop-filter:blur(10px);
  display:none;align-items:flex-start;justify-content:center;padding:24px 14px;overflow-y:auto;
}
:root[data-theme="light"] .tr-overlay{background:rgba(20,20,28,.45)}
.tr-overlay.show{display:flex}
body:has(.tr-overlay.show){overflow:hidden}

.tr-search-panel{width:100%;max-width:420px;max-height:80vh;margin-top:36px;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.tr-search-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border)}
.tr-search-input-row input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:.92rem;font-family:var(--font-body)}
.tr-search-close{background:transparent;border:none;color:var(--muted);display:flex}
.tr-search-close svg{width:20px;height:20px}
.tr-search-list{overflow-y:auto;padding:6px}
.tr-search-item{width:100%;text-align:left;padding:11px 14px;background:transparent;border:none;color:var(--text);font-family:var(--font-display);font-weight:600;font-size:.86rem;border-radius:10px}
.tr-search-item:active{background:var(--card2)}

.tr-share-inner{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;max-width:380px;margin:auto 0;position:relative}
.tr-share-close{position:absolute;top:-46px;right:0;background:rgba(255,255,255,.1);border:none;color:var(--text);width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.tr-share-close svg{width:18px;height:18px}
.tr-share-card{
  position:relative;width:100%;background:linear-gradient(165deg,var(--card),var(--card2));
  border:1px solid var(--border-strong);border-radius:20px;padding:28px 24px 22px;overflow:hidden;
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
.tr-share-side-chip{
  font-family:var(--font-display);font-weight:800;font-size:.68rem;letter-spacing:.04em;text-transform:uppercase;
  padding:5px 11px;border-radius:20px;border:1px solid transparent;
}
.tr-share-side-chip.long{background:rgba(18,196,139,.14);color:var(--green);border-color:rgba(18,196,139,.3)}
.tr-share-side-chip.short{background:rgba(255,59,92,.14);color:var(--red);border-color:rgba(255,59,92,.3)}
.tr-share-symbol{font-family:var(--font-display);font-weight:700;font-size:1.1rem;color:var(--text);text-align:center;margin-bottom:22px;position:relative}
.tr-share-roi-label{font-size:.64rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);text-align:center;margin-bottom:6px;position:relative}
.tr-share-roi{font-family:var(--font-display);font-weight:800;font-size:2.7rem;text-align:center;line-height:1;margin-bottom:24px;position:relative}
.tr-share-roi.pos{color:var(--green)}
.tr-share-roi.neg{color:var(--red)}
.tr-share-divider{height:1px;background:var(--border-strong);margin-bottom:16px;position:relative}
.tr-share-meta-row{display:flex;justify-content:space-between;margin-bottom:24px;position:relative}
.tr-share-meta-label{display:block;font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:3px}
.tr-share-meta-val{display:block;font-family:var(--font-mono);font-size:.82rem;color:var(--text)}
.tr-share-meta-row div:last-child{text-align:right}
.tr-share-footer{text-align:center;position:relative}
.tr-share-footer-brand{font-family:var(--font-display);font-weight:800;font-size:.88rem;color:var(--text)}
.tr-share-footer-url{font-size:.66rem;color:var(--muted);margin-top:2px}
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
.tr-btn-spinner{
  width:15px;height:15px;border:2px solid rgba(4,20,26,.35);border-top-color:#04141a;
  border-radius:50%;display:inline-block;animation:trSpin .6s linear infinite;
}

.tr-share-canvas-wrap{display:none}
</style>
</head>
<body>

<div class="tr-nav">
  <button type="button" class="tr-back" id="trBackBtn">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
  </button>
  <div class="tr-title">Trading</div>
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

  <div class="tr-interval-row" id="trIntervalRow">
    <button type="button" class="tr-interval-btn" data-interval="1">1m</button>
    <button type="button" class="tr-interval-btn" data-interval="5">5m</button>
    <button type="button" class="tr-interval-btn active" data-interval="15">15m</button>
    <button type="button" class="tr-interval-btn" data-interval="60">1h</button>
    <button type="button" class="tr-interval-btn" data-interval="240">4h</button>
    <button type="button" class="tr-interval-btn" data-interval="D">1d</button>
  </div>

  <div class="tr-chart-card">
    <div id="trChart"></div>
    <div class="tr-live-dot"><span class="dot"></span>Live</div>
  </div>

  <div class="tr-pnl-card" id="trPnlCard">
    <div class="tr-pnl-empty" id="trPnlEmpty">No open position on this pair.</div>
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
      <div class="tr-share-roi-label">ROI</div>
      <div class="tr-share-roi" id="trShareRoi">+0.00%</div>
      <div class="tr-share-divider"></div>
      <div class="tr-share-meta-row">
        <div><span class="tr-share-meta-label">Entry</span><span class="tr-share-meta-val" id="trShareEntry">-</span></div>
        <div><span class="tr-share-meta-label">Mark</span><span class="tr-share-meta-val" id="trShareMark">-</span></div>
      </div>
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

<div class="tr-share-canvas-wrap"><canvas id="trShareCanvas" width="1080" height="1080"></canvas></div>

<script nonce="__CSP_NONCE__">
(function(){
  var CATEGORY = 'linear';
  var symbol = 'BTCUSDT';
  var interval = '15';
  var allSymbols = [];
  var chart = null;
  var candleSeries = null;
  var ws = null;
  var positionTimer = null;
  var lastPosition = null;
  var lastPrice = null;
  var firstPrice = null;

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  async function getJSON(url){
    var res = await fetch(url);
    var data = await res.json().catch(function(){ return {}; });
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  document.getElementById('trBackBtn').addEventListener('click', function(){
    if (window.history.length > 1) window.history.back();
    else location.href = '/tools';
  });

  function initChart(){
    var el = document.getElementById('trChart');
    chart = LightweightCharts.createChart(el, {
      layout: { background: { color: 'transparent' }, textColor: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8a8fa3' },
      grid: { vertLines: { color: 'rgba(255,255,255,.05)' }, horzLines: { color: 'rgba(255,255,255,.05)' } },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255,255,255,.08)' },
      rightPriceScale: { borderColor: 'rgba(255,255,255,.08)' },
      crosshair: { mode: 0 },
      height: 320,
    });
    candleSeries = chart.addCandlestickSeries({
      upColor: '#12C48B', downColor: '#FF3B5C', borderVisible: false,
      wickUpColor: '#12C48B', wickDownColor: '#FF3B5C',
    });
    window.addEventListener('resize', function(){
      chart.applyOptions({ width: el.clientWidth });
    });
    chart.applyOptions({ width: el.clientWidth });
  }

  async function loadKlines(){
    try {
      var data = await getJSON('/api/tools/trading/klines?category=' + CATEGORY + '&symbol=' + symbol + '&interval=' + interval);
      var list = (data.list || []).slice().reverse();
      var candles = list.map(function(c){
        return { time: Math.floor(Number(c[0]) / 1000), open: Number(c[1]), high: Number(c[2]), low: Number(c[3]), close: Number(c[4]) };
      });
      candleSeries.setData(candles);
      if (candles.length) {
        firstPrice = candles[0].open;
        updatePairPrice(candles[candles.length - 1].close);
      }
    } catch (err) {
      console.error(err);
    }
  }

  function updatePairPrice(price){
    lastPrice = price;
    var priceEl = document.getElementById('trPairPrice');
    priceEl.textContent = formatPrice(price);
    if (firstPrice != null) {
      priceEl.classList.toggle('up', price >= firstPrice);
      priceEl.classList.toggle('down', price < firstPrice);
    }
  }

  function formatPrice(p){
    if (p == null) return '--';
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  }

  function connectWs(){
    if (ws) { try { ws.close(); } catch(e){} }
    ws = new WebSocket('wss://stream.bybit.com/v5/public/' + CATEGORY);
    ws.addEventListener('open', function(){
      ws.send(JSON.stringify({ op: 'subscribe', args: ['kline.' + interval + '.' + symbol] }));
    });
    ws.addEventListener('message', function(ev){
      try {
        var msg = JSON.parse(ev.data);
        if (msg.topic && msg.topic.indexOf('kline.') === 0 && msg.data && msg.data[0]) {
          var k = msg.data[0];
          var bar = {
            time: Math.floor(Number(k.start) / 1000),
            open: Number(k.open), high: Number(k.high), low: Number(k.low), close: Number(k.close),
          };
          candleSeries.update(bar);
          updatePairPrice(bar.close);
        }
      } catch (e) {}
    });
    ws.addEventListener('close', function(){
      setTimeout(function(){ if (ws && ws.readyState === WebSocket.CLOSED) connectWs(); }, 3000);
    });
  }

  function positionRoi(pos){
    var pnl = pos.unrealizedPnl || 0;
    return pos.positionValue ? (pnl / pos.positionValue) * 100 * (pos.leverage || 1) : 0;
  }

  function renderPosition(pos){
    var card = document.getElementById('trPnlCard');
    if (!pos || !pos.hasPosition) {
      card.className = 'tr-pnl-card';
      card.innerHTML = '<div class="tr-pnl-empty" id="trPnlEmpty">No open position on this pair.' +
        (pos && pos.equity != null ? '<div style="margin-top:8px;font-size:.76rem">Account equity: $' + pos.equity.toFixed(2) + '</div>' : '') +
        '</div>';
      lastPosition = null;
      return;
    }
    lastPosition = pos;
    var sideLower = pos.side === 'Buy' || pos.side === 'LONG' ? 'long' : 'short';
    var sideLabel = sideLower === 'long' ? 'Long' : 'Short';
    var pct = positionRoi(pos);
    var pnlSign = pct >= 0 ? 'pos' : 'neg';

    card.className = 'tr-pnl-card has-pos ' + sideLower;
    card.innerHTML =
      '<div class="tr-pnl-head">' +
        '<span class="tr-pnl-side ' + sideLower + '">' + sideLabel + ' ' + esc(symbol) + '</span>' +
        '<span class="tr-pnl-lev">' + esc(pos.leverage) + 'x</span>' +
      '</div>' +
      '<div class="tr-pnl-label">ROI</div>' +
      '<div class="tr-pnl-amount ' + pnlSign + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</div>' +
      '<div class="tr-pnl-grid">' +
        '<div class="tr-pnl-stat"><div class="label">Entry Price</div><div class="value">' + formatPrice(pos.entryPrice) + '</div></div>' +
        '<div class="tr-pnl-stat"><div class="label">Mark Price</div><div class="value">' + formatPrice(pos.markPrice) + '</div></div>' +
        '<div class="tr-pnl-stat"><div class="label">Size</div><div class="value">' + pos.size + '</div></div>' +
        '<div class="tr-pnl-stat"><div class="label">Liq. Price</div><div class="value">' + (pos.liqPrice ? formatPrice(pos.liqPrice) : '--') + '</div></div>' +
      '</div>' +
      '<button type="button" class="tr-share-btn" id="trShareBtn">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v14"/></svg>' +
        'Share PnL' +
      '</button>';
    document.getElementById('trShareBtn').addEventListener('click', function(){ openShareOverlay(pos, sideLower, sideLabel, pct); });
  }

  async function pollPosition(){
    try {
      var pos = await getJSON('/api/tools/trading/position?category=' + CATEGORY + '&symbol=' + symbol);
      renderPosition(pos);
    } catch (err) {
      var card = document.getElementById('trPnlCard');
      card.className = 'tr-pnl-card';
      card.innerHTML = '<div class="tr-pnl-empty">' + esc(err.message || 'Could not load your position.') + '</div>';
    }
  }

  function startPositionPolling(){
    if (positionTimer) clearInterval(positionTimer);
    pollPosition();
    positionTimer = setInterval(pollPosition, 2000);
  }

  function openShareOverlay(pos, sideLower, sideLabel, pct){
    var pnlSign = pct >= 0 ? 'pos' : 'neg';
    document.getElementById('trShareCard').className = 'tr-share-card ' + sideLower;
    var chip = document.getElementById('trShareSideChip');
    chip.className = 'tr-share-side-chip ' + sideLower;
    chip.textContent = sideLabel.toUpperCase() + ' \\u00b7 ' + (pos.leverage || 1) + 'x';
    document.getElementById('trShareSymbol').textContent = symbol;
    var roiEl = document.getElementById('trShareRoi');
    roiEl.className = 'tr-share-roi ' + pnlSign;
    roiEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    document.getElementById('trShareEntry').textContent = formatPrice(pos.entryPrice);
    document.getElementById('trShareMark').textContent = formatPrice(pos.markPrice);
    document.getElementById('trShareOverlay').classList.add('show');
  }

  function closeShareOverlay(){
    document.getElementById('trShareOverlay').classList.remove('show');
  }

  document.getElementById('trShareCloseBtn').addEventListener('click', closeShareOverlay);
  document.getElementById('trShareOverlay').addEventListener('click', function(e){
    if (e.target.id === 'trShareOverlay') closeShareOverlay();
  });

  function drawShareCanvas(pos, sideLower, sideLabel, pct){
    var canvas = document.getElementById('trShareCanvas');
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var isProfit = pct >= 0;
    var accent = isProfit ? '#12C48B' : '#FF3B5C';

    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#15151F');
    bg.addColorStop(1, '#0A0A0F');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(W * 0.18, 60, 40, W * 0.18, 60, 520);
    glow.addColorStop(0, isProfit ? 'rgba(18,196,139,.16)' : 'rgba(255,59,92,.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#00E0FF';
    ctx.font = '700 30px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', 70, 100);

    var chipLabel = sideLabel.toUpperCase() + '  \\u00b7  ' + (pos.leverage || 1) + 'x';
    ctx.font = '800 24px "Space Grotesk", sans-serif';
    var chipW = ctx.measureText(chipLabel).width + 44;
    var chipX = W - 70 - chipW, chipY = 62, chipH = 46;
    ctx.fillStyle = isProfit ? 'rgba(18,196,139,.16)' : 'rgba(255,59,92,.16)';
    roundRect(ctx, chipX, chipY, chipW, chipH, 23);
    ctx.fill();
    ctx.strokeStyle = isProfit ? 'rgba(18,196,139,.4)' : 'rgba(255,59,92,.4)';
    ctx.lineWidth = 2;
    roundRect(ctx, chipX, chipY, chipW, chipH, 23);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.fillText(chipLabel, chipX + chipW / 2, chipY + 31);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '700 40px "Space Grotesk", sans-serif';
    ctx.fillText(symbol, W / 2, 230);

    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('ROI', W / 2, 300);

    ctx.fillStyle = accent;
    ctx.font = '800 130px "Space Grotesk", sans-serif';
    ctx.fillText((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', W / 2, 460);

    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 560);
    ctx.lineTo(W - 70, 560);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY', 70, 620);
    ctx.textAlign = 'right';
    ctx.fillText('MARK', W - 70, 620);

    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '600 30px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(pos.entryPrice), 70, 660);
    ctx.textAlign = 'right';
    ctx.fillText(formatPrice(pos.markPrice), W - 70, 660);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', W / 2, 970);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText('esteamstv.devs.surf', W / 2, 1010);
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  document.getElementById('trShareSaveBtn').addEventListener('click', async function(){
    if (!lastPosition) return;
    var pos = lastPosition;
    var sideLower = pos.side === 'Buy' || pos.side === 'LONG' ? 'long' : 'short';
    var sideLabel = sideLower === 'long' ? 'Long' : 'Short';
    var pct = positionRoi(pos);
    var btn = document.getElementById('trShareSaveBtn');
    var icon = document.getElementById('trShareSaveIcon');
    var label = document.getElementById('trShareSaveLabel');
    btn.disabled = true;
    btn.classList.remove('saved');
    icon.outerHTML = '<span class="tr-btn-spinner" id="trShareSaveIcon"></span>';
    label.textContent = 'Preparing\\u2026';
    try {
      drawShareCanvas(pos, sideLower, sideLabel, pct);
      var canvas = document.getElementById('trShareCanvas');
      var blob = await new Promise(function(resolve){ canvas.toBlob(resolve, 'image/png'); });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = symbol + '-pnl-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
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
      }, 1800);
    } catch (err) {
      document.getElementById('trShareSaveIcon').outerHTML =
        '<svg id="trShareSaveIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16"/></svg>';
      label.textContent = 'Save Image';
      btn.disabled = false;
    }
  });

  async function loadSymbols(){
    try {
      var data = await getJSON('/api/tools/trading/symbols?category=' + CATEGORY);
      allSymbols = data.symbols || [];
    } catch (err) {
      allSymbols = [];
    }
  }

  function renderSearchList(filter){
    var list = document.getElementById('trSearchList');
    var f = (filter || '').toUpperCase();
    var matches = allSymbols.filter(function(s){ return s.indexOf(f) !== -1; }).slice(0, 60);
    if (!matches.length) { list.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:.82rem">No matches.</div>'; return; }
    list.innerHTML = matches.map(function(s){
      return '<button type="button" class="tr-search-item" data-symbol="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('');
    list.querySelectorAll('[data-symbol]').forEach(function(btn){
      btn.addEventListener('click', function(){ switchSymbol(btn.getAttribute('data-symbol')); closeSearch(); });
    });
  }

  function openSearch(){
    document.getElementById('trSearchOverlay').classList.add('show');
    document.getElementById('trSearchInput').value = '';
    renderSearchList('');
    document.getElementById('trSearchInput').focus();
  }
  function closeSearch(){
    document.getElementById('trSearchOverlay').classList.remove('show');
  }

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
    document.getElementById('trPairSymbol').textContent = symbol;
    firstPrice = null;
    loadKlines();
    connectWs();
    startPositionPolling();
  }

  document.getElementById('trIntervalRow').addEventListener('click', function(e){
    var btn = e.target.closest('.tr-interval-btn');
    if (!btn) return;
    document.querySelectorAll('.tr-interval-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    interval = btn.getAttribute('data-interval');
    loadKlines();
    connectWs();
  });

  initChart();
  loadKlines();
  connectWs();
  loadSymbols();
  startPositionPolling();
})();
</script>
</body>
</html>`;
}
