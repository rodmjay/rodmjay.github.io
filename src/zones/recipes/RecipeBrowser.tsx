"use client";
// All recipes (Designer's homey spec): the whole book as photo cards, with search (?q=, title and ingredients; the header's
// search box is a GET form that lands here) and the tag filters from the earlier spec kept as a secondary "More filters"
// disclosure, collapsed (OR inside a facet group, AND across groups, ?tags=group:key,…). Both live in the URL and each
// change is one history.pushState, so Back steps through them. Before hydration and without script the page is the plain
// list: page N of the whole book with the static pager, and the filter chips are links to the flat tag pages.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecipeCard, type CardData } from "./Card";

export type FacetValue = { tag: string; label: string; url: string; chip: boolean };
export type FacetGroup = { group: string; label: string; values: FacetValue[] };
export type BrowserWords = Record<
  "count" | "countOne" | "clearAll" | "clearAllFilters" | "remove" | "selected" | "noMatch" | "emptyTitle" | "emptyBody" |
  "filterHeading" | "moreFilters" | "newer" | "older" | "page" | "pages" | "searchFor" | "searchClear", string>;

const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function RecipeBrowser({ base, items, groups, page0, perPage, w }: {
  base: string; items: CardData[]; groups: FacetGroup[]; page0: number; perPage: number; w: BrowserWords;
}) {
  const router = useRouter();
  const known = useMemo(() => {
    const m = new Map<string, { group: string; label: string; order: number }>();
    let i = 0;
    for (const g of groups) for (const v of g.values) m.set(v.tag, { group: g.group, label: v.label, order: i++ });
    return m;
  }, [groups]);
  const ordered = useCallback((tags: string[]) => [...new Set(tags)].filter((t) => known.has(t)).sort((a, b) => known.get(a)!.order - known.get(b)!.order), [known]);
  const fromUrl = useCallback(() => {
    try {
      const u = new URLSearchParams(window.location.search);
      return { tags: ordered((u.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean)), q: (u.get("q") || "").trim().slice(0, 80) };
    } catch { return { tags: [] as string[], q: "" }; }
  }, [ordered]);

  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const userChange = useRef(false);
  const gridBox = useRef<HTMLDivElement>(null);
  const emptyBtn = useRef<HTMLButtonElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // No jitter: the grid keeps the height of the unfiltered page while filtering.
  const activeRef = useRef(false);
  activeRef.current = sel.length > 0 || q !== "";
  useIsoLayoutEffect(() => {
    const box = gridBox.current;
    if (!box) return;
    const measure = () => { if (!activeRef.current) { box.style.minHeight = ""; box.style.minHeight = `${box.getBoundingClientRect().height}px`; } };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The head script marks a filtered or searched load noindex (langscript.mjs); leaving the page takes that tag away.
  useEffect(() => () => { document.querySelector('meta[name="robots"][data-filtered]')?.remove(); }, []);

  useEffect(() => {
    const apply = () => { const s = fromUrl(); setSel(s.tags); setQ(s.q); setPage(1); };
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
  const words = useMemo(() => fold(q).split(/\s+/).filter(Boolean), [q]);
  const matches = useCallback((x: CardData, skip?: string) => {
    for (const [g, tags] of byGroup) if (g !== skip && !tags.some((t) => x.tags.includes(t))) return false;
    return words.every((wd) => x.search.includes(wd));
  }, [byGroup, words]);
  const active = sel.length > 0 || words.length > 0;
  const filtered = useMemo(() => (active ? items.filter((x) => matches(x)) : items), [items, active, matches]);
  const reachable = useCallback((v: FacetValue, group: string) => items.some((x) => x.tags.includes(v.tag) && matches(x, group)), [items, matches]);

  const n = active ? page : page0;
  const total = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((n - 1) * perPage, n * perPage);
  const unfilteredPages = Math.ceil(items.length / perPage);
  const pageUrl = (k: number) => (k === 1 ? base : `${base}page/${k}/`);

  const commit = (next: string[], nextQ = q) => {
    const tags = ordered(next);
    userChange.current = true;
    setSel(tags);
    setQ(nextQ);
    setPage(1);
    const params = [tags.length ? `tags=${tags.join(",")}` : "", nextQ ? `q=${encodeURIComponent(nextQ)}` : ""].filter(Boolean).join("&");
    const url = params ? `${base}?${params}` : base;
    if (page0 > 1) router.push(url, { scroll: false });
    else window.history.pushState(null, "", url);
  };
  const toggle = (tag: string, disabled: boolean) => {
    if (sel.includes(tag)) commit(sel.filter((t) => t !== tag));
    else if (!disabled) commit([...sel, tag]);
  };
  const clear = () => { commit([], ""); requestAnimationFrame(() => countRef.current?.focus()); };
  const removeChip = (tag: string, i: number) => {
    commit(sel.filter((t) => t !== tag));
    requestAnimationFrame(() => {
      const chips = summaryRef.current?.querySelectorAll<HTMLButtonElement>("button.rb-selected");
      (chips?.[Math.min(i, chips.length - 1)] || countRef.current)?.focus();
    });
  };

  useEffect(() => {
    if (userChange.current && active && filtered.length === 0) emptyBtn.current?.focus();
    userChange.current = false;
  }, [sel, q, active, filtered.length]);

  const countText = (k: number) => (k === 1 ? w.countOne : fmt(w.count, { n: k }));
  const chipGroups = groups.map((g) => ({ ...g, values: g.values.filter((v) => v.chip) })).filter((g) => g.values.length);

  return (
    <>
      {chipGroups.length > 0 && (
        <details className="rb-more rb-js">
          <summary>{w.moreFilters}{sel.length > 0 && ` (${sel.length})`}</summary>
          <span id="rb-nomatch" hidden>{w.noMatch}</span>
          <div className="rb-groups">
            {chipGroups.map((g) => (
              <div key={g.group} className="rb-facet" role="group" aria-labelledby={`rb-g-${g.group}`}>
                <h3 id={`rb-g-${g.group}`}>{g.label}</h3>
                <ul className="rb-chips">
                  {g.values.map((v) => {
                    const on = sel.includes(v.tag), off = !on && !reachable(v, g.group);
                    return (
                      <li key={v.tag}>
                        <button type="button" className="rb-chip" data-tag={v.tag} aria-pressed={on} aria-disabled={off || undefined}
                          aria-describedby={off ? "rb-nomatch" : undefined} onClick={() => toggle(v.tag, off)}>{v.label}</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </details>
      )}
      {chipGroups.length > 0 && (
        <details className="rb-more rb-nojs">
          <summary>{w.moreFilters}</summary>
          <div className="rb-groups">
            {chipGroups.map((g) => (
              <div key={g.group} className="rb-facet">
                <h3>{g.label}</h3>
                <ul className="rb-chips">{g.values.map((v) => <li key={v.tag}><Link className="rb-chip" href={v.url}>{v.label}</Link></li>)}</ul>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="rb-summary" ref={summaryRef} data-ready={ready ? "" : undefined}>
        <p className="rb-count" role="status" aria-live="polite" tabIndex={-1} ref={countRef}>
          {q ? <>{fmt(w.searchFor, { q })} · </> : null}{countText(filtered.length)}
        </p>
        {sel.length > 0 && (
          <ul className="rb-selected-list" aria-label={w.selected}>
            {sel.map((t, i) => (
              <li key={t}>
                <button type="button" className="rb-chip rb-selected" aria-label={fmt(w.remove, { tag: known.get(t)!.label })} onClick={() => removeChip(t, i)}>
                  {known.get(t)!.label} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q && <button type="button" className="rb-textbtn" onClick={() => commit(sel, "")}>{w.searchClear}</button>}
        {active && <button type="button" className="rb-textbtn" onClick={clear}>{w.clearAll}</button>}
      </div>

      <div className="rb-results" ref={gridBox}>
        {shown.length ? (
          <ul className="rb-grid">
            {shown.map((x, i) => <li key={x.url}><RecipeCard x={x} eager={n === 1 && i < 3} heading="h2" /></li>)}
          </ul>
        ) : (
          <div className="rb-empty">
            <h2>{w.emptyTitle}</h2>
            <p>{w.emptyBody}</p>
            <button ref={emptyBtn} type="button" className="rb-btn" onClick={clear}>{w.clearAllFilters}</button>
          </div>
        )}
      </div>

      {(unfilteredPages > 1 || total > 1) && (
        <nav className="rb-pager" aria-label={w.pages}>
          {!active ? (
            <>
              {n > 1 ? <Link className="rb-btn o" href={pageUrl(n - 1)}>← {w.newer}</Link> : null}
              <span>{fmt(w.page, { n, total: unfilteredPages })}</span>
              {n < unfilteredPages ? <Link className="rb-btn o" href={pageUrl(n + 1)}>{w.older} →</Link> : null}
            </>
          ) : total > 1 ? (
            <>
              {n > 1 ? <button type="button" className="rb-btn o" onClick={() => setPage(n - 1)}>← {w.newer}</button> : null}
              <span>{fmt(w.page, { n, total })}</span>
              {n < total ? <button type="button" className="rb-btn o" onClick={() => setPage(n + 1)}>{w.older} →</button> : null}
            </>
          ) : null}
        </nav>
      )}
    </>
  );
}
