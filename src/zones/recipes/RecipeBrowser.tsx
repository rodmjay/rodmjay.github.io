"use client";
// The recipe index with tag filters (Designer's spec, design/specs/rodmjay-recipes.md, "Update 2026-11-26: tags and
// filters"). The build ships every card's data; this filters in the browser: OR inside a facet group, AND across groups.
// The selection lives in the URL (?tags=season:summer,occasion:christmas, full keys) and each change is one
// history.pushState, so Back steps through selections. Before hydration and without script the page is the plain list:
// page N of the whole book with the static pager, and (no script only, html:not([data-js])) the chips are links to the
// flat tag pages. Values on only one recipe have a tag page but no chip (the build leaves them out of `chip`).
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecipeCard, type CardData } from "./Card";

export type FacetValue = { tag: string; label: string; url: string; chip: boolean };
export type FacetGroup = { group: string; label: string; values: FacetValue[] };
export type BrowserWords = Record<
  "count" | "countOne" | "show" | "showOne" | "clearAll" | "clearAllFilters" | "remove" | "selected" | "noMatch" | "emptyTitle" |
  "emptyBody" | "filter" | "filterCount" | "filterHeading" | "moreFilters" | "close" | "newer" | "older" | "page" | "pages", string>;

// The lead block: bigger chips, always open, first in the sheet.
const LEAD = ["course", "dish"];

const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
// Layout effects only run in the browser; the server render never measures.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function RecipeBrowser({ base, items, groups, page0, perPage, sampleLabel, w }: {
  base: string; items: CardData[]; groups: FacetGroup[]; page0: number; perPage: number; sampleLabel?: string; w: BrowserWords;
}) {
  const router = useRouter();
  // Every known tag (single-use ones too: a tag page's "Combine filters" can bring one in), in display order.
  const known = useMemo(() => {
    const m = new Map<string, { group: string; label: string; order: number }>();
    let i = 0;
    for (const g of groups) for (const v of g.values) m.set(v.tag, { group: g.group, label: v.label, order: i++ });
    return m;
  }, [groups]);
  const ordered = useCallback((tags: string[]) => [...new Set(tags)].filter((t) => known.has(t)).sort((a, b) => known.get(a)!.order - known.get(b)!.order), [known]);
  const fromUrl = useCallback(() => {
    try { return ordered((new URLSearchParams(window.location.search).get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean)); }
    catch { return []; }
  }, [ordered]);

  const [sel, setSel] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [live, setLive] = useState(false); // after the first change: cards fade in (motion allowed), focus rules apply
  const [ready, setReady] = useState(false); // hydrated (data-ready on the summary row; the e2e tests wait for it)
  const userChange = useRef(false);
  const gridBox = useRef<HTMLDivElement>(null);
  const emptyBtn = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const openBtn = useRef<HTMLButtonElement>(null);

  // No jitter: the grid keeps the height of the unfiltered page while filtering. Measured before the URL's selection
  // applies (this effect runs first), and again on resize while nothing is selected.
  const selRef = useRef(sel);
  selRef.current = sel;
  useIsoLayoutEffect(() => {
    const box = gridBox.current;
    if (!box) return;
    const measure = () => { if (!selRef.current.length) { box.style.minHeight = ""; box.style.minHeight = `${box.getBoundingClientRect().height}px`; } };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The head script marks a filtered load noindex (langscript.mjs); leaving the index takes that tag away again.
  useEffect(() => () => {
    document.querySelector('meta[name="robots"][data-filtered]')?.remove();
  }, []);

  // The URL's selection on load, and on Back/Forward.
  useEffect(() => {
    const apply = () => { const t = fromUrl(); setSel(t); setPage(1); if (t.length) setLive(true); };
    apply();
    setReady(true);
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [fromUrl]);

  const byGroup = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of sel) { const g = known.get(t)!.group; m.set(g, [...(m.get(g) || []), t]); }
    return m;
  }, [sel, known]);
  const matches = useCallback((x: CardData, skip?: string) => {
    for (const [g, tags] of byGroup) if (g !== skip && !tags.some((t) => x.tags.includes(t))) return false;
    return true;
  }, [byGroup]);
  const filtered = useMemo(() => (sel.length ? items.filter((x) => matches(x)) : items), [items, sel, matches]);
  // A chip is dimmed when choosing it would show nothing: no recipe has it and matches every other group's choice.
  const reachable = useCallback((v: FacetValue, group: string) => items.some((x) => x.tags.includes(v.tag) && matches(x, group)), [items, matches]);

  const filtering = sel.length > 0;
  const n = filtering ? page : page0;
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((n - 1) * perPage, n * perPage);
  const unfilteredPages = Math.ceil(items.length / perPage);
  const pageUrl = (k: number) => (k === 1 ? base : `${base}page/${k}/`);

  const commit = (next: string[]) => {
    const tags = ordered(next);
    userChange.current = true;
    setLive(true);
    setSel(tags);
    setPage(1);
    const url = tags.length ? `${base}?tags=${tags.join(",")}` : base;
    // On /recipes/page/N/ the filtered view belongs to the index: a client navigation, no reload.
    if (page0 > 1) router.push(url, { scroll: false });
    else window.history.pushState(null, "", url);
  };
  const toggle = (tag: string, disabled: boolean) => {
    if (sel.includes(tag)) commit(sel.filter((t) => t !== tag));
    else if (!disabled) commit([...sel, tag]);
  };
  const clear = (focusCount = true) => { commit([]); if (focusCount) requestAnimationFrame(() => countRef.current?.focus()); };
  const removeChip = (tag: string, i: number) => {
    commit(sel.filter((t) => t !== tag));
    // Focus moves to the next selected chip, or the count when none is left.
    requestAnimationFrame(() => {
      const chips = summaryRef.current?.querySelectorAll<HTMLButtonElement>("button.recipe-selected");
      const next = chips?.[Math.min(i, chips.length - 1)];
      (next || countRef.current)?.focus();
    });
  };

  // An empty result after a change moves focus to "Clear all filters" (the count line says 0).
  useEffect(() => {
    if (userChange.current && filtering && filtered.length === 0 && !sheet.current?.open) emptyBtn.current?.focus();
    userChange.current = false;
  }, [sel, filtering, filtered.length]);

  const countText = (k: number) => (k === 1 ? w.countOne : fmt(w.count, { n: k }));
  const showText = (k: number) => (k === 1 ? w.showOne : fmt(w.show, { n: k }));
  const chipGroups = groups.map((g) => ({ ...g, values: g.values.filter((v) => v.chip) })).filter((g) => g.values.length);

  // A plain function, not a component, so the chip buttons keep their identity and focus across renders.
  const lead = chipGroups.filter((g) => LEAD.includes(g.group)), more = chipGroups.filter((g) => !LEAD.includes(g.group));

  const facet = (g: FacetGroup, where: "inline" | "sheet") => (
    <div key={g.group} className="recipe-facet" role="group" aria-labelledby={`rf-${where}-${g.group}`}>
      <h3 className="ds-label-large" id={`rf-${where}-${g.group}`}>{g.label}</h3>
      <ul className="recipe-chips">
        {g.values.map((v) => {
          const on = sel.includes(v.tag), off = !on && !reachable(v, g.group);
          return (
            <li key={v.tag}>
              <button type="button" className="ds-chip" data-tag={v.tag} aria-pressed={on} aria-disabled={off || undefined}
                aria-describedby={off ? `rf-${where}-nomatch` : undefined} onClick={() => toggle(v.tag, off)}>{v.label}</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
  // Course and Dish lead as a larger first block; the other groups sit under "More filters", open on desktop and
  // collapsed in the phone sheet (Designer 11/26). A plain function, not a component, so the chip buttons keep their
  // identity and focus across renders. The <details> keeps whatever the visitor last chose: React never resets `open`.
  const chipBlock = (where: "inline" | "sheet") => (
    <>
      <span id={`rf-${where}-nomatch`} hidden>{w.noMatch}</span>
      {lead.length > 0 && <div className="recipe-lead">{lead.map((g) => facet(g, where))}</div>}
      {more.length > 0 && (
        <details className="recipe-more" open={where === "inline"}>
          <summary className="ds-label-large recipe-more-summary">
            {w.moreFilters}
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M12 15.4 6 9.4 7.4 8l4.6 4.6L16.6 8 18 9.4Z" /></svg>
          </summary>
          <div className="recipe-more-groups">{more.map((g) => facet(g, where))}</div>
        </details>
      )}
    </>
  );

  return (
    <>
      {chipGroups.length > 0 && (
        <>
          {/* Desktop (≥840px): every group in a quiet outlined card. Hidden on phones and without script. */}
          <section className="ds-card outlined recipe-filters recipe-filter-js" aria-labelledby="rf-inline-h">
            <h2 className="ds-sr" id="rf-inline-h">{w.filterHeading}</h2>
            {chipBlock("inline")}
          </section>
          {/* Phone: one Filter button opening a full-height sheet. */}
          <p className="recipe-filter-open recipe-filter-js">
            <button ref={openBtn} type="button" className="ds-btn outlined" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
              {sel.length ? fmt(w.filterCount, { n: sel.length }) : w.filter}
            </button>
          </p>
          <dialog ref={sheet} className="ds-dialog sheet recipe-sheet" aria-labelledby="rf-sheet-h" onClose={() => openBtn.current?.focus()}>
            <div className="recipe-sheet-head">
              <h2 id="rf-sheet-h" className="ds-title-large">{w.filterHeading}</h2>
              <button type="button" className="ds-btn text icon" aria-label={w.close} onClick={() => sheet.current?.close()}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z" /></svg>
              </button>
            </div>
            <div className="recipe-sheet-groups">{chipBlock("sheet")}</div>
            <div className="recipe-sheet-bar">
              <button type="button" className="ds-btn text" onClick={() => clear(false)}>{w.clearAll}</button>
              <button type="button" className="ds-btn" onClick={() => sheet.current?.close()}>{showText(filtered.length)}</button>
            </div>
          </dialog>
          {/* Without script: the chips are links to the flat tag pages. */}
          <nav className="ds-card outlined recipe-filters-nojs" aria-label={w.filterHeading}>
            {[...lead, ...more].map((g) => (
              <div key={g.group} className={`recipe-facet${LEAD.includes(g.group) ? " recipe-lead-facet" : ""}`}>
                <h3 className="ds-label-large">{g.label}</h3>
                <ul className="recipe-chips">{g.values.map((v) => <li key={v.tag}><Link className="ds-chip" href={v.url}>{v.label}</Link></li>)}</ul>
              </div>
            ))}
          </nav>
        </>
      )}

      {/* The selected summary: always the same reserved row. */}
      <div className="recipe-summary" ref={summaryRef} data-ready={ready ? "" : undefined}>
        <p className="ds-label-large recipe-count" role="status" aria-live="polite" tabIndex={-1} ref={countRef}>{countText(filtered.length)}</p>
        {sel.length > 0 && (
          <ul className="recipe-selected-list" aria-label={w.selected}>
            {sel.map((t, i) => (
              <li key={t}>
                <button type="button" className="ds-chip recipe-selected" aria-label={fmt(w.remove, { tag: known.get(t)!.label })} onClick={() => removeChip(t, i)}>
                  {known.get(t)!.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z" /></svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={`ds-btn text recipe-clear${sel.length ? "" : " is-idle"}`} onClick={() => clear()} tabIndex={sel.length ? undefined : -1} aria-hidden={sel.length ? undefined : true}>{w.clearAll}</button>
      </div>

      <div className={`recipe-results${live ? " is-live" : ""}`} ref={gridBox}>
        {shown.length ? (
          <ul className="recipe-grid">
            {shown.map((x, i) => <li key={x.url}><RecipeCard x={x} eager={n === 1 && i < 3} sampleLabel={sampleLabel} /></li>)}
          </ul>
        ) : (
          <div className="ds-card outlined recipe-empty">
            <h2 className="ds-title-large">{w.emptyTitle}</h2>
            <p className="ds-body-large ds-variant">{w.emptyBody}</p>
            <button ref={emptyBtn} type="button" className="ds-btn" onClick={() => clear()}>{w.clearAllFilters}</button>
          </div>
        )}
      </div>

      {/* The pager row stays reserved while filtering so nothing below it moves. */}
      {(unfilteredPages > 1 || total > 1) && (
        <nav className="more recipe-pager" aria-label={w.pages}>
          {!filtering ? (
            <>
              {n > 1 ? <Link className="ds-btn text" href={pageUrl(n - 1)}>← {w.newer}</Link> : null}
              <span className="ds-body-medium ds-variant">{fmt(w.page, { n, total: unfilteredPages })}</span>
              {n < unfilteredPages ? <Link className="ds-btn text" href={pageUrl(n + 1)}>{w.older} →</Link> : null}
            </>
          ) : total > 1 ? (
            <>
              {n > 1 ? <button type="button" className="ds-btn text" onClick={() => setPage(n - 1)}>← {w.newer}</button> : null}
              <span className="ds-body-medium ds-variant">{fmt(w.page, { n, total })}</span>
              {n < total ? <button type="button" className="ds-btn text" onClick={() => setPage(n + 1)}>{w.older} →</button> : null}
            </>
          ) : null}
        </nav>
      )}
    </>
  );
}
