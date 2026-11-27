// The home page (design/specs/rodmjay-home.md, Rod 11/27: "just core of me and then list of my projects"): the cover and
// avatar, a short intro with Resume and Contact, and the projects, each a card linking out to a product with its own
// chrome. Contact moved to /about/#contact. No script needed.
// Same markup and copy as src/page.html on Pages; the copy is i18n/{en,es}.json.
import Link from "next/link";
import { LivingHero } from "@/components/living-hero/LivingHero";
import { checkDescriptor } from "@/components/living-hero/descriptor";
import homeHero from "@/components/living-hero/home.json";
import { dict, SITE, RECIPES_LIVE } from "@/lib/site.mjs";
import { DISCOVER_ON } from "@/lib/events.mjs";
import { meta } from "@/lib/meta";
// The living hero (docs/adr/0004): built where LIVING_HERO=1 (staging and checks; production once the privacy page lists
// the "motion" key, Security passes the code and Designer the motion). The descriptor is checked at build here.
const LIVING_HERO = process.env.LIVING_HERO === "1";
const HERO = checkDescriptor(homeHero);
const RVP_ON = process.env.RVP_ON === "1"; // the test is built only where RVP_ON=1 (production after Rod's yes)
const rvpUrl = (lang: string, _p: string) => (lang === "es" ? "/es/personality-test/" : "/personality-test/");

type Lang = "en" | "es";

export function homeMeta(lang: Lang) {
  const d = dict(lang);
  const m = meta({ lang, title: d.meta.title, absoluteTitle: true, description: d.meta.description, path: lang === "en" ? "/" : "/es/",
    image: lang === "en" ? "/og.png" : "/es/og.png", imageAlt: `${d.hero.name}, ${d.hero.title}`,
    alt: lang === "en" ? "/es/" : "/", type: "profile", ogLocale: d.meta.ogLocale });
  m.alternates!.canonical = lang === "en" ? `${SITE}/` : `${SITE}/es/`;
  return m;
}

// The product marks in their own tiles (Designer 11/27): each product keeps its brand; the cards stay neutral.
const mark = (light: string, dark: string) => (
  <picture><source media="(prefers-color-scheme: dark)" srcSet={dark} /><img src={light} width={48} height={48} alt="" /></picture>
);
const TEST_MARK = (
  <span className="home-tile"><svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon"><path d="M13 8.57c-.79 0-1.43.64-1.43 1.43s.64 1.43 1.43 1.43 1.43-.64 1.43-1.43-.64-1.43-1.43-1.43Zm0-5.57C9.25 3 6.2 5.94 6.02 9.64L4.1 12.2c-.25.33-.01.8.4.8H6v3c0 1.1.9 2 2 2h1v3h7v-4.68c2.36-1.12 4-3.53 4-6.32 0-3.87-3.13-7-7-7Zm3 7c0 .13-.01.26-.02.39l.83.66c.08.06.1.16.05.25l-.8 1.39c-.05.09-.16.12-.24.09l-.99-.4c-.21.16-.43.29-.67.39L14 13.3c-.01.1-.1.17-.2.17h-1.6c-.1 0-.18-.07-.2-.17l-.15-1.06c-.25-.1-.47-.23-.68-.39l-.99.4c-.09.03-.2 0-.25-.09l-.8-1.39c-.05-.08-.03-.19.05-.25l.84-.66c-.01-.13-.02-.26-.02-.39s.02-.27.04-.39l-.85-.66c-.08-.06-.1-.16-.05-.26l.8-1.38c.05-.09.15-.12.24-.09l1 .4c.2-.15.43-.29.67-.39L12 6.7c.02-.1.1-.17.2-.17h1.6c.1 0 .18.07.19.17l.15 1.06c.24.1.46.23.67.39l1-.4c.09-.03.2 0 .24.09l.8 1.38c.05.09.03.2-.05.26l-.85.66c.03.12.04.25.04.39Z" /></svg></span>
);

export function Home({ lang }: { lang: Lang }) {
  const d = dict(lang);
  const h = d.home;
  const home = lang === "en" ? "/" : "/es/";
  const about = `${home}about/`;
  // Live projects only, in Designer's order (a project behind an off flag is left out, never "coming soon").
  const projects = [
    DISCOVER_ON && { key: "slc", href: lang === "en" ? "/slc/" : "/es/slc/", mark: mark("/img/marks/slc-light.svg", "/img/marks/slc-dark.svg") },
    RECIPES_LIVE && { key: "recipes", href: `${home}recipes/`, mark: mark("/img/marks/recipes-light.svg", "/img/marks/recipes-dark.svg") },
    RVP_ON && { key: "test", href: rvpUrl(lang, ""), mark: TEST_MARK },
    { key: "blog", href: `${home}blog/`, mark: <span className="home-tile"><img src="/favicon.svg" width={48} height={48} alt="" /></span> },
  ].filter(Boolean).map((x) => ({ ...(x as { key: "slc" | "recipes" | "test" | "blog"; href: string; mark: React.ReactNode }), ...h.projects[(x as { key: string }).key] }));
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
        {LIVING_HERO && <LivingHero descriptor={HERO} />}
      </div>
      <main id="main" className="col home">
        <section className="hero" aria-labelledby="hero-name">
          <div className="hero-top">
            <img className="hero-photo" src="/img/rod-256.webp" srcSet="/img/rod-256.webp 256w, /img/rod-384.webp 384w" sizes="(min-width: 840px) 128px, 96px"
              width={128} height={128} alt={d.hero.photoAlt} fetchPriority="high" decoding="async" />
            <div>
              <h1 className="ds-headline-medium" id="hero-name">{d.hero.name}</h1>
              <p className="ds-title-large hero-title">{d.hero.title}</p>
            </div>
          </div>
          <p className="ds-body-large hero-lede">{d.hero.lede}</p>
          <div className="hero-actions">
            <Link className="ds-btn" href={`${about}#resume`}>{h.resume}</Link>
            <Link className="ds-btn outlined" href={`${about}#contact`}>{h.contact}</Link>
          </div>
        </section>
        {projects.length > 0 && (
          <section id="projects" aria-labelledby="projects-h">
            <span id="building" aria-hidden="true" /> {/* the old anchor, so existing #building links still land here */}
            <h2 className="ds-title-large" id="projects-h">{h.projectsHeading}</h2>
            <p className="ds-body-medium ds-variant">{h.projectsLede}</p>
            <ul role="list" className="home-projects">
              {projects.map((x) => (
                <li key={x.key} className="ds-card outlined home-project">
                  <span className="home-mark">{x.mark}</span>
                  <span className="home-project-text">
                    <Link className="ds-title-large home-project-link" href={x.href} aria-label={`${x.name}: ${x.line}`}>{x.name}</Link>
                    <span className="ds-body-medium ds-variant">{x.line}</span>
                  </span>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon home-chevron"><path d="M9.4 18 8 16.6l4.6-4.6L8 7.4 9.4 6l6 6Z" /></svg>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="ds-body-small ds-variant home-ai">{d.hero.aiLine}</p>
      </main>
    </>
  );
}
