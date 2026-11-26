"use client";
// Small pieces every account screen shares (Designer's spec design/specs/rvp-accounts.md, "Rules for all four screens"):
// inline errors with an icon and words (never color alone, focus moves to them), the one long consent box with its
// separate "Privacy details" link, and a busy button that keeps its label and width.
import Link from "next/link";
import type { ReactNode, RefObject } from "react";

export type S = Record<string, string>;
const ALERT = "M12 2 1 21h22zm1 15h-2v-2h2zm0-4h-2v-4h2z";
export const CHECK = "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z";

export const Icon = ({ d, className }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d={d} /></svg>
);

/** An inline error: icon plus words, announced (role="alert"). Rendered empty-and-hidden so ids stay stable. */
export function ErrorLine({ id, text }: { id: string; text: string }) {
  return (
    <p className="ds-supporting error acct-err" id={id} role="alert" hidden={!text}>
      {text ? <><Icon d={ALERT} /> <span>{text}</span></> : null}
    </p>
  );
}

/** A filled (or other) button that shows a spinner while busy. Never disabled: a second press is ignored by the caller. */
export function BusyButton({ busy, children, className = "ds-btn", type = "submit", onClick, btnRef }: {
  busy: boolean; children: ReactNode; className?: string; type?: "submit" | "button"; onClick?: () => void; btnRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button ref={btnRef} type={type} className={`${className} acct-busy-btn`} aria-busy={busy || undefined} onClick={onClick}>
      <svg className="acct-spin" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" data-on={busy ? "1" : undefined}>
        <path fill="currentColor" d="M12 4a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6z" />
      </svg>
      <span>{children}</span>
    </button>
  );
}

/** ADR 0004's one required box (Compliance's exact words), unchecked by default. The whole label is the click target;
 *  "Privacy details" sits on its own line under it, outside the label, so it never toggles the box. */
export function ConsentBox({ id, label, error, checked, onChange, privacyHref, privacyLabel, boxRef }: {
  id: string; label: string; error: string; checked: boolean; onChange: (v: boolean) => void;
  privacyHref: string; privacyLabel: string; boxRef?: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="acct-consent">
      <label className="acct-consent-row" htmlFor={id}>
        <input ref={boxRef} type="checkbox" id={id} name="consent" required aria-required="true" checked={checked}
          aria-invalid={error ? true : undefined} aria-describedby={`${id}-err`} onChange={(e) => onChange(e.target.checked)} />
        <span className="ds-body-medium">{label}</span>
      </label>
      <ErrorLine id={`${id}-err`} text={error} />
      <p className="acct-privacy"><Link href={privacyHref}>{privacyLabel}</Link></p>
    </div>
  );
}
