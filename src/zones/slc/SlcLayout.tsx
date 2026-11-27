// Discover SLC's own shell (design/specs/discover-slc.md, "its own chrome, not the Rod Johnson shell", Rod 11/27): a root
// layout of its own per language (app/(slc), app/(slc-es)), so the personal site's header, nav, footer and account slot
// never render or mount here. <html data-brand="slc">, dark by default. Shared with the site: the design system's tokens
// and components, the fonts, and the head script (langscript.mjs: the data-js marker, the deploy safety net and the
// filtered-URL noindex), nothing else. Moving between this product and the personal site is a full page load.
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { HTML_LANG, SITE, asset, dict } from "@/lib/site.mjs";
import { LANG_SRC } from "@/lib/langscript.mjs";
import { BASE, loadEvents } from "@/lib/events.mjs";
import { shortDate, type Words } from "@/zones/discover/logic";
import { SlcHeader, type Section } from "./SlcHeader";

type Lang = "en" | "es";
const FONTS = ["/ds/fonts/inter/inter-latin-wght-normal.woff2", "/ds/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2"];
export const THEME_COLOR = "#2b3f8f";

// A page's <head> in this product: "Discover SLC" on the home, "{Page} · Discover SLC" elsewhere, its own icons and a
// manifest scoped to the product.
export function slcMeta(m: { lang: Lang; title?: string; description: string; path: string; alt: string; noindex?: boolean }): Metadata {
  const name = dict(m.lang).slc.name;
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
    openGraph: { siteName: name, title, description: m.description, type: "website", url: `${SITE}${m.path}`, locale: m.lang === "en" ? "en_US" : "es_419",
      images: [{ url: `${SITE}/slc/icons/icon-dark.png`, alt: name }] },
    twitter: { card: "summary" },
    icons: { icon: [{ url: "/slc/icons/favicon-32.png", sizes: "32x32" }, { url: "/slc/icons/favicon.svg", type: "image/svg+xml" }], apple: "/slc/icons/icon-dark.png" },
    manifest: `${BASE[m.lang]}manifest.webmanifest`,
  };
}

export async function SlcLayout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const d = dict(lang);
  const w = d.slc;
  const { events, updated } = await loadEvents();
  const sections: Section[] = events.length ? [{ href: `${BASE[lang]}events/`, label: w.events }] : [];
  const updatedKey = updated ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(updated)) : "";
  const privacy = lang === "en" ? "/privacy/" : "/privacy/es/";
  return (
    <html lang={HTML_LANG[lang]} translate="no" className="notranslate" data-brand="slc" data-theme="dark">
      <head>
        <script src={LANG_SRC} />
        <meta name="google" content="notranslate" />
        {FONTS.map((f) => <link key={f} rel="preload" href={f} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <link rel="stylesheet" href="/ds/fonts.css" />
        <link rel="stylesheet" href={asset("ds/design-system.css")} />
        <link rel="stylesheet" href={asset("slc/slc.css")} />
      </head>
      <body className="ds slc">
        <a className="slc-skip" href="#main">{w.skip}</a>
        <SlcHeader lang={lang} w={{ name: w.name, home: w.home, label: w.label, menu: w.menu, close: w.close, language: w.language }} sections={sections} />
        {children}
        <footer className="slc-foot">
          <p className="slc-foot-brand"><img src="/slc/icons/icon-dark.svg" alt="" width={24} height={24} /><span className="ds-title-small">{w.name}</span></p>
          <p className="ds-body-medium ds-variant">{w.footer}{updatedKey && <> {w.updated.replace("{date}", shortDate(updatedKey, d.discover as Words))}</>}</p>
          <p className="ds-body-medium"><a href={privacy}>{w.privacy}</a></p>
        </footer>
      </body>
    </html>
  );
}
