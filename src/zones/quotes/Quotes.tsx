// /quotes/ opens straight into the first quote (Rod 11/25: "i dont like the quotes list page, just go into the first quote"):
// the same page the arrow keys start from, with its own URL as the canonical. With no quotes it keeps the h1 and one line,
// is noindex, and the nav link hides.
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { loadQuotes, BASE } from "@/lib/quotes.mjs";
import { QuotePage, quoteMeta } from "./QuotePage";

type Lang = "en" | "es";

export async function quotesMeta(lang: Lang) {
  const q = dict(lang).quotes;
  const { quotes } = await loadQuotes();
  if (quotes.length) return quoteMeta(lang, quotes[0].slug);
  return meta({ lang, title: q.metaTitle, description: q.metaDescription, path: BASE[lang], alt: BASE[lang === "en" ? "es" : "en"], noindex: !quotes.length });
}

export async function Quotes({ lang }: { lang: Lang }) {
  const q = dict(lang).quotes;
  const { quotes } = await loadQuotes();
  if (quotes.length) return <QuotePage lang={lang} slug={quotes[0].slug} />;
  return (
    <main id="main" className="col quotes-page">
      <h1 className="ds-headline-medium project-title">{q.title}</h1>
      <div className="ds-card outlined"><p className="ds-body-large ds-variant">{q.empty}</p></div>
    </main>
  );
}
