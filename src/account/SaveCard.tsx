"use client";
// "Save my result" under the result (rvp-accounts.md screens 1 and 2; site-roles.md update B). The result always shows
// first; this only decides what sits under it, in one card that changes in place.
// - Signed out: email, optional first name, ADR 0004's box, "Email me a code" (start). "Already saved a result? Sign in
//   instead" swaps the same card to email only (login). Both go to the same code step; after it, this result is saved
//   (a new take on an existing account) and the card says so. The person stays on the result.
// - Signed in: never an automatic save (Security and Compliance 11/26). One tap, "Save to my dashboard", saves this one
//   result. If the consent on record doesn't cover results (consentCoversResults), the tap first shows the box.
// - After a code, a person Rod linked (or, on the sign-in path, someone new) first passes the site's "Before you start"
//   box once (ADR 0005; site-roles.md B); a decline deletes the account just made and keeps nothing, this result included.
// The form is kept in sessionStorage, so "Privacy details" (same tab) and back finds it as it was.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  consentCoversResults, decline as declineAccount, emailOk, getSession, isMe, me, recordConsent, recordSiteConsent, requestCode, saveResult,
  savedFragment, siteConsentNeeded, SESSION_EVENT, type Lang, type Me,
} from "./api";
import { CodeStep } from "./CodeStep";
import { BeforeYouStart } from "./BeforeYouStart";
import { BusyButton, CHECK, ConsentBox, ErrorLine, Icon, type S } from "./ui";

type View = "loading" | "form" | "code" | "site" | "results" | "tap" | "consentTap" | "done" | "line" | "declined";
const DRAFT = "acct:draft";

export function SaveCard({ lang, s, dashHref, privacyHref }: { lang: Lang; s: S; dashHref: string; privacyHref: string }) {
  const [view, setView] = useState<View>("loading");
  const [mode, setMode] = useState<"new" | "login">("new");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [checked, setChecked] = useState(false);
  const [err, setErr] = useState<{ email?: string; consent?: string; banner?: string }>({});
  const [busy, setBusy] = useState(false);
  const [siteKind, setSiteKind] = useState<"linked" | "lead">("lead");
  const opened = useRef(Date.now());
  const fragment = useRef("");
  const who = useRef<Me | null>(null);
  const heading = useRef<HTMLHeadingElement>(null), emailInput = useRef<HTMLInputElement>(null), box = useRef<HTMLInputElement>(null);
  const card = useRef<HTMLElement>(null);

  // Signed in or not, and the form as it was before "Privacy details".
  useEffect(() => {
    fragment.current = window.location.hash.replace(/^#/, "");
    try {
      const d = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null");
      if (d) { setEmail(String(d.email ?? "")); setName(String(d.name ?? "")); if (d.mode === "login") setMode("login"); }
    } catch { /* fine */ }
    const pick = () => setView((v) => (v === "loading" || v === "form" || v === "tap" || v === "line"
      ? (getSession() ? (savedFragment() === fragment.current ? "line" : "tap") : "form") : v));
    pick();
    window.addEventListener(SESSION_EVENT, pick);
    return () => window.removeEventListener(SESSION_EVENT, pick);
  }, []);
  useEffect(() => {
    if (view === "loading") return;
    // Only what the person typed (or the swap): an untouched card leaves this tab's storage as it was.
    try { if (email || name || mode === "login") sessionStorage.setItem(DRAFT, JSON.stringify({ email, name, mode })); else sessionStorage.removeItem(DRAFT); } catch { /* fine */ }
  }, [email, name, mode, view]);

  const focusHeading = () => requestAnimationFrame(() => (card.current?.querySelector("h2, .acct-check") as HTMLElement | null)?.focus());
  const clearDraft = () => { try { sessionStorage.removeItem(DRAFT); } catch { /* fine */ } };

  /** Save this one result; what the card shows after depends on how the person got here. */
  async function save(after: "done" | "line") {
    const r = await saveResult(lang, fragment.current);
    if (r.ok) { clearDraft(); setView(after); focusHeading(); return; }
    if (r.error === "consent_required") { setView(after === "done" ? "results" : "consentTap"); focusHeading(); return; }
    if (r.error === "signin") { setView("form"); setErr({ banner: s.signedOutTry }); return; }
    setErr({ banner: r.error === "limit" ? s.saveLimit : s.saveFailed });
  }

  // ---- the form: start (new) or login (swap)
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof err = {};
    if (!emailOk(email.trim())) next.email = s.errEmail;
    if (mode === "new" && !checked) next.consent = s.errConsent;
    setErr(next);
    if (next.email) { emailInput.current?.focus(); return; }
    if (next.consent) { box.current?.focus(); return; }
    setBusy(true);
    const hp = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("input[name=website]")?.value ?? "";
    const r = await requestCode(mode === "new" ? "start" : "login", lang, email.trim(), hp, Date.now() - opened.current);
    setBusy(false);
    if (r.ok === false) { setErr({ banner: s.serverError }); return; }
    setView("code");
  }

  // ---- after the code: the site's box if it needs one, then the results box if the consent on record doesn't cover
  // results, then this one result is saved.
  async function verified() {
    const m = await me(lang);
    if (!isMe(m)) { setView("form"); setErr({ banner: s.serverError }); return; }
    who.current = m;
    // A linked person always sees the linked box once; the sign-in box for someone new only on the sign-in path (on the
    // save path the 0004 box they just ticked is the one that covers them, ADR 0005 "Leads see 0004's consent box").
    const kind = siteConsentNeeded(m);
    if (kind === "linked" || (kind === "lead" && mode === "login")) { setSiteKind(kind); setView("site"); focusHeading(); return; }
    await afterSite();
  }
  async function afterSite() {
    if (!consentCoversResults(who.current)) {
      if (mode === "login") { setView("results"); focusHeading(); return; }
      // The person just ticked the box on this card: record it, then save.
      const c = await recordConsent(lang, name.trim());
      if (!c.ok) { setView("tap"); setErr({ banner: s.saveFailed }); return; }
    }
    await save("done");
  }
  async function acceptSite() {
    const c = await recordSiteConsent(lang, siteKind, "rodmjay.com/rvp/result", name.trim());
    if (!c.ok) { setErr({ banner: s.serverError }); return; }
    setErr({});
    await afterSite();
  }

  async function tap() {
    if (busy) return;
    setBusy(true); setErr({});
    const m = await me(lang);
    if (!isMe(m)) { setBusy(false); if ((m as { error?: string }).error === "signin") { setView("form"); setErr({ banner: s.signedOutTry }); } else setErr({ banner: s.serverError }); return; }
    who.current = m;
    if (!consentCoversResults(m)) { setBusy(false); setView("consentTap"); focusHeading(); return; }
    await save("line");
    setBusy(false);
  }

  async function accept(after: "done" | "line") {
    const c = await recordConsent(lang, name.trim());
    if (!c.ok) { setErr({ banner: s.saveFailed }); return; }
    await save(after);
  }

  async function decline() {
    await declineAccount(lang);
    clearDraft();
    setView("declined"); focusHeading();
  }

  const swap = (to: "new" | "login") => { setMode(to); setErr({}); focusHeading(); };
  const say = (t: string) => <div className="ds-banner error" role="alert"><p>{t}</p></div>;

  if (view === "loading") return <section className="ds-card outlined acct-card acct-save" aria-busy="true"><div className="acct-hold" /></section>;

  if (view === "line") {
    return (
      <section className="acct-saved-line" ref={card}>
        <p className="ds-body-large acct-check" tabIndex={-1} role="status"><Icon d={CHECK} /> <span>{s.savedLine}</span> <Link href={dashHref}>{s.viewDashboard}</Link></p>
      </section>
    );
  }

  return (
    <section className="ds-card outlined acct-card acct-save" ref={card}>
      {view === "form" && (
        <form className="acct-form" noValidate onSubmit={onSubmit}>
          <h2 className="ds-title-large" ref={heading} tabIndex={-1}>{mode === "new" ? s.saveTitle : s.signinTitle}</h2>
          <p className="ds-body-large">{mode === "new" ? s.saveLede : s.signinLine}</p>
          <div className="ds-field">
            <label htmlFor="acct-email">{s.email}</label>
            <input ref={emailInput} className="ds-input" id="acct-email" name="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={err.email ? true : undefined} aria-describedby="acct-email-err" />
            <ErrorLine id="acct-email-err" text={err.email ?? ""} />
          </div>
          {mode === "new" && (
            <>
              <div className="ds-field">
                <label htmlFor="acct-name">{s.firstName}</label>
                <input className="ds-input" id="acct-name" name="given-name" type="text" autoComplete="given-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <ConsentBox id="acct-consent" label={s.consent} error={err.consent ?? ""} checked={checked} boxRef={box}
                onChange={(v) => { setChecked(v); if (v) setErr((x) => ({ ...x, consent: undefined })); }} privacyHref={privacyHref} privacyLabel={s.privacyLink} />
            </>
          )}
          <div className="hp" aria-hidden="true"><label htmlFor="acct-website">{s.honeypot}</label><input id="acct-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
          {err.banner ? say(err.banner) : null}
          <BusyButton busy={busy}>{s.sendCode}</BusyButton>
          <p className="ds-body-small ds-variant">{s.noPassword}</p>
          <p className="acct-line">
            <button type="button" className="ds-btn text acct-inline-btn" onClick={() => swap(mode === "new" ? "login" : "new")}>{mode === "new" ? s.haveAccount : s.newAccount}</button>
          </p>
        </form>
      )}

      {view === "code" && (
        <CodeStep lang={lang} s={s} email={email.trim()} path={mode === "new" ? "start" : "login"} intro={mode === "new" ? s.codeSent : s.codeSentNeutral}
          submitLabel={s.saveResult} onVerified={verified} onChangeEmail={() => { setView("form"); requestAnimationFrame(() => emailInput.current?.focus()); }} />
      )}

      {view === "site" && (
        <BeforeYouStart key="site" s={s} label={siteKind === "linked" ? s.consentLinked : s.consentLead} heading="h2" title={s.bysTitle} submitLabel={s.continue}
          errorText={s.errConsentContinue} privacyHref={privacyHref} onAccept={acceptSite} onDecline={decline}>
          {err.banner ? say(err.banner) : null}
        </BeforeYouStart>
      )}

      {view === "results" && (
        <BeforeYouStart key="results" s={s} label={s.consent} heading="h2" title={s.saveTitle} submitLabel={s.saveResult} errorText={s.errConsent} privacyHref={privacyHref}
          onAccept={() => accept("done")}>
          {err.banner ? say(err.banner) : null}
        </BeforeYouStart>
      )}

      {view === "consentTap" && (
        <BeforeYouStart s={s} label={s.consent} heading="h2" title={s.saveTitle} submitLabel={s.saveToDashboard} errorText={s.errConsent} privacyHref={privacyHref}
          onAccept={() => accept("line")}>
          {err.banner ? say(err.banner) : null}
        </BeforeYouStart>
      )}

      {view === "tap" && (
        <div className="acct-step">
          <h2 className="ds-title-large" tabIndex={-1}>{s.saveTitle}</h2>
          <p className="ds-body-large">{s.tapLede}</p>
          {err.banner ? say(err.banner) : null}
          <BusyButton type="button" busy={busy} onClick={tap}>{s.saveToDashboard}</BusyButton>
        </div>
      )}

      {view === "done" && (
        <div className="acct-step">
          <h2 className="ds-title-large acct-check" tabIndex={-1}><Icon d={CHECK} /> <span>{s.saved}</span></h2>
          <p><Link href={dashHref} className="ds-btn">{s.goDashboard}</Link></p>
        </div>
      )}

      {view === "declined" && (
        <div className="acct-step">
          <h2 className="ds-title-large" tabIndex={-1}>{s.declined}</h2>
        </div>
      )}
    </section>
  );
}
