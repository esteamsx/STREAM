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

export function getPublicTicker(category, symbol) {
  return publicGet("/v5/market/tickers", { category, symbol });
}

export function getPublicInstruments(category) {
  return publicGet("/v5/market/instruments-info", { category });
}

export async function getLivePosition(category, symbol) {
  const apiKey = process.env.BYBIT_API_KEY;
  const apiSecret = process.env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw Object.assign(new Error("Trading dashboard is not connected to a Bybit account yet."), { status: 503 });
  }
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
