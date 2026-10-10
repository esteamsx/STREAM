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
import { renderPromote } from "./views/promote.js";
import { renderHome } from "./views/home.js";
import { renderLiveTv } from "./views/live-tv.js";
import { renderProfile } from "./views/profile.js";
import { renderReset } from "./views/reset.js";
import { renderDmca } from "./views/dmca.js";
import { renderPrivacy } from "./views/privacy.js";
import { renderDevelopers } from "./views/developers.js";
import { renderDevelopersLiveTv } from "./views/developers-live-tv.js";
import { renderDevelopersApi } from "./views/developers-api.js";
import { renderAdmin } from "./views/admin.js";
import { domainLock } from "./middleware/lock.js";
import { maintenanceGate } from "./middleware/maintenance.js";
import { quotaMaintenanceGate, checkQuotaError } from "./middleware/quota-guard.js";
import { getDbUsage, diagnoseDbUsage } from "./services/db-usage.js";
import { trackPageView, getAnalytics, flushCompletedDays } from "./middleware/analytics-tracker.js";
import { verifyCoinLedgerChain } from "./services/coin-ledger.js";
import { pageLockGate } from "./middleware/page-lock.js";
import { scrapeGate } from "./middleware/scrape-gate.js";
import { apiRouter } from "./routes/api.js";
import { devApiRouter } from "./routes/dev-api.js";
import { renderDeployBot } from "./views/deploy-bot.js";
import { renderChannelReact } from "./views/channel-react.js";
import { renderToolsIndex } from "./views/tools/index.js";
import { wrapWithGuestBlur } from "./views/partials/guest-blur.js";
import { renderDnsLookup } from "./views/tools/dns-lookup.js";
import { renderObfuscate } from "./views/tools/obfuscate.js";
import { renderQrCode } from "./views/tools/qr-code.js";
import { renderTrading } from "./views/tools/trading.js";
import { renderSslChecker } from "./views/tools/ssl-checker.js";
import { renderWhois } from "./views/tools/whois.js";
import { renderBlockExplorer } from "./views/tools/block-explorer.js";
import { renderBase64 } from "./views/tools/base64.js";
import { renderJwtDecode } from "./views/tools/jwt-decode.js";
import { renderJsonFormatter } from "./views/tools/json-formatter.js";
import { renderFancyText } from "./views/tools/fancy-text.js";
import { renderPasswordGenerator } from "./views/tools/password-generator.js";
import { renderHashGenerator } from "./views/tools/hash-generator.js";
import { renderRegexTester } from "./views/tools/regex-tester.js";
import { renderTimestampConverter } from "./views/tools/timestamp-converter.js";
import { renderWordCounter } from "./views/tools/word-counter.js";
import { renderCaseConverter } from "./views/tools/case-converter.js";
import { renderLoremIpsum } from "./views/tools/lorem-ipsum.js";
import { renderSlugGenerator } from "./views/tools/slug-generator.js";
import { renderUrlEncoder } from "./views/tools/url-encoder.js";
import { renderHtmlEntity } from "./views/tools/html-entity.js";
import { renderHexText } from "./views/tools/hex-text.js";
import { renderBinaryText } from "./views/tools/binary-text.js";
import { renderCaesarCipher } from "./views/tools/caesar-cipher.js";
import { renderUuidGenerator } from "./views/tools/uuid-generator.js";
import { renderColorConverter } from "./views/tools/color-converter.js";
import { renderBaseConverter } from "./views/tools/base-converter.js";
import { renderRomanNumeral } from "./views/tools/roman-numeral.js";
import { renderUserAgentParser } from "./views/tools/user-agent-parser.js";
import { renderSubnetCalculator } from "./views/tools/subnet-calculator.js";
import { renderRandomNumber } from "./views/tools/random-number.js";
import { renderDiceRoller } from "./views/tools/dice-roller.js";
import { renderDedupeLines } from "./views/tools/dedupe-lines.js";
import { renderSortLines } from "./views/tools/sort-lines.js";
import { renderAgeCalculator } from "./views/tools/age-calculator.js";
import { renderTextDiff } from "./views/tools/text-diff.js";
import { renderFindReplace } from "./views/tools/find-replace.js";
import { renderCsvJson } from "./views/tools/csv-json.js";
import { renderNumberToWords } from "./views/tools/number-to-words.js";
import { renderMorseCode } from "./views/tools/morse-code.js";
import { renderPercentageCalculator } from "./views/tools/percentage-calculator.js";
import { renderBmiCalculator } from "./views/tools/bmi-calculator.js";
import { renderContrastChecker } from "./views/tools/contrast-checker.js";
import { renderMarkdownPreview } from "./views/tools/markdown-preview.js";
import { renderFakeData } from "./views/tools/fake-data.js";
import { renderTextEncrypt } from "./views/tools/text-encrypt.js";
import { renderTypingTest } from "./views/tools/typing-test.js";
import { renderIpLookup } from "./views/tools/ip-lookup.js";
import { renderHttpHeaders } from "./views/tools/http-headers.js";
import { renderCronExplainer } from "./views/tools/cron-explainer.js";
import { renderCssGradient } from "./views/tools/css-gradient.js";
import { renderTipCalculator } from "./views/tools/tip-calculator.js";
import { renderRandomQuote } from "./views/tools/random-quote.js";
import { renderAsciiArt } from "./views/tools/ascii-art.js";
import { renderYamlJson } from "./views/tools/yaml-json.js";
import { renderJsonDiff } from "./views/tools/json-diff.js";
import { renderPasswordHash } from "./views/tools/password-hash.js";
import { renderTotpTool } from "./views/tools/totp-tool.js";
import { renderNameGenerator } from "./views/tools/name-generator.js";
import { renderCountdownTimer } from "./views/tools/countdown-timer.js";
import { renderMinifyBeautify } from "./views/tools/minify-beautify.js";
import { renderRobotsTxt } from "./views/tools/robots-txt.js";
import { renderSitemapXml } from "./views/tools/sitemap-xml.js";
import { renderSqlFormat } from "./views/tools/sql-format.js";
import { renderJsonSchemaValidate } from "./views/tools/json-schema-validate.js";
import { renderFaviconGenerator } from "./views/tools/favicon-generator.js";
import { renderMemeText } from "./views/tools/meme-text.js";
import { renderSignatureGenerator } from "./views/tools/signature-generator.js";
import { renderColorblindSimulator } from "./views/tools/colorblind-simulator.js";
import { renderApiTester } from "./views/tools/api-tester.js";
import { renderWsTester } from "./views/tools/ws-tester.js";
import { renderFileTypeDetector } from "./views/tools/file-type-detector.js";
import { renderSpeechTools } from "./views/tools/speech-tools.js";
import { renderQrScanner } from "./views/tools/qr-scanner.js";
import { renderOcrTool } from "./views/tools/ocr-tool.js";
import { toolsRouter } from "./routes/tools.js";
import { freeApiRouter, handleShortlinkRedirect } from "./routes/free-apis.js";

const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const BOT_SERVICE_TIMEOUT_MS = 15000;
const BOT_PATH_SEGMENT_RE = /^[A-Za-z0-9_-]{1,64}$/;

function botPathSegment(value) {
  const raw = String(value == null ? "" : value);
  return BOT_PATH_SEGMENT_RE.test(raw) ? raw : null;
}

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
      throw Object.assign(new Error("Bot service didn't respond in time. It may be waking up, try again shortly."), { status: 504 });
    }
    throw Object.assign(new Error("Could not reach the bot service."), { status: 502 });
  }
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw Object.assign(new Error(data.error || `Bot service returned HTTP ${resp.status}.`), { status: resp.status });
  return data;
}

import QRCode from "qrcode";
import * as bybitReadonly from "./services/bybit-readonly.js";
import * as weexReadonly from "./services/weex-readonly.js";
import {
  saveCredentials as saveTradingCredentials,
  deleteCredentials as deleteTradingCredentials,
  getCredentialsStatus as getTradingCredentialsStatus,
  getDecryptedCredentials as getDecryptedTradingCredentials,
  findDuplicateCredentialOwner,
  saveAutoTradingSettings,
  getAllOptedInAutoTraders,
} from "./services/trading-credentials.js";
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
  getMaxPasskeysForUser,
  beginPasskeyRegistration,
  finishPasskeyRegistration,
  deletePasskey,
  beginPasskeyAuthentication,
  finishPasskeyAuthentication,
  getFaceScanForUser,
  enrollFaceScan,
  removeFaceScan,
  matchFaceScan,
  runSubscriptionRenewals,
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
  applyReferral,
  issueResetToken,
  consumeResetToken,
  createSession,
  createDeviceSession,
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
  validateImageDataUrl,
  createPost,
  getPostsByUser,
  togglePostLike,
  updatePostVisibility,
  updatePostSettings,
  updatePost,
  deletePost,
  resharePost,
  togglePinPost,
  recalculateUserLikesCount,
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
  getDiscoverFeed,
  getPostImage,
  getSuggestedUsers,
  addNotification,
  getNotifications,
  hasUnreadNotifications,
  countUnreadNotifications,
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
  getMaintenanceMode,
  getMaintenanceStatus,
  LOCKABLE_PAGES,
  getPageLockStatus,
  setPageLock,
  setMaintenanceMode,
  sendSupportMessage,
  editSupportMessage,
  deleteSupportMessage,
  getSupportMessages,
  getSupportUnreadCountForUser,
  getSupportUnreadCountForAdmin,
  getSupportThreadsForAdmin,
  sweepExpiredSupportMessages,
  requireAuth,
  optionalAuth,
  isAdminEmail,
  getAdminUid,
  isVerificationActive,
  checkAndIncrementDailyLimit,
  spendCoins,
  refundCoins,
  CHANNEL_REACT_COIN_COST,
  getEffectiveApiPlan,
  checkAndIncrementManualTradeQuota,
  checkPositionLimit,
  requireAiTradingAccess,
  requireCommunityAccess,
  creditTradingProfitCoins,
  sendCommunityMessage,
  getCommunityMessages,
  deleteCommunityMessage,
  COMMUNITY_CHAT_NAME,
  API_PLANS,
  SESSION_TTL_MS,
  createBonusCode,
  broadcastNotification,
  listBonusCodes,
  createTradingPlanCode,
  listTradingPlanCodes,
  redeemTradingPlanCode,
  adminListWithdrawalRequests,
  adminConfirmWithdrawalPaid,
  logChannelReactUse,
  getChannelReactHistory,
  adminListChannelReactLog,
  adminMarkChannelReactResent,
  adminDecideChannelReact,
} from "./services/auth.js";
import { chargeAuthorization } from "./services/paystack.js";
import { paymentsRouter } from "./routes/payments.js";
import { promoteRouter } from "./routes/promote.js";
import { injectPromoSlot } from "./middleware/promo-slot.js";
import { flushAdStats } from "./services/ads.js";
import { rewardsRouter } from "./routes/rewards.js";
import { payLinkRouter } from "./routes/pay-link.js";
import { statusRouter } from "./routes/status.js";
import { visitorSupportRouter } from "./routes/visitor-support.js";
import { devicesRouter } from "./routes/devices.js";
import { deviceBansRouter, enforceLoginDevice } from "./routes/device-bans.js";
import { adminFacesRouter } from "./routes/admin-faces.js";
import { blacklistMiddleware } from "./services/device-bans.js";
import { vpnGuard } from "./services/vpn-guard.js";
import { clientIp } from "./services/client-ip.js";
import { db, auth as firebaseAuth } from "./config/firebase.js";
import {
  PUSH_ENABLED,
  VAPID_PUBLIC_KEY,
  saveSubscription,
  removeSubscription,
  getSubscriptionCount,
  broadcastPush,
  sendPushToUid,
} from "./config/push.js";
import { sendDmcaReportEmail } from "./services/mailer.js";
import { createChallenge, verifySolution } from "altcha-lib";
import {
  securityHeaders,
  helmetMiddleware,
  cspNonce,
  SimpleRateLimiter,
  DurableRateLimiter,
  suspiciousRequestDetector,
  ipBlocklist,
  ROBOTS_TXT,
  permissionsPolicy,
  hppGuard,
  probePathTrap,
  RepeatedRefusalGuard,
  crossOriginWriteGuard,
  requireSiteOrigin,
} from "./middleware/security-middleware.js";
import { requestId, responseWatchdog, notFoundHandler, errorHandler } from "./middleware/error-pages.js";
import { canonicalPath, pageGuards } from "./middleware/navigation.js";
import { WEB_MANIFEST, siteHeadFor, siteOrigin } from "./config/site.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use(requestId);

app.use(responseWatchdog({ timeoutMs: 30000, exemptPrefixes: ["/api/v1/hls/"] }));

app.use(domainLock);

app.use(compression());

app.use(cspNonce);
app.use(injectPromoSlot);
app.use(helmetMiddleware);
app.use((req, res, next) => {
  res.setHeader("Accept-CH", "Sec-CH-UA-Model, Sec-CH-UA-Platform, Sec-CH-UA-Platform-Version");
  next();
});
app.use(securityHeaders);
app.use(permissionsPolicy);
app.use(hppGuard);
app.use(probePathTrap);
app.use(new RepeatedRefusalGuard(15, 5 * 60 * 1000, 30 * 60 * 1000).middleware());
app.use(ipBlocklist);
app.use(vpnGuard);
app.use(suspiciousRequestDetector);
const globalLimiter = new SimpleRateLimiter(400, 60000).middleware();
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/hls/")) return next();
  return globalLimiter(req, res, next);
});
app.get("/robots.txt", (req, res) => res.type("text/plain").send(ROBOTS_TXT));

app.get("/health", (req, res) => res.status(200).send("ok"));

app.get("/api/security/my-ip", (req, res) => {
  res.set("Cache-Control", "no-store").json({
    clientIp: clientIp(req),
    expressIp: req.ip,
    forwardedFor: req.headers["x-forwarded-for"] || null,
    cfConnectingIp: req.headers["cf-connecting-ip"] || null,
  });
});

const devtoolsReportLimiter = new SimpleRateLimiter(5, 60 * 1000).middleware();
app.post("/api/security/devtools", devtoolsReportLimiter, (req, res) => {
  const path = String((req.body && req.body.path) || "").slice(0, 120);
  console.warn(`[devtools] ip=${req.ip} path=${path} ua=${String(req.headers["user-agent"] || "").slice(0, 160)}`);
  res.status(204).end();
});

app.get("/outbound-ip", async (req, res) => {
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const REVALIDATE_ALWAYS_FILES = new Set(["interactive.js", "face-scan.js", "claim-face.js", "sponsor.js", "promote.js", "pay-method.js", "admin-ads.js", "select-overlay.js", "site-ui.js", "post-ui.js", "home.js", "status-ui.js", "devtools-guard.js", "incognito-guard.js", "visitor-support.js"]);

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "7d",
    etag: true,
    index: false,
    redirect: false,
    dotfiles: "ignore",
    setHeaders: (res, filePath) => {
      if (REVALIDATE_ALWAYS_FILES.has(path.basename(filePath))) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

app.use(canonicalPath);

const signupLimiter = new DurableRateLimiter(8, 15 * 60 * 1000, undefined, undefined, { bucket: "signup", getDb: () => db }).middleware();
const passwordLoginLimiter = new DurableRateLimiter(10, 15 * 60 * 1000, undefined, undefined, { bucket: "login", getDb: () => db }).middleware();
const authExchangeLimiter = new DurableRateLimiter(15, 15 * 60 * 1000, undefined, undefined, { bucket: "authexchange", getDb: () => db }).middleware();
const twoFactorLoginLimiter = new DurableRateLimiter(10, 15 * 60 * 1000, undefined, undefined, { bucket: "twofactor", getDb: () => db }).middleware();
const passkeyOptionsLimiter = new SimpleRateLimiter(20, 15 * 60 * 1000).middleware();
const passkeyVerifyLimiter = new DurableRateLimiter(10, 15 * 60 * 1000, undefined, undefined, { bucket: "passkey", getDb: () => db }).middleware();
const facescanVerifyLimiter = new DurableRateLimiter(8, 15 * 60 * 1000, undefined, undefined, { bucket: "facescan", getDb: () => db }).middleware();
const oauthStartLimiter = new SimpleRateLimiter(15, 15 * 60 * 1000).middleware();
const oauthCallbackLimiter = new SimpleRateLimiter(15, 15 * 60 * 1000).middleware();
const identifierLookupLimiter = new SimpleRateLimiter(20, 15 * 60 * 1000).middleware();
const twoFactorToggleLimiter = new SimpleRateLimiter(10, 15 * 60 * 1000, (req) => req.uid).middleware();
const emailCodeLimiter = new SimpleRateLimiter(5, 15 * 60 * 1000, (req) => req.uid).middleware();
const resetLimiter = new DurableRateLimiter(5, 15 * 60 * 1000, undefined, undefined, { bucket: "reset", getDb: () => db }).middleware();
const dmcaLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000).middleware();
const usernameCheckLimiter = new SimpleRateLimiter(40, 60 * 1000).middleware();
const channelApiLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => req.uid).middleware();
const botDeployLimiter = new SimpleRateLimiter(5, 60 * 60 * 1000, (req) => req.uid).middleware();
const botActionLimiter = new SimpleRateLimiter(30, 60 * 1000, (req) => req.uid).middleware();
const botStatusLimiter = new SimpleRateLimiter(120, 60 * 1000, (req) => req.uid).middleware();
const notifPollLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid).middleware();
const tradingOrderLimiter = new SimpleRateLimiter(10, 60 * 1000, (req) => req.uid, "Too many order requests. Slow down.").middleware();

function tradingService(req) {
  return String(req.query?.exchange || req.body?.exchange || "bybit").toLowerCase() === "weex" ? weexReadonly : bybitReadonly;
}
function tradingDemo(req) {
  return String(req.query?.demo || req.body?.demo || "") === "1" || req.body?.demo === true;
}
async function getTradingCreds(req) {
  const exchange = String(req.query?.exchange || req.body?.exchange || "bybit").toLowerCase() === "weex" ? "weex" : "bybit";
  const mode = tradingDemo(req) ? "demo" : "live";

  let creds = null;
  try {
    creds = await getDecryptedTradingCredentials(req.uid, exchange, mode);
  } catch (err) {
    creds = null;
  }
  if (creds) return creds;

  const profile = await getUserProfile(req.uid).catch(() => null);
  if (profile && isAdminEmail(profile.email)) {
    return undefined;
  }

  throw Object.assign(
    new Error("Connect your own " + (exchange === "weex" ? "WEEX" : "Bybit") + " API keys in Settings, then API Keys, before trading."),
    { status: 400 }
  );
}

const BULK_GROUPS_COLLECTION = "bulkPositionGroups";
function bulkGroupId(category, symbol) {
  return `${category}_${symbol}`;
}
const bulkGroupCache = new Map();
const BULK_GROUP_CACHE_MS = 10000;
function invalidateBulkGroupCache(category, symbol) {
  const key = bulkGroupId(category, symbol);
  bulkGroupCache.delete(key);
  virtualBulkCache.delete(key);
}
async function getActiveBulkGroup(category, symbol) {
  const key = bulkGroupId(category, symbol);
  const cached = bulkGroupCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const snap = await db.collection(BULK_GROUPS_COLLECTION).doc(key).get();
  const data = snap.exists && snap.data().active ? { id: snap.id, ...snap.data() } : null;
  bulkGroupCache.set(key, { data, expiresAt: Date.now() + BULK_GROUP_CACHE_MS });
  return data;
}
async function saveBulkGroup({ category, symbol, side, leverage, createdBy, participants, takeProfit, stopLoss }) {
  await db.collection(BULK_GROUPS_COLLECTION).doc(bulkGroupId(category, symbol)).set({
    category, symbol, side, leverage, createdBy, participants, active: true, updatedAt: Date.now(),
    takeProfit: takeProfit || null, stopLoss: stopLoss || null,
  });
  invalidateBulkGroupCache(category, symbol);
}
async function listActiveBulkGroupsByAdmin(adminUid, category) {
  const snap = await db.collection(BULK_GROUPS_COLLECTION).where("createdBy", "==", adminUid).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((g) => g.active && g.category === category);
}
const virtualBulkCache = new Map();
const VIRTUAL_BULK_CACHE_MS = 15000;
async function buildVirtualBulkPosition(req, group) {
  const cacheKey = bulkGroupId(group.category, group.symbol);
  const cached = virtualBulkCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const service = tradingService(req);
  let markPrice = null;
  try {
    const klines = await service.getPublicKlines(group.category, group.symbol, "15", 1, tradingDemo(req));
    markPrice = klines && klines.list && klines.list[0] ? Number(klines.list[0][4]) : null;
  } catch (err) {
    console.error("[bulk] mark price fetch failed for " + group.symbol + ":", err.message);
  }

  let totalPnl = 0;
  let totalMargin = 0;
  let respondedCount = 0;
  try {
    const participants = Array.isArray(group.participants) ? group.participants : [];
    const results = await Promise.allSettled(participants.map(async (p) => {
      const creds = await getDecryptedTradingCredentials(p.uid, p.exchange, p.mode);
      if (!creds) return null;
      const svc = p.exchange === "weex" ? weexReadonly : bybitReadonly;
      return svc.getLivePosition(group.category, group.symbol, p.mode === "demo", creds);
    }));
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value && r.value.hasPosition) {
        totalPnl += Number(r.value.unrealizedPnl) || 0;
        totalMargin += Number(r.value.margin) || 0;
        respondedCount++;
      }
    });
  } catch (err) {
    console.error("[bulk] participant PnL aggregation failed for " + group.symbol + ":", err.message);
  }

  const data = {
    hasPosition: true,
    side: group.side,
    size: 0,
    entryPrice: markPrice,
    markPrice,
    leverage: group.leverage,
    unrealizedPnl: totalPnl,
    positionValue: totalMargin,
    margin: totalMargin,
    participantCount: respondedCount,
    liqPrice: null,
    marginMode: "isolated",
    takeProfit: group.takeProfit || null,
    stopLoss: group.stopLoss || null,
    isBulk: true,
    bulkIsAdmin: true,
    isVirtual: true,
  };
  virtualBulkCache.set(cacheKey, { data, expiresAt: Date.now() + VIRTUAL_BULK_CACHE_MS });
  return data;
}
async function cascadeBulkAction({ category, symbol, adminUid, perParticipant, deactivateAfter }) {
  const group = await getActiveBulkGroup(category, symbol);
  if (!group || group.createdBy !== adminUid) return 0;
  const others = (group.participants || []).filter((p) => p.uid !== adminUid);
  let succeeded = 0;
  await Promise.allSettled(others.map(async (p) => {
    const creds = await getDecryptedTradingCredentials(p.uid, p.exchange, p.mode).catch(() => null);
    if (!creds) return;
    const service = p.exchange === "weex" ? weexReadonly : bybitReadonly;
    await perParticipant(service, creds, p);
    succeeded++;
  }));
  if (deactivateAfter) {
    await db.collection(BULK_GROUPS_COLLECTION).doc(group.id).update({ active: false, closedAt: Date.now() }).catch(() => {});
    invalidateBulkGroupCache(category, symbol);
  }
  return succeeded;
}
const channelReactLimiter = new SimpleRateLimiter(
  10,
  10 * 60 * 1000,
  (req) => req.uid,
  "Too many channel reactions. Give it a few minutes."
).middleware();

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

app.use(crossOriginWriteGuard);

app.use(express.json({ limit: "25mb", verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cookieParser());
app.use(visitorSupportRouter);
app.use(blacklistMiddleware);
app.use(trackPageView);

const REFERRAL_CODE_RE = /^[A-Z0-9]{4,16}$/;
const REFERRAL_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const raw = req.query?.ref;
  if (!raw) return next();
  const code = String(raw).trim().toUpperCase();
  if (!REFERRAL_CODE_RE.test(code)) return next();
  res.cookie("ref_code", code, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE_MS,
  });
  next();
});

app.use(quotaMaintenanceGate);
app.use(maintenanceGate);
app.use(pageLockGate);
app.use(apiRouter);
app.use(devApiRouter);
app.use(toolsRouter);
app.use(freeApiRouter);
app.get("/s/:code", handleShortlinkRedirect);
app.use(paymentsRouter);
app.use(promoteRouter);
app.use(rewardsRouter);
app.use(payLinkRouter);
app.use(statusRouter);
app.use(devicesRouter);
app.use(deviceBansRouter);
app.use(adminFacesRouter);

function domainLockHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
const DOMAIN_LOCK_HOSTS = String(process.env.ALLOWED_HOSTS || "esteamstv.devs.surf")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const DOMAIN_LOCK_PRIMARY_HOST = DOMAIN_LOCK_HOSTS[0] || "esteamstv.devs.surf";

const SECURITY_CONTACT_EMAIL =
  process.env.SECURITY_CONTACT_EMAIL || process.env.DMCA_AGENT_EMAIL || process.env.GMAIL_USER || "etimpaschal95@gmail.com";
const SECURITY_TXT_EXPIRES = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, "Z");
const SECURITY_TXT = [
  `Contact: mailto:${SECURITY_CONTACT_EMAIL}`,
  `Expires: ${SECURITY_TXT_EXPIRES}`,
  `Canonical: https://${DOMAIN_LOCK_PRIMARY_HOST}/.well-known/security.txt`,
  `Policy: https://${DOMAIN_LOCK_PRIMARY_HOST}/privacy`,
  `Preferred-Languages: en`,
].join("\n") + "\n";
app.get(["/.well-known/security.txt", "/security.txt"], (req, res) => {
  res.type("text/plain").send(SECURITY_TXT);
});

const APPLE_MERCHANT_FILE = path.join(__dirname, "public", ".well-known", "apple-developer-merchantid-domain-association");
app.get("/.well-known/apple-developer-merchantid-domain-association", (req, res) => {
  fs.readFile(APPLE_MERCHANT_FILE, (err, buf) => {
    if (err) return res.status(404).end();
    res.set("Cache-Control", "public, max-age=300");
    res.set("Content-Type", "application/text"); // Paystack requires exactly this content-type
    res.send(buf);
  });
});

const DOMAIN_LOCK_ALLOWED_HASHES = JSON.stringify(
  Array.from(new Set([...DOMAIN_LOCK_HOSTS, "localhost", "127.0.0.1"])).map(domainLockHash)
);
const DOMAIN_LOCK_SCRIPT = `<script nonce="__CSP_NONCE__">
(function(){
  function _dlh(s){var a=5381;for(var i=0;i<s.length;i++){a=((a<<5)+a+s.charCodeAt(i))|0;}return (a>>>0).toString(36);}
  var _dla=${DOMAIN_LOCK_ALLOWED_HASHES};
  var _dlr=${JSON.stringify(DOMAIN_LOCK_PRIMARY_HOST)};
  var _dlx=String(location.hostname||'').toLowerCase();
  try {
    document.write(
      '<style>.__eswmi{position:fixed!important;z-index:2147483647!important;pointer-events:none!important;' +
      'font:10px/1.2 monospace!important;color:transparent!important;opacity:.006!important;' +
      'user-select:text;background:transparent!important;margin:0!important}' +
      '.__eswmi.tl{top:2px;left:2px}.__eswmi.tr{top:2px;right:2px}.__eswmi.bl{bottom:2px;left:2px}.__eswmi.br{bottom:2px;right:2px}</style>' +
      '<div class="__eswmi tl">ES TEAMS TV \\u2022 ' + _dlr + '</div>' +
      '<div class="__eswmi tr">ES TEAMS TV \\u2022 ' + _dlr + '</div>' +
      '<div class="__eswmi bl">ES TEAMS TV \\u2022 ' + _dlr + '</div>' +
      '<div class="__eswmi br">ES TEAMS TV \\u2022 ' + _dlr + '</div>'
    );
  } catch(e){}
  if (_dla.indexOf(_dlh(_dlx)) === -1) {
    try { document.write('<style>html,html *{display:none!important;visibility:hidden!important}</style>'); } catch(e){}
    try { window.stop && window.stop(); } catch(e){}
    setTimeout(function(){ try { location.replace('https://'+_dlr+location.pathname+location.search); } catch(e){} }, 30);
  }
})();
</script>`;

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
  telegramConfigured: !!(process.env.TELEGRAM_CLIENT_ID && process.env.TELEGRAM_CLIENT_SECRET),
  githubConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || "",
  devToolsBlock: DOMAIN_LOCK_SCRIPT + `<script nonce="__CSP_NONCE__">
document.addEventListener('contextmenu', function(e){
  if (e.target.closest('a, button, img, [role="button"]')) e.preventDefault();
});

</script>
<script nonce="__CSP_NONCE__" src="/devtools-guard.js" defer></script>`,
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

const cachedLoginHtml = renderLogin(authPageConfig);
const cachedVerifyHtml = renderVerify(authPageConfig);
const cachedAccountHtml = renderAccount(authPageConfig);
const cachedPromoHtml = renderPromote(authPageConfig);
const cachedAccountGuestHtml = wrapWithGuestBlur(cachedAccountHtml, "/account");
const cachedProfileHtml = renderProfile(authPageConfig);
const cachedAdminHtml = renderAdmin(authPageConfig);
const cachedResetHtml = renderReset(authPageConfig);
const cachedDmcaHtml = renderDmca(authPageConfig);
const cachedPrivacyHtml = renderPrivacy(authPageConfig);
const cachedDevelopersHtml = renderDevelopers(authPageConfig);
const cachedDevelopersLiveTvHtml = renderDevelopersLiveTv(authPageConfig);
const cachedDevelopersApiHtml = renderDevelopersApi(authPageConfig);
const cachedDeployBotHtml = renderDeployBot(authPageConfig);
const cachedChannelReactHtml = renderChannelReact(authPageConfig);
const cachedToolsIndexHtml = renderToolsIndex(authPageConfig);
const cachedToolsIndexGuestHtml = wrapWithGuestBlur(cachedToolsIndexHtml, "/tools");
const cachedToolsDnsLookupHtml = renderDnsLookup(authPageConfig);
const cachedToolsObfuscateHtml = renderObfuscate(authPageConfig);
const cachedToolsQrCodeHtml = renderQrCode(authPageConfig);
const cachedToolsTradingHtml = renderTrading(authPageConfig);
const cachedToolsTradingGuestHtml = wrapWithGuestBlur(cachedToolsTradingHtml, "/tools/trading");
const cachedToolsSslCheckerHtml = renderSslChecker(authPageConfig);
const cachedToolsWhoisHtml = renderWhois(authPageConfig);
const cachedToolsBlockExplorerHtml = renderBlockExplorer(authPageConfig);
const cachedToolsBase64Html = renderBase64(authPageConfig);
const cachedToolsJwtDecodeHtml = renderJwtDecode(authPageConfig);
const cachedToolsJsonFormatterHtml = renderJsonFormatter(authPageConfig);
const cachedToolsFancyTextHtml = renderFancyText(authPageConfig);
const cachedToolsPasswordGeneratorHtml = renderPasswordGenerator(authPageConfig);
const cachedToolsHashGeneratorHtml = renderHashGenerator(authPageConfig);
const cachedToolsRegexTesterHtml = renderRegexTester(authPageConfig);
const cachedToolsTimestampConverterHtml = renderTimestampConverter(authPageConfig);
const cachedToolsWordCounterHtml = renderWordCounter(authPageConfig);
const cachedToolsCaseConverterHtml = renderCaseConverter(authPageConfig);
const cachedToolsLoremIpsumHtml = renderLoremIpsum(authPageConfig);
const cachedToolsSlugGeneratorHtml = renderSlugGenerator(authPageConfig);
const cachedToolsUrlEncoderHtml = renderUrlEncoder(authPageConfig);
const cachedToolsHtmlEntityHtml = renderHtmlEntity(authPageConfig);
const cachedToolsHexTextHtml = renderHexText(authPageConfig);
const cachedToolsBinaryTextHtml = renderBinaryText(authPageConfig);
const cachedToolsCaesarCipherHtml = renderCaesarCipher(authPageConfig);
const cachedToolsUuidGeneratorHtml = renderUuidGenerator(authPageConfig);
const cachedToolsColorConverterHtml = renderColorConverter(authPageConfig);
const cachedToolsBaseConverterHtml = renderBaseConverter(authPageConfig);
const cachedToolsRomanNumeralHtml = renderRomanNumeral(authPageConfig);
const cachedToolsUserAgentParserHtml = renderUserAgentParser(authPageConfig);
const cachedToolsSubnetCalculatorHtml = renderSubnetCalculator(authPageConfig);
const cachedToolsRandomNumberHtml = renderRandomNumber(authPageConfig);
const cachedToolsDiceRollerHtml = renderDiceRoller(authPageConfig);
const cachedToolsDedupeLinesHtml = renderDedupeLines(authPageConfig);
const cachedToolsSortLinesHtml = renderSortLines(authPageConfig);
const cachedToolsAgeCalculatorHtml = renderAgeCalculator(authPageConfig);
const cachedToolsTextDiffHtml = renderTextDiff(authPageConfig);
const cachedToolsFindReplaceHtml = renderFindReplace(authPageConfig);
const cachedToolsCsvJsonHtml = renderCsvJson(authPageConfig);
const cachedToolsNumberToWordsHtml = renderNumberToWords(authPageConfig);
const cachedToolsMorseCodeHtml = renderMorseCode(authPageConfig);
const cachedToolsPercentageCalculatorHtml = renderPercentageCalculator(authPageConfig);
const cachedToolsBmiCalculatorHtml = renderBmiCalculator(authPageConfig);
const cachedToolsContrastCheckerHtml = renderContrastChecker(authPageConfig);
const cachedToolsMarkdownPreviewHtml = renderMarkdownPreview(authPageConfig);
const cachedToolsFakeDataHtml = renderFakeData(authPageConfig);
const cachedToolsTextEncryptHtml = renderTextEncrypt(authPageConfig);
const cachedToolsTypingTestHtml = renderTypingTest(authPageConfig);
const cachedToolsIpLookupHtml = renderIpLookup(authPageConfig);
const cachedToolsHttpHeadersHtml = renderHttpHeaders(authPageConfig);
const cachedToolsCronExplainerHtml = renderCronExplainer(authPageConfig);
const cachedToolsCssGradientHtml = renderCssGradient(authPageConfig);
const cachedToolsTipCalculatorHtml = renderTipCalculator(authPageConfig);
const cachedToolsRandomQuoteHtml = renderRandomQuote(authPageConfig);
const cachedToolsAsciiArtHtml = renderAsciiArt(authPageConfig);
const cachedToolsYamlJsonHtml = renderYamlJson(authPageConfig);
const cachedToolsJsonDiffHtml = renderJsonDiff(authPageConfig);
const cachedToolsPasswordHashHtml = renderPasswordHash(authPageConfig);
const cachedToolsTotpToolHtml = renderTotpTool(authPageConfig);
const cachedToolsNameGeneratorHtml = renderNameGenerator(authPageConfig);
const cachedToolsCountdownTimerHtml = renderCountdownTimer(authPageConfig);
const cachedToolsMinifyBeautifyHtml = renderMinifyBeautify(authPageConfig);
const cachedToolsRobotsTxtHtml = renderRobotsTxt(authPageConfig);
const cachedToolsSitemapXmlHtml = renderSitemapXml(authPageConfig);
const cachedToolsSqlFormatHtml = renderSqlFormat(authPageConfig);
const cachedToolsJsonSchemaValidateHtml = renderJsonSchemaValidate(authPageConfig);
const cachedToolsFaviconGeneratorHtml = renderFaviconGenerator(authPageConfig);
const cachedToolsMemeTextHtml = renderMemeText(authPageConfig);
const cachedToolsSignatureGeneratorHtml = renderSignatureGenerator(authPageConfig);
const cachedToolsColorblindSimulatorHtml = renderColorblindSimulator(authPageConfig);
const cachedToolsApiTesterHtml = renderApiTester(authPageConfig);
const cachedToolsWsTesterHtml = renderWsTester(authPageConfig);
const cachedToolsFileTypeDetectorHtml = renderFileTypeDetector(authPageConfig);
const cachedToolsSpeechToolsHtml = renderSpeechTools(authPageConfig);
const cachedToolsQrScannerHtml = renderQrScanner(authPageConfig);
const cachedToolsOcrToolHtml = renderOcrTool(authPageConfig);

const cachedFootballHtml = (() => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "views", "football.html"), "utf8");
    return raw
      .replace("</title>", `</title>\n${siteHeadFor("football")}`)
      .replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n${DOMAIN_LOCK_SCRIPT}`);
  } catch (err) {
    console.error("Could not load the football page:", err.message);
    return null;
  }
})();

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

app.get(["/apple-touch-icon-precomposed.png"], (req, res) => res.redirect(301, "/apple-touch-icon.png"));
app.get("/site.webmanifest", (req, res) => {
  res.set("Cache-Control", "public, max-age=86400");
  res.type("application/manifest+json").send(JSON.stringify(WEB_MANIFEST));
});
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => res.status(204).end());

const { requireUser, guestOnly } = pageGuards({ verifySession });

let homeHtmlCache = null;

app.get("/", scrapeGate, requireUser, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (!homeHtmlCache) homeHtmlCache = renderHome({ DOMAIN_LOCK_SCRIPT, siteHeadFor });
  res.send(homeHtmlCache);
});

app.get("/live", scrapeGate, requireUser, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.send(renderLiveTv({ liveTV, categoryIcon, DOMAIN_LOCK_SCRIPT, siteHeadFor }));
});

app.get("/football", scrapeGate, (req, res, next) => {
  if (!cachedFootballHtml) return next();
  res.type("html").send(cachedFootballHtml);
});

app.get("/login", scrapeGate, guestOnly, (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (req.query.embed === "1") res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(cachedLoginHtml);
});

app.get("/verify", scrapeGate, (req, res) => {
  res.send(cachedVerifyHtml);
});

app.get("/account", scrapeGate, async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.send(cachedAccountGuestHtml);
  const profile = await getUserProfile(uid);
  if (!profile || profile.banned || isSessionRevoked(sessionId, profile)) return res.send(cachedAccountGuestHtml);
  res.send(cachedAccountHtml);
});

app.get("/promote", scrapeGate, requireUser, (req, res) => {
  res.send(cachedPromoHtml);
});

app.get("/profile", scrapeGate, requireUser, (req, res) => {
  res.send(cachedProfileHtml);
});

app.get("/u/:username", scrapeGate, (req, res) => {
  res.send(cachedProfileHtml);
});

app.get("/admin", scrapeGate, async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.redirect("/login");
  const profile = await getUserProfile(uid);
  if (!profile || profile.banned || isSessionRevoked(sessionId, profile)) return res.redirect("/login");
  if (!isAdminEmail(profile.email)) return res.redirect("/");
  res.send(cachedAdminHtml);
});

async function requireAdmin(req, res, next) {
  try {
    const profile = req.userProfile || (await getUserProfile(req.uid));
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    next();
  } catch (err) {
    res.status(403).json({ error: "Not authorized." });
  }
}

app.get("/api/admin/analytics", requireAuth, requireAdmin, async (req, res) => {
  try {
    const range = String(req.query.range || "7d");
    const allowed = new Set(["24h", "7d", "30d", "60d", "180d", "lifetime"]);
    const data = await getAnalytics(allowed.has(range) ? range : "7d");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Could not load analytics." });
  }
});

app.get("/api/admin/coin-ledger/:uid/verify", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await verifyCoinLedgerChain(db, String(req.params.uid || ""));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Could not verify that account's coin ledger." });
  }
});

app.get("/api/admin/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const profile = await getUserProfile(req.uid);
    res.json({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      username: profile.username || "",
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

app.get("/api/admin/maintenance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const status = await getMaintenanceStatus();
    res.json({
      maintenanceMode: status.maintenanceMode,
      until: status.until || null,
      startedAt: status.startedAt || null,
      serverNow: Date.now(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load maintenance status." });
  }
});

app.post("/api/admin/maintenance", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await setMaintenanceMode(!!req.body?.enabled, req.body?.until);
    res.json({ ...result, serverNow: Date.now() });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not update maintenance status." });
  }
});

app.get("/api/admin/page-locks", requireAuth, requireAdmin, async (req, res) => {
  try {
    const active = await getPageLockStatus();
    res.json({
      pages: Object.keys(LOCKABLE_PAGES).map((key) => ({ key, label: LOCKABLE_PAGES[key].label })),
      active,
      serverNow: Date.now(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load page lock status." });
  }
});

app.post("/api/admin/page-locks", requireAuth, requireAdmin, async (req, res) => {
  try {
    const pageKey = String(req.body?.pageKey || "");
    const result = await setPageLock(pageKey, !!req.body?.enabled, req.body?.until);
    res.json({ ...result, serverNow: Date.now() });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not update page lock." });
  }
});

app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: PUSH_ENABLED ? VAPID_PUBLIC_KEY : null });
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  try {
    const subscription = req.body?.subscription;
    if (!subscription || !subscription.endpoint) return res.status(400).json({ error: "Invalid subscription." });
    subscription.ua = req.body?.ua || null;
    await saveSubscription(req.uid, subscription);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not save subscription." });
  }
});

app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
  try {
    await removeSubscription(req.body?.endpoint);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not remove subscription." });
  }
});

app.get("/api/admin/push/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const count = await getSubscriptionCount();
    res.json({ enabled: PUSH_ENABLED, subscribers: count });
  } catch (err) {
    res.status(500).json({ error: "Could not load push stats." });
  }
});

app.post("/api/admin/push/broadcast", requireAuth, requireAdmin, async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const body = String(req.body?.body || "").trim();
    const url = String(req.body?.url || "/").trim();
    if (!title || !body) return res.status(400).json({ error: "Title and message are required." });

    const inApp = await broadcastNotification(`${title}: ${body}`, { url });
    const push = PUSH_ENABLED
      ? await broadcastPush({ title, body, url, tag: "esteamstv-broadcast" })
      : { sent: 0, failed: 0, total: 0 };

    res.json({ inApp, push });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not send broadcast." });
  }
});

app.get("/api/admin/bonus-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ codes: await listBonusCodes() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load bonus codes." });
  }
});

app.post("/api/admin/bonus-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const amount = Number(req.body && req.body.amount);
    const maxRedemptions = Number(req.body && req.body.maxRedemptions);
    const code = await createBonusCode(req.uid, amount, maxRedemptions);
    res.json({ ok: true, code });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create bonus code." });
  }
});

app.get("/api/admin/trading-plan-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ codes: await listTradingPlanCodes() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load trading plan codes." });
  }
});

app.post("/api/admin/trading-plan-codes", requireAuth, requireAdmin, async (req, res) => {
  try {
    const plan = String(req.body && req.body.plan || "");
    const durationDays = Number(req.body && req.body.durationDays);
    const maxRedemptions = Number(req.body && req.body.maxRedemptions);
    const code = await createTradingPlanCode(req.uid, plan, durationDays, maxRedemptions);
    res.json({ ok: true, code });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not create trading plan code." });
  }
});

app.get("/api/admin/withdrawals", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ withdrawals: await adminListWithdrawalRequests() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load withdrawal requests." });
  }
});

app.post("/api/admin/withdrawals/:id/confirm", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminConfirmWithdrawalPaid(req.params.id);
    res.json({ ok: true, certificateSerial: result.certificateSerial || null });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not confirm this withdrawal." });
  }
});

app.get("/api/admin/channel-react-log", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ entries: await adminListChannelReactLog() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load the channel react log." });
  }
});

app.post("/api/admin/channel-react-log/:id/resend", requireAuth, requireAdmin, async (req, res) => {
  try {
    const link = String(req.body?.link || "").trim();
    if (!link) return res.status(400).json({ error: "Missing link." });
    const serviceBot = await resolveServiceBot();
    if (!serviceBot) return res.status(409).json({ error: "The reaction service is not available right now." });
    await botServiceFetch(`/internal/bots/${serviceBot.id}/channel-react`, {
      method: "POST",
      body: JSON.stringify({ uid: serviceBot.uid, link, mode: "relay" }),
    });
    await adminMarkChannelReactResent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not resend that reaction." });
  }
});

app.post("/api/admin/channel-react-log/:id/confirm", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminDecideChannelReact(req.params.id, true);
    await addNotification(result.uid, "channel_react_confirmed", "Your channel reaction was confirmed", { link: result.link }).catch(() => {});
    await sendPushToUid(result.uid, {
      title: "ES TEAMS TV",
      body: "Your channel reaction was confirmed",
      url: "/channel-react",
      tag: "channel-react-" + req.params.id,
    }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not confirm this reaction." });
  }
});

app.post("/api/admin/channel-react-log/:id/decline", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await adminDecideChannelReact(req.params.id, false);
    await addNotification(result.uid, "channel_react_declined", "Your channel reaction was declined", { link: result.link }).catch(() => {});
    await sendPushToUid(result.uid, {
      title: "ES TEAMS TV",
      body: "Your channel reaction was declined",
      url: "/channel-react",
      tag: "channel-react-" + req.params.id,
    }).catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not decline this reaction." });
  }
});

app.get("/api/admin/support/threads", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ threads: await getSupportThreadsForAdmin() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load customer care chats." });
  }
});

app.get("/api/admin/support/threads/:uid/messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ messages: await getSupportMessages(req.params.uid, true) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load that chat." });
  }
});

app.post("/api/admin/support/threads/:uid/messages", requireAuth, requireAdmin, async (req, res) => {
  try {
    const message = await sendSupportMessage(req.params.uid, req.body?.text, true, req.body?.attachment, req.body?.replyTo);
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not send that message." });
  }
});

app.post("/api/admin/support/threads/:uid/messages/:messageId/edit", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await editSupportMessage(req.params.uid, req.params.messageId, true, req.body?.text);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not edit that message." });
  }
});

app.post("/api/admin/support/threads/:uid/messages/:messageId/delete", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await deleteSupportMessage(req.params.uid, req.params.messageId, true);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that message." });
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
        verified: profile ? isVerificationActive(profile) : false,
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
    const targetUid = botPathSegment(req.params.uid);
    if (!targetUid) return res.status(404).json({ error: "User not found." });
    res.json(await botServiceFetch(`/internal/admin/bots/users/${targetUid}`));
  } catch (err) {
    res.status(err.status || 500).json({ error: "Could not load that user's deployments." });
  }
});

app.post("/api/admin/bots/:id/stop", requireAuth, requireAdmin, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/admin/bots/${botId}/stop`, { method: "POST" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not stop that deployment." });
  }
});

app.post("/api/admin/bots/:id/restart", requireAuth, requireAdmin, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/admin/bots/${botId}/restart`, { method: "POST" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not restart that deployment." });
  }
});

app.delete("/api/admin/bots/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/admin/bots/${botId}`, { method: "DELETE" }));
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

app.get("/api/admin/system/storage", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await botServiceFetch("/internal/system/storage"));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load bot deployment storage." });
  }
});

app.get("/api/admin/system/db-usage", requireAuth, requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await getDbUsage());
  } catch (err) {
    const denied = err.status === 403 || err.status === 401;
    if (denied) console.warn(`[db-usage] Google ${err.status} ${err.googleStatus || ""} ${err.reason || ""}: ${err.message}`);
    res.status(denied ? 403 : 500).json({
      error: denied
        ? `Google denied access to usage data (HTTP ${err.status}${err.googleStatus ? " " + err.googleStatus : ""}${err.reason ? " / " + err.reason : ""}): ${err.message}`
        : (err.message || "Could not load database usage."),
    });
  }
});

app.get("/api/admin/system/db-usage/diagnose", requireAuth, requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    res.json(await diagnoseDbUsage());
  } catch (err) {
    res.status(500).json({ error: err.message || "Diagnosis failed." });
  }
});

app.get("/reset", scrapeGate, (req, res) => {
  res.send(cachedResetHtml);
});

app.get("/dmca", scrapeGate, (req, res) => {
  res.send(cachedDmcaHtml);
});

app.get("/privacy", scrapeGate, (req, res) => {
  res.send(cachedPrivacyHtml);
});

app.get("/developers", scrapeGate, (req, res) => {
  res.send(cachedDevelopersHtml);
});

app.get("/developers/live-tv", scrapeGate, (req, res) => {
  res.send(cachedDevelopersLiveTvHtml);
});

app.get("/developers/api", scrapeGate, (req, res) => {
  res.send(cachedDevelopersApiHtml);
});

app.get("/deploy-bot", scrapeGate, requireUser, (req, res) => {
  res.send(cachedDeployBotHtml);
});

app.get("/channel-react", scrapeGate, requireUser, (req, res) => {
  res.send(cachedChannelReactHtml);
});

app.get("/tools", scrapeGate, async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.send(cachedToolsIndexGuestHtml);
  const profile = await getUserProfile(uid);
  if (!profile || profile.banned || isSessionRevoked(sessionId, profile)) return res.send(cachedToolsIndexGuestHtml);
  res.send(cachedToolsIndexHtml);
});

app.get("/tools/dns-lookup", scrapeGate, (req, res) => {
  res.send(cachedToolsDnsLookupHtml);
});

app.get("/tools/obfuscate", scrapeGate, (req, res) => {
  res.send(cachedToolsObfuscateHtml);
});

app.get("/tools/trading", scrapeGate, async (req, res) => {
  const sessionId = req.cookies?.session;
  const uid = await verifySession(sessionId);
  if (!uid) return res.send(cachedToolsTradingGuestHtml);
  const profile = await getUserProfile(uid);
  if (!profile || profile.banned || isSessionRevoked(sessionId, profile)) return res.send(cachedToolsTradingGuestHtml);
  res.send(cachedToolsTradingHtml);
});

app.get("/api/tools/trading/klines", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase();
    const interval = String(req.query.interval || "15");
    const result = await tradingService(req).getPublicKlines(category, symbol, interval, 200, tradingDemo(req));
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load chart data." });
  }
});

app.get("/api/tools/trading/position", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase();
    const creds = await getTradingCreds(req);
    const result = await tradingService(req).getLivePosition(category, symbol, tradingDemo(req), creds);
    if (result.hasPosition) {
      try {
        const group = await getActiveBulkGroup(category, symbol);
        const isParticipant = !!group && (group.participants || []).some((p) => p.uid === req.uid);
        if (isParticipant) {
          result.isBulk = true;
          result.bulkIsAdmin = group.createdBy === req.uid;
        }
      } catch (err) {
        console.error("[bulk] position tag lookup failed:", err.message);
      }
    } else {
      try {
        const group = await getActiveBulkGroup(category, symbol);
        if (group && group.createdBy === req.uid) {
          Object.assign(result, await buildVirtualBulkPosition(req, group));
        }
      } catch (err) {
        console.error("[bulk] virtual position build failed:", err.message);
      }
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load your position." });
  }
});

app.get("/api/tools/trading/positions", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const creds = await getTradingCreds(req);
    const result = await tradingService(req).getAllPositions(category, tradingDemo(req), creds);
    if (!Array.isArray(result.positions)) result.positions = [];
    if (result.positions.length) {
      await Promise.all(result.positions.map(async (pos) => {
        try {
          const group = await getActiveBulkGroup(category, pos.symbol);
          const isParticipant = !!group && (group.participants || []).some((p) => p.uid === req.uid);
          if (isParticipant) {
            pos.isBulk = true;
            pos.bulkIsAdmin = group.createdBy === req.uid;
          }
        } catch (err) {
          console.error("[bulk] position tag lookup failed for " + pos.symbol + ":", err.message);
        }
      }));
    }
    try {
      const ownGroups = await listActiveBulkGroupsByAdmin(req.uid, category);
      console.error("[bulk] admin " + req.uid + " has " + ownGroups.length + " own group(s) for category " + category + ":", ownGroups.map((g) => g.symbol + "/active=" + g.active));
      const virtualResults = await Promise.allSettled(ownGroups.map(async (g) => {
        const virtual = await buildVirtualBulkPosition(req, g);
        return { symbol: g.symbol, ...virtual };
      }));
      virtualResults.forEach((r, i) => {
        if (r.status === "fulfilled") {
          result.positions.push(r.value);
        } else {
          console.error("[bulk] virtual position build failed for " + ownGroups[i].symbol + ":", r.reason && r.reason.message);
        }
      });
    } catch (err) {
      console.error("[bulk] loading admin's own bulk groups failed:", err.message);
    }
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load your positions." });
  }
});

app.get("/api/tools/trading/instrument", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const symbol = String(req.query.symbol || "BTCUSDT").toUpperCase();
    const result = await tradingService(req).getInstrumentInfo(category, symbol, tradingDemo(req));
    res.json(result);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load instrument info." });
  }
});

app.post("/api/tools/trading/redeem-plan-code", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const result = await redeemTradingPlanCode(req.uid, req.body?.code);
    res.json({ ok: true, plan: result.plan, expiresAt: result.expiresAt });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not redeem that code." });
  }
});

app.get("/api/tools/trading/prefs", requireAuth, async (req, res) => {
  try {
    const profile = req.userProfile || (await getUserProfile(req.uid));
    res.json(profile?.tradingPrefs || {});
  } catch (err) {
    res.status(500).json({ error: "Could not load your trading preferences." });
  }
});

app.post("/api/tools/trading/prefs", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const prefs = {};
    if (Array.isArray(body.favorites)) prefs.favorites = body.favorites.map((s) => String(s).toUpperCase()).slice(0, 100);
    if (typeof body.lastSymbol === "string") prefs.lastSymbol = body.lastSymbol.toUpperCase();
    if (body.exchange === "weex" || body.exchange === "bybit") prefs.exchange = body.exchange;
    if (typeof body.demoMode === "boolean") prefs.demoMode = body.demoMode;
    if (body.marginMode === "cross" || body.marginMode === "isolated") prefs.marginMode = body.marginMode;
    if (body.viewMode === "manual" || body.viewMode === "auto") prefs.viewMode = body.viewMode;
    if (!Object.keys(prefs).length) return res.status(400).json({ error: "No valid preference fields provided." });

    const existing = req.userProfile || (await getUserProfile(req.uid));
    await updateUserProfile(req.uid, { tradingPrefs: { ...(existing?.tradingPrefs || {}), ...prefs } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Could not save your trading preferences." });
  }
});

app.post("/api/tools/trading/order", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const side = req.body?.side === "Sell" ? "Sell" : "Buy";
    const qty = String(req.body?.qty || "");
    const leverage = req.body?.leverage ? String(req.body.leverage) : null;
    const orderType = req.body?.orderType === "Limit" ? "Limit" : "Market";
    const price = req.body?.price ? String(req.body.price) : null;
    const takeProfit = req.body?.takeProfit ? String(req.body.takeProfit) : null;
    const stopLoss = req.body?.stopLoss ? String(req.body.stopLoss) : null;
    if (!symbol || !qty || Number(qty) <= 0) {
      return res.status(400).json({ error: "Symbol and quantity are required." });
    }
    const demo = tradingDemo(req);
    const creds = await getTradingCreds(req);
    const existing = await tradingService(req).getAllPositions(category, demo, creds);
    const alreadyOpen = (existing.positions || []).some((p) => p.symbol === symbol);
    if (alreadyOpen) {
      return res.status(400).json({ error: `You already have an open ${symbol} position. Close it before opening another.` });
    }
    await checkPositionLimit(req.uid, (existing.positions || []).length);
    await checkAndIncrementManualTradeQuota(req.uid);
    const result = await tradingService(req).placeOrder({ category, symbol, side, qty, leverage, orderType, price, takeProfit, stopLoss, demo, marginMode: req.body.marginMode, override: creds });
    res.json({ ok: true, order: result });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not place order." });
  }
});

app.post("/api/tools/trading/margin-mode", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const marginMode = req.body?.marginMode === "cross" ? "cross" : "isolated";
    const service = tradingService(req);
    if (typeof service.setMarginMode === "function") {
      const creds = await getTradingCreds(req);
      await service.setMarginMode(category, symbol, marginMode, tradingDemo(req), creds);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not update margin mode." });
  }
});

app.post("/api/tools/trading/close", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const percent = req.body?.percent ? Number(req.body.percent) : 100;
    const bulkAction = !!req.body?.bulkAction;
    if (!symbol) return res.status(400).json({ error: "Symbol is required." });
    const demo = tradingDemo(req);

    if (bulkAction) {
      const group = await getActiveBulkGroup(category, symbol);
      if (!group || group.createdBy !== req.uid) {
        return res.status(400).json({ error: "No active bulk trade for this pair." });
      }
      const bulkClosed = await cascadeBulkAction({
        category, symbol, adminUid: req.uid,
        perParticipant: (service, override, p) => service.closePosition(category, symbol, percent, p.mode === "demo", override),
        deactivateAfter: !percent || percent >= 100,
      }).catch(() => 0);
      return res.json({ ok: true, order: null, bulkClosed });
    }

    const creds = await getTradingCreds(req);
    let roiSnapshot = null;
    try {
      const posData = await tradingService(req).getLivePosition(category, symbol, demo, creds);
      if (posData.hasPosition && posData.margin) {
        roiSnapshot = (posData.unrealizedPnl / posData.margin) * 100;
      }
    } catch (err) {}
    let isBulkPosition = false;
    try {
      const group = await getActiveBulkGroup(category, symbol);
      isBulkPosition = !!group && (group.participants || []).some((p) => p.uid === req.uid);
    } catch (err) {}
    const result = await tradingService(req).closePosition(category, symbol, percent, demo, creds);
    if (roiSnapshot != null && !isBulkPosition && (!percent || percent >= 100)) {
      creditTradingProfitCoins(req.uid, roiSnapshot, demo).catch(() => {});
    }
    res.json({ ok: true, order: result });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not close position." });
  }
});

app.post("/api/tools/trading/tpsl", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const takeProfit = req.body?.takeProfit ? String(req.body.takeProfit) : "";
    const stopLoss = req.body?.stopLoss ? String(req.body.stopLoss) : "";
    const bulkAction = !!req.body?.bulkAction;
    if (!symbol) return res.status(400).json({ error: "Symbol is required." });
    const demo = tradingDemo(req);

    if (bulkAction) {
      const group = await getActiveBulkGroup(category, symbol);
      if (!group || group.createdBy !== req.uid) {
        return res.status(400).json({ error: "No active bulk trade for this pair." });
      }
      await db.collection(BULK_GROUPS_COLLECTION).doc(group.id).update({ takeProfit: takeProfit || null, stopLoss: stopLoss || null }).catch(() => {});
      invalidateBulkGroupCache(category, symbol);
      const bulkUpdated = await cascadeBulkAction({
        category, symbol, adminUid: req.uid,
        perParticipant: (service, override, p) => service.setTradingStop(category, symbol, { takeProfit, stopLoss, demo: p.mode === "demo", override }),
      }).catch(() => 0);
      return res.json({ ok: true, bulkUpdated });
    }

    const creds = await getTradingCreds(req);
    await tradingService(req).setTradingStop(category, symbol, { takeProfit, stopLoss, demo, override: creds });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not update TP/SL." });
  }
});

app.get("/api/tools/trading/symbols", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const result = await tradingService(req).getAllInstruments(category, tradingDemo(req));
    const symbols = (result.list || [])
      .filter((s) => s.quoteCoin === "USDT" && s.status === "Trading")
      .map((s) => s.symbol)
      .sort();
    res.json({ symbols });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load the symbol list." });
  }
});

app.get("/api/tools/trading/bulk-symbols", requireAuth, requireAdmin, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const demo = tradingDemo(req);
    const [bybitList, weexList] = await Promise.all([
      bybitReadonly.getAllInstruments(category, demo).catch(() => ({ list: [] })),
      weexReadonly.getAllInstruments(category, demo).catch(() => ({ list: [] })),
    ]);
    const bybitSymbols = new Set(
      (bybitList.list || []).filter((s) => s.quoteCoin === "USDT" && s.status === "Trading").map((s) => s.symbol)
    );
    const weexSymbols = new Set(
      (weexList.list || []).filter((s) => s.quoteCoin === "USDT" && s.status === "Trading").map((s) => s.symbol)
    );
    const symbols = [...bybitSymbols].filter((s) => weexSymbols.has(s)).sort();
    res.json({ symbols });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load the symbol list." });
  }
});

app.get("/api/tools/trading/bulk-instrument", requireAuth, requireAdmin, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const symbol = String(req.query.symbol || "").toUpperCase();
    const demo = tradingDemo(req);
    if (!symbol) return res.status(400).json({ error: "Symbol is required." });
    const [bybitInfo, weexInfo] = await Promise.all([
      bybitReadonly.getInstrumentInfo(category, symbol, demo).catch(() => null),
      weexReadonly.getInstrumentInfo(category, symbol, demo).catch(() => null),
    ]);
    if (!bybitInfo || !weexInfo) return res.status(502).json({ error: "This pair isn't available on both exchanges." });
    const maxLeverage = Math.min(Number(bybitInfo.maxLeverage) || 1, Number(weexInfo.maxLeverage) || 1);
    res.json({ maxLeverage });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load instrument info." });
  }
});

app.get("/api/tools/trading/orders", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const creds = await getTradingCreds(req);
    const result = await tradingService(req).getOpenOrders(category, tradingDemo(req), creds);
    res.json({ orders: result });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load open orders." });
  }
});

app.post("/api/tools/trading/orders/cancel", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const orderId = String(req.body?.orderId || "");
    if (!symbol || !orderId) return res.status(400).json({ error: "Symbol and orderId are required." });
    const creds = await getTradingCreds(req);
    await tradingService(req).cancelOrder(category, symbol, orderId, tradingDemo(req), creds);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not cancel order." });
  }
});

app.get("/api/tools/trading/closed-pnl", requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || "linear");
    const creds = await getTradingCreds(req);
    const result = await tradingService(req).getClosedPnl(category, 30, tradingDemo(req), creds);
    res.json({ trades: result });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load closed trades." });
  }
});

app.get("/api/tools/trading/keys/status", requireAuth, async (req, res) => {
  try {
    const status = await getTradingCredentialsStatus(req.uid);
    status.isAdmin = isAdminEmail(req.userProfile?.email);
    res.json(status);
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not load API key status." });
  }
});

app.post("/api/tools/trading/keys", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const exchange = String(req.body?.exchange || "").toLowerCase();
    const mode = String(req.body?.mode || "").toLowerCase();
    const apiKey = String(req.body?.apiKey || "").trim();
    const apiSecret = String(req.body?.apiSecret || "").trim();
    const passphrase = req.body?.passphrase ? String(req.body.passphrase).trim() : undefined;

    if (await findDuplicateCredentialOwner(req.uid, "apiKey", apiKey)) {
      return res.status(409).json({ error: "This API key is already saved on another account." });
    }
    if (await findDuplicateCredentialOwner(req.uid, "apiSecret", apiSecret)) {
      return res.status(409).json({ error: "This API secret is already saved on another account." });
    }
    if (passphrase && (await findDuplicateCredentialOwner(req.uid, "passphrase", passphrase))) {
      return res.status(409).json({ error: "This API passphrase is already saved on another account." });
    }

    const demo = mode === "demo";
    const service = exchange === "weex" ? weexReadonly : bybitReadonly;
    try {
      await service.getAllPositions("linear", demo, { apiKey, apiSecret, passphrase });
    } catch (err) {
      return res.status(400).json({ error: "Could not verify these keys with " + (exchange === "weex" ? "WEEX" : "Bybit") + ": " + (err.message || "invalid keys.") });
    }

    await saveTradingCredentials(req.uid, exchange, mode, { apiKey, apiSecret, passphrase });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not save API keys." });
  }
});

app.post("/api/tools/trading/keys/check-duplicate", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const field = String(req.body?.field || "");
    const value = String(req.body?.value || "").trim();
    if (!["apiKey", "apiSecret", "passphrase"].includes(field) || !value) {
      return res.json({ duplicate: false });
    }
    const duplicate = await findDuplicateCredentialOwner(req.uid, field, value);
    res.json({ duplicate });
  } catch (err) {
    res.json({ duplicate: false });
  }
});

app.delete("/api/tools/trading/keys", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const exchange = String(req.body?.exchange || "").toLowerCase();
    const mode = String(req.body?.mode || "").toLowerCase();
    await deleteTradingCredentials(req.uid, exchange, mode);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not remove API keys." });
  }
});

app.get("/api/tools/trading/auto-balance", requireAuth, async (req, res) => {
  try {
    const exchange = req.query?.exchange === "weex" ? "weex" : "bybit";
    const mode = req.query?.mode === "live" ? "live" : "demo";
    const creds = await getDecryptedTradingCredentials(req.uid, exchange, mode);
    if (!creds) return res.json({ available: null });
    const service = exchange === "weex" ? weexReadonly : bybitReadonly;
    const balanceInfo = await service.getAllPositions("linear", mode === "demo", creds);
    res.json({ available: balanceInfo.available != null ? Number(balanceInfo.available) : null });
  } catch (err) {
    res.json({ available: null });
  }
});

app.post("/api/tools/trading/auto-settings", requireAuth, tradingOrderLimiter, async (req, res) => {
  try {
    const exchange = req.body?.exchange === "weex" ? "weex" : "bybit";
    const mode = req.body?.mode === "live" ? "live" : "demo";
    if (req.body?.enabled) {
      await requireAiTradingAccess(req.uid);
    }
    await saveAutoTradingSettings(req.uid, {
      enabled: !!req.body?.enabled,
      exchange: req.body?.exchange,
      mode: req.body?.mode,
      sizePercent: req.body?.sizePercent,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Could not save auto trading settings." });
  }
});

app.post("/api/tools/trading/auto/bulk-start", requireAuth, requireAdmin, tradingOrderLimiter, async (req, res) => {
  try {
    const category = String(req.body?.category || "linear");
    const symbol = String(req.body?.symbol || "").toUpperCase();
    const side = req.body?.side === "Sell" ? "Sell" : "Buy";
    const leverage = req.body?.leverage ? Number(req.body.leverage) : 1;
    const takeProfit = req.body?.takeProfit ? String(req.body.takeProfit) : "";
    const stopLoss = req.body?.stopLoss ? String(req.body.stopLoss) : "";
    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required." });
    }

    const activeGroup = await getActiveBulkGroup(category, symbol);
    if (activeGroup) {
      return res.status(400).json({ error: `There's already an active bulk trade on ${symbol}. Close it first before starting another.` });
    }

    const traders = (await getAllOptedInAutoTraders()).filter((t) => t.uid !== req.uid);
    if (!traders.length) {
      return res.json({ total: 0, succeeded: 0, failed: 0, results: [] });
    }

    const priceByExchangeMode = {};
    async function getMarkPrice(exchange, demo) {
      const key = exchange + ":" + demo;
      if (priceByExchangeMode[key] != null) return priceByExchangeMode[key];
      const service = exchange === "weex" ? weexReadonly : bybitReadonly;
      const klines = await service.getPublicKlines(category, symbol, "15", 1, demo);
      const price = klines.list && klines.list[0] ? Number(klines.list[0][4]) : null;
      priceByExchangeMode[key] = price;
      return price;
    }

    const results = await Promise.allSettled(
      traders.map(async (trader) => {
        const auto = trader.autoTrading || {};
        const exchange = auto.exchange === "weex" ? "weex" : "bybit";
        const mode = auto.mode === "live" ? "live" : "demo";
        const demo = mode === "demo";
        const sizePercent = Number(auto.sizePercent || 0);
        if (!sizePercent || sizePercent < 1 || sizePercent > 100) {
          throw Object.assign(new Error("Invalid size percent."), { uid: trader.uid });
        }
        try {
          await requireAiTradingAccess(trader.uid);
        } catch (err) {
          throw Object.assign(new Error(err.message || "Plan no longer allows Auto Trading."), { uid: trader.uid });
        }
        const creds = await getDecryptedTradingCredentials(trader.uid, exchange, mode);
        if (!creds) {
          throw Object.assign(new Error("No " + exchange + " " + mode + " API keys saved."), { uid: trader.uid });
        }
        let usdtToUse = 0;
        try {
          const service0 = exchange === "weex" ? weexReadonly : bybitReadonly;
          const balanceInfo = await service0.getAllPositions(category, demo, creds);
          const available = Number(balanceInfo.available || 0);
          usdtToUse = available * (sizePercent / 100) * 0.99;
          const alreadyOpen = (balanceInfo.positions || []).some((p) => p.symbol === symbol);
          if (alreadyOpen) {
            throw Object.assign(new Error(`Already has an open ${symbol} position.`), { uid: trader.uid });
          }
        } catch (err) {
          if (err.uid) throw err;
        }
        if (!usdtToUse || usdtToUse < 1) {
          throw Object.assign(new Error("Balance too low to size a trade."), { uid: trader.uid });
        }
        const price = await getMarkPrice(exchange, demo);
        if (!price) {
          throw Object.assign(new Error("Could not fetch a price for " + symbol + "."), { uid: trader.uid });
        }
        let qty = (usdtToUse * leverage) / price;
        const service = exchange === "weex" ? weexReadonly : bybitReadonly;
        try {
          const info = await service.getInstrumentInfo(category, symbol, demo);
          const step = Number(info.qtyStep || 0.001);
          qty = Math.floor(qty / step) * step;
          const min = Number(info.minOrderQty || 0);
          if (min && qty < min) qty = min;
        } catch (err) {}
        qty = Number(qty.toFixed(8));
        const order = await service.placeOrderWithCredentials({
          apiKey: creds.apiKey,
          apiSecret: creds.apiSecret,
          passphrase: creds.passphrase,
          category, symbol, side, qty, leverage, orderType: "Market", demo,
        });

        if (takeProfit || stopLoss) {
          try {
            await service.setTradingStop(category, symbol, { takeProfit, stopLoss, demo, override: creds });
          } catch (err) {
            console.error("[bulk] TP/SL set failed for " + trader.uid + ":", err.message);
          }
        }
        return { uid: trader.uid, exchange, mode, qty, order };
      })
    );

    const summary = results.map((r, i) => {
      if (r.status === "fulfilled") {
        return { uid: r.value.uid, ok: true, exchange: r.value.exchange, mode: r.value.mode, qty: r.value.qty };
      }
      return { uid: r.reason?.uid || traders[i].uid, ok: false, error: r.reason?.message || "Failed." };
    });

    const succeededList = summary.filter((s) => s.ok).map((s) => ({ uid: s.uid, exchange: s.exchange, mode: s.mode }));
    if (succeededList.length) {
      await saveBulkGroup({ category, symbol, side, leverage, createdBy: req.uid, participants: succeededList, takeProfit, stopLoss })
        .then(() => console.error("[bulk] group saved for " + symbol + " with " + succeededList.length + " participant(s), admin " + req.uid))
        .catch((err) => console.error("[bulk] saveBulkGroup FAILED for " + symbol + ":", err.message));
    } else {
      console.error("[bulk] no group saved for " + symbol + " - 0 of " + summary.length + " succeeded:", summary.map((s) => s.error).join(" | "));
    }

    res.json({
      total: summary.length,
      succeeded: summary.filter((s) => s.ok).length,
      failed: summary.filter((s) => !s.ok).length,
      results: summary,
    });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || "Bulk start failed." });
  }
});

app.get("/tools/qr-code", scrapeGate, (req, res) => {
  res.send(cachedToolsQrCodeHtml);
});

app.get("/tools/ssl-checker", scrapeGate, (req, res) => {
  res.send(cachedToolsSslCheckerHtml);
});

app.get("/tools/whois", scrapeGate, (req, res) => {
  res.send(cachedToolsWhoisHtml);
});

app.get("/tools/block-explorer", scrapeGate, (req, res) => {
  res.send(cachedToolsBlockExplorerHtml);
});

app.get("/tools/base64", scrapeGate, (req, res) => {
  res.send(cachedToolsBase64Html);
});

app.get("/tools/jwt-decode", scrapeGate, (req, res) => {
  res.send(cachedToolsJwtDecodeHtml);
});

app.get("/tools/json-formatter", scrapeGate, (req, res) => {
  res.send(cachedToolsJsonFormatterHtml);
});

app.get("/tools/fancy-text", scrapeGate, (req, res) => {
  res.send(cachedToolsFancyTextHtml);
});

app.get("/tools/password-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsPasswordGeneratorHtml);
});

app.get("/tools/hash-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsHashGeneratorHtml);
});

app.get("/tools/regex-tester", scrapeGate, (req, res) => {
  res.send(cachedToolsRegexTesterHtml);
});

app.get("/tools/timestamp-converter", scrapeGate, (req, res) => {
  res.send(cachedToolsTimestampConverterHtml);
});

app.get("/tools/word-counter", scrapeGate, (req, res) => {
  res.send(cachedToolsWordCounterHtml);
});

app.get("/tools/case-converter", scrapeGate, (req, res) => {
  res.send(cachedToolsCaseConverterHtml);
});

app.get("/tools/lorem-ipsum", scrapeGate, (req, res) => {
  res.send(cachedToolsLoremIpsumHtml);
});

app.get("/tools/slug-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsSlugGeneratorHtml);
});

app.get("/tools/url-encoder", scrapeGate, (req, res) => {
  res.send(cachedToolsUrlEncoderHtml);
});

app.get("/tools/html-entity", scrapeGate, (req, res) => {
  res.send(cachedToolsHtmlEntityHtml);
});

app.get("/tools/hex-text", scrapeGate, (req, res) => {
  res.send(cachedToolsHexTextHtml);
});

app.get("/tools/binary-text", scrapeGate, (req, res) => {
  res.send(cachedToolsBinaryTextHtml);
});

app.get("/tools/caesar-cipher", scrapeGate, (req, res) => {
  res.send(cachedToolsCaesarCipherHtml);
});

app.get("/tools/uuid-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsUuidGeneratorHtml);
});

app.get("/tools/color-converter", scrapeGate, (req, res) => {
  res.send(cachedToolsColorConverterHtml);
});

app.get("/tools/base-converter", scrapeGate, (req, res) => {
  res.send(cachedToolsBaseConverterHtml);
});

app.get("/tools/roman-numeral", scrapeGate, (req, res) => {
  res.send(cachedToolsRomanNumeralHtml);
});

app.get("/tools/user-agent-parser", scrapeGate, (req, res) => {
  res.send(cachedToolsUserAgentParserHtml);
});

app.get("/tools/subnet-calculator", scrapeGate, (req, res) => {
  res.send(cachedToolsSubnetCalculatorHtml);
});

app.get("/tools/random-number", scrapeGate, (req, res) => {
  res.send(cachedToolsRandomNumberHtml);
});

app.get("/tools/dice-roller", scrapeGate, (req, res) => {
  res.send(cachedToolsDiceRollerHtml);
});

app.get("/tools/dedupe-lines", scrapeGate, (req, res) => {
  res.send(cachedToolsDedupeLinesHtml);
});

app.get("/tools/sort-lines", scrapeGate, (req, res) => {
  res.send(cachedToolsSortLinesHtml);
});

app.get("/tools/age-calculator", scrapeGate, (req, res) => {
  res.send(cachedToolsAgeCalculatorHtml);
});

app.get("/tools/text-diff", scrapeGate, (req, res) => {
  res.send(cachedToolsTextDiffHtml);
});

app.get("/tools/find-replace", scrapeGate, (req, res) => {
  res.send(cachedToolsFindReplaceHtml);
});

app.get("/tools/csv-json", scrapeGate, (req, res) => {
  res.send(cachedToolsCsvJsonHtml);
});

app.get("/tools/number-to-words", scrapeGate, (req, res) => {
  res.send(cachedToolsNumberToWordsHtml);
});

app.get("/tools/morse-code", scrapeGate, (req, res) => {
  res.send(cachedToolsMorseCodeHtml);
});

app.get("/tools/percentage-calculator", scrapeGate, (req, res) => {
  res.send(cachedToolsPercentageCalculatorHtml);
});

app.get("/tools/bmi-calculator", scrapeGate, (req, res) => {
  res.send(cachedToolsBmiCalculatorHtml);
});

app.get("/tools/contrast-checker", scrapeGate, (req, res) => {
  res.send(cachedToolsContrastCheckerHtml);
});

app.get("/tools/markdown-preview", scrapeGate, (req, res) => {
  res.send(cachedToolsMarkdownPreviewHtml);
});

app.get("/tools/fake-data", scrapeGate, (req, res) => {
  res.send(cachedToolsFakeDataHtml);
});

app.get("/tools/text-encrypt", scrapeGate, (req, res) => {
  res.send(cachedToolsTextEncryptHtml);
});

app.get("/tools/typing-test", scrapeGate, (req, res) => {
  res.send(cachedToolsTypingTestHtml);
});

app.get("/tools/ip-lookup", scrapeGate, (req, res) => {
  res.send(cachedToolsIpLookupHtml);
});

app.get("/tools/http-headers", scrapeGate, (req, res) => {
  res.send(cachedToolsHttpHeadersHtml);
});

app.get("/tools/cron-explainer", scrapeGate, (req, res) => {
  res.send(cachedToolsCronExplainerHtml);
});

app.get("/tools/css-gradient", scrapeGate, (req, res) => {
  res.send(cachedToolsCssGradientHtml);
});

app.get("/tools/tip-calculator", scrapeGate, (req, res) => {
  res.send(cachedToolsTipCalculatorHtml);
});

app.get("/tools/random-quote", scrapeGate, (req, res) => {
  res.send(cachedToolsRandomQuoteHtml);
});

app.get("/tools/ascii-art", scrapeGate, (req, res) => {
  res.send(cachedToolsAsciiArtHtml);
});

app.get("/tools/yaml-json", scrapeGate, (req, res) => {
  res.send(cachedToolsYamlJsonHtml);
});

app.get("/tools/json-diff", scrapeGate, (req, res) => {
  res.send(cachedToolsJsonDiffHtml);
});

app.get("/tools/password-hash", scrapeGate, (req, res) => {
  res.send(cachedToolsPasswordHashHtml);
});

app.get("/tools/totp-tool", scrapeGate, (req, res) => {
  res.send(cachedToolsTotpToolHtml);
});

app.get("/tools/name-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsNameGeneratorHtml);
});

app.get("/tools/countdown-timer", scrapeGate, (req, res) => {
  res.send(cachedToolsCountdownTimerHtml);
});

app.get("/tools/minify-beautify", scrapeGate, (req, res) => {
  res.send(cachedToolsMinifyBeautifyHtml);
});

app.get("/tools/robots-txt", scrapeGate, (req, res) => {
  res.send(cachedToolsRobotsTxtHtml);
});

app.get("/tools/sitemap-xml", scrapeGate, (req, res) => {
  res.send(cachedToolsSitemapXmlHtml);
});

app.get("/tools/sql-format", scrapeGate, (req, res) => {
  res.send(cachedToolsSqlFormatHtml);
});

app.get("/tools/json-schema-validate", scrapeGate, (req, res) => {
  res.send(cachedToolsJsonSchemaValidateHtml);
});

app.get("/tools/favicon-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsFaviconGeneratorHtml);
});

app.get("/tools/meme-text", scrapeGate, (req, res) => {
  res.send(cachedToolsMemeTextHtml);
});

app.get("/tools/signature-generator", scrapeGate, (req, res) => {
  res.send(cachedToolsSignatureGeneratorHtml);
});

app.get("/tools/colorblind-simulator", scrapeGate, (req, res) => {
  res.send(cachedToolsColorblindSimulatorHtml);
});

app.get("/tools/api-tester", scrapeGate, (req, res) => {
  res.send(cachedToolsApiTesterHtml);
});

app.get("/tools/ws-tester", scrapeGate, (req, res) => {
  res.send(cachedToolsWsTesterHtml);
});

app.get("/tools/file-type-detector", scrapeGate, (req, res) => {
  res.send(cachedToolsFileTypeDetectorHtml);
});

app.get("/tools/speech-tools", scrapeGate, (req, res) => {
  res.send(cachedToolsSpeechToolsHtml);
});

app.get("/tools/qr-scanner", scrapeGate, (req, res) => {
  res.send(cachedToolsQrScannerHtml);
});

app.get("/tools/ocr-tool", scrapeGate, (req, res) => {
  res.send(cachedToolsOcrToolHtml);
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

app.post("/api/bots/deploy", requireAuth, requireSiteOrigin, botDeployLimiter, async (req, res) => {
  try {
    const isAdmin = isAdminEmail(req.userProfile?.email);
    if (!isAdmin && !req.userProfile?.verified) {
      return res.status(403).json({ error: "Deploy Bot is limited to verified accounts." });
    }
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
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/bots/${botId}/status?uid=${encodeURIComponent(req.uid)}`));
  } catch (err) {
    res.status(err.status || 404).json({ error: err.message || "Deployment not found." });
  }
});

app.post("/api/bots/:id/stop", requireAuth, botActionLimiter, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/bots/${botId}/stop`, {
      method: "POST", body: JSON.stringify({ uid: req.uid }),
    }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not stop deployment." });
  }
});

app.post("/api/bots/:id/restart", requireAuth, botActionLimiter, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/bots/${botId}/restart`, {
      method: "POST", body: JSON.stringify({ uid: req.uid }),
    }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not restart deployment." });
  }
});

app.delete("/api/bots/:id", requireAuth, botActionLimiter, async (req, res) => {
  try {
    const botId = botPathSegment(req.params.id);
    if (!botId) return res.status(404).json({ error: "Deployment not found." });
    res.json(await botServiceFetch(`/internal/bots/${botId}?uid=${encodeURIComponent(req.uid)}`, { method: "DELETE" }));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete deployment." });
  }
});

const CHANNEL_LINK_RE = /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9_-]{8,64}(?:\/\d{1,12})?$/;
const CHANNEL_REACT_DAILY_LIMIT = 3;

function normalizeChannelLink(raw) {
  const value = String(raw == null ? "" : raw).trim();
  if (!value || value.length > 300) return "";
  return CHANNEL_LINK_RE.test(value) ? value : "";
}

async function resolveServiceBot() {
  const pinned = String(process.env.CHANNEL_REACT_BOT_ID || "").trim();
  const snap = await db.collection("botDeployments").where("status", "==", "connected").get();

  const owned = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (pinned && doc.id === pinned) return { id: doc.id, uid: data.uid };
    const owner = await getUserProfile(data.uid).catch(() => null);
    if (isAdminEmail(owner?.email)) owned.push({ id: doc.id, uid: data.uid, createdAt: data.createdAt || 0 });
  }
  if (pinned) return null;

  owned.sort((a, b) => a.createdAt - b.createdAt);
  return owned[0] || null;
}

async function loadChannelBots(req) {
  const isAdmin = isAdminEmail(req.userProfile?.email);
  const data = await botServiceFetch(`/internal/bots?uid=${encodeURIComponent(req.uid)}`);
  const bots = (Array.isArray(data.bots) ? data.bots : []).map((bot) => ({
    id: bot.id,
    label: bot.label || "My Bot",
    phoneNumber: bot.phoneNumber || "",
    status: bot.status || "unknown",
    connected: bot.status === "connected",
  }));
  return { isAdmin, bots, relay: isAdmin && bots.length > 1 };
}

app.get("/api/channel/targets", requireAuth, botStatusLimiter, async (req, res) => {
  try {
    const profile = req.userProfile;
    const isAdmin = isAdminEmail(profile?.email);
    res.json({
      isAdmin,
      unlimited: !!(profile && (isAdminEmail(profile.email) || isVerificationActive(profile))),
      free: isAdmin,
      coinBalance: Number(profile?.coinBalance || 0),
      coinCost: CHANNEL_REACT_COIN_COST,
      dailyLimit: CHANNEL_REACT_DAILY_LIMIT,
      ready: true,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load your bots." });
  }
});

app.get("/api/channel/diagnose", requireAuth, botStatusLimiter, async (req, res) => {
  if (!isAdminEmail(req.userProfile?.email)) return res.status(403).json({ error: "Not authorized." });

  const steps = [];
  const add = (name, ok, detail) => steps.push({ name, ok, detail });

  if (!BOT_SERVICE_URL || !INTERNAL_API_KEY) {
    add("Bot service configured", false, "BOT_SERVICE_URL or INTERNAL_API_KEY is missing on this site.");
    return res.json({ ok: false, steps });
  }
  add("Bot service configured", true, "");

  let health;
  try {
    health = await fetch(`${BOT_SERVICE_URL}/internal/health`, { signal: AbortSignal.timeout(8000) });
    add("Bot service reachable", health.ok, health.ok ? "" : `Health check returned HTTP ${health.status}.`);
  } catch (err) {
    add("Bot service reachable", false, `Could not reach it: ${err.message}`);
    return res.json({ ok: false, steps });
  }

  try {
    const probe = await fetch(`${BOT_SERVICE_URL}/internal/bots/esteamsprobe/channel-react`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_API_KEY },
      body: JSON.stringify({ uid: "esteamsprobe", link: "https://whatsapp.com/channel/AAAAAAAA/1" }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await probe.text();
    const hasRoute = probe.status !== 404 || text.trim().startsWith("{");
    add(
      "Command route deployed",
      hasRoute,
      hasRoute
        ? ""
        : "The bot service is running older code. Redeploy the bot service on Railway so it picks up the channel-react route."
    );
    if (probe.status === 401) {
      add("Internal key matches", false, "The site's INTERNAL_API_KEY does not match the bot service's.");
    } else {
      add("Internal key matches", true, "");
    }

    if (hasRoute) {
      try {
        const ver = await fetch(`${BOT_SERVICE_URL}/internal/version`, {
          headers: { "x-internal-key": INTERNAL_API_KEY },
          signal: AbortSignal.timeout(8000),
        });
        const info = ver.ok ? await ver.json() : {};
        add(
          "Command bridge file present",
          !!info.commandBridge,
          info.commandBridge ? "" : "command-bridge.cjs is missing from the bot service build."
        );
      } catch {
        add("Command bridge file present", false, "Could not read the bot service version.");
      }
    }
  } catch (err) {
    add("Command route deployed", false, `Probe failed: ${err.message}`);
  }

  res.json({ ok: steps.every((s) => s.ok), steps });
});

async function notifyAdminOfCoinSpend(username, amount, label) {
  try {
    const adminUid = await getAdminUid();
    if (!adminUid) return;
    await addNotification(adminUid, "admin_coin_alert", `@${username || "A user"} paid ${amount} coins for ${label}`, { amount, label });
    await sendPushToUid(adminUid, {
      title: "ES TEAMS TV",
      body: `@${username || "A user"} paid +${amount} coins`,
      url: "/account",
      tag: "coin-alert-" + Date.now(),
    }).catch(() => {});
  } catch (err) {}
}

async function notifyAdminOfChannelReactRequest(username, link) {
  try {
    const adminUid = await getAdminUid();
    if (!adminUid) return;
    await addNotification(adminUid, "channel_react_request", `@${username || "A user"} requested a channel reaction`, { link });
    await sendPushToUid(adminUid, {
      title: "ES TEAMS TV",
      body: `@${username || "A user"} requested a channel reaction`,
      url: "/admin",
      tag: "channel-react-request-" + Date.now(),
    }).catch(() => {});
  } catch (err) {}
}

async function submitChannelReactRequest(req, link) {
  const profile = req.userProfile;
  const isAdmin = isAdminEmail(profile?.email);
  const verified = isVerificationActive(profile);
  let charged = 0;

  if (!isAdmin && !verified) {
    const quota = await checkAndIncrementDailyLimit(`tool:channel-react:${req.uid}`, CHANNEL_REACT_DAILY_LIMIT);
    if (!quota.allowed) {
      throw Object.assign(new Error(`You've used this tool ${CHANNEL_REACT_DAILY_LIMIT} times today. Verified accounts get unlimited use, otherwise, try again in 24 hours.`), { status: 429 });
    }
  }

  if (!isAdmin) {
    try {
      await spendCoins(req.uid, CHANNEL_REACT_COIN_COST, "channel-react");
      charged = CHANNEL_REACT_COIN_COST;
    } catch (coinErr) {
      throw Object.assign(new Error(coinErr.message || "Not enough coins."), { status: coinErr.status || 400 });
    }
  }

  await logChannelReactUse(req.uid, profile?.username, link, charged);
  notifyAdminOfChannelReactRequest(profile?.username, link).catch(() => {});

  if (charged) {
    await addNotification(req.uid, "coin_spend", `You were charge -${charged} coins for Reactions`, {
      tool: "channel-react",
    }).catch(() => {});
    notifyAdminOfCoinSpend(profile?.username, charged, "Channel Reactions").catch(() => {});
  }

  const after = await getUserProfile(req.uid).catch(() => null);
  return { charged, coinBalance: Number(after?.coinBalance || 0) };
}

app.post("/api/channel/react", requireAuth, requireSiteOrigin, channelReactLimiter, async (req, res) => {
  let charged = 0;
  try {
    if (!(await verifyCaptcha(req.body?.altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }

    const raw = String(req.body?.link || "").trim();
    if (!/^https:\/\/(?:www\.)?whatsapp\.com\/channel\//i.test(raw)) {
      return res.status(400).json({ error: "The link must start with https://whatsapp.com/channel/" });
    }
    const link = normalizeChannelLink(raw);
    if (!link || !/\/\d{1,12}$/.test(link)) {
      return res.status(400).json({ error: "That link is missing the post number at the end, like /5749." });
    }

    const result = await submitChannelReactRequest(req, link);
    charged = result.charged;
    res.json({
      ok: true,
      message: "Reaction request queued. It's usually confirmed within a few hours, and up to 6.",
      charged: result.charged,
      coinBalance: result.coinBalance,
    });
  } catch (err) {
    if (charged) await refundCoins(req.uid, charged).catch(() => {});
    console.error(`channel-react failed for ${req.uid}: ${err && err.stack ? err.stack : err}`);
    res.status(err.status || 500).json({ error: err.message || "Server error." });
  }
});

app.get("/api/channel-react/history", requireAuth, botStatusLimiter, async (req, res) => {
  try {
    res.json({ entries: await getChannelReactHistory(req.uid) });
  } catch (err) {
    console.error(`channel-react history failed for ${req.uid}: ${err && err.stack ? err.stack : err}`);
    res.status(500).json({ error: "Could not load your reaction history." });
  }
});

app.post("/api/channel-react/:id/resend", requireAuth, requireSiteOrigin, channelReactLimiter, async (req, res) => {
  let charged = 0;
  try {
    const history = await getChannelReactHistory(req.uid);
    const entry = history.find((e) => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "That reaction request was not found." });
    if (entry.status === "pending") {
      return res.status(409).json({ error: "That request is still pending. Wait for it to be confirmed or for it to expire before resending." });
    }

    const result = await submitChannelReactRequest(req, entry.link);
    charged = result.charged;
    res.json({
      ok: true,
      message: "Reaction request queued. It's usually confirmed within a few hours, and up to 6.",
      charged: result.charged,
      coinBalance: result.coinBalance,
    });
  } catch (err) {
    if (charged) await refundCoins(req.uid, charged).catch(() => {});
    res.status(err.status || 500).json({ error: err.message || "Could not resend that reaction." });
  }
});

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

app.post("/api/signup", requireSiteOrigin, signupLimiter, async (req, res) => {
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
    await issuePendingSignup({ firstName, lastName, email, username, password, referredByCode: req.cookies?.ref_code });
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
      if (!(await usernameFullyAvailable(username, { excludeEmail: email }))) {
        return res.status(400).json({ error: "That username was just taken. Please sign up again with a different username." });
      }
      const existingUser = await firebaseAuth.getUserByEmail(email).catch(() => null);
      let newUid;
      if (existingUser) {
        await firebaseAuth.updateUser(existingUser.uid, { password, displayName: `${firstName} ${lastName}` });
        await upsertUserProfile(existingUser.uid, { firstName, lastName, email, username, provider: "password" });
        newUid = existingUser.uid;
      } else {
        newUid = await createUserAccount({ firstName, lastName, email, password, username });
        await applyReferral(newUid, result.data.referredByCode);
      }
      await markEmailVerified(newUid);
      const customToken = await firebaseAuth.createCustomToken(newUid);
      res.clearCookie("ref_code");
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

    const { uid, isNew } = await createOrGetTelegramUser({
      id: claims.id,
      first_name: claims.given_name || (claims.name || "").split(" ")[0] || "",
      last_name: claims.family_name || (claims.name || "").split(" ").slice(1).join(" "),
      username: claims.preferred_username || "",
      photo_url: claims.picture || null,
    });
    if (isNew) await applyReferral(uid, req.cookies?.ref_code);
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.clearCookie("ref_code");
    res.redirect("/login?tg_token=" + encodeURIComponent(customToken));
  } catch (err) {
    console.error(err);
    res.redirect("/login?tg_error=" + encodeURIComponent("Could not sign in with Telegram."));
  }
});

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

    let email = ghUser.email || null;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers: ghHeaders });
      const emails = await emailsRes.json().catch(() => null);
      if (Array.isArray(emails)) {
        const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
        email = primary ? primary.email : null;
      }
    }

    const { uid, isNew } = await createOrGetGithubUser({
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name,
      email,
      avatar_url: ghUser.avatar_url,
    });
    if (isNew) await applyReferral(uid, req.cookies?.ref_code);
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.clearCookie("ref_code");
    res.redirect("/login?gh_token=" + encodeURIComponent(customToken));
  } catch (err) {
    console.error(err);
    res.redirect("/login?gh_error=" + encodeURIComponent("Could not sign in with GitHub."));
  }
});

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

app.post("/api/session", requireSiteOrigin, passwordLoginLimiter, async (req, res) => {
  try {
    const { idToken, remember, altcha } = req.body;
    const decoded = await withDeadline(firebaseAuth.verifyIdToken(idToken), "firebaseAuth.verifyIdToken");
    if (req.body && req.body.privateMode === true && !/^(1|true|yes)$/i.test(String(process.env.ALLOW_PRIVATE_BROWSING || process.env.ALLOW_PRIVATE_LOGIN || ""))) {
      return res.status(403).json({ code: "private-mode", error: "Private browsing detected. Open this page in a normal browser window to log in." });
    }
    const deviceBlock = await enforceLoginDevice(req, decoded.uid);
    if (deviceBlock) return res.status(deviceBlock.status).json(deviceBlock.body);
    if (decoded.firebase.sign_in_provider === "google.com") {
      const googleResult = await withDeadline(ensureGoogleUserProfile(decoded), "ensureGoogleUserProfile");
      if (googleResult.isNew) {
        await applyReferral(decoded.uid, req.cookies?.ref_code);
        res.clearCookie("ref_code");
      }
    } else if (decoded.firebase.sign_in_provider === "password" && !(await verifyCaptcha(altcha))) {
      return res.status(400).json({ error: "Captcha not completed." });
    }
    const profile = await withDeadline(getUserProfile(decoded.uid), "getUserProfile");
    if (profile?.banned) {
      return res.status(403).json({ error: "This account has been deactivated." });
    }
    if (profile?.pendingDeletion) {
      return res.status(403).json({ error: "This account is scheduled for deletion." });
    }
    if (profile?.twoFactorEnabled) {
      const pendingToken = await withDeadline(issueTwoFactorPendingLogin(decoded.uid, remember), "issueTwoFactorPendingLogin");
      return res.json({ requires2FA: true, pendingToken });
    }
    const login = await withDeadline(createDeviceSession(decoded.uid, req, res), "createSession");
    res.cookie("session", login.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      ...((remember || login.trusted) ? { maxAge: login.maxAge } : {}),
    });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthOpTimeout) {
      console.error(`[/api/session] backend stalled: ${err.message}`);
      return res.status(503).json({
        error: `Sign-in is temporarily unavailable (${err.label} timed out). Please try again shortly.`,
      });
    }
    console.error("[/api/session] failed:", err);
    res.status(401).json({ error: "Could not sign in." });
  }
});

app.post("/api/session/exchange", requireSiteOrigin, authExchangeLimiter, async (req, res) => {
  try {
    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Sign-in relay isn't configured." });
    }
    const { type, customToken, googleCredential, email, password } = req.body || {};

    let endpoint, payload;
    if (type === "customToken") {
      if (!customToken || typeof customToken !== "string") {
        return res.status(400).json({ error: "Missing token." });
      }
      endpoint = "signInWithCustomToken";
      payload = { token: customToken, returnSecureToken: true };
    } else if (type === "googleCredential") {
      if (!googleCredential || typeof googleCredential !== "string") {
        return res.status(400).json({ error: "Missing credential." });
      }
      endpoint = "signInWithIdp";
      payload = {
        postBody: `id_token=${encodeURIComponent(googleCredential)}&providerId=google.com`,
        requestUri: `${siteOrigin()}/login`,
        returnSecureToken: true,
      };
    } else if (type === "password") {
      if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        return res.status(400).json({ error: "Missing email or password." });
      }
      endpoint = "signInWithPassword";
      payload = { email, password, returnSecureToken: true };
    } else {
      return res.status(400).json({ error: "Unsupported exchange type." });
    }

    const upstream = await withDeadline(
      fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${endpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      "identitytoolkit." + endpoint,
      15000
    );
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.idToken) {
      const code = data?.error?.message || "";
      if (type === "password" && /INVALID_PASSWORD|EMAIL_NOT_FOUND|INVALID_LOGIN_CREDENTIALS/.test(code)) {
        return res.status(400).json({ error: "auth/invalid-credential" });
      }
      if (type === "password" && /USER_DISABLED/.test(code)) {
        return res.status(400).json({ error: "auth/user-disabled" });
      }
      return res.status(400).json({ error: code || "Could not complete sign-in." });
    }
    res.json({ idToken: data.idToken });
  } catch (err) {
    if (err instanceof AuthOpTimeout) {
      return res.status(503).json({ error: "Sign-in relay is temporarily unavailable. Please try again shortly." });
    }
    console.error("[/api/session/exchange] failed:", err);
    res.status(502).json({ error: "Sign-in relay is temporarily unavailable. Please try again shortly." });
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
    const login = await createDeviceSession(pending.uid, req, res);
    res.cookie("session", login.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      ...((pending.remember || login.trusted) ? { maxAge: login.maxAge } : {}),
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
      readReceipts: profile.readReceipts !== false,
      followersVisibility: ["friends", "only_me"].includes(profile.followersVisibility) ? profile.followersVisibility : "everyone",
      followingVisibility: ["friends", "only_me"].includes(profile.followingVisibility) ? profile.followingVisibility : "everyone",
      bio: profile.bio || "",
      verified: isVerificationActive(profile),
      verifiedAt: profile.verifiedAt || null,
      verifiedExpiresAt: profile.verifiedExpiresAt || null,
      apiPlan: (() => {
        const planKey = getEffectiveApiPlan(profile);
        const plan = API_PLANS[planKey];
        let expiresAt = null;
        if (planKey === "starter") expiresAt = profile.verifiedExpiresAt || null;
        else if (planKey !== "free") expiresAt = profile.apiPlanExpiresAt || null;
        return { key: planKey, name: plan.name, apiKeys: plan.apiKeys, streamHours: plan.streamHours, watermark: plan.watermark, customVisitPage: plan.customVisitPage, expiresAt };
      })(),
      customVisitPageUrl: profile.customVisitPageUrl || "",
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

app.get("/api/users/:username/public", optionalAuth, async (req, res) => {
  try {
    const user = await findUserByUsername(String(req.params.username || "").toLowerCase());
    if (!user || user.pendingDeletion) return res.status(404).json({ error: "User not found." });
    const isSelf = user.uid === req.uid;
    const [stats, following, followedBack] = await Promise.all([
      getFollowStats(user.uid),
      isFollowing(req.uid, user.uid),
      isFollowing(user.uid, req.uid),
    ]);
    if (!isSelf && req.uid) {
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
      verified: isVerificationActive(user),
      isSelf,
      isViewerLoggedIn: !!req.uid,
      isFollowing: following,
      followsYou: followedBack,
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

app.get("/api/notifications/unread", requireAuth, notifPollLimiter, async (req, res) => {
  try {
    const count = await countUnreadNotifications(req.uid);
    res.json({ hasUnread: count > 0, count });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check notifications." });
  }
});

const communityChatLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.uid, "You're sending messages too fast. Slow down.").middleware();

app.get("/api/community/messages", requireAuth, async (req, res) => {
  try {
    const messages = await getCommunityMessages(req.uid);
    res.json({ name: COMMUNITY_CHAT_NAME, messages, myUid: req.uid });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not load the community chat." });
  }
});

app.post("/api/community/messages", requireAuth, communityChatLimiter, async (req, res) => {
  try {
    const message = await sendCommunityMessage(req.uid, req.body?.text, req.body?.attachment, req.body?.replyTo);
    res.json({ message });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not send that message." });
  }
});

app.delete("/api/community/messages/:id", requireAuth, async (req, res) => {
  try {
    await deleteCommunityMessage(req.uid, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that message." });
  }
});

app.get("/api/support/messages", requireAuth, async (req, res) => {
  try {
    res.json({ messages: await getSupportMessages(req.uid, false) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load your chat." });
  }
});

app.post("/api/support/messages", requireAuth, async (req, res) => {
  try {
    const message = await sendSupportMessage(req.uid, req.body?.text, false, req.body?.attachment, req.body?.replyTo);
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not send that message." });
  }
});

app.post("/api/support/messages/:messageId/edit", requireAuth, async (req, res) => {
  try {
    const result = await editSupportMessage(req.uid, req.params.messageId, false, req.body?.text);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not edit that message." });
  }
});

app.post("/api/support/messages/:messageId/delete", requireAuth, async (req, res) => {
  try {
    const result = await deleteSupportMessage(req.uid, req.params.messageId, false);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message || "Could not delete that message." });
  }
});

app.get("/api/support/unread", requireAuth, notifPollLimiter, async (req, res) => {
  try {
    const isAdmin = isAdminEmail(req.userProfile?.email);
    const count = isAdmin ? await getSupportUnreadCountForAdmin() : await getSupportUnreadCountForUser(req.uid);
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not check customer care unread count." });
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
    if (!photoDataUrl || !validateImageDataUrl(photoDataUrl, 900 * 1024)) {
      return res.status(400).json({ error: "Please upload a valid image." });
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

app.post("/api/posts/:postId/pin", requireAuth, async (req, res) => {
  try {
    const result = await togglePinPost(req.uid, req.params.postId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not update that post." });
  }
});

app.post("/api/account/recalculate-likes", requireAuth, async (req, res) => {
  try {
    const result = await recalculateUserLikesCount(req.uid);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not recalculate your likes total." });
  }
});

app.get("/api/feed/following", requireAuth, async (req, res) => {
  try {
    const posts = await getFollowingFeed(req.uid, { limit: 20, markSeen: true });
    res.json({ posts });
  } catch (err) {
    console.error("following feed error:", err.message);
    res.status(400).json({ error: "Could not load your feed." });
  }
});

app.get("/api/feed/discover", requireAuth, async (req, res) => {
  try {
    const before = Number(req.query.before) || null;
    res.set("Cache-Control", "no-store");
    res.json(await getDiscoverFeed(req.uid, { limit: 12, before }));
  } catch (err) {
    console.error(`discover feed failed: ${err && err.stack ? err.stack : err}`);
    res.status(400).json({ error: "Could not load posts." });
  }
});

app.get("/api/users/suggested", requireAuth, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({ results: await getSuggestedUsers(req.uid, 6) });
  } catch (err) {
    console.error(`suggested users failed: ${err && err.stack ? err.stack : err}`);
    res.json({ results: [] });
  }
});

app.get("/api/posts/:postId/image", requireAuth, async (req, res) => {
  try {
    const image = await getPostImage(req.uid, req.params.postId);
    if (!image) return res.status(404).end();
    res.set({ "Content-Type": image.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" });
    res.send(image.buffer);
  } catch (err) {
    res.status(404).end();
  }
});

app.get("/api/feed/following/unseen-count", requireAuth, notifPollLimiter, async (req, res) => {
  try {
    const count = await getFollowingFeedUnseenCount(req.uid, req.userProfile);
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
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

app.post("/api/account/confirm-email", requireAuth, emailCodeLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await checkCode(req.uid, "add_email", code);
    if (!result.ok) {
      const messages = { expired: "Code expired. Request a new one.", mismatch: "Incorrect code.", not_found: "Code expired. Request a new one." };
      return res.status(400).json({ error: messages[result.reason] || "Invalid code." });
    }
    const email = result.email;
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

const PASSKEY_RP_ID = "esteamstv.devs.surf";
const PASSKEY_ORIGIN = "https://esteamstv.devs.surf";

app.get("/api/passkey/list", requireAuth, async (req, res) => {
  try {
    const [passkeys, maxPasskeys] = await Promise.all([
      getPasskeysForUser(req.uid),
      getMaxPasskeysForUser(req.uid),
    ]);
    res.json({
      passkeys: passkeys.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
      maxPasskeys,
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

app.get("/api/facescan/status", requireAuth, async (req, res) => {
  try {
    const scan = await getFaceScanForUser(req.uid);
    res.json({ enabled: !!scan, createdAt: scan?.createdAt || null });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check Face Scan status." });
  }
});

app.post("/api/facescan/enroll", requireAuth, async (req, res) => {
  try {
    const { descriptor, snapshot } = req.body || {};
    await enrollFaceScan(req.uid, descriptor, snapshot);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not set up Face Scan." });
  }
});

app.post("/api/facescan/remove", requireAuth, async (req, res) => {
  try {
    await removeFaceScan(req.uid);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || "Could not remove Face Scan." });
  }
});

app.post("/api/facescan/verify", facescanVerifyLimiter, async (req, res) => {
  try {
    const { descriptor } = req.body || {};
    const uid = await matchFaceScan(descriptor);
    const customToken = await firebaseAuth.createCustomToken(uid);
    res.json({ customToken });
  } catch (err) {
    console.error("[facescan-verify]", err.stack || err);
    const code = err.code || "";
    if (code === "facescan/not-found") {
      return res.status(404).json({
        error: "Face not recognized. Move somewhere brighter, hold the phone at eye level, and try again.",
      });
    }
    if (code === "facescan/none-enrolled" || code === "facescan/ambiguous") {
      return res.status(code === "facescan/none-enrolled" ? 404 : 400).json({ error: err.message });
    }
    res.status(400).json({ error: err.message || "Could not verify face scan." });
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

app.post("/api/confirm-account-deletion", requireAuth, emailCodeLimiter, async (req, res) => {
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

const USER_SWEEP_MIN_GAP_MS = 24 * 60 * 60 * 1000;
const userSweepStateRef = db.collection("_system").doc("userSweepState");

async function shouldRunUserSweepNow() {
  try {
    const snap = await userSweepStateRef.get();
    const lastRunAt = snap.exists ? snap.data().lastRunAt : null;
    return !lastRunAt || Date.now() - lastRunAt >= USER_SWEEP_MIN_GAP_MS;
  } catch (err) {
    return true;
  }
}

async function markUserSweepRan() {
  await userSweepStateRef.set({ lastRunAt: Date.now() }).catch(() => {});
}

async function runUserSweepIfDue() {
  if (!(await shouldRunUserSweepNow())) return;
  await markUserSweepRan();
  sweepOrphanedUsers().catch((err) => console.error("Orphaned user sweep failed:", err));
}

runUserSweepIfDue();
setInterval(runUserSweepIfDue, 60 * 60 * 1000);

sweepExpiredSupportMessages().catch((err) => console.error("Support message sweep failed:", err));
setInterval(() => {
  sweepExpiredSupportMessages().catch((err) => console.error("Support message sweep failed:", err));
}, 30 * 60 * 1000);

setInterval(() => {
  growAdminFollowerCount().catch((err) => console.error("Admin follower growth failed:", err));
}, 60 * 60 * 1000);

const RENEWAL_SWEEP_MS = 60 * 60 * 1000;
function sweepSubscriptionRenewals() {
  return runSubscriptionRenewals(chargeAuthorization);
}
setTimeout(() => {
  sweepSubscriptionRenewals().catch((err) => console.error("Auto-renew sweep failed:", err));
}, 60 * 1000);
setInterval(() => {
  sweepSubscriptionRenewals().catch((err) => console.error("Auto-renew sweep failed:", err));
}, RENEWAL_SWEEP_MS);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, function () {
  console.log("ES TEAMS TV running on port " + PORT);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 120000;

let shuttingDown = false;
function shutdown(signal, code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, finishing in-flight requests before exit.`);
  const force = setTimeout(() => {
    console.error("Shutdown timed out, exiting now.");
    process.exit(code || 1);
  }, 15000);
  force.unref();
  server.closeIdleConnections?.();
  server.close(async () => {
    await flushCompletedDays(true).catch(() => {});
    await flushAdStats().catch(() => {});
    clearTimeout(force);
    console.log("ES TEAMS TV stopped cleanly.");
    process.exit(code);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  checkQuotaError(reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  checkQuotaError(err);
  shutdown("uncaughtException", 1);
});
