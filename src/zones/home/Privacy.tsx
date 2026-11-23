// The privacy page, one per language, from the same dictionaries. {email} is the privacy inbox (Compliance 11/21).
import Link from "next/link";
import { dict, PRIVACY_EMAIL, PRIVACY_SUBJECT } from "@/lib/site.mjs";
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
  const mail = <a href={`mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(PRIVACY_SUBJECT)}`}>{PRIVACY_EMAIL}</a>;
  return (
    <main id="main" className="col">
      <section>
        <h2 className="ds-title-large">{pv.title}</h2>
        {pv.p.map((text: string) => {
          const [a, b] = text.split("{email}");
          return <p key={text} className="ds-body-large">{a}{b !== undefined && <>{mail}{b}</>}</p>;
        })}
        <p className="ds-body-small ds-variant">{pv.updated}</p>
        <p><Link href={lang === "en" ? "/" : "/es/"}>{pv.back}</Link></p>
      </section>
    </main>
  );
}
