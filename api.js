import express from "express";
import crypto from "crypto";
import { Readable } from "stream";
import { liveTV } from "./channels.js";
import { SimpleRateLimiter } from "./security-middleware.js";
import {
  requireAuth,
  createApiKey,
  listApiKeysForUser,
  revokeApiKey,
  findApiKeyByRawKey,
} from "./auth.js";

const router = express.Router();

// ── Config ──────────────────────────────────────────────────────────────
// This is the third-party restream API the main site's player already
// calls (previously straight from the browser — see server.js loadChannel).
// It now only gets called from here, server-side, so it's never visible
// to a browser network tab again, on the main site or through this API.
const UPSTREAM_BASE = "https://cinexora.emmyhenztech.site/api/hls";

const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Referer: "https://esteamstv.devs.surf/",
  Origin: "https://esteamstv.devs.surf",
};

const PUBLIC_BASE = "https://esteamstv.devs.surf";

// A stream token is short-lived and self-contained (HMAC-signed), so
// verifying it never needs a database round trip. Only the initial
// /api/v1/stream/:channel issuance (or the internal main-site equivalent)
// checks the database — that's the one request per viewing session, not
// per segment.
if (!process.env.STREAM_TOKEN_SECRET) {
  console.warn("⚠️ STREAM_TOKEN_SECRET is not set — using a secret generated at boot. " +
    "This means existing embed/stream links break every time the server restarts. Set STREAM_TOKEN_SECRET on Render for stable links.");
}
const STREAM_TOKEN_SECRET = process.env.STREAM_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

const VALID_CHANNEL_IDS = new Set(
  liveTV.flatMap((cat) => cat.channels).filter((c) => !c.redirect).map((c) => c.id)
);

function signStreamToken(channel, ttlMs) {
  const exp = Date.now() + ttlMs;
  const payloadB64 = Buffer.from(`${channel}|${exp}`).toString("base64url");
  const sig = crypto.createHmac("sha256", STREAM_TOKEN_SECRET).update(payloadB64).digest("hex").slice(0, 32);
  return `${payloadB64}.${sig}`;
}

function verifyStreamToken(token, expectedChannel) {
  if (!token || typeof token !== "string" || !token.includes(".")) return { valid: false };
  const [payloadB64, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", STREAM_TOKEN_SECRET).update(payloadB64).digest("hex").slice(0, 32);
  const sigBuf = Buffer.from(sig || "", "hex");
  const expBuf = Buffer.from(expectedSig, "hex");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return { valid: false };
  let payload;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString();
  } catch {
    return { valid: false };
  }
  const [channel, expStr] = payload.split("|");
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return { valid: false };
  if (expectedChannel && channel !== expectedChannel) return { valid: false };
  return { valid: true, channel, exp };
}

// ── Per-token resource maps ──────────────────────────────────────────────
// Every real upstream URL a token is allowed to touch (variant playlists,
// segments, encryption keys) gets replaced with a small numeric id instead
// of being exposed — even base64-encoded — anywhere the client can see it.
// The mapping only lives in memory for the token's lifetime.
//
// NOTE: this is per-process. If this app ever runs on more than one Render
// instance/dyno, a token's sub-requests need to land on the same instance
// that issued the mapping (sticky sessions), or this needs to move to a
// shared store (Redis, Firestore). Fine for a single instance.
const resourceStores = new Map(); // token -> { map, reverse, nextId, expiresAt }

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

// ── HLS fetch + rewrite ──────────────────────────────────────────────────
async function fetchUpstream(url) {
  const res = await fetch(url, { headers: UPSTREAM_HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
  return res;
}

// Rewrites every URI in an HLS playlist (variant playlists, segments,
// #EXT-X-KEY / #EXT-X-MAP references) to point back through our own proxy
// routes, so the real upstream host never appears in anything the client
// receives.
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
    if (line.startsWith("#") || line.trim() === "") return line;
    const abs = new URL(line.trim(), baseUrl).toString();
    const id = storeResource(store, abs);
    const isSubPlaylist = /\.m3u8(\?|$)/i.test(abs);
    const path = isSubPlaylist ? "playlist.m3u8" : "seg";
    return `/api/v1/hls/${channel}/${path}?token=${encodeURIComponent(token)}&r=${id}`;
  });
  return rewritten.join("\n");
}

const hlsLimiter = new SimpleRateLimiter(600, 60 * 1000, (req) => req.ip).middleware(); // generous — this carries every segment request

// Master manifest: the one request that actually calls the upstream API by channel id.
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

// Variant/sub-playlists referenced from the master.
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

// Video segments, encryption keys, and init (fMP4) segments — all binary,
// all streamed straight through rather than buffered in memory.
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

// ── Channel status check (for the sidebar's up/down dots) ──────────────
// The browser used to HEAD the upstream restream API directly to color
// each channel's status dot. That both leaked the real upstream host into
// every visitor's Network tab and broke silently once the upstream started
// rejecting cross-origin requests without CORS headers. This does the same
// check server-side instead, so the browser only ever talks to our own
// origin, same as the actual stream traffic.
const statusLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.ip).middleware();
const statusCache = new Map(); // channel -> { up, checkedAt }
const STATUS_CACHE_MS = 30 * 1000; // dots re-probe every 90s client-side anyway; this just absorbs bursts

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

// ── Internal token issuance (for the main site's own logged-in player) ──
const internalTokenLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();

router.get("/api/stream-token/:channel", requireAuth, internalTokenLimiter, (req, res) => {
  const { channel } = req.params;
  if (!VALID_CHANNEL_IDS.has(channel)) return res.status(404).json({ error: "Unknown channel." });
  const ttlMs = 30 * 60 * 1000; // 30 min — the main-site player re-requests this on channel switch/reload
  const token = signStreamToken(channel, ttlMs);
  res.json({ url: `/api/v1/hls/${channel}/master.m3u8?token=${encodeURIComponent(token)}` });
});

// ── Public developer API ─────────────────────────────────────────────────
async function requireApiKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.key;
  if (!key) return res.status(401).json({ error: "Missing API key. Pass it in the x-api-key header." });
  try {
    const found = await findApiKeyByRawKey(String(key));
    if (!found) return res.status(401).json({ error: "Invalid or revoked API key." });
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

router.get("/api/v1/stream/:channel", requireApiKey, devApiLimiter, (req, res) => {
  const { channel } = req.params;
  if (!VALID_CHANNEL_IDS.has(channel)) return res.status(404).json({ error: "Unknown channel id. See /api/v1/channels." });

  const ttlMs = 6 * 60 * 60 * 1000; // 6 hours
  const token = signStreamToken(channel, ttlMs);
  res.json({
    channel,
    embed_url: `${PUBLIC_BASE}/embed/${encodeURIComponent(channel)}?token=${encodeURIComponent(token)}`,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    note: "Embed this URL in an iframe (or open it directly). It carries the ES TEAMS TV watermark and expires — it isn't the real stream source, and can't be used to reach it.",
  });
});

// ── Embed page: token-gated, watermarked player ──────────────────────────
router.get("/embed/:channel", (req, res) => {
  const { channel } = req.params;
  const { token } = req.query;
  const check = verifyStreamToken(token, channel);

  // Iframes only work if we drop the site-wide X-Frame-Options: DENY that
  // security-middleware.js sets on every response — this route is meant
  // to be embedded on someone else's page.
  res.removeHeader("X-Frame-Options");

  if (!check.valid) {
    res.status(403).type("html").send(
      `<!doctype html><html><body style="margin:0;background:#0b0b12;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><p>This link has expired or is invalid.</p></body></html>`
    );
    return;
  }

  const channelMeta = liveTV.flatMap((c) => c.channels).find((c) => c.id === channel);
  const title = channelMeta ? channelMeta.name : channel;

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
  /* ── WATERMARK — identical markup/positioning to .wm-badge on the main
     site's .video-frame (server.js), so embeds carry the exact same mark. ── */
  .wm-badge{
    position:absolute;top:50%;right:10px;transform:translateY(-50%);z-index:5;
    display:flex;align-items:center;gap:5px;
    padding:0;pointer-events:none;
    opacity:.6;
    filter:drop-shadow(0 1px 3px rgba(0,0,0,.6));
  }
  .wm-shield{width:12px;height:12px;stroke:rgba(255,255,255,.95);flex-shrink:0}
  .wm-name{font-family:ui-monospace,'JetBrains Mono',monospace;font-size:.55rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.95);text-shadow:0 1px 3px rgba(0,0,0,.6)}
  .status{position:absolute;bottom:10px;left:14px;color:rgba(255,255,255,.6);
          font:500 11px system-ui,sans-serif;pointer-events:none;z-index:5}
</style>
</head>
<body>
<div class="wrap">
  <video id="v" playsinline autoplay muted></video>
  <div class="wm-badge">
    <svg class="wm-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L3 6v5c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V6z"/>
      <path d="M9 12l2 2 4-4" stroke-width="2"/>
    </svg>
    <span class="wm-name">ES TEAMS TV</span>
  </div>
  <div class="status" id="status">Connecting…</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.13/hls.min.js"></script>
<script>
  var video = document.getElementById('v');
  var statusEl = document.getElementById('status');
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
</script>
</body>
</html>`);
});

// ── Account-facing API key management (session-based, powers the Settings → API tab) ──
router.post("/api/dev/keys", requireAuth, async (req, res) => {
  try {
    const label = (req.body && req.body.label) || "";
    const existing = await listApiKeysForUser(req.uid);
    if (existing.length >= 5) return res.status(400).json({ error: "You can have up to 5 API keys. Revoke one first." });
    const { id, rawKey } = await createApiKey(req.uid, label);
    res.json({ id, key: rawKey }); // rawKey is shown exactly once
  } catch (err) {
    console.error("create api key error:", err.message);
    res.status(500).json({ error: "Could not create API key." });
  }
});

router.get("/api/dev/keys", requireAuth, async (req, res) => {
  try {
    const keys = await listApiKeysForUser(req.uid);
    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        label: k.label,
        last4: k.last4,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        requestsThisMonth: k.requestsThisMonth,
        monthlyLimit: k.monthlyLimit,
      })),
    });
  } catch (err) {
    console.error("list api keys error:", err.message);
    res.status(500).json({ error: "Could not load API keys." });
  }
});

router.delete("/api/dev/keys/:id", requireAuth, async (req, res) => {
  try {
    await revokeApiKey(req.uid, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not revoke key." });
  }
});

export { router as apiRouter };
