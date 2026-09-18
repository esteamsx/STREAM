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
  return String(symbol || "").toUpperCase();
}

function fromWeexSymbol(symbol) {
  return String(symbol || "").toUpperCase();
}

function granularityFor(interval) {
  const map = {
    "1": "1m", "3": "5m", "5": "5m", "15": "15m", "30": "30m",
    "60": "1h", "120": "4h", "240": "4h", "360": "12h", "720": "12h",
    "D": "1d", "W": "1w",
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

function requireKeys(demo, override) {
  if (override) return override;
  const apiKey = demo ? process.env.WEEX_DEMO_API_KEY : process.env.WEEX_API_KEY;
  const apiSecret = demo ? process.env.WEEX_DEMO_API_SECRET : process.env.WEEX_API_SECRET;
  const passphrase = demo ? process.env.WEEX_DEMO_API_PASSPHRASE : process.env.WEEX_API_PASSPHRASE;
  if (!apiKey || !apiSecret || !passphrase) {
    throw Object.assign(new Error(demo ? "Demo trading is not connected to a WEEX demo account yet." : "Trading dashboard is not connected to a WEEX account yet."), { status: 503 });
  }
  return { apiKey, apiSecret, passphrase };
}

async function signedGet(demo, path, params = {}, override) {
  const { apiKey, apiSecret, passphrase } = requireKeys(demo, override);
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

async function signedPost(demo, path, body = {}, override) {
  const { apiKey, apiSecret, passphrase } = requireKeys(demo, override);
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

async function signedDelete(demo, path, params = {}, override) {
  const { apiKey, apiSecret, passphrase } = requireKeys(demo, override);
  const qs = buildQueryString(params);
  const timestamp = Date.now().toString();
  const message = timestamp + "DELETE" + path + (qs ? `?${qs}` : "");
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
    res = await fetch(url, { method: "DELETE", headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  return readBody(res);
}

function positionPath(demo) {
  return demo ? "/capi/v3/sim/position/allPosition" : "/capi/v3/account/position/allPosition";
}
function singlePositionPath(demo) {
  return demo ? "/capi/v3/sim/position/singlePosition" : "/capi/v3/account/position/singlePosition";
}
function balancePath(demo) {
  return demo ? "/capi/v3/sim/balance" : "/capi/v3/account/balance";
}
function orderPath(demo) {
  return demo ? "/capi/v3/sim/order" : "/capi/v3/order";
}
function leveragePath(demo) {
  return demo ? "/capi/v3/sim/leverage" : "/capi/v3/account/leverage";
}
function currentOrdersPath(demo) {
  return demo ? "/capi/v3/sim/openOrders" : "/capi/v3/openOrders";
}
function tpSlPath(demo) {
  return demo ? "/capi/v3/sim/placeTpSlOrder" : "/capi/v3/placeTpSlOrder";
}
function orderHistoryPath(demo) {
  return demo ? "/capi/v3/sim/order/history" : "/capi/v3/order/history";
}
function symbolPricePath() {
  return "/capi/v3/market/symbolPrice";
}

export async function getPublicKlines(category, symbol, interval, limit = 200, demo = false) {
  const result = await publicGet("/capi/v3/market/klines", {
    symbol: toWeexSymbol(symbol),
    interval: granularityFor(interval),
    limit,
  });
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  const list = rows
    .map((row) => [
      String(row[0]),
      String(row[1]),
      String(row[2]),
      String(row[3]),
      String(row[4]),
      String(row[5] || 0),
      String(row[7] || 0),
    ])
    .sort((a, b) => Number(b[0]) - Number(a[0]));
  return { list };
}

export function getPublicTicker(category, symbol, demo = false) {
  return publicGet(symbolPricePath(), { symbol: toWeexSymbol(symbol), priceType: "MARK" });
}

export async function getPublicInstruments(category, demo = false) {
  return publicGet("/capi/v3/market/exchangeInfo", {});
}

export async function getAllInstruments(category, demo = false) {
  const result = await publicGet("/capi/v3/market/exchangeInfo", {});
  const rows = (result && result.symbols) || [];
  const list = rows.map((c) => ({
    symbol: fromWeexSymbol(c.symbol),
    quoteCoin: c.quoteAsset || "USDT",
    status: "Trading",
  }));
  return { list };
}

export async function getInstrumentInfo(category, symbol, demo = false) {
  const result = await publicGet("/capi/v3/market/exchangeInfo", { symbol: toWeexSymbol(symbol) });
  const rows = (result && result.symbols) || [];
  const info = rows.find((c) => fromWeexSymbol(c.symbol) === String(symbol).toUpperCase()) || rows[0];
  if (!info) {
    throw Object.assign(new Error("Unknown trading pair."), { status: 404 });
  }
  const qtyDecimals = Number(info.quantityPrecision ?? 3);
  const priceDecimals = Number(info.pricePrecision ?? 2);
  return {
    symbol: fromWeexSymbol(info.symbol),
    qtyStep: info.minOrderSize ? String(info.minOrderSize) : (1 / 10 ** qtyDecimals).toFixed(qtyDecimals),
    minOrderQty: info.minOrderSize ? String(info.minOrderSize) : "0.001",
    maxOrderQty: info.maxOrderSize ? String(info.maxOrderSize) : "1000",
    minLeverage: info.minLeverage ? String(info.minLeverage) : "1",
    maxLeverage: info.maxLeverage ? String(info.maxLeverage) : "100",
    tickSize: (1 / 10 ** priceDecimals).toFixed(priceDecimals),
  };
}

function parseWeexMarginMode(raw) {
  const s = String(raw || "").toUpperCase();
  if (s === "CROSSED" || s === "CROSS") return "cross";
  return "isolated";
}

function pickUsdtAsset(assetsResult) {
  if (!assetsResult) return null;
  const list = Array.isArray(assetsResult) ? assetsResult : [assetsResult];
  if (!list.length) return null;
  return (
    list.find((a) => a && ["USDT", "SUSDT"].includes(String(a.asset || "").toUpperCase())) ||
    list[0] ||
    null
  );
}

async function markPricesFor(symbols, demo, override) {
  const unique = [...new Set(symbols)];
  const entries = await Promise.all(unique.map(async (sym) => {
    try {
      const data = await publicGet(symbolPricePath(), { symbol: sym, priceType: "MARK" });
      return [sym, Number(data && data.price) || 0];
    } catch {
      return [sym, 0];
    }
  }));
  return new Map(entries);
}

function mapWeexPosition(pos, markPrice) {
  const size = Number(pos.size || 0);
  const openValue = Number(pos.openValue || 0);
  const entryPrice = size ? openValue / size : 0;
  const margin = Number(pos.marginSize || pos.isolatedMargin || 0) || (openValue && pos.leverage ? openValue / Number(pos.leverage) : 0);
  return {
    symbol: fromWeexSymbol(pos.symbol),
    side: String(pos.side).toUpperCase() === "SHORT" ? "Sell" : "Buy",
    size,
    entryPrice,
    markPrice: markPrice || 0,
    leverage: Number(pos.leverage || 1),
    unrealizedPnl: Number(pos.unrealizePnl || 0),
    positionValue: openValue,
    margin,
    liqPrice: pos.liquidatePrice && Number(pos.liquidatePrice) > 0 ? Number(pos.liquidatePrice) : null,
    marginMode: parseWeexMarginMode(pos.marginType),
    takeProfit: null,
    stopLoss: null,
  };
}

export async function getLivePosition(category, symbol, demo = false, override) {
  const wSymbol = toWeexSymbol(symbol);
  let balanceError = null;
  const [posResult, assetsResult] = await Promise.all([
    signedGet(demo, singlePositionPath(demo), { symbol: wSymbol }, override),
    signedGet(demo, balancePath(demo), {}, override).catch((err) => {
      console.error("Weex balance fetch failed:", err.message);
      balanceError = err.message || "Could not load your WEEX balance.";
      return null;
    }),
  ]);
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || 0) > 0);

  let equity = null;
  const usdtLive = pickUsdtAsset(assetsResult);
  if (usdtLive) equity = Number(usdtLive.balance || 0);
  else if (!balanceError) balanceError = "No USDT balance found in your WEEX futures account. Transfer funds from Funding to your Futures (Trading) account on WEEX.";

  if (!pos) {
    return { hasPosition: false, equity, balanceError: usdtLive ? null : balanceError };
  }

  const markPrice = Number((await publicGet(symbolPricePath(), { symbol: wSymbol, priceType: "MARK" }).catch(() => null))?.price) || 0;
  const mapped = mapWeexPosition(pos, markPrice);
  return { hasPosition: true, equity, balanceError: usdtLive ? null : balanceError, ...mapped };
}

export async function getAllPositions(category, demo = false, override) {
  let balanceError = null;
  const [posResult, assetsResult] = await Promise.all([
    signedGet(demo, positionPath(demo), {}, override),
    signedGet(demo, balancePath(demo), {}, override).catch((err) => {
      console.error("Weex balance fetch failed:", err.message);
      balanceError = err.message || "Could not load your WEEX balance.";
      return null;
    }),
  ]);
  const rows = Array.isArray(posResult) ? posResult : (posResult && posResult.list) || [];
  const openRows = rows.filter((p) => Number(p.size || 0) > 0);
  const markPrices = await markPricesFor(openRows.map((p) => toWeexSymbol(p.symbol)), demo, override);
  const positions = openRows.map((pos) => mapWeexPosition(pos, markPrices.get(toWeexSymbol(pos.symbol))));

  let equity = null;
  let available = null;
  const usdt = pickUsdtAsset(assetsResult);
  if (usdt) {
    equity = Number(usdt.balance || 0);
    available = Number(usdt.availableBalance || 0);
  } else if (!balanceError) {
    balanceError = "No USDT balance found in your WEEX futures account. Transfer funds from Funding to your Futures (Trading) account on WEEX.";
  }

  return { equity, available, positions, balanceError: usdt ? null : balanceError };
}

function leverageBody(symbol, marginMode, leverage) {
  const body = { symbol: toWeexSymbol(symbol), marginType: marginMode === "cross" ? "CROSSED" : "ISOLATED" };
  if (marginMode === "cross") body.crossLeverage = String(leverage);
  else {
    body.isolatedLongLeverage = String(leverage);
    body.isolatedShortLeverage = String(leverage);
  }
  return body;
}

export async function setLeverage(category, symbol, leverage, demo = false, marginMode = "isolated", override) {
  await signedPost(demo, leveragePath(demo), leverageBody(symbol, marginMode, leverage), override).catch(() => {});
}

export async function setMarginMode(category, symbol, marginMode, demo = false, override) {
  let currentLeverage = null;
  try {
    const posResult = await signedGet(demo, singlePositionPath(demo), { symbol: toWeexSymbol(symbol) }, override);
    const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
    const pos = rows.find((p) => Number(p.size || 0) > 0);
    if (pos && pos.leverage) currentLeverage = pos.leverage;
  } catch {}
  return signedPost(demo, leveragePath(demo), leverageBody(symbol, marginMode, currentLeverage || "20"), override);
}

export async function placeOrder({ category, symbol, side, qty, leverage, orderType, price, takeProfit, stopLoss, demo = false, marginMode, override }) {
  if (leverage) {
    await setLeverage(category, symbol, leverage, demo, marginMode, override);
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
  if (takeProfit) {
    body.tpTriggerPrice = String(takeProfit);
    body.TpWorkingType = "CONTRACT_PRICE";
  }
  if (stopLoss) {
    body.slTriggerPrice = String(stopLoss);
    body.SlWorkingType = "CONTRACT_PRICE";
  }
  return signedPost(demo, orderPath(demo), body, override);
}

export async function closePosition(category, symbol, percent, demo = false, override) {
  const wSymbol = toWeexSymbol(symbol);
  const posResult = await signedGet(demo, singlePositionPath(demo), { symbol: wSymbol }, override);
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || 0) > 0);
  if (!pos) {
    throw Object.assign(new Error("No open position on this pair."), { status: 400 });
  }
  const isLong = String(pos.side).toUpperCase() !== "SHORT";
  const pct = percent && percent > 0 && percent < 100 ? percent : 100;
  let qty = Number(pos.size || 0);
  if (pct < 100) {
    qty = (qty * pct) / 100;
    if (qty <= 0) qty = Number(pos.size || 0);
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
  }, override);
}

export async function setTradingStop(category, symbol, { takeProfit, stopLoss, demo = false, override }) {
  const wSymbol = toWeexSymbol(symbol);
  const posResult = await signedGet(demo, singlePositionPath(demo), { symbol: wSymbol }, override);
  const rows = Array.isArray(posResult) ? posResult : posResult ? [posResult] : [];
  const pos = rows.find((p) => Number(p.size || 0) > 0);
  if (!pos) return;
  const positionSide = String(pos.side).toUpperCase() === "SHORT" ? "SHORT" : "LONG";
  const tasks = [];
  if (takeProfit) {
    tasks.push(signedPost(demo, tpSlPath(demo), {
      symbol: wSymbol,
      clientAlgoId: `estvtp${Date.now()}`,
      planType: "TAKE_PROFIT",
      triggerPrice: String(takeProfit),
      positionSide,
    }, override));
  }
  if (stopLoss) {
    tasks.push(signedPost(demo, tpSlPath(demo), {
      symbol: wSymbol,
      clientAlgoId: `estvsl${Date.now()}`,
      planType: "STOP_LOSS",
      triggerPrice: String(stopLoss),
      positionSide,
    }, override));
  }
  return Promise.all(tasks);
}

export async function getOpenOrders(category, demo = false, override) {
  const result = await signedGet(demo, currentOrdersPath(demo), {}, override);
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  return rows.map((o) => ({
    orderId: o.orderId,
    symbol: fromWeexSymbol(o.symbol),
    side: o.side === "SELL" ? "Sell" : "Buy",
    orderType: o.type === "LIMIT" ? "Limit" : "Market",
    qty: o.origQty,
    price: o.price,
    triggerPrice: o.stopPrice && Number(o.stopPrice) > 0 ? o.stopPrice : null,
    reduceOnly: !!o.reduceOnly,
    orderStatus: o.status,
    createdTime: Number(o.time || 0),
  }));
}

export async function cancelOrder(category, symbol, orderId, demo = false, override) {
  return signedDelete(demo, orderPath(demo), { orderId }, override);
}

export async function getClosedPnl(category, limit, demo = false, override) {
  const [result, openPositions] = await Promise.all([
    signedGet(demo, orderHistoryPath(demo), { limit: limit || 30 }, override),
    getAllPositions(category, demo, override).catch(() => ({ positions: [] })),
  ]);
  const openSymbols = new Set((openPositions.positions || []).map((p) => p.symbol));
  const rows = Array.isArray(result) ? result : (result && result.list) || [];
  return rows
    .filter((o) => o.status === "FILLED" && !openSymbols.has(fromWeexSymbol(o.symbol)))
    .map((o) => ({
      symbol: fromWeexSymbol(o.symbol),
      side: o.side === "SELL" ? "Sell" : "Buy",
      qty: o.executedQty || o.origQty,
      entryPrice: Number(o.avgPrice || o.price || 0),
      exitPrice: Number(o.avgPrice || o.price || 0),
      closedPnl: 0,
      leverage: null,
      createdTime: Number(o.time || 0),
      updatedTime: Number(o.updateTime || o.time || 0),
    }));
}

export async function placeOrderWithCredentials({ apiKey, apiSecret, passphrase, category, symbol, side, qty, leverage, orderType, price, demo = false }) {
  const override = { apiKey, apiSecret, passphrase };
  const wSymbol = toWeexSymbol(symbol);
  if (leverage) {
    await signedPost(demo, leveragePath(demo), leverageBody(symbol, "isolated", leverage), override).catch(() => {});
  }
  const isLimit = orderType === "Limit";
  const isBuy = side !== "Sell";
  const body = {
    symbol: wSymbol,
    side: isBuy ? "BUY" : "SELL",
    positionSide: isBuy ? "LONG" : "SHORT",
    type: isLimit ? "LIMIT" : "MARKET",
    timeInForce: isLimit ? "GTC" : "IOC",
    quantity: String(qty),
    newClientOrderId: `estvauto${Date.now()}`,
  };
  if (isLimit) {
    if (!price) {
      throw Object.assign(new Error("A limit price is required for limit orders."), { status: 400 });
    }
    body.price = String(price);
  }
  return signedPost(demo, orderPath(demo), body, override);
}
