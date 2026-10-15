import { useEffect, useRef, useState } from "react";
import * as api from "../lib/api";
import { isComplete, type AISettings } from "../lib/aiSettings";
import { PROVIDERS, detectProvider, pickDefaultModel, providerInfo, type ProviderId } from "../lib/providers";
import { AlertIcon, CheckCircleIcon, SpinnerIcon, XIcon } from "./Icons";

type Check = { state: "idle" } | { state: "running" } | { state: "ok"; text: string } | { state: "error"; text: string };

const EMPTY: AISettings = { provider: "gemini", apiKey: "", model: "", baseUrl: "", remember: true };

export function AISettingsDialog({
  open,
  initial,
  reason,
  onSave,
  onClear,
  onClose,
}: {
  open: boolean;
  initial: AISettings | null;
  /** Why the dialog opened (e.g. a rejected key), shown at the top. */
  reason?: string;
  onSave: (s: AISettings) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<AISettings>(initial ?? EMPTY);
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsState, setModelsState] = useState<Check>({ state: "idle" });
  const [check, setCheck] = useState<Check>({ state: "idle" });

  const info = providerInfo(draft.provider)!;
  const detected = detectProvider(draft.apiKey);
  const canQuery = !!draft.apiKey.trim() && (draft.provider !== "custom" || /^https:\/\//.test(draft.baseUrl.trim()));

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setDraft(initial ?? EMPTY);
      setModels([]);
      setModelsState({ state: "idle" });
      setCheck({ state: "idle" });
      setShowKey(false);
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open, initial]);

  // Load the provider's model list shortly after a key is entered.
  useEffect(() => {
    if (!open || !canQuery) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setModelsState({ state: "running" });
      try {
        const res = await api.llmModels(draft, ctrl.signal);
        const list = res.models ?? [];
        setModels(list);
        setModelsState({ state: "ok", text: `${list.length} models available` });
        setDraft((d) => (d.model && list.includes(d.model) ? d : { ...d, model: d.model || pickDefaultModel(info, list) }));
      } catch (e) {
        if (e instanceof api.ApiError && e.kind === "aborted") return;
        setModels([]);
        setModelsState({ state: "error", text: e instanceof Error ? e.message : "Couldn't load models." });
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [open, draft.provider, draft.apiKey, draft.baseUrl]);

  function update(patch: Partial<AISettings>) {
    setDraft((d) => ({ ...d, ...patch }));
    setCheck({ state: "idle" });
  }

  function setProvider(id: ProviderId) {
    update({ provider: id, model: "" });
    setModels([]);
    setModelsState({ state: "idle" });
  }

  async function test() {
    setCheck({ state: "running" });
    try {
      const res = await api.llmCheck(draft);
      setCheck({ state: "ok", text: `Connected to ${res.provider ?? info.label} · ${res.model ?? draft.model}` });
    } catch (e) {
      setCheck({ state: "error", text: e instanceof Error ? e.message : "The test failed." });
    }
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="ai-title">
      <form
        method="dialog"
        className="dialog-inner"
        onSubmit={(e) => {
          e.preventDefault();
          if (isComplete(draft)) onSave({ ...draft, apiKey: draft.apiKey.trim(), model: draft.model.trim(), baseUrl: draft.baseUrl.trim() });
        }}
      >
        <div className="dialog-header">
          <h2 id="ai-title" style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>AI provider</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="dialog-body stack">
          {reason && (
            <div className="flash error" role="alert">
              <AlertIcon />
              <div className="flash-body">{reason}</div>
            </div>
          )}
          <p className="muted">
            FirstPR's mentor runs on <strong style={{ color: "var(--fg)" }}>your own API key</strong> from any provider below.
            Finding and ranking issues works without one; plans and the mentor chat need it.
          </p>

          <div className="field">
            <label htmlFor="ai-provider">Provider</label>
            <select id="ai-provider" className="input" value={draft.provider} onChange={(e) => setProvider(e.target.value as ProviderId)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <span className="small muted">
              {info.note ? `${info.note} ` : ""}
              {info.keyUrl && (
                <a href={info.keyUrl} target="_blank" rel="noopener noreferrer">
                  Get a {info.label} key →
                </a>
              )}
            </span>
          </div>

          {draft.provider === "custom" && (
            <div className="field">
              <label htmlFor="ai-base">Base URL</label>
              <input
                id="ai-base"
                className="input mono"
                placeholder="https://api.example.com/v1"
                value={draft.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                spellCheck={false}
              />
              <span className="small muted">The URL before /chat/completions. Must be public https.</span>
            </div>
          )}

          <div className="field">
            <label htmlFor="ai-key">API key</label>
            <div className="row" style={{ flexWrap: "nowrap", gap: 8, maxWidth: 480 }}>
              <input
                id="ai-key"
                className="input mono"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder={info.placeholder}
                value={draft.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              <button type="button" className="btn" onClick={() => setShowKey((s) => !s)} aria-pressed={showKey}>
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            {detected && detected !== draft.provider && (
              <span className="small" style={{ color: "var(--attention)" }}>
                This looks like a {providerInfo(detected)!.label} key.{" "}
                <button type="button" className="link-btn" style={{ color: "var(--accent)" }} onClick={() => setProvider(detected)}>
                  Switch to {providerInfo(detected)!.label}
                </button>
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="ai-model">Model</label>
            <input
              id="ai-model"
              className="input mono"
              list="ai-models"
              placeholder={canQuery ? "Pick or type a model ID" : "Enter a key to load models"}
              value={draft.model}
              onChange={(e) => update({ model: e.target.value })}
              spellCheck={false}
              autoComplete="off"
            />
            <datalist id="ai-models">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <span className="small row" style={{ gap: 6 }}>
              {modelsState.state === "running" && (
                <>
                  <SpinnerIcon size={12} /> <span className="muted">Loading models…</span>
                </>
              )}
              {modelsState.state === "ok" && <span className="muted">{modelsState.text}. Clear the field to see them all.</span>}
              {modelsState.state === "error" && <span style={{ color: "var(--danger)" }}>{modelsState.text}</span>}
            </span>
          </div>

          <label className="row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={draft.remember} onChange={(e) => update({ remember: e.target.checked })} style={{ marginTop: 4 }} />
            <span>
              Remember on this device
              <span className="small muted" style={{ display: "block" }}>
                Stored only in this browser. Untick to keep it for this tab only.
              </span>
            </span>
          </label>

          <div className="row" style={{ gap: 12 }}>
            <button type="button" className="btn" onClick={test} disabled={!isComplete(draft) || check.state === "running"}>
              {check.state === "running" ? <SpinnerIcon /> : null}
              Test connection
            </button>
            {check.state === "ok" && (
              <span className="row small" style={{ color: "var(--success)", gap: 6 }}>
                <CheckCircleIcon size={14} /> {check.text}
              </span>
            )}
            {check.state === "error" && (
              <span className="small" style={{ color: "var(--danger)" }} role="alert">
                {check.text}
              </span>
            )}
          </div>

          <p className="small muted" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            Your key travels over HTTPS with each mentor request to the FirstPR backend, which passes it to {info.label} for
            that request only. The server never stores or logs it.
          </p>
        </div>

        <div className="dialog-footer">
          {initial && (
            <button type="button" className="btn" onClick={onClear} style={{ marginRight: "auto", color: "var(--danger)" }}>
              Remove key
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!isComplete(draft)}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
