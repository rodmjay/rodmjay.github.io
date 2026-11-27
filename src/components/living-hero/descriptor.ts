// A living hero's descriptor (docs/adr/0004): what differs per picture. Checked at build (the import in each page) and
// again at runtime before any texture loads (Security 11/27, check 1): paths are site-relative only, and nothing in it
// ever becomes markup.
export type Variant = {
  media: string; image: string; mask: string; skyTex: string; size: [number, number]; horizon: number;
  moon: { x: number; y: number; r: number }; focus: string; land?: [number, number][];
};
export type Descriptor = { id: string; phases: number[]; variants: Variant[] };

const PATH = /^\/[A-Za-z0-9._/-]+\.(webp|png|avif|jpg)$/;
export const okPath = (p: unknown) => typeof p === "string" && PATH.test(p) && !p.includes("//") && !p.includes("..");
const frac = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1;
const FOCUS = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;

// Throws on anything outside the contract; returns the descriptor typed.
export function checkDescriptor(d: unknown): Descriptor {
  const x = d as Descriptor;
  if (!x || typeof x.id !== "string" || !/^[a-z0-9-]{1,60}$/.test(x.id)) throw new Error("living-hero: bad id");
  if (!Array.isArray(x.phases) || !x.phases.every((p) => p === 1 || p === 2 || p === 3)) throw new Error("living-hero: bad phases");
  if (!Array.isArray(x.variants) || !x.variants.length || x.variants.length > 6) throw new Error("living-hero: bad variants");
  for (const v of x.variants) {
    if (typeof v.media !== "string" || v.media.length > 120 || !okPath(v.image) || !okPath(v.mask) || !okPath(v.skyTex)) throw new Error("living-hero: bad variant paths");
    if (!Array.isArray(v.size) || v.size.length !== 2 || !v.size.every((n) => Number.isInteger(n) && n > 0 && n <= 4096)) throw new Error("living-hero: bad size");
    if (!(typeof v.horizon === "number" && v.horizon >= 0.5 && v.horizon <= 0.7)) throw new Error("living-hero: horizon outside 0.5 to 0.7");
    if (!v.moon || !frac(v.moon.x) || !frac(v.moon.y) || !frac(v.moon.r)) throw new Error("living-hero: bad moon");
    if (typeof v.focus !== "string" || !FOCUS.test(v.focus)) throw new Error("living-hero: bad focus");
  }
  return x;
}

// The file the page's <img> is showing right now, as a site path, if it is one of ours: the canvas samples the same
// pixels, so its first frame matches the picture exactly (the <img> picks 1280, 1920 or 2560 by width and density).
export function shownImage(img: HTMLImageElement | null): string | null {
  try {
    if (!img?.currentSrc) return null;
    const u = new URL(img.currentSrc, location.href);
    return u.origin === location.origin && okPath(u.pathname) ? u.pathname : null;
  } catch { return null; }
}

// The variant for the current width: the first whose media query matches (the same breakpoints as the page's <picture>).
export function pickVariant(d: Descriptor): Variant | null {
  return d.variants.find((v) => window.matchMedia(v.media).matches) ?? null;
}
