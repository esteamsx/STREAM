import { siteHeadFor } from "../../config/site.js";

const PAGE_BUILD = "trading-1";

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
*{box-sizing:border-box}
body{margin:0;background:var(--dark);color:var(--text);font-family:'Inter',sans-serif;padding-bottom:40px}
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
.tr-pair-price{font-family:'JetBrains Mono',monospace;font-size:.86rem;font-weight:600}
.tr-pair-price.up{color:#3DDC84}
.tr-pair-price.down{color:#ff3b5c}
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
.tr-live-dot .dot{width:6px;height:6px;border-radius:50%;background:#3DDC84;animation:trPulse 1.6s ease-in-out infinite}
@keyframes trPulse{0%,100%{opacity:1}50%{opacity:.3}}

.tr-pnl-card{
  position:relative;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:18px;margin-bottom:14px;
}
.tr-pnl-card.has-pos.long{border-color:rgba(61,220,132,.4)}
.tr-pnl-card.has-pos.short{border-color:rgba(255,59,92,.4)}
.tr-pnl-empty{text-align:center;color:var(--muted);font-size:.86rem;padding:20px 0}
.tr-pnl-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.tr-pnl-side{
  display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:800;font-size:.78rem;
  padding:4px 10px;border-radius:8px;text-transform:uppercase;letter-spacing:.03em;
}
.tr-pnl-side.long{background:rgba(61,220,132,.15);color:#3DDC84}
.tr-pnl-side.short{background:rgba(255,59,92,.15);color:#ff3b5c}
.tr-pnl-lev{font-size:.76rem;color:var(--muted);font-weight:600}
.tr-pnl-amount{font-family:var(--font-display);font-size:2.1rem;font-weight:800;line-height:1}
.tr-pnl-amount.pos{color:#3DDC84}
.tr-pnl-amount.neg{color:#ff3b5c}
.tr-pnl-pct{font-size:.86rem;font-weight:700;margin-top:2px}
.tr-pnl-pct.pos{color:#3DDC84}
.tr-pnl-pct.neg{color:#ff3b5c}
.tr-pnl-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}
.tr-pnl-stat{background:var(--card2);border-radius:10px;padding:9px 12px}
.tr-pnl-stat .label{font-size:.64rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;font-weight:700}
.tr-pnl-stat .value{font-family:'JetBrains Mono',monospace;font-size:.86rem;font-weight:600;margin-top:2px}
.tr-share-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-top:16px;
  background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:12px;color:#04141a;
  font-family:var(--font-display);font-weight:700;font-size:.86rem;
}
.tr-share-btn svg{width:16px;height:16px}

.tr-search-overlay{
  position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);display:none;align-items:flex-start;justify-content:center;padding-top:60px;
}
.tr-search-overlay.show{display:flex}
.tr-search-panel{width:92%;max-width:420px;max-height:70vh;background:var(--card);border:1px solid var(--border-strong);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}
.tr-search-input-row{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border)}
.tr-search-input-row input{flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:.92rem}
.tr-search-close{background:transparent;border:none;color:var(--muted);display:flex}
.tr-search-close svg{width:20px;height:20px}
.tr-search-list{overflow-y:auto;padding:6px}
.tr-search-item{width:100%;text-align:left;padding:11px 14px;background:transparent;border:none;color:var(--text);font-family:var(--font-display);font-weight:600;font-size:.86rem;border-radius:10px}
.tr-search-item:active{background:var(--card2)}

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

<div class="tr-search-overlay" id="trSearchOverlay">
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
      upColor: '#3DDC84', downColor: '#ff3b5c', borderVisible: false,
      wickUpColor: '#3DDC84', wickDownColor: '#ff3b5c',
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
    var pnl = pos.unrealizedPnl || 0;
    var pnlSign = pnl >= 0 ? 'pos' : 'neg';
    var pct = pos.positionValue ? (pnl / pos.positionValue) * 100 * (pos.leverage || 1) : 0;

    card.className = 'tr-pnl-card has-pos ' + sideLower;
    card.innerHTML =
      '<div class="tr-pnl-head">' +
        '<span class="tr-pnl-side ' + sideLower + '">' + sideLabel + ' ' + esc(symbol) + '</span>' +
        '<span class="tr-pnl-lev">' + esc(pos.leverage) + 'x</span>' +
      '</div>' +
      '<div class="tr-pnl-amount ' + pnlSign + '">' + (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2) + '</div>' +
      '<div class="tr-pnl-pct ' + pnlSign + '">' + (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%</div>' +
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
    document.getElementById('trShareBtn').addEventListener('click', function(){ generateShareCard(pos, sideLower, pnl, pct); });
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

  function generateShareCard(pos, sideLower, pnl, pct){
    var canvas = document.getElementById('trShareCanvas');
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var isProfit = pnl >= 0;
    var accent = isProfit ? '#3DDC84' : '#ff3b5c';

    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (isProfit) { bg.addColorStop(0, '#0a1f14'); bg.addColorStop(1, '#04140c'); }
    else { bg.addColorStop(0, '#22090f'); bg.addColorStop(1, '#140407'); }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (var i = 1; i < 8; i++) {
      var y = (H / 8) * i + (Math.sin(i) * 30);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (var x = 0; x <= W; x += 40) {
        ctx.lineTo(x, y + Math.sin((x + i * 80) / 90) * 22);
      }
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = '600 34px Inter, sans-serif';
    ctx.fillText(symbol, W / 2, 200);

    ctx.fillStyle = accent;
    ctx.font = '800 30px Inter, sans-serif';
    ctx.fillText((sideLower === 'long' ? 'LONG' : 'SHORT') + '  \\u00b7  ' + (pos.leverage || 1) + 'x', W / 2, 250);

    ctx.fillStyle = accent;
    ctx.font = '800 110px "Space Grotesk", sans-serif';
    ctx.fillText((pnl >= 0 ? '+' : '-') + '$' + Math.abs(pnl).toFixed(2), W / 2, 460);

    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillText((pct >= 0 ? '+' : '') + pct.toFixed(2) + '%', W / 2, 540);

    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '500 26px "JetBrains Mono", monospace';
    ctx.fillText('Entry ' + formatPrice(pos.entryPrice) + '   Mark ' + formatPrice(pos.markPrice), W / 2, 640);

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(140, 900);
    ctx.lineTo(W - 140, 900);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px "Space Grotesk", sans-serif';
    ctx.fillText('ES TEAMS TV', W / 2, 960);
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.font = '500 22px Inter, sans-serif';
    ctx.fillText('esteamstv.devs.surf', W / 2, 998);

    var link = document.createElement('a');
    link.download = symbol + '-pnl-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

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
