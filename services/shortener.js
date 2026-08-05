import { db } from "../config/firebase.js";
import crypto from "crypto";

const CODE_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;
const MAX_ATTEMPTS = 5;

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  return code;
}

export async function createShortLink(uid, rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw Object.assign(new Error("Enter a valid http:// or https:// URL."), { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw Object.assign(new Error("Enter a valid http:// or https:// URL."), { status: 400 });
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const ref = db.collection("shortLinks").doc(code);
    const snap = await ref.get();
    if (snap.exists) continue;
    await ref.set({ url: parsed.toString(), uid, createdAt: Date.now(), clicks: 0 });
    return code;
  }
  throw Object.assign(new Error("Could not generate a short link right now, try again."), { status: 500 });
}

export async function resolveShortLink(code) {
  const ref = db.collection("shortLinks").doc(code);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data();
  ref.update({ clicks: (data.clicks || 0) + 1, lastVisitedAt: Date.now() }).catch(() => {});
  return data.url;
}
