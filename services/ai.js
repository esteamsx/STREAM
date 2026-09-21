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
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = (await res.text()).trim();
      if (!text) throw new Error("empty response");
      return text;
    },
    async () => {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=mistral`, {
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
