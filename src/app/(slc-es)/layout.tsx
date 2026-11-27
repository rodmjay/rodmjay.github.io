// Discover SLC's own root layout (es): its own <html>, header, nav and footer (src/zones/slc/SlcLayout.tsx), never the
// personal site's shell (Rod 11/27: "its own brand, its own chrome, own theme").
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { SlcLayout, THEME_COLOR } from "@/zones/slc/SlcLayout";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: THEME_COLOR, colorScheme: "dark" };

export default function Layout({ children }: { children: ReactNode }) {
  return <SlcLayout lang="es">{children}</SlcLayout>;
}
