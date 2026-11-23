import { blogPaged } from "@/zones/routes";

const r = blogPaged("en");
export const dynamicParams = false;
export const generateStaticParams = r.params;
export const generateMetadata = r.metadata;
export default r.Page;
