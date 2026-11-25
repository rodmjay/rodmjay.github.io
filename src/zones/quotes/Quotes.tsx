// The Quotes index (Designer's spec design/specs/rodmjay-quotes.md, update 11/24): a grid of each quote's image, linking
// to its own page. With no quotes it keeps the h1 and one line, is noindex, and the nav link hides.
import Link from "next/link";
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { loadQuotes, BASE, quoteUrl, quoteImage, quoteText } from "@/lib/quotes.mjs";
import { SIZE } from "@/lib/quote-image";

const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

type Lang = "en" | "es";

export async function quotesMeta(lang: Lang) {
  const q = dict(lang).quotes;
  const { quotes } = await loadQuotes();
  return meta({ lang, title: q.metaTitle, description: q.metaDescription, path: BASE[lang], alt: BASE[lang === "en" ? "es" : "en"], noindex: !quotes.length });
}

export async function Quotes({ lang }: { lang: Lang }) {
  const q = dict(lang).quotes;
  const { quotes } = await loadQuotes();
  return (
    <main id="main" className="col quotes-page">
      <h1 className="ds-headline-medium project-title">{q.title}</h1>
      {quotes.length ? (
        <>
          <p className="ds-body-large">{q.lede}</p>
          <ul className="ds-grid quote-grid" role="list">
            {quotes.map((x: any) => (
              <li key={x.slug}>
                <Link href={quoteUrl(lang, x.slug)} className="quote-thumb">
                  <img src={quoteImage(x.slug, lang)} width={SIZE} height={SIZE} loading="lazy" alt={short(quoteText(x, lang), 120)} lang={lang === "es" && x.lang !== "es" ? "es-419" : x.lang || undefined} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="ds-card outlined"><p className="ds-body-large ds-variant">{q.empty}</p></div>
      )}
    </main>
  );
}
