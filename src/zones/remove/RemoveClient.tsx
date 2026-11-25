"use client";
// The two interactive parts of "Remove my information" (Designer's spec design/specs/rodmjay-remove-info.md). Posts JSON
// to the erase-request Edge Function (Database Administrator; database/designs/erasure-request.md). The form always gets
// {ok:true}; the link is /remove/confirm/#<token> (a fragment, so the token never reaches a log). Nothing here says whether
// anything was held. The confirm page never deletes on load (mail scanners). On localhost ?mock=... fakes the replies.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PRIVACY_EMAIL_PUBLIC } from "@/lib/public";

const API = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/erase-request";
type T = Record<string, string>;
const mock = () => (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? new URLSearchParams(location.search).get("mock") : null);
const post = (body: object) => fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d={d} /></svg>;
const CHECK = "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z";
const ALERT = "M12 2 1 21h22zm1 15h-2v-2h2zm0-4h-2v-4h2z";

export function RemoveForm({ t }: { lang: string; t: T }) {
  const started = useRef(Date.now());
  const form = useRef<HTMLFormElement>(null);
  const sentBox = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const val = (n: string) => ((form.current?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBanner("");
    const email = val("email").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr(t.errEmail); (form.current!.elements.namedItem("email") as HTMLInputElement).focus(); return; }
    setErr("");
    setBusy(true);
    const run = mock() ? new Promise<{ ok?: boolean; rate?: boolean }>((r) => setTimeout(() => r({ ok: mock() !== "err", rate: mock() === "rate" }), 400))
      : post({ email, name: val("name").trim() || null, hp: val("website"), t: started.current }).then(async (r) => ({ ...(await r.json()), rate: r.status === 429 }));
    run.then((res) => {
      if (res && res.rate) { setBanner(t.rateBanner); return; }
      if (res && res.ok) { setSent(true); requestAnimationFrame(() => sentBox.current?.focus()); return; }
      throw res;
    }).catch(() => setBanner(t.serverError)).then(() => setBusy(false));
  }

  return (
    <div className="rbox">
      {!sent ? (
        <form ref={form} noValidate onSubmit={onSubmit} className="ds-card outlined">
          <div className="rgrid">
            <div className="ds-field">
              <label htmlFor="rm-email">{t.email}</label>
              <input className="ds-input" id="rm-email" name="email" type="email" autoComplete="email" required aria-describedby="rm-email-err" aria-invalid={err ? true : undefined} />
              <p className="ds-supporting" id="rm-email-err" hidden={!err}>{err}</p>
            </div>
            <div className="ds-field">
              <label htmlFor="rm-name">{t.name}</label>
              <input className="ds-input" id="rm-name" name="name" type="text" autoComplete="name" />
            </div>
          </div>
          <div className="hp" aria-hidden="true"><label htmlFor="rm-website">Leave this empty</label><input id="rm-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
          <div className="ds-banner error" role="alert" hidden={!banner}><p>{banner}</p></div>
          <button className="ds-btn" type="submit" aria-busy={busy || undefined}>{busy ? t.sending : t.submit}</button>
        </form>
      ) : (
        <>
          <div className="ds-banner primary" role="status" tabIndex={-1} ref={sentBox}>
            <p><strong>{t.sentTitle}</strong> {t.sent}</p>
          </div>
          <p><button type="button" className="ds-btn text" onClick={() => setSent(false)}>{t.differentEmail}</button></p>
        </>
      )}
    </div>
  );
}

type View = "reading" | "valid" | "bad" | "received" | "error" | "rate";

export function ConfirmRemoval({ t, requestHref, homeHref }: { lang: string; t: T; requestHref: string; homeHref: string }) {
  const [view, setView] = useState<View>("reading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const token = useRef("");
  const head = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    token.current = decodeURIComponent(location.hash.slice(1));
    // The token is in the fragment; drop it from the address bar so it isn't left in history.
    if (token.current) history.replaceState(null, "", location.pathname + location.search);
    const m = mock();
    if (m) { setEmail("ana@example.test"); setView(m === "ok" || m === "valid" ? "valid" : (m as View)); return; }
    if (!token.current) { setView("bad"); return; }
    post({ action: "peek", token: token.current }).then((r) => r.json()).then((res) => {
      if (res.state === "valid") { setEmail(String(res.email || "")); setView("valid"); } else setView("bad");
    }).catch(() => setView("error"));
  }, []);
  useEffect(() => { if (view !== "reading") head.current?.focus(); }, [view]);

  function confirm() {
    if (busy) return;
    setBusy(true);
    const run = mock() ? new Promise<{ state: string }>((r) => setTimeout(() => r({ state: "done" }), 400))
      : post({ action: "confirm", token: token.current }).then((r) => r.json());
    // "done" is shown to everyone as the neutral "received" text: the full Done wording goes only in the email, after the erasure ran (Legal 11/24).
    run.then((res) => setView(res.state === "done" ? "received" : res.state === "rate_limited" ? "rate" : "bad"))
      .catch(() => setView("error")).then(() => setBusy(false));
  }

  const title = view === "valid" ? t.confirmAsk.replace("{email}", "\u0000") : view === "received" ? t.doneTitle : view === "bad" ? t.badLink : view === "rate" ? t.rateBanner : view === "error" ? t.errorTitle : t.reading;
  const [pre, post_] = title.split("\u0000");
  return (
    <div className="rbox">
      <h1 className="ds-headline-medium project-title" tabIndex={-1} ref={head}>
        {view === "valid" ? <>{pre}<strong>{email}</strong>{post_}</> : title}
      </h1>
      <div role={view === "error" ? "alert" : "status"} aria-live="polite">
        {view === "valid" && (
          <>
            <p className="ds-body-large">{t.confirmCovers}</p>
            <div className="confirm-actions">
              <Link className="ds-btn outlined" href={homeHref}>{t.keepBtn}</Link>
              <button className="ds-btn error" type="button" onClick={confirm} aria-busy={busy || undefined}>{t.confirmBtn}</button>
            </div>
          </>
        )}
        {view === "received" && (
          <>
            <div className="ds-banner primary"><Icon d={CHECK} /><p>{t.received}</p></div>
            <p><Link href={homeHref}>{t.back}</Link></p>
          </>
        )}
        {(view === "bad" || view === "rate") && (
          <>
            <div className="ds-banner warning"><Icon d={ALERT} /><p>{view === "rate" ? t.rateBanner : t.badLink}</p></div>
            <p><Link className="ds-btn tonal" href={requestHref}>{t.getLink}</Link></p>
          </>
        )}
        {view === "error" && (
          <>
            <div className="ds-banner error"><Icon d={ALERT} /><p>{t.errorTitle}</p></div>
            <p><button className="ds-btn outlined" type="button" onClick={() => location.reload()}>{t.tryAgain}</button> <a href={`mailto:${PRIVACY_EMAIL_PUBLIC}`}>{PRIVACY_EMAIL_PUBLIC}</a></p>
          </>
        )}
      </div>
    </div>
  );
}
