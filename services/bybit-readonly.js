import crypto from "crypto";

const BASE_URL = "https://api.bybit.com";
const RECV_WINDOW = "5000";

function sign(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function buildQueryString(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
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
  const data = await res.json().catch(() => null);
  if (!data || data.retCode !== 0) {
    throw Object.assign(new Error(`Bybit error: ${(data && data.retMsg) || `HTTP ${res.status}`}`), { status: 502 });
  }
  return data.result;
}

async function signedGet(apiKey, apiSecret, path, params = {}) {
  const timestamp = Date.now().toString();
  const qs = buildQueryString(params);
  const signPayload = timestamp + apiKey + RECV_WINDOW + qs;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW,
    "X-BAPI-SIGN": sign(apiSecret, signPayload),
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
  const data = await res.json().catch(() => null);
  if (!data || data.retCode !== 0) {
    throw Object.assign(new Error(`Bybit error: ${(data && data.retMsg) || `HTTP ${res.status}`}`), { status: 502 });
  }
  return data.result;
}

export function getPublicKlines(category, symbol, interval, limit = 200) {
  return publicGet("/v5/market/kline", { category, symbol, interval, limit });
}

async function signedPost(apiKey, apiSecret, path, body = {}) {
  const timestamp = Date.now().toString();
  const bodyStr = JSON.stringify(body);
  const signPayload = timestamp + apiKey + RECV_WINDOW + bodyStr;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW,
    "X-BAPI-SIGN": sign(apiSecret, signPayload),
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
  const data = await res.json().catch(() => null);
  if (!data || data.retCode !== 0) {
    throw Object.assign(new Error(`Bybit error: ${(data && data.retMsg) || `HTTP ${res.status}`}`), { status: 502 });
  }
  return data.result;
}

function requireKeys() {
  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw Object.assign(new Error("Trading dashboard is not connected to a Bybit account yet."), { status: 503 });
  }
  return { apiKey, apiSecret };
}

export function getPublicTicker(category, symbol) {
  return publicGet("/v5/market/tickers", { category, symbol });
}

export function getPublicInstruments(category) {
  return publicGet("/v5/market/instruments-info", { category });
}

export async function getInstrumentInfo(category, symbol) {
  const result = await getPublicInstruments(category);
  const info = (result.list || []).find((s) => s.symbol === symbol);
  if (!info) {
    throw Object.assign(new Error("Unknown trading pair."), { status: 404 });
  }
  return {
    symbol: info.symbol,
    qtyStep: info.lotSizeFilter?.qtyStep || "0.001",
    minOrderQty: info.lotSizeFilter?.minOrderQty || "0.001",
    maxOrderQty: info.lotSizeFilter?.maxOrderQty || "1000",
    minLeverage: info.leverageFilter?.minLeverage || "1",
    maxLeverage: info.leverageFilter?.maxLeverage || "1",
    tickSize: info.priceFilter?.tickSize || "0.01",
  };
}

export async function getLivePosition(category, symbol) {
  const { apiKey, apiSecret } = requireKeys();
  const [positionResult, balanceResult] = await Promise.all([
    signedGet(apiKey, apiSecret, "/v5/position/list", { category, symbol }),
    signedGet(apiKey, apiSecret, "/v5/account/wallet-balance", { accountType: "UNIFIED" }).catch(() => null),
  ]);

  const list = positionResult.list || [];
  const pos = list.find((p) => Number(p.size) > 0);

  let equity = null;
  if (balanceResult && balanceResult.list && balanceResult.list[0]) {
    equity = Number(balanceResult.list[0].totalEquity || 0);
  }

  if (!pos) {
    return { hasPosition: false, equity };
  }

  return {
    hasPosition: true,
    equity,
    side: pos.side,
    size: Number(pos.size),
    entryPrice: Number(pos.avgPrice),
    markPrice: Number(pos.markPrice),
    leverage: Number(pos.leverage),
    unrealizedPnl: Number(pos.unrealisedPnl || 0),
    positionValue: Number(pos.positionValue || 0),
    liqPrice: pos.liqPrice ? Number(pos.liqPrice) : null,
  };
}

export async function getAllPositions(category) {
  const { apiKey, apiSecret } = requireKeys();
  const [positionResult, balanceResult] = await Promise.all([
    signedGet(apiKey, apiSecret, "/v5/position/list", { category, settleCoin: "USDT" }),
    signedGet(apiKey, apiSecret, "/v5/account/wallet-balance", { accountType: "UNIFIED" }).catch(() => null),
  ]);

  const positions = (positionResult.list || [])
    .filter((p) => Number(p.size) > 0)
    .map((pos) => ({
      symbol: pos.symbol,
      side: pos.side,
      size: Number(pos.size),
      entryPrice: Number(pos.avgPrice),
      markPrice: Number(pos.markPrice),
      leverage: Number(pos.leverage),
      unrealizedPnl: Number(pos.unrealisedPnl || 0),
      positionValue: Number(pos.positionValue || 0),
      liqPrice: pos.liqPrice ? Number(pos.liqPrice) : null,
      takeProfit: pos.takeProfit ? Number(pos.takeProfit) : null,
      stopLoss: pos.stopLoss ? Number(pos.stopLoss) : null,
    }));

  let equity = null;
  let available = null;
  if (balanceResult && balanceResult.list && balanceResult.list[0]) {
    equity = Number(balanceResult.list[0].totalEquity || 0);
    available = Number(balanceResult.list[0].totalAvailableBalance || 0);
  }

  return { equity, available, positions };
}

export async function setLeverage(category, symbol, leverage) {
  const { apiKey, apiSecret } = requireKeys();
  const lev = String(leverage);
  try {
    await signedPost(apiKey, apiSecret, "/v5/position/set-leverage", {
      category, symbol, buyLeverage: lev, sellLeverage: lev,
    });
  } catch (err) {
    if (!/110043/.test(err.message || "")) throw err;
  }
}

export async function placeOrder({ category, symbol, side, qty, leverage }) {
  const { apiKey, apiSecret } = requireKeys();
  if (leverage) {
    await setLeverage(category, symbol, leverage);
  }
  return signedPost(apiKey, apiSecret, "/v5/order/create", {
    category,
    symbol,
    side,
    orderType: "Market",
    qty: String(qty),
    timeInForce: "IOC",
    reduceOnly: false,
  });
}

export async function closePosition(category, symbol, percent) {
  const { apiKey, apiSecret } = requireKeys();
  const positionResult = await signedGet(apiKey, apiSecret, "/v5/position/list", { category, symbol });
  const pos = (positionResult.list || []).find((p) => Number(p.size) > 0);
  if (!pos) {
    throw Object.assign(new Error("No open position on this pair."), { status: 400 });
  }
  const closeSide = pos.side === "Buy" ? "Sell" : "Buy";
  const pct = percent && percent > 0 && percent < 100 ? percent : 100;
  let qty = pos.size;
  if (pct < 100) {
    const step = Number(pos.size) < 1 ? 3 : 0;
    qty = ((Number(pos.size) * pct) / 100).toFixed(step === 3 ? 3 : 0);
    if (Number(qty) <= 0) qty = pos.size;
  }
  return signedPost(apiKey, apiSecret, "/v5/order/create", {
    category,
    symbol,
    side: closeSide,
    orderType: "Market",
    qty: String(qty),
    timeInForce: "IOC",
    reduceOnly: true,
  });
}

export async function setTradingStop(category, symbol, { takeProfit, stopLoss }) {
  const { apiKey, apiSecret } = requireKeys();
  const body = { category, symbol, tpslMode: "Full" };
  if (takeProfit) body.takeProfit = String(takeProfit);
  if (stopLoss) body.stopLoss = String(stopLoss);
  return signedPost(apiKey, apiSecret, "/v5/position/trading-stop", body);
}
