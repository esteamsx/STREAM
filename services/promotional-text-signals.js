const URL_RE = /(?:https?:\/\/|www\.)[^\s<>()]+/gi;
const REFERRAL_RE = /(?:[?&](?:ref|referral|invite|affiliate|aff|code|coupon|promo|via)=|\b(?:referral|affiliate|invite|promo)\s*(?:code|link)?\b)/i;
const SHORTENER_RE = /\b(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|cutt\.ly|is\.gd|buff\.ly|lnkd\.in)\b/i;
const EXTERNAL_PLATFORM_RE = /\b(?:telegram|whatsapp|signal|discord|instagram|tiktok|youtube|facebook|twitter|x\.com|snapchat)\b/i;
const CTA_RE = /\b(?:buy|order|shop|subscribe|join|register|sign\s*up|click|tap|visit|dm|message|contact|call|text|send|claim|book|download|apply|use\s+my)\b/i;
const PROMO_RE = /\b(?:ad(?:s|vert(?:ise|isement|ising|ed)?)?|sponsor(?:ed|ship)?|promotion(?:al)?|affiliate|sale|discount|deal|offer|coupon|voucher|giveaway|limited\s*time|special\s*price|free\s*trial|delivery|available\s*now|guaranteed|instant)\b/i;
const PRICE_RE = /(?:[$€£₦]\s*[\d,.]+|\b\d+[,.]?\d*\s*(?:ngn|naira|usd|dollars?|euros?|pounds?|kobo)\b|\b\d+%\s*off\b)/i;
const CONTACT_RE = /(?:\+?\d[\d\s().-]{7,}\d|@[a-z\d_]{3,}|\b(?:whatsapp|telegram)\s*(?:me|us|number|channel)\b)/i;
const REDIRECT_RE = /\b(?:link\s*in\s*bio|link\s*below|click\s*(?:here|the\s*link)|redirect|go\s*to|follow\s*the\s*link|send\s*proof|use\s*my\s*link)\b/i;

export function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function analyzePromotionalText(text, source = "post text") {
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

export function legacyTextLooksPromotional(text) {
  return analyzePromotionalText(text).score >= 70;
}
