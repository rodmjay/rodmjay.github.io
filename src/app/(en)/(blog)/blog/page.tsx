import { blogIndex } from "@/zones/routes";

const r = blogIndex("en");
export const generateMetadata = r.metadata;
export default r.Page;
