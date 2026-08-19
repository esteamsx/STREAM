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

export async function chargeAuthorization({ email, amountKobo, authorizationCode, metadata }) {
  return paystackRequest("POST", "/transaction/charge_authorization", {
    email,
    amount: amountKobo,
    authorization_code: authorizationCode,
    currency: "NGN",
    metadata,
  });
}

const BANK_NAME_STOPWORDS = ["bank", "plc", "nigeria", "limited", "ltd", "microfinance", "mfb", "digital", "services", "the", "of", "company", "and"];
function normalizeBankName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !BANK_NAME_STOPWORDS.includes(w))
    .join(" ")
    .trim();
}

let bankListCache = null;
let bankListCacheAt = 0;
const BANK_LIST_TTL_MS = 6 * 60 * 60 * 1000;

export async function listBanks() {
  if (bankListCache && Date.now() - bankListCacheAt < BANK_LIST_TTL_MS) return bankListCache;
  const data = await paystackRequest("GET", "/bank?country=nigeria&currency=NGN&perPage=100");
  bankListCache = data;
  bankListCacheAt = Date.now();
  return data;
}

export async function findBankCode(bankName) {
  const banks = await listBanks();
  const target = normalizeBankName(bankName);
  if (!target) return null;
  let match = banks.find((b) => normalizeBankName(b.name) === target);
  if (!match) {
    match = banks.find((b) => {
      const n = normalizeBankName(b.name);
      return n && (n.includes(target) || target.includes(n));
    });
  }
  return match ? match.code : null;
}

export async function resolveAccountNumber(accountNumber, bankCode) {
  return paystackRequest("GET", `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !rawBody || !PAYSTACK_SECRET_KEY) return false;
  const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
