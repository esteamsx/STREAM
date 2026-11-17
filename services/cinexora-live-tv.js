const CINEXORA_API_BASE = "https://cinexora.name.ng";
const CINEXORA_API_KEY = String(process.env.CINEXORA_API_KEY || "").trim() || "EMMYHENZ2026";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 55 * 1000;
const FAILURE_RETRY_MS = 60 * 1000;

let cachedChannels = null;
let cachedAt = 0;
let refreshPromise = null;
let lastRefreshFailure = null;
let lastRefreshFailureAt = 0;

export function normalizeCinexoraChannel(record) {
  if (!record || typeof record !== "object") return null;
  const id = String(record.id || "").trim();
  const name = String(record.name || "").trim();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id) || !name) return null;

  let logo = null;
  try {
    const parsedLogo = new URL(String(record.logo || ""));
    if (parsedLogo.protocol === "https:") logo = parsedLogo.toString();
  } catch {
  }

  return {
    id,
    name: name.slice(0, 200),
    group: String(record.group || "General").trim().slice(0, 100) || "General",
    country: String(record.country || "").trim().slice(0, 32),
    logo,
  };
}

export function groupCinexoraChannels(channels) {
  const groups = new Map();
  for (const channel of channels || []) {
    if (!channel) continue;
    let entry = groups.get(channel.group);
    if (!entry) {
      entry = { category: channel.group, count: 0, channels: [] };
      groups.set(channel.group, entry);
    }
    entry.count++;
    entry.channels.push(channel);
  }
  return [...groups.values()];
}

async function refreshChannelCache() {
  const response = await fetch(`${CINEXORA_API_BASE}/api/live-list`, {
    headers: {
      "x-api-key": CINEXORA_API_KEY,
      "user-agent": "ES-Teams-TV/1.0",
      accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Cinexora channel list returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (payload?.ok !== true || !Array.isArray(payload.channels)) {
    throw new Error("Cinexora returned an invalid channel list.");
  }

  const unique = new Map();
  for (const record of payload.channels) {
    const channel = normalizeCinexoraChannel(record);
    if (channel && !unique.has(channel.id)) unique.set(channel.id, channel);
  }
  if (!unique.size) throw new Error("Cinexora returned no usable channels.");

  cachedChannels = [...unique.values()];
  cachedAt = Date.now();
  lastRefreshFailure = null;
  lastRefreshFailureAt = 0;
  return cachedChannels;
}

export async function getCinexoraChannels() {
  if (cachedChannels && Date.now() - cachedAt < CACHE_TTL_MS) return cachedChannels;
  if (lastRefreshFailure && Date.now() - lastRefreshFailureAt < FAILURE_RETRY_MS) {
    if (cachedChannels) return cachedChannels;
    throw lastRefreshFailure;
  }
  if (!refreshPromise) {
    refreshPromise = refreshChannelCache().catch((error) => {
      lastRefreshFailure = error;
      lastRefreshFailureAt = Date.now();
      if (cachedChannels) {
        console.warn("Cinexora refresh failed; using the last cached channel list:", error.message);
        return cachedChannels;
      }
      throw error;
    }).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function getCinexoraChannelGroups() {
  return groupCinexoraChannels(await getCinexoraChannels()).map(({ category, count }) => ({ category, count }));
}

export async function getCinexoraChannelsForGroup(groupName) {
  const wanted = String(groupName || "").trim().toLocaleLowerCase();
  if (!wanted) return [];
  const channels = await getCinexoraChannels();
  return channels
    .filter((channel) => channel.group.toLocaleLowerCase() === wanted)
    .map(({ id, name, group, country, logo }) => ({ id, name, category: group, country, logo }));
}

export async function getCinexoraChannelById(channelId) {
  const wanted = String(channelId || "");
  return (await getCinexoraChannels()).find((channel) => channel.id === wanted) || null;
}

export async function searchCinexoraChannels(query, limit = 20) {
  const wanted = String(query || "").trim().toLocaleLowerCase();
  if (!wanted) return [];
  const max = Math.max(1, Math.min(40, Number(limit) || 20));
  const channels = await getCinexoraChannels();
  const matches = [];
  for (const channel of channels) {
    if (
      channel.name.toLocaleLowerCase().includes(wanted) ||
      channel.group.toLocaleLowerCase().includes(wanted) ||
      channel.country.toLocaleLowerCase().includes(wanted)
    ) {
      matches.push({ id: channel.id, name: channel.name, category: channel.group, country: channel.country });
      if (matches.length >= max) break;
    }
  }
  return matches;
}

export function getCinexoraStreamUrl(channelId) {
  const url = new URL(`${CINEXORA_API_BASE}/api/hls`);
  url.searchParams.set("ch", String(channelId || ""));
  url.searchParams.set("key", CINEXORA_API_KEY);
  return url.toString();
}
