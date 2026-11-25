// RSS, one feed per language (live posts only), and the sitemap: the home and privacy pages, the live blog, and the
// recipes once Rod approves them (drafts and samples are noindex, so they stay out). Same output as build-blog.mjs.
import { SITE, dict, HTML_LANG } from "../../lib/site.mjs";
import { loadBlog, BASE } from "../../lib/blog.mjs";
import { loadRecipes } from "../../lib/recipes.mjs";
import { REMOVE_LIVE } from "../../lib/site.mjs";
import { loadQuotes } from "../../lib/quotes.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = (s) => esc(s).replace(/'/g, "&apos;");
const rfc822 = (d) => new Date(`${d}T12:00:00Z`).toUTCString();

export async function feed(lang) {
  const b = await loadBlog();
  const B = dict(lang).blog, items = b.live[lang].slice(0, 20);
  const body = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(B.feedTitle)}</title>
<link>${SITE}${BASE[lang]}</link>
<description>${xml(B.description)}</description>
<language>${HTML_LANG[lang]}</language>
<atom:link href="${SITE}${BASE[lang]}feed.xml" rel="self" type="application/rss+xml"/>
${items.length ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>\n` : ""}${items.map((p) => `<item>
<title>${xml(p.title)}</title>
<link>${SITE}${p.url}</link>
<guid isPermaLink="true">${SITE}${p.url}</guid>
<pubDate>${rfc822(p.date)}</pubDate>
<description>${xml(p.dek)}</description>
${p.tags.map((k) => `<category>${xml(b.tagInfo(k).name[lang])}</category>`).join("\n")}
</item>
`).join("")}</channel>
</rss>
`;
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}

export async function sitemap() {
  const b = await loadBlog();
  const r = await loadRecipes();
  const q = await loadQuotes();
  const pair = (en, es, lastmod) => [[en, es], [es, en]].map(([a]) => `<url><loc>${SITE}${a}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<xhtml:link rel="alternate" hreflang="en" href="${SITE}${en}"/><xhtml:link rel="alternate" hreflang="es-419" href="${SITE}${es}"/></url>`).join("\n");
  const urls = [pair("/", "/es/"), pair("/privacy/", "/privacy/es/")];
  if (!b.SAMPLE) {
    urls.push(pair(BASE.en, BASE.es, b.live.en[0]?.date));
    for (const p of b.live.en) urls.push(pair(p.url, p.twin.url, p.date));
  }
  if (!r.sample && r.byLang.en.length) {
    const day = (s) => String(s).slice(0, 10);
    urls.push(pair("/recipes/", "/es/recipes/", day(r.byLang.en[0].updatedAt)));
    for (const x of r.byLang.en) urls.push(pair(x.url, x.twinUrl, day(x.updatedAt)));
  }
  if (REMOVE_LIVE) urls.push(pair("/remove/", "/es/remove/"));
  for (const x of q.quotes) urls.push(pair(`/quotes/${x.slug}/`, `/es/quotes/${x.slug}/`));
  const body = `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
