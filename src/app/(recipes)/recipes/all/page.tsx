import { recipeIndex } from "@/zones/routes";

const r = recipeIndex("en");
export const generateMetadata = r.metadata;
export default r.Page;
