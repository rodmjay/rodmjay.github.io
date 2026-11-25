// The home page's og:image (es): a plain card with the name and title (Designer 11/25).
import { dict } from "@/lib/site.mjs";
import { homeOgImage } from "@/lib/quote-image";

export const dynamic = "force-static";
export function GET() {
  const h = dict("es").hero;
  return homeOgImage(h.name, h.title);
}
