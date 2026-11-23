import { recipeTagPaged } from "@/zones/routes";

const r = recipeTagPaged("en");
export const dynamicParams = false;
export const generateStaticParams = r.params;
export const generateMetadata = r.metadata;
export default r.Page;
