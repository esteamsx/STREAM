const DEFAULT_BASE_URL = "https://coarena.ai/api";
const DEFAULT_MODEL = "claude-fable-5-2";
const MAX_MESSAGES = 40;
const MAX_ATTACHMENTS = 6;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function cleanText(value, max = 20000) {
  return String(value == null ? "" : value).slice(0, max);
}

export function coarenaConfig() {
  const base = String(process.env.ANTHROPIC_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, "");
  const token = String(process.env.ANTHROPIC_AUTH_TOKEN || process.env.COARENA_API_KEY || "").trim();
  return { base, token, model: String(process.env.COARENA_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL };
}

function endpointFor(base) {
  if (/\/v1\/messages$/i.test(base)) return base;
  if (/\/v1$/i.test(base)) return base + "/messages";
  return base + "/v1/messages";
}

function attachmentContent(attachment) {
  const name = cleanText(attachment?.name || "attachment", 180);
  const mime = cleanText(attachment?.mime || attachment?.type || "application/octet-stream", 100).toLowerCase();
  const data = String(attachment?.data || "");
  if (!data || data.length > Math.ceil(MAX_ATTACHMENT_BYTES * 1.4)) return null;
  if (mime.startsWith("image/")) return { type: "image", source: { type: "base64", media_type: mime, data }, _name: name };
  if (mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: mime, data }, _name: name };
  let text;
  try { text = Buffer.from(data, "base64").toString("utf8"); } catch { text = ""; }
  if (!text) return null;
  return { type: "text", text: `\n\n--- File: ${name} (${mime}) ---\n${text.slice(0, 120000)}\n--- End file ---\n` };
}

export function buildCodingPayload(input = {}) {
  const rawMessages = Array.isArray(input.messages) ? input.messages.slice(-MAX_MESSAGES) : [];
  const messages = rawMessages.map((message) => {
    const role = message?.role === "assistant" ? "assistant" : "user";
    const text = cleanText(message?.content || "", 30000);
    return { role, content: text };
  }).filter((message) => message.content.trim());
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw Object.assign(new Error("Send a user message first."), { status: 400 });
  }
  const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, MAX_ATTACHMENTS).map(attachmentContent).filter(Boolean) : [];
  if (attachments.length) {
    const last = messages[messages.length - 1];
    const content = [{ type: "text", text: last.content }, ...attachments.map((item) => { const copy = { ...item }; delete copy._name; return copy; })];
    last.content = content;
  }
  return {
    model: coarenaConfig().model,
    max_tokens: Math.min(12000, Math.max(1024, Number(input.max_tokens) || 8192)),
    system: "You are CODING, the ES TEAMS TV premium coding assistant. Help with programming, debugging, architecture, and code review. Be precise. When the user asks for a completed file, return a fenced code block with the filename on the fence, for example ```js filename=src/app.js, and include the complete file. Never claim to have executed code you did not execute.",
    messages,
    stream: true,
  };
}

export async function createCoarenaRequest(payload, { signal } = {}) {
  const { base, token } = coarenaConfig();
  if (!token) throw Object.assign(new Error("CODING is not configured yet. Set COARENA_API_KEY or ANTHROPIC_AUTH_TOKEN on the server."), { status: 503, code: "coding_not_configured" });
  const response = await fetch(endpointFor(base), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream, application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": token,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) {
    const raw = (await response.text()).slice(0, 800);
    let detail = raw;
    try { detail = JSON.parse(raw).error?.message || JSON.parse(raw).error || raw; } catch {}
    throw Object.assign(new Error(`Coarena returned HTTP ${response.status}: ${detail || "request failed"}`), { status: response.status, code: "coarena_error" });
  }
  return response;
}

export async function* readCoarenaStream(response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      buffer += decoder.decode(part.value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || "";
      for (const frame of frames) {
        const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!data || data === "[DONE]") continue;
        let event; try { event = JSON.parse(data); } catch { continue; }
        const text = event.delta?.text || event.content_block?.text || (event.type === "message_start" ? "" : "");
        if (text) yield { type: "text", text };
        if (event.type === "message_stop") yield { type: "done" };
      }
    }
  } finally { reader.releaseLock(); }
}

export const codingLimits = { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES };
