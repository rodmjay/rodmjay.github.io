// The English root layout: <html lang="en">, the header, nav and footer (src/zones/shell).
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { RootLayout } from "@/zones/shell/RootLayout";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1f4e8c" };

export default function Layout({ children }: { children: ReactNode }) {
  return <RootLayout lang="en">{children}</RootLayout>;
}
