import type { Issue } from "../types";

export interface RepoRef {
  owner: string;
  name: string;
  fullName: string;
  url: string;
}

const REPO_URL_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#].*)?$/i;
const REPO_SHORT_RE = /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/;
const ISSUE_URL_RE = /https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/i;
const ISSUE_URL_GLOBAL_RE = new RegExp(ISSUE_URL_RE.source, "gi");

/** Accepts a full GitHub URL (with or without https, .git, extra path) or "owner/repo". */
export function parseRepo(input: string): RepoRef | null {
  const text = input.trim();
  const m = REPO_URL_RE.exec(text) ?? REPO_SHORT_RE.exec(text);
  if (!m) return null;
  const owner = m[1];
  const name = m[2];
  return { owner, name, fullName: `${owner}/${name}`, url: `https://github.com/${owner}/${name}` };
}

export interface IssueRef {
  owner: string;
  name: string;
  repo: string;
  number: number;
  url: string;
}

/** Finds the first GitHub issue URL anywhere in the text. Pull request URLs do not match. */
export function findIssueUrl(text: string): IssueRef | null {
  const m = ISSUE_URL_RE.exec(text);
  return m ? toIssueRef(m) : null;
}

function toIssueRef(m: RegExpExecArray): IssueRef {
  const owner = m[1];
  const name = m[2];
  const number = Number(m[3]);
  return { owner, name, repo: `${owner}/${name}`, number, url: `https://github.com/${owner}/${name}/issues/${number}` };
}

export function isPullRequestUrl(text: string): boolean {
  return /github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i.test(text);
}

export function issueFromRef(ref: IssueRef, title?: string): Issue {
  return {
    number: ref.number,
    url: ref.url,
    repo: ref.repo,
    title: title || `Issue #${ref.number}`,
    labels: [],
    fit: null,
    matched: [],
  };
}

function cleanMarkdown(s: string): string {
  return s
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*(?:#+\s*)?(?:\d+[.)]|[-*•])\s*/, "")
    .replace(/[\s([{:–—-]+$/, "")
    .trim();
}

/**
 * The backend's /recommend returns a markdown message rather than structured data.
 * Pull the recommended issues out of it: one per distinct issue URL, in order,
 * with the title from the same line and a fit % from the lines that follow.
 */
export function extractRecommendedIssues(markdown: string): Issue[] {
  const lines = markdown.split(/\r?\n/);
  const found: { issue: Issue; line: number }[] = [];
  const seen = new Set<string>();

  lines.forEach((line, i) => {
    ISSUE_URL_GLOBAL_RE.lastIndex = 0;
    const m = ISSUE_URL_GLOBAL_RE.exec(line);
    if (!m) return;
    const ref = toIssueRef(m);
    if (seen.has(ref.url)) return;
    seen.add(ref.url);

    let title = "";
    const link = /\[([^\]]+)\]\(\s*https?:\/\/[^)]*\/issues\/\d+[^)]*\)/.exec(line);
    if (link && !/^https?:/.test(link[1])) title = link[1];
    else title = line.slice(0, m.index);
    found.push({ issue: issueFromRef(ref, cleanMarkdown(title)), line: i });
  });

  found.forEach((entry, idx) => {
    const end = idx + 1 < found.length ? found[idx + 1].line : lines.length;
    const block = lines.slice(entry.line, end);
    for (const l of block) {
      const pct = /(\d{1,3}(?:\.\d+)?)\s*%/.exec(l);
      if (pct && entry.issue.fit === null) {
        const v = Number(pct[1]);
        if (v >= 0 && v <= 100) entry.issue.fit = v / 100;
      }
      const skills = /skills?[^:]*:\s*(.+)$/i.exec(l);
      if (skills && entry.issue.matched.length === 0) {
        entry.issue.matched = skills[1]
          .split(/,|\band\b/)
          .map((s) => cleanMarkdown(s).replace(/\(.*?\)/g, "").trim())
          .filter((s) => s && s.length < 40);
      }
    }
  });

  return found.map((f) => f.issue);
}

export interface RawIssue {
  title?: string;
  url?: string;
  labels?: string[];
  fit_score?: number;
  skills_matched?: string[];
}

/** Structured issues, for when the backend includes an `issues` array in /recommend. */
export function normalizeIssues(raw: RawIssue[]): Issue[] {
  const out: Issue[] = [];
  for (const r of raw) {
    const ref = r.url ? findIssueUrl(r.url) : null;
    if (!ref) continue;
    out.push({
      ...issueFromRef(ref, r.title),
      labels: Array.isArray(r.labels) ? r.labels : [],
      fit: typeof r.fit_score === "number" ? r.fit_score : null,
      matched: Array.isArray(r.skills_matched) ? r.skills_matched.slice(0, 3) : [],
    });
  }
  return out.sort((a, b) => (b.fit ?? -1) - (a.fit ?? -1));
}
