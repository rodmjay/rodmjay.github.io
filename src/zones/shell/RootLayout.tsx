// The shell: <html> with its language, the header and nav (mounted once per language, so nothing reloads or jumps
// between pages), the footer, the stylesheets and the preloaded fonts. One per language: app/(en) and app/(es) are the
// two root layouts, so `lang` is in the HTML itself. Switching language is a full load, as it was on Pages.
import type { ReactNode } from "react";
import { HTML_LANG, RECIPES_LIVE, asset, dict } from "@/lib/site.mjs";
import { LANG_SRC } from "@/lib/langscript.mjs";
import { altMap } from "@/lib/routes.mjs";
import { loadQuotes } from "@/lib/quotes.mjs";
import { Header } from "./Header";

type Lang = "en" | "es";

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2305071a'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='%23ff3d8b' text-anchor='middle'%3ERJ%3C/text%3E%3C/svg%3E";
const FONTS = ["/ds/fonts/inter/inter-latin-wght-normal.woff2", "/ds/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2"];

export async function RootLayout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const d = dict(lang);
  const alt = await altMap();
  const hasQuotes = (await loadQuotes()).quotes.length > 0;
  const nav = {
    label: d.nav.label, home: d.nav.home, about: d.nav.about, resume: d.nav.resume, building: d.nav.building,
    contact: d.nav.contact, blog: d.nav.blog, recipes: d.nav.recipes, quotes: d.nav.quotes, language: d.nav.language,
  };
  return (
    <html lang={HTML_LANG[lang]} translate="no" className="notranslate" data-brand="rod">
      <head>
        {/* Language picker (src/lib/langscript.mjs): an external file, so the CSP allows no inline script. */}
        <script src={LANG_SRC} />
        <meta name="google" content="notranslate" />
        <link rel="icon" href={ICON} />
        {FONTS.map((f) => <link key={f} rel="preload" href={f} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <link rel="stylesheet" href="/ds/fonts.css" />
        <link rel="stylesheet" href={asset("ds/design-system.css")} />
        <link rel="stylesheet" href={asset("site.css")} />
        <link rel="stylesheet" href={asset("blog/blog.css")} />
        <link rel="stylesheet" href={asset("recipes/recipes.css")} />
      </head>
      <body className="ds">
        <a className="skip" href="#main">{d.nav.skip}</a>
        <Header lang={lang} nav={nav} showRecipes={RECIPES_LIVE} showQuotes={hasQuotes} alt={alt} />
        {children}
        <footer className="foot col"><p className="ds-body-small ds-variant">{d.footer.copy} · {d.footer.cookies}</p></footer>
      </body>
    </html>
  );
}
