// The shell: <html> with its language, the header and nav (mounted once per language, so nothing reloads or jumps
// between pages), the footer, the stylesheets and the preloaded fonts. One per language: app/(en) and app/(es) are the
// two root layouts, so `lang` is in the HTML itself. Switching language is a full load, as it was on Pages.
import type { ReactNode } from "react";
import { HTML_LANG, RECIPES_LIVE, asset, dict, read } from "@/lib/site.mjs";
import { altMap } from "@/lib/routes.mjs";
import { Header } from "./Header";

type Lang = "en" | "es";

// Picks the language before paint on the two home pages, as the Pages site did: ?lang= wins and is remembered, then
// /es/, then the visitor's choice, browser and time zone. Every other page is in the language its URL says.
const kit = read("public/ds/i18n.js").replace(/^export /gm, "").replace(/^export\s*\{[^}]*\};?$/gm, "");
const langScript = `(function(){var p=location.pathname;if(p!=="/"&&p!=="/es/")return;${kit}
var here=p==="/es/"?"es":"en",want=pickLang();
try{var u=new URL(location.href),q=u.searchParams.get("lang");if(q==="en"||q==="es"){want=q;localStorage.setItem("ds-lang",q);u.searchParams.delete("lang");history.replaceState(null,"",u)}}catch(e){}if(want!==here)location.replace((want==="es"?"/es/":"/")+location.search+location.hash);})();`;

const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%2305071a'/%3E%3Ctext x='16' y='22' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='%23ff3d8b' text-anchor='middle'%3ERJ%3C/text%3E%3C/svg%3E";
const FONTS = ["/ds/fonts/inter/inter-latin-wght-normal.woff2", "/ds/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2"];

export async function RootLayout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const d = dict(lang);
  const alt = await altMap();
  const nav = {
    label: d.nav.label, home: d.nav.home, about: d.nav.about, work: d.nav.work, resume: d.nav.resume, building: d.nav.building,
    contact: d.nav.contact, blog: d.nav.blog, recipes: d.nav.recipes, language: d.nav.language,
  };
  return (
    <html lang={HTML_LANG[lang]} translate="no" className="notranslate" data-brand="rod">
      <head>
        <script dangerouslySetInnerHTML={{ __html: langScript }} />
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
        <Header lang={lang} nav={nav} showRecipes={RECIPES_LIVE} alt={alt} />
        {children}
        <footer className="foot col"><p className="ds-body-small ds-variant">{d.footer.copy} · {d.footer.cookies}</p></footer>
      </body>
    </html>
  );
}
