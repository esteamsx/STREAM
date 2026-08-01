import express from "express";
import crypto from "crypto";
import compression from "compression";
import fs from "fs";
import path from "path";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { fileURLToPath } from "url";
import { liveTV } from "./data/channels.js";
import { renderLogin } from "./views/login.js";
import { renderVerify } from "./views/verify.js";
import { renderAccount } from "./views/account.js";
import { renderProfile } from "./views/profile.js";
import { renderReset } from "./views/reset.js";
import { renderDmca } from "./views/dmca.js";
import { renderPrivacy } from "./views/privacy.js";
import { renderDevelopers } from "./views/developers.js";
import { renderAdmin } from "./views/admin.js";
import { domainLock } from "./middleware/lock.js";
import { apiRouter } from "./routes/api.js";
import { renderDeployBot } from "./views/deploy-bot.js";

// ── Bot deployment now lives in its own Render service (see /bot-service),
// so a memory-hungry bot process can't crash the main site anymore. This
// site only proxies requests to it, authenticated with a shared secret —
// set BOT_SERVICE_URL and INTERNAL_API_KEY (same value on both services)
// in this service's Render env vars.
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const BOT_SERVICE_TIMEOUT_MS = 15000; // bot-service is a separate Render service that can be asleep/slow to wake — without a timeout every /api/bots/* request hung indefinitely waiting on it
async function botServiceFetch(pathAndQuery, options = {}) {
  if (!BOT_SERVICE_URL || !INTERNAL_API_KEY) {
    throw Object.assign(new Error("Bot service is not configured."), { status: 503 });
  }
  let resp;
  try {
    resp = await fetch(`${BOT_SERVICE_URL}${pathAndQuery}`, {
      ...options,
      headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_API_KEY, ...(options.headers || {}) },
      signal: AbortSignal.timeout(BOT_SERVICE_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw Object.assign(new Error("Bot service didn't respond in time. It may be waking up — try again shortly."), { status: 504 });
    }
    throw Object.assign(new Error("Could not reach the bot service."), { status: 502 });
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw Object.assign(new Error(data.error || "Bot service request failed."), { status: resp.status });
  return data;
}

import QRCode from "qrcode";
import {
  issueCode,
  checkCode,
  createUserAccount,
  upsertUserProfile,
  findUserByUsername,
  isUsernameAvailable,
  isUsernamePending,
  issuePendingSignup,
  resendPendingSignupCode,
  checkPendingSignupCode,
  getUserProfile,
  getPasskeysForUser,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
  updateUserProfile,
  addAltUsername,
  removeAltUsername,
  updatePrivacySettings,
  getWatchSeconds,
  addWatchSeconds,
  seedWatchSecondsIfEmpty,
  markEmailVerified,
  ensureGoogleUserProfile,
  verifyTelegramIdToken,
  createOrGetTelegramUser,
  saveTelegramOAuthState,
  consumeTelegramOAuthState,
  createOrGetGithubUser,
  saveGithubOAuthState,
  consumeGithubOAuthState,
  issueResetToken,
  consumeResetToken,
  createSession,
  verifySession,
  refreshSession,
  deleteSession,
  isSessionRevoked,
  scheduleAccountDeletion,
  sweepPendingDeletions,
  sweepOrphanedUsers,
  setupTwoFactor,
  verifyTwoFactorSetup,
  setTwoFactorEnabled,
  verifyTwoFactorCode,
  issueTwoFactorPendingLogin,
  getTwoFactorPendingLogin,
  deleteTwoFactorPendingLogin,
  followUser,
  unfollowUser,
  isFollowing,
  getFollowStats,
  growAdminFollowerCount,
  createPost,
  getPostsByUser,
  togglePostLike,
  updatePostVisibility,
  updatePostSettings,
  updatePost,
  deletePost,
  resharePost,
  getPostOwner,
  getCommentAuthorUid,
  addComment,
  getComments,
  deleteComment,
  toggleCommentHide,
  toggleCommentPin,
  toggleCommentLike,
  toggleNotificationRead,
  deleteNotification,
  getFollowList,
  getFollowingFeed,
  getFollowingFeedUnseenCount,
  addNotification,
  getNotifications,
  hasUnreadNotifications,
  markAllNotificationsRead,
  notifyProfileViewed,
  searchUsersByUsername,
  adminListUsers,
  adminSearchUsers,
  adminListBannedUsers,
  adminBanUser,
  adminUnbanUser,
  adminVerifyUser,
  adminUnverifyUser,
  adminDeleteUser,
  adminResetPassword,
  requireAuth,
  isAdminEmail,
  SESSION_TTL_MS,
} from "./services/auth.js";
import { auth as firebaseAuth } from "./config/firebase.js";
import { sendDmcaReportEmail } from "./services/mailer.js";
import { createChallenge, verifySolution } from "altcha-lib";
import {
  securityHeaders,
  helmetMiddleware,
  botBlocker,
  SimpleRateLimiter,
  suspiciousRequestDetector,
  ipBlocklist,
  ROBOTS_TXT,
  permissionsPolicy,
  hppGuard,
  probePathTrap,
  RepeatedRefusalGuard,
} from "./middleware/security-middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Render terminates TLS at its edge and forwards over plain HTTP, so without
// this every request's req.ip is Render's proxy address rather than the
// visitor's. Every IP-keyed guard below (globalLimiter, passwordLoginLimiter,
// RepeatedRefusalGuard, ipBlocklist) then shares a single bucket across all
// users at once — 10 logins per 15 minutes site-wide, and one guard trip
// banning everybody. Trust exactly one hop: `true` would let a client forge
// X-Forwarded-For and pick its own rate-limit key.
app.set("trust proxy", 1);

// Domain lock runs first, before spending cycles on anything else — blocks
// requests whose Host header doesn't match the canonical domain (unless a
// valid DEVTOOLS_BYPASS_KEY is supplied). See lock.js for exactly what this
// does and doesn't protect against.
app.use(domainLock);

// Compresses every response (the profile/account pages are large inline
// HTML+CSS+JS documents, and text compresses very well) — this cuts
// transfer size substantially without changing any behavior.
app.use(compression());

// ── SECURITY: applied before everything else, purely additive ──
app.use(helmetMiddleware);
app.use(securityHeaders);
app.use(permissionsPolicy);
app.use(hppGuard);
app.use(probePathTrap);
app.use(new RepeatedRefusalGuard(15, 5 * 60 * 1000, 30 * 60 * 1000).middleware());
app.use(ipBlocklist);
app.use(botBlocker);
app.use(suspiciousRequestDetector);
// HLS playlist/segment traffic is exempted here — it already has its own,
// higher limiter (hlsLimiter, 600/min in api.js) sized for live streaming.
// Left in this global limiter, a single active stream blows past it in
// well under a minute (a new segment every few seconds, across quality
// levels), so this one was rate-limiting playback itself before requests
// ever reached the HLS routes.
//
// Raised from 120 to 400/min per IP — 120 was tripping on ordinary fast
// navigation (each page can fire off several background requests: profile
// info, unread badges, feed counts, etc.), returning a raw JSON 429 in
// place of the page itself. 400/min is still a real ceiling against actual
// scraping/abuse, just with enough headroom for a real person clicking
// around quickly, or several people behind one shared/NAT'd IP.
const globalLimiter = new SimpleRateLimiter(400, 60000).middleware(); // 400 req/min per IP
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/hls/")) return next();
  return globalLimiter(req, res, next);
});
app.get("/robots.txt", (req, res) => res.type("text/plain").send(ROBOTS_TXT));

// Cheap keep-alive target for an external uptime pinger (e.g. UptimeRobot,
// cron-job.org) — hit this every 5-10 min to stop Render's free tier from
// sleeping. Placed before rate limiters/auth so it stays fast and unblocked.
app.get("/health", (req, res) => res.status(200).send("ok"));

const signupLimiter = new SimpleRateLimiter(8, 15 * 60 * 1000).middleware(); // signup + verify + resend: 8 / 15min
// Previously a single `loginLimiter` instance was reused as middleware on 9
// unrelated routes (password sign-in, 2FA verify, passkey, OAuth start +
// callback, identifier lookup). Since SimpleRateLimiter keys by IP, every one
// of those actions drained the *same* 8-req/15min bucket — a normal login
// (identifier lookup + password submit + maybe a 2FA code) could burn 3+ of
// the 8 slots by itself, and a shared/NAT IP hit the cap for everyone behind
// it. Each flow now gets its own bucket sized to what it actually needs.
const passwordLoginLimiter = new SimpleRateLimiter(10, 15 * 60 * 1000).middleware(); // /api/session password submits: 10 / 15min
const twoFactorLoginLimiter = new SimpleRateLimiter(10, 15 * 60 * 1000).middleware(); // /api/2fa/login-verify: 10 / 15min
const passkeyOptionsLimiter = new SimpleRateLimiter(20, 15 * 60 * 1000).middleware(); // requesting a passkey challenge is read-only, not brute-forceable
const passkeyVerifyLimiter = new SimpleRateLimiter(10, 15 * 60 * 1000).middleware(); // /api/passkey/authentication-verify: 10 / 15min
const oauthStartLimiter = new SimpleRateLimiter(15, 15 * 60 * 1000).middleware(); // telegram/github OAuth redirect kickoff
const oauthCallbackLimiter = new SimpleRateLimiter(15, 15 * 60 * 1000).middleware(); // telegram/github OAuth callback
const identifierLookupLimiter = new SimpleRateLimiter(20, 15 * 60 * 1000).middleware(); // username->email lookup, not the actual auth check
const twoFactorToggleLimiter = new SimpleRateLimiter(10, 15 * 60 * 1000, (req) => req.uid).middleware(); // enable/disable 2FA, keyed per account
// issueCode() (auth.js) sends an email/Telegram DM with zero internal cooldown
// of its own — /api/account/request-email in particular lets the caller name
// an arbitrary target address, so without this an authenticated account could
// be used to email-bomb any inbox, limited only by the blunt global per-IP cap.
const emailCodeLimiter = new SimpleRateLimiter(5, 15 * 60 * 1000, (req) => req.uid).middleware();
const resetLimiter = new SimpleRateLimiter(5, 15 * 60 * 1000).middleware(); // password reset flow: 5 / 15min
const dmcaLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000).middleware(); // DMCA report submissions: 5 / hour per IP
const usernameCheckLimiter = new SimpleRateLimiter(40, 60 * 1000).middleware(); // live-typing availability checks: 40 / min, separate from the signup quota above
// Keyed by account (req.uid), not IP — this endpoint is already behind
// requireAuth, so the thing worth throttling is one account hammering it
// from anywhere, not one IP (which a scraper can just rotate).
const channelApiLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware(); // 60 / min per account
const botDeployLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid).middleware(); // deploying spawns real processes — 5 / hour per account
const botActionLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware(); // stop/restart/delete — 30 / min per account
const botStatusLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.uid).middleware(); // log polling, up to a few panels open at once — 120 / min per account

// (devtools-blocking bundle route removed — was breaking pages via false-positive trips)


// ── ALTCHA captcha: HMAC key used to sign/verify proof-of-work challenges ──
const ALTCHA_HMAC_KEY = process.env.ALTCHA_SECRET;
if (!ALTCHA_HMAC_KEY) {
  console.warn("WARNING: ALTCHA_SECRET is not set. Set it in your .env file or captcha verification will fail.");
}

async function verifyCaptcha(payload) {
  if (!payload) return false;
  try {
    const result = await verifySolution(payload, ALTCHA_HMAC_KEY);
    return !!result;
  } catch {
    return false;
  }
}
// ── END SECURITY SETUP ──

app.use(express.json({ limit: "3mb" }));
app.use(cookieParser());
app.use(apiRouter);

const authPageConfig = {
  firebaseConfig: {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  // Telegram Login Widget identifies the bot by its numeric ID, which is just
  // the part of the bot token before the colon — no separate env var needed.
  // The client no longer needs any Telegram identifier at all — sign-in is
  // now a plain redirect to our own /api/telegram-auth/start, so this just
  // tells the page whether to show the Telegram button at all.
  telegramConfigured: !!(process.env.TELEGRAM_CLIENT_ID && process.env.TELEGRAM_CLIENT_SECRET),
  // Same idea as telegramConfigured above — the page just needs to know
  // whether to show the button, the actual client ID stays server-side.
  githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  // Blocks the "hold to reveal link" callout/context menu on links, buttons,
  // and images. -webkit-touch-callout covers iOS Safari's native long-press
  // menu; the contextmenu listener covers Android Chrome, which fires that
  // event on long-press over a link/image instead of showing a native menu.
  //
  // This is ONE shared string included on every page that takes authPageConfig
  // (login, verify, account, profile, admin, reset — check each file's <head>
  // for `${cfg.devToolsBlock || ""}`), so anything added here is automatically
  // on all of them without touching those files individually.
  devToolsBlock: `<script>
document.addEventListener('contextmenu', function(e){
  if (e.target.closest('a, button, img, [role="button"]')) e.preventDefault();
});

// Soft DevTools-open notice — NOT a hard block/redirect/blank-out. A harder
// version of this (debugger-timing trap) was tried before and caused false
// positives on real users, so this only ever shows a small, dismissible
// banner. It cannot stop anyone determined from opening DevTools — nothing
// running in the browser truly can — it just makes casual inspection less
// invisible and matches across every page instead of only the login screen.
(function(){
  var shown = false;
  function notify(){
    if (shown) return;
    shown = true;
    var bar = document.createElement('div');
    bar.textContent = 'Developer tools detected — this session is logged.';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;background:#1a0a0f;color:#ff8fa3;font:600 12px system-ui;text-align:center;padding:8px;border-top:1px solid #ff3b5c;';
    var closeBtn = document.createElement('span');
    closeBtn.textContent = ' ✕';
    closeBtn.style.cssText = 'cursor:pointer;margin-left:8px;';
    closeBtn.addEventListener('click', function(){ bar.remove(); shown = false; });
    bar.appendChild(closeBtn);
    document.body.appendChild(bar);
  }
  var threshold = 160;
  setInterval(function(){
    var widthDiff = window.outerWidth - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) notify();
  }, 1000);
})();
</script>`,
  protectionCSS: `
a, button, [role="button"], img {
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
}
a, button, [role="button"] {
  -webkit-user-select: none;
  user-select: none;
}
`,
};

// These pages' render*() functions take only authPageConfig — built once
// above from env vars, with nothing per-request (no cookies, no user data,
// confirmed no Date.now()/Math.random() runs at render time, only inside
// the client-side <script> text they output). Their HTML is therefore
// identical on every request, so it's computed once here at boot instead of
// re-running a multi-thousand-line template-literal build on every single
// GET — meaningful CPU savings under load, and one less thing an attacker
// can spend real server work on by just repeatedly hitting these public
// pages (several, like /deploy-bot, require no auth at all).
const cachedLoginHtml = renderLogin(authPageConfig);
const cachedVerifyHtml = renderVerify(authPageConfig);
const cachedAccountHtml = renderAccount(authPageConfig);
const cachedProfileHtml = renderProfile(authPageConfig);
const cachedAdminHtml = renderAdmin(authPageConfig);
const cachedResetHtml = renderReset(authPageConfig);
const cachedDmcaHtml = renderDmca(authPageConfig);
const cachedPrivacyHtml = renderPrivacy(authPageConfig);
const cachedDevelopersHtml = renderDevelopers(authPageConfig);
const cachedDeployBotHtml = renderDeployBot(authPageConfig);

/* category display icon — CSS SVG icons, no emoji */
const CATEGORY_ICON = {
  sports:         `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>`,
  football:       `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>`,
  soccer:         `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/><path d="M2 12h20"/></svg>`,
  basketball:     `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M2.1 9h19.8M2.1 15h19.8M12 2.1v19.8"/><path d="M7 3.5C8.5 7 8.5 17 7 20.5M17 3.5C15.5 7 15.5 17 17 20.5" stroke-linecap="round"/></svg>`,
  news:           `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6"/><path d="M16 13H8M16 17H8M16 9H8" stroke-linecap="round"/></svg>`,
  movies:         `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M16 4v16M2 9h20M2 15h20" stroke-linecap="round"/></svg>`,
  entertainment:  `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  music:          `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
  kids:           `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M9 14l-2 3M15 14l2 3" stroke-linecap="round"/></svg>`,
  documentary:    `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  documentaries:  `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  general:        `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2" stroke-linecap="round"/></svg>`,
};

const DEFAULT_ICON = `<svg class="ci" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>`;

function categoryIcon(name) {
  const key = String(name || "").toLowerCase().trim();
  if (CATEGORY_ICON[key]) return CATEGORY_ICON[key];
  const match = Object.keys(CATEGORY_ICON).find((k) => key.includes(k));
  return match ? CATEGORY_ICON[match] : DEFAULT_ICON;
}

// ── Channel categories — feeds the "More Channels" panel under the player ──
app.get("/api/channels/categories", requireAuth, channelApiLimiter, async (req, res) => {
  try {
    const categories = liveTV.map((cat) => ({
      category: cat.category,
      count: cat.channels.length,
      icon: categoryIcon(cat.category),
    }));
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load channel categories." });
  }
});

app.get("/api/channels/category/:name", requireAuth, channelApiLimiter, async (req, res) => {
  try {
    const wanted = String(req.params.name || "").toLowerCase().trim();
    const cat = liveTV.find((c) => String(c.category || "").toLowerCase().trim() === wanted);
    if (!cat) return res.status(404).json({ error: "Category not found." });
    res.json({
      category: cat.category,
      channels: cat.channels.map((ch) => ({ id: ch.id, name: ch.name, redirect: ch.redirect || null })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load channels for this category." });
  }
});

// Every browser auto-requests this on every page load. With no route here it
// 404s every time, and RepeatedRefusalGuard counts every 403/404 site-wide
// toward its self-ban threshold — so normal browsing alone could trip it.
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get(["/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"], (req, res) => res.status(204).end());
// Chrome DevTools auto-requests this on every single page load whenever
// DevTools is open (its "Automatic Workspace Folders" feature) — another
// silent 404-per-reload source, same problem as favicon.ico above.
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => res.status(204).end());

app.get("/", async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.redirect("/login");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<script>document.documentElement.setAttribute("data-theme", localStorage.getItem("theme")||"dark");</script>
<script>
document.addEventListener('contextmenu', function(e){
  if (e.target.closest('a, button, img, [role="button"]')) e.preventDefault();
});
</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ES TEAMS TV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
a, button, [role="button"], img {
  -webkit-touch-callout: none;
  -webkit-user-drag: none;
}
a, button, [role="button"] {
  -webkit-user-select: none;
  user-select: none;
}
:root{
  --red:#FF3B5C;--red-dim:#8f1530;--accent:#00E0FF;--accent2:#7c5cff;
  --dark:#0A0A0F;--dark2:#0F0F16;--dark3:#13131C;
  --card:#15151F;--card2:#1B1B27;
  --border:rgba(255,255,255,.07);--border-strong:rgba(255,255,255,.13);
  --text:#F3F3FA;--muted:rgba(255,255,255,.42);--muted2:rgba(255,255,255,.22);
  --nav-bg:rgba(10,10,15,.98);--surface-tint:rgba(255,255,255,.07);--text-dim:rgba(255,255,255,.28);
  --nav-h:58px;--sw:280px;--bnav-h:58px;
  --font-display:'Space Grotesk',Inter,-apple-system,sans-serif;
  --font-body:'Inter',-apple-system,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,monospace;
  --ease:cubic-bezier(.22,1,.36,1);
}
:root[data-theme="light"]{
  --dark:#F5F6FA;--dark2:#FFFFFF;--dark3:#ECEEF3;
  --card:#FFFFFF;--card2:#F0F1F5;
  --border:rgba(0,0,0,.08);--border-strong:rgba(0,0,0,.14);
  --text:#14141C;--muted:rgba(20,20,28,.55);--muted2:rgba(20,20,28,.3);
  --nav-bg:rgba(255,255,255,.92);--surface-tint:rgba(0,0,0,.05);--text-dim:rgba(20,20,28,.4);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{height:100%;overflow:hidden;max-width:100vw}
body{
  background:var(--dark);color:var(--text);font-family:var(--font-body);
  -webkit-text-size-adjust:100%;
  background-image:
    radial-gradient(900px 500px at 15% -10%,rgba(0,224,255,.06),transparent 60%),
    radial-gradient(700px 400px at 100% 0%,rgba(124,92,255,.04),transparent 55%);
  font-feature-settings:"ss01" 1;
  animation:bootFlicker .9s var(--ease) both;
}
button{font-family:inherit;cursor:pointer}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.14);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:rgba(0,224,255,.4)}

/* ── BOOT-ON SEQUENCE (one-shot, page load only) ── */
@keyframes bootFlicker{
  0%{opacity:0;filter:brightness(2.2) contrast(1.4);}
  4%{opacity:1;}
  6%{opacity:.2;}
  8%{opacity:1;filter:brightness(1.8) contrast(1.3);}
  10%{opacity:.4;}
  13%{opacity:1;filter:brightness(1.3) contrast(1.1);}
  100%{opacity:1;filter:brightness(1) contrast(1);}
}

@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
  body{animation:none;opacity:1;filter:none}
}

:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}

/* ── reusable noise texture (CSS-only, no images) ── */
.crt-noise{
  position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.05;
  background-image:repeating-radial-gradient(circle at 20% 30%,#fff 0,transparent 1px),
                    repeating-radial-gradient(circle at 70% 60%,#fff 0,transparent 1px),
                    repeating-radial-gradient(circle at 40% 80%,#fff 0,transparent 1px);
  background-size:3px 3px,5px 5px,4px 4px;
  animation:noiseShift 1.4s steps(4) infinite;
}
@keyframes noiseShift{0%{transform:translate(0,0)}25%{transform:translate(-1%,1%)}50%{transform:translate(1%,-1%)}75%{transform:translate(-1%,-1%)}100%{transform:translate(0,0)}}
.scanlines{
  position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(to bottom,rgba(255,255,255,.025) 0px,rgba(255,255,255,.025) 1px,transparent 1px,transparent 3px);
}

/* ── NAV ── */
.nav{
  position:fixed;top:0;left:0;right:0;z-index:300;
  height:var(--nav-h);display:flex;align-items:center;gap:12px;padding:0 16px;
  background:var(--nav-bg);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);
  box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 8px 24px rgba(0,0,0,.35);
}
.nav-logo{
  display:flex;align-items:center;gap:10px;
  font-family:var(--font-display);font-size:1.05rem;font-weight:700;letter-spacing:-.02em;
  background:linear-gradient(90deg,var(--accent),var(--accent2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  white-space:nowrap;flex-shrink:0;
}
.live-pill{
  font-family:var(--font-mono);font-size:.6rem;font-weight:600;letter-spacing:.12em;
  background:var(--surface-tint);color:var(--text-dim);padding:3px 8px;border-radius:20px;
  border:1px solid var(--border-strong);
  transition:background .4s var(--ease),color .4s var(--ease),box-shadow .4s var(--ease),border-color .4s var(--ease);
}
.live-pill.live-pill-on{
  background:linear-gradient(135deg,var(--red),var(--red-dim));color:#fff;
  border-color:transparent;
  box-shadow:0 0 10px rgba(255,59,92,.5);
  animation:pulsePill 2s ease infinite;
}
@keyframes pulsePill{0%,100%{opacity:1}50%{opacity:.55}}

.search-wrap{flex:1;position:relative;max-width:340px}
.search-wrap svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:15px;height:15px;opacity:.32;pointer-events:none;transition:opacity .2s var(--ease);z-index:1}
.search-input{
  width:100%;background:var(--card2);border:1.5px solid var(--border);
  border-radius:40px;padding:8px 16px 8px 38px;
  color:var(--text);font-size:.82rem;font-family:var(--font-body);outline:none;
  transition:border-color .22s var(--ease),background .22s var(--ease),box-shadow .22s var(--ease);
}
.search-input::placeholder{color:var(--muted2)}
.search-input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(0,224,255,.14),0 4px 18px rgba(0,224,255,.08)}
.search-input:focus-visible{outline:none}
.search-input:focus + svg,.search-wrap:has(.search-input:focus) svg{opacity:.7}

.menu-btn{
  display:none;width:36px;height:36px;border-radius:50%;
  background:var(--surface-tint);border:1px solid var(--border);
  color:var(--text);align-items:center;justify-content:center;flex-shrink:0;
  transition:background .2s var(--ease),transform .15s var(--ease),border-color .2s var(--ease);
}
.menu-btn:hover{background:rgba(255,255,255,.13);border-color:var(--border-strong)}
.menu-btn:active{transform:scale(.9)}
@media(max-width:768px){.menu-btn{display:flex}}

/* ── LAYOUT ── */
.layout{display:flex;margin-top:var(--nav-h);height:calc(100vh - var(--nav-h) - var(--bnav-h))}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--sw);flex-shrink:0;background:var(--dark2);
  border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;
  box-shadow:1px 0 0 rgba(255,255,255,.03) inset;
}
.sidebar-inner{flex:1;overflow-y:auto;counter-reset:chnum;min-height:0}
.cat-header{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  padding:11px 14px;font-family:var(--font-mono);font-size:.64rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);background:var(--dark3);border-bottom:1px solid var(--border);
  user-select:none;transition:color .2s var(--ease),background .2s var(--ease);position:sticky;top:0;z-index:1;
}
.cat-header:hover{color:var(--accent)}
.cat-header.open{color:var(--accent);background:linear-gradient(90deg,rgba(0,224,255,.08),transparent)}
.cat-label{display:flex;align-items:center;gap:8px;min-width:0}
.cat-icon{font-size:.85rem;flex-shrink:0;filter:saturate(.85)}
.cat-meta{display:flex;align-items:center;gap:8px;flex-shrink:0}
.cat-count{
  font-family:var(--font-mono);font-size:.6rem;font-weight:600;letter-spacing:.02em;
  color:var(--muted2);background:rgba(255,255,255,.05);border:1px solid var(--border);
  border-radius:20px;padding:2px 7px;min-width:20px;text-align:center;
  transition:color .2s var(--ease),border-color .2s var(--ease),background .2s var(--ease);
}
.cat-header.open .cat-count{color:var(--accent);border-color:rgba(0,224,255,.3);background:rgba(0,224,255,.08)}
.cat-arrow{width:14px;height:14px;transition:transform .3s var(--ease),opacity .2s var(--ease);opacity:.5;flex-shrink:0}
.cat-header.open .cat-arrow{transform:rotate(180deg);opacity:1}
.ch-list{display:none;animation:slideDown .25s var(--ease)}
.ch-list.open{display:block}
@keyframes slideDown{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.ch-btn{
  width:100%;display:flex;align-items:center;gap:10px;
  padding:10px 16px;background:none;border:none;
  border-bottom:1px solid rgba(255,255,255,.03);
  color:var(--muted);font-size:.8rem;font-weight:500;
  text-align:left;position:relative;counter-increment:chnum;
  transition:color .16s var(--ease),background .16s var(--ease),padding-left .22s var(--ease);
}
.ch-btn::after{
  content:counter(chnum,decimal-leading-zero);
  font-family:var(--font-mono);font-size:.62rem;font-weight:500;letter-spacing:.03em;
  color:var(--muted2);flex-shrink:0;margin-left:auto;padding-left:8px;
  transition:color .2s var(--ease);
}
/* ── LIQUID GLASS sheen on sidebar channel buttons (same family as .mc-btn, layered via background so it doesn't collide with the existing ::before/::after used for the active-state bar and channel number) ── */
.ch-btn{
  background-image:
    linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0) 38%,rgba(0,224,255,0) 62%,rgba(124,92,255,0) 100%);
  background-repeat:no-repeat;
  transition:color .16s var(--ease),background-color .16s var(--ease),padding-left .22s var(--ease),background-image .25s var(--ease);
}
.ch-btn:hover,.ch-btn:active{
  background-image:
    linear-gradient(135deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,.02) 38%,rgba(0,224,255,.06) 62%,rgba(124,92,255,.08) 100%);
}
.ch-btn:hover{color:var(--text);background-color:rgba(255,255,255,.05);padding-left:19px}
.ch-btn:active{background-color:rgba(0,224,255,.06)}
.ch-btn.active{color:var(--accent);background-color:rgba(0,224,255,.1);padding-left:20px;font-weight:600;box-shadow:inset 0 0 24px rgba(0,224,255,.06)}
.ch-btn.active::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,var(--accent),var(--accent2));border-radius:0 2px 2px 0;box-shadow:0 0 8px rgba(0,224,255,.65)}
.ch-btn.active::after{color:var(--accent);text-shadow:0 0 8px rgba(0,224,255,.5)}
.ch-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--red);box-shadow:0 0 5px rgba(255,59,92,.55);transition:background .2s var(--ease),box-shadow .2s var(--ease);position:relative}
.ch-btn.active .ch-dot{background:var(--accent);box-shadow:0 0 6px rgba(0,224,255,.75);animation:dotPulse 1.6s ease infinite}
.ch-btn.active .ch-dot::before,.ch-btn.active .ch-dot::after{
  content:'';position:absolute;inset:0;border-radius:50%;border:1px solid var(--accent);
  animation:signalRing 1.8s var(--ease) infinite;opacity:0;
}
.ch-btn.active .ch-dot::after{animation-delay:.6s}
@keyframes signalRing{0%{transform:scale(1);opacity:.6}100%{transform:scale(3.2);opacity:0}}
@keyframes dotPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}

/* ── channel status: green = stream up, red = stream down ── */
.ch-dot.ch-dot-up{
  background:#22c55e;
  box-shadow:0 0 5px rgba(34,197,94,.65),0 0 10px rgba(34,197,94,.25);
}
.ch-dot.ch-dot-down{
  background:var(--red);
  box-shadow:0 0 5px rgba(255,59,92,.65),0 0 10px rgba(255,59,92,.2);
}

/* ── redirect-type button (e.g. Football Live) — links out instead of loading a stream, so it gets a neutral accent dot, not a live status color ── */
.ch-dot.ch-dot-redirect{
  background:var(--accent);
  box-shadow:0 0 5px rgba(0,224,255,.65),0 0 10px rgba(0,224,255,.25);
}
.ch-btn-redirect::after{ content:'↗'; } /* small arrow glyph instead of the channel number counter */

/* ── CHANNEL DOWN OVERLAY ── */
.ch-down-overlay{
  position:absolute;inset:0;z-index:20;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(6,6,10,.78);
  backdrop-filter:blur(24px) saturate(1.5);
  -webkit-backdrop-filter:blur(24px) saturate(1.5);
  opacity:0;pointer-events:none;
  transition:opacity .3s cubic-bezier(.22,1,.36,1);
}
.ch-down-overlay.show{opacity:1;pointer-events:all}

/* liquid-glass card */
.ch-down-card{
  position:relative;
  display:flex;flex-direction:column;align-items:center;gap:16px;
  padding:34px 32px 28px;
  max-width:84%;
  background:linear-gradient(135deg,rgba(255,255,255,.09) 0%,rgba(255,255,255,.03) 55%,rgba(124,92,255,.07) 100%);
  border:1px solid rgba(255,255,255,.13);
  border-radius:22px;
  box-shadow:0 12px 52px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.16);
  backdrop-filter:blur(28px) saturate(1.6);
  -webkit-backdrop-filter:blur(28px) saturate(1.6);
  animation:cardPop .42s cubic-bezier(.34,1.52,.64,1) both;
}
@keyframes cardPop{from{opacity:0;transform:scale(.7) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}

/* corner bracket accents — same family as .ph-frame */
.ch-down-card::before,.ch-down-card::after,.ch-down-c3,.ch-down-c4{
  content:'';position:absolute;width:13px;height:13px;border:2px solid rgba(255,59,92,.65);border-radius:2px;
}
.ch-down-card::before{top:-1px;left:-1px;border-right:none;border-bottom:none}
.ch-down-card::after {top:-1px;right:-1px;border-left:none;border-bottom:none}
.ch-down-c3{bottom:-1px;left:-1px;border-right:none;border-top:none;position:absolute}
.ch-down-c4{bottom:-1px;right:-1px;border-left:none;border-top:none;position:absolute}

/* ── CSS TV shape ── */
.ch-down-tv{
  position:relative;
  width:76px;height:56px;
  border:2.5px solid rgba(255,59,92,.7);
  border-radius:9px;
  background:rgba(12,8,10,.6);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 20px rgba(255,59,92,.22),inset 0 0 16px rgba(255,59,92,.07);
  animation:tvFlicker 2.6s ease-in-out infinite;
}
/* TV stand legs */
.ch-down-tv::after{
  content:'';position:absolute;bottom:-13px;left:50%;transform:translateX(-50%);
  width:34px;height:11px;
  border-left:2.5px solid rgba(255,59,92,.5);
  border-right:2.5px solid rgba(255,59,92,.5);
  border-bottom:2.5px solid rgba(255,59,92,.5);
  border-radius:0 0 5px 5px;
}
/* TV left antenna */
.ch-down-tv-ant-l,.ch-down-tv-ant-r{
  position:absolute;top:-17px;width:2.5px;height:17px;
  background:rgba(255,59,92,.55);border-radius:2px;
}
.ch-down-tv-ant-l{left:18px;transform:rotate(-14deg);transform-origin:bottom center}
.ch-down-tv-ant-r{right:18px;transform:rotate(14deg);transform-origin:bottom center}
@keyframes tvFlicker{
  0%,100%{box-shadow:0 0 20px rgba(255,59,92,.22),inset 0 0 16px rgba(255,59,92,.07)}
  47%   {box-shadow:0 0 30px rgba(255,59,92,.42),inset 0 0 22px rgba(255,59,92,.14)}
  49%   {box-shadow:0 0 8px  rgba(255,59,92,.08),inset 0 0 4px  rgba(255,59,92,.03)}
  51%   {box-shadow:0 0 30px rgba(255,59,92,.42),inset 0 0 22px rgba(255,59,92,.14)}
}
/* CSS scanline noise inside TV screen */
.ch-down-tv-scan{
  position:absolute;inset:0;border-radius:7px;pointer-events:none;
  background:repeating-linear-gradient(to bottom,rgba(255,255,255,.03) 0,rgba(255,255,255,.03) 1px,transparent 1px,transparent 3px);
  opacity:.55;
}

/* ── CSS warning triangle (no SVG, no emoji) ── */
.ch-down-warn{
  position:relative;z-index:1;
  width:0;height:0;
  border-left:13px solid transparent;
  border-right:13px solid transparent;
  border-bottom:22px solid rgba(255,59,92,.85);
  filter:drop-shadow(0 0 5px rgba(255,59,92,.6));
  animation:warnPulse 2.1s ease-in-out infinite;
  flex-shrink:0;
}
/* exclamation mark via pseudo */
.ch-down-warn::before{
  content:'!';
  position:absolute;top:5px;left:50%;transform:translateX(-50%);
  font-family:var(--font-mono);font-size:.55rem;font-weight:700;
  color:rgba(255,255,255,.95);line-height:1;
}
@keyframes warnPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}

/* ── SIGNAL LOST blinking badge ── */
.ch-down-badge{
  display:flex;align-items:center;gap:7px;
  padding:4px 12px;border-radius:20px;
  background:rgba(255,59,92,.1);
  border:1px solid rgba(255,59,92,.28);
  font-family:var(--font-mono);font-size:.6rem;font-weight:700;letter-spacing:.1em;
  color:var(--red);text-transform:uppercase;
}
/* CSS blinking dot inside badge — no emoji */
.ch-down-badge::before{
  content:'';display:block;
  width:5px;height:5px;border-radius:50%;
  background:var(--red);
  animation:badgeBlink 1.1s step-start infinite;
  flex-shrink:0;
}
@keyframes badgeBlink{0%,100%{opacity:1}50%{opacity:0}}

.ch-down-title{
  font-family:var(--font-display);font-size:.9rem;font-weight:700;
  color:var(--text);text-align:center;line-height:1.4;
}
.ch-down-title-name{
  display:block;color:var(--red);
  font-size:.85rem;margin-top:2px;
}

/* "Please try again later" with animated dots */
.ch-down-sub{
  font-family:var(--font-body);font-size:.74rem;color:var(--muted);
  text-align:center;display:flex;align-items:baseline;gap:0;
}
/* three dots that appear one by one */
.ch-down-dot1,.ch-down-dot2,.ch-down-dot3{
  display:inline-block;opacity:0;
  animation:dotFade 1.5s ease-in-out infinite;
}
.ch-down-dot2{animation-delay:.3s}
.ch-down-dot3{animation-delay:.6s}
@keyframes dotFade{0%,60%,100%{opacity:0}30%{opacity:1}}

/* ── RETRY BUTTON ── */
.ch-down-retry{
  display:flex;align-items:center;gap:8px;
  padding:9px 22px;border-radius:30px;border:none;cursor:pointer;
  background:linear-gradient(135deg,rgba(255,59,92,.18),rgba(124,92,255,.14));
  border:1px solid rgba(255,59,92,.35);
  color:var(--text);font-family:var(--font-mono);font-size:.74rem;font-weight:600;letter-spacing:.04em;
  transition:background .22s var(--ease),box-shadow .22s var(--ease),transform .18s var(--ease);
  position:relative;overflow:hidden;
}
.ch-down-retry:hover{
  background:linear-gradient(135deg,rgba(255,59,92,.28),rgba(124,92,255,.22));
  box-shadow:0 4px 18px rgba(255,59,92,.25);
  transform:translateY(-1px);
}
.ch-down-retry:active{transform:scale(.95)}
/* liquid glass sheen sweep on hover */
.ch-down-retry::after{
  content:'';position:absolute;top:0;left:-70%;width:40%;height:100%;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.14),transparent);
  transition:left .4s var(--ease);pointer-events:none;
}
.ch-down-retry:hover::after{left:130%}

/* CSS rotate arrow icon — no emoji, no SVG */
.ch-down-retry-icon{
  position:relative;width:14px;height:14px;flex-shrink:0;
}
/* circle arc via border with one side transparent */
.ch-down-retry-icon::before{
  content:'';position:absolute;inset:0;
  border:2px solid var(--text);border-radius:50%;
  border-top-color:transparent;
  transition:transform .0s;
}
/* arrowhead tip */
.ch-down-retry-icon::after{
  content:'';position:absolute;
  top:-2px;right:1px;
  width:0;height:0;
  border-left:4px solid transparent;
  border-right:4px solid transparent;
  border-bottom:5px solid var(--text);
  transform:rotate(45deg);
}
/* spinning state */
.ch-down-retry.spinning .ch-down-retry-icon::before{
  animation:retrySpin .65s cubic-bezier(.4,0,.2,1) forwards;
}
@keyframes retrySpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.ch-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.no-results{padding:24px 16px;text-align:center;font-size:.76rem;color:var(--muted);display:none}

/* ── PLAYER AREA ── */
.player-area{flex:1;position:relative;background:var(--dark2);overflow:hidden;display:flex;flex-direction:column}

/* placeholder — "no signal" state */
.placeholder{
  position:absolute;inset:0;top:32px;z-index:5;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:
    repeating-linear-gradient(45deg,#1a1a22 0 2px,#13131a 2px 4px);
  background-size:200% 200%;
  animation:staticDrift 6s linear infinite;
  color:var(--muted);text-align:center;padding:20px;overflow:hidden;
}
@keyframes staticDrift{0%{background-position:0% 0%}100%{background-position:0% 100%}}
.placeholder::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at center,transparent 0%,var(--dark) 78%);
}
.ph-frame{
  position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:14px;
  padding:32px 40px;border:1px solid var(--border-strong);background:rgba(10,10,15,.55);
  backdrop-filter:blur(6px);
}
.ph-frame::before,.ph-frame::after,.ph-corner-b1,.ph-corner-b2{
  content:'';position:absolute;width:16px;height:16px;border:2px solid var(--accent);opacity:.7;
}
.ph-frame::before{top:-1px;left:-1px;border-right:none;border-bottom:none}
.ph-frame::after{top:-1px;right:-1px;border-left:none;border-bottom:none}
.ph-corner-b1{bottom:-1px;left:-1px;border-right:none;border-top:none;position:absolute}
.ph-corner-b2{bottom:-1px;right:-1px;border-left:none;border-top:none;position:absolute}
.ph-icon{width:60px;height:60px;display:flex;align-items:center;justify-content:center;position:relative;z-index:2}
.ph-icon svg{opacity:.5;color:var(--accent)}
.placeholder h3{font-family:var(--font-mono);font-size:.84rem;font-weight:600;color:var(--text);opacity:.85;letter-spacing:.08em;text-transform:uppercase;position:relative;z-index:2}
.placeholder p{font-size:.74rem;max-width:230px;line-height:1.6;position:relative;z-index:2;font-family:var(--font-mono);opacity:.6}

/* THE REAL VIDEO PLAYER */
.video-wrap{
  flex:1;position:relative;background:#000;
  display:none;
  overflow:hidden;
}
#videoPlayer{
  position:absolute;inset:0;
  width:100%;height:100%;
  display:block;object-fit:contain;background:#000;
}

/* video-frame: JS will size+position this to match the actual rendered video rect */
.video-frame{
  position:absolute;
  pointer-events:none; /* pass clicks through to video by default */
  z-index:9;
  overflow:hidden;
}

/* ── LIVE BADGE — signature element: ON-AIR console readout ── */
.live-badge{
  position:absolute;top:14px;left:14px;z-index:10;
  display:flex;align-items:center;gap:9px;
  background:rgba(10,10,15,.85);backdrop-filter:blur(12px);
  border:1px solid rgba(255,59,92,.35);
  padding:8px 14px 8px 12px;font-family:var(--font-mono);font-size:.72rem;font-weight:600;letter-spacing:.04em;pointer-events:none;
  box-shadow:0 4px 16px rgba(0,0,0,.45);overflow:hidden;
}
.live-badge::before,.live-badge::after{
  content:'';position:absolute;width:9px;height:9px;border:1.5px solid var(--red);opacity:.85;
}
.live-badge::before{top:-1px;left:-1px;border-right:none;border-bottom:none}
.live-badge::after{bottom:-1px;right:-1px;border-left:none;border-top:none}
.live-badge-sweep{
  position:absolute;top:0;left:-60%;width:40%;height:100%;
  background:linear-gradient(100deg,transparent,rgba(255,59,92,.18),transparent);
  animation:badgeSweep 3.2s ease-in-out infinite;
}
@keyframes badgeSweep{0%{left:-60%}55%{left:120%}100%{left:120%}}
.live-on-air{color:var(--red);font-weight:700;letter-spacing:.06em}
.live-sep{color:var(--muted2)}
.live-dot{width:7px;height:7px;border-radius:50%;background:var(--red);box-shadow:0 0 6px rgba(255,59,92,.75);animation:blink 1.4s ease infinite;position:relative;z-index:1}
@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}

/* status bar under video — telemetry readout */
.status-bar{
  display:flex;align-items:center;gap:8px;
  padding:8px 14px;
  background:var(--dark3);border-top:1px solid var(--border);
  font-family:var(--font-mono);font-size:.72rem;color:var(--muted);flex-shrink:0;
  letter-spacing:.01em;
}
.status-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;flex-shrink:0;transition:background .3s var(--ease),box-shadow .3s var(--ease);box-shadow:0 0 5px rgba(74,222,128,.5)}
.status-dot.buffering{background:#facc15;box-shadow:0 0 5px rgba(250,204,21,.5);animation:statusPulse 1s ease infinite}
.status-dot.error{background:#f87171;box-shadow:0 0 5px rgba(248,113,113,.5)}
@keyframes statusPulse{0%,100%{opacity:1}50%{opacity:.4}}

/* ── MORE CHANNELS — category grid under the player, own scroll area so the page never shifts ── */
.more-ch-wrap{
  flex-shrink:0;max-height:38vh;max-height:38dvh;display:flex;flex-direction:column;
  border-top:1px solid var(--border);background:var(--dark3);
}
.more-ch-wrap.mc-hidden{display:none}
.layout.force-landscape .more-ch-wrap,
.layout.vert-phone .more-ch-wrap{display:none}
.more-ch-label{
  font-family:var(--font-mono);font-size:.68rem;font-weight:700;letter-spacing:.12em;
  color:var(--muted);text-transform:uppercase;padding:12px 14px 8px;flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between;
}
.more-ch-toggle{
  background:transparent;border:none;color:var(--muted);width:24px;height:24px;
  display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;
}
.more-ch-toggle:hover{background:var(--card2);color:var(--text)}
.more-ch-toggle svg{width:15px;height:15px}

/* Reopen bar — a completely separate, fixed-position element pinned just above the
   bottom nav. It only exists while More Channels is collapsed, so it's never at the
   mercy of the player area's flex sizing (that's what was causing it to vanish). */
.more-ch-reopen{
  display:none;position:fixed;left:0;right:0;bottom:var(--bnav-h);z-index:290;
  align-items:center;justify-content:space-between;gap:10px;
  padding:12px 14px;background:var(--dark3);border-top:1px solid var(--border);
  font-family:var(--font-mono);font-size:.68rem;font-weight:700;letter-spacing:.12em;
  color:var(--muted);text-transform:uppercase;
}
.more-ch-reopen.show{display:flex}
.layout.force-landscape ~ .more-ch-reopen,
.layout.vert-phone ~ .more-ch-reopen{display:none !important}
.more-ch-reopen .more-ch-toggle svg{transform:rotate(180deg)}

.more-ch-body{overflow-y:auto;padding:0 14px 26px;flex:1;min-height:0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.more-ch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.more-ch-end{
  grid-column:1/-1;text-align:center;padding:18px 0 4px;
  font-family:var(--font-mono);font-size:.68rem;letter-spacing:.1em;color:var(--muted2);
}
.more-ch-cat{
  position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;
  min-height:92px;padding:10px 10px;border-radius:14px;overflow:hidden;
  border:1px solid var(--border-strong);cursor:pointer;color:#fff;
  transition:transform .15s var(--ease),box-shadow .15s var(--ease);
}
.more-ch-cat:hover{box-shadow:0 6px 18px rgba(0,0,0,.35)}
.more-ch-cat:active{transform:scale(.97)}
.more-ch-cat::after{content:'';position:absolute;inset:0;background:linear-gradient(165deg,rgba(0,0,0,0),rgba(0,0,0,.4));pointer-events:none}
.more-ch-cat svg{width:20px;height:20px;color:#fff;opacity:.95;position:relative;z-index:1;margin-bottom:4px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
.more-ch-cat-name{font-size:.76rem;font-weight:800;line-height:1.2;position:relative;z-index:1;text-shadow:0 1px 3px rgba(0,0,0,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.more-ch-cat-count{font-size:.62rem;color:rgba(255,255,255,.88);font-family:var(--font-mono);position:relative;z-index:1}
.more-ch-loading{grid-column:1/-1;padding:16px;text-align:center;font-size:.74rem;color:var(--muted);font-family:var(--font-mono)}

/* channel-list overlay — same page-overlay/overlay-card pattern as Find Friends search;
   shows roughly the first 5 channels, then scrolls for the rest */
.mc-list{max-height:264px;overflow-y:auto;display:flex;flex-direction:column;margin-top:2px;min-height:40px;overscroll-behavior:contain}

/* ── CONNECTING overlay — round CSS spinner + faint message, shown over the video while stream connects ── */
.connecting-overlay{
  position:absolute;inset:0;z-index:8;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
  background:rgba(5,5,8,.55);
  opacity:0;pointer-events:none;transition:opacity .25s var(--ease);
}
.connecting-overlay.show{opacity:1}
.connecting-spinner{
  width:46px;height:46px;border-radius:50%;
  border:3px solid rgba(255,255,255,.14);
  border-top-color:var(--accent);
  animation:connSpin .9s linear infinite;
}
@keyframes connSpin{to{transform:rotate(360deg)}}
.connecting-msg{
  font-family:var(--font-mono);font-size:.74rem;letter-spacing:.03em;
  color:var(--muted);opacity:.7;text-align:center;
}

/* ── WHATSAPP ── */
.wa-btn{
  position:absolute;bottom:58px;right:14px;z-index:10;
  display:inline-flex;align-items:center;gap:8px;
  background:linear-gradient(135deg,#2bdb74,#1fa855);color:#fff;text-decoration:none;
  font-size:.74rem;font-weight:700;padding:9px 14px;border-radius:40px;
  box-shadow:0 4px 20px rgba(37,211,102,.35);transition:transform .22s var(--ease),box-shadow .22s var(--ease);
}
.wa-btn:hover{transform:scale(1.06) translateY(-1px);box-shadow:0 8px 28px rgba(37,211,102,.5)}
.wa-btn:active{transform:scale(.96)}

/* ── SVG category icons ── */
.ci{width:15px;height:15px;flex-shrink:0;stroke:currentColor;display:block;transition:stroke .2s var(--ease)}
.cat-header.open .ci{stroke:var(--accent)}
.nav-tv-icon{stroke:url(#navGrad);flex-shrink:0}

/* ── ANNOUNCEMENT TICKER ── */
.announce-bar{
  position:relative;overflow:hidden;
  background:linear-gradient(90deg,rgba(255,59,92,.18),rgba(124,92,255,.12),rgba(0,224,255,.10));
  border-bottom:1px solid rgba(255,59,92,.25);
  height:32px;display:flex;align-items:center;
  flex-shrink:0;
  box-shadow:0 2px 12px rgba(255,59,92,.12);
}
.announce-bar::before{
  content:'';position:absolute;left:0;top:0;bottom:0;width:80px;
  background:linear-gradient(90deg,var(--dark2),transparent);z-index:2;pointer-events:none;
}
.announce-bar::after{
  content:'';position:absolute;right:0;top:0;bottom:0;width:80px;
  background:linear-gradient(270deg,var(--dark2),transparent);z-index:2;pointer-events:none;
}
.announce-label{
  flex-shrink:0;font-family:var(--font-mono);font-size:.62rem;font-weight:700;letter-spacing:.14em;
  color:#fff;background:linear-gradient(135deg,var(--red),#c0183c);
  padding:0 10px;height:100%;display:flex;align-items:center;z-index:3;
  text-transform:uppercase;white-space:nowrap;
  box-shadow:4px 0 12px rgba(255,59,92,.4);
  gap:6px;
}
.announce-label svg{width:12px;height:12px;flex-shrink:0;animation:megaShake .9s ease infinite}
@keyframes megaShake{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
.announce-track{
  flex:1;overflow:hidden;position:relative;
  cursor:grab;user-select:none;
}
.announce-track:active{cursor:grabbing}
.announce-scroll{
  display:inline-flex;align-items:center;gap:0;white-space:nowrap;
  animation:tickerRoll 38s linear infinite;
  will-change:transform;
}
.announce-track:hover .announce-scroll{animation-play-state:paused}
@keyframes tickerRoll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.announce-item{
  font-family:var(--font-body);font-size:.73rem;font-weight:500;color:var(--text);
  padding:0 32px;position:relative;opacity:.9;
}
.announce-item::after{
  content:'';position:absolute;right:0;top:50%;transform:translateY(-50%);
  width:4px;height:4px;border-radius:50%;background:var(--accent);opacity:.6;
}

/* ── OWNER PROFILE HEAD ── */
.owner-card{
  flex-shrink:0;
  padding:16px 14px 18px;
  border-top:1px solid var(--border);
  background:linear-gradient(180deg,var(--dark2),var(--dark3));
  position:relative;
}
.owner-card::before{
  content:'';position:absolute;inset:0;border-radius:inherit;overflow:hidden;
  background:radial-gradient(ellipse at 50% 0%,rgba(124,92,255,.1),transparent 70%);
  pointer-events:none;
}
.owner-crown{
  position:absolute;top:10px;right:46px;opacity:.25;
  animation:crownFloat 3.5s ease-in-out infinite;
  pointer-events:none;
}
.owner-crown svg{width:18px;height:18px;stroke:var(--accent2)}
@keyframes crownFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
.owner-avatar{
  width:56px;height:56px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent2),var(--accent));
  display:flex;align-items:center;justify-content:center;
  position:relative;flex-shrink:0;
  box-shadow:0 0 0 2px var(--dark3),0 0 0 3.5px rgba(124,92,255,.55),0 0 20px rgba(124,92,255,.35);
  animation:avatarGlow 3s ease-in-out infinite;
  background-size:cover;background-position:center;
}
@keyframes avatarGlow{0%,100%{box-shadow:0 0 0 2px var(--dark3),0 0 0 3.5px rgba(124,92,255,.55),0 0 20px rgba(124,92,255,.35)}50%{box-shadow:0 0 0 2px var(--dark3),0 0 0 3.5px rgba(0,224,255,.55),0 0 28px rgba(0,224,255,.4)}}
.owner-avatar-inner{font-family:var(--font-display);font-size:1.05rem;font-weight:700;color:#fff;letter-spacing:-.01em}
.owner-status-ring{
  position:absolute;bottom:0px;right:0px;
  width:13px;height:13px;border-radius:50%;
  background:#22c55e;border:2.5px solid var(--dark3);
  box-shadow:0 0 6px rgba(34,197,94,.7);
  animation:statusBlink 2.4s ease-in-out infinite;
}
@keyframes statusBlink{0%,100%{box-shadow:0 0 6px rgba(34,197,94,.7)}50%{box-shadow:0 0 12px rgba(34,197,94,.9)}}
.owner-info{flex:1;min-width:0}
.owner-row{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
.owner-name{
  font-family:var(--font-display);font-size:.82rem;font-weight:700;letter-spacing:-.01em;
  background:linear-gradient(90deg,#fff 60%,rgba(255,255,255,.6));
  -webkit-background-clip:text;background-clip:text;color:transparent;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.owner-badge-row{display:flex;align-items:center;gap:6px;margin-top:4px}
.owner-badge{
  font-family:var(--font-mono);font-size:.56rem;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;padding:2px 7px;border-radius:20px;
  background:linear-gradient(135deg,rgba(255,165,0,.2),rgba(255,140,0,.1));
  border:1px solid rgba(255,165,0,.4);color:#ffb347;
  display:flex;align-items:center;gap:4px;
}
.owner-badge svg{width:9px;height:9px;stroke:currentColor;flex-shrink:0}
.owner-badge-tv{
  background:linear-gradient(135deg,rgba(0,224,255,.12),rgba(124,92,255,.1));
  border-color:rgba(0,224,255,.25);color:var(--accent);
}
.owner-tagline{font-size:.65rem;color:var(--muted);font-family:var(--font-mono);margin-top:3px;letter-spacing:.02em}

/* Sidebar must be flex column so inner scrolls and owner stays at bottom */
.sidebar{display:flex;flex-direction:column}
.sidebar-inner{flex:1;overflow-y:auto;min-height:0;counter-reset:chnum}

/* WhatsApp drag handle hint */
.wa-drag-hint{font-size:.82rem;opacity:.55;margin-left:2px;line-height:1;transition:opacity .2s}
.wa-btn:hover .wa-drag-hint{opacity:.9}
.wa-btn.dragging{opacity:.85;cursor:grabbing!important;transform:scale(1.04)!important;transition:none!important;box-shadow:0 12px 36px rgba(37,211,102,.55)!important}

.overlay{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.65);backdrop-filter:blur(2px);top:var(--nav-h)}
.overlay.open{display:block;animation:fadeIn .25s var(--ease)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}

/* ── SEARCH DROPDOWN ── */
.search-wrap{position:relative}
.search-dropdown{
  position:absolute;top:calc(100% + 7px);left:0;right:0;z-index:500;
  background:rgba(15,15,22,.92);border:1.5px solid rgba(0,224,255,.22);
  border-radius:14px;backdrop-filter:blur(20px) saturate(1.4);
  box-shadow:0 8px 32px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04) inset;
  overflow:hidden;display:none;
  animation:dropIn .18s var(--ease);
}
.search-dropdown.open{display:block}
@keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.sd-list{max-height:210px;overflow-y:auto}
.sd-item{
  width:100%;display:flex;align-items:center;gap:10px;
  padding:10px 14px;background:none;border:none;border-bottom:1px solid rgba(255,255,255,.05);
  color:var(--text);font-size:.8rem;font-weight:500;text-align:left;cursor:pointer;
  transition:background .14s var(--ease),color .14s var(--ease),padding-left .18s var(--ease);
}
.sd-item:last-child{border-bottom:none}
.sd-item:hover{background:rgba(0,224,255,.09);color:var(--accent);padding-left:18px}
.sd-item:active{background:rgba(0,224,255,.16)}
.sd-dot{width:6px;height:6px;border-radius:50%;background:var(--red);box-shadow:0 0 5px rgba(255,59,92,.6);flex-shrink:0}
.sd-no-result{padding:14px 16px;font-size:.78rem;color:var(--muted);text-align:center;font-family:var(--font-mono)}

/* ── WATCH HOURS WIDGET ── */
.watch-hours-wrap{
  padding:12px 14px;border-bottom:1px solid var(--border);
  background:linear-gradient(135deg,rgba(0,224,255,.06),rgba(124,92,255,.05));
  position:relative;overflow:hidden;
}
.watch-hours-wrap::before{
  content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse at 50% 0%,rgba(0,224,255,.08),transparent 70%);
  pointer-events:none;
}
.wh-ring-wrap{display:flex;align-items:center;gap:12px;position:relative;z-index:1}
.wh-circle{
  width:56px;height:56px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(var(--accent) 0% 0%, rgba(255,255,255,.07) 0% 100%);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 3px var(--dark2),0 0 16px rgba(0,224,255,.3);
  position:relative;transition:background .4s linear;
}
@keyframes whSpin{0%{box-shadow:0 0 0 3px var(--dark2),0 0 16px rgba(0,224,255,.3)}50%{box-shadow:0 0 0 3px var(--dark2),0 0 26px rgba(0,224,255,.5)}100%{box-shadow:0 0 0 3px var(--dark2),0 0 16px rgba(0,224,255,.3)}}
.wh-inner{
  width:40px;height:40px;border-radius:50%;
  background:var(--dark2);display:flex;align-items:center;justify-content:center;
}
.wh-val{font-family:var(--font-mono);font-size:.78rem;font-weight:700;color:var(--accent);letter-spacing:-.02em;line-height:1}
.wh-info{flex:1;min-width:0}
.wh-title{font-family:var(--font-mono);font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:2px}
.wh-label{font-family:var(--font-display);font-size:.76rem;font-weight:700;color:var(--text)}
.wh-sub{font-size:.64rem;color:var(--muted);font-family:var(--font-mono);margin-top:1px}

/* ── SIDEBAR CHANNEL BUTTONS — liquid glass upgrade ── */
.ch-btn{
  backdrop-filter:blur(8px);
  background:linear-gradient(135deg,rgba(255,255,255,.025),rgba(255,255,255,.005));
}
.ch-btn:hover{
  background:linear-gradient(135deg,rgba(0,224,255,.10),rgba(124,92,255,.06));
  backdrop-filter:blur(12px);
  box-shadow:0 2px 12px rgba(0,224,255,.08),inset 0 1px 0 rgba(255,255,255,.08);
}
.ch-btn.active{
  background:linear-gradient(135deg,rgba(0,224,255,.14),rgba(124,92,255,.09));
  backdrop-filter:blur(14px);
  box-shadow:0 2px 16px rgba(0,224,255,.12),inset 0 1px 0 rgba(255,255,255,.10);
}

/* ── WATERMARK — inside .video-frame ── */
.wm-badge{
  position:absolute;top:50%;right:10px;transform:translateY(-50%);z-index:2;
  display:flex;align-items:center;gap:5px;
  padding:0;pointer-events:none;
  opacity:.6;
  filter:drop-shadow(0 1px 3px rgba(0,0,0,.6)); /* matches the network bar's readability treatment so it doesn't wash out over bright footage */
}
.wm-shield{width:12px;height:12px;stroke:rgba(255,255,255,.95);flex-shrink:0}
.wm-name{font-family:var(--font-mono);font-size:.55rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:rgba(255,255,255,.95);text-shadow:0 1px 3px rgba(0,0,0,.6)}

/* ── NETWORK STRENGTH BAR — top-left of .video-frame, CSS-built signal icon, no background box ── */
.net-badge{
  position:absolute;top:10px;left:10px;z-index:2;
  display:flex;align-items:center;gap:5px;
  pointer-events:none;
  opacity:.55;
  font-family:var(--font-mono);font-size:.55rem;font-weight:600;letter-spacing:.04em;
  color:rgba(255,255,255,.85);
  text-shadow:0 1px 3px rgba(0,0,0,.55); /* readability over bright footage instead of a background box */
}
.net-bars{display:flex;align-items:flex-end;gap:1.5px;height:10px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))}
.net-bars i{
  display:block;width:3px;border-radius:1px;background:rgba(255,255,255,.35);
  transition:background .25s var(--ease),height .25s var(--ease);
}
.net-bars i:nth-child(1){height:30%}
.net-bars i:nth-child(2){height:55%}
.net-bars i:nth-child(3){height:75%}
.net-bars i:nth-child(4){height:100%}
.net-badge.lvl-1 .net-bars i:nth-child(1){background:#facc15}
.net-badge.lvl-2 .net-bars i:nth-child(1),
.net-badge.lvl-2 .net-bars i:nth-child(2){background:#facc15}
.net-badge.lvl-3 .net-bars i:nth-child(1),
.net-badge.lvl-3 .net-bars i:nth-child(2),
.net-badge.lvl-3 .net-bars i:nth-child(3){background:#4ade80}
.net-badge.lvl-4 .net-bars i{background:#4ade80}
.net-label{text-transform:uppercase}

/* ── BRIGHTNESS SLIDER — vertical drag zone on the right edge of the video frame ── */
.brightness-zone{
  position:absolute;top:0;right:0;bottom:52px;width:34%;z-index:4;
  touch-action:none; /* so the vertical drag doesn't scroll the page */
  pointer-events:all; /* re-enable inside frame — .video-frame sets pointer-events:none by default so taps pass through to the video; this zone needs to actually receive the drag */
  /* stops short of the bottom control bar (~44px) so it never sits on top of the
     lock/layout/maximize buttons, which live on the right side of that bar */
}
.video-frame.controls-locked .brightness-zone{
  pointer-events:none; /* disabled while controls are locked, per spec */
}
.brightness-readout{
  position:absolute;top:38%;left:18px;
  display:flex;flex-direction:column;align-items:center;gap:10px;
  z-index:5;pointer-events:none;
  padding:14px 0 16px;width:46px;
  background:rgba(40,40,46,.55);backdrop-filter:blur(18px) saturate(1.4);
  border:1px solid rgba(255,255,255,.12);border-radius:16px;
  box-shadow:0 8px 24px rgba(0,0,0,.35);
  opacity:0;transform:translate(-50%,-50%) scale(.4);
  transition:opacity .22s cubic-bezier(.32,.72,0,1),transform .32s cubic-bezier(.32,.72,0,1);
}
/* iOS-HUD style expand-in: pops open from a small point, like the brightness/volume pill */
.brightness-readout.show{
  opacity:1;transform:translate(-50%,-50%) scale(1);
}
/* exit: slides off toward the left edge of the screen while fading, like it's leaving through the side */
.brightness-readout.leaving{
  opacity:0;transform:translate(calc(-50% - 70px),-50%) scale(.85);
  transition:opacity .38s cubic-bezier(.4,0,1,1),transform .38s cubic-bezier(.4,0,1,1);
}
.brightness-icon{width:16px;height:16px;color:rgba(255,255,255,.9)}
.brightness-track{
  position:relative;width:8px;height:110px;border-radius:4px;
  background:rgba(255,255,255,.16);overflow:hidden;
}
.brightness-fill{
  position:absolute;bottom:0;left:0;width:100%;
  background:#fff;
  border-radius:4px;
  transition:height .05s linear;
}
.brightness-pct{
  font-family:var(--font-mono);font-size:.6rem;font-weight:600;
  color:rgba(255,255,255,.85);
}

/* ── VOLUME SLIDER — vertical drag zone on the LEFT edge of the video frame ── */
.volume-zone{
  position:absolute;top:0;left:0;bottom:52px;width:34%;z-index:4;
  touch-action:none;
  pointer-events:all;
}
.video-frame.controls-locked .volume-zone{
  pointer-events:none;
}
.volume-readout{
  position:absolute;top:38%;right:18px;
  display:flex;flex-direction:column;align-items:center;gap:10px;
  z-index:5;pointer-events:none;
  padding:14px 0 16px;width:46px;
  background:rgba(40,40,46,.55);backdrop-filter:blur(18px) saturate(1.4);
  border:1px solid rgba(255,255,255,.12);border-radius:16px;
  box-shadow:0 8px 24px rgba(0,0,0,.35);
  opacity:0;transform:translate(50%,-50%) scale(.4);
  transition:opacity .22s cubic-bezier(.32,.72,0,1),transform .32s cubic-bezier(.32,.72,0,1);
}
.volume-readout.show{
  opacity:1;transform:translate(50%,-50%) scale(1);
}
.volume-readout.leaving{
  opacity:0;transform:translate(calc(50% + 70px),-50%) scale(.85);
  transition:opacity .38s cubic-bezier(.4,0,1,1),transform .38s cubic-bezier(.4,0,1,1);
}
.volume-icon{width:16px;height:16px;color:rgba(255,255,255,.9)}
.volume-track{
  position:relative;width:8px;height:110px;border-radius:4px;
  background:rgba(255,255,255,.16);overflow:hidden;
}
.volume-fill{
  position:absolute;bottom:0;left:0;width:100%;
  background:#fff;border-radius:4px;
  transition:height .05s linear;
}
.volume-pct{
  font-family:var(--font-mono);font-size:.6rem;font-weight:600;
  color:rgba(255,255,255,.85);
}

/* ── CUSTOM MEDIA CONTROLS — inside .video-frame ── */
video::-webkit-media-controls{display:none!important}
video::-webkit-media-controls-enclosure{display:none!important}
video::cue{display:none!important;visibility:hidden!important;opacity:0!important}
.media-controls{
  position:absolute;bottom:0;left:0;right:0;z-index:3;
  display:flex;align-items:center;gap:6px;
  padding:10px 12px 12px;
  pointer-events:all; /* re-enable inside frame */
  background:linear-gradient(0deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.38) 55%,transparent 100%);
  opacity:0;transition:opacity .22s var(--ease);
}
.video-wrap:hover .media-controls,
.video-wrap.controls-visible .media-controls{opacity:1}
.mc-btn{
  width:34px;height:34px;border-radius:50%;border:none;
  background:rgba(255,255,255,.12);color:#fff;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  backdrop-filter:blur(8px);
  box-shadow:0 2px 8px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.15);
  transition:background .18s var(--ease),transform .14s var(--ease),box-shadow .18s var(--ease);
}
.mc-btn:hover{background:rgba(0,224,255,.25);transform:scale(1.08);box-shadow:0 4px 14px rgba(0,224,255,.3),inset 0 1px 0 rgba(255,255,255,.2)}
.mc-btn:active{transform:scale(.93)}
.mc-btn svg{width:14px;height:14px;flex-shrink:0}
.mc-play svg{width:15px;height:15px}
.mc-vol-slider{
  width:70px;height:4px;border-radius:10px;outline:none;border:none;cursor:pointer;
  -webkit-appearance:none;appearance:none;
  background:linear-gradient(90deg,var(--accent) 0%,var(--accent) var(--vol,100%),rgba(255,255,255,.2) var(--vol,100%),rgba(255,255,255,.2) 100%);
  transition:width .2s var(--ease);flex-shrink:0;
}
.mc-vol-slider::-webkit-slider-thumb{-webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(0,224,255,.6);cursor:pointer;transition:transform .15s}
.mc-vol-slider::-webkit-slider-thumb:hover{transform:scale(1.25)}
.mc-vol-slider::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:#fff;border:none;cursor:pointer}
.mc-live-tag{
  font-family:var(--font-mono);font-size:.6rem;font-weight:700;letter-spacing:.1em;
  color:#fff;background:linear-gradient(135deg,var(--red),#c0183c);
  border-radius:20px;padding:3px 8px;display:flex;align-items:center;gap:5px;
  box-shadow:0 0 8px rgba(255,59,92,.45);flex-shrink:0;
}
.mc-live-dot{width:5px;height:5px;border-radius:50%;background:#fff;animation:blink 1.2s ease infinite;flex-shrink:0}
.mc-spacer{flex:1}
.mc-layout svg,.mc-full svg,.mc-lock svg{width:16px;height:16px}

/* ── LIQUID GLASS sheen on media-control buttons (CSS only, GPU layer, never touches <video>) ── */
.mc-btn{position:relative;isolation:isolate;overflow:hidden}
.mc-btn::before{
  content:'';position:absolute;inset:0;z-index:-1;border-radius:50%;
  background:linear-gradient(135deg,rgba(255,255,255,.32) 0%,rgba(255,255,255,.06) 38%,rgba(0,224,255,.10) 62%,rgba(124,92,255,.16) 100%);
  opacity:0;transition:opacity .25s var(--ease);
  will-change:opacity; /* compositor-only, no layout/paint cost on the video element */
}
.mc-btn::after{
  content:'';position:absolute;top:-60%;left:-20%;width:50%;height:220%;z-index:-1;
  background:linear-gradient(105deg,transparent 0%,rgba(255,255,255,.55) 48%,transparent 100%);
  transform:translateX(-140%) rotate(8deg);opacity:0;
  transition:opacity .2s var(--ease);
}
.mc-btn:hover::before,.mc-btn:active::before{opacity:1}
.mc-btn:active::after{opacity:.8;transform:translateX(220%) rotate(8deg);transition:transform .5s var(--ease),opacity .2s var(--ease)}

/* ── LOCK BUTTON ── */
.mc-lock.locked{background:rgba(0,224,255,.22);box-shadow:0 2px 10px rgba(0,224,255,.35),inset 0 1px 0 rgba(255,255,255,.2)}

/* when controls are locked: dim + disable every control except the lock button itself */
.media-controls.mc-locked .mc-btn:not(.mc-lock),
.media-controls.mc-locked .mc-vol-slider{
  opacity:.32;pointer-events:none;filter:saturate(.5);
}
.media-controls.mc-locked{opacity:1!important} /* keep the bar visible so the lock button stays reachable */

/* layout-horizontal mode */
.layout.horiz .sidebar{
  width:var(--sw);height:200px;position:static;
  display:flex;flex-direction:column;overflow:hidden;
}
/* vertical layout on phone — toggles layout to stacked */
.layout.vert-phone{flex-direction:column}
.layout.vert-phone .sidebar{width:100%;height:auto;max-height:38vh;border-right:none;border-top:1px solid var(--border)}
.layout.vert-phone .player-area{flex:1}

/* ── MAXIMIZE (force-landscape) mode — triggered by mc-full ── */
.layout.force-landscape{
  position:fixed;inset:0;z-index:400;margin-top:0;height:100vh;width:100vw;
  background:var(--dark);
}
.layout.force-landscape .sidebar{display:none}
.layout.force-landscape .player-area{flex:1;height:100%}
@media (max-width:900px){
  /* rotate the whole layout to fill the screen horizontally on narrow/phone viewports */
  .layout.force-landscape{
    width:100vh;height:100vw;
    top:50%;left:50%;
    transform:translate(-50%,-50%) rotate(90deg);
    transform-origin:center center;
  }
  /* children must fill the ROTATED box (100% of its own w/h), not raw viewport units,
     otherwise the video + controls overflow/underflow the visible area after rotation */
  .layout.force-landscape .player-area,
  .layout.force-landscape .video-wrap{
    height:100%;width:100%;
  }
}

/* ── TELEGRAM CHAT BUTTON on owner card ── */
.owner-card{position:relative}
.tg-chat-btn{
  position:absolute;top:10px;right:10px;
  width:28px;height:28px;border-radius:50%;border:none;
  background:linear-gradient(135deg,#229ED9,#1a7fbf);color:#fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 12px rgba(34,158,217,.45),inset 0 1px 0 rgba(255,255,255,.2);
  cursor:pointer;text-decoration:none;
  z-index:10;pointer-events:all;
  transition:transform .2s var(--ease),box-shadow .2s var(--ease);
  animation:tgFloat 3s ease-in-out infinite;
}
@keyframes tgFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.tg-chat-btn:hover{transform:scale(1.12) translateY(-2px)!important;box-shadow:0 6px 20px rgba(34,158,217,.6)}
.tg-chat-btn:active{transform:scale(.94)!important}
.tg-chat-btn svg{width:14px;height:14px;fill:currentColor;flex-shrink:0;pointer-events:none}

.notif-nav-dot{
  position:absolute;top:2px;right:2px;width:8px;height:8px;border-radius:50%;background:var(--red);
  border:2px solid var(--card2);display:none;pointer-events:none;
}
.notif-nav-dot.show{display:block}
.bnav-icon-wrap{position:relative;display:inline-flex}
.bnav-icon-wrap .notif-nav-dot{top:-3px;right:-5px;border-color:var(--nav-bg,var(--card2))}
.notif-menu-dot{
  display:none;width:6px;height:6px;border-radius:50%;background:var(--red);margin-left:auto;flex-shrink:0;
}
.notif-menu-dot.show{display:block}

.account-settings-btn{
  position:absolute;top:10px;left:10px;
  width:28px;height:28px;border-radius:50%;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;text-decoration:none;z-index:10;
  transition:border-color .2s var(--ease),color .2s var(--ease);
}
.account-settings-btn:hover{border-color:var(--accent);color:var(--accent)}
.account-settings-btn svg{width:14px;height:14px;flex-shrink:0;pointer-events:none}

.user-menu-wrap{position:absolute;top:10px;right:10px;z-index:20}
.user-menu-btn{
  position:relative;
  width:30px;height:30px;border-radius:8px;border:1px solid var(--border-strong);
  background:var(--card2);color:var(--text);display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:border-color .2s var(--ease),color .2s var(--ease);
}
.user-menu-btn:hover,.user-menu-btn.open{border-color:var(--accent);color:var(--accent)}
.user-menu-btn svg{width:17px;height:17px;flex-shrink:0;pointer-events:none}
.user-menu-dropdown{
  position:absolute;bottom:38px;top:auto;right:0;min-width:190px;background:var(--card);border:1px solid var(--border-strong);
  border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:6px;display:none;flex-direction:column;gap:2px;z-index:30;
}
.user-menu-dropdown.open{display:flex}
.user-menu-item{
  display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:8px;border:none;background:transparent;
  color:var(--text);font-size:.82rem;font-weight:600;text-decoration:none;width:100%;text-align:left;cursor:pointer;
  transition:background .15s var(--ease);
}
.user-menu-item:hover{background:var(--card2)}
.umi-icon{width:16px;height:16px;flex-shrink:0;stroke:currentColor}
.umi-lock{width:13px;height:13px;flex-shrink:0;margin-left:auto;stroke:currentColor;opacity:.7;display:none}
.user-menu-item.locked{color:var(--muted2);cursor:not-allowed;pointer-events:none}
.user-menu-item.locked .umi-icon{opacity:.4}
.user-menu-item.locked .umi-lock{display:block}
.user-menu-avatar{
  width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:700;color:#04141a;
  flex-shrink:0;background-size:cover;background-position:center;
}
.user-menu-logout{color:var(--red)}
.user-menu-logout:hover{background:rgba(255,59,92,.1)}

/* ── bottom-nav settings dropdown (same visual language, no logout) ── */
.bnav-menu-wrap{position:relative}
.bnav-menu{
  position:absolute;bottom:calc(var(--bnav-h) + 8px);right:8px;min-width:190px;background:var(--card);
  border:1px solid var(--border-strong);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);
  padding:6px;display:none;flex-direction:column;gap:2px;z-index:310;
}
.bnav-menu.open{display:flex}


@media(max-width:768px){
  :root{--sw:270px}
  .sidebar{
    position:fixed;left:0;top:var(--nav-h);bottom:var(--bnav-h);z-index:250;
    transform:translateX(-100%);transition:transform .32s var(--ease);
    box-shadow:6px 0 40px rgba(0,0,0,.6);
  }
  .sidebar.open{transform:translateX(0)}
  .search-wrap{max-width:200px}
  .wa-btn{bottom:48px;right:10px;font-size:.7rem;padding:8px 12px}
}

/* ── BOTTOM NAV: Search / Api / Settings ── */
.bottom-nav{
  position:fixed;left:0;right:0;bottom:0;z-index:300;height:var(--bnav-h);
  display:flex;align-items:stretch;
  background:var(--nav-bg);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);
  border-top:1px solid var(--border);
  padding-bottom:env(safe-area-inset-bottom,0);
}
.bnav-item{
  position:relative;
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  padding:8px 4px 6px;background:transparent;border:none;color:var(--muted);
  font-size:.65rem;font-weight:600;letter-spacing:.01em;cursor:pointer;transition:color .2s var(--ease);
  font-family:var(--font-body);text-decoration:none;
}
.bnav-item svg{width:20px;height:20px;stroke:currentColor;transition:transform .18s var(--ease)}
.bnav-item:hover{color:var(--text)}
.bnav-item.active{color:var(--accent)}
.bnav-item:active svg{transform:scale(.86)}
.lg-toast{
  position:fixed;top:16px;left:50%;transform:translate(-50%,-160%);
  display:flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px;
  background:rgba(28,28,36,.5);backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:0 10px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.16);
  color:#fff;font-size:.86rem;font-weight:600;letter-spacing:.01em;white-space:nowrap;
  z-index:1000;pointer-events:none;opacity:0;
  transition:transform .6s cubic-bezier(.34,1.56,.64,1),opacity .35s ease;
}
.lg-toast.show{transform:translate(-50%,0);opacity:1}
.lg-toast .lg-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));flex-shrink:0}

.page-overlay{
  position:fixed;inset:0;background:rgba(10,10,15,.75);backdrop-filter:blur(8px);
  display:none;align-items:center;justify-content:center;z-index:400;
}
.page-overlay.show{display:flex}
.overlay-card{
  background:var(--card);border:1px solid var(--border-strong);border-radius:16px;padding:28px 26px;
  display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.5);max-width:320px;width:90%;
}
.overlay-title{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.overlay-sub{font-size:.85rem;color:var(--muted);line-height:1.5}
.overlay-btn-danger{
  background:transparent;color:var(--red);border:1px solid rgba(255,59,92,.35);
  font-weight:700;font-size:.85rem;padding:11px 16px;border-radius:10px;width:100%;
  display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s var(--ease);
}
.overlay-btn-danger:hover{background:rgba(255,59,92,.1)}
.overlay-cancel{background:transparent;border:none;color:var(--muted);font-size:.78rem;align-self:center;text-decoration:underline;cursor:pointer}

/* ── Friend search overlay ── */
.friend-search-card{max-width:380px;text-align:left}
.fs-input-wrap{position:relative}
.fs-input-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:15px;height:15px;opacity:.4;pointer-events:none}
.fs-input-wrap input{
  width:100%;background:var(--card2);border:1px solid var(--border-strong);border-radius:10px;
  padding:11px 12px 11px 36px;color:var(--text);font-size:.88rem;outline:none;font-family:var(--font-body);
  transition:border-color .2s var(--ease);
}
.fs-input-wrap input:focus{border-color:var(--accent)}
.fs-results{max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin-top:2px;min-height:40px}
.fs-user{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;transition:background .15s var(--ease);cursor:pointer}
.fs-user:hover{background:var(--card2)}
.fs-avatar{
  width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-size:.78rem;font-weight:700;color:#04141a;
  flex-shrink:0;background-size:cover;background-position:center;
}
.fs-user-info{flex:1;min-width:0}
.fs-user-name{font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs-user-username{font-size:.74rem;color:var(--muted)}
.fs-verified-badge{display:inline-flex;vertical-align:middle;margin-left:3px;position:relative;top:-1px}
.fs-follow-btn{
  width:34px;height:34px;border-radius:50%;border:1px solid var(--border-strong);background:var(--card2);
  color:var(--accent);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;
  transition:all .18s var(--ease);
}
.fs-follow-btn svg{width:16px;height:16px}
.fs-follow-btn:disabled{opacity:.5;cursor:default}

.mpv-card{
  width:100%;max-width:340px;background:var(--card);border:1px solid var(--border-strong);
  border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);padding:26px 22px;text-align:center;
}
.mpv-avatar{
  width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));
  display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;
  font-size:1.7rem;color:#04141a;margin:0 auto 12px;background-size:cover;background-position:center;
}
.mpv-name{font-family:var(--font-display);font-weight:700;font-size:1.05rem}
.mpv-username{font-size:.82rem;color:var(--muted);margin-top:2px;margin-bottom:16px}
.mpv-stats{display:flex;justify-content:center;gap:22px;margin-bottom:20px}
.mpv-stat{display:flex;flex-direction:column;align-items:center;gap:2px}
.mpv-stat-num{font-family:var(--font-display);font-weight:700;font-size:1rem}
.mpv-stat-label{font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.02em}
.mpv-view-btn{
  width:100%;padding:11px;border-radius:10px;border:none;font-weight:700;font-size:.85rem;
  background:linear-gradient(135deg,var(--accent),var(--accent2));color:#04141a;margin-bottom:8px;
}
.mpv-close-text{background:transparent;border:none;color:var(--muted);font-size:.8rem;text-decoration:underline}
.fs-follow-btn.following{color:#04141a;background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent}
.fs-empty,.fs-hint{font-size:.8rem;color:var(--muted);text-align:center;padding:20px 8px}
.fs-loading{display:flex;align-items:center;justify-content:center;gap:8px;font-size:.8rem;color:var(--muted);padding:20px 8px}
.fs-loading-dots{display:inline-flex;gap:4px}
.fs-loading-dots span{width:5px;height:5px;border-radius:50%;background:var(--accent);animation:fsDotBounce 1.1s ease-in-out infinite}
.fs-loading-dots span:nth-child(2){animation-delay:.15s}
.fs-loading-dots span:nth-child(3){animation-delay:.3s}
@keyframes fsDotBounce{
  0%,60%,100%{transform:translateY(0);opacity:.4}
  30%{transform:translateY(-4px);opacity:1}
}
</style>
</head>
<body>

<!-- SVG defs for gradients used in CSS -->
<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <defs>
    <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E0FF"/>
      <stop offset="100%" stop-color="#7c5cff"/>
    </linearGradient>
  </defs>
</svg>

<nav class="nav">
  <button class="menu-btn" id="menuBtn" aria-label="Channels">
    <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  </button>
  <div class="nav-logo">
    <svg class="nav-tv-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>
    ES TEAMS TV <span class="live-pill">LIVE</span>
  </div>
  <div class="search-wrap">
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
    </svg>
    <input id="searchInput" class="search-input" placeholder="Search channels…" autocomplete="off" spellcheck="false">
    <div class="search-dropdown" id="searchDropdown"></div>
  </div>
</nav>

<div class="overlay" id="overlay"></div>

<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-inner">
      ${liveTV.map((cat, ci) => `
      <div class="cat-group">
        <div class="cat-header${ci === 0 ? ' open' : ''}" data-ci="${ci}">
          <span class="cat-label">
            <span class="cat-icon" aria-hidden="true">${categoryIcon(cat.category)}</span>
            <span>${cat.category}</span>
          </span>
          <span class="cat-meta">
            <span class="cat-count">${cat.channels.length}</span>
            <svg class="cat-arrow" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
            </svg>
          </span>
        </div>
        <div class="ch-list${ci === 0 ? ' open' : ''}" id="cl-${ci}">
          ${cat.channels.map(ch => ch.redirect ? `
          <button class="ch-btn ch-btn-redirect" data-id="${ch.id}" data-name="${ch.name}" data-redirect="${ch.redirect}">
            <span class="ch-dot ch-dot-redirect"></span>
            <span class="ch-name">${ch.name}</span>
          </button>` : `
          <button class="ch-btn" data-id="${ch.id}" data-name="${ch.name}">
            <span class="ch-dot"></span>
            <span class="ch-name">${ch.name}</span>
          </button>`).join('')}
        </div>
      </div>`).join('')}
      <div class="no-results" id="noResults">No channels found</div>
    </div>

    <!-- ── WATCH HOURS ── -->
    <div class="watch-hours-wrap">
      <div class="wh-ring-wrap">
        <div class="wh-circle" id="whCircle">
          <div class="wh-inner">
            <div class="wh-val" id="whVal">0h</div>
          </div>
        </div>
        <div class="wh-info">
          <div class="wh-title">Watch Hours</div>
          <div class="wh-label" id="whLabel">0 hrs 0 mins</div>
          <div class="wh-sub">Time on ES TEAMS TV</div>
        </div>
      </div>
    </div>

    <!-- ── OWNER PROFILE HEAD ── -->
    <div class="owner-card">
      <div class="owner-crown">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 19h20l-3-9-5 5-2-9-2 9-5-5z"/>
          <path d="M2 19h20"/>
        </svg>
      </div>
      <div class="owner-row">
        <div class="owner-avatar">
          <span class="owner-avatar-inner">ES</span>
          <span class="owner-status-ring"></span>
          <span class="notif-nav-dot js-feed-dot" id="ownerAvatarDot"></span>
        </div>
        <div class="owner-info">
          <div class="owner-name">ES TEAMS TECH</div>
          <div class="owner-tagline">Live since day one · EST</div>
        </div>
      </div>
      <a class="account-settings-btn" href="/account" aria-label="Account Settings" title="Account Settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span class="notif-nav-dot js-account-dot" id="acctIconDot"></span>
      </a>
      <!-- Account menu -->
      <div class="user-menu-wrap">
        <button class="user-menu-btn" id="userMenuBtn" aria-label="Menu" title="Menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          <span class="notif-nav-dot js-account-dot" id="menuBtnDot"></span>
        </button>
        <div class="user-menu-dropdown" id="userMenuDropdown">
          <button type="button" class="user-menu-item" id="menuApiItem">
            <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
            Api
          </button>
          <button type="button" class="user-menu-item" id="menuDeployBotItem">
            <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="15.5" cy="16" r="1.2"/><path stroke-linecap="round" d="M12 11V7m-3 0h6"/></svg>
            Deploy Bot
          </button>
          <a href="/account#pwCard" class="user-menu-item">
            <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Account
            <span class="notif-menu-dot js-notif-dot" id="menuAccountDot"></span>
          </a>
          <a href="/admin" class="user-menu-item" id="menuAdminItem">
            <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Admin
            <svg class="umi-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
          </a>
          <a href="/dmca" class="user-menu-item" id="menuDmcaItem">
            <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            DMCA
          </a>
          <span class="user-menu-avatar" id="menuAvatar" style="display:none">–</span>
          <button class="user-menu-item user-menu-logout" id="menuLogoutBtn" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px;flex-shrink:0"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  </aside>

  <main class="player-area">

    <!-- ── ANNOUNCEMENT TICKER ── -->
    <div class="announce-bar" id="announceTicker">
      <div class="announce-label">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        NEWS
      </div>
      <div class="announce-track" id="announceTrack">
        <div class="announce-scroll" id="announceScroll">
          <span class="announce-item">Welcome to ES TEAMS TV — Your #1 live TV streaming destination</span>
          <span class="announce-item">Join our WhatsApp Channel for live updates and announcements</span>
          <span class="announce-item">All channels are streaming in HD quality — enjoy the experience</span>
          <span class="announce-item">Press and hold any announcement to pause and read it</span>
          <span class="announce-item">New channels added weekly — stay tuned for more content</span>
          <span class="announce-item">ES TEAMS TV — Powered by ES TEAMS TECH</span>
          <!-- duplicate for seamless loop -->
          <span class="announce-item">Welcome to ES TEAMS TV — Your #1 live TV streaming destination</span>
          <span class="announce-item">Join our WhatsApp Channel for live updates and announcements</span>
          <span class="announce-item">All channels are streaming in HD quality — enjoy the experience</span>
          <span class="announce-item">Press and hold any announcement to pause and read it</span>
          <span class="announce-item">New channels added weekly — stay tuned for more content</span>
          <span class="announce-item">ES TEAMS TV — Powered by ES TEAMS TECH</span>
        </div>
      </div>
    </div>
    <div class="placeholder" id="placeholder">
      <div class="scanlines"></div>
      <div class="ph-frame">
        <span class="ph-corner-b1"></span>
        <span class="ph-corner-b2"></span>
        <div class="ph-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <rect x="2" y="4" width="20" height="14" rx="2"/>
            <path stroke-linecap="round" d="M8 20h8M12 18v2"/>
          </svg>
        </div>
        <h3>No signal</h3>
        <p>Select a channel from the sidebar to tune in</p>
      </div>
    </div>

    <!-- HLS video player (replaces iframe) -->
    <div class="video-wrap" id="videoWrap">
      <video id="videoPlayer" playsinline autoplay muted></video>

      <!-- inner frame that matches the actual rendered video rect -->
      <div class="video-frame" id="videoFrame">

        <!-- ── CONNECTING overlay ── -->
        <div class="connecting-overlay" id="connectingOverlay">
          <span class="connecting-spinner"></span>
          <span class="connecting-msg">Connecting to Es Teams Tv...</span>
        </div>

        <!-- ── CHANNEL DOWN overlay ── -->
        <div class="ch-down-overlay" id="chDownOverlay">
          <div class="ch-down-card">
            <span class="ch-down-c3"></span><span class="ch-down-c4"></span>
            <div class="ch-down-tv">
              <div class="ch-down-tv-scan"></div>
              <span class="ch-down-tv-ant-l"></span>
              <span class="ch-down-tv-ant-r"></span>
              <span class="ch-down-warn"></span>
            </div>
            <div class="ch-down-badge">SIGNAL LOST</div>
            <div class="ch-down-title">
              Unable to connect to
              <span class="ch-down-title-name" id="chDownName"></span>
            </div>
            <div class="ch-down-sub">Please try again later<span class="ch-down-dot1">.</span><span class="ch-down-dot2">.</span><span class="ch-down-dot3">.</span></div>
            <button class="ch-down-retry" id="chDownRetry" type="button">
              <span class="ch-down-retry-icon"></span>
              RETRY
            </button>
          </div>
        </div>

        <!-- ── NETWORK STRENGTH ── -->
        <div class="net-badge" id="netBadge">
          <span class="net-bars"><i></i><i></i><i></i><i></i></span>
          <span class="net-label" id="netLabel">H</span>
        </div>

        <!-- ── WATERMARK ── -->
        <div class="wm-badge">
          <svg class="wm-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L3 6v5c0 5.25 3.75 10.15 9 11.25C17.25 21.15 21 16.25 21 11V6z"/>
            <path d="M9 12l2 2 4-4" stroke-width="2"/>
          </svg>
          <span class="wm-name">ES TEAMS TV</span>
        </div>

        <!-- ── BRIGHTNESS slide zone (right side) + readout ── -->
        <div class="brightness-zone" id="brightnessZone"></div>
        <div class="brightness-readout" id="brightnessReadout">
          <svg class="brightness-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
          </svg>
          <div class="brightness-track"><div class="brightness-fill" id="brightnessFill"></div></div>
          <span class="brightness-pct" id="brightnessPct">100%</span>
        </div>

        <!-- ── VOLUME slide zone (left side) + readout ── -->
        <div class="volume-zone" id="volumeZone"></div>
        <div class="volume-readout" id="volumeReadout">
          <svg class="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/>
            <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
          </svg>
          <div class="volume-track"><div class="volume-fill" id="volumeFill"></div></div>
          <span class="volume-pct" id="volumePct">50%</span>
        </div>

        <!-- ── CUSTOM MEDIA CONTROLS ── -->
        <div class="media-controls" id="mediaControls">
          <button class="mc-btn mc-play" id="mcPlay" aria-label="Play/Pause">
            <svg id="mcPlayIcon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
          </button>
          <button class="mc-btn mc-vol" id="mcMute" aria-label="Mute/Unmute">
            <svg id="mcVolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/>
              <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
            </svg>
          </button>
          <input class="mc-vol-slider" id="mcVolSlider" type="range" min="0" max="1" step="0.02" value="1" aria-label="Volume">
          <span class="mc-live-tag"><span class="mc-live-dot"></span>LIVE</span>
          <span class="mc-spacer"></span>
          <button class="mc-btn mc-lock" id="mcLock" aria-label="Lock controls">
            <svg id="mcLockIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
            </svg>
          </button>
          <button class="mc-btn mc-layout" id="mcLayout" aria-label="Toggle layout">
            <svg id="mcLayoutIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M2 9h20"/>
            </svg>
          </button>
          <button class="mc-btn mc-full" id="mcFull" aria-label="Maximize">
            <svg id="mcFullIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
            </svg>
          </button>
        </div>

      </div><!-- /video-frame -->

      <!-- overlays (live badge stays on full wrap, top-left) -->
      <div class="live-badge">
        <span class="live-badge-sweep"></span>
        <span class="live-dot"></span>
        <span class="live-on-air">ON AIR</span>
        <span class="live-sep">·</span>
        <span id="liveName">—</span>
      </div>

      <a class="wa-btn" id="waBtn" href="https://whatsapp.com/channel/0029VatAyCwFy72JdZXFPm29" target="_blank" rel="noopener" title="Hold &amp; drag to reposition">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
        </svg>
        WhatsApp
        <span class="wa-drag-hint">⠿</span>
      </a>
    </div>

    <!-- status bar -->
    <div class="status-bar" id="statusBar" style="display:none">
      <span class="status-dot" id="statusDot"></span>
      <span id="statusText">Connecting…</span>
    </div>

    <!-- ── MORE CHANNELS — category grid, fetched fresh on every page load ── -->
    <div class="more-ch-wrap" id="moreChWrap">
      <div class="more-ch-label">
        <span>More Channels</span>
        <button type="button" class="more-ch-toggle" id="moreChToggle" aria-label="Collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="more-ch-body">
        <div class="more-ch-grid" id="moreChGrid">
          <div class="more-ch-loading">Loading categories…</div>
        </div>
      </div>
    </div>

  </main>
</div>

<!-- More Channels reopen bar — independent fixed element, shown only while the grid below is collapsed -->
<div class="more-ch-reopen" id="moreChReopen">
  <span>More Channels</span>
  <button type="button" class="more-ch-toggle" id="moreChReopenBtn" aria-label="Expand">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/></svg>
  </button>
</div>

<!-- More Channels — category channel list, centered overlay (same pattern as Find Friends search) -->
<div class="page-overlay" id="moreChOverlay">
  <div class="overlay-card">
    <div class="overlay-title" id="moreChPanelTitle">Category</div>
    <div class="mc-list" id="moreChPanelBody"></div>
    <button class="overlay-cancel" id="moreChPanelClose">Close</button>
  </div>
</div>

<nav class="bottom-nav" id="bottomNav">
  <a href="/profile" class="bnav-item" id="bnavProfile" aria-label="Profile">
    <span class="bnav-icon-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span class="notif-nav-dot js-notif-dot" id="bnavProfileDot"></span>
    </span>
    Profile
  </a>
  <button type="button" class="bnav-item" id="bnavSearch" aria-label="Search">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
    Search
  </button>
  <div class="bnav-item bnav-menu-wrap">
    <button type="button" class="bnav-item" id="bnavSettings" aria-label="Settings" style="padding:0;flex:none;width:100%">
      <span class="bnav-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span class="notif-nav-dot js-account-dot" id="bnavSettingsDot"></span>
      </span>
      Settings
    </button>
    <div class="bnav-menu" id="bnavSettingsMenu">
      <button type="button" class="user-menu-item" id="bnavApiItem">
        <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>
        Api
      </button>
      <button type="button" class="user-menu-item" id="bnavDeployBotItem">
        <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="8.5" cy="16" r="1.2"/><circle cx="15.5" cy="16" r="1.2"/><path stroke-linecap="round" d="M12 11V7m-3 0h6"/></svg>
        Deploy Bot
      </button>
      <a href="/account#pwCard" class="user-menu-item">
        <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Account
        <span class="notif-menu-dot js-account-dot" id="bnavAccountDot"></span>
      </a>
      <a href="/admin" class="user-menu-item" id="bnavAdminItem">
        <svg class="umi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Admin
        <svg class="umi-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>
      </a>
    </div>
  </div>
</nav>

<div class="page-overlay" id="logoutOverlay">
  <div class="overlay-card">
    <div class="overlay-title">Log out?</div>
    <div class="overlay-sub">Are you sure you want to logout?</div>
    <button class="overlay-btn-danger" id="confirmLogoutBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:16px;height:16px"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
      Logout
    </button>
    <button class="overlay-cancel" id="cancelLogoutBtn">Cancel</button>
  </div>
</div>

<div class="page-overlay" id="friendSearchOverlay">
  <div class="overlay-card friend-search-card">
    <div class="overlay-title">Find Friends</div>
    <div class="fs-input-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="fsInput" placeholder="Search by username…" autocomplete="off" spellcheck="false">
    </div>
    <div class="fs-results" id="fsResults"></div>
    <button class="overlay-cancel" id="fsCloseBtn">Close</button>
  </div>
</div>

<div class="page-overlay" id="mpvOverlay">
  <div class="mpv-card">
    <div class="mpv-avatar" id="mpvAvatar">–</div>
    <div class="mpv-name" id="mpvName">–</div>
    <div class="mpv-username" id="mpvUsername">–</div>
    <div class="mpv-stats">
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvFollowers">0</div><div class="mpv-stat-label">Followers</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvFollowing">0</div><div class="mpv-stat-label">Following</div></div>
      <div class="mpv-stat"><div class="mpv-stat-num" id="mpvLikes">0</div><div class="mpv-stat-label">Likes</div></div>
    </div>
    <button type="button" class="mpv-view-btn" id="mpvViewBtn">View Profile</button>
    <button type="button" class="mpv-close-text" id="mpvCloseBtn">Close</button>
  </div>
</div>

<!-- hls.js -->
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js"></script>

<script>
(function(){
  var sidebar    = document.getElementById('sidebar');
  var overlay    = document.getElementById('overlay');
  var menuBtn    = document.getElementById('menuBtn');
  var placeholder= document.getElementById('placeholder');
  var videoWrap  = document.getElementById('videoWrap');
  var video      = document.getElementById('videoPlayer');
  var statusBar  = document.getElementById('statusBar');
  var statusDot  = document.getElementById('statusDot');
  var statusText = document.getElementById('statusText');
  var connectingOverlay = document.getElementById('connectingOverlay');
  var liveName   = document.getElementById('liveName');
  var search     = document.getElementById('searchInput');
  var noResults  = document.getElementById('noResults');
  var hlsInstance= null;
  var loadSeq = 0; // guards against a slow token fetch resolving after the user has already switched channels again

  /* ── sidebar ── */
  function openSB(){ sidebar.classList.add('open'); overlay.classList.add('open'); }
  function closeSB(){ sidebar.classList.remove('open'); overlay.classList.remove('open'); }
  menuBtn.addEventListener('click', function(){ sidebar.classList.contains('open') ? closeSB() : openSB(); });
  overlay.addEventListener('click', closeSB);

  /* ── accordion ── */
  document.querySelectorAll('.cat-header').forEach(function(hdr){
    hdr.addEventListener('click', function(){
      var list = document.getElementById('cl-' + hdr.dataset.ci);
      var now  = list.classList.toggle('open');
      hdr.classList.toggle('open', now);
    });
  });

  /* ── status helpers ── */
  function setStatus(msg, type){
    statusText.textContent = msg;
    statusDot.className = 'status-dot' + (type ? ' ' + type : '');
  }

  /* ── live-pill state ── */
  var livePill = document.querySelector('.live-pill');
  function setLivePillOn(){ if(livePill) livePill.classList.add('live-pill-on'); }
  function setLivePillOff(){ if(livePill) livePill.classList.remove('live-pill-on'); }

  /* connecting overlay: stays visible through "Connecting…" AND any buffering in between,
     only hides once the video has actually produced a real playable frame (readyState 0.000001s ready) */
  var _connectTimer = null;
  function showConnecting(){ if(connectingOverlay) connectingOverlay.classList.add('show'); }
  function hideConnecting(){
    if(connectingOverlay) connectingOverlay.classList.remove('show');
    if(_connectTimer){ clearTimeout(_connectTimer); _connectTimer = null; }
  }
  /* Start a watchdog: if stream hasn't played within 14 s, give up and show unavailable screen */
  function armConnectTimeout(id, name){
    if(_connectTimer) clearTimeout(_connectTimer);
    _connectTimer = setTimeout(function(){
      _connectTimer = null;
      if(connectingOverlay && connectingOverlay.classList.contains('show')){
        hideConnecting();
        setLivePillOff();
        setStatus('Stream unavailable', 'error');
        showChDown(id, name);
        var dBtn = document.querySelector('.ch-btn[data-id="' + id + '"]');
        if(dBtn){ var d=dBtn.querySelector('.ch-dot'); if(d){d.classList.add('ch-dot-down');d.classList.remove('ch-dot-up');} dBtn.dataset.chStatus='down'; }
      }
    }, 14000);
  }

  /* ── HLS player ── */
  function loadChannel(id, name){
    /* mark active */
    document.querySelectorAll('.ch-btn').forEach(function(b){ b.classList.remove('active'); });
    var btn = document.querySelector('.ch-btn[data-id="' + id + '"]');
    if(btn) btn.classList.add('active');

    liveName.textContent = name.toUpperCase();

    /* show player, hide placeholder */
    placeholder.style.display = 'none';
    videoWrap.style.display   = 'block';
    videoWrap.style.flex = '1';

    /* destroy previous hls instance */
    if(hlsInstance){ hlsInstance.destroy(); hlsInstance = null; }
    video.src = '';

    var mySeq = ++loadSeq; // this call's turn — a later loadChannel() call bumps loadSeq and supersedes it
    setStatus('Connecting…', 'buffering');
    showConnecting();
    armConnectTimeout(id, name);
    setLivePillOff();
    hideChDown();

    /* Debounce the "Connecting…" overlay: a live stream naturally hiccups for a few
       hundred ms now and then (readyState briefly dropping below 3) — that's normal and
       showing/hiding the overlay for it is what makes playback feel like it's "cutting".
       Only surface the overlay if a stall lasts longer than this. */
    var _waitingTimer = null;
    function onStall(){
      setStatus('Buffering…', 'buffering');
      if(_waitingTimer) return;
      _waitingTimer = setTimeout(function(){ showConnecting(); }, 600);
    }
    function onRecovered(){
      if(_waitingTimer){ clearTimeout(_waitingTimer); _waitingTimer = null; }
    }

    /* Ask our own server for a short-lived, token-gated proxy URL for this
       channel instead of pointing the player straight at the real upstream
       restream host — keeps that host out of the browser's network tab and
       routes playback through the same rate-limited, expiring-token proxy
       the public developer API uses (/api/v1/hls/...). */
    fetch('/api/stream-token/' + encodeURIComponent(id))
      .then(function(r){ if(!r.ok) throw new Error('token request failed'); return r.json(); })
      .then(function(data){
        if(mySeq !== loadSeq) return; // superseded by a later channel switch
        var url = data.url;

        /* native HLS (Safari / iOS) */
        if(!Hls.isSupported() && video.canPlayType('application/vnd.apple.mpegurl')){
          video.src = url;
          video.addEventListener('loadedmetadata', function(){ setStatus('Playing', ''); });
          video.addEventListener('waiting',        function(){ if(video.readyState < 3) onStall(); });
          video.addEventListener('playing',        function(){ onRecovered(); setStatus('Playing', ''); hideConnecting(); setLivePillOn(); hideChDown(); });
          video.addEventListener('canplay',        function(){ if(video.readyState >= 3){ onRecovered(); hideConnecting(); } });
          video.addEventListener('loadeddata',     function(){ if(video.readyState >= 3){ onRecovered(); hideConnecting(); } });
          video.addEventListener('error',          function(){ onRecovered(); setStatus('Stream error', 'error'); hideConnecting(); setLivePillOff(); showChDown(id, name); });
          video.play().catch(function(){});
          if(window.innerWidth <= 768) closeSB();
          return;
        }

        /* hls.js (Chrome, Firefox, etc.) */
        if(!Hls.isSupported()){
          setStatus('HLS not supported in this browser', 'error');
          return;
        }

        var hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          maxBufferLength: 30,
        });

        hlsInstance = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        var _netRetries = 0;
        var MAX_NET_RETRIES = 3;

        hls.on(Hls.Events.MANIFEST_PARSED, function(){
          onRecovered();
          setStatus('Playing', '');
          hideChDown();
          hideConnecting();
          setLivePillOn();
          video.play().catch(function(){});
        });

        hls.on(Hls.Events.ERROR, function(event, data){
          if(!data.fatal){ return; } /* non-fatal HLS chatter is normal during live playback — never touch the overlay or status for this */
          if(data.type === Hls.ErrorTypes.NETWORK_ERROR){
            _netRetries++;
            if(_netRetries <= MAX_NET_RETRIES){
              setStatus('Network error — retrying (' + _netRetries + '/' + MAX_NET_RETRIES + ')…', 'error');
              if(!_waitingTimer) _waitingTimer = setTimeout(function(){ showConnecting(); }, 600);
              hls.startLoad();
            } else {
              onRecovered();
              setStatus('Stream unavailable', 'error');
              hideConnecting();
              setLivePillOff();
              showChDown(id, name);
              var dBtn = document.querySelector('.ch-btn[data-id="' + id + '"]');
              if(dBtn){ var d=dBtn.querySelector('.ch-dot'); if(d){d.classList.add('ch-dot-down');d.classList.remove('ch-dot-up');} dBtn.dataset.chStatus='down'; }
            }
          } else if(data.type === Hls.ErrorTypes.MEDIA_ERROR){
            setStatus('Media error — recovering…', 'error');
            if(!_waitingTimer) _waitingTimer = setTimeout(function(){ showConnecting(); }, 600);
            hls.recoverMediaError();
          } else {
            onRecovered();
            setStatus('Stream unavailable', 'error');
            hideConnecting();
            setLivePillOff();
            showChDown(id, name);
            /* mark this channel's dot red */
            var dBtn = document.querySelector('.ch-btn[data-id="' + id + '"]');
            if(dBtn){ var d=dBtn.querySelector('.ch-dot'); if(d){d.classList.add('ch-dot-down');d.classList.remove('ch-dot-up');} dBtn.dataset.chStatus='down'; }
          }
        });

        video.addEventListener('waiting',  function(){
          /* only treat this as "still loading" if the video has no playable frames yet (readyState < 3) */
          if(video.readyState < 3) onStall();
        });
        video.addEventListener('playing',  function(){ onRecovered(); setStatus('Playing', ''); hideConnecting(); setLivePillOn(); hideChDown(); });
        /* the video can be fully decoded and ready to display (readyState >= 3) even if a blocked
           autoplay silently prevented the "playing" event from ever firing — clear the overlay here too
           so startup never gets stuck waiting on a user tap, without touching playback itself */
        video.addEventListener('canplay',  function(){ if(video.readyState >= 3){ onRecovered(); hideConnecting(); } });
        video.addEventListener('loadeddata', function(){ if(video.readyState >= 3){ onRecovered(); hideConnecting(); } });

        window.__hls = hls;

        if(window.innerWidth <= 768) closeSB();
      })
      .catch(function(){
        if(mySeq !== loadSeq) return;
        setStatus('Stream error', 'error');
        hideConnecting();
        setLivePillOff();
        showChDown(id, name);
      });
  }

  /* ── channel buttons ── */
  document.querySelectorAll('.ch-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if(btn.dataset.redirect){
        window.location.href = btn.dataset.redirect;
        return;
      }
      loadChannel(btn.dataset.id, btn.dataset.name);
    });
  });

  /* ── MORE CHANNELS — category grid + channel-list panel ── */
  (function(){
    var wrap      = document.getElementById('moreChWrap');
    var grid      = document.getElementById('moreChGrid');
    var overlay2  = document.getElementById('moreChOverlay');
    var panelTitle= document.getElementById('moreChPanelTitle');
    var panelBody = document.getElementById('moreChPanelBody');
    var panelClose= document.getElementById('moreChPanelClose');
    if(!wrap || !grid) return;

    /* on-brand gradients (cyan / purple / red — the site's own accent palette) rotated per card */
    var PALETTE = [
      'linear-gradient(135deg,#00C2E0,#0072FF)',
      'linear-gradient(135deg,#7C5CFF,#B26CFF)',
      'linear-gradient(135deg,#FF3B5C,#FF7A59)',
      'linear-gradient(135deg,#12C48B,#00E0FF)',
      'linear-gradient(135deg,#F5A623,#FF3B5C)',
      'linear-gradient(135deg,#7C5CFF,#00E0FF)',
      'linear-gradient(135deg,#0EA5A5,#7C5CFF)',
      'linear-gradient(135deg,#FF7A59,#7C5CFF)',
    ];

    function openPanel(){
      overlay2.classList.add('show');
    }
    function closePanel(){
      overlay2.classList.remove('show');
    }
    if(panelClose) panelClose.addEventListener('click', closePanel);

    function openCategory(name){
      panelTitle.textContent = name;
      panelBody.innerHTML = '<div class="more-ch-loading">Loading channels…</div>';
      openPanel();
      fetch('/api/channels/category/' + encodeURIComponent(name))
        .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
        .then(function(data){
          var chans = data.channels || [];
          if(!chans.length){
            panelBody.innerHTML = '<div class="more-ch-loading">No channels in this category.</div>';
            return;
          }
          panelBody.innerHTML = chans.map(function(ch){
            return ch.redirect
              ? '<button class="ch-btn ch-btn-redirect" data-id="' + ch.id + '" data-name="' + ch.name + '" data-redirect="' + ch.redirect + '"><span class="ch-dot ch-dot-redirect"></span><span class="ch-name">' + ch.name + '</span></button>'
              : '<button class="ch-btn" data-id="' + ch.id + '" data-name="' + ch.name + '"><span class="ch-dot"></span><span class="ch-name">' + ch.name + '</span></button>';
          }).join('');
          panelBody.querySelectorAll('.ch-btn').forEach(function(btn){
            btn.addEventListener('click', function(){
              if(btn.dataset.redirect){
                window.location.href = btn.dataset.redirect;
                return;
              }
              closePanel();
              loadChannel(btn.dataset.id, btn.dataset.name);
            });
            if(!btn.dataset.redirect && typeof probeChannel === 'function') probeChannel(btn);
          });
        })
        .catch(function(){
          panelBody.innerHTML = '<div class="more-ch-loading">Could not load this category. Tap to retry.</div>';
          panelBody.onclick = function(){ openCategory(name); };
        });
    }

    function loadCategories(){
      grid.innerHTML = '<div class="more-ch-loading">Loading categories…</div>';
      fetch('/api/channels/categories')
        .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
        .then(function(data){
          var cats = data.categories || [];
          if(!cats.length){
            grid.innerHTML = '<div class="more-ch-loading">No categories available.</div>';
            return;
          }
          grid.innerHTML = cats.map(function(cat, i){
            return '<button type="button" class="more-ch-cat" data-cat="' + cat.category + '" style="background:' + PALETTE[i % PALETTE.length] + '">' +
              cat.icon +
              '<span class="more-ch-cat-name">' + cat.category + '</span>' +
              '<span class="more-ch-cat-count">' + cat.count + ' ch</span>' +
            '</button>';
          }).join('') + '<div class="more-ch-end">— The End —</div>';
          grid.querySelectorAll('.more-ch-cat').forEach(function(btn){
            btn.addEventListener('click', function(){ openCategory(btn.dataset.cat); });
          });
        })
        .catch(function(){
          grid.innerHTML = '<div class="more-ch-loading">Could not load categories. Tap to retry.</div>';
          grid.onclick = loadCategories;
        });
    }

    var toggleBtn  = document.getElementById('moreChToggle');
    var reopenBar  = document.getElementById('moreChReopen');
    var reopenBtn  = document.getElementById('moreChReopenBtn');

    function collapseMoreCh(){
      wrap.classList.add('mc-hidden');
      if(reopenBar) reopenBar.classList.add('show');
    }
    function expandMoreCh(){
      wrap.classList.remove('mc-hidden');
      if(reopenBar) reopenBar.classList.remove('show');
    }
    if(toggleBtn) toggleBtn.addEventListener('click', collapseMoreCh);
    if(reopenBtn) reopenBtn.addEventListener('click', expandMoreCh);

    loadCategories();
  })();

  /* ── CHANNEL DOWN OVERLAY ── */
  var chDownOverlay = document.getElementById('chDownOverlay');
  var chDownName    = document.getElementById('chDownName');
  var chDownRetry   = document.getElementById('chDownRetry');
  var _currentChId   = null;
  var _currentChName = null;

  function showChDown(id, name){
    _currentChId   = id;
    _currentChName = name;
    chDownName.textContent = '\\u201C' + name + '\\u201D';
    chDownOverlay.classList.add('show');
  }
  function hideChDown(){
    chDownOverlay.classList.remove('show');
  }

  /* retry button — spin 360°, then re-attempt loadChannel */
  chDownRetry.addEventListener('click', function(){
    if(!_currentChId) return;
    chDownRetry.classList.add('spinning');
    setTimeout(function(){
      chDownRetry.classList.remove('spinning');
      hideChDown();
      loadChannel(_currentChId, _currentChName);
    }, 680); /* let spin animation finish first */
  });

  /* ── CHANNEL STATUS PROBING ──
     Ping each stream URL with HEAD; mark dots green (up) or red (down).
     Re-probes every 90 s so the sidebar stays current. */
  var PROBE_TIMEOUT = 7000;

  function probeChannel(btn){
    var id  = btn.dataset.id;
    var dot = btn.querySelector('.ch-dot');
    if(!dot) return;
    /* Same-origin status check — the browser never talks to the upstream
       restream host directly (that would both leak it in the Network tab
       and break on upstream CORS). The server does the real HEAD request. */
    var url  = '/api/channel-status/' + encodeURIComponent(id);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function(){ if(ctrl) ctrl.abort(); }, PROBE_TIMEOUT);
    fetch(url, { cache:'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
      .then(function(data){
        clearTimeout(timer);
        var ok = !!data.up;
        dot.classList.toggle('ch-dot-up',   ok);
        dot.classList.toggle('ch-dot-down', !ok);
        btn.dataset.chStatus = ok ? 'up' : 'down';
      })
      .catch(function(){
        clearTimeout(timer);
        dot.classList.add('ch-dot-down');
        dot.classList.remove('ch-dot-up');
        btn.dataset.chStatus = 'down';
      });
  }

  function probeAll(){
    document.querySelectorAll('.ch-btn').forEach(function(btn){
      if(btn.dataset.redirect) return; /* not a stream — nothing to probe */
      probeChannel(btn);
    });
  }
  setTimeout(probeAll, 1500);
  setInterval(probeAll, 90000);

  /* ── search (sidebar filter — kept for fallback) ── */
  function doSearch(q){
    q = (q || '').trim().toLowerCase();
    document.querySelectorAll('.cat-group').forEach(function(grp){
      var btns = grp.querySelectorAll('.ch-btn');
      var vis  = 0;
      btns.forEach(function(b){
        var match = !q || b.dataset.name.toLowerCase().indexOf(q) !== -1;
        b.style.display = match ? '' : 'none';
        if(match) vis++;
      });
    });
  }
  /* input is handled by dropdown; keep enter to close dropdown */

  /* ── auto-load first channel ── */
  var first = Array.prototype.find.call(document.querySelectorAll('.ch-btn'), function(b){ return !b.dataset.redirect; });
  if(first) loadChannel(first.dataset.id, first.dataset.name);

  /* ── WhatsApp button: press-and-hold to drag ── */
  (function(){
    var btn    = document.getElementById('waBtn');
    var parent = btn.parentElement; /* .video-wrap / player-area */
    var holdTimer = null;
    var dragging  = false;
    var startX, startY, btnStartX, btnStartY;

    function getPos(e){ return e.touches ? e.touches[0] : e; }

    function onDown(e){
      var p = getPos(e);
      startX = p.clientX; startY = p.clientY;
      var r = btn.getBoundingClientRect();
      btnStartX = r.left; btnStartY = r.top;
      holdTimer = setTimeout(function(){
        dragging = true;
        btn.classList.add('dragging');
        /* switch to absolute so we can position freely */
        var pr = parent.getBoundingClientRect();
        btn.style.position = 'absolute';
        btn.style.right    = 'auto';
        btn.style.bottom   = 'auto';
        btn.style.left     = (btnStartX - pr.left) + 'px';
        btn.style.top      = (btnStartY - pr.top)  + 'px';
      }, 400);
    }

    function onMove(e){
      if(!dragging) return;
      e.preventDefault();
      var p  = getPos(e);
      var pr = parent.getBoundingClientRect();
      var nx = (btnStartX - pr.left) + (p.clientX - startX);
      var ny = (btnStartY - pr.top)  + (p.clientY - startY);
      /* clamp inside parent */
      nx = Math.max(4, Math.min(nx, pr.width  - btn.offsetWidth  - 4));
      ny = Math.max(4, Math.min(ny, pr.height - btn.offsetHeight - 4));
      btn.style.left = nx + 'px';
      btn.style.top  = ny + 'px';
    }

    function onUp(e){
      clearTimeout(holdTimer);
      if(dragging){
        dragging = false;
        btn.classList.remove('dragging');
        e.preventDefault(); /* cancel the link click if we dragged */
      }
    }

    btn.addEventListener('mousedown',  onDown);
    btn.addEventListener('touchstart', onDown, {passive:true});
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('mouseup',   onUp);
    document.addEventListener('touchend',  onUp);
  })();

  /* ── VIDEO FRAME: fit overlays to actual rendered video rect ── */
  (function(){
    var vid   = document.getElementById('videoPlayer');
    var frame = document.getElementById('videoFrame');
    var wrap  = document.getElementById('videoWrap');

    function fitFrame(){
      var ww = wrap.offsetWidth, wh = wrap.offsetHeight;
      if(!ww || !wh) return;
      var vw = vid.videoWidth  || ww;
      var vh = vid.videoHeight || wh;
      var scale = Math.min(ww / vw, wh / vh);
      var rw = Math.round(vw * scale);
      var rh = Math.round(vh * scale);
      var rx = Math.round((ww - rw) / 2);
      var ry = Math.round((wh - rh) / 2);
      frame.style.left   = rx + 'px';
      frame.style.top    = ry + 'px';
      frame.style.width  = rw + 'px';
      frame.style.height = rh + 'px';
    }

    vid.addEventListener('loadedmetadata', fitFrame);
    vid.addEventListener('resize',         fitFrame);
    window.addEventListener('resize',      fitFrame);
    /* also poll briefly after channel loads to catch late metadata */
    var pollTimer;
    function startPoll(){ clearInterval(pollTimer); var n=0; pollTimer=setInterval(function(){ fitFrame(); if(++n>20) clearInterval(pollTimer); },200); }
    vid.addEventListener('loadedmetadata', startPoll);
    fitFrame();
  })();

  /* ── CUSTOM MEDIA CONTROLS ── */
  (function(){
    var vw       = document.getElementById('videoWrap');
    var vid      = document.getElementById('videoPlayer');
    var mcPlay   = document.getElementById('mcPlay');
    var mcPlayIc = document.getElementById('mcPlayIcon');
    var mcMute   = document.getElementById('mcMute');
    var mcVolIc  = document.getElementById('mcVolIcon');
    var mcSlider = document.getElementById('mcVolSlider');
    var mcFull   = document.getElementById('mcFull');
    var mcFullIc = document.getElementById('mcFullIcon');
    var mcLayout = document.getElementById('mcLayout');
    var mcLock   = document.getElementById('mcLock');
    var mcLockIc = document.getElementById('mcLockIcon');
    var mediaControls = document.getElementById('mediaControls');
    var layout   = document.querySelector('.layout');
    var videoFrameEl = document.getElementById('videoFrame');

    /* icons */
    var PLAY_ICON  = '<polygon points="5,3 19,12 5,21" fill="currentColor"/>';
    var PAUSE_ICON = '<rect x="5" y="3" width="4" height="18" rx="1" fill="currentColor"/><rect x="15" y="3" width="4" height="18" rx="1" fill="currentColor"/>';
    var VOL_ON     = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>';
    var VOL_OFF    = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    var EXPAND_IC  = '<path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M16 21h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>';
    var COMPRESS_IC= '<path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>';
    var HORIZ_IC   = '<rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 9h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    var VERT_IC    = '<rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M12 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    var LOCK_IC    = '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';
    var UNLOCK_IC  = '<rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M8 11V7a4 4 0 017.8-1.2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>';

    /* show controls on hover/touch */
    var hideTimer;
    function showCtrl(){ vw.classList.add('controls-visible'); clearTimeout(hideTimer); hideTimer = setTimeout(function(){ vw.classList.remove('controls-visible'); }, 3000); }
    vw.addEventListener('mousemove', showCtrl);
    vw.addEventListener('touchstart', showCtrl, {passive:true});

    /* play/pause */
    function syncPlay(){ mcPlayIc.innerHTML = vid.paused ? PLAY_ICON : PAUSE_ICON; }
    mcPlay.addEventListener('click', function(){ vid.paused ? vid.play() : vid.pause(); });
    vid.addEventListener('play',  syncPlay);
    vid.addEventListener('pause', syncPlay);
    vid.addEventListener('waiting', function(){ mcPlayIc.innerHTML = PAUSE_ICON; });

    /* volume */
    function syncVol(){
      mcVolIc.innerHTML = (vid.muted || vid.volume === 0) ? VOL_OFF : VOL_ON;
      mcSlider.style.setProperty('--vol', Math.round((vid.muted ? 0 : vid.volume) * 100) + '%');
    }
    mcMute.addEventListener('click', function(){ vid.muted = !vid.muted; syncVol(); });
    mcSlider.addEventListener('input', function(){
      vid.volume = parseFloat(mcSlider.value);
      vid.muted  = vid.volume === 0;
      syncVol();
    });
    syncVol();

    /* autoplay must start muted (browser policy — silent until a user gesture), but the very
       first tap/click ANYWHERE on the player now unmutes automatically, instead of requiring
       the small mute icon specifically. This is the closest a website can get to "plays with
       sound automatically": browsers will not allow sound before any interaction at all, but
       this makes that one required interaction effortless instead of a hunt for a tiny icon.
       Some browsers internally pause a video for a moment when it flips from muted to
       unmuted mid-playback (re-checking the autoplay-with-sound policy now that audio would
       actually play) — so right after unmuting we re-call play() while the same user gesture
       is still active, to immediately resume if that happened. This never touches the HLS
       instance or its config, only whether the <video> element itself is paused. */
    function autoUnmuteOnFirstTap(){
      if(vid.muted){
        vid.muted = false;
        syncVol();
        var resumeIfPaused = function(){ if(vid.paused) vid.play().catch(function(){}); };
        resumeIfPaused();
        setTimeout(resumeIfPaused, 50);
        setTimeout(resumeIfPaused, 250);
      }
    }
    vw.addEventListener('click',      autoUnmuteOnFirstTap, {once:true});
    vw.addEventListener('touchstart', autoUnmuteOnFirstTap, {once:true, passive:true});

    /* maximize ↔ minimize — forces the whole site horizontal, doesn't touch video playback/decoding */
    var isMaximized = false;
    function syncFS(){ mcFullIc.innerHTML = isMaximized ? COMPRESS_IC : EXPAND_IC; }
    mcFull.addEventListener('click', function(){
      isMaximized = !isMaximized;
      layout.classList.toggle('force-landscape', isMaximized);
      mcFull.setAttribute('aria-label', isMaximized ? 'Minimize' : 'Maximize');
      syncFS();
      /* re-fit the video frame overlay to the new rect once the layout transform settles */
      setTimeout(function(){ window.dispatchEvent(new Event('resize')); }, 60);
    });
    syncFS();

    /* layout toggle (landscape ↔ portrait stacked for mobile) */
    var vertMode = false;
    mcLayout.addEventListener('click', function(){
      vertMode = !vertMode;
      layout.classList.toggle('vert-phone', vertMode);
      document.getElementById('mcLayoutIcon').innerHTML = vertMode ? VERT_IC : HORIZ_IC;
    });

    /* lock — freezes every other control (CSS-disabled + dimmed) until tapped again */
    var locked = false;
    function syncLock(){
      mcLockIc.innerHTML = locked ? UNLOCK_IC : LOCK_IC;
      mcLock.classList.toggle('locked', locked);
      mediaControls.classList.toggle('mc-locked', locked);
      mcLock.setAttribute('aria-label', locked ? 'Unlock controls' : 'Lock controls');
      if(videoFrameEl) videoFrameEl.classList.toggle('controls-locked', locked); /* also disables the brightness slide zone while locked */
    }
    mcLock.addEventListener('click', function(){ locked = !locked; syncLock(); });
    syncLock();
  })();

  /* ── BRIGHTNESS — manual vertical slide (right edge of video) + time-of-day adaptive baseline ──
     Pure CSS filter on the <video> element only; never touches HLS/decoding/playback speed. */
  (function(){
    var vid = document.getElementById('videoPlayer');
    var zone = document.getElementById('brightnessZone');
    var readout = document.getElementById('brightnessReadout');
    var fill = document.getElementById('brightnessFill');
    var pctLabel = document.getElementById('brightnessPct');
    if(!vid || !zone) return;

    var level = 1.0; /* 0 .. 1.6 internal range; 1.0 = neutral/default = the video's own native brightness, unmodified */
    var MAX_LEVEL = 1.6;
    var dragging = false;
    var startY = 0, startLevel = 1.0;
    var hideTimer;

    function applyBrightness(){
      /* map internal level (0..1.6) to a CSS brightness() filter so that level=1.0 (default/no
         slide yet) lands on brightness(1.0) exactly — i.e. the video's own native exposure as
         it's actually decoded/buffered, not artificially brightened on load */
      var filterVal;
      if(level <= 1.0){
        filterVal = 0.35 + (level / 1.0) * (1.0 - 0.35); /* 0..1.0 → 0.35..1.0 */
      } else {
        filterVal = 1.0 + ((level - 1.0) / (MAX_LEVEL - 1.0)) * (1.6 - 1.0); /* 1.0..1.6 → 1.0..1.6 */
      }
      vid.style.filter = 'brightness(' + filterVal.toFixed(3) + ')';
      var pct = Math.round((level / 1.0) * 100);
      fill.style.height = Math.min(100, Math.max(0, (level / MAX_LEVEL) * 100)) + '%';
      pctLabel.textContent = Math.max(0, pct) + '%';
    }

    function showReadout(){
      readout.classList.remove('leaving');
      readout.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function(){
        /* play the slide-out-left exit, then fully hide once it's done */
        readout.classList.remove('show');
        readout.classList.add('leaving');
        setTimeout(function(){ readout.classList.remove('leaving'); }, 400);
      }, 900);
    }

    function clamp(v){ return Math.max(0, Math.min(MAX_LEVEL, v)); }

    function onStart(clientY){
      dragging = true;
      startY = clientY;
      startLevel = level;
      /* intentionally NOT calling showReadout() here — a plain tap/press with no
         movement should not pop the HUD open, only an actual slide gesture should */
    }
    function onMove(clientY){
      if(!dragging) return;
      var deltaY = startY - clientY; /* slide up = brighter */
      if(Math.abs(deltaY) < 4) return; /* ignore tiny jitter so a stationary tap never counts as a slide */
      var deltaLevel = (deltaY / 180) * MAX_LEVEL; /* 180px drag = full range */
      level = clamp(startLevel + deltaLevel);
      applyBrightness();
      showReadout(); /* only the act of actually moving while pressed reveals the HUD */
    }
    function onEnd(){ dragging = false; }

    /* pointer events cover mouse + most touch browsers; raw touch events added as a
       fallback for older mobile browsers that don't fire pointer events reliably */
    zone.addEventListener('pointerdown', function(e){ onStart(e.clientY); e.preventDefault(); });
    window.addEventListener('pointermove', function(e){ if(dragging){ onMove(e.clientY); e.preventDefault(); } });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    zone.addEventListener('touchstart', function(e){ onStart(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchmove', function(e){ if(dragging) onMove(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    applyBrightness();

    /* ── adaptive baseline by time of day ──
       Real ambient-light / screen-brightness sensing isn't available to websites, so this
       uses the viewer's local clock instead: brighter baseline in daytime hours, dimmer at
       night. It blends in gently and steps aside for 15s after any manual slider drag. */
    var manualOverrideUntil = 0;
    zone.addEventListener('pointerdown', function(){ manualOverrideUntil = Date.now() + 15000; });
    zone.addEventListener('touchstart', function(){ manualOverrideUntil = Date.now() + 15000; }, {passive:true});

    function timeOfDayBaseline(){
      var hour = new Date().getHours();
      if(hour >= 7 && hour < 18) return 1.15;
      if(hour >= 18 && hour < 21) return 1.0;
      return 0.8;
    }

    function adaptiveTick(){
      if(Date.now() > manualOverrideUntil && !dragging){
        var target = timeOfDayBaseline();
        level = level + (target - level) * 0.15;
        applyBrightness();
      }
    }
    setInterval(adaptiveTick, 4000);
  })();

  /* ── VOLUME — vertical slide on the LEFT edge of the video ──
     Slide up = louder, slide down = quieter. Readout HUD appears on the right.
     Keeps the toolbar slider + mute button in sync. Default 50% on load. */
  (function(){
    var vid      = document.getElementById('videoPlayer');
    var zone     = document.getElementById('volumeZone');
    var readout  = document.getElementById('volumeReadout');
    var fill     = document.getElementById('volumeFill');
    var pctLabel = document.getElementById('volumePct');
    var mcSlider = document.getElementById('mcVolSlider');
    var mcVolIc  = document.getElementById('mcVolIcon');
    var VOL_ON   = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>';
    var VOL_OFF  = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    if(!vid || !zone) return;

    var volLevel = 0.5;
    var dragging = false;
    var startY = 0, startLevel = 0.5;
    var hideTimer;

    function applyVolume(){
      vid.volume = volLevel;
      fill.style.height = Math.round(volLevel * 100) + '%';
      pctLabel.textContent = Math.round(volLevel * 100) + '%';
      if(mcSlider){
        mcSlider.value = volLevel;
        mcSlider.style.setProperty('--vol', Math.round(volLevel * 100) + '%');
      }
      if(mcVolIc) mcVolIc.innerHTML = volLevel === 0 ? VOL_OFF : VOL_ON;
    }

    function showReadout(){
      readout.classList.remove('leaving');
      readout.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function(){
        readout.classList.remove('show');
        readout.classList.add('leaving');
        setTimeout(function(){ readout.classList.remove('leaving'); }, 400);
      }, 900);
    }

    function clamp(v){ return Math.max(0, Math.min(1, v)); }

    function onStart(clientY){ dragging = true; startY = clientY; startLevel = volLevel; }
    function onMove(clientY){
      if(!dragging) return;
      var deltaY = startY - clientY;
      if(Math.abs(deltaY) < 4) return;
      volLevel = clamp(startLevel + deltaY / 180);
      applyVolume();
      showReadout();
    }
    function onEnd(){ dragging = false; }

    zone.addEventListener('pointerdown', function(e){ onStart(e.clientY); e.preventDefault(); });
    window.addEventListener('pointermove', function(e){ if(dragging){ onMove(e.clientY); e.preventDefault(); } });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);

    zone.addEventListener('touchstart', function(e){ onStart(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchmove', function(e){ if(dragging) onMove(e.touches[0].clientY); }, {passive:true});
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);

    /* set default 50% volume on load */
    applyVolume();
  })();

  /* ── BLOCK SUBTITLES / CAPTIONS ── */
  (function(){
    var vid = document.getElementById('videoPlayer');
    if(!vid) return;
    function killTracks(){
      for(var i = 0; i < vid.textTracks.length; i++){
        vid.textTracks[i].mode = 'hidden';
      }
    }
    killTracks();
    vid.addEventListener('loadedmetadata', killTracks);
    vid.textTracks.addEventListener('addtrack', killTracks);
  })();

  /* ── NETWORK STRENGTH BAR — CSS signal bars driven by Network Information API where available ──
     This API only exists on Chromium-based browsers (Chrome/Edge/Android WebView).
     Safari/iOS and Firefox do not expose it at all — there is no way for any website to
     read real signal strength on those browsers, so on them this honestly shows a plain
     "steady" indicator rather than a made-up generation label like "3G". */
  (function(){
    var badge = document.getElementById('netBadge');
    var label = document.getElementById('netLabel');
    if(!badge) return;

    function setLevel(n, text){
      badge.className = 'net-badge lvl-' + n;
      label.textContent = text;
    }

    function update(){
      var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if(!conn || !conn.effectiveType){
        setLevel(4, ''); /* API not supported on this browser (e.g. Safari/iOS) — show full bars, no fake label */
        return;
      }
      switch(conn.effectiveType){
        case 'slow-2g': setLevel(1, 'E'); break;
        case '2g':      setLevel(1, '2G'); break;
        case '3g':      setLevel(2, '3G'); break;
        case '4g':      setLevel(4, 'H+'); break;
        default:        setLevel(3, 'H');
      }
    }

    update();
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(conn && conn.addEventListener) conn.addEventListener('change', update);
  })();


  /* ── SEARCH DROPDOWN ── */
  (function(){
    var inp  = document.getElementById('searchInput');
    var drop = document.getElementById('searchDropdown');

    /* build channel index */
    var allCh = [];
    document.querySelectorAll('.ch-btn').forEach(function(b){
      allCh.push({ id: b.dataset.id, name: b.dataset.name, btn: b });
    });

    function renderDrop(q){
      q = (q || '').trim().toLowerCase();
      if(!q){ drop.innerHTML=''; drop.classList.remove('open'); return; }
      var matches = allCh.filter(function(c){ return c.name.toLowerCase().indexOf(q) !== -1; }).slice(0,20);
      if(!matches.length){
        drop.innerHTML = '<div class="sd-no-result">No Result Found</div>';
      } else {
        drop.innerHTML = '<div class="sd-list">' + matches.map(function(c){
          return '<button class="sd-item" data-id="'+c.id+'" data-name="'+c.name+'"><span class="sd-dot"></span>'+c.name+'</button>';
        }).join('') + '</div>';
        drop.querySelectorAll('.sd-item').forEach(function(el){
          el.addEventListener('click', function(){
            loadChannel(el.dataset.id, el.dataset.name);
            inp.value = '';
            drop.innerHTML = ''; drop.classList.remove('open');
          });
        });
      }
      drop.classList.add('open');
    }

    inp.addEventListener('input',  function(){ renderDrop(inp.value); });
    inp.addEventListener('keydown', function(e){ if(e.key==='Escape'){ drop.innerHTML=''; drop.classList.remove('open'); inp.blur(); }});
    document.addEventListener('click', function(e){ if(!inp.contains(e.target)&&!drop.contains(e.target)){ drop.innerHTML=''; drop.classList.remove('open'); }});
  })();

  /* ── WATCH HOURS ──
     Persisted server-side (Firestore) so it survives redeploys and follows the
     account across devices, instead of living only in this browser's localStorage.
     The ring fills up over each 60-minute stretch, then resets and starts filling
     again for the next hour. */
  (function(){
    var LEGACY_KEY = 'estt_watch_sec'; // old localStorage-only counter, used once to migrate
    var whVal    = document.getElementById('whVal');
    var whLabel  = document.getElementById('whLabel');
    var whCircle = document.getElementById('whCircle');
    if (!whVal || !whLabel || !whCircle) return;

    var totalSec = 0;
    var unsyncedSec = 0;
    var ready = false;
    // Each sync is a Firestore write (watchSeconds increment). At the previous
    // 20s this was 180 writes/hour for every open tab, and it runs on every
    // page rather than only while something is playing — roughly 111 tab-hours
    // exhausted the Spark plan's 20,000 writes/day. Once that quota is gone
    // Firestore stops accepting writes and the client retries indefinitely
    // instead of erroring, so sign-in hung at createSession while reads (and
    // therefore the cached pages) carried on working normally.
    //
    // 5 minutes cuts that 15x, to 12 writes/hour per tab. Accuracy is
    // unaffected in practice: the counter still ticks locally every second,
    // and the beforeunload/visibilitychange handlers below flush on the way
    // out. Only an abruptly killed tab loses anything, and at most 5 minutes.
    var SYNC_EVERY_MS = 300000;

    function fmt(s){
      var h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
      whVal.textContent   = h+'h';
      whLabel.textContent = h+' hrs '+m+' mins';
      // Ring fills across the current hour (0–59 min), then resets for the next one.
      var minuteOfHour = (s/60) % 60;
      var pct = Math.max(0, Math.min(100, (minuteOfHour / 60) * 100));
      whCircle.style.background = 'conic-gradient(var(--accent) 0% ' + pct + '%, rgba(255,255,255,.07) ' + pct + '% 100%)';
    }

    function syncToServer(){
      if (!ready || unsyncedSec <= 0) return;
      var delta = unsyncedSec;
      unsyncedSec = 0;
      fetch('/api/watch-hours/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deltaSeconds: delta }),
        keepalive: true,
      }).catch(function(){ unsyncedSec += delta; }); // retry on the next tick if it failed
    }

    fetch('/api/watch-hours').then(function(r){ return r.ok ? r.json() : null; }).then(function(data){
      if (data && typeof data.seconds === 'number' && data.seconds > 0) {
        totalSec = data.seconds;
        ready = true;
        fmt(totalSec);
        return;
      }
      // Nothing on the server yet — migrate whatever this browser had stored locally.
      var legacy = parseInt(localStorage.getItem(LEGACY_KEY)||'0',10)||0;
      fetch('/api/watch-hours/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: legacy }),
      }).then(function(r){ return r.ok ? r.json() : null; }).then(function(seeded){
        totalSec = (seeded && seeded.seconds) || legacy;
        ready = true;
        fmt(totalSec);
        localStorage.removeItem(LEGACY_KEY);
      }).catch(function(){ totalSec = legacy; ready = true; fmt(totalSec); });
    }).catch(function(){
      // Server unreachable — fall back to the local count for this session only.
      totalSec = parseInt(localStorage.getItem(LEGACY_KEY)||'0',10)||0;
      ready = true;
      fmt(totalSec);
    });

    setInterval(function(){
      totalSec++;
      unsyncedSec++;
      fmt(totalSec);
    }, 1000);

    setInterval(syncToServer, SYNC_EVERY_MS);
    window.addEventListener('beforeunload', syncToServer);
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) syncToServer();
    });
  })();


  (function(){
    var scroll = document.getElementById('announceScroll');
    var track  = document.getElementById('announceTrack');
    if(!scroll || !track) return;
    track.addEventListener('mousedown',  function(){ scroll.style.animationPlayState='paused'; });
    track.addEventListener('touchstart', function(){ scroll.style.animationPlayState='paused'; },{passive:true});
    track.addEventListener('mouseup',    function(){ scroll.style.animationPlayState='running'; });
    track.addEventListener('touchend',   function(){ scroll.style.animationPlayState='running'; });
    track.addEventListener('mouseleave', function(){ scroll.style.animationPlayState='running'; });
  })();

})();
</script>
<script>
function showLiquidToast(message){
  var toast = document.createElement('div');
  toast.className = 'lg-toast';
  toast.innerHTML = '<span class="lg-dot"></span><span></span>';
  toast.querySelector('span:last-child').textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ toast.classList.add('show'); }); });
  setTimeout(function(){
    toast.classList.remove('show');
    setTimeout(function(){ toast.remove(); }, 500);
  }, 2600);
}

/* ── Find Friends: search by username, follow/unfollow, TikTok/Instagram style ── */
var FS_ADD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" d="M19 8v6M22 11h-6"/></svg>';
var FS_FOLLOWING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M17 11l2 2 4-4"/></svg>';
var FS_VERIFIED_BADGE = '<svg class="fs-verified-badge" viewBox="0 0 24 24" width="14" height="14" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>';
var fsDebounceTimer = null;

function openFriendSearch(){
  var overlay = document.getElementById('friendSearchOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  var input = document.getElementById('fsInput');
  var results = document.getElementById('fsResults');
  input.value = '';
  results.innerHTML = '<div class="fs-hint">Type a username to find friends</div>';
  setTimeout(function(){ input.focus(); }, 150);
}

function closeFriendSearch(){
  var overlay = document.getElementById('friendSearchOverlay');
  if (overlay) overlay.classList.remove('show');
}

function fsRenderUser(u){
  var row = document.createElement('div');
  row.className = 'fs-user';
  row.dataset.uid = u.uid;

  var avatar = document.createElement('div');
  avatar.className = 'fs-avatar';
  if (u.photoURL) {
    avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
  } else {
    avatar.textContent = ((u.firstName || '')[0] || u.username[0] || '?').toUpperCase();
  }

  var info = document.createElement('div');
  info.className = 'fs-user-info';
  var name = document.createElement('div');
  name.className = 'fs-user-name';
  name.innerHTML = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? FS_VERIFIED_BADGE : '');
  var uname = document.createElement('div');
  uname.className = 'fs-user-username';
  uname.textContent = '@' + (u.matchedAltUsername || u.username);
  info.appendChild(name);
  info.appendChild(uname);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fs-follow-btn' + (u.isFollowing ? ' following' : '');
  btn.innerHTML = u.isFollowing ? FS_FOLLOWING_ICON : FS_ADD_ICON;
  btn.setAttribute('aria-label', u.isFollowing ? 'Unfollow' : 'Add friend');
  btn.addEventListener('click', function(e){ e.stopPropagation(); fsToggleFollow(u.uid, btn); });

  row.appendChild(avatar);
  row.appendChild(info);
  row.appendChild(btn);
  row.addEventListener('click', function(){ openMiniPreview(u.username); });
  return row;
}

function formatCount(n){
  n = Number(n) || 0;
  var units = [{ v: 1e9, s: 'B' }, { v: 1e6, s: 'm' }, { v: 1e3, s: 'k' }];
  for (var i = 0; i < units.length; i++) {
    var u = units[i];
    if (n >= u.v) {
      var val = Math.floor((n / u.v) * 10) / 10;
      return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + u.s;
    }
  }
  return String(n);
}

async function openMiniPreview(username){
  var overlay = document.getElementById('mpvOverlay');
  document.getElementById('mpvName').textContent = 'Loading…';
  document.getElementById('mpvUsername').textContent = '';
  document.getElementById('mpvAvatar').style.backgroundImage = '';
  document.getElementById('mpvAvatar').textContent = '–';
  document.getElementById('mpvFollowers').textContent = '0';
  document.getElementById('mpvFollowing').textContent = '0';
  document.getElementById('mpvLikes').textContent = '0';
  overlay.classList.add('show');
  try {
    var res = await fetch('/api/users/' + encodeURIComponent(username) + '/public');
    if (!res.ok) throw new Error();
    var u = await res.json();
    var avatar = document.getElementById('mpvAvatar');
    if (u.photoURL) {
      avatar.style.backgroundImage = 'url(' + u.photoURL + ')';
      avatar.textContent = '';
    } else {
      avatar.textContent = ((u.firstName || '')[0] || (u.username || '?')[0] || '?').toUpperCase();
    }
    document.getElementById('mpvName').innerHTML = ((u.firstName || u.lastName) ? ((u.firstName || '') + ' ' + (u.lastName || '')).trim() : ('@' + u.username)) + ((u.isAdmin || u.verified) ? FS_VERIFIED_BADGE : '');
    document.getElementById('mpvUsername').textContent = '@' + u.username;
    document.getElementById('mpvFollowers').textContent = formatCount(u.followers != null ? u.followers : 0);
    document.getElementById('mpvFollowing').textContent = formatCount(u.following != null ? u.following : 0);
    document.getElementById('mpvLikes').textContent = formatCount(u.likes != null ? u.likes : 0);
    document.getElementById('mpvViewBtn').onclick = function(){ window.location.href = '/u/' + encodeURIComponent(u.username); };
  } catch (err) {
    document.getElementById('mpvName').textContent = 'Could not load this profile.';
  }
}
document.getElementById('mpvCloseBtn').addEventListener('click', function(){
  document.getElementById('mpvOverlay').classList.remove('show');
});
document.getElementById('mpvOverlay').addEventListener('click', function(e){
  if (e.target.id === 'mpvOverlay') document.getElementById('mpvOverlay').classList.remove('show');
});

async function fsToggleFollow(uid, btn){
  var isFollowingNow = btn.classList.contains('following');
  btn.disabled = true;
  try {
    var res = await fetch('/api/' + (isFollowingNow ? 'unfollow' : 'follow') + '/' + uid, { method: 'POST' });
    if (!res.ok) throw new Error();
    btn.classList.toggle('following', !isFollowingNow);
    btn.innerHTML = !isFollowingNow ? FS_FOLLOWING_ICON : FS_ADD_ICON;
    btn.setAttribute('aria-label', !isFollowingNow ? 'Unfollow' : 'Add friend');
  } catch (err) {
    showLiquidToast('Something went wrong. Try again.');
  } finally {
    btn.disabled = false;
  }
}

var fsSearchToken = 0;
function fsRunSearch(q){
  var results = document.getElementById('fsResults');
  var myToken = ++fsSearchToken;
  if (!q) {
    results.innerHTML = '<div class="fs-hint">Type a username to find friends</div>';
    return;
  }
  results.innerHTML = '<div class="fs-loading"><span class="fs-loading-dots"><span></span><span></span><span></span></span>Searching</div>';
  fetch('/api/users/search?q=' + encodeURIComponent(q))
    .then(function(r){ return r.ok ? r.json() : Promise.reject(); })
    .then(function(data){
      if (myToken !== fsSearchToken) return; // a newer search has already started — drop this stale response
      var list = data.results || [];
      results.innerHTML = '';
      if (!list.length) {
        results.innerHTML = '<div class="fs-empty">No users found for "' + q.replace(/</g, '&lt;') + '"</div>';
        return;
      }
      list.forEach(function(u){ results.appendChild(fsRenderUser(u)); });
    })
    .catch(function(){
      if (myToken !== fsSearchToken) return;
      results.innerHTML = '<div class="fs-empty">Search failed. Try again.</div>';
    });
}

(function(){
  function initAccountMenu(){
  fetch('/api/profile').then(function(r){ return r.ok ? r.json() : Promise.reject(); }).then(function(profile){
    var initials = ((profile.firstName || '')[0] || '') + ((profile.lastName || '')[0] || '');
    var avatarEl = document.querySelector('.owner-avatar');
    var avatarInner = document.querySelector('.owner-avatar-inner');
    if (profile.photoURL) {
      avatarEl.style.backgroundImage = 'url(' + profile.photoURL + ')';
      avatarEl.style.backgroundSize = 'cover';
      avatarEl.style.backgroundPosition = 'center';
      if (avatarInner) avatarInner.textContent = '';
    } else if (avatarInner) {
      avatarInner.textContent = initials || 'U';
    }
    var nameEl = document.querySelector('.owner-name');
    if (nameEl) nameEl.textContent = 'Hi, ' + (profile.firstName || 'there');
    var menuAvatar = document.getElementById('menuAvatar');
    if (menuAvatar) {
      if (profile.photoURL) {
        menuAvatar.style.backgroundImage = 'url(' + profile.photoURL + ')';
        menuAvatar.style.backgroundSize = 'cover';
        menuAvatar.style.backgroundPosition = 'center';
        menuAvatar.textContent = '';
      } else {
        menuAvatar.textContent = initials || 'U';
      }
    }
    var params = new URLSearchParams(window.location.search);
    if (params.get('welcome') === '1') {
      showLiquidToast('Welcome back, ' + (profile.firstName || 'there'));
      params.delete('welcome');
      var rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? '?' + rest : ''));
    }
    if (!profile.isAdmin) {
      ['menuAdminItem', 'bnavAdminItem'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) {
          el.classList.add('locked');
          el.addEventListener('click', function(e){ e.preventDefault(); });
        }
      });
    }
    function refreshNotifDots(){
      Promise.all([
        fetch('/api/notifications/unread').then(function(r){ return r.ok ? r.json() : { hasUnread: false }; }).catch(function(){ return { hasUnread: false }; }),
        fetch('/api/feed/following/unseen-count').then(function(r){ return r.ok ? r.json() : { count: 0 }; }).catch(function(){ return { count: 0 }; }),
      ]).then(function(results){
        var hasUnread = !!results[0].hasUnread;
        var hasNewPosts = results[1].count > 0;
        // Account/Settings icons: real notifications only (likes, comments, follows...).
        document.querySelectorAll('.js-account-dot').forEach(function(el){
          el.classList.toggle('show', hasUnread);
        });
        // Profile avatar: new posts from people you follow only.
        document.querySelectorAll('.js-feed-dot').forEach(function(el){
          el.classList.toggle('show', hasNewPosts);
        });
        // Bottom-nav Profile icon: either signal, unchanged from before.
        document.querySelectorAll('.js-notif-dot').forEach(function(el){
          el.classList.toggle('show', hasUnread || hasNewPosts);
        });
      });
    }
    refreshNotifDots();
    setInterval(refreshNotifDots, 20000);
    document.addEventListener('visibilitychange', function(){
      if (!document.hidden) refreshNotifDots();
    });
  }).catch(function(){});

  var menuBtn = document.getElementById('userMenuBtn');
  var menuDropdown = document.getElementById('userMenuDropdown');
  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener('click', function(e){
      e.stopPropagation();
      menuBtn.classList.toggle('open');
      menuDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function(){
      menuBtn.classList.remove('open');
      menuDropdown.classList.remove('open');
    });
  }
  var logoutBtn = document.getElementById('menuLogoutBtn');
  var logoutOverlay = document.getElementById('logoutOverlay');
  if (logoutBtn && logoutOverlay) {
    logoutBtn.addEventListener('click', function(){
      logoutOverlay.classList.add('show');
    });
    document.getElementById('cancelLogoutBtn').addEventListener('click', function(){
      logoutOverlay.classList.remove('show');
    });
    document.getElementById('confirmLogoutBtn').addEventListener('click', async function(){
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/login?logged_out=1';
    });
  }
  }
  if (window.requestIdleCallback) {
    requestIdleCallback(initAccountMenu, { timeout: 3000 });
  } else {
    setTimeout(initAccountMenu, 1200);
  }

  /* ── bottom nav: Profile / Search / Settings (api, account, admin) ── */
  var bnavSearch = document.getElementById('bnavSearch');
  var bnavApiItem = document.getElementById('bnavApiItem');
  var bnavSettings = document.getElementById('bnavSettings');
  var bnavSettingsMenu = document.getElementById('bnavSettingsMenu');
  if (bnavSearch) {
    bnavSearch.addEventListener('click', function(e){
      e.stopPropagation();
      openFriendSearch();
    });
  }
  if (bnavApiItem) {
    bnavApiItem.addEventListener('click', function(){
      window.location.href = '/developers';
      if (bnavSettingsMenu) bnavSettingsMenu.classList.remove('open');
    });
  }
  var bnavDeployBotItem = document.getElementById('bnavDeployBotItem');
  if (bnavDeployBotItem) {
    bnavDeployBotItem.addEventListener('click', function(){
      window.location.href = '/deploy-bot';
      if (bnavSettingsMenu) bnavSettingsMenu.classList.remove('open');
    });
  }
  if (bnavSettings && bnavSettingsMenu) {
    bnavSettings.addEventListener('click', function(e){
      e.stopPropagation();
      bnavSettingsMenu.classList.toggle('open');
    });
    document.addEventListener('click', function(){
      bnavSettingsMenu.classList.remove('open');
    });
  }

  var menuApiItem = document.getElementById('menuApiItem');
  if (menuApiItem) {
    menuApiItem.addEventListener('click', function(){
      window.location.href = '/developers';
      var dropdown = document.getElementById('userMenuDropdown');
      if (dropdown) dropdown.classList.remove('open');
    });
  }
  var menuDeployBotItem = document.getElementById('menuDeployBotItem');
  if (menuDeployBotItem) {
    menuDeployBotItem.addEventListener('click', function(){
      window.location.href = '/deploy-bot';
      var dropdown = document.getElementById('userMenuDropdown');
      if (dropdown) dropdown.classList.remove('open');
    });
  }

  var fsInput = document.getElementById('fsInput');
  var fsCloseBtn = document.getElementById('fsCloseBtn');
  var fsOverlay = document.getElementById('friendSearchOverlay');
  if (fsInput) {
    fsInput.addEventListener('input', function(){
      var q = fsInput.value.trim();
      clearTimeout(fsDebounceTimer);
      fsDebounceTimer = setTimeout(function(){ fsRunSearch(q); }, 300);
    });
  }
  if (fsCloseBtn) fsCloseBtn.addEventListener('click', closeFriendSearch);
  if (fsOverlay) {
    fsOverlay.addEventListener('click', function(e){
      if (e.target === fsOverlay) closeFriendSearch();
    });
  }
})();
</script>
</body>
</html>`);
});

app.get("/football", (req, res) => {
  fs.readFile(path.join(__dirname, "views", "football.js"), "utf8", (err, html) => {
    if (err) return res.status(404).end();
    res.set("Content-Type", "text/html");
    res.send(html);
  });
});

app.get("/login", async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (uid) return res.redirect("/");
  res.send(cachedLoginHtml);
});

app.get("/verify", (req, res) => {
  res.send(cachedVerifyHtml);
});

app.get("/account", (req, res) => {
  res.send(cachedAccountHtml);
});

app.get("/profile", (req, res) => {
  res.send(cachedProfileHtml);
});

app.get("/u/:username", (req, res) => {
  res.send(cachedProfileHtml);
});

// Session-cookie based admin gate for the page itself (mirrors the /admin
// redirect logic already in place) — kept separate from requireAuth/requireAdmin
// below since those two are for the JSON API and expect req.uid to already be set.
app.get("/admin", async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.redirect("/login");
  const profile = await getUserProfile(uid);
  // Mirrors requireAuth: a signed cookie can't be deleted, so a banned or
  // revoked session has to be refused here too rather than assumed gone.
  if (!profile || profile.banned || isSessionRevoked(sessionId, profile)) return res.redirect("/login");
  if (!isAdminEmail(profile.email)) return res.redirect("/");
  res.send(cachedAdminHtml);
});

// requireAuth already resolves req.uid; this just adds the admin-only check
// on top of it for every /api/admin/* route below.
async function requireAdmin(req, res, next) {
  try {
    // requireAuth (which always runs before this) already fetched this
    // profile onto req.userProfile — re-fetching it here was a second,
    // redundant Firestore read on every single /api/admin/* request.
    const profile = req.userProfile || (await getUserProfile(req.uid));
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    next();
  } catch (err) {
    res.status(403).json({ error: "Not authorized." });
  }
}

app.get("/api/admin/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    res.json({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      username: profile.username || "",
      // This is you looking at your own admin panel, not another user
      // viewing your public profile — so the "hide my photo from others"
      // privacy setting (showProfilePhoto) must not apply here. Applying
      // it here was exactly why the avatar was blank in the admin hero
      // while the same photo showed fine on your own profile/account pages.
      photoURL: profile.photoURL || null,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load admin profile." });
  }
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const data = await adminListUsers({ cursor });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load users." });
  }
});

app.get("/api/admin/users/search", requireAuth, requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const results = q ? await adminSearchUsers(q) : [];
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Search failed." });
  }
});

app.get("/api/admin/users/banned", requireAuth, requireAdmin, async (req, res) => {
  try {
    const results = await adminListBannedUsers();
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load banned users." });
  }
});

app.post("/api/admin/users/:uid/ban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await adminBanUser(req.params.uid);
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not ban that account." });
  }
});

app.post("/api/admin/users/:uid/unban", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await adminUnbanUser(req.params.uid);
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not unban that account." });
  }
});

app.post("/api/admin/users/:uid/verify", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await adminVerifyUser(req.params.uid);
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not verify that account." });
  }
});

app.post("/api/admin/users/:uid/unverify", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await adminUnverifyUser(req.params.uid);
    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not remove verification." });
  }
});

app.post("/api/admin/users/:uid/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    await adminDeleteUser(req.params.uid);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not delete that account." });
  }
});

app.post("/api/admin/users/:uid/reset-password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    await adminResetPassword(req.params.uid, newPassword);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not reset that password." });
  }
});

app.get("/api/admin/bots/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { users: rows } = await botServiceFetch("/internal/admin/bots/users");
    const enriched = await Promise.all(rows.map(async (r) => {
      const profile = await getUserProfile(r.uid).catch(() => null);
      return {
        ...r,
        username: profile?.username || null,
        firstName: profile?.firstName || "",
        lastName: profile?.lastName || "",
        email: profile?.email || "",
        photoURL: profile?.showProfilePhoto === false ? null : (profile?.photoURL || null),
        verified: !!profile?.verified,
        isAdmin: isAdminEmail(profile?.email),
      };
    }));
    res.json({ users: enriched });
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not load deploying users." });
  }
});

app.get("/api/admin/bots/users/:uid", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/admin/bots/users/${req.params.uid}`));
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not load that user's deployments." });
  }
});

app.post("/api/admin/bots/:id/stop", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/admin/bots/${req.params.id}/stop`, { method: "POST" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not stop that deployment." });
  }
});

app.post("/api/admin/bots/:id/restart", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/admin/bots/${req.params.id}/restart`, { method: "POST" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not restart that deployment." });
  }
});

app.delete("/api/admin/bots/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/admin/bots/${req.params.id}`, { method: "DELETE" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that deployment." });
  }
});

app.get("/api/admin/bots/template-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch("/internal/admin/bots/template-status"));
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not check template status." });
  }
});

app.post("/api/admin/bots/check-updates", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch("/internal/admin/bots/check-updates", { method: "POST" }));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Update check failed." });
  }
});

// Actual disk used by bot deployments (their downloaded template + saved
// session files) — not the whole shared host disk, which was reporting a
// near-identical, meaningless number on both services regardless of how
// many bots were deployed.
app.get("/api/admin/system/storage", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch("/internal/system/storage"));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load bot deployment storage." });
  }
});



app.get("/reset", (req, res) => {
  res.send(cachedResetHtml);
});

app.get("/dmca", (req, res) => {
  res.send(cachedDmcaHtml);
});

app.get("/privacy", (req, res) => {
  res.send(cachedPrivacyHtml);
});

app.get("/developers", (req, res) => {
  res.send(cachedDevelopersHtml);
});

app.get("/deploy-bot", (req, res) => {
  res.send(cachedDeployBotHtml);
});

app.get("/api/bots/cap", requireAuth, async (req, res) => {
  try {
    const isAdmin = isAdminEmail(req.userProfile?.email);
    res.json(await botServiceFetch(`/internal/bots/cap?uid=${encodeURIComponent(req.uid)}&isAdmin=${isAdmin}`));
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not load deployment capacity." });
  }
});

app.get("/api/bots", requireAuth, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/bots?uid=${encodeURIComponent(req.uid)}`));
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not load your deployments." });
  }
});

app.post("/api/bots/deploy", requireAuth, botDeployLimiter, async (req, res) => {
  try {
    const isAdmin = isAdminEmail(req.userProfile?.email);
    const result = await botServiceFetch("/internal/bots/deploy", {
      method: "POST",
      body: JSON.stringify({ ...(req.body || {}), uid: req.uid, isAdmin }),
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Deploy failed." });
  }
});

app.get("/api/bots/:id/status", requireAuth, botStatusLimiter, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/bots/${req.params.id}/status?uid=${encodeURIComponent(req.uid)}`));
  } catch (err) {
    res.status(err.status || 404).json({ error: err.message || "Deployment not found." });
  }
});

app.post("/api/bots/:id/stop", requireAuth, botActionLimiter, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/bots/${req.params.id}/stop`, {
      method: "POST", body: JSON.stringify({ uid: req.uid }),
    }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not stop deployment." });
  }
});

app.post("/api/bots/:id/restart", requireAuth, botActionLimiter, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/bots/${req.params.id}/restart`, {
      method: "POST", body: JSON.stringify({ uid: req.uid }),
    }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not restart deployment." });
  }
});

app.delete("/api/bots/:id", requireAuth, botActionLimiter, async (req, res) => {
  try {
    res.json(await botServiceFetch(`/internal/bots/${req.params.id}?uid=${encodeURIComponent(req.uid)}`, { method: "DELETE" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete deployment." });
  }
});

// Public — just tells the page which address to display/send to. Never
// exposes anything secret; it's whichever address DMCA notices go to.
app.get("/api/dmca-agent-email", (req, res) => {
  res.json({ email: process.env.DMCA_AGENT_EMAIL || process.env.GMAIL_USER || "" });
});

app.post("/api/dmca-report", dmcaLimiter, async (req, res) => {
  try {
    const {
      reporterName,
      reporterEmail,
      copyrightOwner,
      workDescription,
      infringingUrls,
      goodFaithStatement,
      accuracyStatement,
      signature,
      altcha,
    } = req.body || {};

    if (!(await verifyCaptcha(altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    if (!reporterName || !reporterEmail || !copyrightOwner || !workDescription || !infringingUrls || !signature) {
      return res.status(400).json({ error: "Please fill in all required fields." });
    }
    if (!goodFaithStatement || !accuracyStatement) {
      return res.status(400).json({ error: "Please confirm both required statements." });
    }
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_RE.test(reporterEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    // Cap sizes so a malicious payload can't be used to spam huge emails.
    if (
      String(workDescription).length > 5000 ||
      String(infringingUrls).length > 5000 ||
      String(reporterName).length > 200 ||
      String(copyrightOwner).length > 200 ||
      String(signature).length > 200
    ) {
      return res.status(400).json({ error: "One or more fields is too long." });
    }

    await sendDmcaReportEmail({
      reporterName,
      reporterEmail,
      copyrightOwner,
      workDescription,
      infringingUrls,
      goodFaithStatement,
      accuracyStatement,
      signature,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("DMCA report submission failed:", err);
    res.status(500).json({ error: "Could not submit your request right now. Please try again shortly." });
  }
});

const ALLOWED_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "icloud.com", "live.com", "aol.com", "protonmail.com",
];

// letters, numbers, underscore only — 3 to 20 characters
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

async function usernameFullyAvailable(username, { excludeUid, excludeEmail } = {}) {
  if (!USERNAME_RE.test(username)) return false;
  const [freeInUsers, pending] = await Promise.all([
    isUsernameAvailable(username, excludeUid),
    isUsernamePending(username, excludeEmail),
  ]);
  return freeInUsers && !pending;
}

app.get("/api/captcha/challenge", async (req, res) => {
  try {
    const challenge = await createChallenge({ hmacKey: ALTCHA_HMAC_KEY, maxNumber: 50000 });
    res.json(challenge);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create captcha challenge." });
  }
});

// Used while typing a username during signup — no session required yet.
app.get("/api/check-username", usernameCheckLimiter, async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return res.json({ available: false, error: "3-20 characters: letters, numbers, underscore only." });
    }
    const available = await usernameFullyAvailable(username);
    res.json({ available });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check username." });
  }
});

// Used while editing the username on the account settings page — excludes the caller's own current username.
app.get("/api/account/check-username", usernameCheckLimiter, requireAuth, async (req, res) => {
  try {
    const username = String(req.query.username || "").trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return res.json({ available: false, error: "3-20 characters: letters, numbers, underscore only." });
    }
    const available = await usernameFullyAvailable(username, { excludeUid: req.uid });
    res.json({ available });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check username." });
  }
});

// Admin-only — extra usernames reserved on the admin's own account so nobody else can claim them.
app.post("/api/account/alt-usernames", requireAuth, requireAdmin, async (req, res) => {
  try {
    const altUsernames = await addAltUsername(req.uid, req.body.username);
    res.json({ ok: true, altUsernames });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not add that username." });
  }
});

app.post("/api/account/alt-usernames/remove", requireAuth, requireAdmin, async (req, res) => {
  try {
    const altUsernames = await removeAltUsername(req.uid, req.body.username);
    res.json({ ok: true, altUsernames });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not remove that username." });
  }
});

app.post("/api/signup", signupLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password, altcha } = req.body;
    const username = String(req.body.username || "").trim().toLowerCase();
    if (!(await verifyCaptcha(altcha))) return res.status(400).json({ error: "Captcha not completed." });
    if (!firstName || !lastName || !email || !password || !username) return res.status(400).json({ error: "All fields are required." });
    const domain = (email.split("@")[1] || "").toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) return res.status(400).json({ error: "Please enter a valid email address." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    if (!USERNAME_RE.test(username)) return res.status(400).json({ error: "Username must be 3-20 characters (letters, numbers, underscore)." });
    const existing = await firebaseAuth.getUserByEmail(email).catch(() => null);
    if (existing && existing.emailVerified) return res.status(400).json({ error: "That email is already registered." });
    if (!(await usernameFullyAvailable(username, { excludeEmail: email }))) {
      return res.status(400).json({ error: "Username has already been used." });
    }
    // A code is emailed to the address first — nothing is created in Firebase
    // Auth or Firestore until that code comes back verified via /api/verify-email.
    await issuePendingSignup({ firstName, lastName, email, username, password });
    res.json({ pendingVerification: true, email });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not create account." });
  }
});

app.post("/api/resend-code", signupLimiter, async (req, res) => {
  try {
    const { uid, email, purpose } = req.body;
    if ((purpose || "signup") === "signup") {
      if (!email) return res.status(400).json({ error: "Missing email." });
      await resendPendingSignupCode(email);
      return res.json({ ok: true });
    }
    const profile = await getUserProfile(uid);
    if (!profile) return res.status(404).json({ error: "Account not found." });
    if ((purpose || "signup") === "delete_account" && profile.provider === "telegram" && profile.telegramId) {
      await issueCode(uid, profile.telegramId, "delete_account", "telegram");
    } else {
      await issueCode(uid, profile.email, purpose || "signup");
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not resend code." });
  }
});

app.post("/api/verify-email", signupLimiter, async (req, res) => {
  try {
    const { uid, email, code, purpose } = req.body;

    if ((purpose || "signup") === "signup") {
      if (!email) return res.status(400).json({ error: "Missing email." });
      const result = await checkPendingSignupCode(email, code);
      if (!result.ok) {
        const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", not_found: "Code expired. Request a new one." };
        return res.status(400).json({ error: messages[result.reason] || "Invalid code." });
      }
      const { firstName, lastName, password, username } = result.data;
      // Re-check the username here too — it may have been claimed by someone else
      // while this signup's code was sitting unverified.
      if (!(await usernameFullyAvailable(username, { excludeEmail: email }))) {
        return res.status(400).json({ error: "That username was just taken. Please sign up again with a different username." });
      }
      // Only now — after the code is actually verified — does anything get created.
      const existingUser = await firebaseAuth.getUserByEmail(email).catch(() => null);
      let newUid;
      if (existingUser) {
        await firebaseAuth.updateUser(existingUser.uid, { password, displayName: `${firstName} ${lastName}` });
        await upsertUserProfile(existingUser.uid, { firstName, lastName, email, username, provider: "password" });
        newUid = existingUser.uid;
      } else {
        newUid = await createUserAccount({ firstName, lastName, email, password, username });
      }
      await markEmailVerified(newUid);
      const customToken = await firebaseAuth.createCustomToken(newUid);
      return res.json({ customToken });
    }

    const result = await checkCode(uid, purpose, code);
    if (!result.ok) {
      const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", not_found: "Code expired. Request a new one." };
      return res.status(400).json({ error: messages[result.reason] || "Invalid code." });
    }
    if (purpose === "password_reset") {
      const resetToken = await issueResetToken(uid);
      return res.json({ resetToken });
    }
    await markEmailVerified(uid);
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not verify code." });
  }
});

// Telegram Login Widget: the browser gets signed user data straight from
// Telegram, we just verify it wasn't tampered with, then find/create the
// account and hand back a custom token (same shape as /api/signup's success
// path). No email or password is ever required for this provider.
// Telegram's "Log In With Telegram" OIDC flow, done as a full-page redirect
// rather than a popup. Deliberately avoids any popup/window-messaging —
// that's the exact mechanism that was flaky (Telegram's own docs warn popup
// communication breaks under certain header configs, and browsers/popup
// blockers vary). A redirect has no such fragility: Telegram's own hosted
// authorization page handles the in-app approval UX, and simply sends the
// browser back to us with a code once it's done.
const TELEGRAM_CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || "";
const TELEGRAM_CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || "";
const TELEGRAM_REDIRECT_URI = "https://esteamstv.devs.surf/api/telegram-auth/callback";

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

app.get("/api/telegram-auth/start", oauthStartLimiter, async (req, res) => {
  try {
    if (!TELEGRAM_CLIENT_ID || !TELEGRAM_CLIENT_SECRET) {
      return res.redirect("/login?tg_error=" + encodeURIComponent("Telegram sign-in isn't configured."));
    }
    const state = crypto.randomBytes(16).toString("hex");
    const codeVerifier = base64url(crypto.randomBytes(32));
    await saveTelegramOAuthState(state, codeVerifier);
    const codeChallenge = base64url(crypto.createHash("sha256").update(codeVerifier).digest());

    const url = new URL("https://oauth.telegram.org/auth");
    url.searchParams.set("client_id", TELEGRAM_CLIENT_ID);
    url.searchParams.set("redirect_uri", TELEGRAM_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid profile write");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    res.redirect(url.toString());
  } catch (err) {
    console.error(err);
    res.redirect("/login?tg_error=" + encodeURIComponent("Could not start Telegram sign-in."));
  }
});

app.get("/api/telegram-auth/callback", oauthCallbackLimiter, async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect("/login?tg_error=" + encodeURIComponent("Telegram sign-in was cancelled."));
    if (!code || !state) return res.redirect("/login?tg_error=" + encodeURIComponent("Invalid Telegram response."));

    const codeVerifier = await consumeTelegramOAuthState(String(state));
    if (!codeVerifier) {
      return res.redirect("/login?tg_error=" + encodeURIComponent("This Telegram sign-in link expired. Please try again."));
    }

    const basicAuth = Buffer.from(`${TELEGRAM_CLIENT_ID}:${TELEGRAM_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://oauth.telegram.org/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basicAuth}` },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: TELEGRAM_REDIRECT_URI,
        client_id: TELEGRAM_CLIENT_ID,
        code_verifier: codeVerifier,
      }).toString(),
    });
    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenData || !tokenData.id_token) {
      return res.redirect("/login?tg_error=" + encodeURIComponent("Could not complete Telegram sign-in."));
    }

    const claims = await verifyTelegramIdToken(tokenData.id_token, TELEGRAM_CLIENT_ID);
    if (!claims) return res.redirect("/login?tg_error=" + encodeURIComponent("Could not verify Telegram login."));

    const uid = await createOrGetTelegramUser({
      id: claims.id,
      first_name: claims.given_name || (claims.name || "").split(" ")[0] || "",
      last_name: claims.family_name || (claims.name || "").split(" ").slice(1).join(" "),
      username: claims.preferred_username || "",
      photo_url: claims.picture || null,
    });
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.redirect("/login?tg_token=" + encodeURIComponent(customToken));
  } catch (err) {
    console.error(err);
    res.redirect("/login?tg_error=" + encodeURIComponent("Could not sign in with Telegram."));
  }
});

// GitHub OAuth: standard authorization-code redirect flow, same shape as
// the Telegram flow above (state stored server-side, one-time use,
// self-expiring). GitHub OAuth Apps are confidential clients so the code
// exchange uses a client secret instead of PKCE.
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = "https://esteamstv.devs.surf/api/github-auth/callback";

app.get("/api/github-auth/start", oauthStartLimiter, async (req, res) => {
  try {
    if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      return res.redirect("/login?gh_error=" + encodeURIComponent("GitHub sign-in isn't configured."));
    }
    const state = crypto.randomBytes(16).toString("hex");
    await saveGithubOAuthState(state);

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", GITHUB_CLIENT_ID);
    url.searchParams.set("redirect_uri", GITHUB_REDIRECT_URI);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  } catch (err) {
    console.error(err);
    res.redirect("/login?gh_error=" + encodeURIComponent("Could not start GitHub sign-in."));
  }
});

app.get("/api/github-auth/callback", oauthCallbackLimiter, async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect("/login?gh_error=" + encodeURIComponent("GitHub sign-in was cancelled."));
    if (!code || !state) return res.redirect("/login?gh_error=" + encodeURIComponent("Invalid GitHub response."));

    const stateValid = await consumeGithubOAuthState(String(state));
    if (!stateValid) {
      return res.redirect("/login?gh_error=" + encodeURIComponent("This GitHub sign-in link expired. Please try again."));
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: String(code),
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    const tokenData = await tokenRes.json().catch(() => null);
    if (!tokenData || !tokenData.access_token) {
      return res.redirect("/login?gh_error=" + encodeURIComponent("Could not complete GitHub sign-in."));
    }

    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ES-TEAMS-TV",
    };
    const userRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
    const ghUser = await userRes.json().catch(() => null);
    if (!ghUser || !ghUser.id) {
      return res.redirect("/login?gh_error=" + encodeURIComponent("Could not verify GitHub login."));
    }

    // Public profile email is often null (many devs hide it) — fall back to
    // the verified primary address from /user/emails when that happens.
    let email = ghUser.email || null;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers: ghHeaders });
      const emails = await emailsRes.json().catch(() => null);
      if (Array.isArray(emails)) {
        const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
        email = primary ? primary.email : null;
      }
    }

    const uid = await createOrGetGithubUser({
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name,
      email,
      avatar_url: ghUser.avatar_url,
    });
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.redirect("/login?gh_token=" + encodeURIComponent(customToken));
  } catch (err) {
    console.error(err);
    res.redirect("/login?gh_error=" + encodeURIComponent("Could not sign in with GitHub."));
  }
});

// Firebase Admin and Firestore retry an unreachable backend indefinitely with
// backoff instead of failing fast. A revoked service-account key, a disabled
// API or an exhausted quota therefore doesn't raise an error — the call simply
// never settles, so /api/session accepts the request and never answers, the
// browser spins forever, and nothing is logged. Giving each call a deadline
// turns that silence into a logged failure naming the exact operation that
// stalled, which also separates Firebase Auth (verifyIdToken) from Firestore
// (the profile/session reads and writes) — different services, different
// causes.
const AUTH_OP_TIMEOUT_MS = 10000;

class AuthOpTimeout extends Error {
  constructor(label, ms) {
    super(`${label} did not complete within ${Math.round(ms / 1000)}s`);
    this.label = label;
  }
}

function withDeadline(promise, label, ms = AUTH_OP_TIMEOUT_MS) {
  let timer;
  let timedOut = false;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      reject(new AuthOpTimeout(label, ms));
    }, ms);
  });

  // Losing the race doesn't cancel the underlying call — it keeps retrying and
  // eventually settles. Firestore reports the real gRPC status when it gives
  // up, and that status is the one thing that separates the possible causes:
  //   RESOURCE_EXHAUSTED  -> daily quota spent
  //   PERMISSION_DENIED   -> API disabled or the key lacks Datastore access
  //   UNAUTHENTICATED     -> service-account key revoked or malformed
  //   UNAVAILABLE         -> transient outage or blocked egress
  // Log it instead of discarding it. This also keeps the abandoned promise
  // from surfacing as an unhandled rejection.
  promise.then(
    () => {
      if (timedOut) console.error(`[/api/session] ${label} eventually succeeded, after missing its ${Math.round(ms / 1000)}s deadline`);
    },
    (err) => {
      if (timedOut) console.error(`[/api/session] ${label} eventually failed: code=${err?.code ?? "none"} ${err?.message ?? err}`);
    }
  );

  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

app.post("/api/session", passwordLoginLimiter, async (req, res) => {
  try {
    const { idToken, remember, altcha } = req.body;
    const decoded = await withDeadline(firebaseAuth.verifyIdToken(idToken), "firebaseAuth.verifyIdToken");
    if (decoded.firebase.sign_in_provider === "google.com") {
      await withDeadline(ensureGoogleUserProfile(decoded), "ensureGoogleUserProfile");
    } else if (decoded.firebase.sign_in_provider === "password" && !(await verifyCaptcha(altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const profile = await withDeadline(getUserProfile(decoded.uid), "getUserProfile");
    if (profile?.twoFactorEnabled) {
      const pendingToken = await withDeadline(issueTwoFactorPendingLogin(decoded.uid, remember), "issueTwoFactorPendingLogin");
      return res.json({ requires2FA: true, pendingToken });
    }
    const sessionId = await withDeadline(createSession(decoded.uid), "createSession");
    res.cookie("session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      ...(remember ? { maxAge: SESSION_TTL_MS } : {}),
    });
    res.json({ ok: true });
  } catch (err) {
    // A stalled backend is an outage, not a rejected credential — reporting it
    // as 401 "Could not sign in." sends people off resetting a password that
    // was never wrong. Separate the two.
    if (err instanceof AuthOpTimeout) {
      console.error(`[/api/session] backend stalled: ${err.message}`);
      // The operation name is echoed to the client on purpose: it is the one
      // piece of information that identifies which backend is down, and
      // reading it off the screen beats hunting for it in the host's log
      // viewer. It is an internal function name, nothing sensitive. Drop the
      // parenthetical once this is diagnosed.
      return res.status(503).json({
        error: `Sign-in is temporarily unavailable (${err.label} timed out). Please try again shortly.`,
      });
    }
    console.error("[/api/session] failed:", err);
    res.status(401).json({ error: "Could not sign in." });
  }
});

app.post("/api/2fa/login-verify", twoFactorLoginLimiter, async (req, res) => {
  try {
    const { pendingToken, code } = req.body;
    const pending = await getTwoFactorPendingLogin(pendingToken);
    if (!pending) return res.status(400).json({ error: "Session expired. Please sign in again." });
    const valid = await verifyTwoFactorCode(pending.uid, code);
    if (!valid) return res.status(400).json({ error: "Incorrect code." });
    await deleteTwoFactorPendingLogin(pendingToken);
    const sessionId = await createSession(pending.uid);
    res.cookie("session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      ...(pending.remember ? { maxAge: SESSION_TTL_MS } : {}),
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not verify code." });
  }
});

app.post("/api/logout", async (req, res) => {
  await deleteSession(req.cookies?.session);
  res.clearCookie("session");
  res.json({ ok: true });
});

app.get("/api/profile", requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const { twoFactorSecret, twoFactorPendingSecret, ...safeProfile } = profile;
    res.json({
      uid: req.uid,
      ...safeProfile,
      twoFactorSetUp: !!twoFactorSecret,
      twoFactorEnabled: !!profile.twoFactorEnabled,
      isAdmin: isAdminEmail(profile.email),
      altUsernames: Array.isArray(profile.altUsernames) ? profile.altUsernames : [],
      showActiveStatus: profile.showActiveStatus !== false,
      showLastSeen: profile.showLastSeen !== false,
      lockProfile: !!profile.lockProfile,
      showProfilePhoto: profile.showProfilePhoto !== false,
      followersVisibility: ["friends", "only_me"].includes(profile.followersVisibility) ? profile.followersVisibility : "everyone",
      followingVisibility: ["friends", "only_me"].includes(profile.followingVisibility) ? profile.followingVisibility : "everyone",
      bio: profile.bio || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load profile." });
  }
});

app.post("/api/privacy/update", requireAuth, async (req, res) => {
  try {
    const updated = await updatePrivacySettings(req.uid, req.body);
    res.json({ ok: true, ...updated });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not update privacy settings." });
  }
});

// ── Watch hours — persisted per-account in Firestore ──
app.get("/api/watch-hours", requireAuth, async (req, res) => {
  try {
    const seconds = await getWatchSeconds(req.uid);
    res.json({ seconds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load watch hours." });
  }
});

app.post("/api/watch-hours/seed", requireAuth, async (req, res) => {
  try {
    const seconds = await seedWatchSecondsIfEmpty(req.uid, req.body?.seconds);
    res.json({ seconds });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not save watch hours." });
  }
});

app.post("/api/watch-hours/sync", requireAuth, async (req, res) => {
  try {
    const seconds = await addWatchSeconds(req.uid, req.body?.deltaSeconds);
    res.json({ seconds });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not save watch hours." });
  }
});

// ── Follow system ──
app.get("/api/follow/stats", requireAuth, async (req, res) => {
  try {
    const stats = await getFollowStats(req.uid);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load stats." });
  }
});

app.get("/api/follow/stats/:uid", requireAuth, async (req, res) => {
  try {
    const stats = await getFollowStats(req.params.uid);
    const following = await isFollowing(req.uid, req.params.uid);
    res.json({ ...stats, isFollowing: following });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load stats." });
  }
});

app.get("/api/follow/list", requireAuth, async (req, res) => {
  try {
    const type = req.query.type === "following" ? "following" : "followers";
    const usernameParam = String(req.query.username || "").toLowerCase().trim();

    if (!usernameParam) {
      const list = await getFollowList(req.uid, type);
      return res.json({ results: list });
    }

    const targetUser = await findUserByUsername(usernameParam);
    if (!targetUser) return res.status(404).json({ error: "User not found." });
    const isSelf = targetUser.uid === req.uid;

    if (!isSelf) {
      const visibility = type === "following" ? targetUser.followingVisibility : targetUser.followersVisibility;
      if (visibility === "only_me") {
        return res.status(403).json({ error: "User restricted view." });
      }
      if (visibility === "friends") {
        const [following, followedBack] = await Promise.all([
          isFollowing(req.uid, targetUser.uid),
          isFollowing(targetUser.uid, req.uid),
        ]);
        if (!following || !followedBack) {
          return res.status(403).json({ error: "User restricted view." });
        }
      }
    }

    const list = await getFollowList(targetUser.uid, type);
    res.json({ results: list });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load list." });
  }
});

app.get("/api/users/:username/public", requireAuth, async (req, res) => {
  try {
    const user = await findUserByUsername(String(req.params.username || "").toLowerCase());
    if (!user || user.pendingDeletion) return res.status(404).json({ error: "User not found." });
    const isSelf = user.uid === req.uid;
    const [stats, following, followedBack] = await Promise.all([
      getFollowStats(user.uid),
      isFollowing(req.uid, user.uid),
      isFollowing(user.uid, req.uid),
    ]);
    if (!isSelf) {
      // Best-effort — never blocks or fails the response.
      getUserProfile(req.uid)
        .then((viewerProfile) => notifyProfileViewed(req.uid, viewerProfile, user.uid))
        .catch(() => {});
    }
    const mutualFollow = following && followedBack;
    const locked = !isSelf && !!user.lockProfile && !mutualFollow;
    const showActiveStatus = isSelf || user.showActiveStatus !== false;
    const showLastSeen = isSelf || user.showLastSeen !== false;
    const showPhoto = isSelf || user.showProfilePhoto !== false;
    const followersRestricted = !isSelf && (
      user.followersVisibility === "only_me" ||
      (user.followersVisibility === "friends" && !mutualFollow)
    );
    const followingRestricted = !isSelf && (
      user.followingVisibility === "only_me" ||
      (user.followingVisibility === "friends" && !mutualFollow)
    );
    res.json({
      uid: user.uid,
      username: user.username,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      photoURL: showPhoto ? (user.photoURL || null) : null,
      bio: user.bio || "",
      isAdmin: isAdminEmail(user.email),
      altUsernames: isAdminEmail(user.email) && Array.isArray(user.altUsernames) ? user.altUsernames : [],
      verified: !!user.verified,
      isSelf,
      isFollowing: following,
      lastActiveAt: showActiveStatus ? (user.lastActiveAt || null) : null,
      lastSeenMode: !showLastSeen ? "recently" : "exact",
      locked,
      followersRestricted,
      followingRestricted,
      ...stats,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load profile." });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const [list, hasUnread] = await Promise.all([
      getNotifications(req.uid),
      hasUnreadNotifications(req.uid),
    ]);
    const enriched = await Promise.all(
      list.map(async (n) => {
        if (n.type === "follow" && n.meta?.followerUid) {
          const followingBack = await isFollowing(req.uid, n.meta.followerUid);
          return { ...n, followingBack };
        }
        return n;
      })
    );
    res.json({ results: enriched, hasUnread });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load notifications." });
  }
});

app.get("/api/notifications/unread", requireAuth, async (req, res) => {
  try {
    const hasUnread = await hasUnreadNotifications(req.uid);
    res.json({ hasUnread });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check notifications." });
  }
});

app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    await markAllNotificationsRead(req.uid);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not update notifications." });
  }
});

app.post("/api/follow/:uid", requireAuth, async (req, res) => {
  try {
    const result = await followUser(req.uid, req.params.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not follow user." });
  }
});

app.post("/api/unfollow/:uid", requireAuth, async (req, res) => {
  try {
    const result = await unfollowUser(req.uid, req.params.uid);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not unfollow user." });
  }
});

app.get("/api/users/search", requireAuth, usernameCheckLimiter, async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const results = await searchUsersByUsername(q, req.uid);
    const withStatus = await Promise.all(
      results.map(async (u) => {
        const isSelf = u.uid === req.uid;
        const showPhoto = isSelf || u.showProfilePhoto !== false;
        return {
          ...u,
          photoURL: showPhoto ? (u.photoURL || null) : null,
          isFollowing: await isFollowing(req.uid, u.uid),
        };
      })
    );
    res.json({ results: withStatus });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Search failed." });
  }
});

// Both cooldowns are 7 days — long enough to stop spammy churn, short enough
// that a genuine correction doesn't feel punishing.
const NAME_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const PHOTO_CHANGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
function cooldownDaysLeft(lastChangedAt, cooldownMs) {
  const elapsed = Date.now() - (lastChangedAt || 0);
  return Math.max(0, Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000)));
}

app.post("/api/update-profile", requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, username } = req.body;
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    const nextFirstName = firstName !== undefined ? String(firstName).trim() : profile.firstName;
    const nextLastName = lastName !== undefined ? String(lastName).trim() : profile.lastName;
    const nameChanging =
      (firstName !== undefined && nextFirstName !== profile.firstName) ||
      (lastName !== undefined && nextLastName !== profile.lastName);

    if (nameChanging && profile.lastNameChangeAt) {
      const daysLeft = cooldownDaysLeft(profile.lastNameChangeAt, NAME_CHANGE_COOLDOWN_MS);
      if (daysLeft > 0) {
        return res.status(429).json({
          error: `You can change your name again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        });
      }
    }

    const updates = {};
    if (firstName !== undefined) {
      if (!nextFirstName) return res.status(400).json({ error: "First name can't be empty." });
      updates.firstName = nextFirstName;
    }
    if (lastName !== undefined) {
      if (!nextLastName) return res.status(400).json({ error: "Last name can't be empty." });
      updates.lastName = nextLastName;
    }
    if (username !== undefined) {
      const val = String(username).trim().toLowerCase();
      if (!USERNAME_RE.test(val)) return res.status(400).json({ error: "Username must be 3-20 characters (letters, numbers, underscore)." });
      if (!(await usernameFullyAvailable(val, { excludeUid: req.uid }))) {
        return res.status(400).json({ error: "Username has already been used." });
      }
      updates.username = val;
    }
    if (req.body.bio !== undefined) {
      const bioVal = String(req.body.bio).slice(0, 1000);
      updates.bio = bioVal;
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: "Nothing to update." });
    if (nameChanging) updates.lastNameChangeAt = Date.now();
    await updateUserProfile(req.uid, updates);
    if (updates.username) {
      addNotification(req.uid, "username", `You changed your username to @${updates.username}.`);
    }
    res.json({ ok: true, ...updates });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not update profile." });
  }
});

app.post("/api/profile/photo", requireAuth, async (req, res) => {
  try {
    const { photoDataUrl } = req.body;
    if (!photoDataUrl || typeof photoDataUrl !== "string" || !/^data:image\/(png|jpeg|jpg|webp);base64,/.test(photoDataUrl)) {
      return res.status(400).json({ error: "Please upload a valid image." });
    }
    if (photoDataUrl.length > 900 * 1024) {
      return res.status(400).json({ error: "That image is too large. Try a smaller photo." });
    }
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });

    if (profile.lastPhotoChangeAt) {
      const daysLeft = cooldownDaysLeft(profile.lastPhotoChangeAt, PHOTO_CHANGE_COOLDOWN_MS);
      if (daysLeft > 0) {
        return res.status(429).json({
          error: `You can change your profile picture again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
        });
      }
    }

    await updateUserProfile(req.uid, { photoURL: photoDataUrl, lastPhotoChangeAt: Date.now() });
    res.json({ ok: true, photoURL: photoDataUrl });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not update your profile picture." });
  }
});

app.post("/api/posts", requireAuth, async (req, res) => {
  try {
    const { text, imageDataUrl, taggedUsernames } = req.body;
    const post = await createPost(req.uid, { text, imageDataUrl, taggedUsernames });
    res.json({ ok: true, post });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create your post." });
  }
});

app.get("/api/posts/user/:username", requireAuth, async (req, res) => {
  try {
    const target = await findUserByUsername(String(req.params.username || "").toLowerCase());
    if (!target || target.pendingDeletion) return res.status(404).json({ error: "User not found." });
    const posts = await getPostsByUser(target.uid, req.uid);
    res.json({ results: posts });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load posts." });
  }
});

app.post("/api/posts/:postId/like", requireAuth, async (req, res) => {
  try {
    const result = await togglePostLike(req.uid, req.params.postId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update like." });
  }
});

app.post("/api/posts/:postId/visibility", requireAuth, async (req, res) => {
  try {
    const result = await updatePostVisibility(req.uid, req.params.postId, req.body.visibility);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update visibility." });
  }
});

app.post("/api/posts/:postId/settings", requireAuth, async (req, res) => {
  try {
    const result = await updatePostSettings(req.uid, req.params.postId, req.body);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update this post's settings." });
  }
});

app.post("/api/posts/:postId/edit", requireAuth, async (req, res) => {
  try {
    const { text, imageDataUrl, taggedUsernames } = req.body;
    const post = await updatePost(req.uid, req.params.postId, { text, imageDataUrl, taggedUsernames });
    res.json({ ok: true, post });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save your changes." });
  }
});

app.post("/api/posts/:postId/delete", requireAuth, async (req, res) => {
  try {
    await deletePost(req.uid, req.params.postId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not delete that post." });
  }
});

app.post("/api/posts/:postId/reshare", requireAuth, async (req, res) => {
  try {
    const post = await resharePost(req.uid, req.params.postId);
    res.json({ ok: true, post });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not reshare that post." });
  }
});

// ── Following feed — powers the "POSTS" overlay on the profile page.
// Fetching the feed itself marks it seen (lastSeenFeedAt), same as opening
// a panel of unread things elsewhere on the site. The separate unseen-count
// endpoint below is for polling — it never marks anything seen, so the
// badge stays accurate until the user actually opens the panel. ──
app.get("/api/feed/following", requireAuth, async (req, res) => {
  try {
    const posts = await getFollowingFeed(req.uid, { limit: 20, markSeen: true });
    res.json({ posts });
  } catch (err) {
    console.error("following feed error:", err.message);
    res.status(400).json({ error: "Could not load your feed." });
  }
});

app.get("/api/feed/following/unseen-count", requireAuth, async (req, res) => {
  try {
    const count = await getFollowingFeedUnseenCount(req.uid, req.userProfile);
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 }); // best-effort — a badge count should never break page load
  }
});

app.get("/api/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const results = await getComments(req.params.postId, req.uid);
    res.json({ results });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not load comments." });
  }
});

app.post("/api/posts/:postId/comments", requireAuth, async (req, res) => {
  try {
    const postId = req.params.postId;
    const comment = await addComment(req.uid, postId, req.body.text, req.body.taggedUsernames);
    res.json({ ok: true, comment });

    // Notifications are best-effort and never block the response above.
    (async () => {
      try {
        const owner = await getPostOwner(postId);
        if (!owner) return;
        const commenter = await getUserProfile(req.uid);
        const commenterName = commenter
          ? (`${commenter.firstName || ""} ${commenter.lastName || ""}`.trim() || `@${commenter.username}`)
          : "Someone";
        const postUrl = owner.username ? `/u/${owner.username}#post-${postId}` : null;
        const notified = new Set([req.uid]);

        // Reply target — the comment being replied to is tagged with a hidden
        // "[[reply:commentId]]" marker the composer prepends; it's kept in the
        // stored text so the reply-quote header still renders after reload.
        const replyMatch = (req.body.text || "").match(/^\[\[reply:([\w-]+)\]\]/);
        if (replyMatch) {
          const repliedUid = await getCommentAuthorUid(replyMatch[1]);
          if (repliedUid && !notified.has(repliedUid)) {
            await addNotification(repliedUid, "comment", `${commenterName} commented on your post.`, { postId, postUrl });
            notified.add(repliedUid);
          }
        }

        if (!notified.has(owner.uid)) {
          await addNotification(owner.uid, "comment", `${commenterName} commented on your post.`, { postId, postUrl });
        }
      } catch {
        // never let a notification failure affect the comment itself
      }
    })();
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not add your comment." });
  }
});

app.post("/api/comments/:commentId/delete", requireAuth, async (req, res) => {
  try {
    await deleteComment(req.uid, req.params.commentId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not delete that comment." });
  }
});

app.post("/api/comments/:commentId/hide", requireAuth, async (req, res) => {
  try {
    const result = await toggleCommentHide(req.uid, req.params.commentId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update that comment." });
  }
});

app.post("/api/comments/:commentId/pin", requireAuth, async (req, res) => {
  try {
    const result = await toggleCommentPin(req.uid, req.params.commentId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update that comment." });
  }
});

app.post("/api/comments/:commentId/like", requireAuth, async (req, res) => {
  try {
    const result = await toggleCommentLike(req.uid, req.params.commentId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update like." });
  }
});

app.post("/api/notifications/:id/toggle-read", requireAuth, async (req, res) => {
  try {
    const result = await toggleNotificationRead(req.uid, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update notification." });
  }
});

app.post("/api/notifications/:id/delete", requireAuth, async (req, res) => {
  try {
    await deleteNotification(req.uid, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not delete notification." });
  }
});

app.post("/api/request-password-change", requireAuth, emailCodeLimiter, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    if (profile.provider === "google") return res.status(400).json({ error: "Google accounts don't have a password here." });
    if (profile.provider === "telegram") return res.status(400).json({ error: "Telegram accounts don't have a password here." });
    if (profile.provider === "github") return res.status(400).json({ error: "GitHub accounts don't have a password here." });
    const { provider } = await issueCode(req.uid, profile.email, "password_reset");
    res.json({ ok: true, provider });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not send code." });
  }
});

app.post("/api/change-password", resetLimiter, async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    const uid = await consumeResetToken(resetToken);
    if (!uid) return res.status(400).json({ error: "Reset link expired. Start again." });
    await firebaseAuth.updateUser(uid, { password: newPassword });
    addNotification(uid, "password", "Your password was changed.");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not update password." });
  }
});

app.post("/api/account/request-email", requireAuth, emailCodeLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const domain = (email.split("@")[1] || "").toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) return res.status(400).json({ error: "Please enter a valid email address." });
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const existing = await firebaseAuth.getUserByEmail(email).catch(() => null);
    if (existing && existing.uid !== req.uid) return res.status(400).json({ error: "That email is already in use by another account." });
    await issueCode(req.uid, email, "add_email");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not send code." });
  }
});

app.post("/api/account/confirm-email", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await checkCode(req.uid, "add_email", code);
    if (!result.ok) {
      const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", not_found: "Code expired. Request a new one." };
      return res.status(400).json({ error: messages[result.reason] || "Invalid code." });
    }
    const email = result.email;
    // Re-check right before committing — the address could have been claimed
    // by someone else while this code was sitting unverified.
    const existing = await firebaseAuth.getUserByEmail(email).catch(() => null);
    if (existing && existing.uid !== req.uid) return res.status(400).json({ error: "That email was just claimed by another account." });
    await firebaseAuth.updateUser(req.uid, { email, emailVerified: true });
    await updateUserProfile(req.uid, { email, emailVerified: true });
    res.json({ ok: true, email });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not verify code." });
  }
});

// ── Passkeys (WebAuthn) — the actual FIDO2/WebAuthn logic and the account
// settings UI both already existed; these are just the HTTP routes tying
// them together. rpID must be the bare domain (no scheme/port); origin
// must be the full URL the browser sees — both fixed to the canonical
// domain rather than derived from the request, since a spoofed Host header
// must never be able to shift what a passkey gets bound to.
const PASSKEY_RP_ID = "esteamstv.devs.surf";
const PASSKEY_ORIGIN = "https://esteamstv.devs.surf";

app.get("/api/passkey/list", requireAuth, async (req, res) => {
  try {
    const passkeys = await getPasskeysForUser(req.uid);
    // Only ever send the client what it needs to render/manage the list —
    // never the public key or counter.
    res.json({
      passkeys: passkeys.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load passkeys." });
  }
});

app.post("/api/passkey/registration-options", requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const identifier = profile.email || profile.username || req.uid;
    const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || identifier;
    const options = await beginPasskeyRegistration(req.uid, identifier, displayName, PASSKEY_RP_ID);
    res.json(options);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not start passkey setup." });
  }
});

app.post("/api/passkey/registration-verify", requireAuth, async (req, res) => {
  try {
    const { name, ...response } = req.body || {};
    await finishPasskeyRegistration(req.uid, response, PASSKEY_RP_ID, PASSKEY_ORIGIN, name);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not add passkey." });
  }
});

app.post("/api/passkey/delete", requireAuth, async (req, res) => {
  try {
    const { credentialId } = req.body || {};
    if (!credentialId) return res.status(400).json({ error: "Missing passkey ID." });
    await deletePasskey(req.uid, credentialId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not delete passkey." });
  }
});

// Passkey sign-in — deliberately not behind requireAuth, since successfully
// verifying the passkey response IS the login. Discoverable credentials
// mean the browser shows the person's own saved passkey(s) for this site
// without needing an email/username first.
app.post("/api/passkey/authentication-options", passkeyOptionsLimiter, async (req, res) => {
  try {
    const { options, token } = await beginPasskeyAuthentication(PASSKEY_RP_ID);
    res.json({ options, token });
  } catch (err) {
    console.error("[passkey-auth-options]", err.stack || err);
    res.status(400).json({ error: "Could not start passkey sign-in." });
  }
});

app.post("/api/passkey/authentication-verify", passkeyVerifyLimiter, async (req, res) => {
  try {
    const { token, ...response } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing passkey session token." });
    const uid = await finishPasskeyAuthentication(token, response, PASSKEY_RP_ID, PASSKEY_ORIGIN);
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    console.error("[passkey-auth-verify]", err.stack || err);
    const notFound = err.code === "passkey/not-found";
    res.status(notFound ? 404 : 400).json({ error: notFound ? "No account found with that passkey." : (err.message || "Could not verify passkey.") });
  }
});

app.post("/api/2fa/setup", requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const { secretBase32, otpauthUrl } = await setupTwoFactor(req.uid, profile.email);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    res.json({ secretBase32, qrDataUrl });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not start two-factor setup." });
  }
});

app.post("/api/2fa/verify-setup", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const ok = await verifyTwoFactorSetup(req.uid, code);
    if (!ok) return res.status(400).json({ error: "Incorrect code. Check your authenticator app and try again." });
    addNotification(req.uid, "2fa", "Two-factor authentication was enabled.");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not verify code." });
  }
});

app.post("/api/2fa/toggle", requireAuth, twoFactorToggleLimiter, async (req, res) => {
  try {
    const { enabled, code } = req.body;
    // Turning 2FA OFF is the security-relevant direction: a hijacked/stolen
    // session (XSS, shared device) could otherwise disable 2FA with nothing
    // but the session cookie, defeating the whole point of having it. Require
    // a valid current TOTP code, same as turning it on for the first time
    // does via /api/2fa/verify-setup. Re-enabling an already-set-up secret
    // doesn't reduce security, so that direction is left as-is.
    if (!enabled) {
      const valid = await verifyTwoFactorCode(req.uid, code);
      if (!valid) return res.status(400).json({ error: "Incorrect code." });
    }
    await setTwoFactorEnabled(req.uid, enabled);
    addNotification(req.uid, "2fa", enabled ? "Two-factor authentication was turned on." : "Two-factor authentication was turned off.");
    res.json({ ok: true, enabled: !!enabled });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not update two-factor authentication." });
  }
});

app.post("/api/request-account-deletion", requireAuth, emailCodeLimiter, async (req, res) => {
  try {
    const { altcha } = req.body;
    if (!(await verifyCaptcha(altcha))) return res.status(400).json({ error: "Captcha not completed." });
    const profile = await getUserProfile(req.uid);
    if (!profile) return res.status(404).json({ error: "Profile not found." });
    const viaTelegram = profile.provider === "telegram" && profile.telegramId;
    if (viaTelegram) {
      await issueCode(req.uid, profile.telegramId, "delete_account", "telegram");
    } else {
      await issueCode(req.uid, profile.email, "delete_account");
    }
    res.json({ ok: true, via: viaTelegram ? "telegram" : "email" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.userFacing ? err.message : "Could not send deletion code." });
  }
});

app.post("/api/confirm-account-deletion", requireAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await checkCode(req.uid, "delete_account", code);
    if (!result.ok) {
      const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", not_found: "Code expired. Request a new one." };
      return res.status(400).json({ error: messages[result.reason] || "Invalid code." });
    }
    await scheduleAccountDeletion(req.uid);
    res.clearCookie("session");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not delete account." });
  }
});

app.post("/api/request-password-reset", resetLimiter, async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    if (!identifier) return res.status(400).json({ error: "Please enter your email or username." });
    const isEmail = identifier.includes("@");
    let email = identifier;
    if (!isEmail) {
      const user = await findUserByUsername(identifier.toLowerCase());
      if (!user || !user.email) return res.status(404).json({ error: "No account found with that username." });
      email = user.email;
    }
    let userRecord;
    try {
      userRecord = await firebaseAuth.getUserByEmail(email);
    } catch (err) {
      return res.status(404).json({ error: isEmail ? "No account found with that email." : "No account found with that username." });
    }
    await issueCode(userRecord.uid, email, "forgot_password");
    res.json({ uid: userRecord.uid, email });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not send reset code." });
  }
});

// Login accepts an email OR a username; resolve it to an email address before
// handing off to Firebase client-side sign-in, which only understands email.
app.post("/api/resolve-login-identifier", identifierLookupLimiter, async (req, res) => {
  try {
    const identifier = String(req.body.identifier || "").trim();
    if (!identifier) return res.status(400).json({ error: "Please enter your email or username." });
    if (identifier.includes("@")) return res.json({ email: identifier });
    const user = await findUserByUsername(identifier.toLowerCase());
    if (!user || !user.email) return res.status(404).json({ error: "Incorrect email or password." });
    res.json({ email: user.email });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not process request." });
  }
});

app.post("/api/verify-reset-code", resetLimiter, async (req, res) => {
  try {
    const { uid, code } = req.body;

    const result = await checkCode(uid, "forgot_password", code);

    if (!result.ok) {
      const messages = {
        expired: "Code expired. Request a new one.",
        mismatch: "Incorrect code.",
        not_found: "Code expired. Request a new one."
      };

      return res.status(400).json({
        error: messages[result.reason] || "Invalid code."
      });
    }

    const user = await firebaseAuth.getUser(uid);

    if (user.disabled) {
      return res.status(403).json({
        error: "This account has been recently deactivated."
      });
    }

    const resetToken = await issueResetToken(uid);

    res.json({ resetToken });

  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: "Could not verify code."
    });
  }
});

app.post("/api/reset-password", resetLimiter, async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    const uid = await consumeResetToken(resetToken);
    if (!uid) return res.status(400).json({ error: "Session expired. Please start again." });
    await firebaseAuth.updateUser(uid, { password: newPassword });
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not reset password." });
  }
});

sweepPendingDeletions().catch((err) => console.error("Deletion sweep failed:", err));
setInterval(() => {
  sweepPendingDeletions().catch((err) => console.error("Deletion sweep failed:", err));
}, 5 * 60 * 1000);

sweepOrphanedUsers().catch((err) => console.error("Orphaned user sweep failed:", err));
setInterval(() => {
  sweepOrphanedUsers().catch((err) => console.error("Orphaned user sweep failed:", err));
}, 30 * 60 * 1000);

setInterval(() => {
  growAdminFollowerCount().catch((err) => console.error("Admin follower growth failed:", err));
}, 60 * 60 * 1000);

//============== SITE KEEP-ALIVE (same pattern as the Telegram bot) ==============//
// Set SELF_URL in Render's env vars to this service's own public URL,
// e.g. https://your-app.onrender.com — pings itself every 4 min so Render's
// free tier never sees 15 min of inbound silence and spins the dyno down.
const SELF_URL = process.env.SELF_URL || `http://localhost:${process.env.PORT || 3000}`;

setInterval(async () => {
  try {
    await fetch(`${SELF_URL}/health`);
    console.log("✅ ES TEAMS TV IS PINGING...");
  } catch (err) {
    console.error("❌ ES TEAMS TV PING FAILED:", err.message);
  }
}, 240000); // every 4 minutes

app.listen(process.env.PORT || 3000, function(){
  console.log("ES TEAMS TV running on port " + (process.env.PORT || 3000));
});
