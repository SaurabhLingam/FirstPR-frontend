export type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter" | "groq" | "mistral" | "deepseek" | "xai" | "custom";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  keyUrl?: string;
  placeholder: string;
  /** Patterns used to pick a sensible default from the provider's live model list, best first. */
  preferred: RegExp[];
  note?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
    preferred: [/^gpt-[\d.]+-mini$/, /^gpt-[\d.]+$/, /^gpt-4o-mini$/],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    keyUrl: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
    preferred: [/sonnet/, /haiku/, /opus/],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyUrl: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
    preferred: [/^gemini-[\d.]+-flash$/, /^gemini-.*flash(?!.*(lite|image|tts|live))/, /^gemini-/],
    note: "Google AI Studio offers a free tier.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/settings/keys",
    placeholder: "sk-or-…",
    preferred: [/^anthropic\/claude-.*sonnet/, /^openai\/gpt-[\d.]+-mini$/, /^google\/gemini-.*flash$/],
    note: "One key for models from many providers.",
  },
  {
    id: "groq",
    label: "Groq",
    keyUrl: "https://console.groq.com/keys",
    placeholder: "gsk_…",
    preferred: [/gpt-oss-120b/, /llama-4-maverick/, /llama-3\.3-70b/, /kimi-k2/, /qwen3-32b/, /llama.*70b/],
    note: "Very fast, with a free tier.",
  },
  {
    id: "mistral",
    label: "Mistral",
    keyUrl: "https://console.mistral.ai/api-keys",
    placeholder: "Your Mistral key",
    preferred: [/^mistral-small-latest$/, /^mistral-medium-latest$/, /^mistral-large-latest$/],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    keyUrl: "https://platform.deepseek.com/api_keys",
    placeholder: "sk-…",
    preferred: [/^deepseek-chat$/],
  },
  {
    id: "xai",
    label: "xAI",
    keyUrl: "https://console.x.ai",
    placeholder: "xai-…",
    preferred: [/^grok-[\d.]+-mini$/, /^grok-[\d.]+$/, /^grok/],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    placeholder: "Your endpoint's API key",
    preferred: [],
    note: "Any service with an OpenAI-compatible API. It must be reachable over public https.",
  },
];

export function providerInfo(id: string | undefined): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

/** A guess from the key's prefix. Only a hint: several providers share formats. */
export function detectProvider(key: string): ProviderId | null {
  const k = key.trim();
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("sk-or-")) return "openrouter";
  if (k.startsWith("gsk_")) return "groq";
  if (k.startsWith("xai-")) return "xai";
  if (k.startsWith("AIza")) return "gemini";
  if (k.startsWith("sk-proj-")) return "openai";
  return null;
}

// Models that are poor at multi-step plans: tiny parameter counts and special-purpose models.
const SPECIAL_PURPOSE = /guard|allam|whisper|tts|embed|moderation|vision|audio|ocr|rerank|search|saba|compound|coder|math|prompt-guard/i;
const SMALL = /(^|[^\d.])(0\.\d+|1|1\.5|2|3|4|7|8|9)b(\b|-|$)|nano|tiny|instant|lite/i;
const STRONG = /\d{2,3}b|large|pro|opus|sonnet|maverick|kimi|gpt-oss|gpt-[45]|gemini|grok|deepseek-(chat|v\d|r\d)|claude|mistral-(medium|large)/i;

/** True for models likely to give garbled or shallow plans, so the UI can warn. */
export function isLikelyWeakModel(model: string): boolean {
  return SPECIAL_PURPOSE.test(model) || (SMALL.test(model) && !STRONG.test(model.replace(SMALL, "")));
}

function score(model: string): number {
  if (SPECIAL_PURPOSE.test(model)) return -10;
  return (STRONG.test(model) ? 3 : 0) - (SMALL.test(model) ? 2 : 0);
}

const newest = (list: string[]) => {
  const sorted = [...list].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return sorted[sorted.length - 1] ?? "";
};

/**
 * Picks a default model from the provider's live list: the newest match of the first preferred
 * pattern that hits, else the highest-scoring capable model (never just the first alphabetically).
 */
export function pickDefaultModel(provider: ProviderInfo, models: string[]): string {
  for (const pattern of provider.preferred) {
    const hits = models.filter((m) => pattern.test(m) && !SPECIAL_PURPOSE.test(m));
    if (hits.length) return newest(hits);
  }
  if (!models.length) return "";
  const best = Math.max(...models.map(score));
  return newest(models.filter((m) => score(m) === best));
}
