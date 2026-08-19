const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Crypto service responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the crypto price service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function getCryptoPrice(coin) {
  const search = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(coin)}`);
  const match = search.coins && search.coins[0];
  if (!match) throw Object.assign(new Error("Could not find a coin matching that name or symbol."), { status: 404 });

  const priceData = await fetchJson(
    `https://api.coingecko.com/api/v3/simple/price?ids=${match.id}&vs_currencies=usd,ngn&include_24hr_change=true`
  );
  const price = priceData[match.id];
  if (!price) throw Object.assign(new Error("No price data for that coin right now."), { status: 502 });

  return {
    id: match.id,
    name: match.name,
    symbol: (match.symbol || "").toUpperCase(),
    priceUsd: price.usd != null ? price.usd : null,
    priceNgn: price.ngn != null ? price.ngn : null,
    change24hPercent: price.usd_24h_change != null ? Number(price.usd_24h_change.toFixed(2)) : null,
    thumbnail: match.thumb || null,
  };
}
