// The home page: the cover hero, then projects (Rod 11/25: "make my projects more of the focus"), the RVP card and contact. About, the resume form and how I work moved to /about/.
// Same markup and copy as src/page.html on Pages; the copy is i18n/{en,es}.json.
import { dict, SITE } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
const RVP_ON = process.env.RVP_ON === "1"; // the test is built only where RVP_ON=1 (production after Rod's yes)
const rvpUrl = (lang: string, _p: string) => (lang === "es" ? "/es/rvp/" : "/rvp/");

type Lang = "en" | "es";
type Item = { title: string; body: string; url?: string };
// Project icons (Designer 11/25; picks in design/brand/PICKS-2026-11-25.md, swappable).
const projIcon = (url?: string) => url?.includes("/should/") ? "/img/should-icon.svg" : url?.includes("agency.squared.pro") ? "/img/agencypro-icon.svg" : url?.includes("privacy.squared.pro") ? "/img/privacy-icon.svg" : "";

export function homeMeta(lang: Lang) {
  const d = dict(lang);
  const m = meta({ lang, title: d.meta.title, absoluteTitle: true, description: d.meta.description, path: lang === "en" ? "/" : "/es/",
    image: lang === "en" ? "/og.png" : "/es/og.png", imageAlt: `${d.hero.name}, ${d.hero.title}`,
    alt: lang === "en" ? "/es/" : "/", type: "profile", ogLocale: d.meta.ogLocale });
  m.alternates!.canonical = lang === "en" ? `${SITE}/` : `${SITE}/es/`;
  return m;
}

export function Home({ lang }: { lang: Lang }) {
  const d = dict(lang);
  return (
    <>
      {/* A profile-header cover (Designer, rodmjay-professional.md 11/25, Rod: same as his LinkedIn banner): decorative, no text over it. */}
      <div className="cover">
        <picture>
          <source media="(max-width: 599px)" type="image/avif" srcSet="/img/cover-m-750.avif 750w, /img/cover-m-1125.avif 1125w" sizes="100vw" />
          <source media="(max-width: 599px)" type="image/webp" srcSet="/img/cover-m-750.webp 750w, /img/cover-m-1125.webp 1125w" sizes="100vw" />
          <source type="image/avif" srcSet="/img/cover-1280.avif 1280w, /img/cover-1920.avif 1920w, /img/cover-2560.avif 2560w" sizes="100vw" />
          <img src="/img/cover-1920.webp" srcSet="/img/cover-1280.webp 1280w, /img/cover-1920.webp 1920w, /img/cover-2560.webp 2560w" sizes="100vw"
            width={3168} height={1344} alt="" fetchPriority="high" loading="eager" decoding="async" />
        </picture>
      </div>
      <main id="main" className="col">
        <section className="hero" aria-labelledby="hero-name">
          <div className="hero-top">
            <img className="hero-photo" src="/img/rod-p-256.webp" srcSet="/img/rod-p-256.webp 256w, /img/rod-p-384.webp 384w" sizes="(min-width: 840px) 128px, 96px"
              width={128} height={128} alt={d.hero.photoAlt} fetchPriority="high" decoding="async" />
            <div>
              <h1 className="ds-headline-large" id="hero-name">{d.hero.name}</h1>
              <p className="ds-title-large hero-title">{d.hero.title}</p>
            </div>
          </div>
          <p className="ds-body-large hero-lede">{d.hero.lede}</p>
          <div className="hero-actions">
            <a className="ds-btn" href="#projects">{d.nav.building}</a>
            <a className="ds-btn outlined" href={lang === "en" ? "/about/" : "/es/about/"}>{d.nav.about}</a>
            
          </div>
        </section>



        <section id="projects">
          <span id="building" aria-hidden="true" /> {/* the old anchor, so existing #building links still land here */}
          <h2 className="ds-title-large">{d.building.heading}</h2>
          <p className="ds-body-large">{d.building.lede}</p>
          <ul className="plain">
            {d.building.items.map((it: Item) => <li key={it.title}>{/* the icon slot keeps room for the other projects' icons (Designer 11/25: Should first) */}{projIcon(it.url) && <div className="proj-icon"><img src={projIcon(it.url)} width={48} height={48} alt="" /></div>}<h3 className="ds-title-medium"><a href={it.url}>{it.title}</a></h3><p className="ds-body-medium ds-variant">{it.body}</p></li>)}
          </ul>
        </section>

        {RVP_ON && (
          <section className="rvp-home" aria-labelledby="rvp-home-title">
            <div className="ds-card outlined">
              <h2 className="ds-title-large" id="rvp-home-title">{dict(lang).rvp.title}</h2>
              <p className="ds-body-large">{dict(lang).rvp.homeBody}</p>
              <a className="ds-btn outlined" href={rvpUrl(lang, "")}>{dict(lang).rvp.homeBtn}</a>
            </div>
          </section>
        )}


        <section id="contact">
          <h2 className="ds-title-large">{d.contact.heading}</h2>
          <p className="ds-body-large">{d.contact.body}</p>
          <div className="links">
            <a className="ds-btn text" href="https://www.linkedin.com/in/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>{d.contact.linkedin}</a>
            <a className="ds-btn text" href="https://x.com/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" /></svg>{d.contact.x}</a>
            <a className="ds-btn text" href="https://github.com/rodmjay" rel="me"><svg className="ds-icon sm" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" /></svg>{d.contact.github}</a>
          </div>
        </section>
        <p className="ds-body-small ds-variant home-ai">{d.hero.aiLine}</p>
      </main>
    </>
  );
}
