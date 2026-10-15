import type { ReactNode } from "react";
import { AlertIcon, InfoIcon, SpinnerIcon, XIcon } from "./Icons";
import { FIT_LABEL, fitTone, labelStyle } from "../lib/labels";

type FlashKind = "info" | "warn" | "error";

export function Flash({
  kind = "info",
  title,
  children,
  onDismiss,
  dismissLabel,
  actions,
}: {
  kind?: FlashKind;
  title?: ReactNode;
  children?: ReactNode;
  onDismiss?: () => void;
  /** Text button ("Got it") instead of the default × icon. */
  dismissLabel?: string;
  actions?: ReactNode;
}) {
  const Icon = kind === "error" ? AlertIcon : kind === "warn" ? SpinnerIcon : InfoIcon;
  return (
    <div className={`flash ${kind === "info" ? "" : kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon />
      <div className="flash-body">
        {title && <span className="strong">{title}</span>}
        {children}
        {actions && <div className="row" style={{ marginTop: 4 }}>{actions}</div>}
      </div>
      {onDismiss &&
        (dismissLabel ? (
          <button type="button" className="btn btn-sm" onClick={onDismiss}>
            {dismissLabel}
          </button>
        ) : (
          <button type="button" className="icon-btn" onClick={onDismiss} aria-label="Dismiss" style={{ margin: "-6px -8px 0 0" }}>
            <XIcon />
          </button>
        ))}
    </div>
  );
}

export function Label({ name }: { name: string }) {
  return (
    <span className="label" style={labelStyle(name)}>
      {name}
    </span>
  );
}

export function FitMeter({ fit }: { fit: number | null }) {
  const tone = fitTone(fit);
  if (fit == null) return <span className="small muted">{FIT_LABEL.unknown}</span>;
  const pct = Math.round(fit * 100);
  return (
    <span className="row small muted" style={{ gap: 8, flexWrap: "nowrap" }}>
      <span className="meter" style={{ width: 64 }} role="img" aria-label={`Fit ${pct} percent`}>
        <span className={`bg-${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`tone-${tone} strong`}>{pct}%</span>
      <span>{FIT_LABEL[tone]}</span>
    </span>
  );
}

export function TypingDots() {
  return (
    <span className="dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}
