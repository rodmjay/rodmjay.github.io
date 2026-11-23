// One page's <head>: title, description, canonical, hreflang, robots, Open Graph and RSS, as the Pages build wrote them.
import type { Metadata } from "next";
import { SITE, HTML_LANG, dict } from "./site.mjs";
import { BASE as BLOG } from "./blog.mjs";

type Lang = "en" | "es";
export type MetaIn = {
  lang: Lang; title: string; description: string; path: string; alt?: string | null; noindex?: boolean;
  type?: "website" | "article" | "profile"; image?: string; imageAlt?: string; published?: string; absoluteTitle?: boolean;
  rss?: boolean; ogLocale?: string;
};

export function meta(m: MetaIn): Metadata {
  const other: Lang = m.lang === "en" ? "es" : "en";
  const languages: Record<string, string> = { [HTML_LANG[m.lang]]: `${SITE}${m.path}` };
  if (m.alt) languages[HTML_LANG[other]] = `${SITE}${m.alt}`;
  if (m.alt || m.lang === "en") languages["x-default"] = `${SITE}${m.lang === "en" ? m.path : m.alt}`;
  const d = dict(m.lang), o = dict(other);
  return {
    metadataBase: new URL(SITE),
    title: { absolute: m.absoluteTitle ? m.title : `${m.title} · Rod Johnson` },
    description: m.description,
    robots: m.noindex ? { index: false } : undefined,
    alternates: {
      canonical: `${SITE}${m.path}`,
      languages,
      types: m.rss ? { "application/rss+xml": [{ url: `${SITE}${BLOG[m.lang]}feed.xml`, title: d.blog.feedTitle }] } : undefined,
    },
    openGraph: {
      siteName: "Rod Johnson", title: m.title, description: m.description, type: m.type ?? "website", url: `${SITE}${m.path}`,
      locale: m.ogLocale ?? d.blog.ogLocale, alternateLocale: o.blog.ogLocale,
      ...(m.image ? { images: [{ url: new URL(m.image, SITE).href, alt: m.imageAlt }] } : {}),
      ...(m.published ? { publishedTime: m.published } : {}),
    },
    twitter: { card: m.image ? "summary_large_image" : "summary" },
  };
}
