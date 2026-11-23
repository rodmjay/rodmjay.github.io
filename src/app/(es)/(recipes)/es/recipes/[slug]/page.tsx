import { recipe } from "@/zones/routes";

const r = recipe("es");
export const dynamicParams = false;
export const generateStaticParams = r.params;
export const generateMetadata = r.metadata;
export default r.Page;
