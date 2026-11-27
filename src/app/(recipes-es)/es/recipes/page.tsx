import { recipeHome } from "@/zones/routes";

const r = recipeHome("es");
export const generateMetadata = r.metadata;
export default r.Page;
