"use client";
// The 8-digit code step (rvp-accounts.md screen 2), the same on the result page, /signin/ and the fresh-code check on the
// dashboard. One input, not eight boxes: numeric, one-time-code, pasting strips spaces, the eighth digit submits.
// The function answers every failure the same way (wrong, dead, too many: {error:"code"}), so the page counts tries
// itself and knows the code's age: 5 wrong tries (the server's limit) or 10 minutes and it asks for a new code.
// Resend after 30 seconds, with the countdown in words; the live region speaks only when it becomes available.
import { useEffect, useRef, useState } from "react";
import { requestCode, verify, fill, type Lang } from "./api";
import { BusyButton, ErrorLine, type S } from "./ui";

const TRIES = 5, LIFE_MS = 10 * 60_000, RESEND_S = 30;

export function CodeStep({ lang, s, email, path, intro, submitLabel, onVerified, onChangeEmail }: {
  lang: Lang; s: S; email: string; path: "start" | "login"; intro: string; submitLabel: string;
  onVerified: () => void; onChangeEmail?: () => void;
}) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<"" | "wrong" | "tooMany" | "expired" | "server">("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(RESEND_S);
  const [said, setSaid] = useState("");
  const tries = useRef(0), issued = useRef(Date.now()), opened = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null), resendBtn = useRef<HTMLButtonElement>(null);
  const dead = err === "tooMany" || err === "expired";

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => { setLeft((n) => n - 1); if (left === 1) setSaid(s.resendReady); }, 1000);
    return () => clearTimeout(t);
  }, [left, s.resendReady]);

  async function submit(value = code) {
    if (busy || dead) return;
    if (Date.now() - issued.current > LIFE_MS) { setErr("expired"); return; }
    if (!/^\d{8}$/.test(value)) { setErr("wrong"); input.current?.focus(); return; }
    setBusy(true);
    const r = await verify(lang, email, value);
    setBusy(false);
    if (r === "ok") return onVerified();
    if (r === "network") { setErr("server"); return; }
    tries.current += 1;
    if (Date.now() - issued.current > LIFE_MS) setErr("expired");
    else if (tries.current >= TRIES) setErr("tooMany");
    else { setErr("wrong"); requestAnimationFrame(() => { input.current?.focus(); input.current?.select(); }); }
  }

  async function resend() {
    if (busy) return;
    setBusy(true);
    await requestCode(path, lang, email, "", Date.now() - opened.current);
    setBusy(false);
    tries.current = 0; issued.current = Date.now();
    setErr(""); setCode(""); setLeft(RESEND_S); setSaid(s.resent);
    requestAnimationFrame(() => input.current?.focus());
  }

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
    setCode(v);
    if (err === "wrong" || err === "server") setErr("");
    if (v.length === 8) void submit(v);
  };
  const errText = err === "wrong" ? s.errCode : err === "tooMany" ? s.errTooMany : err === "expired" ? s.errExpired : err === "server" ? s.serverError : "";

  return (
    <div className="acct-step">
      <h2 className="ds-title-large">{s.codeTitle}</h2>
      <p className="ds-body-large">{fill(intro, { email })}</p>
      {onChangeEmail ? <p className="acct-line"><button type="button" className="ds-btn text acct-inline-btn" onClick={onChangeEmail}>{s.changeEmail}</button></p> : null}
      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }} className="acct-form">
        {!dead ? (
          <div className="ds-field">
            <label htmlFor="acct-code">{s.codeLabel}</label>
            <input ref={input} className="ds-input acct-code" id="acct-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code"
              maxLength={8} pattern="[0-9]*" value={code} onChange={onInput} onPaste={(e) => {
                e.preventDefault();
                onInput({ target: { value: e.clipboardData.getData("text") } } as React.ChangeEvent<HTMLInputElement>);
              }} aria-invalid={err === "wrong" ? true : undefined} aria-describedby="acct-code-err" />
          </div>
        ) : null}
        <ErrorLine id="acct-code-err" text={errText} />
        {!dead ? <BusyButton busy={busy}>{submitLabel}</BusyButton> : null}
      </form>
      <div className="acct-resend">
        {left > 0 && !dead ? <p className="ds-body-small ds-variant">{fill(s.resendIn, { s: left })}</p>
          : <button ref={resendBtn} type="button" className="ds-btn outlined" onClick={resend} aria-busy={dead && busy ? true : undefined}>{s.resend}</button>}
        <p className="ds-body-small ds-variant" aria-live="polite">{said}</p>
      </div>
      <p className="ds-body-small ds-variant">{s.notThere}</p>
    </div>
  );
}
