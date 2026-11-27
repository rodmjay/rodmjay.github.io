import type { Viewport } from "next";
import { Home, homeMeta } from "@/zones/home/Home";

// The home is always dark (Rod 11/27, "Dark always"): its own theme colour and colour scheme.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#121415", colorScheme: "dark" };

export const metadata = homeMeta("es");
export default function Page() { return <Home lang="es" />; }
