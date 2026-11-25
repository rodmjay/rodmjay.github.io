// /quotes/<slug>/quote.png: the quote as a 1200×1200 image, one per quote, shared by both languages (src/lib/quote-image.tsx).
import { loadQuotes, quoteAt } from "@/lib/quotes.mjs";
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
  return quoteImage(at.quote);
}
