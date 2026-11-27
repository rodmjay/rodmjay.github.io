// The privacy page, one per language, from the same dictionaries. {email} is the privacy inbox (Compliance 11/21).
import Link from "next/link";
import { dict, HTML_LANG, PRIVACY_EMAIL, PRIVACY_HOSTING, PRIVACY_SUBJECT, PRIVACY_UPDATED, REMOVE_LIVE } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";

type Lang = "en" | "es";
const PATH = { en: "/privacy/", es: "/privacy/es/" } as const;

export function privacyMeta(lang: Lang) {
  const pv = dict(lang).privacy;
  return meta({ lang, title: pv.title, description: pv.p[0], path: PATH[lang], alt: PATH[lang === "en" ? "es" : "en"] });
}

export function Privacy({ lang }: { lang: Lang }) {
  if (!PRIVACY_EMAIL) throw new Error("set PRIVACY_EMAIL to build the privacy page");
  const pv = dict(lang).privacy;
  // After cutover (PRIVACY_HOSTING=azure): the hosting line names Microsoft, and the date is the day it changed.
  const azure = PRIVACY_HOSTING === "azure";
  const paras: string[] = azure ? pv.p.map((t: string, i: number) => (i === 2 ? pv.azure.hosting : t)) : [...pv.p];
  // The living hero's "motion" setting (Compliance 11/27), after the storage paragraph, wherever the hero is built.
  if (process.env.LIVING_HERO === "1") paras.splice(6, 0, pv.motion);
  const updated = azure
    ? pv.azure.updated.replace("{date}", new Date(`${PRIVACY_UPDATED}T12:00:00Z`).toLocaleDateString(HTML_LANG[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }))
    : pv.updated;
  const mail = <a href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(PRIVACY_SUBJECT)}`}>{PRIVACY_EMAIL}</a>;
  return (
    <main id="main" className="col">
      <section>
        <h2 className="ds-title-large">{pv.title}</h2>
        {paras.map((text: string) => {
          const [a, b] = text.split("{email}");
          return <p key={text} className="ds-body-large">{a}{b !== undefined && <>{mail}{b}</>}</p>;
        })}
        {pv.lookups && (
          <>
            <h2 className="ds-title-large lookups-h" id={pv.lookups.id}>{pv.lookups.heading}</h2>
            <p className="ds-body-large">{pv.lookups.intro}</p>
            <ul className="plain">
              {pv.lookups.items.map((it: { lead: string; text: string }) => <li key={it.lead}><p className="ds-body-large"><strong>{it.lead}</strong> {it.text}</p></li>)}
            </ul>
            {(() => { const [a, b] = pv.lookups.rights.split("{email}"); return <p className="ds-body-large">{a}{mail}{b}</p>; })()}
          </>
        )}
        {REMOVE_LIVE && (
          <>
            <h2 className="ds-title-large">{dict(lang).remove.privacyHeading}</h2>
            <p className="ds-body-large">{dict(lang).remove.privacyBody}</p>
            <p><Link className="ds-btn tonal" href={lang === "en" ? "/remove/" : "/es/remove/"}>{dict(lang).remove.privacyBtn}</Link></p>
          </>
        )}
        <p className="ds-body-small ds-variant">{updated}</p>
        <p><Link href={lang === "en" ? "/" : "/es/"}>{pv.back}</Link></p>
      </section>
    </main>
  );
}
