import crypto from "crypto";
import { db } from "../config/firebase.js";
/* WhatsApp channel reactions and poll votes.

   The provider's base URL and the account tokens are NOT in the code or in env variables. They live in
   the database and are edited from the admin page, so changing a domain or swapping a token never needs a
   redeploy. Nothing here is ever sent to a browser: users only get a short result message. */

const SETTINGS_COLLECTION = "siteSettings";
const SETTINGS_ID = "channelService";
const SETTINGS_TTL_MS = 15 * 1000;
const WINDOW_MS = 10 * 1000;     // provider limit: 5 requests / 10 s / account
const MAX_IN_WINDOW = 4;         // stay one under the limit
const STATUS_TTL = 30 * 1000;    // how long a cached /account answer is trusted
// Provider keys have used more than one prefix over time. Validate the value
// as an API key instead of rejecting newer provider-issued prefixes.
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._~+\/=~-]{15,511}$/;
const DEFAULT_PROVIDER_BASE_URL = "https://host.emmyhenztech.xyz";
const PREVIEW_TTL = 60 * 60 * 1000;
const MAX_HTML = 600000;
const MAX_IMG = 2000000;
const PREVIEW_UA = "ESTeamsTV-LinkPreview/1.0";   // honest user agent: never pretend to be another crawler

let settingsCache = { at: 0, data: null };
const accountState = new Map();   // key id -> live numbers about that provider account
const previewCache = new Map();

/* ------------------------------------------------------------------ encryption of tokens at rest */
function vaultKey() {
  const raw = String(process.env.CHANNEL_VAULT_KEY || process.env.TRADING_VAULT_KEY || "").trim();
  return raw ? crypto.createHash("sha256").update(raw).digest() : null;
}
export const encryptionAvailable = () => !!vaultKey();

function seal(plain) {
  const key = vaultKey();
  if (!key) return { enc: false, value: plain };
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  return { enc: true, value: Buffer.concat([iv, c.getAuthTag(), body]).toString("base64") };
}
function unseal(entry) {
  if (!entry.enc) return entry.value;
  const key = vaultKey();
  if (!key) throw new Error("cannot decrypt");
  const buf = Buffer.from(entry.value, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

/* ------------------------------------------------------------------ settings in the database */
const settingsRef = () => db.collection(SETTINGS_COLLECTION).doc(SETTINGS_ID);

async function loadSettings(force = false) {
  if (!force && settingsCache.data && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.data;
  const snap = await settingsRef().get();
  const d = snap.exists ? snap.data() : {};
  const data = {
    baseUrl: String(d.baseUrl || process.env.EMMYHENZ_BASE_URL || DEFAULT_PROVIDER_BASE_URL),
    keys: Array.isArray(d.keys) ? d.keys : [],
  };
  settingsCache = { at: Date.now(), data };
  return data;
}
async function saveSettings(next) {
  await settingsRef().set({ baseUrl: next.baseUrl, keys: next.keys, updatedAt: Date.now() });
  settingsCache = { at: Date.now(), data: { baseUrl: next.baseUrl, keys: next.keys } };
}
const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

function cleanBaseUrl(raw) {
  let s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) throw httpError("Enter the base URL.");
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u;
  try { u = new URL(s); } catch { throw httpError("That is not a valid URL."); }
  if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || u.username || u.password || u.search || u.hash) throw httpError("That is not a valid URL.");
  return (u.origin + u.pathname).replace(/\/+$/, "");
}
const maskToken = (t) => String(t).slice(0, 4) + "..." + String(t).slice(-4);
const cleanToken = (raw) => {
  const t = String(raw || "").trim();
  if (!TOKEN_RE.test(t)) throw httpError("That token is not valid. Use the complete provider API token.");
  return t;
};
const cleanLabel = (raw, fallback) => String(raw || "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 40) || fallback;

/* ------------------------------------------------------------------ admin: manage the base URL and the tokens */
export async function adminSettings() {
  const s = await loadSettings(true);
  return {
    baseUrl: s.baseUrl,
    encrypted: encryptionAvailable(),
    keys: s.keys.map((k) => ({ id: k.id, label: k.label, preview: k.preview, enabled: k.enabled !== false, addedAt: k.addedAt || 0 })),
  };
}
export async function adminSetBaseUrl(raw) {
  const s = await loadSettings(true);
  await saveSettings({ ...s, baseUrl: cleanBaseUrl(raw) });
  accountState.forEach((a) => { a.checkedAt = 0; a.invalid = false; });
  return adminSettings();
}
export async function adminAddToken({ label, token }) {
  const t = cleanToken(token);
  const s = await loadSettings(true);
  if (s.keys.length >= 30) throw httpError("You can store up to 30 tokens.");
  if (s.keys.some((k) => { try { return unseal(k) === t; } catch { return false; } })) throw httpError("That token is already saved.");
  const sealed = seal(t);
  const entry = { id: crypto.randomBytes(6).toString("hex"), label: cleanLabel(label, "Account " + (s.keys.length + 1)), enc: sealed.enc, value: sealed.value, preview: maskToken(t), enabled: true, addedAt: Date.now() };
  await saveSettings({ ...s, keys: [...s.keys, entry] });
  return adminSettings();
}
export async function adminUpdateToken(id, { label, token, enabled }) {
  const s = await loadSettings(true);
  const i = s.keys.findIndex((k) => k.id === id);
  if (i < 0) throw httpError("Token not found.", 404);
  const k = { ...s.keys[i] };
  if (typeof label === "string" && label.trim()) k.label = cleanLabel(label, k.label);
  if (typeof enabled === "boolean") k.enabled = enabled;
  if (typeof token === "string" && token.trim()) {
    const t = cleanToken(token);
    const sealed = seal(t);
    k.enc = sealed.enc; k.value = sealed.value; k.preview = maskToken(t);
    accountState.delete(id);
  }
  const keys = s.keys.slice();
  keys[i] = k;
  await saveSettings({ ...s, keys });
  return adminSettings();
}
export async function adminDeleteToken(id) {
  const s = await loadSettings(true);
  if (!s.keys.some((k) => k.id === id)) throw httpError("Token not found.", 404);
  accountState.delete(id);
  await saveSettings({ ...s, keys: s.keys.filter((k) => k.id !== id) });
  return adminSettings();
}

/* ------------------------------------------------------------------ the provider accounts (one per token) */
async function accounts() {
  const s = await loadSettings();
  const list = [];
  const used = new Set();
  for (const k of s.keys) {
    if (k.enabled === false) continue;
    let key;
    try { key = unseal(k); } catch { continue; }
    if (!TOKEN_RE.test(key)) continue;
    used.add(key);
    let a = accountState.get(k.id);
    if (!a || a.key !== key) {
      a = { id: k.id, key, label: k.label || "Account", coins: null, premium: false, reactFree: 0, voteFree: 0, invalid: false, rateUntil: 0, hits: [], checkedAt: 0 };
      accountState.set(k.id, a);
    }
    a.label = k.label || a.label;
    list.push(a);
  }
  // Keep the website compatible with the bot deployment, which supplies
  // EMMYHENZ_TOKEN, EMMYHENZ_TOKEN1, ... rather than storing those keys in Firestore.
  for (const [name, raw] of Object.entries(process.env)) {
    const m = /^EMMYHENZ_TOKEN(\d*)$/.exec(name);
    const key = String(raw || "").trim().replace(/^bearer\s+/i, "").replace(/^['"]+|['"]+$/g, "").trim();
    if (!m || !TOKEN_RE.test(key) || used.has(key)) continue;
    const id = `env-${m[1] === "" ? 0 : Number(m[1])}`;
    let a = accountState.get(id);
    if (!a || a.key !== key) {
      a = { id, key, label: m[1] === "" ? "Main (environment)" : `Account ${m[1]} (environment)`, coins: null, premium: false, reactFree: 0, voteFree: 0, invalid: false, rateUntil: 0, hits: [], checkedAt: 0 };
      accountState.set(id, a);
    }
    list.push(a);
    used.add(key);
  }
  return { baseUrl: s.baseUrl, list };
}

const clean = (v, n = 200) => String(v ?? "").replace(/[\r\n\t]+/g, " ").replace(/ehk_[A-Za-z0-9]+/g, "[key]").slice(0, n);

function applyInfo(acc, info) {
  if (!info || typeof info !== "object") return;
  const coins = Number(info.coins);
  if (Number.isFinite(coins)) acc.coins = coins;
  if (typeof info.premium === "boolean") acc.premium = info.premium;
  const u = info.dailyUsage || {};
  const r = Number(u.channelReact && u.channelReact.freeRemaining);
  const v = Number(u.pollVoting && u.pollVoting.freeRemaining);
  if (Number.isFinite(r)) acc.reactFree = r;
  if (Number.isFinite(v)) acc.voteFree = v;
}
const hasCredit = (a, kind) => (kind === "vote" ? a.voteFree : a.reactFree) > 0 || !Number.isFinite(a.coins) || a.coins >= 1;
function throttleOk(a) {
  const now = Date.now();
  a.hits = a.hits.filter((t) => now - t < WINDOW_MS);
  return a.hits.length < MAX_IN_WINDOW;
}

async function call(baseUrl, acc, method, path, body) {
  acc.hits.push(Date.now());   // count it before sending, so parallel calls are counted too
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const root = String(baseUrl || "").replace(/\/+$/, "");
    const url = /\/api\/v1$/i.test(root) ? `${root}/${path}` : `${root}/api/v1/${path}`;
    const res = await fetch(url, {
      method,
      headers: { "x-api-key": acc.key, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* not json */ }
    return { status: res.status, data: data || {}, retryAfter: Number(res.headers.get("retry-after")) };
  } finally {
    clearTimeout(timer);
  }
}
const retryMs = (r) => {
  const s = Number((r.data && r.data.retryAfterSeconds) ?? r.retryAfter);
  return (Number.isFinite(s) && s > 0 ? Math.min(s, 60) : 10) * 1000;
};

async function refresh(baseUrl, acc, force = false) {
  if (!force && acc.checkedAt && Date.now() - acc.checkedAt < STATUS_TTL) return acc;
  acc.checkedAt = Date.now();
  try {
    const r = await call(baseUrl, acc, "GET", "account");
    if (r.status === 401) acc.invalid = true;
    else if (r.status === 429) acc.rateUntil = Date.now() + retryMs(r);
    else if (r.data && r.data.success) { acc.invalid = false; applyInfo(acc, r.data.account); }
  } catch (e) { console.error(`[channel-service] ${acc.label} refresh:`, clean(e.message)); }
  return acc;
}
const refreshAll = async (baseUrl, list, force = false) => { await Promise.all(list.map((a) => refresh(baseUrl, a, force))); };

function candidates(list, kind, needCredit) {
  const free = (a) => ((kind === "vote" ? a.voteFree : a.reactFree) > 0 ? 1 : 0);
  return list
    .filter((a) => !a.invalid && a.rateUntil <= Date.now() && throttleOk(a) && (!needCredit || hasCredit(a, kind)))
    .sort((a, b) => free(b) - free(a) || (Number(b.coins) || 0) - (Number(a.coins) || 0));
}

/* Runs one provider request on the best available account, falling back to the next on 429 or 403.
   Returns { ok:true, data } or { ok:false, code, message }.
   codes: NO_SETUP | NO_KEYS | BAD_KEY | BUSY | NO_COINS | UNAVAILABLE | REQUEST (a user mistake) */
async function run(kind, path, payload, { paid = true } = {}) {
  const { baseUrl, list } = await accounts();
  if (!baseUrl) return { ok: false, code: "NO_SETUP", message: "This service is not available right now." };
  if (!list.length) return { ok: false, code: "NO_KEYS", message: "This service is not available right now." };
  await refreshAll(baseUrl, list);
  if (list.every((a) => a.invalid)) return { ok: false, code: "BAD_KEY", message: "This service is temporarily unavailable." };

  let sawLimit = false, sawNoCoins = false;
  for (const acc of candidates(list, kind, paid)) {
    try {
      const r = await call(baseUrl, acc, "POST", path, payload);
      if (r.status === 200 && r.data.success === true) { applyInfo(acc, r.data.account); acc.checkedAt = Date.now(); return { ok: true, data: r.data }; }
      if (r.status === 401) { acc.invalid = true; continue; }
      if (r.status === 429) { acc.rateUntil = Date.now() + retryMs(r); sawLimit = true; continue; }
      if (r.status === 403 && /coin/i.test(String(r.data && r.data.error))) {
        applyInfo(acc, r.data.account);
        if (!Number.isFinite(Number(r.data && r.data.account && r.data.account.coins))) acc.coins = 0;
        if (kind === "vote") acc.voteFree = 0; else acc.reactFree = 0;
        sawNoCoins = true; continue;
      }
      if (r.status === 503) return { ok: false, code: "UNAVAILABLE", message: "The service is busy. Nothing was charged, try again shortly." };
      if (r.status === 400 || r.status === 422) return { ok: false, code: "REQUEST", message: clean((r.data && r.data.error) || "Invalid request") };
      return { ok: false, code: "UNAVAILABLE", message: clean((r.data && (r.data.error || r.data.message)) || `Provider returned HTTP ${r.status}. Nothing was charged.`) };
    } catch (e) {
      console.error(`[channel-service] ${acc.label} ${path}:`, clean(e.message));
      return { ok: false, code: "UNAVAILABLE", message: `The provider did not answer: ${clean(e.message)} Nothing was charged.` };
    }
  }
  if (sawNoCoins && !sawLimit) return { ok: false, code: "NO_COINS", message: "The service is out of capacity right now. Please try again later." };
  return { ok: false, code: "BUSY", message: "The service is busy, please try again in a few seconds." };
}

/* ------------------------------------------------------------------ links */
export function parseLink(link) {
  const m = /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9]{10,40})\/(\d{1,12})\/?(?:\?.*)?$/.exec(String(link || "").trim());
  return m ? { channelId: m[1], postId: m[2], link: `https://whatsapp.com/channel/${m[1]}/${m[2]}` } : null;
}

/* ------------------------------------------------------------------ the actions */
export async function getPollInfo(link) {
  const p = parseLink(link);
  if (!p) return { ok: false, code: "REQUEST", message: "Invalid channel post link." };
  const r = await run("info", "poll-info", { link: p.link }, { paid: false });   // free: no coin needed
  if (!r.ok) return r;
  const d = r.data;
  if (!d.isPoll) return { ok: true, isPoll: false };
  const options = (Array.isArray(d.options) ? d.options : [])
    .map((o, i) => ({ index: Number.isFinite(Number(o && o.index)) ? Number(o.index) : i, text: clean((o && o.text) ?? o, 100) || `Option ${i + 1}` }))
    .sort((a, b) => a.index - b.index);
  return { ok: true, isPoll: true, question: clean(d.question, 300) || "Poll", options, multiSelect: !!d.multiSelect };
}

export async function sendReact(link, { emojis = [], random = false, amount } = {}) {
  const p = parseLink(link);
  if (!p) return { ok: false, code: "REQUEST", message: "Invalid channel post link." };
  const payload = { link: p.link };
  const list = (Array.isArray(emojis) ? emojis : []).map((e) => String(e).trim()).filter((e) => e && e.length <= 16).slice(0, 5);
  if (list.length && !random) payload.emoji = list.join(","); else payload.random = 1;
  if (Number.isInteger(amount) && amount > 0) payload.amount = amount;
  const r = await run("react", "channel-react", payload);
  if (!r.ok) return r;
  const d = r.data;
  return { ok: true, reactionsSent: Number(d.result && d.result.reactionsSent) || 0, emojis: Array.isArray(d.request && d.request.emojis) ? d.request.emojis : list, processing: !!(d.result && d.result.status === "processing") };
}

export async function sendVote(link, option, { amount } = {}) {
  const p = parseLink(link);
  if (!p) return { ok: false, code: "REQUEST", message: "Invalid channel post link." };
  const idx = Number(option);
  if (!Number.isInteger(idx) || idx < 0 || idx > 11) return { ok: false, code: "REQUEST", message: "Invalid poll option." };
  const payload = { link: p.link, option: idx };
  if (Number.isInteger(amount) && amount > 0) payload.amount = amount;
  const r = await run("vote", "poll-vote", payload);
  if (!r.ok) return r;
  return { ok: true, votesSent: Number(r.data.result && r.data.result.votesSent) || 0, option: clean(r.data.result && r.data.result.option, 100) };
}

/* ------------------------------------------------------------------ daily coin and pool overview */
export async function claimAll() {
  const { baseUrl, list } = await accounts();
  const out = [];
  if (!baseUrl) return [{ label: "Setup", error: "Base URL is not set" }];
  for (const acc of list) {
    try {
      const r = await call(baseUrl, acc, "GET", "claim-coin");
      if (r.data && r.data.success) { applyInfo(acc, r.data.account); out.push({ label: acc.label, claimed: Number(r.data.claimed) || 0 }); }
      else if (r.status === 400 && r.data && r.data.alreadyClaimed) out.push({ label: acc.label, already: true });
      else { if (r.status === 401) acc.invalid = true; out.push({ label: acc.label, error: clean((r.data && r.data.error) || `HTTP ${r.status}`) }); }
    } catch (e) { out.push({ label: acc.label, error: clean(e.message) }); }
    await new Promise((r) => setTimeout(r, 500));
  }
  return out;
}

export async function poolStatus() {
  const { baseUrl, list } = await accounts();
  if (baseUrl) await refreshAll(baseUrl, list, true);
  const s = await loadSettings();
  const off = s.keys.filter((k) => k.enabled === false).map((k) => ({ id: k.id, label: k.label, disabled: true }));
  return [
    ...list.map((a) => ({ id: a.id, label: a.label, invalid: a.invalid, coins: a.coins, premium: a.premium, reactFree: a.reactFree, voteFree: a.voteFree })),
    ...off,
  ];
}

export async function isReady() {
  try {
    const { baseUrl, list } = await accounts();
    return !!baseUrl && list.some((a) => !a.invalid);
  } catch { return false; }
}

/* ------------------------------------------------------------------ channel preview (name and picture) */
const decodeHtml = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).trim();
function metaTag(html, prop) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i").exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, "i").exec(html);
  const m = a || b;
  return m ? decodeHtml(m[1]) : "";
}
const imageHostOk = (u) => { try { const x = new URL(u); return x.protocol === "https:" && /(^|\.)(whatsapp\.net|whatsapp\.com|fbcdn\.net|facebook\.com)$/i.test(x.hostname); } catch { return false; } };

export async function getChannelPreview(channelId) {
  if (!/^[A-Za-z0-9]{10,40}$/.test(channelId)) return null;
  const hit = previewCache.get(channelId);
  if (hit && Date.now() - hit.at < PREVIEW_TTL) return hit.data;
  let data = { channelId, name: "", description: "", imageUrl: "" };
  let fetched = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`https://whatsapp.com/channel/${channelId}`, { headers: { "User-Agent": PREVIEW_UA, "Accept-Language": "en" }, redirect: "follow", signal: ctrl.signal });
    const html = (await res.text()).slice(0, MAX_HTML);
    clearTimeout(t);
    fetched = true;
    const img = metaTag(html, "og:image") || metaTag(html, "twitter:image");
    data = { channelId, name: metaTag(html, "og:title").replace(/\s*\|\s*WhatsApp.*$/i, "").slice(0, 100), description: metaTag(html, "og:description").slice(0, 200), imageUrl: imageHostOk(img) ? img : "" };
  } catch { /* an empty preview is fine: the page shows its default picture */ }
  if (fetched) previewCache.set(channelId, { at: Date.now(), data });
  if (previewCache.size > 500) previewCache.delete(previewCache.keys().next().value);
  return data;
}

export async function pipeChannelImage(channelId, res) {
  const p = await getChannelPreview(channelId);
  if (!p || !p.imageUrl) return res.status(404).end();
  try {
    const r = await fetch(p.imageUrl, { headers: { "User-Agent": PREVIEW_UA } });
    const type = r.headers.get("content-type") || "";
    if (!r.ok || !/^image\//i.test(type)) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > MAX_IMG) return res.status(404).end();
    res.set({ "Content-Type": type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
    return res.send(buf);
  } catch {
    return res.status(404).end();
  }
}
