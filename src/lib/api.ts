import type { ChatMessage } from "../types";
import type { RawIssue } from "./github";
import { aiHeaders, type AISettings } from "./aiSettings";

// The user's AI provider settings, sent as headers with every request (bring your own key).
let currentAI: AISettings | null = null;
export function setAISettings(s: AISettings | null) {
  currentAI = s;
}

export const BACKEND_URL = (
  (import.meta.env.VITE_BACKEND_URL as string | undefined) || "https://confusedguy-firstpr-backend.hf.space"
).replace(/\/+$/, "");

export type ApiErrorKind = "http" | "timeout" | "network" | "aborted";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Turns any FastAPI error body (string detail, 422 validation list, or object) into a readable sentence. */
export function formatErrorBody(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    const d = body.detail ?? body.message;
    if (typeof d === "string" && d.trim()) return d.trim();
    if (Array.isArray(d)) {
      const parts = d.map((item) => {
        if (item && typeof item === "object" && "msg" in item) {
          const loc = Array.isArray((item as { loc?: unknown[] }).loc)
            ? ((item as { loc: unknown[] }).loc.filter((x) => x !== "body").join("."))
            : "";
          const msg = String((item as { msg: unknown }).msg);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return typeof item === "string" ? item : JSON.stringify(item);
      });
      if (parts.length) return parts.join("; ");
    }
    if (d != null) return JSON.stringify(d);
  }
  if (status === 502 || status === 503 || status === 504) {
    return "The backend is starting up or temporarily unavailable. Try again in a moment.";
  }
  return `Request failed (HTTP ${status}).`;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Overrides the saved AI settings (e.g. testing a key before saving it). */
  ai?: AISettings | null;
}

async function request<T>(path: string, { method = "POST", body, timeoutMs, signal, ai }: RequestOptions): Promise<T> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    let res: Response;
    let text: string;
    try {
      res = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...aiHeaders(ai === undefined ? currentAI : ai),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      text = await res.text();
    } catch {
      if (timedOut) throw new ApiError("The backend took too long to respond. Please try again.", "timeout");
      if (ctrl.signal.aborted) throw new ApiError("Request cancelled.", "aborted");
      throw new ApiError("Couldn't reach the backend. It may be starting up — try again in a moment.", "network");
    }

    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) throw new ApiError(formatErrorBody(data, res.status), "http", res.status);
    return (data ?? {}) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new ApiError("Request cancelled.", "aborted"));
    });
  });

export async function health(signal?: AbortSignal, timeoutMs = 10_000): Promise<boolean> {
  try {
    await request<unknown>("/", { method: "GET", timeoutMs, signal });
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.kind === "aborted") throw e;
    return false;
  }
}

/**
 * Hugging Face Spaces sleep when idle and take a while to boot.
 * Polls the health endpoint until it answers, calling onWaking once it's clear we're waiting.
 */
export async function ensureAwake(
  opts: { signal?: AbortSignal; onWaking?: () => void; onAttempt?: (attempt: number) => void; maxWaitMs?: number } = {},
): Promise<void> {
  const { signal, onWaking, onAttempt, maxWaitMs = 120_000 } = opts;
  const start = Date.now();
  let attempt = 1;
  if (await health(signal)) return;
  onWaking?.();
  while (Date.now() - start < maxWaitMs) {
    attempt += 1;
    onAttempt?.(attempt);
    await sleep(5_000, signal);
    if (await health(signal, 15_000)) return;
  }
  throw new ApiError("The backend didn't start in time. Please try again in a minute.", "timeout");
}

/** Live model list from the user's provider (key sent as a header, never stored). */
export function llmModels(ai: AISettings, signal?: AbortSignal) {
  return request<{ models?: string[] }>("/llm/models", { timeoutMs: 30_000, signal, ai });
}

/** Sends one tiny prompt to confirm the key and model work. */
export function llmCheck(ai: AISettings, signal?: AbortSignal) {
  return request<{ ok?: boolean; provider?: string; model?: string }>("/llm/check", { timeoutMs: 60_000, signal, ai });
}

export interface RecommendResponse {
  message?: string | null;
  count?: number;
  issues?: RawIssue[];
}

export function recommend(repoUrl: string, skills: string[], signal?: AbortSignal) {
  return request<RecommendResponse>("/recommend", {
    body: { repo_url: repoUrl, skills, max_issues: 15 },
    timeoutMs: 180_000,
    signal,
  });
}

export function plan(repoUrl: string, issueUrl: string, skills: string[], signal?: AbortSignal) {
  return request<{ plan?: string }>("/plan", {
    body: { repo_url: repoUrl, issue_url: issueUrl, skills, constraints: "" },
    timeoutMs: 120_000,
    signal,
  });
}

export function chat(
  repoUrl: string,
  issueUrl: string,
  history: ChatMessage[],
  skills: string[],
  signal?: AbortSignal,
) {
  return request<{ reply?: string }>("/chat", {
    body: { repo_url: repoUrl, issue_url: issueUrl, skills, history },
    timeoutMs: 90_000,
    signal,
  });
}
