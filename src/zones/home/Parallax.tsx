"use client";
// Parallax: one passive listener, one rAF write of --p. Nothing runs with reduced motion.
import { useEffect } from "react";

export function Parallax() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scene = document.getElementById("scene");
    if (!scene) return;
    let ticking = false;
    const update = () => { ticking = false; const h = scene.offsetHeight; scene.style.setProperty("--p", Math.min(1, Math.max(0, scrollY / h)).toFixed(3)); };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
