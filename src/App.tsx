import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BackendStatus, ChatMessage, Issue, IssueSession, Stage } from "./types";
import * as api from "./lib/api";
import { ApiError } from "./lib/api";
import {
  extractRecommendedIssues,
  findIssueUrl,
  isPullRequestUrl,
  issueFromRef,
  normalizeIssues,
  parseRepo,
  type RepoRef,
} from "./lib/github";
import { parsePlan } from "./lib/plan";
import { load, save } from "./lib/storage";
import { Header } from "./components/Header";
import { HelpPanel } from "./components/HelpPanel";
import { SetupView } from "./components/SetupView";
import { ScanView } from "./components/ScanView";
import { IssuesView } from "./components/IssuesView";
import { PlanView } from "./components/PlanView";
import { Flash } from "./components/Common";

const SESSION_KEY = "firstpr:session";
const HINTS_KEY = "firstpr:hints";
const HISTORY_LIMIT = 12;

interface Persisted {
  v: 2;
  repoInput: string;
  skills: string[];
  issues: Issue[];
  recMessage: string;
  searchedRepo: RepoRef | null;
  stage: Stage;
  sessions: Record<string, IssueSession>;
  activeUrl: string | null;
}

interface Hints {
  welcome: boolean;
  issues: boolean;
  plan: boolean;
}

const EMPTY: Persisted = {
  v: 2,
  repoInput: "",
  skills: [],
  issues: [],
  recMessage: "",
  searchedRepo: null,
  stage: "setup",
  sessions: {},
  activeUrl: null,
};
const ALL_HINTS: Hints = { welcome: true, issues: true, plan: true };

const isPersisted = (v: unknown): v is Persisted =>
  !!v &&
  typeof v === "object" &&
  (v as Persisted).v === 2 &&
  Array.isArray((v as Persisted).skills) &&
  Array.isArray((v as Persisted).issues) &&
  typeof (v as Persisted).sessions === "object";

const isHints = (v: unknown): v is Hints => !!v && typeof v === "object" && "welcome" in v && "issues" in v && "plan" in v;

function isAbort(e: unknown) {
  return e instanceof ApiError && e.kind === "aborted";
}

function errorText(e: unknown) {
  return e instanceof Error ? e.message : "Something unexpected went wrong.";
}

export default function App() {
  const initial = useMemo(() => load("session", SESSION_KEY, EMPTY, isPersisted), []);
  const [repoInput, setRepoInput] = useState(
    // The landing page can link to /app?repo=… to prefill the repository.
    () => new URLSearchParams(window.location.search).get("repo") ?? initial.repoInput,
  );
  const [skills, setSkills] = useState<string[]>(initial.skills);
  const [issues, setIssues] = useState<Issue[]>(initial.issues);
  const [recMessage, setRecMessage] = useState(initial.recMessage);
  const [searchedRepo, setSearchedRepo] = useState<RepoRef | null>(initial.searchedRepo);
  const [stage, setStage] = useState<Stage>(() =>
    initial.stage === "scanning" || new URLSearchParams(window.location.search).has("repo") ? "setup" : initial.stage,
  );
  const [sessions, setSessions] = useState<Record<string, IssueSession>>(initial.sessions);
  const [activeUrl, setActiveUrl] = useState<string | null>(initial.activeUrl);

  const [status, setStatus] = useState<BackendStatus>("checking");
  const [wakeAttempt, setWakeAttempt] = useState(1);
  const [busy, setBusy] = useState<null | "scan" | "plan" | "chat">(null);
  const [error, setError] = useState("");
  const [planError, setPlanError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [hints, setHints] = useState<Hints>(() => load("local", HINTS_KEY, ALL_HINTS, isHints));

  const abortRef = useRef<AbortController | null>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  const repo = parseRepo(repoInput);
  const active = activeUrl ? sessions[activeUrl] : undefined;
  const hasSearched = searchedRepo !== null;

  // ---------- persistence ----------
  useEffect(() => {
    save("session", SESSION_KEY, {
      v: 2,
      repoInput,
      skills,
      issues,
      recMessage,
      searchedRepo,
      stage: stage === "scanning" ? (hasSearched ? "issues" : "setup") : stage,
      sessions,
      activeUrl,
    } satisfies Persisted);
  }, [repoInput, skills, issues, recMessage, searchedRepo, stage, sessions, activeUrl, hasSearched]);

  useEffect(() => save("local", HINTS_KEY, hints), [hints]);

  // ---------- backend wake-up ----------
  useEffect(() => {
    const ctrl = new AbortController();
    api
      .ensureAwake({ signal: ctrl.signal, onWaking: () => setStatus("waking"), onAttempt: setWakeAttempt })
      .then(() => setStatus("online"))
      .catch((e) => {
        if (!isAbort(e)) setStatus("offline");
      });
    return () => ctrl.abort();
  }, []);

  const wake = useCallback(async (signal: AbortSignal) => {
    if (statusRef.current === "online") return;
    await api.ensureAwake({ signal, onWaking: () => setStatus("waking"), onAttempt: setWakeAttempt });
    setStatus("online");
  }, []);

  /** Starts a new backend operation, cancelling whatever was in flight. */
  function begin(kind: "scan" | "plan" | "chat") {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(kind);
    return ctrl;
  }

  function finish(ctrl: AbortController) {
    if (abortRef.current === ctrl) {
      abortRef.current = null;
      setBusy(null);
    }
  }

  function noteFailure(e: unknown) {
    if (e instanceof ApiError && (e.kind === "network" || e.status === 502 || e.status === 503)) setStatus("offline");
  }

  // ---------- actions ----------
  async function find() {
    if (!repo || skills.length === 0) return;
    const ctrl = begin("scan");
    setError("");
    setStage("scanning");
    try {
      await wake(ctrl.signal);
      try {
        // Older backends read skills from /init instead of each request.
        await api.init(skills, ctrl.signal);
      } catch (e) {
        if (isAbort(e)) throw e;
      }
      const res = await api.recommend(repo.url, skills, ctrl.signal);
      const message = (res.message ?? "").trim();
      const list = res.issues?.length ? normalizeIssues(res.issues) : extractRecommendedIssues(message);
      if (searchedRepo?.fullName.toLowerCase() !== repo.fullName.toLowerCase()) {
        setSessions({});
        setActiveUrl(null);
      }
      setIssues(list);
      setRecMessage(message);
      setSearchedRepo(repo);
      setStage("issues");
    } catch (e) {
      if (isAbort(e)) return;
      noteFailure(e);
      setError(errorText(e));
      setStage(hasSearched ? "issues" : "setup");
    } finally {
      finish(ctrl);
    }
  }

  function cancelScan() {
    abortRef.current?.abort();
    setBusy(null);
    setStage(hasSearched ? "issues" : "setup");
  }

  const updateSession = useCallback((url: string, fn: (s: IssueSession) => IssueSession) => {
    setSessions((prev) => (prev[url] ? { ...prev, [url]: fn(prev[url]) } : prev));
  }, []);

  async function fetchPlan(issue: Issue) {
    const ctrl = begin("plan");
    setPlanError("");
    try {
      await wake(ctrl.signal);
      try {
        await api.init(skills, ctrl.signal);
      } catch (e) {
        if (isAbort(e)) throw e;
      }
      const res = await api.plan(`https://github.com/${issue.repo}`, issue.url, skills, ctrl.signal);
      const text = (res.plan ?? "").trim();
      if (!text) throw new Error("The mentor returned an empty plan. Try again.");
      const parsed = parsePlan(text);
      updateSession(issue.url, (s) => ({ ...s, plan: parsed, done: parsed.steps.map(() => false) }));
    } catch (e) {
      if (isAbort(e)) return;
      noteFailure(e);
      setPlanError(errorText(e));
    } finally {
      finish(ctrl);
    }
  }

  function openIssue(issue: Issue) {
    setActiveUrl(issue.url);
    setStage("plan");
    setPlanError("");
    const existing = sessions[issue.url];
    if (existing?.plan) {
      if (busy === "plan" || busy === "chat") {
        abortRef.current?.abort();
        setBusy(null);
      }
      return;
    }
    if (!existing) {
      setSessions((prev) => ({ ...prev, [issue.url]: { issue, plan: null, done: [], messages: [] } }));
    }
    void fetchPlan(issue);
  }

  async function send(text: string) {
    if (!active) return;
    const ref = findIssueUrl(text);
    if (ref && ref.url !== active.issue.url) {
      openIssue(issues.find((i) => i.url === ref.url) ?? issueFromRef(ref));
      return;
    }
    if (!ref && isPullRequestUrl(text)) {
      setPlanError("That's a pull request link. Paste an issue link (…/issues/123) to switch issues.");
      return;
    }
    const pick = /^\s*(?:issue\s*)?#?(\d{1,6})\s*$/i.exec(text);
    if (pick) {
      const n = Number(pick[1]);
      const target = issues.find((i) => i.number === n) ?? (n >= 1 && n <= issues.length ? issues[n - 1] : undefined);
      if (target) {
        if (target.url !== active.issue.url) openIssue(target);
        return;
      }
      setPlanError(`There's no issue #${n} in your list. Paste its full URL instead.`);
      return;
    }

    const url = active.issue.url;
    const userMsg: ChatMessage = { role: "user", content: text };
    const messages = [...active.messages, userMsg];
    updateSession(url, (s) => ({ ...s, messages }));
    const history: ChatMessage[] = [
      ...(active.plan ? [{ role: "assistant" as const, content: active.plan.raw }] : []),
      ...messages.slice(-(HISTORY_LIMIT - 1)),
    ];

    const ctrl = begin("chat");
    setPlanError("");
    try {
      await wake(ctrl.signal);
      const res = await api.chat(`https://github.com/${active.issue.repo}`, url, history, skills, ctrl.signal);
      const reply = (res.reply ?? "").trim() || "Sorry, I didn't get a reply that time. Try asking again.";
      updateSession(url, (s) => ({ ...s, messages: [...s.messages, { role: "assistant", content: reply }] }));
    } catch (e) {
      if (isAbort(e)) return;
      noteFailure(e);
      setPlanError(`Your message wasn't answered: ${errorText(e)}`);
    } finally {
      finish(ctrl);
    }
  }

  function goTab(id: "setup" | "issues" | "plan") {
    if (busy === "scan") cancelScan();
    setError("");
    setStage(id);
  }

  // ---------- render ----------
  const headerRepo =
    stage === "plan" && active ? parseRepo(active.issue.repo) : stage === "setup" ? repo : (searchedRepo ?? repo);

  return (
    <div className="app">
      <Header
        repo={headerRepo}
        stage={stage}
        status={status}
        helpOpen={helpOpen}
        onToggleHelp={() => setHelpOpen((o) => !o)}
        onTab={goTab}
        tabs={[
          { id: "setup", label: "Setup", enabled: true },
          { id: "issues", label: "Issues", count: hasSearched ? issues.length : undefined, enabled: hasSearched },
          { id: "plan", label: "Plan", enabled: !!active },
        ]}
      />
      <main className="container">
        {helpOpen && (
          <HelpPanel
            onClose={() => setHelpOpen(false)}
            onReplayTips={() => {
              setHints(ALL_HINTS);
              setHelpOpen(false);
            }}
          />
        )}

        {status === "offline" && stage !== "scanning" && (
          <div style={{ marginBottom: 16 }}>
            <Flash kind="error" title="Can't reach the backend">
              It may be restarting. Your work is saved in this tab — try again in a minute.
            </Flash>
          </div>
        )}

        {error && (stage === "setup" || stage === "issues") && (
          <div style={{ marginBottom: 16 }}>
            <Flash kind="error" title="Couldn't find issues" onDismiss={() => setError("")}>
              {error}
            </Flash>
          </div>
        )}

        {stage === "setup" && (
          <SetupView
            repoInput={repoInput}
            onRepoInput={setRepoInput}
            repo={repo}
            skills={skills}
            onSkills={setSkills}
            onFind={find}
            busy={busy !== null}
            hasSearched={hasSearched}
            showWelcome={hints.welcome}
            onDismissWelcome={() => setHints((h) => ({ ...h, welcome: false }))}
            onOpenHelp={() => setHelpOpen(true)}
          />
        )}

        {stage === "scanning" && (
          <ScanView
            repoName={repo?.fullName ?? "repository"}
            skillCount={skills.length}
            status={status}
            wakeAttempt={wakeAttempt}
            onCancel={cancelScan}
          />
        )}

        {stage === "issues" && (
          <IssuesView
            issues={issues}
            repo={searchedRepo}
            skills={skills}
            message={recMessage}
            onPick={openIssue}
            onSearchAgain={find}
            onEditSkills={() => goTab("setup")}
            showHint={hints.issues}
            onDismissHint={() => setHints((h) => ({ ...h, issues: false }))}
          />
        )}

        {stage === "plan" && active && (
          <PlanView
            key={active.issue.url}
            session={active}
            planLoading={busy === "plan"}
            sending={busy === "chat"}
            error={planError}
            onRetryPlan={() => fetchPlan(active.issue)}
            onDismissError={() => setPlanError("")}
            onToggleStep={(i) =>
              updateSession(active.issue.url, (s) => {
                const done = [...s.done];
                done[i] = !done[i];
                return { ...s, done };
              })
            }
            onSend={send}
            otherIssues={issues.filter((i) => i.url !== active.issue.url)}
            onPick={openIssue}
            onBack={() => goTab("issues")}
            canGoBack={hasSearched}
            showHint={hints.plan}
            onDismissHint={() => setHints((h) => ({ ...h, plan: false }))}
          />
        )}
      </main>
    </div>
  );
}
