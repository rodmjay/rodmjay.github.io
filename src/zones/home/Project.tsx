// UNPUBLISHED 11/24 (Rod removed Selected work; EA): no route points here now. To republish, add app/(en)/(home)/work/indiana-cms/page.tsx
// and the es twin calling projectMeta/Project, the twin in src/lib/routes.mjs, the sitemap pair in feeds.mjs and the e2e paths.
// A describe-only project page (Legal Advisor's conditions, 11/23): role, stack and outcomes in general terms, exactly
// what the resume says. No screenshots, code, client logo, state data or repo link; never the employer's name.
import Link from "next/link";
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";

type Lang = "en" | "es";
const PATH = { en: "/work/indiana-cms/", es: "/es/work/indiana-cms/" } as const;

export function projectMeta(lang: Lang) {
  const p = dict(lang).project;
  return meta({ lang, title: p.metaTitle, description: p.metaDescription, path: PATH[lang], alt: PATH[lang === "en" ? "es" : "en"] });
}

export function Project({ lang }: { lang: Lang }) {
  const p = dict(lang).project;
  const home = lang === "en" ? "/" : "/es/";
  return (
    <main id="main" className="col">
      <section>
        <p className="ds-label-large ds-variant">{p.eyebrow}</p>
        <h1 className="ds-headline-medium project-title">{p.title}</h1>
        <p className="ds-body-large">{p.lede}</p>
      </section>
      <section>
        <h2 className="ds-title-large">{p.roleHeading}</h2>
        <p className="ds-body-large">{p.role}</p>
      </section>
      <section>
        <h2 className="ds-title-large">{p.waysHeading}</h2>
        <ul className="plain">
          {p.ways.map((w: string) => <li key={w}><p className="ds-body-large">{w}</p></li>)}
        </ul>
      </section>
      <section>
        <h2 className="ds-title-large">{p.stackHeading}</h2>
        <ul className="chips" role="list">
          {p.stack.map((s: string) => <li key={s} className="ds-chip status">{s}</li>)}
        </ul>
        <p className="ds-body-small ds-variant">{p.note}</p>
        <p><Link href={`${home}#resume`}>{p.resume}</Link></p>
        <p><Link href={home}>{p.back}</Link></p>
      </section>
    </main>
  );
}
