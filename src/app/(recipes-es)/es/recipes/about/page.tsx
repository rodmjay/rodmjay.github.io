import { recipeAbout } from "@/zones/routes";

const r = recipeAbout("es");
export const generateMetadata = r.metadata;
export default r.Page;
