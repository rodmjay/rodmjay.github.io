// Quotes, read once at build time from the public-life feed "quotes" (getFeed, src/lib/feeds.mjs; Database
// Administrator 11/24). The feed already holds only quotes Rod rated above 2 stars, and only slug, text, author,
// source and year (Designer's spec: design/specs/rodmjay-quotes.md). A feed that's off and an unset
// LIFE_API both give none: "no quotes yet", and the section stays hidden. Any other failure fails the build.
// Row: {slug, text, author, source?, year?, lang?}. The feed's order is kept (newest rated first, then author).
import { getFeed } from "./feeds.mjs";
export const BASE = { en: "/quotes/", es: "/es/quotes/" };

const str = (v) => (v == null ? "" : String(v).trim());

let memo;
export function loadQuotes() {
  return (memo ||= (async () => {
    const items = await getFeed("quotes");
    const quotes = [];
    for (const r of items) {
      const text = str(r?.text), author = str(r?.author);
      if (!text) throw new Error(`quotes: ${r?.slug || "a row"} has no text`);
      if (/\b(rating|stars?)\b/i.test(Object.keys(r).join(" "))) throw new Error(`quotes: ${r.slug} carries a rating field`);
      quotes.push({ slug: str(r.slug), text, author, source: str(r.source), year: str(r.year), lang: str(r.lang) });
    }
    return { quotes, from: "public-life quotes" };
  })());
}
