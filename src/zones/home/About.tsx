// The About page (Rod 11/25: "put the About Me in another whole page"): about, the resume form and how I work, moved from the home page.
import { dict, HTML_LANG } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { ResumeForm } from "@/zones/resume/ResumeForm";

type Lang = "en" | "es";
type Item = { title: string; body: string; url?: string };
const PATH = { en: "/about/", es: "/es/about/" } as const;

export function aboutMeta(lang: Lang) {
  const d = dict(lang);
  return meta({ lang, title: d.about.heading, description: d.about.p1, path: PATH[lang], alt: PATH[lang === "en" ? "es" : "en"] });
}

export function About({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const r = d.resume;
  return (
    <main id="main" className="col">
        <section id="about">
          <h2 className="ds-title-large">{d.about.heading}</h2>
          <p className="ds-body-large">{d.about.p1}</p>
          <p className="ds-body-large">{d.about.p2}</p>
        </section>

        <section id="resume">
          <h2 className="ds-title-large">{r.heading}</h2>
          <p className="ds-body-large">{r.lede}</p>
          <p className="ds-supporting"><a href="https://www.linkedin.com/in/rodmjay/details/recommendations/" target="_blank" rel="noopener">{r.recs} <svg viewBox="0 0 24 24" aria-hidden="true" width="14" height="14"><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3z" /></svg> <span className="sr-only">{r.recsSr}</span></a></p>
          <ResumeForm lang={HTML_LANG[lang]} privacyHref={lang === "en" ? "/privacy/" : "/privacy/es/"} t={r} />
        </section>

        <section id="how">
          <h2 className="ds-title-large">{d.how.heading}</h2>
          <figure className="quote"><blockquote className="ds-title-medium">“{d.how.quote}”</blockquote><figcaption className="ds-label-large ds-variant">{d.how.cite}</figcaption></figure>
          <ul className="plain">
            {d.how.items.map((it: Item) => <li key={it.title}><h3 className="ds-title-medium">{it.title}</h3><p className="ds-body-medium ds-variant">{it.body}</p></li>)}
          </ul>
          <p className="ds-body-medium ds-variant">{d.how.stack}</p>
        </section>
    </main>
  );
}
