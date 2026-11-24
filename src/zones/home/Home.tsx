// The home page: the synthwave hero, then about, the resume form, building, how I work and contact.
// Same markup and copy as src/page.html on Pages; the copy is i18n/{en,es}.json.
import { dict, HTML_LANG, SITE } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { Scene } from "./Scene";
import { ResumeForm } from "@/zones/resume/ResumeForm";

type Lang = "en" | "es";
type Item = { title: string; body: string; url?: string };

export function homeMeta(lang: Lang) {
  const d = dict(lang);
  const m = meta({ lang, title: d.meta.title, absoluteTitle: true, description: d.meta.description, path: lang === "en" ? "/" : "/es/",
    alt: lang === "en" ? "/es/" : "/", type: "profile", ogLocale: d.meta.ogLocale });
  m.alternates!.canonical = lang === "en" ? `${SITE}/` : `${SITE}/es/`;
  return m;
}

export function Home({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const r = d.resume;
  return (
    <>
      <Scene name={d.hero.name} title={d.hero.title} />
      <main id="main" className="col">
        <p className="ds-body-large lede">{d.hero.lede}</p>

        <section id="about">
          <h2 className="ds-title-large">{d.about.heading}</h2>
          <p className="ds-body-large">{d.about.p1}</p>
          <p className="ds-body-large">{d.about.p2}</p>
        </section>

        <section id="resume">
          <h2 className="ds-title-large">{r.heading}</h2>
          <p className="ds-body-large">{r.lede}</p>
          <ResumeForm lang={HTML_LANG[lang]} privacyHref={lang === "en" ? "/privacy/" : "/privacy/es/"} t={r} />
        </section>

        <section id="building">
          <h2 className="ds-title-large">{d.building.heading}</h2>
          <p className="ds-body-large">{d.building.lede}</p>
          <ul className="plain">
            {d.building.items.map((it: Item) => <li key={it.title}><h3 className="ds-title-medium"><a href={it.url}>{it.title}</a></h3><p className="ds-body-medium ds-variant">{it.body}</p></li>)}
          </ul>
        </section>

        <section id="how">
          <h2 className="ds-title-large">{d.how.heading}</h2>
          <figure className="quote"><blockquote className="ds-title-medium">“{d.how.quote}”</blockquote><figcaption className="ds-label-large ds-variant">{d.how.cite}</figcaption></figure>
          <ul className="plain">
            {d.how.items.map((it: Item) => <li key={it.title}><h3 className="ds-title-medium">{it.title}</h3><p className="ds-body-medium ds-variant">{it.body}</p></li>)}
          </ul>
          <p className="ds-body-medium ds-variant">{d.how.stack}</p>
        </section>

        <section id="contact">
          <h2 className="ds-title-large">{d.contact.heading}</h2>
          <p className="ds-body-large">{d.contact.body}</p>
          <div className="links">
            <a className="ds-btn text" href="https://www.linkedin.com/in/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>{d.contact.linkedin}</a>
            <a className="ds-btn text" href="https://x.com/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" /></svg>{d.contact.x}</a>
            <a className="ds-btn text" href="https://github.com/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>{d.contact.github}</a>
          </div>
        </section>
      </main>
    </>
  );
}
