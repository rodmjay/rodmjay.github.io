// A post's share card (es): its title on the plain card (Designer 11/25).
import { loadBlog } from "@/lib/blog.mjs";
import { postOgImage } from "@/lib/quote-image";

export const dynamic = "force-static";
export const dynamicParams = false;
export async function generateStaticParams() {
  const b = await loadBlog();
  const posts = b.built["es"];
  return posts.length ? posts.map((p: any) => ({ slug: p.slug })) : [{ slug: "none" }];
}
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const b = await loadBlog();
  const slug = (await params).slug;
  const p = b.built["es"].find((x: any) => x.slug === slug);
  if (!p) return new Response("not found", { status: 404 });
  return postOgImage(p.title, "Rod Johnson");
}
