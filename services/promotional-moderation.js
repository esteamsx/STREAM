import { db } from "../config/firebase.js";
import { extractTextFromImageBuffer } from "./ocr.js";
import { analyzePromotionalText, legacyTextLooksPromotional, unique } from "./promotional-text-signals.js";

export const PROMOTION_THRESHOLDS = Object.freeze({ allow: 70, review: 90 });
const ADMIN_EMAIL = "etimpaschal95@gmail.com";

const analyzeTextSignals = analyzePromotionalText;
export { legacyTextLooksPromotional };

export async function blockLegacyPromotionalPost(post) {
  if (!post || post.moderationStatus || !legacyTextLooksPromotional(post.text)) return false;
  const result = analyzeTextSignals(post.text);
  const ref = db.collection("posts").doc(String(post.id || ""));
  await ref.set({
    moderationStatus: "blocked",
    moderationScore: result.score,
    moderationReasons: result.reasons,
    moderationImageAnalysis: { status: "not_checked_legacy_text_block" },
    moderationAt: Date.now(),
  }, { merge: true }).catch(() => {});
  return true;
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
  return rows.filter((post) => {
    const user = users.get(post.uid) || {};
    const verified = !!user.verified && (!user.verifiedExpiresAt || Date.now() < Number(user.verifiedExpiresAt));
    return String(user.email || "").trim().toLowerCase() !== ADMIN_EMAIL && !verified;
  }).map((post) => {
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
