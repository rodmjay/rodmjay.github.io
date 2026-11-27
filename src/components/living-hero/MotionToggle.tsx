"use client";
// The footer's "Motion on/off" (Designer 11/27; WCAG 2.2.2 pause control for the living hero): a button with aria-pressed,
// its visible label showing the state, 48px. Takes effect live (the hero listens for MOTION_EVENT). Rendered only after
// hydration knows the stored state, so the label never flips on load; without script there is no motion to control.
import { useEffect, useState } from "react";
import { motionOn, setMotion, MOTION_EVENT } from "./motion";

export type MotionWords = Record<"on" | "off" | "nameOn" | "nameOff", string>;

export function MotionToggle({ w }: { w: MotionWords }) {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    const sync = () => setOn(motionOn());
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(MOTION_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return (
    <button type="button" className="motion-toggle" aria-pressed={on ?? true} aria-label={on === false ? w.nameOff : w.nameOn}
      hidden={on === null} onClick={() => setMotion(!(on ?? true))}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm">
        {on === false
          ? <path d="M8 19V5l11 7Z" />
          : <path d="M14 19V5h4v14Zm-8 0V5h4v14Z" />}
      </svg>
      {on === false ? w.off : w.on}
    </button>
  );
}
