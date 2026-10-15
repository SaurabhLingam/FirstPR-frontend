import { useState, type FormEvent, type KeyboardEvent } from "react";
import type { RepoRef } from "../lib/github";
import { SEARCHED_LABELS } from "../lib/labels";
import { SUGGESTED_SKILLS, expandSkill, normalizeSkill } from "../lib/skills";
import { Flash, Label } from "./Common";
import { AlertIcon, CheckCircleIcon, XIcon } from "./Icons";

export const EXAMPLE_REPO = "https://github.com/freeCodeCamp/freeCodeCamp";

export function SetupView({
  repoInput,
  onRepoInput,
  repo,
  skills,
  onSkills,
  onFind,
  busy,
  hasSearched,
  showWelcome,
  onDismissWelcome,
  onOpenHelp,
}: {
  repoInput: string;
  onRepoInput: (v: string) => void;
  repo: RepoRef | null;
  skills: string[];
  onSkills: (s: string[]) => void;
  onFind: () => void;
  busy: boolean;
  hasSearched: boolean;
  showWelcome: boolean;
  onDismissWelcome: () => void;
  onOpenHelp: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [touched, setTouched] = useState(false);
  const repoInvalid = repoInput.trim() !== "" && !repo;
  const canFind = !!repo && skills.length > 0 && !busy;

  function addSkills(raw: string) {
    const next = [...skills];
    for (const part of raw.split(",")) {
      const s = normalizeSkill(part);
      if (s && s.length <= 40 && !next.includes(s)) next.push(s);
    }
    if (next.length !== skills.length) onSkills(next);
  }

  function onSkillChange(v: string) {
    if (v.includes(",")) {
      addSkills(v);
      setDraft("");
    } else setDraft(v);
  }

  function onSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkills(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && skills.length) {
      onSkills(skills.slice(0, -1));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (draft.trim()) {
      addSkills(draft);
      setDraft("");
    }
    if (canFind) onFind();
  }

  const checklist = [
    {
      title: "Paste a GitHub repository URL",
      help: "Any public project you'd like to contribute to. No idea? Try the example repo.",
      done: !!repo,
    },
    { title: "Add at least one skill", help: "Languages, frameworks or tools you're comfortable with.", done: skills.length > 0 },
    { title: "Click “Find issues”", help: "We'll rank beginner-friendly issues for you. It can take up to a minute.", done: hasSearched },
  ];
  const suggestions = SUGGESTED_SKILLS.filter((s) => !skills.includes(s)).slice(0, 4);
  const expandedTotal = skills.reduce((n, s) => n + 1 + expandSkill(s).length, 0);

  return (
    <div className="split">
      <form className="main" onSubmit={submit} noValidate>
        {showWelcome && (
          <Flash
            title="New here? Three steps to get going."
            onDismiss={onDismissWelcome}
            actions={
              <>
                <button type="button" className="btn btn-sm" onClick={() => onRepoInput(EXAMPLE_REPO)}>
                  Try an example repo
                </button>
                <button type="button" className="btn btn-sm" onClick={onOpenHelp}>
                  Read the FAQ
                </button>
              </>
            }
          >
            <span>FirstPR helps you make your first open-source contribution. Each step ticks off as you complete it.</span>
            <ol style={{ listStyle: "none", padding: 0, marginTop: 8, gap: 8 }}>
              {checklist.map((c, i) => (
                <li key={c.title} className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap", gap: 10 }}>
                  {c.done ? (
                    <CheckCircleIcon style={{ color: "var(--success)", flex: "none", marginTop: 3 }} aria-label="Done" role="img" aria-hidden={false} />
                  ) : (
                    <span className="num" style={{ width: 16, height: 16, fontSize: 10, marginTop: 3, borderColor: "var(--fg-muted)" }}>
                      {i + 1}
                    </span>
                  )}
                  <span className="stack-sm" style={{ gap: 0 }}>
                    <span className="strong" style={c.done ? { color: "var(--fg-muted)", textDecoration: "line-through" } : undefined}>
                      {c.title}
                    </span>
                    <span className="small muted">{c.help}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Flash>
        )}

        <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 400, marginBottom: 4 }}>Find your first issue</h1>
          <p className="muted">
            Point FirstPR at a repository and tell it what you know. It ranks beginner-friendly issues against your skills and
            mentors you through the fix — without writing the code for you.
          </p>
        </div>

        <div className="field">
          <label htmlFor="repo-input">
            Repository <span className="req">*</span>
          </label>
          <input
            id="repo-input"
            className={`input ${repoInvalid ? "invalid" : ""}`}
            type="text"
            inputMode="url"
            spellCheck={false}
            autoComplete="off"
            placeholder="https://github.com/owner/repo"
            value={repoInput}
            onChange={(e) => onRepoInput(e.target.value)}
            aria-invalid={repoInvalid}
            aria-describedby="repo-help"
          />
          {repoInvalid && (
            <span className="field-error">
              <AlertIcon size={14} />
              {/\/pull\/\d+/.test(repoInput)
                ? "That's a pull request link. Paste the repository URL instead, like github.com/owner/repo"
                : "Use a GitHub repository URL, like github.com/owner/repo"}
            </span>
          )}
          <span id="repo-help" className="small muted">
            Open the project on GitHub and copy the address from your browser's address bar. Public repositories only.
          </span>
        </div>

        <div className="field">
          <label htmlFor="skill-input">
            Your skills <span className="req">*</span>
          </label>
          <div className="topic-box">
            {skills.map((s) => (
              <span key={s} className="topic removable">
                {s}
                <button type="button" onClick={() => onSkills(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`}>
                  <XIcon size={12} />
                </button>
              </span>
            ))}
            <input
              id="skill-input"
              value={draft}
              onChange={(e) => onSkillChange(e.target.value)}
              onKeyDown={onSkillKey}
              onBlur={() => {
                if (draft.trim()) {
                  addSkills(draft);
                  setDraft("");
                }
              }}
              placeholder={skills.length ? "Add another…" : "e.g. python, react, docs"}
              aria-describedby="skill-help"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="row small muted" style={{ gap: 6 }}>
              <span>Suggested:</span>
              {suggestions.map((s) => (
                <button key={s} type="button" className="btn btn-xs" onClick={() => addSkills(s)}>
                  + {s}
                </button>
              ))}
            </div>
          )}
          {touched && skills.length === 0 && (
            <span className="field-error">
              <AlertIcon size={14} />
              Add at least one skill.
            </span>
          )}
          <span id="skill-help" className="small muted">
            Press Enter or type a comma to add. Languages, frameworks and tools all work.
          </span>
        </div>

        <div className="cards">
          {[
            ["Match", "Labeled beginner issues first. If there are none, a classifier reviews the rest."],
            ["Pick", "Open any ranked issue to get a step-by-step plan for it."],
            ["Ship", "Tick off tasks, ask the mentor when stuck, then open your PR."],
          ].map(([t, d], i) => (
            <div key={t} className="card">
              <span className="row strong">
                <span className="num">{i + 1}</span>
                {t}
              </span>
              <span className="muted">{d}</span>
            </div>
          ))}
        </div>

        <div className="row" style={{ borderTop: "1px solid var(--border)", paddingTop: 16, justifyContent: "space-between", gap: 12 }}>
          <span className="small muted">FirstPR reads public data only. Nothing is posted to GitHub.</span>
          <button type="submit" className="btn btn-primary" disabled={!canFind}>
            Find issues
          </button>
        </div>
      </form>

      <aside className="side" aria-label="Search details" style={{ gap: 16, flexBasis: 300 }}>
        <div className="box">
          <div className="box-header">Labels we search</div>
          <div className="box-body stack-sm" style={{ padding: "12px 16px" }}>
            <div className="row" style={{ gap: 4 }}>
              {SEARCHED_LABELS.map((l) => (
                <Label key={l} name={l} />
              ))}
            </div>
            <span className="small muted">No matches? A trained classifier picks likely beginner issues from the rest.</span>
          </div>
        </div>

        <div className="box">
          <div className="box-header" style={{ justifyContent: "space-between" }}>
            <span>Your skills expand to</span>
            <span className="counter">{expandedTotal}</span>
          </div>
          {skills.length === 0 ? (
            <p className="box-body small muted">Add a skill to see the related terms we'll match.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {skills.map((s) => {
                const terms = expandSkill(s);
                return (
                  <li key={s} className="box-row" style={{ padding: "8px 16px", borderColor: "var(--border-muted)" }}>
                    <div className="mono small" style={{ color: "var(--accent)" }}>{s}</div>
                    <div className="small muted">{terms.length ? terms.slice(0, 6).join(", ") + (terms.length > 6 ? ", …" : "") : "matched as written"}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="box">
          <div className="box-header">Before your first PR</div>
          <ul className="muted" style={{ padding: "12px 16px 12px 32px", display: "flex", flexDirection: "column", gap: 6 }}>
            <li>Read the repo's CONTRIBUTING file.</li>
            <li>Comment on the issue before you start, so nobody duplicates work.</li>
            <li>Keep the change small — one issue, one PR.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
