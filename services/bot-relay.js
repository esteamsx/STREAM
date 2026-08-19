const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL;
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;
const TIMEOUT_MS = 15000;

export async function checkWhatsAppNumberViaBotService(number) {
  if (!BOT_SERVICE_URL || !INTERNAL_API_KEY) {
    throw Object.assign(new Error("This feature is not configured on the server."), { status: 503 });
  }

  let resp;
  try {
    resp = await fetch(`${BOT_SERVICE_URL}/internal/wa-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_API_KEY },
      body: JSON.stringify({ number }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw Object.assign(new Error("The check timed out. Try again shortly."), { status: 504 });
    }
    throw Object.assign(new Error("Could not reach the WhatsApp check service."), { status: 502 });
  }

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw Object.assign(new Error(data.error || "Could not check that number."), { status: resp.status });
  }
  return data;
}
