import { recipeIndex } from "@/zones/routes";

const r = recipeIndex("es");
export const generateMetadata = r.metadata;
export default r.Page;
