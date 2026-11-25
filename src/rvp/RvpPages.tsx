// The RVP test's pages, one component each, so the app/ route files stay a few lines and the whole module can move when
// Designer settles the site's new layout. Not linked from the nav and noindex until Rod's yes to publish; production
// doesn't build them at all (RVP_ON, scripts/postbuild.mjs).
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { ARCHETYPES, archetypeBySlug, facetName, rvpUrl, type Lang } from "./data";
import { RvpTake } from "./RvpTake";
import { RvpResult } from "./RvpResult";
import { ArchetypeDetails } from "./Details";

const other = (lang: Lang): Lang => (lang === "en" ? "es" : "en");
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const strings = (lang: Lang) => dict(lang).rvp as Record<string, string>;
const facets = (lang: Lang, key: string) => key.split("-").map((f) => facetName(lang, f)).join(" · ");

export const rvpMeta = (lang: Lang, page: "" | "take" | "result") => {
  const s = strings(lang);
  return meta({ lang, title: s.metaTitle, description: s.metaDescription, path: rvpUrl(lang, page), alt: rvpUrl(other(lang), page), noindex: true });
};
export const archetypeMeta = (lang: Lang, slug: string) => {
  const a = archetypeBySlug(slug), s = strings(lang);
  if (!a) return {};
  return meta({ lang, title: a.name[lang], description: fill(s.archetypeMetaDescription, { name: a.name[lang], role: a.role[lang] }),
    path: rvpUrl(lang, slug), alt: rvpUrl(other(lang), slug), noindex: true, type: "article" });
};

const RESOURCES = ["Physical", "Intellectual", "Social"];
const valuesProcess = (lang: Lang, key: string) => key.split("-").slice(1).map((f) => facetName(lang, f)).join(" · ");

export function RvpIndex({ lang }: { lang: Lang }) {
  const s = strings(lang);
  return (
    <main id="main" className="col rvp-page rvp-index">
      <h1 className="ds-headline-large">{s.title}</h1>
      <p className="ds-body-large">{s.lede}</p>
      <p className="ds-body-medium">{s.privacy}</p>
      <p className="ds-body-medium ds-variant">{s.notClinical}</p>
      <p><Link href={rvpUrl(lang, "take")} className="ds-btn">{s.start}</Link></p>
      <h2 className="ds-title-large">{s.allTitle}</h2>
      <p className="ds-body-large ds-variant">{s.dimensions}</p>
      {RESOURCES.map((r) => (
        <section key={r} className="rvp-group" aria-labelledby={`rvp-g-${r}`}>
          <h3 className="ds-title-medium" id={`rvp-g-${r}`}>{facetName(lang, `R.${r}`)}</h3>
          <ul className="ds-grid rvp-grid" role="list">
            {ARCHETYPES.filter((a) => a.key.startsWith(`R.${r}-`)).map((a) => (
              <li key={a.slug}>
                <Link href={rvpUrl(lang, a.slug)} className="ds-card outlined rvp-link">
                  <span className="ds-title-small">{a.name[lang]}</span>
                  <span className="ds-caption">{valuesProcess(lang, a.key)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

export function RvpTakePage({ lang }: { lang: Lang }) {
  const s = strings(lang);
  return (
    <main id="main" className="col rvp-page">
      <p className="quote-link-row"><Link href={rvpUrl(lang, "")} className="ds-btn text">← {s.metaTitle}</Link></p>
      <h1 className="ds-headline-small">{s.title}</h1>
      <RvpTake lang={lang} s={s} />
      <p className="ds-body-small ds-variant">{s.privacy}</p>
    </main>
  );
}

export function RvpResultPage({ lang }: { lang: Lang }) {
  const s = strings(lang);
  return (
    <main id="main" className="col rvp-page">
      <p className="quote-link-row"><Link href={rvpUrl(lang, "")} className="ds-btn text">← {s.metaTitle}</Link></p>
      <h1 className="ds-headline-small">{s.resultTitle}</h1>
      <RvpResult lang={lang} s={s} />
    </main>
  );
}

export function RvpArchetypePage({ lang, slug }: { lang: Lang; slug: string }) {
  const a = archetypeBySlug(slug), s = strings(lang);
  if (!a) notFound();
  return (
    <main id="main" className="col rvp-page">
      <p className="quote-link-row"><Link href={rvpUrl(lang, "")} className="ds-btn text">← {s.allTitle}</Link></p>
      <p className="ds-overline">{facets(lang, a.key)}</p>
      <h1 className="ds-headline-large">{a.name[lang]}</h1>
      <p className="ds-body-large">{a.role[lang]}</p>
      <p className="ds-body-medium ds-variant">{a.examples[lang]}</p>
      <ArchetypeDetails lang={lang} s={s} a={a} you={false} />
      <p className="ds-body-medium ds-variant">{s.mapNotPrison} {s.notClinical}</p>
      <p><Link href={rvpUrl(lang, "take")} className="ds-btn filled">{s.takeIt}</Link></p>
    </main>
  );
}

export const archetypeParams = () => ARCHETYPES.map((a) => ({ slug: a.slug }));
