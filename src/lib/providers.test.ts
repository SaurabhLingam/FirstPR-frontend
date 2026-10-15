import { describe, expect, it } from "vitest";
import { detectProvider, isLikelyWeakModel, pickDefaultModel, providerInfo } from "./providers";
import { normalizeModelText, parsePlan } from "./plan";
import { aiHeaders, isComplete } from "./aiSettings";

describe("detectProvider", () => {
  it.each([
    ["sk-ant-abc", "anthropic"],
    ["sk-or-v1-abc", "openrouter"],
    ["gsk_abc", "groq"],
    ["xai-abc", "xai"],
    ["AIzaSyAbc", "gemini"],
    ["sk-proj-abc", "openai"],
  ])("%s -> %s", (key, id) => expect(detectProvider(key)).toBe(id));

  it("doesn't guess for ambiguous keys", () => {
    expect(detectProvider("sk-abc")).toBeNull();
    expect(detectProvider("abc123")).toBeNull();
  });
});

describe("pickDefaultModel", () => {
  it("prefers the newest match of the best pattern", () => {
    const models = ["claude-haiku-5-5", "claude-sonnet-4-5", "claude-sonnet-5-5", "claude-opus-5-5"];
    expect(pickDefaultModel(providerInfo("anthropic")!, models)).toBe("claude-sonnet-5-5");
  });

  it("never falls back to a tiny or special-purpose model just because it sorts first", () => {
    const groq = [
      "allam-2-7b",
      "llama-3.1-8b-instant",
      "llama-guard-4-12b",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "qwen/qwen3-32b",
      "whisper-large-v3",
    ];
    expect(pickDefaultModel(providerInfo("groq")!, groq)).toBe("qwen/qwen3-32b");
    expect(pickDefaultModel(providerInfo("custom")!, ["allam-2-7b", "big-model-70b"])).toBe("big-model-70b");
    expect(pickDefaultModel(providerInfo("openai")!, [])).toBe("");
  });

  it("flags weak models", () => {
    expect(isLikelyWeakModel("allam-2-7b")).toBe(true);
    expect(isLikelyWeakModel("llama-3.1-8b-instant")).toBe(true);
    expect(isLikelyWeakModel("llama-guard-4-12b")).toBe(true);
    expect(isLikelyWeakModel("llama-3.3-70b-versatile")).toBe(false);
    expect(isLikelyWeakModel("claude-sonnet-5-5")).toBe(false);
  });
});

describe("normalizeModelText", () => {
  it("turns literal \\n into line breaks so plans parse", () => {
    const raw = String.raw`Steps:\n1. Clone the repo\n2. Add the theme\n3. Open a PR`;
    expect(normalizeModelText(raw)).toBe("Steps:\n1. Clone the repo\n2. Add the theme\n3. Open a PR");
    expect(parsePlan(raw).steps.map((s) => s.title)).toEqual(["Clone the repo", "Add the theme", "Open a PR"]);
  });

  it("leaves normal text alone", () => {
    const text = String.raw`Use \n in a regex.` + "\nNext line";
    expect(normalizeModelText(text)).toBe(text);
  });
});

describe("aiSettings", () => {
  const s = { provider: "custom" as const, apiKey: " k ", model: "m", baseUrl: "https://x.test/v1", remember: true };

  it("requires a base URL only for custom endpoints", () => {
    expect(isComplete(s)).toBe(true);
    expect(isComplete({ ...s, baseUrl: "" })).toBe(false);
    expect(isComplete({ ...s, provider: "openai", baseUrl: "" })).toBe(true);
  });

  it("builds headers and trims the key", () => {
    expect(aiHeaders(s)).toEqual({
      "X-LLM-Provider": "custom",
      "X-LLM-Key": "k",
      "X-LLM-Model": "m",
      "X-LLM-Base-URL": "https://x.test/v1",
    });
    expect(aiHeaders(null)).toEqual({});
  });
});
