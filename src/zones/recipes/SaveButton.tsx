"use client";
// "Save" on a recipe page (Designer's homey spec: a local heart, no account). One localStorage key, "recipes-saved": a JSON
// list of recipe slugs, written only when the visitor clicks Save or Unsave, never sent anywhere. Shown only with
// RECIPES_SAVE=1. Security's conditions (11/27): the stored value is validated on every read (an array of slugs matching
// ^[a-z0-9-]{1,80}$, de-duplicated, at most 500, anything else dropped silently); only slugs are ever written; nothing
// is built from a stored value (this button compares it to its own slug from the build); when storage is blocked or full
// the button isn't shown and no error appears; another tab's change (the storage event) only triggers a re-read.
// Compliance: listed on the privacy page next to "motion".
import { useEffect, useState } from "react";

const KEY = "recipes-saved";
const SLUG = /^[a-z0-9-]{1,80}$/;
const MAX = 500;
function read(): string[] {
  const raw = localStorage.getItem(KEY); // throws when storage is blocked: the caller hides the button
  let v: unknown;
  try { v = JSON.parse(raw || "[]"); } catch { return []; }
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((s): s is string => typeof s === "string" && SLUG.test(s)))].slice(0, MAX);
}

export function SaveButton({ slug, save, saved }: { slug: string; save: string; saved: string }) {
  const [state, setState] = useState<"off" | "on" | "none">("none"); // "none": not shown (before hydration, or no storage)
  useEffect(() => {
    const sync = () => { try { setState(read().includes(slug) ? "on" : "off"); } catch { setState("none"); } };
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) sync(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);
  if (state === "none" || !SLUG.test(slug)) return null;
  const on = state === "on";
  const click = () => {
    try {
      const list = read().filter((s) => s !== slug);
      localStorage.setItem(KEY, JSON.stringify(on ? list : [slug, ...list].slice(0, MAX)));
      setState(on ? "off" : "on");
    } catch { setState("none"); }
  };
  return (
    <button type="button" className="rb-btn o rb-save" aria-pressed={on} onClick={click}>
      <span aria-hidden="true">{on ? "♥" : "♡"}</span> {on ? saved : save}
    </button>
  );
}
