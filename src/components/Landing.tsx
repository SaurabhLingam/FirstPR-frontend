import { useState } from "react";
import { FAQS } from "./HelpPanel";
import { Label } from "./Common";
import { fitTone } from "../lib/labels";
import { CheckCircleIcon, IssueOpenIcon, LogoIcon, SearchIcon } from "./Icons";

const REPO_URL = "https://github.com/SaurabhLingam/FirstPR-frontend";
const BACKEND_URL = "https://huggingface.co/spaces/confusedguy/firstpr-backend";
const EXAMPLE_APP_LINK = "/app?repo=" + encodeURIComponent("https://github.com/freeCodeCamp/freeCodeCamp");

// ---------- hero demo (example data) ----------
const DEMO_SKILLS = ["python", "javascript", "react", "css", "docs", "testing", "docker"];
const DEMO_ISSUES = [
  { n: 412, title: "Fix broken links in the contributing guide", label: "documentation", tags: ["docs"] },
  { n: 398, title: "Add dark-mode styles to the settings modal", label: "good first issue", tags: ["css", "react"] },
  { n: 377, title: "Debounce the search input on the issues page", label: "help wanted", tags: ["javascript", "react"] },
  { n: 359, title: "Add type hints to the CLI module", label: "good first issue", tags: ["python"] },
  { n: 365, title: "Write unit tests for the date helpers", label: "help wanted", tags: ["testing", "javascript"] },
  { n: 341, title: "Document the Docker development setup", label: "documentation", tags: ["docker", "docs"] },
];

function HeroDemo() {
  const [skills, setSkills] = useState<string[]>(["react", "css"]);
  const toggle = (s: string) => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const ranked = DEMO_ISSUES.map((i) => {
    const overlap = i.tags.filter((t) => skills.includes(t)).length;
    const fit = skills.length ? 0.42 + 0.5 * (overlap / i.tags.length) + (overlap ? 0.04 : 0) : 0.42;
    return { ...i, fit: Math.min(fit, 0.96), matched: i.tags.filter((t) => skills.includes(t)) };
  }).sort((a, b) => b.fit - a.fit || a.n - b.n);

  return (
    <div className="lp-window" aria-label="Interactive example">
      <div className="lp-window-bar">
        <span className="lp-dot" />
        <span className="lp-dot" />
        <span className="lp-dot" />
        <span className="small muted mono" style={{ marginLeft: 8 }}>firstpr · example</span>
      </div>
      <div className="lp-window-body">
        <div className="stack-sm">
          <span className="small strong">Try it: pick your skills</span>
          <div className="row" style={{ gap: 6 }}>
            {DEMO_SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                className={`lp-chip ${skills.includes(s) ? "on" : ""}`}
                aria-pressed={skills.includes(s)}
                onClick={() => toggle(s)}
              >
                {skills.includes(s) ? "✓ " : "+ "}
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="box" style={{ marginTop: 12 }}>
          <div className="box-header">
            <IssueOpenIcon />
            Ranked for you
            <span className="small muted spacer" style={{ fontWeight: 400 }}>example data</span>
          </div>
          {ranked.slice(0, 4).map((i) => {
            const pct = Math.round(i.fit * 100);
            const tone = fitTone(i.fit);
            return (
              <div key={i.n} className="issue-row lp-rank-row">
                <IssueOpenIcon className="open-icon" />
                <div className="issue-main" style={{ flexBasis: 220 }}>
                  <span className="strong">{i.title}</span>
                  <span className="row small muted" style={{ gap: 6 }}>
                    #{i.n} <Label name={i.label} />
                    {i.matched.length > 0 && <span>· matches {i.matched.join(", ")}</span>}
                  </span>
                </div>
                <span className="row small" style={{ flexWrap: "nowrap", gap: 8, marginLeft: "auto" }}>
                  <span className="meter" style={{ width: 56 }}>
                    <span className={`bg-${tone} lp-bar`} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={`tone-${tone} strong`} style={{ width: 34, textAlign: "right" }}>{pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- how it works ----------
const PLAN_STEPS = ["Set up the project locally", "Reproduce the problem", "Find where the content lives", "Make the fix", "Open the pull request"];

function StepPreview({ step }: { step: number }) {
  const [done, setDone] = useState<boolean[]>([true, true, false, false, false]);
  if (step === 0)
    return (
      <div className="stack-sm">
        <div className="field">
          <span className="label">Repository</span>
          <div className="input mono small" style={{ display: "flex", alignItems: "center", maxWidth: "none" }}>https://github.com/owner/repo</div>
        </div>
        <div className="field">
          <span className="label">Your skills</span>
          <div className="topic-box">
            {["python", "docs", "testing"].map((s) => (
              <span key={s} className="topic">{s}</span>
            ))}
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <span className="btn btn-primary" aria-hidden="true">Find issues</span>
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="box">
        <div className="box-header"><IssueOpenIcon /> 3 Open</div>
        {[
          ["Fix broken links in the contributing guide", 0.91],
          ["Add type hints to the CLI module", 0.78],
          ["Write unit tests for the date helpers", 0.62],
        ].map(([t, f]) => (
          <div key={t as string} className="issue-row">
            <IssueOpenIcon className="open-icon" />
            <span className="issue-main strong" style={{ flexBasis: 200 }}>{t}</span>
            <span className={`tone-${fitTone(f as number)} strong small`} style={{ marginLeft: "auto" }}>{Math.round((f as number) * 100)}%</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="comment-box">
      <div className="comment-head">
        <span className="author">firstpr</span>
        <span className="badge">bot</span>
        <span>commented</span>
        <span className="small spacer">{done.filter(Boolean).length} of {PLAN_STEPS.length} tasks</span>
      </div>
      <ul className="comment-body" style={{ listStyle: "none", padding: 8 }}>
        {PLAN_STEPS.map((s, i) => (
          <li key={s} className={`task ${done[i] ? "done" : ""}`}>
            <label>
              <input type="checkbox" checked={done[i]} onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))} />
              <span className="t-title">{s}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  { title: "Point it at a repo", body: "Paste any public GitHub repository and list what you're comfortable with — languages, frameworks, tools." },
  { title: "Get ranked issues", body: "FirstPR finds beginner-friendly issues and ranks them by how well they fit your skills." },
  { title: "Follow your plan", body: "Open an issue to get a step-by-step plan. Tick tasks off and ask the mentor when you're stuck." },
];

// ---------- pipeline ----------
const PIPELINE = [
  { name: "GitHub API", detail: "Fetches open issues from the repository, skipping pull requests. Issues labeled good first issue, help wanted, documentation or beginner come first." },
  { name: "Classifier", detail: "If nothing is labeled for newcomers, a random-forest model trained on GitHub issues picks the ones that look beginner-friendly." },
  { name: "Skill matching", detail: "Your skills are expanded into related terms, then sentence embeddings compare them with each issue's title and body to produce a fit score." },
  { name: "AI mentor", detail: "The model you choose — with your own key — writes a no-code plan for the issue you pick and answers follow-up questions in context." },
];

const FEATURES = [
  { title: "Beginner issues first", body: "Labeled newcomer issues are searched first, with a trained classifier as a fallback." },
  { title: "Matched to your skills", body: "Every issue gets a fit score, so you start where you're strongest." },
  { title: "Plans, not code", body: "You get the steps, the files to look at and how to verify — the change stays yours." },
  { title: "A mentor on call", body: "Ask follow-ups about any step. Answers stay focused on your issue." },
  { title: "Progress you can see", body: "Check tasks off as you go. Your work is kept while the tab is open." },
  { title: "Bring your own AI", body: "Use your key from OpenAI, Anthropic, Gemini, OpenRouter, Groq and more. Finding issues needs no key at all." },
  { title: "Read-only and private", body: "FirstPR only reads public GitHub data. Your key is never stored on the server." },
];

export function Landing() {
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(0);

  return (
    <div className="app lp">
      <header className="lp-nav">
        <a href="/" className="row" style={{ gap: 10, color: "var(--fg)", textDecoration: "none" }}>
          <span className="logo"><LogoIcon size={18} /></span>
          <span className="strong" style={{ fontSize: 16 }}>FirstPR</span>
        </a>
        <nav aria-label="Page" className="row lp-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#under-the-hood">Under the hood</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="row spacer">
          <a className="btn" href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a className="btn btn-primary" href="/app">Open app</a>
        </div>
      </header>

      <main>
        <section className="lp-hero lp-section">
          <div className="lp-hero-copy">
            <span className="lp-eyebrow mono">open source · for first-time contributors</span>
            <h1 className="lp-h1">Your first pull request starts here.</h1>
            <p className="lp-lead">
              FirstPR finds beginner-friendly issues in any GitHub repository, ranks them against your skills, and mentors you
              through the fix step by step — without writing the code for you.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <a className="btn btn-primary lp-btn-lg" href="/app">Find your first issue</a>
              <a className="btn lp-btn-lg" href="#how">See how it works</a>
            </div>
            <p className="small muted">
              No idea where to start? <a href={EXAMPLE_APP_LINK}>Try it on freeCodeCamp</a>.
            </p>
          </div>
          <HeroDemo />
        </section>

        <section id="how" className="lp-section">
          <h2 className="lp-h2">How it works</h2>
          <p className="lp-sub">Three steps from “I want to contribute” to an open pull request.</p>
          <div className="lp-steps">
            <div className="lp-step-list" role="tablist" aria-label="Steps">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={step === i}
                  className={`lp-step ${step === i ? "active" : ""}`}
                  onClick={() => setStep(i)}
                >
                  <span className="num">{i + 1}</span>
                  <span className="stack-sm" style={{ gap: 2, textAlign: "left" }}>
                    <span className="strong">{s.title}</span>
                    <span className="muted">{s.body}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="lp-step-preview" role="tabpanel" aria-label={STEPS[step].title}>
              <StepPreview step={step} />
              {step === 2 && <span className="small muted">Go ahead — tick a task.</span>}
            </div>
          </div>
        </section>

        <section id="features" className="lp-section">
          <h2 className="lp-h2">Built for your first contribution</h2>
          <p className="lp-sub">Everything a newcomer needs, nothing that does the work for you.</p>
          <div className="lp-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <span className="row strong" style={{ gap: 8 }}>
                  <CheckCircleIcon style={{ color: "var(--success)" }} />
                  {f.title}
                </span>
                <span className="muted">{f.body}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="under-the-hood" className="lp-section">
          <h2 className="lp-h2">Under the hood</h2>
          <p className="lp-sub">Click a stage to see what it does.</p>
          <div className="lp-pipeline">
            {PIPELINE.map((p, i) => (
              <div key={p.name} className="lp-pipe-item">
                <button
                  type="button"
                  className={`lp-pipe ${stage === i ? "active" : ""}`}
                  aria-pressed={stage === i}
                  onClick={() => setStage(i)}
                >
                  <span className="mono small muted">0{i + 1}</span>
                  <span className="strong">{p.name}</span>
                </button>
                {i < PIPELINE.length - 1 && <span className="lp-arrow" aria-hidden="true">→</span>}
              </div>
            ))}
          </div>
          <div className="lp-pipe-detail" aria-live="polite">
            <span className="strong">{PIPELINE[stage].name}</span>
            <p className="muted">{PIPELINE[stage].detail}</p>
          </div>
          <p className="small muted">
            Stack: React + TypeScript on the front; FastAPI, PyGithub, scikit-learn and sentence-transformers on the{" "}
            <a href={BACKEND_URL} target="_blank" rel="noopener noreferrer">backend</a>, plus the AI provider of your choice.
          </p>
        </section>

        <section id="faq" className="lp-section">
          <h2 className="lp-h2">Questions</h2>
          <div className="lp-faq">
            {FAQS.map((f) => (
              <details key={f.q} className="lp-faq-item">
                <summary>{f.q}</summary>
                <p className="muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-section lp-cta">
          <SearchIcon size={24} style={{ color: "var(--fg-muted)" }} />
          <h2 className="lp-h2">Ready to find your issue?</h2>
          <p className="lp-sub">It takes a repo link and a few skills.</p>
          <a className="btn btn-primary lp-btn-lg" href="/app">Open FirstPR</a>
        </section>
      </main>

      <footer className="lp-footer">
        <span className="row" style={{ gap: 8 }}>
          <LogoIcon size={16} /> FirstPR
        </span>
        <span className="row spacer" style={{ gap: 16 }}>
          <a href="/app">App</a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Frontend source</a>
          <a href={BACKEND_URL} target="_blank" rel="noopener noreferrer">Backend</a>
        </span>
      </footer>
    </div>
  );
}
