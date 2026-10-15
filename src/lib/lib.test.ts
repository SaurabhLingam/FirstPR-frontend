import { describe, expect, it } from "vitest";
import { extractRecommendedIssues, findIssueUrl, normalizeIssues, parseRepo } from "./github";
import { extractPaths, parsePlan } from "./plan";
import { formatErrorBody } from "./api";

describe("parseRepo", () => {
  it.each([
    ["https://github.com/octo/hello", "octo/hello"],
    ["github.com/octo/hello.git", "octo/hello"],
    ["https://www.github.com/octo/hello/tree/main/src", "octo/hello"],
    ["octo/hello", "octo/hello"],
    ["  https://github.com/octo/hello/  ", "octo/hello"],
  ])("%s -> %s", (input, full) => {
    expect(parseRepo(input)?.fullName).toBe(full);
  });

  it("rejects non-GitHub input", () => {
    expect(parseRepo("https://gitlab.com/a/b")).toBeNull();
    expect(parseRepo("hello")).toBeNull();
  });
});

describe("findIssueUrl", () => {
  it("finds issue links with comment anchors and trailing punctuation", () => {
    const ref = findIssueUrl("see (https://github.com/a/b/issues/12#issuecomment-9).");
    expect(ref).toMatchObject({ repo: "a/b", number: 12, url: "https://github.com/a/b/issues/12" });
  });

  it("ignores pull requests and docs links", () => {
    expect(findIssueUrl("https://github.com/a/b/pull/3")).toBeNull();
    expect(findIssueUrl("I read https://docs.python.org/3/")).toBeNull();
  });
});

describe("extractRecommendedIssues", () => {
  const message = `Here are your best matches:

1) **Fix typo in README** (https://github.com/a/b/issues/7)
   - Compatibility: 86%
   - Top matched skills: docs, markdown
   - Why: tiny docs change. First step: open README.md.
2. [Add dark mode toggle](https://github.com/a/b/issues/12)
   Compatibility: 71%
3) https://github.com/a/b/issues/7 again (duplicate)

Want help with one? Reply with the issue number or URL.`;

  it("extracts issues in order with titles, fit and skills", () => {
    const issues = extractRecommendedIssues(message);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toMatchObject({ number: 7, title: "Fix typo in README", fit: 0.86, matched: ["docs", "markdown"] });
    expect(issues[1]).toMatchObject({ number: 12, title: "Add dark mode toggle", fit: 0.71 });
  });

  it("returns nothing for the no-results message", () => {
    expect(extractRecommendedIssues("No suitable issues found.")).toEqual([]);
  });
});

describe("normalizeIssues", () => {
  it("maps backend issues and sorts by fit", () => {
    const out = normalizeIssues([
      { title: "B", url: "https://github.com/a/b/issues/2", fit_score: 0.6, labels: ["help wanted"] },
      { title: "A", url: "https://github.com/a/b/issues/1", fit_score: 0.9, skills_matched: ["css"] },
      { title: "PR", url: "https://github.com/a/b/pull/3" },
    ]);
    expect(out.map((i) => i.number)).toEqual([1, 2]);
    expect(out[0].matched).toEqual(["css"]);
  });
});

describe("parsePlan", () => {
  it("splits numbered steps, bold titles, details and the closing question", () => {
    const plan = parsePlan(`Here is your plan.

1. **Set up**: Fork and clone the repo, then run it.
   - Follow README.md
2. Reproduce the bug in src/app.js
3) Open a PR

Which step should we start with?`);
    expect(plan.intro).toBe("Here is your plan.");
    expect(plan.steps).toHaveLength(3);
    expect(plan.steps[0].title).toBe("Set up");
    expect(plan.steps[0].detail).toContain("Fork and clone");
    expect(plan.steps[0].detail).toContain("README.md");
    expect(plan.outro).toBe("Which step should we start with?");
  });

  it("leaves unnumbered text as-is", () => {
    const plan = parsePlan("Just read the docs first.");
    expect(plan.steps).toEqual([]);
    expect(plan.intro).toBe("Just read the docs first.");
  });
});

describe("extractPaths", () => {
  it("finds files and folders but not URLs", () => {
    const paths = extractPaths("Look in docs/ and `src/utils/date.ts`, then README.md. See https://github.com/a/b too.");
    expect(paths).toEqual(["docs/", "src/utils/date.ts", "README.md"]);
  });
});

describe("formatErrorBody", () => {
  it("handles FastAPI validation lists", () => {
    const msg = formatErrorBody({ detail: [{ loc: ["body", "repo_url"], msg: "Field required" }] }, 422);
    expect(msg).toBe("repo_url: Field required");
  });

  it("uses string details and falls back for empty bodies", () => {
    expect(formatErrorBody({ detail: "Invalid issue URL" }, 500)).toBe("Invalid issue URL");
    expect(formatErrorBody(null, 503)).toMatch(/starting up/);
    expect(formatErrorBody(null, 500)).toBe("Request failed (HTTP 500).");
  });
});
