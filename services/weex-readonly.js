import crypto from "crypto";

const BASE_URL = "https://api-contract.weex.com";

function sign(secret, message) {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
}

function buildQueryString(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

function toWeexSymbol(symbol) {
  return `cmt_${String(symbol || "").toLowerCase()}`;
}

function fromWeexSymbol(symbol) {
  return String(symbol || "").replace(/^cmt_/, "").toUpperCase();
}

function granularityFor(interval) {
  const map = {
    "1": "1m", "3": "3m", "5": "5m", "15": "15m", "30": "30m",
    "60": "1H", "120": "2H", "240": "4H", "360": "6H", "720": "12H",
    "D": "1D", "W": "1W",
  };
  return map[String(interval)] || "15m";
}

async function readBody(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error((data && (data.msg || data.message || data.errorMessage)) || `HTTP ${res.status}`), { status: 502 });
  }
  if (data && typeof data === "object" && "code" in data && data.code !== "00000" && data.code !== 0 && data.code !== "0") {
    throw Object.assign(new Error(data.msg || data.message || `WEEX error: ${data.code}`), { status: 502 });
  }
  if (data && data.success === false) {
    throw Object.assign(new Error(data.errorMessage || data.errorCode || "WEEX order rejected."), { status: 502 });
  }
  return data && typeof data === "object" && "data" in data ? data.data : data;
}

async function publicGet(path, params = {}) {
  const qs = buildQueryString(params);
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  return readBody(res);
}

function requireKeys(demo) {
  const apiKey = demo ? process.env.WEEX_DEMO_API_KEY : process.env.WEEX_API_KEY;
  const apiSecret = demo ? process.env.WEEX_DEMO_API_SECRET : process.env.WEEX_API_SECRET;
  const passphrase = demo ? process.env.WEEX_DEMO_API_PASSPHRASE : process.env.WEEX_API_PASSPHRASE;
  if (!apiKey || !apiSecret || !passphrase) {
    throw Object.assign(new Error(demo ? "Demo trading is not connected to a WEEX demo account yet." : "Trading dashboard is not connected to a WEEX account yet."), { status: 503 });
  }
  return { apiKey, apiSecret, passphrase };
}

async function signedGet(demo, path, params = {}) {
  const { apiKey, apiSecret, passphrase } = requireKeys(demo);
  const qs = buildQueryString(params);
  const timestamp = Date.now().toString();
  const message = timestamp + "GET" + path + (qs ? `?${qs}` : "");
  const headers = {
    "ACCESS-KEY": apiKey,
    "ACCESS-SIGN": sign(apiSecret, message),
    "ACCESS-TIMESTAMP": timestamp,
    "ACCESS-PASSPHRASE": passphrase,
    "locale": "en-US",
    "Content-Type": "application/json",
  };
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  return readBody(res);
}

async function signedPost(demo, path, body = {}) {
  const { apiKey, apiSecret, passphrase } = requireKeys(demo);
  const bodyStr = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const message = timestamp + "POST" + path + bodyStr;
  const headers = {
    "ACCESS-KEY": apiKey,
    "ACCESS-SIGN": sign(apiSecret, message),
    "ACCESS-TIMESTAMP": timestamp,
    "ACCESS-PASSPHRASE": passphrase,
    "locale": "en-US",
    "Content-Type": "application/json",
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: bodyStr, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  return readBody(res);
}

function positionPath(demo) {
  return demo ? "/capi/v3/sim/position/allPosition" : "/capi/v2/account/position/allPosition";
}
function singlePositionPath(demo) {
  return demo ? "/capi/v3/sim/position/singlePosition" : "/capi/v2/account/position/singlePosition";
}
function balancePath(demo) {
  return demo ? "/capi/v3/sim/balance" : "/capi/v2/account/assets";
}
function orderPath(demo) {
  return demo ? "/capi/v3/sim/order" : "/capi/v3/order";
}
function leveragePath(demo) {
  return demo ? "/capi/v3/sim/leverage" : "/capi/v2/account/leverage";
}
function currentOrdersPath(demo) {
  return demo ? "/capi/v3/sim/order/current" : "/capi/v2/order/current";
}
function cancelOrderPath(demo) {
  return demo ? "/capi/v3/sim/order/cancel_order" : "/capi/v2/order/cancel_order";
}
function tpSlPath(demo) {
  return demo ? "/capi/v3/sim/order/placeTpSlOrder" : "/capi/v2/order/placeTpSlOrder";
}
function fillsPath(demo) {
  return demo ? "/capi/v3/sim/order/fills" : "/capi/v2/order/fills";
}

export async function getPublicKlines(category, symbol, interval, limit = 200, demo = false) {
  const result = await publicGet("/capi/v2/market/candles", {
    symbol: toWeexSymbol(symbol),
    granularity: granularityFor(interval),
    limit,
  });
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  const list = rows
    .map((row) => {
      if (Array.isArray(row)) {
        const [start, open, high, low, close, volume, turnover] = row;
        return [String(start), String(open), String(high), String(low), String(close), String(volume || 0), String(turnover || 0)];
      }
      return [
        String(row.time || row.ts || row.timestamp || 0),
        String(row.open),
        String(row.high),
        String(row.low),
        String(row.close),
        String(row.volume || row.baseVolume || 0),
        String(row.quoteVolume || row.turnover || 0),
      ];
    })
    .sort((a, b) => Number(b[0]) - Number(a[0]));
  return { list };
}

export function getPublicTicker(category, symbol, demo = false) {
  return publicGet("/capi/v2/market/ticker", { symbol: toWeexSymbol(symbol) });
}

export function getPublicInstruments(category, demo = false) {
  return publicGet("/capi/v2/market/contracts", {});
}

export async function getAllInstruments(category, demo = false) {
  const result = await publicGet("/capi/v2/market/contracts", {});
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  const list = rows
    .filter((c) => {
      const status = String(c.status || c.contractStatus || "").toLowerCase();
      return !status || status === "normal" || status === "trading" || status === "online";
    })
    .map((c) => ({
      symbol: fromWeexSymbol(c.symbol),
      quoteCoin: "USDT",
      status: "Trading",
    }));
  return { list };
}

export async function getInstrumentInfo(category, symbol, demo = false) {
  const result = await publicGet("/capi/v2/market/contracts", { symbol: toWeexSymbol(symbol) });
  const rows = Array.isArray(result) ? result : (result && result.list) || [result];
  const info = rows.find((c) => fromWeexSymbol(c.symbol) === String(symbol).toUpperCase()) || rows[0];
  if (!info) {
    throw Object.assign(new Error("Unknown trading pair."), { status: 404 });
  }
  const sizeDecimals = Number(info.volumePlace ?? info.sizeDecimals ?? 3);
  const priceDecimals = Number(info.pricePlace ?? info.priceDecimals ?? 2);
  return {
    symbol: fromWeexSymbol(info.symbol),
    qtyStep: info.minTradeNum ? String(info.minTradeNum) : (1 / 10 ** sizeDecimals).toFixed(sizeDecimals),
    minOrderQty: info.minTradeNum ? String(info.minTradeNum) : "0.001",
    maxOrderQty: info.maxTradeNum ? String(info.maxTradeNum) : "1000",
    minLeverage: "1",
    maxLeverage: info.maxLeverage ? String(info.maxLeverage) : "100",
    tickSize: (1 / 10 ** priceDecimals).toFixed(priceDecimals),
  };
}

export async function getLivePosition(category, symbol, demo = false) {
  const wSymbol = toWeexSymbol(symbol);
  const [posResult, assetsResult] = await Promise.all([
    signedGet(demo, singlePositionPath(demo), { symbol: wSymbol }),
    signedGet(demo, balancePath(demo), {}).catch(() => null),
  ]);
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || p.holdSize || 0) > 0);

  let equity = null;
  if (Array.isArray(assetsResult)) {
    const usdt = assetsResult.find((a) => a.marginCoin === "USDT" || a.coin === "USDT");
    if (usdt) equity = Number(usdt.equity || usdt.totalEquity || 0);
  }

  if (!pos) {
    return { hasPosition: false, equity };
  }

  return {
    hasPosition: true,
    equity,
    side: String(pos.side).toUpperCase() === "SHORT" ? "Sell" : "Buy",
    size: Number(pos.size || pos.holdSize || 0),
    entryPrice: Number(pos.avgPrice || pos.openPriceAvg || 0),
    markPrice: Number(pos.markPrice || 0),
    leverage: Number(pos.leverage || 1),
    unrealizedPnl: Number(pos.unrealizePnl || pos.unrealizedPnl || 0),
    positionValue: Number(pos.openValue || pos.margin || 0),
    liqPrice: pos.liquidatePrice ? Number(pos.liquidatePrice) : null,
  };
}

export async function getAllPositions(category, demo = false) {
  const [posResult, assetsResult] = await Promise.all([
    signedGet(demo, positionPath(demo), {}),
    signedGet(demo, balancePath(demo), {}).catch(() => null),
  ]);
  const rows = Array.isArray(posResult) ? posResult : (posResult && posResult.list) || [];
  const positions = rows
    .filter((p) => Number(p.size || p.holdSize || 0) > 0)
    .map((pos) => ({
      symbol: fromWeexSymbol(pos.symbol),
      side: String(pos.side).toUpperCase() === "SHORT" ? "Sell" : "Buy",
      size: Number(pos.size || pos.holdSize || 0),
      entryPrice: Number(pos.avgPrice || pos.openPriceAvg || 0),
      markPrice: Number(pos.markPrice || 0),
      leverage: Number(pos.leverage || 1),
      unrealizedPnl: Number(pos.unrealizePnl || pos.unrealizedPnl || 0),
      positionValue: Number(pos.openValue || pos.margin || 0),
      liqPrice: pos.liquidatePrice ? Number(pos.liquidatePrice) : null,
      takeProfit: pos.presetTakeProfitPrice ? Number(pos.presetTakeProfitPrice) : null,
      stopLoss: pos.presetStopLossPrice ? Number(pos.presetStopLossPrice) : null,
    }));

  let equity = null;
  let available = null;
  if (Array.isArray(assetsResult)) {
    const usdt = assetsResult.find((a) => a.marginCoin === "USDT" || a.coin === "USDT");
    if (usdt) {
      equity = Number(usdt.equity || usdt.totalEquity || 0);
      available = Number(usdt.available || usdt.availableBalance || 0);
    }
  }

  return { equity, available, positions };
}

export async function setLeverage(category, symbol, leverage, demo = false) {
  const wSymbol = toWeexSymbol(symbol);
  const lev = String(leverage);
  for (const side of ["long", "short"]) {
    try {
      await signedPost(demo, leveragePath(demo), { symbol: wSymbol, leverage: lev, side, marginMode: "isolated" });
    } catch (err) {}
  }
}

export async function placeOrder({ category, symbol, side, qty, leverage, orderType, price, demo = false }) {
  if (leverage) {
    await setLeverage(category, symbol, leverage, demo);
  }
  const isLimit = orderType === "Limit";
  const isBuy = side !== "Sell";
  const body = {
    symbol: toWeexSymbol(symbol),
    side: isBuy ? "BUY" : "SELL",
    positionSide: isBuy ? "LONG" : "SHORT",
    type: isLimit ? "LIMIT" : "MARKET",
    timeInForce: isLimit ? "GTC" : "IOC",
    quantity: String(qty),
    newClientOrderId: `estv${Date.now()}`,
  };
  if (isLimit) {
    if (!price) {
      throw Object.assign(new Error("A limit price is required for limit orders."), { status: 400 });
    }
    body.price = String(price);
  }
  return signedPost(demo, orderPath(demo), body);
}

export async function closePosition(category, symbol, percent, demo = false) {
  const wSymbol = toWeexSymbol(symbol);
  const posResult = await signedGet(demo, singlePositionPath(demo), { symbol: wSymbol });
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || p.holdSize || 0) > 0);
  if (!pos) {
    throw Object.assign(new Error("No open position on this pair."), { status: 400 });
  }
  const isLong = String(pos.side).toUpperCase() !== "SHORT";
  const pct = percent && percent > 0 && percent < 100 ? percent : 100;
  let qty = Number(pos.size || pos.holdSize || 0);
  if (pct < 100) {
    qty = (qty * pct) / 100;
    if (qty <= 0) qty = Number(pos.size || pos.holdSize || 0);
  }
  return signedPost(demo, orderPath(demo), {
    symbol: wSymbol,
    side: isLong ? "SELL" : "BUY",
    positionSide: isLong ? "LONG" : "SHORT",
    type: "MARKET",
    timeInForce: "IOC",
    quantity: String(qty),
    reduceOnly: true,
    newClientOrderId: `estv${Date.now()}`,
  });
}

export async function setTradingStop(category, symbol, { takeProfit, stopLoss, demo = false }) {
  const wSymbol = toWeexSymbol(symbol);
  const posResult = await signedGet(demo, singlePositionPath(demo), { symbol: wSymbol });
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || p.holdSize || 0) > 0);
  const positionSide = pos && String(pos.side).toUpperCase() === "SHORT" ? "short" : "long";
  const size = pos ? String(pos.size || pos.holdSize || 0) : "0";
  const tasks = [];
  if (takeProfit) {
    tasks.push(signedPost(demo, tpSlPath(demo), {
      symbol: wSymbol,
      clientOrderId: `estvtp${Date.now()}`,
      planType: "profit_plan",
      triggerPrice: String(takeProfit),
      executePrice: "0",
      size,
      positionSide,
      marginMode: 1,
    }));
  }
  if (stopLoss) {
    tasks.push(signedPost(demo, tpSlPath(demo), {
      symbol: wSymbol,
      clientOrderId: `estvsl${Date.now()}`,
      planType: "loss_plan",
      triggerPrice: String(stopLoss),
      executePrice: "0",
      size,
      positionSide,
      marginMode: 1,
    }));
  }
  return Promise.all(tasks);
}

export async function getOpenOrders(category, demo = false) {
  const result = await signedGet(demo, currentOrdersPath(demo), {});
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  return rows.map((o) => ({
    orderId: o.order_id || o.orderId,
    symbol: fromWeexSymbol(o.symbol),
    side: /short|sell/i.test(o.type || "") ? "Sell" : "Buy",
    orderType: o.order_type === "1" || o.order_type === 1 ? "Limit" : "Market",
    qty: o.size,
    price: o.price,
    triggerPrice: o.triggerPrice || null,
    reduceOnly: /close/i.test(o.type || ""),
    orderStatus: o.status,
    createdTime: Number(o.createTime || 0),
  }));
}

export async function cancelOrder(category, symbol, orderId, demo = false) {
  return signedPost(demo, cancelOrderPath(demo), { symbol: toWeexSymbol(symbol), orderId });
}

export async function getClosedPnl(category, limit, demo = false) {
  const result = await signedGet(demo, fillsPath(demo), { symbol: undefined, limit: limit || 30 });
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  return rows.map((p) => ({
    symbol: fromWeexSymbol(p.symbol),
    side: /short|sell/i.test(p.type || p.side || "") ? "Buy" : "Sell",
    qty: p.size || p.filled_qty,
    entryPrice: Number(p.price_avg || p.avgEntryPrice || 0),
    exitPrice: Number(p.price || p.avgExitPrice || 0),
    closedPnl: Number(p.totalProfits || p.closedPnl || 0),
    leverage: Number(p.leverage || 1),
    createdTime: Number(p.createTime || p.createdTime || 0),
    updatedTime: Number(p.updateTime || p.updatedTime || 0),
  }));
}
