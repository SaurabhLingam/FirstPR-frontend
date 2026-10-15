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
    preferred: [/llama-3\.3-70b/, /llama.*70b/, /llama/],
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

/** Picks a default model from the provider's live list: the newest match of the first preferred pattern that hits. */
export function pickDefaultModel(provider: ProviderInfo, models: string[]): string {
  for (const pattern of provider.preferred) {
    const hits = models.filter((m) => pattern.test(m));
    if (hits.length) {
      const sorted = hits.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      return sorted[sorted.length - 1];
    }
  }
  return models[0] ?? "";
}
