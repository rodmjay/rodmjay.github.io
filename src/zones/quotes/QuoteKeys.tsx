"use client";
// Shortcuts on a quote page: ← and → (not while typing in a field, not with a modifier) and a horizontal swipe follow the
// page's own rel="prev" / rel="next" links, so the links stay the real way through (Designer 11/24).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function QuoteKeys({ prev, next }: { prev: string; next: string }) {
  const router = useRouter();
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || typing(e.target)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); router.push(prev); }
      else if (e.key === "ArrowRight") { e.preventDefault(); router.push(next); }
    };
    let x = 0, y = 0;
    const onStart = (e: TouchEvent) => { x = e.touches[0].clientX; y = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - x, dy = e.changedTouches[0].clientY - y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) router.push(dx < 0 ? next : prev);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    router.prefetch(prev); router.prefetch(next);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("touchstart", onStart); window.removeEventListener("touchend", onEnd); };
  }, [router, prev, next]);
  return null;
}
