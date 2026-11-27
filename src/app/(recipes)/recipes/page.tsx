import { recipeHome } from "@/zones/routes";

const r = recipeHome("en");
export const generateMetadata = r.metadata;
export default r.Page;
