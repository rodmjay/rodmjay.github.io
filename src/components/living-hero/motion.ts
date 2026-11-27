// The visitor's "Motion on/off" preference (docs/adr/0004): one localStorage key, "motion", for both products on this
// origin, listed on the privacy page. Written only when the visitor clicks the toggle (Compliance 11/27); with no choice
// stored the default is on, or off where the system asks for reduced motion. Read and written in try/catch.
export const MOTION_EVENT = "living-hero:motion";
export function motionOn(): boolean {
  let stored: string | null = null;
  try { stored = localStorage.getItem("motion"); } catch {}
  if (stored === "on" || stored === "off") return stored === "on";
  try { return !window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return true; }
}
export function setMotion(on: boolean) {
  try { localStorage.setItem("motion", on ? "on" : "off"); } catch {}
  window.dispatchEvent(new Event(MOTION_EVENT));
}
