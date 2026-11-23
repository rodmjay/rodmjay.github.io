import { blogPost } from "@/zones/routes";

const r = blogPost("en");
export const dynamicParams = false;
export const generateStaticParams = r.params;
export const generateMetadata = r.metadata;
export default r.Page;
