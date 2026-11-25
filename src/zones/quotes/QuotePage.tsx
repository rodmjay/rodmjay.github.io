// One quote per page (Rod 11/24: "make each quote be on its own page and you can arrow through them", "add more value",
// "make them an image of the text"; Designer's spec update 11/24). The image carries the quote (its alt is the quote);
// the caption, the context blocks Philosopher writes (each only when written) and the source link are text.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { quoteAt, quoteUrl, quoteImage, BASE } from "@/lib/quotes.mjs";
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
  return meta({ lang, title: fill(q.pageTitle, { author: x.author || q.unknownAuthor }), description: short(x.text, 155),
    path: quoteUrl(lang, slug), alt: quoteUrl(other(lang), slug), image: quoteImage(slug), imageAlt: x.text, type: "article" });
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
      <p className="quote-link-row"><Link href={BASE[lang]} className="ds-btn text">← {q.all}</Link></p>
      <div className="quote-stage">
        <Link href={prev} rel="prev" className="ds-btn outlined quote-prev"><span aria-hidden="true">←</span> {q.prev}</Link>
        <figure className="quote quote-figure">
          <img src={quoteImage(x.slug)} width={SIZE} height={SIZE} alt={x.text} lang={x.lang || undefined} />
          <figcaption>
            <h1 className="ds-title-large">{x.author || q.unknownAuthor}</h1>
            {(x.source || x.year || x.original) ? (
              <p className="ds-body-medium ds-variant">
                {(x.source || x.year) ? <cite>{[x.source || q.unknownSource, x.year].filter(Boolean).join(", ")}</cite> : null}
                {x.original ? <>{(x.source || x.year) ? " · " : ""}{fill(q.translatedFrom, { language: langName(lang, x.original.lang) })}{x.translation[lang] ? ` (${x.translation[lang]})` : ""}</> : null}
              </p>
            ) : null}
          </figcaption>
        </figure>
        <Link href={next} rel="next" className="ds-btn outlined quote-next">{q.next} <span aria-hidden="true">→</span></Link>
        <p className="quote-pos ds-label-large ds-variant">{fill(q.position, { i: at.index + 1, n: at.total })}</p>
      </div>
      <p className="quote-link-row"><a href={quoteImage(x.slug)} download={`${x.slug}.png`} className="ds-btn text">{q.download}</a></p>
      {blocks.length || x.link || x.original ? (
        <div className="ds-prose quote-more">
          {x.original ? (
            <section><h2 className="ds-title-large">{fill(q.original, { language: langName(lang, x.original.lang) })}</h2>
              <blockquote lang={x.original.lang}><p className="ds-body-large">{x.original.text}</p></blockquote></section>
          ) : null}
          {blocks.map(([h, t]) => (<section key={h}><h2 className="ds-title-large">{h}</h2><p className="ds-body-large">{t}</p></section>))}
          {x.link ? <section><h2 className="ds-title-large">{q.source}</h2><p className="ds-body-large"><a href={x.link} rel="noopener noreferrer">{x.source || x.link}</a></p></section> : null}
        </div>
      ) : null}
      <QuoteKeys prev={prev} next={next} />
    </main>
  );
}
