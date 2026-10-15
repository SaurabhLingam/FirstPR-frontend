import { useMemo, useState, type FormEvent } from "react";
import type { Issue } from "../types";
import { findIssueUrl, isPullRequestUrl, issueFromRef, type RepoRef } from "../lib/github";
import { FIT_LABEL, fitTone, labelDot, type FitTone } from "../lib/labels";
import { FitMeter, Flash, Label } from "./Common";
import { AlertIcon, IssueOpenIcon, SearchIcon } from "./Icons";
import { Markdown } from "./Markdown";

export function IssuesView({
  issues,
  repo,
  skills,
  message,
  onPick,
  onSearchAgain,
  onEditSkills,
  showHint,
  onDismissHint,
}: {
  issues: Issue[];
  repo: RepoRef | null;
  skills: string[];
  message: string;
  onPick: (issue: Issue) => void;
  onSearchAgain: () => void;
  onEditSkills: () => void;
  showHint: boolean;
  onDismissHint: () => void;
}) {
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState("");

  const labelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of issues) for (const l of i.labels) counts.set(l, (counts.get(l) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [issues]);

  const shown = labelFilter ? issues.filter((i) => i.labels.includes(labelFilter)) : issues;
  const buckets: FitTone[] = ["strong", "good", "stretch"];
  const withFit = issues.filter((i) => i.fit != null);

  function openPasted(e: FormEvent) {
    e.preventDefault();
    const ref = findIssueUrl(pasted);
    if (!ref) {
      setPasteError(
        isPullRequestUrl(pasted)
          ? "That's a pull request link. Paste an issue link instead."
          : "Paste a link like github.com/owner/repo/issues/123",
      );
      return;
    }
    setPasteError("");
    setPasted("");
    onPick(issues.find((i) => i.url === ref.url) ?? issueFromRef(ref));
  }

  return (
    <div className="stack">
      {showHint && issues.length > 0 && (
        <Flash title="Step 2: pick an issue" onDismiss={onDismissHint} dismissLabel="Got it">
          <span>
            Click any issue title to get a step-by-step plan. The percentage shows how well it matches your skills —{" "}
            <span className="tone-strong strong">green</span> is a strong fit and the best place to start. Use the label filters
            on the right to narrow the list.
          </span>
        </Flash>
      )}

      <div className="row">
        <div className="searchbar">
          <SearchIcon />
          <span>
            is:issue is:open beginner:true repo:{repo?.fullName ?? "?"} skills:{skills.join(",") || "none"}
          </span>
        </div>
        <button type="button" className="btn" onClick={onEditSkills}>
          Edit skills
        </button>
        <button type="button" className="btn btn-primary" onClick={onSearchAgain}>
          Search again
        </button>
      </div>

      <div className="split">
        <div className="main" style={{ gap: 12 }}>
          <div className="box">
            <div className="box-header lg" style={{ gap: 16 }}>
              <span className="row" style={{ gap: 6 }}>
                <IssueOpenIcon />
                {shown.length} Open
              </span>
              <span className="muted" style={{ fontWeight: 400 }}>
                {labelFilter ? `labeled ${labelFilter}` : "ranked for your skills"}
              </span>
              <span className="muted spacer" style={{ fontWeight: 400 }}>
                Sort: <span style={{ color: "var(--fg)" }}>Best fit</span>
              </span>
            </div>
            {issues.length === 0 && message && !/^no suitable issues/i.test(message) ? (
              <div className="box-body stack-sm">
                <span className="small muted">
                  The mentor's reply didn't include issue links we could list, so here it is in full. Paste an issue URL on the
                  right to get a plan.
                </span>
                <Markdown text={message} />
              </div>
            ) : issues.length === 0 ? (
              <div className="blankslate">
                <IssueOpenIcon size={24} style={{ color: "var(--fg-muted)" }} />
                <h3 style={{ fontSize: 20, fontWeight: 600 }}>No beginner issues right now</h3>
                <p className="muted">
                  Nothing in {repo?.fullName ?? "this repo"} is labeled for newcomers, and none of the open issues looked like a fit
                  for your skills.
                </p>
                <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
                  <button type="button" className="btn btn-primary" onClick={onEditSkills}>
                    Try another repo
                  </button>
                  <button type="button" className="btn" onClick={onEditSkills}>
                    Edit skills
                  </button>
                </div>
              </div>
            ) : (
              shown.map((issue) => (
                <div key={issue.url} className="issue-row">
                  <IssueOpenIcon className="open-icon" aria-label="Open issue" role="img" aria-hidden={false} />
                  <div className="issue-main">
                    <div className="row" style={{ gap: 6 }}>
                      <button type="button" className="link-btn issue-title" onClick={() => onPick(issue)}>
                        {issue.title}
                      </button>
                      {issue.labels.map((l) => (
                        <Label key={l} name={l} />
                      ))}
                    </div>
                    <span className="small muted">
                      #{issue.number}
                      {issue.matched.length > 0 && <> · matches {issue.matched.join(", ")}</>}
                      {" · "}
                      <a href={issue.url} target="_blank" rel="noopener noreferrer">
                        view on GitHub
                      </a>
                    </span>
                  </div>
                  <div className="issue-meta">
                    <FitMeter fit={issue.fit} />
                  </div>
                </div>
              ))
            )}
          </div>

          {message && issues.length > 0 && (
            <details className="box">
              <summary className="box-header" style={{ cursor: "pointer", borderBottom: 0 }}>
                Mentor's notes on these picks
              </summary>
              <div className="box-body" style={{ borderTop: "1px solid var(--border)" }}>
                <Markdown text={message} />
              </div>
            </details>
          )}
        </div>

        <aside className="side" aria-label="Filters">
          {labelCounts.length > 0 && (
            <div className="side-section" style={{ gap: 4 }}>
              <h3 className="side-title" style={{ marginBottom: 4 }}>
                Filter by label
              </h3>
              <button type="button" className="filter-btn" aria-pressed={labelFilter === null} onClick={() => setLabelFilter(null)}>
                <span className="swatch" style={{ border: "1px solid var(--fg-muted)" }} />
                <span style={{ flex: 1 }}>All labels</span>
                <span className="counter">{issues.length}</span>
              </button>
              {labelCounts.map(([name, count]) => (
                <button
                  key={name}
                  type="button"
                  className="filter-btn"
                  aria-pressed={labelFilter === name}
                  onClick={() => setLabelFilter(labelFilter === name ? null : name)}
                >
                  <span className="swatch" style={{ background: labelDot(name) }} />
                  <span style={{ flex: 1 }}>{name}</span>
                  <span className="counter">{count}</span>
                </button>
              ))}
            </div>
          )}

          {withFit.length > 0 && (
            <div className="side-section">
              <h3 className="side-title">Fit breakdown</h3>
              {buckets.map((b) => {
                const n = withFit.filter((i) => fitTone(i.fit) === b).length;
                return (
                  <div key={b} className="row small" style={{ flexWrap: "nowrap" }}>
                    <span className={`tone-${b}`} style={{ width: 72 }}>
                      {FIT_LABEL[b]}
                    </span>
                    <span className="meter" style={{ flex: 1, background: "var(--bg-muted)" }}>
                      <span className={`bg-${b}`} style={{ width: `${Math.round((n / withFit.length) * 100)}%` }} />
                    </span>
                    <span className="muted" style={{ width: 16, textAlign: "right" }}>
                      {n}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <form className="side-section" onSubmit={openPasted}>
            <label htmlFor="paste-issue" className="side-title">
              Have a specific issue in mind?
            </label>
            <input
              id="paste-issue"
              className={`input ${pasteError ? "invalid" : ""}`}
              placeholder="Paste an issue URL"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              spellCheck={false}
            />
            {pasteError && (
              <span className="field-error">
                <AlertIcon size={14} />
                {pasteError}
              </span>
            )}
            <button type="submit" className="btn btn-sm" style={{ alignSelf: "flex-start" }} disabled={!pasted.trim()}>
              Get a plan
            </button>
          </form>

          <div className="side-section">
            <h3 className="side-title">Searched with</h3>
            <div className="row" style={{ gap: 4 }}>
              {skills.map((s) => (
                <span key={s} className="topic">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {repo && (
            <div className="side-section" style={{ gap: 4 }}>
              <h3 className="side-title">Repository</h3>
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="small strong">
                {repo.fullName}
              </a>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
