"use client";
// Discover SLC's events block: date and category filter chips, a count, the day groups and the "Every week" group
// (Designer's spec, design/specs/rodmjay-events.md, with the 11/27 updates). The build renders the default view (next
// 30 days, all categories) as of the build day; in the browser this takes today's date and the URL's filters
// (?when=week|weekend&cat=concert,market, defaults left out) and each change is one history.pushState, so Back steps
// through them. A filtered URL is noindex (langscript.mjs) and canonical to the plain page. Free text from the feed
// (titles, venues, cities, schedule lines) only ever goes in as React text, never HTML (Security 11/27).
import { useCallback, useEffect, useRef, useState } from "react";
import { type Ev, type When, type Words, dayHeading, denverToday, fmt, shortDate, time, view } from "./logic";

type Lang = "en" | "es";
export type BrowserWords = Words & Record<
  "filterHeading" | "when" | "category" | "week" | "weekend" | "month" | "clear" | "count" | "countOne" | "countWeekly" |
  "everyWeek" | "noMatch" | "nothingWeek" | "seeMonth" | "newTab" | "soldOutNote" | "allAges" | "over21" | "soldOut" |
  "free" | "fromPrice" | "through" | "throughCap", string> & { cat: Record<string, string>; cats: Record<string, string> };

const WHENS: When[] = ["week", "weekend", "month"];

function readUrl(known: string[]): { when: When; cats: string[] } {
  try {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("when");
    const cats = (q.get("cat") || "").split(",").map((s) => s.trim()).filter((c) => known.includes(c));
    return { when: w === "week" || w === "weekend" ? w : "month", cats: known.filter((c) => cats.includes(c)) };
  } catch {
    return { when: "month", cats: [] };
  }
}

function priceText(e: Ev, w: BrowserWords) {
  if (!e.price) return "";
  if (e.price.kind === "free") return w.free;
  if (e.price.kind === "from") return fmt(w.fromPrice, { amount: e.price.amount! });
  return e.price.amount!;
}

// The pressed chip's check mark comes from the design system (.ds-chip[aria-pressed="true"]::before).
const External = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm ev-ext"><path d="M5 21q-.82 0-1.41-.59T3 19V5q0-.82.59-1.41T5 3h7v2H5v14h14v-7h2v7q0 .82-.59 1.41T19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z" /></svg>;

function Card({ e, day, lang, w }: { e: Ev; day: string | null; lang: Lang; w: BrowserWords }) {
  let when: string;
  if (e.recurring) when = e.sched![lang];
  else if (day && e.startKey < day) when = fmt(w.throughCap, { date: shortDate(e.endKey!, w) });
  else when = time(e.h, e.min, w) + (e.endKey && e.endKey > e.startKey ? `, ${fmt(w.through, { date: shortDate(e.endKey, w) })}` : "");
  const place = [e.venue, e.city].filter(Boolean).join(", ");
  const price = priceText(e, w);
  return (
    <article className="ds-card outlined ev-card">
      <p className="ds-label-large ds-variant ev-when">{when} · {w.cat[e.category]}</p>
      <h3 className="ds-title-medium ev-title">
        {e.url ? (
          <a href={e.url} target="_blank" rel="noopener noreferrer">
            {e.title}<span className="ds-sr"> ({w.newTab})</span><External />
          </a>
        ) : e.title}
      </h3>
      {place && <p className="ds-body-medium ev-place">{place}</p>}
      {(e.age || price || e.soldOut) && (
        <div className="ev-meta">
          {e.age && <span className="ds-chip status ev-age">{w[e.age]}</span>}
          {price && <span className="ds-body-medium ev-price">{price}{e.soldOut && <span className="ds-sr"> ({w.soldOutNote})</span>}</span>}
          {e.soldOut && (
            <span className="ds-chip status error ev-sold">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M12 22q-2.07 0-3.9-.79t-3.18-2.14q-1.35-1.35-2.14-3.17T2 12q0-2.08.79-3.9t2.14-3.18Q6.27 3.57 8.1 2.79T12 2q2.08 0 3.9.79t3.18 2.14q1.35 1.35 2.14 3.17T22 12q0 2.07-.79 3.9t-2.14 3.17q-1.35 1.35-3.17 2.14T12 22Zm0-2q1.35 0 2.6-.44t2.3-1.26L5.7 7.1q-.82 1.05-1.26 2.3T4 12q0 3.35 2.33 5.68T12 20Zm6.3-3.1q.82-1.05 1.26-2.3T20 12q0-3.35-2.33-5.68T12 4q-1.35 0-2.6.44T7.1 5.7Z" /></svg>
              {w.soldOut}
            </span>
          )}
        </div>
      )}
    </article>
  );
}

export function EventBrowser({ events, today0, lang, w }: { events: Ev[]; today0: string; lang: Lang; w: BrowserWords }) {
  const known = [...new Set(events.map((e) => e.category))];
  const chipCats = Object.keys(w.cats).filter((c) => known.includes(c));
  const [today, setToday] = useState(today0);
  const [when, setWhen] = useState<When>("month");
  const [cats, setCats] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const countRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const apply = () => { const s = readUrl(chipCats); setWhen(s.when); setCats(s.cats); };
    setToday(denverToday());
    apply();
    setReady(true);
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []);
  // The head script marks a filtered load noindex (langscript.mjs); leaving the page takes that tag away again.
  useEffect(() => () => { document.querySelector('meta[name="robots"][data-filtered]')?.remove(); }, []);

  const go = useCallback((nw: When, nc: string[], focusCount = false) => {
    setWhen(nw);
    setCats(nc);
    const q = new URLSearchParams();
    if (nw !== "month") q.set("when", nw);
    if (nc.length) q.set("cat", nc.join(","));
    const s = q.toString().replace(/%2C/g, ",");
    history.pushState(null, "", `${location.pathname}${s ? `?${s}` : ""}${location.hash}`);
    if (focusCount) countRef.current?.focus();
  }, []);
  const toggleCat = (c: string) => go(when, cats.includes(c) ? cats.filter((x) => x !== c) : chipCats.filter((x) => x === c || cats.includes(x)));

  const { days, weekly } = view(events, when, cats, today);
  const n = days.reduce((s, d) => s + d.events.length, 0);
  const evText = n === 1 ? w.countOne : fmt(w.count, { n });
  const count = weekly.length ? fmt(w.countWeekly, { events: evText, w: weekly.length }) : evText;
  const filtering = when !== "month" || cats.length > 0;

  return (
    <>
      <section className="ds-card outlined ev-filters ev-js" aria-labelledby="ev-filters-h">
        <h3 className="ds-sr" id="ev-filters-h">{w.filterHeading}</h3>
        <div role="group" aria-label={w.when} className="ev-chips">
          {WHENS.map((x) => (
            <button key={x} type="button" className="ds-chip" aria-pressed={when === x} onClick={() => go(x, cats)}>
              {w[x]}
            </button>
          ))}
        </div>
        {chipCats.length > 1 && (
          <div role="group" aria-label={w.category} className="ev-chips">
            {chipCats.map((c) => (
              <button key={c} type="button" className="ds-chip" aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>
                {w.cats[c]}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="ev-summary" data-ready={ready ? "" : undefined}>
        <p className="ds-label-large ev-count" role="status" aria-live="polite" tabIndex={-1} ref={countRef}>{count}</p>
        <button type="button" className={`ds-btn text ev-clear ev-js${filtering ? "" : " is-idle"}`} onClick={() => go("month", [], true)}
          tabIndex={filtering ? undefined : -1} aria-hidden={filtering ? undefined : true}>{w.clear}</button>
      </div>

      {n + weekly.length === 0 ? (
        <div className="ds-card outlined ev-empty">
          {when === "week" && !cats.length ? (
            <>
              <p className="ds-body-large">{w.nothingWeek}</p>
              <button type="button" className="ds-btn text" onClick={() => go("month", cats, true)}>{w.seeMonth}</button>
            </>
          ) : (
            <>
              <p className="ds-body-large">{w.noMatch}</p>
              <button type="button" className="ds-btn" onClick={() => go("month", [], true)}>{w.clear}</button>
            </>
          )}
        </div>
      ) : (
        <>
          {days.map((g) => (
            <section key={g.day} className="ev-day" aria-labelledby={`ev-d-${g.day}`}>
              <h2 id={`ev-d-${g.day}`} className="ds-title-large ev-day-h">{dayHeading(g.day, w)}</h2>
              <ul role="list" className="ev-grid">
                {g.events.map((e) => <li key={e.id}><Card e={e} day={g.day} lang={lang} w={w} /></li>)}
              </ul>
            </section>
          ))}
          {weekly.length > 0 && (
            <section className="ev-day ev-weekly" aria-labelledby="ev-weekly-h">
              <h2 id="ev-weekly-h" className="ds-title-large ev-day-h">{w.everyWeek}</h2>
              <ul role="list" className="ev-grid">
                {weekly.map((e) => <li key={e.id}><Card e={e} day={null} lang={lang} w={w} /></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
