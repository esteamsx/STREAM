import crypto from "crypto";

const RECV_WINDOW = "5000";

function baseUrl(demo) {
  return demo ? "https://api-demo.bybit.com" : "https://api.bybit.com";
}

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

function bybitErrorMessage(data, status) {
  if (data && data.retMsg) return data.retMsg;
  return `HTTP ${status}`;
}

async function publicGet(demo, path, params = {}) {
  const qs = buildQueryString(params);
  const url = `${baseUrl(demo)}${path}${qs ? `?${qs}` : ""}`;
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
    throw Object.assign(new Error(`Bybit error: ${bybitErrorMessage(data, res.status)}`), { status: 502, retCode: data && data.retCode });
  }
  return data.result;
}

async function signedGet(demo, apiKey, apiSecret, path, params = {}) {
  const timestamp = Date.now().toString();
  const qs = buildQueryString(params);
  const signPayload = timestamp + apiKey + RECV_WINDOW + qs;
  const headers = {
    "X-BAPI-API-KEY": apiKey,
    "X-BAPI-TIMESTAMP": timestamp,
    "X-BAPI-RECV-WINDOW": RECV_WINDOW,
    "X-BAPI-SIGN": sign(apiSecret, signPayload),
  };
  const url = `${baseUrl(demo)}${path}${qs ? `?${qs}` : ""}`;
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
    throw Object.assign(new Error(`Bybit error: ${bybitErrorMessage(data, res.status)}`), { status: 502, retCode: data && data.retCode });
  }
  return data.result;
}

async function signedPost(demo, apiKey, apiSecret, path, body = {}) {
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
    res = await fetch(`${baseUrl(demo)}${path}`, { method: "POST", headers, body: bodyStr, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => null);
  if (!data || data.retCode !== 0) {
    throw Object.assign(new Error(`Bybit error: ${bybitErrorMessage(data, res.status)}`), { status: 502, retCode: data && data.retCode });
  }
  return data.result;
}

function requireKeys(demo, override) {
  if (override) return override;
  const apiKey = demo ? process.env.BYBIT_DEMO_API_KEY : process.env.BYBIT_API_KEY;
  const apiSecret = demo ? process.env.BYBIT_DEMO_API_SECRET : process.env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw Object.assign(new Error(demo ? "Demo trading is not connected to a Bybit demo account yet." : "Trading dashboard is not connected to a Bybit account yet."), { status: 503 });
  }
  return { apiKey, apiSecret };
}

export function getPublicKlines(category, symbol, interval, limit = 200, demo = false) {
  return publicGet(demo, "/v5/market/kline", { category, symbol, interval, limit });
}

export function getPublicTicker(category, symbol, demo = false) {
  return publicGet(demo, "/v5/market/tickers", { category, symbol });
}

export function getPublicInstruments(category, demo = false) {
  return publicGet(demo, "/v5/market/instruments-info", { category, limit: 1000 });
}

export async function getAllInstruments(category, demo = false) {
  let cursor = "";
  let all = [];
  for (let i = 0; i < 12; i++) {
    const result = await publicGet(demo, "/v5/market/instruments-info", {
      category,
      limit: 1000,
      cursor: cursor || undefined,
    });
    all = all.concat(result.list || []);
    cursor = result.nextPageCursor || "";
    if (!cursor) break;
  }
  return { list: all };
}

export async function getInstrumentInfo(category, symbol, demo = false) {
  const result = await publicGet(demo, "/v5/market/instruments-info", { category, symbol });
  const info = (result.list || [])[0];
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

function bybitAvailableBalance(walletRow) {
  const raw = Number(walletRow.totalAvailableBalance || "");
  if (raw) return raw;
  const wallet = Number(walletRow.totalWalletBalance || 0);
  const im = Number(walletRow.totalInitialMargin || 0);
  return wallet ? wallet - im : 0;
}

export async function getLivePosition(category, symbol, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const [positionResult, balanceResult] = await Promise.all([
    signedGet(demo, apiKey, apiSecret, "/v5/position/list", { category, symbol }),
    signedGet(demo, apiKey, apiSecret, "/v5/account/wallet-balance", { accountType: "UNIFIED" }).catch(() => null),
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
    margin: Number(pos.positionIM || 0),
    liqPrice: pos.liqPrice ? Number(pos.liqPrice) : null,
  };
}

export async function getAllPositions(category, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const [positionResult, balanceResult] = await Promise.all([
    signedGet(demo, apiKey, apiSecret, "/v5/position/list", { category, settleCoin: "USDT" }),
    signedGet(demo, apiKey, apiSecret, "/v5/account/wallet-balance", { accountType: "UNIFIED" }).catch(() => null),
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
      margin: Number(pos.positionIM || 0),
      liqPrice: pos.liqPrice ? Number(pos.liqPrice) : null,
      marginMode: pos.tradeMode === 1 ? "isolated" : "cross",
      takeProfit: pos.takeProfit ? Number(pos.takeProfit) : null,
      stopLoss: pos.stopLoss ? Number(pos.stopLoss) : null,
    }));

  let equity = null;
  let available = null;
  if (balanceResult && balanceResult.list && balanceResult.list[0]) {
    equity = Number(balanceResult.list[0].totalEquity || 0);
    available = bybitAvailableBalance(balanceResult.list[0]);
  }

  return { equity, available, positions };
}

export async function setLeverage(category, symbol, leverage, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const lev = String(leverage);
  try {
    await signedPost(demo, apiKey, apiSecret, "/v5/position/set-leverage", {
      category, symbol, buyLeverage: lev, sellLeverage: lev,
    });
  } catch (err) {
    if (err.retCode !== 110043 && !/leverage not modified/i.test(err.message || "")) throw err;
  }
}

export async function setMarginMode(category, symbol, marginMode, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  return signedPost(demo, apiKey, apiSecret, "/v5/account/set-margin-mode", {
    setMarginMode: marginMode === "cross" ? "REGULAR_MARGIN" : "ISOLATED_MARGIN",
  });
}

export async function placeOrder({ category, symbol, side, qty, leverage, orderType, price, demo = false, override }) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  if (leverage) {
    await setLeverage(category, symbol, leverage, demo, override);
  }
  const isLimit = orderType === "Limit";
  const body = {
    category,
    symbol,
    side,
    orderType: isLimit ? "Limit" : "Market",
    qty: String(qty),
    timeInForce: isLimit ? "GTC" : "IOC",
    reduceOnly: false,
  };
  if (isLimit) {
    if (!price) {
      throw Object.assign(new Error("A limit price is required for limit orders."), { status: 400 });
    }
    body.price = String(price);
  }
  try {
    return await signedPost(demo, apiKey, apiSecret, "/v5/order/create", body);
  } catch (err) {
    // Accounts on Hedge Mode need positionIdx 1 (long) or 2 (short) instead
    // of the One-Way default of 0 - retry once with the right value rather
    // than making every user switch their Bybit account mode to match ours.
    if (/position idx not match position mode/i.test(err.message || "")) {
      return signedPost(demo, apiKey, apiSecret, "/v5/order/create", {
        ...body,
        positionIdx: side === "Buy" ? 1 : 2,
      });
    }
    throw err;
  }
}

export async function closePosition(category, symbol, percent, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const positionResult = await signedGet(demo, apiKey, apiSecret, "/v5/position/list", { category, symbol });
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
  return signedPost(demo, apiKey, apiSecret, "/v5/order/create", {
    category,
    symbol,
    side: closeSide,
    orderType: "Market",
    qty: String(qty),
    timeInForce: "IOC",
    reduceOnly: true,
    positionIdx: pos.positionIdx || 0,
  });
}

export async function setTradingStop(category, symbol, { takeProfit, stopLoss, demo = false, override }) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const positionResult = await signedGet(demo, apiKey, apiSecret, "/v5/position/list", { category, symbol });
  const pos = (positionResult.list || []).find((p) => Number(p.size) > 0);
  const body = { category, symbol, tpslMode: "Full", positionIdx: pos ? pos.positionIdx || 0 : 0 };
  if (takeProfit) body.takeProfit = String(takeProfit);
  if (stopLoss) body.stopLoss = String(stopLoss);
  return signedPost(demo, apiKey, apiSecret, "/v5/position/trading-stop", body);
}

export async function getOpenOrders(category, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const result = await signedGet(demo, apiKey, apiSecret, "/v5/order/realtime", { category, settleCoin: "USDT" });
  return (result.list || []).map((o) => ({
    orderId: o.orderId,
    symbol: o.symbol,
    side: o.side,
    orderType: o.orderType,
    qty: o.qty,
    price: o.price,
    triggerPrice: o.triggerPrice || null,
    reduceOnly: !!o.reduceOnly,
    orderStatus: o.orderStatus,
    createdTime: Number(o.createdTime || 0),
  }));
}

export async function cancelOrder(category, symbol, orderId, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  return signedPost(demo, apiKey, apiSecret, "/v5/order/cancel", { category, symbol, orderId });
}

export async function getClosedPnl(category, limit, demo = false, override) {
  const { apiKey, apiSecret } = requireKeys(demo, override);
  const result = await signedGet(demo, apiKey, apiSecret, "/v5/position/closed-pnl", { category, limit: limit || 30 });
  return (result.list || []).map((p) => ({
    symbol: p.symbol,
    side: p.side === "Buy" ? "Sell" : "Buy",
    qty: p.qty,
    entryPrice: Number(p.avgEntryPrice),
    exitPrice: Number(p.avgExitPrice),
    closedPnl: Number(p.closedPnl),
    leverage: Number(p.leverage),
    createdTime: Number(p.createdTime || 0),
    updatedTime: Number(p.updatedTime || 0),
  }));
}

export async function placeOrderWithCredentials({ apiKey, apiSecret, category, symbol, side, qty, leverage, orderType, price, demo = false }) {
  if (leverage) {
    const lev = String(leverage);
    try {
      await signedPost(demo, apiKey, apiSecret, "/v5/position/set-leverage", {
        category, symbol, buyLeverage: lev, sellLeverage: lev,
      });
    } catch (err) {
      if (err.retCode !== 110043 && !/leverage not modified/i.test(err.message || "")) throw err;
    }
  }
  const isLimit = orderType === "Limit";
  const body = {
    category,
    symbol,
    side,
    orderType: isLimit ? "Limit" : "Market",
    qty: String(qty),
    timeInForce: isLimit ? "GTC" : "IOC",
    reduceOnly: false,
  };
  if (isLimit) {
    if (!price) {
      throw Object.assign(new Error("A limit price is required for limit orders."), { status: 400 });
    }
    body.price = String(price);
  }
  try {
    return await signedPost(demo, apiKey, apiSecret, "/v5/order/create", body);
  } catch (err) {
    if (/position idx not match position mode/i.test(err.message || "")) {
      return signedPost(demo, apiKey, apiSecret, "/v5/order/create", {
        ...body,
        positionIdx: side === "Buy" ? 1 : 2,
      });
    }
    throw err;
  }
}
