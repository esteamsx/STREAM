const FETCH_TIMEOUT_MS = 20000;

async function tryProvider(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function askFreeAI(prompt) {
  const providers = [
    async () => {
      const res = await fetch(`https://apis.davidcyril.name.ng/ai/claude-opus-4.5?prompt=${encodeURIComponent(prompt)}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const out = json?.data || json?.response || json?.result;
      if (!out) throw new Error("empty response");
      return String(out).trim();
    },
    async () => {
      const res = await fetch(`https://apis.davidcyril.name.ng/ai/gpt4omini?text=${encodeURIComponent(prompt)}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const out = data?.data || data?.response;
      if (!out) throw new Error("empty response");
      return String(out).trim();
    },
    async () => {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      if (!text) throw new Error("empty response");
      return text;
    },
  ];

  for (const provider of providers) {
    const result = await tryProvider(provider);
    if (result) return result;
  }
  throw Object.assign(new Error("Could not get an AI response right now, try again shortly."), { status: 502 });
}
