const BASE_URL = "https://snapvideotools.com";
const HEADERS = {
  "Content-Type": "application/json",
  Origin: BASE_URL,
  Referer: `${BASE_URL}/id/capcut-downloader`,
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
  "Sec-Ch-Ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?1",
  "Sec-Ch-Ua-Platform": '"Android"',
  "X-Requested-With": "XMLHttpRequest",
};

function providerFailure(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const flagged = data.success === false || data.ok === false || data.status === false || /^(error|fail|failed)$/i.test(String(data.status || ""));
  const text = typeof data.error === "string" ? data.error : typeof data.message === "string" && flagged ? data.message : "";
  if (flagged || (text && !data.data && !data.video && !data.url && !data.medias && !data.result)) return text || "The CapCut service could not read that link.";
  return null;
}

export async function resolveCapcut(url) {
  const input = String(url || "").trim();
  if (!/^https?:\/\//i.test(input)) throw Object.assign(new Error("URL is required."), { status: 400 });
  let host = "";
  try { host = new URL(input).hostname; } catch { throw Object.assign(new Error("That is not a valid URL."), { status: 400 }); }
  if (!/capcut\./i.test(host)) throw Object.assign(new Error("That is not a CapCut link. Use a public CapCut template share link."), { status: 400 });

  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`${BASE_URL}/id/api/snap`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ text: input }),
        signal: controller.signal,
      });
      const raw = await response.text().catch(() => "");
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
      if (!response.ok) {
        console.warn(`[capcut] provider answered ${response.status}: ${raw.slice(0, 300).replace(/\s+/g, " ")}`);
        const message = data?.message || data?.error || `CapCut service responded ${response.status}.`;
        const failure = Object.assign(new Error(message), { status: 502 });
        if (response.status >= 500 && attempt === 0) { lastError = failure; await new Promise((resolve) => setTimeout(resolve, 600)); continue; }
        throw failure;
      }
      if (!data) {
        console.warn(`[capcut] provider sent a non-JSON answer: ${raw.slice(0, 300).replace(/\s+/g, " ")}`);
        throw Object.assign(new Error("CapCut service returned an empty response."), { status: 502 });
      }
      const failed = providerFailure(data);
      if (failed) throw Object.assign(new Error(String(failed).slice(0, 200)), { status: 502 });
      return data;
    } catch (error) {
      if (error.status) throw error;
      lastError = Object.assign(new Error(error?.name === "AbortError" ? "The CapCut service took too long to answer." : (error?.message || "Could not reach the CapCut service.")), { status: 502 });
      if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 600)); continue; }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || Object.assign(new Error("Could not reach the CapCut service."), { status: 502 });
}
