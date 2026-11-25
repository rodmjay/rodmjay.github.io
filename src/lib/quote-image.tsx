// A quote as a 1200×1200 PNG, made at build time with next/og (Rod 11/24: "make them an image of the text … the right
// size for instagram or facebook or x"). A square posts uncropped on all three and is the page's og:image too.
// Designer's spec (design/specs/rodmjay-quotes.md, update 11/24): dark only, Space Grotesk Medium for the quote, Inter for
// the attribution and the site name, a 4px accent rule, 96px margin, no quote marks, gradients, glow or texture.
// Fonts are the static .woff files from @fontsource (satori can't read woff2), Latin and Latin Extended (OFL).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const font = (pkg: string, file: string) => readFileSync(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));
let fonts: any[] | undefined;
const loadFonts = () => (fonts ||= [
  { name: "Space Grotesk", weight: 500, style: "normal", data: font("space-grotesk", "space-grotesk-latin-500-normal.woff") },
  { name: "Space Grotesk", weight: 500, style: "normal", data: font("space-grotesk", "space-grotesk-latin-ext-500-normal.woff") },
  { name: "Inter", weight: 400, style: "normal", data: font("inter", "inter-latin-400-normal.woff") },
  { name: "Inter", weight: 400, style: "normal", data: font("inter", "inter-latin-ext-400-normal.woff") },
]);

export const SIZE = 1200;
const C = { bg: "#131318", text: "#e4e1e9", muted: "#c6c5d3", accent: "#ff7aae" };
// 64px up to about 140 characters, 52px up to about 280, 44px beyond (never below 40; quotes stay short).
export const quoteSize = (n: number) => (n <= 140 ? 64 : n <= 280 ? 52 : 44);

// One image serves both languages, so its words are English; a translated quote says so (Compliance 11/24).
const english = (code: string) => { try { return new Intl.DisplayNames(["en"], { type: "language" }).of(code) || code; } catch { return code; } };
export function quoteImage(q: { text: string; author: string; source?: string; year?: string; original?: { lang: string } | null }) {
  const by = [q.author || "Unknown", [q.source, q.year].filter(Boolean).join(", ")].filter(Boolean).join(", ")
    + (q.original ? ` · translated from ${english(q.original.lang)}` : "");
  return new ImageResponse(
    (
      <div style={{ width: SIZE, height: SIZE, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 96, background: C.bg }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", fontFamily: "Space Grotesk", fontWeight: 500, fontSize: quoteSize(q.text.length), lineHeight: 1.25, color: C.text }}>{q.text}</div>
          <div style={{ display: "flex", width: 96, height: 4, background: C.accent, marginTop: 48, marginBottom: 32 }} />
          <div style={{ display: "flex", fontFamily: "Inter", fontSize: 32, lineHeight: 1.35, color: C.muted }}>{by}</div>
        </div>
        <div style={{ display: "flex", fontFamily: "Inter", fontSize: 28, color: C.muted }}>rodmjay.com</div>
      </div>
    ),
    { width: SIZE, height: SIZE, fonts: loadFonts() },
  );
}
