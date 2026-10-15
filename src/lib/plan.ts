import type { ParsedPlan, PlanStep } from "../types";

/** Some models write "\n" literally (copying JSON escaping); turn those back into line breaks. */
export function normalizeModelText(text: string): string {
  const literal = (text.match(/\\n/g) ?? []).length;
  const real = (text.match(/\n/g) ?? []).length;
  if (literal < 2 || literal <= real) return text;
  return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\"/g, '"');
}

const STEP_RE = /^\s{0,3}(?:#+\s*)?(?:step\s*)?(\d{1,2})[.):]\s+(.+)$/i;

function splitTitle(text: string): PlanStep {
  const t = text.trim();
  const bold = /^\*\*(.+?)\*\*[\s:.\-–—]*(.*)$/.exec(t);
  if (bold) return { title: bold[1].replace(/:$/, ""), detail: bold[2] };
  const colon = t.indexOf(": ");
  if (colon > 0 && colon < 60 && t.length > 70) {
    return { title: t.slice(0, colon), detail: t.slice(colon + 2) };
  }
  return { title: t, detail: "" };
}

/**
 * Turn the mentor's numbered plan into checklist steps. Lines after a numbered
 * line belong to that step. Text after a blank line that isn't indented or a
 * bullet (usually the closing question) becomes the outro.
 * Plans with fewer than two numbered steps are left as plain text.
 */
export function parsePlan(input: string): ParsedPlan {
  const raw = normalizeModelText(input);
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const intro: string[] = [];
  const steps: { head: string; body: string[] }[] = [];

  for (const line of lines) {
    const m = STEP_RE.exec(line);
    if (m) steps.push({ head: m[2], body: [] });
    else if (steps.length) steps[steps.length - 1].body.push(line);
    else intro.push(line);
  }

  if (steps.length < 2) return { raw, intro: raw.trim(), steps: [], outro: "" };

  let outro: string[] = [];
  const last = steps[steps.length - 1].body;
  for (let i = 0; i < last.length - 1; i++) {
    const next = last[i + 1];
    if (last[i].trim() === "" && next.trim() !== "" && !/^\s+|^\s*[-*•]/.test(next)) {
      outro = last.splice(i + 1);
      break;
    }
  }

  return {
    raw,
    intro: intro.join("\n").trim(),
    steps: steps.map((s) => {
      const { title, detail } = splitTitle(s.head);
      const body = s.body.join("\n").trim();
      return { title, detail: [detail, body].filter(Boolean).join("\n") };
    }),
    outro: outro.join("\n").trim(),
  };
}

const FILE_EXT = "md|mdx|js|jsx|ts|tsx|py|json|yml|yaml|toml|css|scss|html|txt|cfg|ini|sh|rs|go|java|rb|php|c|h|cpp|vue|svelte";
const PATH_RE = new RegExp(
  "(?:^|[\\s`'\"(])((?:[\\w.-]+/)+[\\w.-]*|[\\w-]+\\.(?:" + FILE_EXT + "))(?=[\\s`'\"),:;]|\\.(?:\\s|$)|$)",
  "g",
);

/** File and folder paths mentioned in the plan, for the "Mentioned in the plan" sidebar. */
export function extractPaths(text: string, max = 8): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PATH_RE)) {
    const p = m[1];
    if (/^(?:https?:|www\.|github\.com)/i.test(p) || /\/\//.test(p)) continue;
    if (/^(?:and|or|e\.g|i\.e)\//i.test(p) || p.length < 3) continue;
    if (!out.includes(p)) out.push(p);
    if (out.length >= max) break;
  }
  return out;
}
