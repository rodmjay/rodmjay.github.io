// The Quotes page (Designer's spec design/specs/rodmjay-quotes.md): one column, a list of figures, the quote in its own
// language, labels in the page's. With no quotes it keeps the h1 and one line, is noindex, and the nav link hides.
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { loadQuotes, BASE } from "@/lib/quotes.mjs";

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
    <main id="main" className="col">
      <h1 className="ds-headline-medium project-title">{q.title}</h1>
      {quotes.length ? (
        <>
          <p className="ds-body-large">{q.lede}</p>
          <ul className="quotes ds-prose" role="list">
            {quotes.map((x: any) => (
              <li key={x.slug || x.text}>
                <figure className="quote">
                  <blockquote lang={x.lang || undefined}><p className="ds-body-large">{x.text}</p></blockquote>
                  <figcaption>
                    {x.author || q.unknownAuthor}
                    {(x.source || x.year) ? <>, <cite>{[x.source || q.unknownSource, x.year].filter(Boolean).join(", ")}</cite></> : null}
                  </figcaption>
                </figure>
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
