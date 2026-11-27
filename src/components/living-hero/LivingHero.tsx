"use client";
// The living hero (docs/adr/0004; design/specs/living-hero.md): a decorative canvas over the page's own hero picture. The
// <img> stays the page, the LCP and the no-script view; this only adds motion where everything allows it, loaded on idle
// after the page has loaded. Off (the image stays, nothing more loads) for: reduced motion (unless the visitor turned
// Motion on themselves), save-data, no WebGL, a
// low-end device, the visitor's "Motion off", a hidden tab or the band off screen (paused), and slow frames, a GL error
// or context loss (for the session). Reacts live to the toggle and to a reduced-motion change. Nothing is logged or sent.
import { useEffect, useRef } from "react";
import { checkDescriptor, type Descriptor } from "./descriptor";
import { motionOn, MOTION_EVENT } from "./motion";

declare global { interface Navigator { deviceMemory?: number; connection?: { saveData?: boolean } } }

// WebGL support, probed once per page and the probe context released at once (browsers cap live contexts; a leaked
// probe could cost the real canvas its context: Security 11/27).
let webgl: boolean | null = null;
function hasWebGL(): boolean {
  if (webgl !== null) return webgl;
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    webgl = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { webgl = false; }
  return webgl;
}

function allowed(): boolean {
  try {
    if (navigator.connection?.saveData) return false;
    if ((navigator.deviceMemory ?? 8) <= 2 && (navigator.hardwareConcurrency ?? 8) <= 2) return false;
    if (!motionOn()) return false;
    return hasWebGL();
  } catch { return false; }
}

export function LivingHero({ descriptor }: { descriptor: Descriptor }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let d: Descriptor;
    try { d = checkDescriptor(descriptor); } catch { return; }
    if (process.env.NODE_ENV !== "production") console.debug(`living-hero: ${d.id}`);
    let stop: (() => void) | null = null, broken = false, idle = 0;
    const canvas = ref.current!;
    const off = () => { stop?.(); stop = null; canvas.classList.remove("on"); };
    const on = () => {
      if (stop || broken || !allowed()) return;
      import("./engine").then(({ start }) => {
        if (stop || broken || !allowed()) return;
        stop = start(canvas, d, () => canvas.classList.add("on"), () => { broken = true; off(); });
      }).catch(() => { broken = true; });
    };
    const later = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      idle = w.requestIdleCallback ? w.requestIdleCallback(on, { timeout: 3000 }) : window.setTimeout(on, 1500);
    };
    if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPref = () => (allowed() ? on() : off());
    rm.addEventListener("change", onPref);
    window.addEventListener(MOTION_EVENT, onPref);
    return () => {
      off(); window.removeEventListener("load", later);
      const w = window as Window & { cancelIdleCallback?: (n: number) => void };
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle); else clearTimeout(idle);
      rm.removeEventListener("change", onPref); window.removeEventListener(MOTION_EVENT, onPref);
    };
  }, [descriptor]);
  return <canvas ref={ref} className="living-hero" aria-hidden="true" />;
}
