import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { liveTV } from "../data/channels.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import {
  requireAuth,
  createApiKey,
  listApiKeysForUser,
  revokeApiKey,
  findApiKeyByRawKey,
  getApiKeyOwnerUid,
  getAccountApiUsage,
  checkAndIncrementAccountApiUsage,
  recordIssuedStreamLink,
  getIssuedStreamLinks,
  getUserProfile,
  getEffectiveApiPlan,
  getApiPlanConfig,
  API_PLANS,
} from "../services/auth.js";

const router = express.Router();

const UPSTREAM_BASE = "https://cinexora.emmyhenztech.site/api/hls";

const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://esteamstv.devs.surf/",
  Origin: "https://esteamstv.devs.surf",
};

const PUBLIC_BASE = "https://esteamstv.devs.surf";

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getStreamTokenSecret() {
  if (process.env.STREAM_TOKEN_SECRET) return process.env.STREAM_TOKEN_SECRET;

  const secretPath = path.join(process.cwd(), ".stream-token-secret");
  try {
    const existing = fs.readFileSync(secretPath, "utf8").trim();
    if (existing) {
      console.warn("⚠️ STREAM_TOKEN_SECRET is not set — reusing the secret persisted at " +
        secretPath + ". Set STREAM_TOKEN_SECRET as an env var for the most reliable, redeploy-proof setup.");
      return existing;
    }
  } catch {
  }

  const generated = crypto.randomBytes(32).toString("hex");
  try {
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    console.warn("⚠️ STREAM_TOKEN_SECRET is not set — generated one and saved it to " +
      secretPath + " so restarts reuse it. Set STREAM_TOKEN_SECRET as an env var instead for a setup that also survives redeploys.");
  } catch (err) {
    console.warn("⚠️ STREAM_TOKEN_SECRET is not set and couldn't be persisted to disk (" + err.message + ") — " +
      "using a secret generated at boot. This means existing embed/stream links break every time the server restarts. " +
      "Set STREAM_TOKEN_SECRET as an environment variable on your host for stable links.");
  }
  return generated;
}
const STREAM_TOKEN_SECRET = getStreamTokenSecret();

const VALID_CHANNEL_IDS = new Set(
  liveTV.flatMap((cat) => cat.channels).filter((c) => !c.redirect).map((c) => c.id)
);

function signStreamToken(channel, ttlMs, keyId, watermark = true) {
  const exp = Date.now() + ttlMs;
  const wm = watermark ? "1" : "0";
  const payloadB64 = Buffer.from(`${channel}|${exp}|${keyId}|${wm}`).toString("base64url");
  const sig = crypto.createHmac("sha256", STREAM_TOKEN_SECRET).update(payloadB64).digest("hex").slice(0, 32);
  return `${payloadB64}.${sig}`;
}

function decodeStreamToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return { ok: false };
  const [payloadB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", STREAM_TOKEN_SECRET).update(payloadB64).digest("hex").slice(0, 32);
  const sigBuf = Buffer.from(sig || "", "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return { ok: false };
  let payload;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return { ok: false };
  }
  const [channel, expStr, keyId, wmStr] = payload.split("|");
  const exp = Number(expStr);
  if (!channel || !exp) return { ok: false };
  return { ok: true, channel, exp, keyId, watermark: wmStr !== "0" };
}

function verifyStreamToken(token, expectedChannel) {
  const decoded = decodeStreamToken(token);
  if (!decoded.ok) return { valid: false };
  if (Date.now() > decoded.exp) return { valid: false };
  if (expectedChannel && decoded.channel !== expectedChannel) return { valid: false };
  if (decoded.keyId && revokedApiKeyIds.has(decoded.keyId)) return { valid: false };
  return { valid: true, channel: decoded.channel, exp: decoded.exp, keyId: decoded.keyId, watermark: decoded.watermark };
}

const resourceStores = new Map();

function getResourceStore(token, exp) {
  let store = resourceStores.get(token);
  if (!store) {
    store = { map: new Map(), reverse: new Map(), nextId: 1, expiresAt: exp };
    resourceStores.set(token, store);
  }
  return store;
}

function storeResource(store, absUrl) {
  if (store.reverse.has(absUrl)) return store.reverse.get(absUrl);
  const id = store.nextId++;
  store.map.set(id, absUrl);
  store.reverse.set(absUrl, id);
  return id;
}

setInterval(() => {
  const now = Date.now();
  for (const [token, store] of resourceStores) {
    if (store.expiresAt < now) resourceStores.delete(token);
  }
}, 5 * 60 * 1000).unref();

const REVOKED_KEYS_PATH = path.join(process.cwd(), ".revoked-api-keys.log");
const revokedApiKeyIds = new Set();
try {
  fs.readFileSync(REVOKED_KEYS_PATH, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((id) => revokedApiKeyIds.add(id));
} catch {
}
function persistRevokedKeyId(id) {
  fs.appendFile(REVOKED_KEYS_PATH, id + "\n", (err) => {
    if (err) console.warn("⚠️ Could not persist revoked API key id to disk (" + err.message + ") — " +
      "it's still revoked for this process, but a restart before its links naturally expire would let them work again.");
  });
}

function recordIssuedLink(uid, entry) {
  recordIssuedStreamLink(uid, entry).catch((err) => {
    console.warn("⚠️ Could not persist issued link (" + err.message + ") — " +
      "the link itself still works fine, it just won't show up in the dashboard's history list.");
  });
}

function channelDisplayName(channel) {
  const meta = liveTV.flatMap((c) => c.channels).find((c) => c.id === channel);
  return meta ? meta.name : channel;
}

async function fetchUpstream(url) {
  const res = await fetch(url, { headers: UPSTREAM_HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return res;
}

function rewritePlaylist(text, baseUrl, token, channel, exp) {
  const store = getResourceStore(token, exp);
  const lines = text.split(/\r?\n/);
  const rewritten = lines.map((line) => {
    if (line.startsWith("#EXT-X-KEY") || line.startsWith("#EXT-X-MAP")) {
      return line.replace(/URI="([^"]+)"/, (_, uri) => {
        const abs = new URL(uri, baseUrl).toString();
        const id = storeResource(store, abs);
        return `URI="/api/v1/hls/${channel}/seg?token=${encodeURIComponent(token)}&r=${id}"`;
      });
    }
    if (line.startsWith("#EXT-X-MEDIA") && line.includes("URI=")) {
      return line.replace(/URI="([^"]+)"/, (_, uri) => {
        const abs = new URL(uri, baseUrl).toString();
        const id = storeResource(store, abs);
        const isSubPlaylist = /\.m3u8(\?|$)/i.test(abs);
        const path = isSubPlaylist ? "playlist.m3u8" : "seg";
        return `URI="/api/v1/hls/${channel}/${path}?token=${encodeURIComponent(token)}&r=${id}"`;
      });
    }
    if (line.startsWith("#") || line.trim() === "") return line;
    const abs = new URL(line.trim(), baseUrl).toString();
    const id = storeResource(store, abs);
    const isSubPlaylist = /\.m3u8(\?|$)/i.test(abs);
    const path = isSubPlaylist ? "playlist.m3u8" : "seg";
    return `/api/v1/hls/${channel}/${path}?token=${encodeURIComponent(token)}&r=${id}`;
  });
  return rewritten.join("\n");
}

const hlsLimiter = new SimpleRateLimiter(600, 60 * 1000, (req) => req.ip).middleware();

router.get("/api/v1/hls/:channel/master.m3u8", hlsLimiter, async (req, res) => {
  const { channel } = req.params;
  const { token } = req.query;
  const check = verifyStreamToken(token, channel);
  if (!check.valid) return res.status(403).type("text/plain").send("Invalid or expired stream token.");

  try {
    const upstream = await fetchUpstream(`${UPSTREAM_BASE}?ch=${encodeURIComponent(channel)}`);
    const text = await upstream.text();
    const body = rewritePlaylist(text, upstream.url, token, channel, check.exp);
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "no-store");
    res.send(body);
  } catch (err) {
    console.error("hls master proxy error:", err.message);
    res.status(502).type("text/plain").send("Could not reach the stream source.");
  }
});

router.get("/api/v1/hls/:channel/playlist.m3u8", hlsLimiter, async (req, res) => {
  const { channel } = req.params;
  const { token, r } = req.query;
  const check = verifyStreamToken(token, channel);
  if (!check.valid) return res.status(403).end();

  const store = resourceStores.get(token);
  const realUrl = store && store.map.get(Number(r));
  if (!realUrl) return res.status(404).end();

  try {
    const upstream = await fetchUpstream(realUrl);
    const text = await upstream.text();
    const body = rewritePlaylist(text, upstream.url, token, channel, check.exp);
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Cache-Control", "no-store");
    res.send(body);
  } catch (err) {
    console.error("hls playlist proxy error:", err.message);
    res.status(502).end();
  }
});

router.get("/api/v1/hls/:channel/seg", hlsLimiter, async (req, res) => {
  const { channel } = req.params;
  const { token, r } = req.query;
  const check = verifyStreamToken(token, channel);
  if (!check.valid) return res.status(403).end();

  const store = resourceStores.get(token);
  const realUrl = store && store.map.get(Number(r));
  if (!realUrl) return res.status(404).end();

  try {
    const headers = { ...UPSTREAM_HEADERS };
    if (req.headers.range) headers.Range = req.headers.range;
    const upstream = await fetch(realUrl, { headers, redirect: "follow" });

    res.status(upstream.status);
    const ct = upstream.headers.get("content-type");
    const cl = upstream.headers.get("content-length");
    const cr = upstream.headers.get("content-range");
    if (ct) res.set("Content-Type", ct);
    if (cl) res.set("Content-Length", cl);
    if (cr) res.set("Content-Range", cr);
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "no-store");

    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
    else res.end();
  } catch (err) {
    console.error("hls segment proxy error:", err.message);
    res.status(502).end();
  }
});

const statusLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.ip).middleware();
const statusCache = new Map();
const STATUS_CACHE_MS = 30 * 1000;

router.get("/api/channel-status/:channel", statusLimiter, async (req, res) => {
  const { channel } = req.params;
  if (!VALID_CHANNEL_IDS.has(channel)) return res.status(404).json({ error: "Unknown channel." });

  const cached = statusCache.get(channel);
  if (cached && Date.now() - cached.checkedAt < STATUS_CACHE_MS) {
    return res.json({ channel, up: cached.up });
  }

  try {
    const upstream = await fetch(`${UPSTREAM_BASE}?ch=${encodeURIComponent(channel)}`, {
      method: "HEAD",
      headers: UPSTREAM_HEADERS,
      redirect: "follow",
    });
    const up = upstream.ok || upstream.status === 200 || upstream.status === 206 || upstream.status === 302;
    statusCache.set(channel, { up, checkedAt: Date.now() });
    res.json({ channel, up });
  } catch (err) {
    statusCache.set(channel, { up: false, checkedAt: Date.now() });
    res.json({ channel, up: false });
  }
});

const internalTokenLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();

router.get("/api/stream-token/:channel", requireAuth, internalTokenLimiter, (req, res) => {
  const { channel } = req.params;
  if (!VALID_CHANNEL_IDS.has(channel)) return res.status(404).json({ error: "Unknown channel." });
  const ttlMs = 30 * 60 * 1000;
  const token = signStreamToken(channel, ttlMs, "");
  res.json({ url: `/api/v1/hls/${channel}/master.m3u8?token=${encodeURIComponent(token)}` });
});

async function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) return res.status(401).json({ error: "Missing API key. Pass it in the x-api-key header." });
  if (req.query.key && !req.headers["x-api-key"]) {
    res.set("Warning", '299 - "Passing the API key as ?key= is deprecated and less safe than the x-api-key header; it gets logged in more places. Please switch to the header."');
  }
  try {
    const found = await findApiKeyByRawKey(String(key));
    if (!found) return res.status(401).json({ error: "Invalid or revoked API key." });
    const ownerProfile = await getUserProfile(found.uid).catch(() => null);
    const monthlyLimit = getApiPlanConfig(ownerProfile).monthlyRequests;
    const usage = await checkAndIncrementAccountApiUsage(found.uid, monthlyLimit);
    if (!usage.allowed) {
      return res.status(429).json({
        error: "Monthly request limit reached for this account.",
        requests_this_month: usage.requestsThisMonth,
        monthly_limit: usage.monthlyLimit,
      });
    }
    req.apiKeyId = found.id;
    req.apiKeyUid = found.uid;
    next();
  } catch (err) {
    console.error("api key check error:", err.message);
    res.status(500).json({ error: "Could not verify API key." });
  }
}

const devApiLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();

router.get("/api/v1/channels", devApiLimiter, (req, res) => {
  res.json({
    channels: liveTV.flatMap((cat) =>
      cat.channels.filter((c) => !c.redirect).map((c) => ({ id: c.id, name: c.name, category: cat.category }))
    ),
  });
});

router.get("/api/v1/stream/:channel", requireApiKey, devApiLimiter, async (req, res) => {
  const { channel } = req.params;
  if (!VALID_CHANNEL_IDS.has(channel)) return res.status(404).json({ error: "Unknown channel id. See /api/v1/channels." });

  const ownerProfile = await getUserProfile(req.apiKeyUid).catch(() => null);
  const plan = getApiPlanConfig(ownerProfile);
  const ttlMs = plan.streamHours * 60 * 60 * 1000;
  const token = signStreamToken(channel, ttlMs, req.apiKeyId, plan.watermark);
  const createdAt = Date.now();
  recordIssuedLink(req.apiKeyUid, { channel, token, createdAt, exp: createdAt + ttlMs });
  res.json({
    channel,
    embed_url: `${PUBLIC_BASE}/embed/${encodeURIComponent(channel)}?token=${encodeURIComponent(token)}`,
    expires_at: new Date(createdAt + ttlMs).toISOString(),
    watermark: plan.watermark,
    plan: plan.name,
    note: plan.watermark
      ? "Embed this URL in an iframe (or open it directly). It carries the ES TEAMS TV watermark and expires — it isn't the real stream source, and can't be used to reach it."
      : "Embed this URL in an iframe (or open it directly). Your plan has the watermark removed. It still expires and isn't the real stream source, so it can't be used to reach it.",
  });
});

router.get("/embed/:channel", async (req, res) => {
  const { channel } = req.params;
  const { token } = req.query;
  const check = verifyStreamToken(token, channel);

  res.removeHeader("X-Frame-Options");
  res.set("Cache-Control", "no-store");

  if (!check.valid) {
    let visitUrl = PUBLIC_BASE;
    const decoded = decodeStreamToken(token);
    if (decoded.ok && decoded.keyId) {
      try {
        const ownerUid = await getApiKeyOwnerUid(decoded.keyId);
        if (ownerUid) {
          const ownerProfile = await getUserProfile(ownerUid);
          if (ownerProfile && getEffectiveApiPlan(ownerProfile) === "max" && ownerProfile.customVisitPageUrl) {
            visitUrl = ownerProfile.customVisitPageUrl;
          }
        }
      } catch {
      }
    }
    res.status(403).type("html").send(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;background:#0b0b12;color:#fff;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
  .wrap{display:flex;align-items:center;justify-content:center;height:100vh;padding:24px}
  .card{max-width:340px;width:100%;text-align:center}
  .title{font-size:1.08rem;font-weight:700;margin:0 0 8px;line-height:1.45}
  .sub{font-size:.82rem;color:rgba(255,255,255,.55);margin:0 0 20px}
  .visit-btn{
    display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:10px;
    background:linear-gradient(90deg,#00E0FF,#7c5cff);color:#04121a;font-weight:700;font-size:.85rem;
    text-decoration:none;
  }
  .visit-btn svg{width:15px;height:15px;flex-shrink:0}
</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="title">This video streaming link has expired / Invalid</div>
    <div class="sub">Want more access?</div>
    <a class="visit-btn" href="${escapeAttr(visitUrl)}" target="_top" rel="noopener">
      Visit Page
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>
    </a>
  </div>
</div>
</body></html>`);
    return;
  }

  const channelMeta = liveTV.flatMap((c) => c.channels).find((c) => c.id === channel);
  const title = channelMeta ? channelMeta.name : channel;
  const showWatermark = check.watermark !== false;

  res.type("html").send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ES TEAMS TV</title>
<style>
  html,body{margin:0;padding:0;background:#000;height:100%;overflow:hidden}
  .wrap{position:relative;width:100vw;height:100vh;background:#000}
  video{width:100%;height:100%;object-fit:contain;background:#000}
  .wm-badge{
    position:absolute;top:50%;right:10px;transform:translateY(-50%);z-index:5;
    display:flex;align-items:center;gap:5px;
    padding:0;pointer-events:none;
    opacity:.6;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));
  }
  .wm-shield{width:12px;height:12px;stroke:rgba(255,255,255,.95);flex-shrink:0}
  .wm-name{font-family:ui-monospace,'JetBrains Mono',monospace;font-size:.55rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.95);text-shadow:0 1px 3px rgba(0,0,0,.6)}
  .wm-hitbox{
    position:absolute;
    top:50%;
    right:10px;
    transform:translateY(-50%);
    width:95px;
    height:18px;
    z-index:4;
    background:transparent;
    opacity:0;
  }
  .status{position:absolute;bottom:10px;left:14px;color:rgba(255,255,255,.6);
          font:500 11px system-ui,sans-serif;pointer-events:none;z-index:5}
  .mute-btn{
    position:absolute;bottom:10px;right:10px;z-index:6;width:32px;height:32px;border-radius:50%;
    background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;
    cursor:pointer;padding:0;
  }
  .mute-btn svg{width:16px;height:16px;stroke:#fff}
  .mute-btn .ic-off{display:none}
  .mute-btn.muted .ic-on{display:none}
  .mute-btn.muted .ic-off{display:block}
</style>
</head>
<body>
<div class="wrap">
  <video id="v" playsinline autoplay muted></video>

  ${showWatermark ? `<a class="wm-hitbox"
     href="https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29"
     target="_blank"
     rel="noopener noreferrer"
     aria-label="WhatsApp Channel"></a>
  <div class="wm-badge">
    <svg class="wm-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L3 6v5c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V6z"/>
      <path d="M9 12l2 2 4-4" stroke-width="2"/>
    </svg>
    <span class="wm-name">ES TEAMS TV</span>
  </div>` : ""}
  <div class="status" id="status">Connecting…</div>
  <button type="button" class="mute-btn muted" id="muteBtn" aria-label="Toggle sound">
    <svg class="ic-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
    <svg class="ic-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>
  </button>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js"></script>
<script>
  var video = document.getElementById('v');
  var statusEl = document.getElementById('status');
  var wrapEl = document.querySelector('.wrap');
  var muteBtn = document.getElementById('muteBtn');
  var src = '/api/v1/hls/${encodeURIComponent(channel)}/master.m3u8?token=${encodeURIComponent(token)}';
  if (Hls.isSupported()) {
    var hls = new Hls({ enableWorker: true, lowLatencyMode: true, maxBufferLength: 30 });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function(){ statusEl.textContent = ''; video.play().catch(function(){}); });
    hls.on(Hls.Events.ERROR, function(e, data){ if (data.fatal) statusEl.textContent = 'Stream unavailable.'; });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src;
    video.addEventListener('loadedmetadata', function(){ statusEl.textContent = ''; video.play().catch(function(){}); });
  } else {
    statusEl.textContent = 'HLS not supported in this browser.';
  }

  function setMuted(muted){
    video.muted = muted;
    muteBtn.classList.toggle('muted', muted);
    if(!muted){
      var resumeIfPaused = function(){ if(video.paused) video.play().catch(function(){}); };
      resumeIfPaused();
      setTimeout(resumeIfPaused, 50);
      setTimeout(resumeIfPaused, 250);
    }
  }
  muteBtn.addEventListener('click', function(e){ e.stopPropagation(); setMuted(!video.muted); });
  wrapEl.addEventListener('click', function(){ if(video.muted) setMuted(false); });
  wrapEl.addEventListener('touchstart', function(){ if(video.muted) setMuted(false); }, {passive:true});
</script>
</body>
</html>`);
});

router.post("/api/dev/keys", requireAuth, async (req, res) => {
  try {
    const label = ((req.body && req.body.label) || "").trim();
    if (!label) return res.status(400).json({ error: "Give the key a name first." });
    const plan = getApiPlanConfig(req.userProfile);
    const existing = await listApiKeysForUser(req.uid);
    if (existing.length >= plan.apiKeys) {
      return res.status(400).json({ error: `Your ${plan.name} plan allows up to ${plan.apiKeys} API key${plan.apiKeys === 1 ? "" : "s"}. Revoke one, or upgrade your plan on /developers.` });
    }
    const { id, rawKey } = await createApiKey(req.uid, label);
    res.json({ id, key: rawKey });
  } catch (err) {
    console.error("create api key error:", err.message);
    res.status(500).json({ error: "Could not create API key." });
  }
});

router.get("/api/dev/keys", requireAuth, async (req, res) => {
  try {
    const planKey = getEffectiveApiPlan(req.userProfile);
    const plan = API_PLANS[planKey];
    const [keys, usage] = await Promise.all([
      listApiKeysForUser(req.uid),
      getAccountApiUsage(req.uid, plan.monthlyRequests),
    ]);
    let planExpiresAt = null;
    if (planKey !== "free" && planKey !== "starter") planExpiresAt = req.userProfile.apiPlanExpiresAt || null;
    else if (planKey === "starter") planExpiresAt = req.userProfile.verifiedExpiresAt || null;
    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        label: k.label,
        last4: k.last4,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
      })),
      usage: {
        requestsThisMonth: usage.requestsThisMonth,
        monthlyLimit: Number.isFinite(usage.monthlyLimit) ? usage.monthlyLimit : null,
      },
      plan: {
        key: planKey,
        name: plan.name,
        apiKeys: plan.apiKeys,
        streamHours: plan.streamHours,
        watermark: plan.watermark,
        customVisitPage: plan.customVisitPage,
        expiresAt: planExpiresAt,
      },
    });
  } catch (err) {
    console.error("list api keys error:", err.message);
    res.status(500).json({ error: "Could not load API keys." });
  }
});

router.delete("/api/dev/keys/:id", requireAuth, async (req, res) => {
  try {
    await revokeApiKey(req.uid, req.params.id);
    revokedApiKeyIds.add(req.params.id);
    persistRevokedKeyId(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not revoke key." });
  }
});

function describeLink(channel, createdAt, exp, token, keyId) {
  const now = Date.now();
  const revoked = !!keyId && revokedApiKeyIds.has(keyId);
  return {
    channel,
    channel_name: channelDisplayName(channel),
    created_at: createdAt ? new Date(createdAt).toISOString() : null,
    expires_at: new Date(exp).toISOString(),
    status: now > exp || revoked ? "expired" : "active",
    ms_left: Math.max(0, exp - now),
    embed_url: `${PUBLIC_BASE}/embed/${encodeURIComponent(channel)}?token=${encodeURIComponent(token)}`,
  };
}

router.get("/api/dev/links", requireAuth, async (req, res) => {
  try {
    const list = await getIssuedStreamLinks(req.uid);
    res.json({
      links: list.map((l) => {
        const decoded = decodeStreamToken(l.token);
        return describeLink(l.channel, l.createdAt, l.exp, l.token, decoded.ok ? decoded.keyId : undefined);
      }),
    });
  } catch (err) {
    console.error("list issued links error:", err.message);
    res.status(500).json({ error: "Could not load generated links." });
  }
});

router.get("/api/dev/links/lookup", requireAuth, (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(400).json({ error: "Paste a link or token to look up." });

  let token = q;
  try {
    const asUrl = new URL(q);
    const fromQuery = asUrl.searchParams.get("token");
    if (fromQuery) token = fromQuery;
  } catch {
  }

  const decoded = decodeStreamToken(token);
  if (!decoded.ok) return res.json({ valid: false });

  res.json({ valid: true, ...describeLink(decoded.channel, null, decoded.exp, token, decoded.keyId) });
});

export { router as apiRouter };
