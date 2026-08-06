const FETCH_TIMEOUT_MS = 15000;
const BASE = "https://api.mail.tm";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
      throw Object.assign(new Error(`Temp mail service error: ${detail}`), { status: res.status === 429 ? 429 : 502 });
    }
    return data;
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the temp mail service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

function randomString(len) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createTempInbox() {
  const domains = await request("/domains");
  const domain = domains["hydra:member"] && domains["hydra:member"][0] && domains["hydra:member"][0].domain;
  if (!domain) throw Object.assign(new Error("No temp mail domains available right now."), { status: 502 });

  const address = `${randomString(10)}@${domain}`;
  const password = randomString(16);
  await request("/accounts", { method: "POST", body: JSON.stringify({ address, password }) });
  const tokenRes = await request("/token", { method: "POST", body: JSON.stringify({ address, password }) });

  return { email: address, password, token: tokenRes.token };
}

export async function listTempMessages(token) {
  const data = await request("/messages", { headers: { Authorization: `Bearer ${token}` } });
  const messages = data["hydra:member"] || [];
  return messages.map((m) => ({
    id: m.id,
    from: m.from ? m.from.address : null,
    subject: m.subject || null,
    intro: m.intro || null,
    seen: !!m.seen,
    createdAt: m.createdAt || null,
  }));
}

export async function readTempMessage(token, id) {
  const m = await request(`/messages/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  return {
    id: m.id,
    from: m.from ? m.from.address : null,
    subject: m.subject || null,
    text: m.text || null,
    html: Array.isArray(m.html) ? m.html.join("\n") : m.html || null,
    createdAt: m.createdAt || null,
  };
}
