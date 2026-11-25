// Quotes, read once at build time from the public-life feed "quotes" (getFeed, src/lib/feeds.mjs; Database
// Administrator 11/24). The feed already holds only quotes Rod rated above 2 stars, and only slug, text, author,
// source and year (Designer's spec: design/specs/rodmjay-quotes.md). A feed that's off and an unset
// LIFE_API both give none: "no quotes yet", and the section stays hidden. Any other failure fails the build.
// Row: {slug, text, author, source?, year?, lang?, link?, about_author?, meaning?, apply?, original_text?, original_lang?, translation_label?}. The last three are {en, es}
// (Philosopher writes them, Rod 11/24 "add more value"); each shows only when written. The feed's order is kept (newest
// rated first, then author). Each quote has its own page, /quotes/<slug>/, and a 1200×1200 image, /quotes/<slug>/quote.png
// (src/lib/quote-image.tsx), sized to post as is on Instagram, Facebook or X (Rod 11/24).
import { getFeed } from "./feeds.mjs";
export const BASE = { en: "/quotes/", es: "/es/quotes/" };

const str = (v) => (v == null ? "" : String(v).trim());
// A {en, es} field, or a plain string for both languages.
const both = (v) => (v && typeof v === "object" ? { en: str(v.en), es: str(v.es) } : { en: str(v), es: str(v) });
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
// Only plain http(s) links leave the page.
const safeLink = (v) => { const s = str(v); return /^https:\/\/[^\s"'<>]+$/.test(s) ? s : ""; };

let memo;
export function loadQuotes() {
  return (memo ||= (async () => {
    const items = await getFeed("quotes");
    const quotes = [];
    for (const r of items) {
      const text = str(r?.text), author = str(r?.author);
      if (!text) throw new Error(`quotes: ${r?.slug || "a row"} has no text`);
      if (/\b(rating|stars?)\b/i.test(Object.keys(r).join(" "))) throw new Error(`quotes: ${r.slug} carries a rating field`);
      const slug = str(r.slug);
      if (!SLUG.test(slug)) throw new Error(`quotes: bad slug ${JSON.stringify(slug)}`);
      // Non-latin scripts need Designer and Compliance first, and the image fonts carry Latin only (Designer 11/24).
      if (/[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F]/.test(text + author)) throw new Error(`quotes: ${slug} has non-latin characters`);
      quotes.push({ slug, text, author, source: str(r.source), year: str(r.year), lang: str(r.lang), link: safeLink(r.link),
        about: both(r.about_author), meaning: both(r.meaning), apply: both(r.apply),
        // A translated quote shows its original under the image, labeled (Compliance 11/24).
        original: str(r.original_text) && /^[a-z]{2,3}$/.test(str(r.original_lang)) ? { text: str(r.original_text), lang: str(r.original_lang) } : null,
        // "our translation" when the English is ours, not a published translator's (Compliance 11/24).
        translation: both(r.translation_label) });
    }
    return { quotes, from: "public-life quotes" };
  })());
}

// The quote at slug with its neighbors in feed order; the last wraps to the first.
export async function quoteAt(slug) {
  const { quotes } = await loadQuotes();
  const i = quotes.findIndex((q) => q.slug === slug);
  if (i < 0) return null;
  const n = quotes.length;
  return { quote: quotes[i], index: i, total: n, prev: quotes[(i - 1 + n) % n], next: quotes[(i + 1) % n] };
}
export const quoteUrl = (lang, slug) => `${BASE[lang]}${slug}/`;
export const quoteImage = (slug) => `/quotes/${slug}/quote.png`;
