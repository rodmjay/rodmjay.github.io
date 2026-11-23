import { blogIndex } from "@/zones/routes";

const r = blogIndex("es");
export const generateMetadata = r.metadata;
export default r.Page;
