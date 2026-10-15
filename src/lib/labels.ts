import type { CSSProperties } from "react";

// GitHub's default label colours for common beginner labels; anything else is neutral grey.
const KNOWN: Record<string, string> = {
  "good first issue": "7057ff",
  "good-first-issue": "7057ff",
  "first-timers-only": "7057ff",
  "help wanted": "008672",
  "help-wanted": "008672",
  documentation: "0075ca",
  docs: "0075ca",
  bug: "d73a4a",
  enhancement: "a2eeef",
  beginner: "c2e0c6",
  easy: "fbca04",
  question: "d876e3",
  css: "1d76db",
  javascript: "f1e05a",
  python: "3572a5",
  testing: "0e8a16",
  tests: "0e8a16",
};

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Dark-theme label pill colours derived the way GitHub does: tinted fill, lightened text. */
export function labelStyle(name: string): CSSProperties {
  const hex = KNOWN[name.toLowerCase()];
  if (!hex) return { color: "#c9d1d9", background: "rgba(139,148,158,.18)", borderColor: "rgba(139,148,158,.4)" };
  const [r, g, b] = rgb(hex);
  const lift = (c: number) => Math.round(c + (255 - c) * 0.45);
  return {
    color: `rgb(${lift(r)},${lift(g)},${lift(b)})`,
    background: `rgba(${r},${g},${b},.18)`,
    borderColor: `rgba(${r},${g},${b},.4)`,
  };
}

export function labelDot(name: string): string {
  const hex = KNOWN[name.toLowerCase()];
  return hex ? `#${hex}` : "#8b949e";
}

export const SEARCHED_LABELS = ["good first issue", "good-first-issue", "help wanted", "documentation", "beginner", "easy"];

export type FitTone = "strong" | "good" | "stretch" | "unknown";

export function fitTone(fit: number | null): FitTone {
  if (fit == null) return "unknown";
  if (fit >= 0.8) return "strong";
  if (fit >= 0.65) return "good";
  return "stretch";
}

export const FIT_LABEL: Record<FitTone, string> = {
  strong: "strong fit",
  good: "good fit",
  stretch: "stretch",
  unknown: "fit unknown",
};
