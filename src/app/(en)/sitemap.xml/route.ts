import { sitemap } from "@/zones/blog/feeds.mjs";

export const dynamic = "force-static";
export const GET = () => sitemap();
