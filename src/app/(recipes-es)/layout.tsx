// The Family Recipe Book's own root layout (es): its own <html>, header, nav and footer (src/zones/recipes/RecipeLayout.tsx),
// never the personal site's shell (Rod 11/27: "its own product, with its own branding").
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { RecipeLayout, THEME_COLOR } from "@/zones/recipes/RecipeLayout";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: THEME_COLOR, colorScheme: "light" };

export default function Layout({ children }: { children: ReactNode }) {
  return <RecipeLayout lang="es">{children}</RecipeLayout>;
}
