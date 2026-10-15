import type { BackendStatus, Stage } from "../types";
import type { RepoRef } from "../lib/github";
import { HelpIcon, LogoIcon } from "./Icons";

const STATUS_TEXT: Record<BackendStatus, string> = {
  checking: "Checking backend…",
  online: "Backend online",
  waking: "Backend waking up…",
  offline: "Backend unreachable",
};

interface Tab {
  id: Exclude<Stage, "scanning">;
  label: string;
  count?: number;
  enabled: boolean;
}

export function Header({
  repo,
  stage,
  tabs,
  onTab,
  status,
  helpOpen,
  onToggleHelp,
  aiLabel,
  onOpenAI,
}: {
  repo: RepoRef | null;
  stage: Stage;
  tabs: Tab[];
  onTab: (id: Tab["id"]) => void;
  status: BackendStatus;
  helpOpen: boolean;
  onToggleHelp: () => void;
  /** e.g. "Anthropic · claude-…", or null when no provider is connected. */
  aiLabel: string | null;
  onOpenAI: () => void;
}) {
  const activeTab = stage === "scanning" ? "issues" : stage;
  return (
    <header className="header">
      <div className="header-top">
        <a href="/" className="logo" aria-label="FirstPR home">
          <LogoIcon size={18} />
        </a>
        <nav aria-label="Breadcrumb" className="crumbs">
          <span className="strong">firstpr</span>
          <span className="sep" aria-hidden="true">/</span>
          <span className={repo ? "" : "muted"}>{repo?.owner ?? "owner"}</span>
          <span className="sep" aria-hidden="true">/</span>
          <span className={repo ? "strong" : "muted"}>{repo?.name ?? "repo"}</span>
        </nav>
        <div className="row spacer" style={{ gap: 12 }}>
          <button type="button" className="btn ai-pill" onClick={onOpenAI} title="AI provider settings">
            {aiLabel ? <span className="status-dot online" /> : <span className="warn-dot" />}
            <span>{aiLabel ?? "Connect AI"}</span>
          </button>
          <button type="button" className="btn" onClick={onToggleHelp} aria-expanded={helpOpen}>
            <HelpIcon />
            Help
          </button>
          <span className="status" role="status">
            <span className={`status-dot ${status}`} />
            {STATUS_TEXT[status]}
          </span>
        </div>
      </div>
      <nav aria-label="Sections" className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className="tab"
            disabled={!t.enabled}
            aria-current={activeTab === t.id ? "page" : undefined}
            onClick={() => onTab(t.id)}
          >
            {t.label}
            {t.count != null && <span className="counter">{t.count}</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}
