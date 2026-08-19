import crypto from "crypto";

const FETCH_TIMEOUT_MS = 15000;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; ESTeamsTV/1.0; +https://esteamstv.devs.surf)",
};

export function generatePassword(length, options) {
  const len = Math.min(Math.max(Number(length) || 16, 4), 128);
  const useUpper = options.upper !== false;
  const useLower = options.lower !== false;
  const useNumbers = options.numbers !== false;
  const useSymbols = options.symbols === true;

  let charset = "";
  if (useLower) charset += "abcdefghijklmnopqrstuvwxyz";
  if (useUpper) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (useNumbers) charset += "0123456789";
  if (useSymbols) charset += "!@#$%^&*()-_=+[]{}";

  if (!charset) charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  const bytes = crypto.randomBytes(len);
  let password = "";
  for (let i = 0; i < len; i++) {
    password += charset[bytes[i] % charset.length];
  }

  return { password, length: len };
}

export function encodeBase64(text) {
  return { input: text, result: Buffer.from(text, "utf8").toString("base64") };
}

export function decodeBase64(text) {
  try {
    return { input: text, result: Buffer.from(text, "base64").toString("utf8") };
  } catch {
    throw Object.assign(new Error("That is not valid base64."), { status: 400 });
  }
}

export function hashText(text, algorithm) {
  const algo = String(algorithm || "sha256").toLowerCase();
  const allowed = ["md5", "sha1", "sha256", "sha512"];
  if (!allowed.includes(algo)) {
    throw Object.assign(new Error(`Unsupported algorithm. Use one of: ${allowed.join(", ")}.`), { status: 400 });
  }
  const result = crypto.createHash(algo).update(text, "utf8").digest("hex");
  return { input: text, algorithm: algo, result };
}

export async function translateText(text, from, to) {
  const source = String(from || "auto").trim() || "auto";
  const target = String(to || "").trim();
  if (!target) throw Object.assign(new Error("Missing target language."), { status: 400 });

  const langpair = `${source}|${target}`;
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl, { signal: controller.signal, headers: { ...REQUEST_HEADERS, Accept: "application/json" } });
    if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || data?.responseStatus >= 400) {
      throw Object.assign(new Error("Could not translate that text. Check the language codes and try again."), { status: 502 });
    }
    return { input: text, from: source, to: target, result: translated };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the translation provider right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function captureScreenshot(url) {
  let parsed;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    throw Object.assign(new Error("Please pass a valid http(s) url."), { status: 400 });
  }

  const shotUrl = `https://image.thum.io/get/width/1280/crop/800/noanimate/${parsed.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(shotUrl, { signal: controller.signal, headers: REQUEST_HEADERS });
    if (!res.ok) throw Object.assign(new Error(`Upstream responded ${res.status}.`), { status: 502 });
    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType };
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not capture that screenshot right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
