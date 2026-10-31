import { db } from "../config/firebase.js";
import { extractTextFromImageBuffer } from "./ocr.js";

export const PROMOTION_THRESHOLDS = Object.freeze({ allow: 70, review: 90 });

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>()]+/gi;
const REFERRAL_RE = /(?:[?&](?:ref|referral|invite|affiliate|aff|code|coupon|promo|via)=|\b(?:referral|affiliate|invite|promo)\s*(?:code|link)?\b)/i;
const SHORTENER_RE = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|cutt\.ly|is\.gd|buff\.ly|lnkd\.in)\b/i;
const EXTERNAL_PLATFORM_RE = /\b(?:telegram|whatsapp|signal|discord|instagram|tiktok|youtube|facebook|twitter|x\.com|snapchat)\b/i;
const CTA_RE = /\b(?:buy|order|shop|subscribe|join|register|sign\s*up|click|tap|visit|dm|message|contact|call|text|send|claim|book|download|apply|use\s+my)\b/i;
const PROMO_RE = /\b(?:ad(?:s|vert(?:ise|isement|ising|ed)?)?|sponsor(?:ed|ship)?|promotion(?:al)?|affiliate|sale|discount|deal|offer|coupon|voucher|giveaway|limited\s*time|special\s*price|free\s*trial|delivery|available\s*now|guaranteed|instant)\b/i;
const PRICE_RE = /(?:[$€£₦]\s*[\d,.]+|\b\d+[,.]?\d*\s*(?:ngn|naira|usd|dollars?|euros?|pounds?|kobo)\b|\b\d+%\s*off\b)/i;
const CONTACT_RE = /(?:\+?\d[\d\s().-]{7,}\d|@[a-z\d_]{3,}|\b(?:whatsapp|telegram)\s*(?:me|us|number|channel)\b)/i;
const REDIRECT_RE = /\b(?:link\s*in\s*bio|link\s*below|click\s*(?:here|the\s*link)|redirect|go\s*to|follow\s*the\s*link|send\s*proof|use\s*my\s*link)\b/i;

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function analyzeTextSignals(text, source = "post text") {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return { score: 0, reasons: [], signals: 0 };
  const reasons = [];
  let score = 0;
  const urls = value.match(URL_RE) || [];
  if (urls.length) { score += 35; reasons.push(`${source} contains an external link`); }
  if (REFERRAL_RE.test(value)) { score += 25; reasons.push(`${source} contains a referral, affiliate, or promo-code signal`); }
  if (SHORTENER_RE.test(value)) { score += 18; reasons.push(`${source} contains a link-shortener domain`); }
  if (EXTERNAL_PLATFORM_RE.test(value) && (urls.length || CTA_RE.test(value) || CONTACT_RE.test(value))) {
    score += 20; reasons.push(`${source} directs users to an external platform`);
  }
  if (PROMO_RE.test(value)) { score += 25; reasons.push(`${source} contains advertising or sales language`); }
  if (CTA_RE.test(value)) { score += 18; reasons.push(`${source} contains a call to action`); }
  if (PRICE_RE.test(value)) { score += 16; reasons.push(`${source} contains pricing, discount, or currency language`); }
  if (CONTACT_RE.test(value)) { score += 14; reasons.push(`${source} contains promotional contact details`); }
  if (REDIRECT_RE.test(value)) { score += 22; reasons.push(`${source} attempts to redirect users`); }
  if (urls.length && (CTA_RE.test(value) || PROMO_RE.test(value))) score += 18;
  if (PROMO_RE.test(value) && (PRICE_RE.test(value) || CONTACT_RE.test(value))) score += 15;
  if (value.length < 280 && /!{2,}|\b(?:hurry|act\s+now|don't\s+miss)\b/i.test(value)) score += 8;
  return { score: Math.min(100, score), reasons: unique(reasons), signals: reasons.length };
}

export async function analyzePromotionalContent({ text = "", imageDataUrl = null } = {}) {
  const textResult = analyzeTextSignals(text);
  let score = textResult.score;
  const reasons = [...textResult.reasons];
  let imageAnalysis = { status: "not_provided", text: "", confidence: null };

  if (imageDataUrl) {
    const match = /^data:image\/(?:png|jpe?g|webp|gif);base64,([A-Za-z0-9+/=]+)$/i.exec(String(imageDataUrl));
    if (!match) {
      imageAnalysis = { status: "unsupported", text: "", confidence: null };
      reasons.push("Attached image could not be inspected by the local OCR gate");
      score += 8;
    } else {
      try {
        const result = await extractTextFromImageBuffer(Buffer.from(match[1], "base64"));
        imageAnalysis = { status: "complete", text: result.text || "", confidence: Number.isFinite(result.confidence) ? result.confidence : null };
        const imageResult = analyzeTextSignals(result.text, "image OCR text");
        score += Math.round(imageResult.score * 0.8);
        reasons.push(...imageResult.reasons);
        if (result.text && result.confidence < 45) reasons.push("Image OCR confidence is low; manual review is recommended when other signals exist");
      } catch (err) {
        imageAnalysis = { status: "unavailable", text: "", confidence: null, error: String(err?.message || "OCR unavailable").slice(0, 160) };
        reasons.push("Local image OCR was unavailable; image-only promotions may need manual review");
        score += 10;
      }
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  const status = finalScore >= PROMOTION_THRESHOLDS.review ? "blocked" : finalScore >= PROMOTION_THRESHOLDS.allow ? "review" : "allow";
  return { score: finalScore, status, reasons: unique(reasons).slice(0, 12), imageAnalysis };
}

export async function listPromotionalReviews() {
  const snap = await db.collection("posts").limit(500).get();
  const rows = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((post) => post.moderationStatus === "review" || post.moderationStatus === "blocked")
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    .slice(0, 100);
  const uids = [...new Set(rows.map((post) => post.uid).filter(Boolean))];
  const users = new Map();
  for (let i = 0; i < uids.length; i += 300) {
    const refs = uids.slice(i, i + 300).map((uid) => db.collection("users").doc(uid));
    (await db.getAll(...refs)).forEach((doc) => { if (doc.exists) users.set(doc.id, doc.data()); });
  }
  return rows.map((post) => {
    const user = users.get(post.uid) || {};
    return {
      id: post.id,
      uid: post.uid,
      username: user.username || "",
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username || "Unknown user",
      text: post.text || "",
      imageDataUrl: post.imageDataUrl || null,
      score: Number(post.moderationScore || 0),
      status: post.moderationStatus,
      reasons: Array.isArray(post.moderationReasons) ? post.moderationReasons : [],
      imageAnalysis: post.moderationImageAnalysis || null,
      createdAt: post.createdAt || 0,
    };
  });
}

export async function decidePromotionalReview(postId, decision, adminUid) {
  const next = decision === "allow" ? "allow" : decision === "block" ? "blocked" : null;
  if (!next) throw Object.assign(new Error("Decision must be allow or block."), { status: 400 });
  const ref = db.collection("posts").doc(String(postId || ""));
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error("Post not found."), { status: 404 });
  await ref.update({ moderationStatus: next, moderationReviewedAt: Date.now(), moderationReviewedBy: adminUid || null });
  return { id: ref.id, moderationStatus: next };
}
