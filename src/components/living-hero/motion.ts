// The visitor's "Motion on/off" preference (docs/adr/0004): one localStorage key, "motion", for both products on this
// origin. Listed on the privacy page. Read and written in try/catch (private windows can throw); default on.
export const MOTION_EVENT = "living-hero:motion";
export function motionOn(): boolean {
  try { return localStorage.getItem("motion") !== "off"; } catch { return true; }
}
export function setMotion(on: boolean) {
  try { localStorage.setItem("motion", on ? "on" : "off"); } catch {}
  window.dispatchEvent(new Event(MOTION_EVENT));
}
