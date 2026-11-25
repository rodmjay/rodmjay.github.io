import { loadQuotes } from "@/lib/quotes.mjs";
import { QuotePage, quoteMeta } from "@/zones/quotes/QuotePage";

type P = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
// Next's static export refuses a dynamic route with no params: with no quotes it builds one placeholder that 404s.
export async function generateStaticParams() {
  const { quotes } = await loadQuotes();
  return quotes.length ? quotes.map((q: any) => ({ slug: q.slug })) : [{ slug: "none" }];
}
export const generateMetadata = async ({ params }: P) => quoteMeta("en", (await params).slug);
export default async function Page({ params }: P) { return <QuotePage lang="en" slug={(await params).slug} />; }
