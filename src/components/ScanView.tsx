import { useEffect, useState } from "react";
import type { BackendStatus } from "../types";
import { Flash } from "./Common";
import { CheckCircleIcon, CircleIcon, SpinnerIcon } from "./Icons";

type JobState = "done" | "running" | "queued";

export function ScanView({
  repoName,
  skillCount,
  status,
  wakeAttempt,
  onCancel,
}: {
  repoName: string;
  skillCount: number;
  status: BackendStatus;
  wakeAttempt: number;
  onCancel: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const connected = status === "online";
  const jobs: { name: string; state: JobState }[] = [
    { name: "Connect to backend", state: connected ? "done" : "running" },
    { name: "Find & score issues", state: connected ? "running" : "queued" },
  ];

  const log: { text: string; muted?: boolean }[] = [
    { text: `▸ Connect to backend` },
    ...(status === "waking"
      ? [{ text: `  backend is asleep, waking it up (check ${wakeAttempt})`, muted: true }]
      : connected
        ? [{ text: "  connected", muted: true }]
        : [{ text: "  checking…", muted: true }]),
  ];
  if (connected) {
    log.push(
      { text: `▸ Find & score issues in ${repoName}` },
      { text: "  looks for issues labeled good first issue, help wanted, documentation…", muted: true },
      { text: "  if none are labeled, a classifier reviews open issues instead", muted: true },
      { text: `  scores each one against your ${skillCount} skill${skillCount === 1 ? "" : "s"}, then the mentor ranks them`, muted: true },
      { text: `  working… ${elapsed}s`, muted: true },
    );
  }

  return (
    <div className="split" aria-live="polite" aria-busy="true">
      <aside className="side" aria-label="Steps" style={{ gap: 4, flexBasis: 240 }}>
        <span className="job active">
          <SpinnerIcon style={{ color: "var(--attention)" }} />
          Scan
          <span className="small muted spacer" style={{ fontWeight: 400 }}>
            {elapsed}s
          </span>
        </span>
        <h2 className="side-title" style={{ margin: "12px 8px 4px" }}>
          Steps
        </h2>
        {jobs.map((j) => (
          <span key={j.name} className="job" style={{ color: j.state === "queued" ? "var(--fg-muted)" : undefined }}>
            {j.state === "done" && <CheckCircleIcon style={{ color: "var(--success)", flex: "none" }} />}
            {j.state === "running" && <SpinnerIcon style={{ color: "var(--attention)", flex: "none" }} />}
            {j.state === "queued" && <CircleIcon style={{ color: "var(--fg-subtle)", flex: "none" }} />}
            {j.name}
          </span>
        ))}
        <button type="button" className="btn" onClick={onCancel} style={{ marginTop: 16, alignSelf: "flex-start" }}>
          Cancel
        </button>
      </aside>

      <div className="main">
        {status === "waking" && (
          <Flash kind="warn" title="The backend is waking up">
            It sleeps when nobody's using it, so the first request can take up to a minute. We'll keep retrying.
          </Flash>
        )}
        <div className="box">
          <div className="box-header lg">
            <span>Scanning {repoName}</span>
            <span className="muted" style={{ fontWeight: 400 }}>
              · matching against {skillCount} skills
            </span>
            <span className="small muted spacer" style={{ fontWeight: 400 }}>
              Large repos can take a minute or two
            </span>
          </div>
          <div className="log">
            {log.map((l, i) => (
              <div key={i} className="log-line">
                <span className="ln">{i + 1}</span>
                <span style={{ color: l.muted ? "var(--fg-muted)" : "var(--fg)", whiteSpace: "pre-wrap", minWidth: 0 }}>{l.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="box" aria-hidden="true">
          <div className="box-header lg muted" style={{ fontWeight: 400 }}>
            Results will appear here
          </div>
          {[55, 70, 45].map((w) => (
            <div key={w} className="row" style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexWrap: "nowrap", gap: 12 }}>
              <span className="skeleton" style={{ width: 16, height: 16, borderRadius: "50%", flex: "none" }} />
              <span className="stack-sm" style={{ flex: 1, gap: 6 }}>
                <span className="skeleton" style={{ height: 10, width: `${w}%` }} />
                <span className="skeleton" style={{ height: 8, width: `${w / 2}%`, background: "var(--bg-subtle)" }} />
              </span>
              <span className="skeleton" style={{ width: 64, height: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
