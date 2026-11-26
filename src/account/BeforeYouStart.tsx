"use client";
// "Before you start" (site-roles.md section 2): after the code, the first time, before anything loads. One required box,
// unticked, with Compliance's exact words (recorded on the server with its source, date and the hash of these words;
// tests/consent-hashes.mjs pins them): the linked box or the sign-in box (ADR 0005), or ADR 0004's results box.
// Continue records it; "No thanks, sign me out" (site boxes only) deletes the account that was just made and signs out.
import { useRef, useState, type ReactNode } from "react";
import { BusyButton, ConsentBox, type S } from "./ui";

export function BeforeYouStart({ s, label, heading, title, submitLabel, errorText, privacyHref, onAccept, onDecline, children }: {
  s: S; label: string; heading: "h1" | "h2"; title: string; submitLabel: string; errorText: string; privacyHref: string;
  onAccept: () => Promise<void>; onDecline?: () => Promise<void>; children?: ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"" | "accept" | "decline">("");
  const box = useRef<HTMLInputElement>(null);
  const H = heading;

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!checked) { setErr(errorText); box.current?.focus(); return; }
    setBusy("accept");
    try { await onAccept(); } finally { setBusy(""); }
  }
  async function decline() {
    if (busy || !onDecline) return;
    setBusy("decline");
    try { await onDecline(); } finally { setBusy(""); }
  }

  return (
    <form className="acct-step acct-form" noValidate onSubmit={accept}>
      <H className={heading === "h1" ? "ds-headline-medium" : "ds-title-large"} tabIndex={-1}>{title}</H>
      {children}
      <ConsentBox id="acct-bys" label={label} error={err} checked={checked} boxRef={box}
        onChange={(v) => { setChecked(v); if (v) setErr(""); }} privacyHref={privacyHref} privacyLabel={s.privacyLink} />
      <div className="rvp-actions">
        <BusyButton busy={busy === "accept"}>{submitLabel}</BusyButton>
        {onDecline ? <BusyButton type="button" className="ds-btn outlined" busy={busy === "decline"} onClick={decline}>{s.decline}</BusyButton> : null}
      </div>
    </form>
  );
}
