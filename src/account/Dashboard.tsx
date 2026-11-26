"use client";
// /dashboard/ and /es/dashboard/ (rvp-accounts.md screen 3 and its updates; site-roles.md section 3 and update A). A
// shell: nothing private is in the build, everything loads after sign-in from `me`.
// Order: the lead block (the "Take the personality test" card, or "Continue the test" when a half-finished test is in
// this tab, or the latest result card, always in the same place and the same minimum height), earlier takes, your data
// (download, delete), sign out. Export and delete need a code from the last 5 minutes: on {error:"fresh"} the page asks
// for a new one in place, then runs the same step again.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RvpResult } from "@/rvp/RvpResult";
import { ANSWERS_KEY, BANK } from "@/rvp/data";
import { call, decline as declineAccount, fill, getSession, isMe, me, recordSiteConsent, requestCode, setNote, setSession, signOut, siteConsentNeeded, type Lang, type Me, type Take } from "./api";
import { BeforeYouStart } from "./BeforeYouStart";
import { CodeStep } from "./CodeStep";
import { BusyButton, ErrorLine, type S } from "./ui";

type Links = { signin: string; test: string; take: string; home: string; privacy: string };
const fragmentOf = (t: Take) => `v=${encodeURIComponent(t.bank_version)}&a=${t.answers}`;

/** A new code for export or delete (sent with login, checked with verify), then the step runs again. */
function FreshCode({ lang, s, email, since, onDone }: { lang: Lang; s: S; email: string; since: number; onDone: () => void }) {
  const [sent, setSent] = useState(false);
  useEffect(() => {
    // `t` is the time since the page was drawn; the function drops anything under 3 s, so wait out the rest if needed.
    const t = setTimeout(() => { void requestCode("login", lang, email, "", Date.now() - since).then(() => setSent(true)); }, Math.max(0, 3100 - (Date.now() - since)));
    return () => clearTimeout(t);
  }, [lang, email, since]);
  return (
    <div className="acct-fresh">
      <p className="ds-body-medium" role="status">{s.freshNeeded}</p>
      {sent ? <CodeStep lang={lang} s={s} email={email} path="login" intro={s.codeSent} submitLabel={s.continue} onVerified={onDone} />
        : <div className="ds-skeleton acct-fresh-hold" aria-busy="true" />}
    </div>
  );
}

export function Dashboard({ lang, s, rvp, links }: { lang: Lang; s: S; rvp: Record<string, string>; links: Links }) {
  const router = useRouter();
  const [data, setData] = useState<Me | null>(null);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shown, setShown] = useState(0); // which take the result card shows (0 = latest)
  const [deleted, setDeleted] = useState<"" | "done" | "manual" | "declined">("");
  const [fresh, setFresh] = useState<"" | "export" | "delete">("");
  const [note, setNoteText] = useState("");
  const [busy, setBusy] = useState<"" | "export" | "delete">("");
  const [word, setWord] = useState("");
  const [wordErr, setWordErr] = useState("");
  const opened = useRef(Date.now());
  const dialog = useRef<HTMLDialogElement>(null), delBtn = useRef<HTMLButtonElement>(null), h1 = useRef<HTMLHeadingElement>(null);
  const date = (iso: string) => new Intl.DateTimeFormat(lang === "es" ? "es-419" : "en", { dateStyle: "long" }).format(new Date(iso));

  const lost = useCallback(() => { setNote("lost"); setSession(null); router.replace(links.signin); }, [router, links.signin]);
  const load = useCallback(async () => {
    setFailed(false);
    const m = await me(lang);
    if (isMe(m)) { setData(m); return; }
    if ((m as { error?: string }).error === "signin") return lost();
    setFailed(true);
  }, [lang, lost]);

  useEffect(() => {
    if (!getSession()) { router.replace(links.signin); return; }
    try {
      const a = JSON.parse(sessionStorage.getItem(ANSWERS_KEY) ?? "null");
      if (a && typeof a === "object") setProgress(Object.keys(a).length);
    } catch { /* fine */ }
    h1.current?.focus();
    void load();
  }, [load, router, links.signin]);

  async function exportData() {
    if (busy) return;
    setBusy("export"); setNoteText("");
    const r = await call("export", lang);
    setBusy("");
    if (r.error === "fresh") { setFresh("export"); return; }
    if (r.error === "signin") return lost();
    if (!r.ok) { setNoteText(s.loadErr); return; }
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "rodmjay-account.json"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFresh(""); setNoteText(s.downloaded);
  }

  const openDelete = () => { setWord(""); setWordErr(""); setFresh(""); dialog.current?.showModal(); };
  const closeDelete = () => { dialog.current?.close(); };
  async function deleteAccount(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    const w = word.trim().toUpperCase();
    if (w !== "DELETE" && w !== "BORRAR") { setWordErr(s.delErr); (document.getElementById("acct-del-word") as HTMLInputElement | null)?.focus(); return; }
    setBusy("delete");
    const r = await call("delete", lang, { confirm: w });
    setBusy("");
    if (r.error === "fresh") { setFresh("delete"); return; }
    if (r.error === "signin") return lost();
    if (!r.ok) { setWordErr(s.loadErr); return; }
    dialog.current?.close();
    setSession(null);
    setDeleted(r.state === "manual" ? "manual" : "done");
  }
  async function out() { await signOut(lang); setNote("out"); router.push(links.test); }
  async function declined() { await declineAccount(lang); setDeleted("declined"); }

  if (deleted) {
    return (
      <div className="acct-dash">
        <h1 className="ds-headline-medium" tabIndex={-1} ref={h1}>{deleted === "declined" ? s.declined : s.deleted}</h1>
        {deleted !== "declined" ? <p className="ds-body-large">{s.deletedBackups}</p> : null}
        {deleted === "manual" ? <p className="ds-body-medium">{s.deletedManual}</p> : null}
        <p><Link href={links.home}>{s.home}</Link></p>
      </div>
    );
  }

  const results = data?.results ?? [];
  const take = results[shown] ?? results[0];
  const name = data?.profile.first_name;

  return (
    <div className="acct-dash">
      <header className="acct-dash-head">
        <h1 className="ds-headline-medium" tabIndex={-1} ref={h1}>{s.dashTitle}</h1>
        <p className="ds-body-large ds-variant acct-who">{data ? <>{name ? <>{fill(s.hi, { name })} · </> : null}{data.profile.email}</> : <span className="ds-skeleton acct-who-hold" />}</p>
      </header>

      {failed ? (
        <div className="ds-banner error" role="alert"><p>{s.loadErr}</p><p><button type="button" className="ds-btn outlined" onClick={() => void load()}>{s.tryAgain}</button></p></div>
      ) : data && siteConsentNeeded(data) ? (
        // Someone who closed the tab at "Before you start": nothing loads until the site's box is accepted (ADR 0005).
        <section className="ds-card outlined acct-card">
          <BeforeYouStart s={s} label={siteConsentNeeded(data) === "linked" ? s.consentLinked : s.consentLead} heading="h2" title={s.bysTitle}
            submitLabel={s.continue} errorText={s.errConsentContinue} privacyHref={links.privacy}
            onAccept={async () => { const c = await recordSiteConsent(lang, siteConsentNeeded(data)!, "rodmjay.com/signin"); if (c.ok) await load(); }} onDecline={declined} />
        </section>
      ) : (
        <>
          <section className="acct-lead" aria-labelledby="acct-lead-h" aria-busy={data ? undefined : true}>
            {!data ? (
              <div className="ds-card filled acct-lead-card"><h2 id="acct-lead-h" className="sr-only">{s.dashTitle}</h2><div className="ds-skeleton acct-lead-hold" /></div>
            ) : !take ? (
              <div className="ds-card filled acct-lead-card acct-test">
                <h2 className="ds-title-large" id="acct-lead-h">{s.leadTitle}</h2>
                <p className="ds-body-large">{progress > 0 ? fill(s.onQuestion, { i: Math.min(progress + 1, BANK.questions.length), n: BANK.questions.length }) : s.leadBody}</p>
                <p><Link href={progress > 0 ? links.take : links.test} className="ds-btn">{progress > 0 ? s.continueTest : s.takeTest}</Link></p>
              </div>
            ) : (
              <div className="ds-card outlined acct-lead-card acct-result">
                <div className="acct-result-head">
                  <h2 className="ds-title-medium" id="acct-lead-h">{fill(shown ? s.resultFrom : s.latestLabel, { date: date(take.taken_at) })}</h2>
                  <Link href={links.take} className="ds-btn">{s.retake}</Link>
                </div>
                <p className="ds-body-small ds-variant">{s.retakeNote}</p>
                {shown ? <p><button type="button" className="ds-btn text" onClick={() => setShown(0)}>{s.showLatest}</button></p> : null}
                <RvpResult key={take.id} lang={lang} s={rvp} fragment={fragmentOf(take)} />
              </div>
            )}
          </section>

          {data ? (
            <section className="acct-history" aria-labelledby="acct-hist-h">
              <h2 className="ds-title-large" id="acct-hist-h">{s.earlierTitle}</h2>
              {results.length > 1 ? (
                <ul role="list" className="acct-takes">
                  {results.slice(1).map((t, i) => (
                    <li key={t.id}>
                      <span className="ds-body-medium">{date(t.taken_at)}</span>
                      <span className="ds-body-small ds-variant">{fill(s.version, { v: t.bank_version })}</span>
                      <button type="button" className="ds-btn text" aria-label={fill(s.viewLabel, { date: date(t.taken_at), v: t.bank_version })}
                        onClick={() => { setShown(i + 1); requestAnimationFrame(() => document.getElementById("acct-lead-h")?.scrollIntoView()); }}>{s.view}</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="ds-body-medium ds-variant">{s.earlierEmpty}</p>}
            </section>
          ) : null}
        </>
      )}

      {data ? (
        <section className="ds-card outlined acct-card acct-data" aria-labelledby="acct-data-h">
          <h2 className="ds-title-large" id="acct-data-h">{s.dataTitle}</h2>
          <div className="acct-data-row">
            <p className="ds-body-medium">{s.downloadWords}</p>
            <BusyButton type="button" className="ds-btn outlined" busy={busy === "export"} onClick={exportData}>{s.download}</BusyButton>
          </div>
          {fresh === "export" ? <FreshCode lang={lang} s={s} email={data.profile.email} since={opened.current} onDone={exportData} /> : null}
          <p className="ds-body-small" aria-live="polite">{note}</p>
          <div className="acct-data-row">
            <p className="ds-body-medium">{s.deleteWords}</p>
            <button ref={delBtn} type="button" className="ds-btn outlined acct-danger" onClick={openDelete}>{s.deleteBtn}</button>
          </div>
        </section>
      ) : null}

      <p><button type="button" className="ds-btn text" onClick={out}>{s.signOut}</button></p>

      <dialog ref={dialog} className="ds-dialog" aria-labelledby="acct-del-h" onClose={() => delBtn.current?.focus()}>
        {fresh === "delete" && data ? (
          // A new code first (the delete needs one from the last 5 minutes); then the same delete runs again.
          <div className="ds-dialog-body">
            <h2 id="acct-del-h">{s.delTitle}</h2>
            <FreshCode lang={lang} s={s} email={data.profile.email} since={opened.current} onDone={() => void deleteAccount()} />
            <div className="ds-dialog-actions"><button type="button" className="ds-btn outlined" onClick={closeDelete}>{s.cancel}</button></div>
          </div>
        ) : (
          <form className="ds-dialog-body" noValidate onSubmit={deleteAccount}>
            <h2 id="acct-del-h">{s.delTitle}</h2>
            <p>{s.delBody}</p>
            <div className="ds-field">
              <label htmlFor="acct-del-word">{s.delLabel}</label>
              <input className="ds-input" id="acct-del-word" type="text" autoComplete="off" autoCapitalize="characters" value={word}
                onChange={(e) => { setWord(e.target.value); setWordErr(""); }} aria-invalid={wordErr ? true : undefined} aria-describedby="acct-del-err" />
              <ErrorLine id="acct-del-err" text={wordErr} />
            </div>
            <div className="ds-dialog-actions">
              <button type="button" className="ds-btn outlined" autoFocus onClick={closeDelete}>{s.cancel}</button>
              <BusyButton className="ds-btn error" busy={busy === "delete"}>{s.deleteBtn}</BusyButton>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
