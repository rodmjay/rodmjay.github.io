// /es/quotes/<slug>/quote.png: the quote as a 1200×1200 image, one per quote, Spanish text (text_es) (src/lib/quote-image.tsx).
import { loadQuotes, quoteAt, quoteText, quoteLabel, quoteAuthor, quoteSource } from "@/lib/quotes.mjs";
import { quoteImage } from "@/lib/quote-image";

export const dynamic = "force-static";
export const dynamicParams = false;
export async function generateStaticParams() {
  const { quotes } = await loadQuotes();
  return quotes.length ? quotes.map((q: any) => ({ slug: q.slug })) : [{ slug: "none" }];
}
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const at = await quoteAt((await params).slug);
  if (!at) return new Response("not found", { status: 404 });
  const x = at.quote;
  return quoteImage({ ...x, text: quoteText(x, "es"), author: quoteAuthor(x, "es"), source: quoteSource(x, "es"), label: quoteLabel(x, "es") }, "es");
}
