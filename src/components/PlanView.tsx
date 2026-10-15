import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Issue, IssueSession } from "../types";
import { extractPaths } from "../lib/plan";
import { fitTone } from "../lib/labels";
import { Flash, Label, TypingDots } from "./Common";
import { FileIcon, FolderIcon, IssueOpenIcon, LogoIcon } from "./Icons";
import { Markdown } from "./Markdown";

function BotAvatar() {
  return (
    <span className="avatar bot" role="img" aria-label="firstpr bot">
      <LogoIcon size={20} />
    </span>
  );
}

function UserAvatar() {
  return (
    <span className="avatar" role="img" aria-label="You">
      You
    </span>
  );
}

export function PlanView({
  session,
  planLoading,
  sending,
  error,
  onRetryPlan,
  onOpenAI,
  onDismissError,
  onToggleStep,
  onSend,
  otherIssues,
  onPick,
  onBack,
  canGoBack,
  showHint,
  onDismissHint,
}: {
  session: IssueSession;
  planLoading: boolean;
  sending: boolean;
  error: string;
  onRetryPlan: () => void;
  onOpenAI: () => void;
  onDismissError: () => void;
  onToggleStep: (i: number) => void;
  onSend: (text: string) => void;
  otherIssues: Issue[];
  onPick: (issue: Issue) => void;
  onBack: () => void;
  canGoBack: boolean;
  showHint: boolean;
  onDismissHint: () => void;
}) {
  const { issue, plan, done, messages } = session;
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const endRef = useRef<HTMLDivElement>(null);

  const steps = plan?.steps ?? [];
  const doneCount = steps.filter((_, i) => done[i]).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const paths = plan ? extractPaths(plan.raw) : [];

  useEffect(() => {
    if (messages.length || sending) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, sending]);

  function submit() {
    const text = draft.trim();
    if (!text || sending || planLoading) return;
    onSend(text);
    setDraft("");
    setTab("write");
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="stack">
      {showHint && (
        <Flash title="Step 3: work through your plan" onDismiss={onDismissHint} dismissLabel="Got it">
          <ol>
            <li>Tick each task in the checklist as you finish it — your progress shows on the right.</li>
            <li>Stuck? Ask in the box at the bottom. The mentor explains and points you to files, but won't write the code for you.</li>
            <li>All done? Open a pull request on GitHub and mention the issue (e.g. “Fixes #{issue.number}”).</li>
          </ol>
        </Flash>
      )}

      <div className="row" style={{ alignItems: "flex-start", justifyContent: "space-between", gap: "8px 16px" }}>
        <h1 className="issue-h1">
          {issue.title} <span className="muted" style={{ fontWeight: 300 }}>#{issue.number}</span>
        </h1>
        {canGoBack && (
          <button type="button" className="btn" onClick={onBack}>
            Back to issues
          </button>
        )}
      </div>
      <div className="row muted" style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <span className="state-open">
          <IssueOpenIcon />
          Open
        </span>
        <span>
          <span className="strong" style={{ color: "var(--fg)" }}>firstpr</span>{" "}
          {plan ? (steps.length ? `made a ${steps.length}-step plan` : "made a plan") : planLoading ? "is writing a plan…" : "hasn't made a plan yet"}
          {issue.fit != null && ` · ${Math.round(issue.fit * 100)}% fit for your skills`}
          {" · "}
          <span className="mono small">{issue.repo}</span>
        </span>
      </div>

      <div className="split">
        <div className="main">
          {error && (
            <Flash kind="error" title="Something went wrong" onDismiss={onDismissError}
              actions={
                <>
                  {!plan && <button type="button" className="btn btn-sm" onClick={onRetryPlan}>Try again</button>}
                  <button type="button" className="btn btn-sm" onClick={onOpenAI}>AI settings</button>
                </>
              }>
              {error}
            </Flash>
          )}

          <div className="comment">
            <BotAvatar />
            <div className="comment-box">
              <div className="comment-head">
                <span className="author">firstpr</span>
                <span className="badge">bot</span>
                <span>{planLoading ? "is writing a plan…" : "commented"}</span>
                {steps.length > 0 && (
                  <span className="small spacer">
                    {doneCount} of {steps.length} tasks
                  </span>
                )}
              </div>
              <div className="comment-body">
                {planLoading && (
                  <div className="stack-sm" aria-busy="true">
                    <span className="row muted">
                      <TypingDots /> Reading the issue and the repo. This can take up to a minute.
                    </span>
                    {[80, 65, 72, 50].map((w) => (
                      <span key={w} className="skeleton" style={{ height: 10, width: `${w}%` }} />
                    ))}
                  </div>
                )}
                {!planLoading && !plan && <p className="muted">No plan yet.</p>}
                {plan && steps.length === 0 && <Markdown text={plan.raw} />}
                {plan && steps.length > 0 && (
                  <div className="stack-sm" style={{ gap: 12 }}>
                    {plan.intro ? <Markdown text={plan.intro} /> : <p>Here's a plan for this issue. Work top to bottom and tick tasks off as you go.</p>}
                    <ul style={{ listStyle: "none", padding: 0 }}>
                      {steps.map((s, i) => (
                        <li key={i} className={`task ${done[i] ? "done" : ""}`}>
                          <label>
                            <input type="checkbox" checked={!!done[i]} onChange={() => onToggleStep(i)} />
                            <span className="stack-sm" style={{ gap: 0, minWidth: 0 }}>
                              <span className="t-title">
                                <span className="muted mono small" style={{ marginRight: 6 }}>{String(i + 1).padStart(2, "0")}</span>
                                {s.title.replace(/\*\*/g, "")}
                              </span>
                              {s.detail && (
                                <span className="t-detail">
                                  <Markdown text={s.detail} />
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {plan.outro && <Markdown text={plan.outro} />}
                  </div>
                )}
              </div>
            </div>
          </div>

          {messages.map((m, i) => (
            <div key={i} className="comment">
              {m.role === "user" ? <UserAvatar /> : <BotAvatar />}
              <div className={`comment-box ${m.role === "user" ? "mine" : ""}`}>
                <div className="comment-head">
                  <span className="author">{m.role === "user" ? "you" : "firstpr"}</span>
                  {m.role === "assistant" && <span className="badge">bot</span>}
                  <span>commented</span>
                </div>
                <div className="comment-body">
                  {m.role === "user" ? <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span> : <Markdown text={m.content} />}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="row small muted" style={{ paddingLeft: 56 }} role="status">
              <TypingDots /> firstpr is typing…
            </div>
          )}
          <div ref={endRef} />

          <div className="comment timeline-divider">
            <UserAvatar />
            <div className="stack-sm" style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>Ask the mentor</h2>
              <div className="composer">
                <div className="composer-tabs" role="tablist">
                  <button type="button" role="tab" className="composer-tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>
                    Write
                  </button>
                  <button type="button" role="tab" className="composer-tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
                    Preview
                  </button>
                </div>
                {tab === "write" ? (
                  <>
                    <label htmlFor="chat-input" className="sr-only">
                      Message the mentor
                    </label>
                    <textarea
                      id="chat-input"
                      rows={4}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={onKey}
                      placeholder="Ask about a task, paste another issue URL, or type an issue number from your list…"
                    />
                  </>
                ) : (
                  <div className="preview">{draft.trim() ? <Markdown text={draft} /> : <span className="muted">Nothing to preview</span>}</div>
                )}
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small muted">Markdown is supported · Enter to send, Shift+Enter for a new line</span>
                <button type="button" className="btn btn-primary" onClick={submit} disabled={!draft.trim() || sending || planLoading}>
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="side" aria-label="Issue details">
          {steps.length > 0 && (
            <div className="side-section">
              <h3 className="side-title">Progress</h3>
              <span className="meter" style={{ width: "100%" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress">
                <span style={{ width: `${pct}%`, background: "var(--success-emphasis)" }} />
              </span>
              <span className="small muted">
                {doneCount} of {steps.length} tasks complete
              </span>
            </div>
          )}
          {issue.labels.length > 0 && (
            <div className="side-section">
              <h3 className="side-title">Labels</h3>
              <div className="row" style={{ gap: 4 }}>
                {issue.labels.map((l) => (
                  <Label key={l} name={l} />
                ))}
              </div>
            </div>
          )}
          {issue.matched.length > 0 && (
            <div className="side-section">
              <h3 className="side-title">Matched skills</h3>
              <span className="small">{issue.matched.join(", ")}</span>
            </div>
          )}
          {paths.length > 0 && (
            <div className="side-section">
              <h3 className="side-title">Mentioned in the plan</h3>
              <ul className="mono small" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {paths.map((p) => (
                  <li key={p} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    {p.endsWith("/") ? <FolderIcon size={14} className="muted" /> : <FileIcon size={14} className="muted" />}
                    <span style={{ overflowWrap: "anywhere" }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="side-section">
            <h3 className="side-title">Development</h3>
            <a href={issue.url} target="_blank" rel="noopener noreferrer" className="small">
              View issue on GitHub
            </a>
            <span className="small muted">Open a pull request when every task is checked.</span>
          </div>
          {otherIssues.length > 0 && (
            <div className="side-section" style={{ gap: 4 }}>
              <h3 className="side-title" style={{ marginBottom: 4 }}>
                Other matches
              </h3>
              {otherIssues.slice(0, 5).map((o) => (
                <button key={o.url} type="button" className="filter-btn small" style={{ alignItems: "flex-start", margin: "0 -8px", width: "calc(100% + 16px)" }} onClick={() => onPick(o)}>
                  <IssueOpenIcon size={14} style={{ color: "var(--success)", flex: "none", marginTop: 2 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {o.title} <span className="muted">#{o.number}</span>
                  </span>
                  {o.fit != null && <span className={`tone-${fitTone(o.fit)} strong`}>{Math.round(o.fit * 100)}%</span>}
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
