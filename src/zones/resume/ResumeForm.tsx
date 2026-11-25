"use client";
// Resume request: validates, posts to the resume-request Edge Function (Supabase), shows the 24-hour link.
// The request is exactly what site.js sent on Pages (same URL, fields and replies). Nothing is stored in the page.
// On localhost, ?mock=ok|rate|err fakes the reply for the preview and the tests.
import Link from "next/link";
import { useRef, useState } from "react";

const LOOKUP_VERSION = "lookup-2026-11-24";
const RESUME_API = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/resume-request";
type T = Record<string, string>;
type Reply = { ok?: boolean; url?: string; error?: string; retry_minutes?: number };
const FIELDS = [
  { name: "name", type: "text", auto: "name", required: true },
  { name: "email", type: "email", auto: "email", required: true },
  { name: "company", type: "text", auto: "organization" },
  { name: "role", type: "text", auto: "organization-title" },
  { name: "source", type: "text", auto: "off", full: true },
] as const;
type Field = (typeof FIELDS)[number]["name"];

export function ResumeForm({ lang, privacyHref, t }: { lang: string; privacyHref: string; t: T }) {
  const started = useRef(Date.now());
  const form = useRef<HTMLFormElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const doneTitle = useRef<HTMLHeadingElement>(null);
  const [tried, setTried] = useState(false);
  const [lookupErr, setLookupErr] = useState(false);
  const [errs, setErrs] = useState<Partial<Record<Field, string>>>({});
  const [sending, setSending] = useState<number | null>(null);
  const [banner, setBanner] = useState("");
  const [done, setDone] = useState<{ url: string; minHeight: number } | null>(null);
  const label: Record<Field, string> = { name: t.name, email: t.email, company: t.company, role: t.role, source: t.source };

  const value = (n: string) => ((form.current?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "");
  const checkOne = (n: Field, v = value(n)) =>
    n === "name" ? (v.trim().length > 0 ? "" : t.errName) : n === "email" ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : t.errEmail) : "";

  function reply(): Promise<Reply> {
    const mock = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("mock");
    if (mock) return new Promise((r) => setTimeout(() => r(mock === "ok" ? { ok: true, url: "#mock-download" } : mock === "rate" ? { ok: false, error: "rate_limited", retry_minutes: 12 } : { ok: false, error: "server" }), 600));
    const f = form.current!;
    return fetch(RESUME_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      name: value("name").trim(), email: value("email").trim(), company: value("company").trim() || null, role: value("role").trim() || null,
      source: value("source").trim() || null, consent: (f.elements.namedItem("consent") as HTMLInputElement).checked,
      lookup_consent: true, lookup_consent_version: LOOKUP_VERSION, hp: value("website"), t: started.current,
      lang: lang.indexOf("es") === 0 ? "es" : "en",
    }) }).then((r) => r.json());
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    setBanner("");
    const next = { name: checkOne("name"), email: checkOne("email") };
    setErrs(next);
    const bad = (["name", "email"] as const).filter((n) => next[n]);
    const lookup = form.current!.elements.namedItem("lookup") as HTMLInputElement;
    setLookupErr(!lookup.checked);
    if (bad.length) { (form.current!.elements.namedItem(bad[0]) as HTMLInputElement).focus(); return; }
    if (!lookup.checked) { lookup.focus(); return; }
    setSending(btn.current?.offsetWidth ?? null);
    reply().then((res) => {
      if (res && res.ok && res.url) {
        setDone({ url: res.url, minHeight: box.current?.offsetHeight ?? 0 });
        requestAnimationFrame(() => doneTitle.current?.focus());
        return;
      }
      throw res;
    }).catch((res: Reply) => {
      if (res && res.error === "lookup_consent_required") { setLookupErr(true); setBanner(""); return; }
      setBanner(res && res.error === "rate_limited" ? t.rateLimited.replace("{n}", String(res.retry_minutes || 60)) : t.serverError);
    }).then(() => setSending(null));
  }

  return (
    <div className="rbox" id="rbox" ref={box} style={done ? { minHeight: done.minHeight } : undefined}>
      <form id="rform" ref={form} noValidate onSubmit={onSubmit} hidden={!!done}>
        <div className="rgrid">
          {FIELDS.map((f) => {
            const id = `rf-${f.name}`, err = errs[f.name as Field];
            return (
              <div key={f.name} className={`ds-field${"full" in f ? " full" : ""}`}>
                <label htmlFor={id}>{label[f.name]}</label>
                <input className="ds-input" id={id} name={f.name} type={f.type} autoComplete={f.auto} required={"required" in f}
                  aria-describedby={`${id}-err`} aria-invalid={err ? true : undefined}
                  onBlur={(e) => { if (tried && (f.name === "name" || f.name === "email")) setErrs((p) => ({ ...p, [f.name]: checkOne(f.name, e.target.value) })); }} />
                <p className="ds-supporting" id={`${id}-err`} hidden={!err}>{err}</p>
              </div>
            );
          })}
        </div>
        <div className="hp" aria-hidden="true"><label htmlFor="rf-website">{t.honeypot}</label><input id="rf-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
        <div className="ds-field consent">
          <label className="ds-check"><input type="checkbox" id="rf-lookup" name="lookup" required aria-required="true" aria-invalid={lookupErr ? true : undefined}
            aria-describedby="rf-lookup-help rf-lookup-err" onChange={(e) => { if (e.target.checked) setLookupErr(false); }} /> {t.lookupLabel} {t.required}</label>
          <p className="ds-supporting" id="rf-lookup-help">{t.lookupExample}{" "}
            <a href={`${privacyHref}#${lang.indexOf("es") === 0 ? "consultas" : "lookups"}`} target="_blank" rel="noopener">{t.lookupLink} <span className="sr-only">{t.lookupLinkSr}</span></a></p>
          <p className="ds-supporting lookup-err" id="rf-lookup-err" role="alert" hidden={!lookupErr}>
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-2h2zm0-4h-2V7h2z" /></svg> {t.errLookup}</p>
        </div>
        <div className="ds-field consent"><label className="ds-check"><input type="checkbox" id="rf-consent" name="consent" /> {t.consent}</label></div>
        <div className="ds-banner error" id="rf-banner" role="alert" hidden={!banner}><p>{banner}</p></div>
        <button className="ds-btn" type="submit" id="rf-submit" ref={btn} disabled={sending !== null} style={sending ? { width: sending } : undefined}>
          {sending !== null ? t.sending : t.submit}
        </button>
        <p className="ds-supporting">{t.note} <Link href={privacyHref}>{t.privacyLink}</Link></p>
      </form>
      <div className="rdone" id="rdone" role="status" hidden={!done}>
        <svg className="rcheck" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" /><path d="M10 16.5l4 4 8-9" /></svg>
        <h3 className="ds-title-medium" id="rdone-title" tabIndex={-1} ref={doneTitle}>{t.doneTitle}</h3>
        <p className="ds-body-medium ds-variant">{t.doneBody}</p>
        <a className="ds-btn" id="rdone-link" href={done?.url ?? "#"} download>{t.download}</a>
      </div>
    </div>
  );
}
