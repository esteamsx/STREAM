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

export async function resolveCapcut(url) {
  const input = String(url || "").trim();
  if (!/^https?:\/\//i.test(input)) throw Object.assign(new Error("URL is required."), { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${BASE_URL}/id/api/snap`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ text: input }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.message || data?.error || `CapCut service responded ${response.status}.`;
      throw Object.assign(new Error(message), { status: 502 });
    }
    if (!data) throw Object.assign(new Error("CapCut service returned an empty response."), { status: 502 });
    return data;
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error(error?.message || "Could not reach the CapCut service."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
