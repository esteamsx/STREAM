export const DEFAULT_CODING_MODEL_ID = "claude-fable-5-2";

// `id` is Coarena's current catalog slug and the model value sent through its
// existing Anthropic-compatible endpoint. Keep labels separate from request IDs.
export const CODING_MODELS = Object.freeze([
  Object.freeze({ id: "gpt-6-astra", label: "GPT-6", detail: "GPT-6 Astra · OpenAI", toastLabel: "GPT-6" }),
  Object.freeze({ id: "deepseek-v4-1-flash-1017", label: "DeepSeek V4.1 Flash", detail: "Flash · DeepSeek", toastLabel: "DeepSeek V4.1" }),
  Object.freeze({ id: "claude-fable-5-2", label: "Claude Fable 5.2", detail: "Fable 5.2 · Anthropic", toastLabel: "Claude Fable 5.2" }),
]);

export function getCodingModel(modelId) {
  return CODING_MODELS.find((model) => model.id === String(modelId || "")) || null;
}
