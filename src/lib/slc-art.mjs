// Discover SLC's own illustrations (design/specs/discover-slc.md "image-forward and fun"; slc-poster-look-sheet.md "Final
// files"): one generated picture family, never an event's own image. A card's picture is chosen by its category (events)
// or type (guide), and its variant by a stable hash of the entry's id, so a card always shows the same picture and
// neighbours differ. The hero is the season's plate, chosen at build time (America/Denver, astronomical dates).
export const ART_BASE = "/slc/art";
const SUBJECTS = {
  concert: ["concerts", 2], festival: ["festivals", 2], art: ["art", 2], market: ["markets", 2],
  convention: ["conventions", 2], networking: ["conventions", 2], comedy: ["comedy", 2], family: ["family", 2],
  trail: ["trails", 3], daytrip: ["daytrips", 3], destination: ["destinations", 3], plan: ["dayplans", 2],
};
// FNV-1a, so the choice is the same on every build.
function hash(s) { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h; }

// { subject, n, key } for an entry, or null (the card then shows the flat category-icon tile).
export function pictureFor(kind, id) {
  const s = SUBJECTS[kind];
  if (!s) return null;
  const n = (hash(id) % s[1]) + 1;
  // Trails, day trips and destinations have an alt per variant; the rest share one per subject.
  const key = ["trails", "daytrips", "destinations"].includes(s[0]) ? `${s[0]}-${n}` : s[0];
  return { subject: s[0], n, key };
}
export const cardSrc = (p, w, ext) => `${ART_BASE}/cards/${p.subject}-${p.n}-${w}.${ext}`;

// The season on a Denver date key "YYYY-MM-DD": spring from 20 Mar, summer 21 Jun, fall 22 Sep, winter 21 Dec.
export function season(key) {
  const md = key.slice(5);
  if (md >= "12-21" || md < "03-20") return "winter";
  if (md < "06-21") return "spring";
  if (md < "09-22") return "summer";
  return "fall";
}
export const heroSrc = (s, w, ext) => `${ART_BASE}/hero/slc-hero-${s}-${w}.${ext}`;
