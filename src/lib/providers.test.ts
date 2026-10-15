import { describe, expect, it } from "vitest";
import { detectProvider, pickDefaultModel, providerInfo } from "./providers";
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

  it("falls back to the first model", () => {
    expect(pickDefaultModel(providerInfo("custom")!, ["a", "b"])).toBe("a");
    expect(pickDefaultModel(providerInfo("openai")!, [])).toBe("");
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
