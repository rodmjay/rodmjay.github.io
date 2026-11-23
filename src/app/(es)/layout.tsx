// The Spanish root layout: <html lang="es-419">, the header, nav and footer (src/zones/shell).
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { RootLayout } from "@/zones/shell/RootLayout";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout lang="es">{children}</RootLayout>;
}
