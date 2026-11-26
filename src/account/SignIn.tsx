"use client";
// /signin/ and /es/signin/ (rvp-accounts.md screen 4; site-roles.md section 2). Email, then the 8-digit code, then
// straight to the dashboard. The reply is the same whether or not the email has an account, so the page never says
// which. The first time, "Before you start" holds the site's box (linked or new, ADR 0005; none while the site mode is
// off); declining deletes the account just made. ADR 0004's results box comes later, only when saving a result.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { decline as declineAccount, emailOk, getSession, isMe, me, recordSiteConsent, requestCode, siteConsentNeeded, takeNote, type Lang } from "./api";
import { CodeStep } from "./CodeStep";
import { BeforeYouStart } from "./BeforeYouStart";
import { BusyButton, ErrorLine, type S } from "./ui";

type View = "form" | "code" | "consent" | "declined" | "signedIn";

export function SignIn({ lang, s, dashHref, testHref, privacyHref }: { lang: Lang; s: S; dashHref: string; testHref: string; privacyHref: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("form");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState<{ kind: "error" | "primary"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"linked" | "lead">("lead");
  const opened = useRef(Date.now());
  const input = useRef<HTMLInputElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const note = takeNote();
    if (note === "lost") setBanner({ kind: "primary", text: s.wasSignedOut });
    if (getSession()) setView("signedIn");
  }, [s.wasSignedOut]);
  const focusTop = () => requestAnimationFrame(() => (top.current?.querySelector("h1, h2") as HTMLElement | null)?.focus());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!emailOk(email.trim())) { setErr(s.errEmail); input.current?.focus(); return; }
    setErr(""); setBanner(null); setBusy(true);
    const hp = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>("input[name=website]")?.value ?? "";
    const r = await requestCode("login", lang, email.trim(), hp, Date.now() - opened.current);
    setBusy(false);
    if (r.ok === false) { setBanner({ kind: "error", text: s.serverError }); return; }
    setView("code");
  }

  async function verified() {
    const m = await me(lang);
    if (!isMe(m)) { setView("form"); setBanner({ kind: "error", text: s.serverError }); return; }
    // The site's "Before you start" box, once, when it needs one (ADR 0005): linked, or someone new. Site mode off: none.
    const k = siteConsentNeeded(m);
    if (k) { setKind(k); setView("consent"); focusTop(); return; }
    router.push(dashHref);
  }
  async function accept() {
    const c = await recordSiteConsent(lang, kind, "rodmjay.com/signin");
    if (!c.ok) { setBanner({ kind: "error", text: s.serverError }); return; }
    router.push(dashHref);
  }
  async function decline() {
    await declineAccount(lang);
    setView("declined"); focusTop();
  }

  return (
    <div ref={top} className="ds-card outlined acct-card">
      {view === "consent" ? (
        <BeforeYouStart s={s} label={kind === "linked" ? s.consentLinked : s.consentLead} heading="h1" title={s.bysTitle} submitLabel={s.continue} errorText={s.errConsentContinue} privacyHref={privacyHref}
          onAccept={accept} onDecline={decline}>
          {banner ? <div className={`ds-banner ${banner.kind}`} role="alert"><p>{banner.text}</p></div> : null}
        </BeforeYouStart>
      ) : (
        <>
          <h1 className="ds-headline-medium" tabIndex={-1}>{view === "declined" ? s.declined : s.signinTitle}</h1>
          {banner ? <div className={`ds-banner ${banner.kind}`} role={banner.kind === "error" ? "alert" : "status"}><p>{banner.text}</p></div> : null}
          {view === "form" && (
            <form className="acct-form" noValidate onSubmit={onSubmit}>
              <p className="ds-body-large">{s.signinLine}</p>
              <div className="ds-field">
                <label htmlFor="acct-email">{s.email}</label>
                <input ref={input} className="ds-input" id="acct-email" name="email" type="email" autoComplete="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} aria-invalid={err ? true : undefined} aria-describedby="acct-email-err" />
                <ErrorLine id="acct-email-err" text={err} />
              </div>
              <div className="hp" aria-hidden="true"><label htmlFor="acct-website">{s.honeypot}</label><input id="acct-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
              <BusyButton busy={busy}>{s.sendCode}</BusyButton>
              <p className="ds-body-small ds-variant">{s.noPassword}</p>
              <p className="ds-body-medium">{s.noAccount} <Link href={testHref}>{s.takeTest}</Link></p>
            </form>
          )}
          {view === "code" && (
            <CodeStep lang={lang} s={s} email={email.trim()} path="login" intro={s.codeSentNeutral} submitLabel={s.continue}
              onVerified={verified} onChangeEmail={() => { setView("form"); requestAnimationFrame(() => input.current?.focus()); }} />
          )}
          {view === "signedIn" && (
            <>
              <p className="ds-body-large">{s.alreadyIn}</p>
              <p><Link href={dashHref} className="ds-btn">{s.goDashboard}</Link></p>
            </>
          )}
          {view === "declined" && <p><Link href={testHref} className="ds-btn text">{s.takeTest}</Link></p>}
        </>
      )}
    </div>
  );
}
