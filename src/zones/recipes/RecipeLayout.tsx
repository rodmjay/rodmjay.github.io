// The Family Recipe Book's own shell (Designer's homey spec, design/specs/recipe-book-homey.md; Rod 11/27: "its own
// product, with its own branding"): a root layout per language (app/(recipes), app/(recipes-es)), so the personal site's
// header, nav, footer and account slot never render here. <html data-brand="recipes" data-theme="light">: a food blog is
// a daytime page, light only at launch. Shared with the site: the head script (langscript.mjs: the data-js marker, the
// deploy safety net, the filtered-URL noindex) and Inter (/ds/fonts.css); the serif fonts are the book's own
// (public/recipes/fonts.css). No "Rod Johnson" anywhere but About and Privacy (Definition of DONE 5).
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { HTML_LANG, SITE, asset, dict } from "@/lib/site.mjs";
import { LANG_SRC } from "@/lib/langscript.mjs";
import { ABOUT, ALL, BASE, NAV_COURSES, tagSlug } from "@/lib/recipes.mjs";
import { BookHeader, type NavLink } from "./BookHeader";

type Lang = "en" | "es";
export const THEME_COLOR = "#fbf5ea";
const FONTS = ["/recipes/fonts/young-serif-latin-400-normal.woff2", "/recipes/fonts/source-serif-4-latin-wght-normal.woff2", "/ds/fonts/inter/inter-latin-wght-normal.woff2"];

// A page's <head> in the book: "Family Recipe Book" on the home, "{Page} · Family Recipe Book" elsewhere, its own icons.
export function bookMeta(m: { lang: Lang; title?: string; description: string; path: string; alt: string; noindex?: boolean;
  image?: string; imageAlt?: string; type?: "website" | "article" }): Metadata {
  const name = dict(m.lang).recipes.name;
  const title = m.title ? `${m.title} · ${name}` : name;
  return {
    metadataBase: new URL(SITE),
    title: { absolute: title },
    description: m.description,
    robots: m.noindex ? { index: false } : undefined,
    alternates: {
      canonical: `${SITE}${m.path}`,
      languages: { [HTML_LANG[m.lang]]: `${SITE}${m.path}`, [HTML_LANG[m.lang === "en" ? "es" : "en"]]: `${SITE}${m.alt}`, "x-default": `${SITE}${m.lang === "en" ? m.path : m.alt}` },
    },
    openGraph: { siteName: name, title, description: m.description, type: m.type ?? "website", url: `${SITE}${m.path}`, locale: m.lang === "en" ? "en_US" : "es_419",
      images: [{ url: m.image ? new URL(m.image, SITE).href : `${SITE}/recipes/icons/icon-light.png`, alt: m.imageAlt || name }] },
    twitter: { card: m.image ? "summary_large_image" : "summary" },
    icons: { icon: [{ url: "/recipes/icons/favicon-32.png", sizes: "32x32" }, { url: "/recipes/icons/favicon.svg", type: "image/svg+xml" }], apple: "/recipes/icons/icon-light.png" },
  };
}

export function RecipeLayout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const R = dict(lang).recipes;
  const nav: NavLink[] = [
    { href: ALL[lang], label: R.allRecipes },
    ...NAV_COURSES.map((tag: string) => ({ href: `${BASE[lang]}tag/${tagSlug(tag)}/`, label: R.courses[tag] })),
    { href: ABOUT[lang], label: R.about },
  ];
  const privacy = lang === "en" ? "/privacy/" : "/privacy/es/";
  return (
    <html lang={HTML_LANG[lang]} translate="no" className="notranslate" data-brand="recipes" data-theme="light">
      <head>
        <script src={LANG_SRC} />
        <meta name="google" content="notranslate" />
        {FONTS.map((f) => <link key={f} rel="preload" href={f} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <link rel="stylesheet" href="/ds/fonts.css" />
        <link rel="stylesheet" href="/recipes/fonts.css" />
        <link rel="stylesheet" href={asset("recipes/recipes.css")} />
      </head>
      <body className="rb">
        <a className="rb-skip" href="#main">{R.skip}</a>
        <div className="rb-plaid" aria-hidden="true" />
        <BookHeader lang={lang} nav={nav} all={ALL[lang]}
          w={{ name: R.name, home: R.home, menu: R.menu, close: R.close, language: R.language, searchLabel: R.searchLabel, searchPlaceholder: R.searchPlaceholder, searchButton: R.searchButton }} />
        {children}
        <footer className="rb-foot">
          <div className="rb-wrap">
            <span>© {R.name} · {R.footer}</span>
            <a href={ALL[lang]}>{R.allRecipes}</a>
            <a href={ABOUT[lang]}>{R.about}</a>
            <a href={privacy}>{R.privacy}</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
