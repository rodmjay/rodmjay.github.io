// Quotes, read once at build time from the public-life Edge Function (QUOTES_API, GET ?feed=quotes; Database
// Administrator 11/24). The feed already holds only quotes Rod rated above 2 stars, and only slug, text, author,
// source and year (Designer's spec: design/specs/rodmjay-quotes.md). A disabled feed answers 404 and an unset
// QUOTES_API gives none: both mean "no quotes yet", and the section stays hidden. Any other failure fails the build.
// Row: {slug, text, author, source?, year?, lang?}. The feed's order is kept (newest rated first, then author).
const API = process.env.QUOTES_API || "";
export const BASE = { en: "/quotes/", es: "/es/quotes/" };

const str = (v) => (v == null ? "" : String(v).trim());

let memo;
export function loadQuotes() {
  return (memo ||= (async () => {
    if (!API) return { quotes: [], from: "none (QUOTES_API unset)" };
    const res = await fetch(API, { headers: { accept: "application/json" } });
    if (res.status === 404) return { quotes: [], from: "feed off" };
    if (!res.ok) throw new Error(`quotes: ${API} answered ${res.status}`);
    const body = await res.json();
    if (!body || !Array.isArray(body.items)) throw new Error("quotes: the feed didn't return {items: []}");
    const quotes = [];
    for (const r of body.items) {
      const text = str(r?.text), author = str(r?.author);
      if (!text) throw new Error(`quotes: ${r?.slug || "a row"} has no text`);
      if (/\b(rating|stars?)\b/i.test(Object.keys(r).join(" "))) throw new Error(`quotes: ${r.slug} carries a rating field`);
      quotes.push({ slug: str(r.slug), text, author, source: str(r.source), year: str(r.year), lang: str(r.lang) });
    }
    return { quotes, from: API };
  })());
}
