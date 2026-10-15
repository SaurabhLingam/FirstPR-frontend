import type { ProviderId } from "./providers";
import { PROVIDERS } from "./providers";
import { load, remove, save } from "./storage";

export interface AISettings {
  provider: ProviderId;
  apiKey: string;
  model: string;
  baseUrl: string;
  /** true: kept in localStorage on this device; false: only for this tab. */
  remember: boolean;
}

const KEY = "firstpr:ai";

const isSettings = (v: unknown): v is AISettings =>
  !!v &&
  typeof v === "object" &&
  PROVIDERS.some((p) => p.id === (v as AISettings).provider) &&
  typeof (v as AISettings).apiKey === "string" &&
  typeof (v as AISettings).model === "string";

export function loadAISettings(): AISettings | null {
  return load<AISettings | null>("local", KEY, null, isSettings) ?? load<AISettings | null>("session", KEY, null, isSettings);
}

export function saveAISettings(s: AISettings): void {
  remove("local", KEY);
  remove("session", KEY);
  save(s.remember ? "local" : "session", KEY, s);
}

export function clearAISettings(): void {
  remove("local", KEY);
  remove("session", KEY);
}

export function isComplete(s: AISettings | null): s is AISettings {
  return !!s && !!s.apiKey.trim() && !!s.model.trim() && (s.provider !== "custom" || !!s.baseUrl.trim());
}

export function aiHeaders(s: AISettings | null): Record<string, string> {
  if (!s || !s.apiKey.trim()) return {};
  const h: Record<string, string> = { "X-LLM-Provider": s.provider, "X-LLM-Key": s.apiKey.trim() };
  if (s.model.trim()) h["X-LLM-Model"] = s.model.trim();
  if (s.provider === "custom" && s.baseUrl.trim()) h["X-LLM-Base-URL"] = s.baseUrl.trim();
  return h;
}
