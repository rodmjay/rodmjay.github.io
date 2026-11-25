// One quote per page (Rod 11/24: "make each quote be on its own page and you can arrow through them", "add more value",
// "make them an image of the text"; Designer's spec update 11/24). The image carries the quote (its alt is the quote);
// the caption, the context blocks Philosopher writes (each only when written) and the source link are text.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { quoteAt, quoteUrl, quoteImage, quoteText, quoteLabel, quoteAuthor, quoteSource, BASE } from "@/lib/quotes.mjs";
import { SIZE } from "@/lib/quote-image";
import { QuoteKeys } from "./QuoteKeys";

type Lang = "en" | "es";
const other = (lang: Lang): Lang => (lang === "en" ? "es" : "en");
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const langName = (lang: Lang, code: string) => { try { return new Intl.DisplayNames([lang === "es" ? "es-419" : "en"], { type: "language" }).of(code) || code; } catch { return code; } };
const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export async function quoteMeta(lang: Lang, slug: string) {
  const at = await quoteAt(slug);
  if (!at) return {};
  const q = dict(lang).quotes, x = at.quote;
  return meta({ lang, title: fill(q.pageTitle, { author: quoteAuthor(x, lang) || q.unknownAuthor }), description: short(quoteText(x, lang), 155),
    path: quoteUrl(lang, slug), alt: quoteUrl(other(lang), slug), image: quoteImage(slug, lang), imageAlt: quoteText(x, lang), type: "article" });
}

export async function QuotePage({ lang, slug }: { lang: Lang; slug: string }) {
  const at = await quoteAt(slug);
  if (!at) notFound();
  const q = dict(lang).quotes, x = at.quote;
  const prev = quoteUrl(lang, at.prev.slug), next = quoteUrl(lang, at.next.slug);
  const blocks = ([["aboutAuthor", x.about], ["meaning", x.meaning], ["apply", x.apply]] as const)
    .map(([k, v]) => [q[k], v[lang]] as const).filter(([, t]) => t);
  return (
    <main id="main" className="col quote-page">
      <div className="quote-stage">
        <Link href={prev} rel="prev" className="ds-btn outlined quote-prev"><span aria-hidden="true">←</span> {q.prev}</Link>
        <figure className="quote quote-figure">
          <img src={quoteImage(x.slug, lang)} width={SIZE} height={SIZE} alt={quoteText(x, lang)} lang={lang === "es" && x.lang !== "es" ? "es-419" : x.lang || undefined} />
          <figcaption>
            <h1 className="ds-title-large">{short(quoteText(x, lang), 120)}</h1>
            <p className="ds-title-medium quote-author">{quoteAuthor(x, lang) || q.unknownAuthor}</p>
            {(x.source || x.year || x.original || quoteLabel(x, lang)) ? (
              <p className="ds-body-medium ds-variant">
                {(x.source || x.year) ? <cite>{[quoteSource(x, lang) || q.unknownSource, x.year].filter(Boolean).join(", ")}</cite> : null}
                {(x.original || quoteLabel(x, lang)) ? (x.source || x.year ? " · " : "") : null}
                {x.original
                  ? <>{fill(q.translatedFrom, { language: langName(lang, x.original.lang) })}{quoteLabel(x, lang) ? ` (${quoteLabel(x, lang)})` : ""}</>
                  : quoteLabel(x, lang) || null}
              </p>
            ) : null}
            <p className="quote-dl"><a href={quoteImage(x.slug, lang)} download={`${x.slug}.png`}>{q.download}</a></p>
          </figcaption>
        </figure>
        <Link href={next} rel="next" className="ds-btn outlined quote-next">{q.next} <span aria-hidden="true">→</span></Link>
        <p className="quote-pos ds-label-large ds-variant">{fill(q.position, { i: at.index + 1, n: at.total })}</p>
      </div>
      {blocks.length || x.link || x.original ? (
        <div className="ds-prose quote-more">
          {x.original ? (
            <section><h2 className="ds-title-large">{fill(q.original, { language: langName(lang, x.original.lang) })}</h2>
              <blockquote lang={x.original.lang}><p className="ds-body-large">{x.original.text}</p></blockquote></section>
          ) : null}
          {blocks.map(([h, t]) => (<section key={h}><h2 className="ds-title-large">{h}</h2><p className="ds-body-large">{t}</p></section>))}
          {x.link ? <section><h2 className="ds-title-large">{q.source}</h2><p className="ds-body-large"><a href={x.link} rel="noopener noreferrer">{quoteSource(x, lang) || x.link}</a></p></section> : null}
        </div>
      ) : null}
      <QuoteKeys prev={prev} next={next} />
    </main>
  );
}
