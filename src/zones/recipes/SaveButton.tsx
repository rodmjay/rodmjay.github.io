"use client";
// "Save" on a recipe page (Designer's homey spec: a local heart, no account). One localStorage key, "recipes-saved": a JSON
// list of recipe slugs, written only when the visitor clicks Save or Unsave, never sent anywhere. Every access is in
// try/catch: with storage blocked the button still toggles for this visit. Shown only with RECIPES_SAVE=1 (after Security's
// pass on the key; listed on the privacy page).
import { useEffect, useState } from "react";

const KEY = "recipes-saved";
const SLUG = /^[a-z0-9-]{1,80}$/;
const read = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter((s) => typeof s === "string" && SLUG.test(s)) : []; }
  catch { return []; }
};

export function SaveButton({ slug, save, saved }: { slug: string; save: string; saved: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(read().includes(slug)); }, [slug]);
  const click = () => {
    const next = !on;
    setOn(next);
    try {
      const list = read().filter((s) => s !== slug);
      localStorage.setItem(KEY, JSON.stringify(next ? [slug, ...list].slice(0, 500) : list));
    } catch {}
  };
  return (
    <button type="button" className="rb-btn o rb-save" aria-pressed={on} onClick={click}>
      <span aria-hidden="true">{on ? "♥" : "♡"}</span> {on ? saved : save}
    </button>
  );
}
