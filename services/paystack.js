import crypto from "crypto";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const PAYSTACK_BASE = "https://api.paystack.co";

export const VERIFICATION_PRICE_NGN = 1500;
export const VERIFICATION_DAYS = 30;

async function paystackRequest(method, endpoint, body) {
  if (!PAYSTACK_SECRET_KEY) {
    throw Object.assign(new Error("Payments are not configured."), { status: 503 });
  }
  const res = await fetch(`${PAYSTACK_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.message || "Paystack request failed.");
  }
  return data.data;
}

export async function initializeTransaction({ email, amountKobo, metadata }) {
  return paystackRequest("POST", "/transaction/initialize", {
    email,
    amount: amountKobo,
    currency: "NGN",
    metadata,
  });
}

export async function verifyTransaction(reference) {
  return paystackRequest("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody || !PAYSTACK_SECRET_KEY) return false;
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
