import { recipeAbout } from "@/zones/routes";

const r = recipeAbout("en");
export const generateMetadata = r.metadata;
export default r.Page;
