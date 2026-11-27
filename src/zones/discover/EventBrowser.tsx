"use client";
// Discover SLC's events (design/specs/discover-slc.md, "image-forward and fun" and the design-elevation prototype,
// design/specs/slc-prototype/): a quiet filter bar (on phones one "Filters" button opening a sheet with the same chips),
// then "Tonight and this weekend" led by one featured wide card, then "Coming up", then "Every week". Every card has its
// picture (our own illustration, or the flat category tile when there is none) with the date tile over its lower-left
// corner; the title is the only link. The build renders the default view; in the browser this takes today's date and the
// URL's filters (?when=week|weekend&cat=…), each change one history.pushState. Feed text only ever goes in as React text.
import { useCallback, useEffect, useRef, useState } from "react";
import { type Ev, type When, type Words, cols, denverToday, fmt, shortDate, time, view, weekendEnd } from "./logic";

type Lang = "en" | "es";
export type BrowserWords = Words & Record<
  "filterHeading" | "when" | "category" | "week" | "weekend" | "month" | "clear" | "count" | "countOne" | "countWeekly" |
  "everyWeek" | "noMatch" | "nothingWeek" | "seeMonth" | "newTab" | "soldOutNote" | "allAges" | "over21" | "soldOut" |
  "free" | "fromPrice" | "through" | "throughCap", string> & { cat: Record<string, string>; cats: Record<string, string> };
export type SlcWords = Record<"groupSoon" | "groupLater" | "seeDetails" | "filters" | "filtersTitle" | "done" | "tonight", string> & { art: Record<string, string> };

const WHENS: When[] = ["month", "weekend", "week"];
const SIZES = "(min-width: 1024px) 360px, (min-width: 600px) 50vw, 100vw";

function readUrl(known: string[]): { when: When; cats: string[] } {
  try {
    const q = new URLSearchParams(window.location.search);
    const w = q.get("when");
    const cats = (q.get("cat") || "").split(",").map((s) => s.trim()).filter((c) => known.includes(c));
    return { when: w === "week" || w === "weekend" ? w : "month", cats: known.filter((c) => cats.includes(c)) };
  } catch { return { when: "month", cats: [] }; }
}
function priceText(e: Ev, w: BrowserWords) {
  if (!e.price) return "";
  if (e.price.kind === "free") return w.free;
  if (e.price.kind === "from") return fmt(w.fromPrice, { amount: e.price.amount! });
  return e.price.amount!;
}

const External = () => <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M5 21q-.82 0-1.41-.59T3 19V5q0-.82.59-1.41T5 3h7v2H5v14h14v-7h2v7q0 .82-.59 1.41T19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z" /></svg>;
const ICONS = {
  soon: <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-5.4-5.4c0-1.81.89-3.42 2.26-4.4A9.1 9.1 0 0 0 12 3z" />,
  later: <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" />,
  weekly: <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2v6l4 2-1 1.7-5-2.7V6h2z" />,
};
function Heading({ id, icon, children }: { id: string; icon: keyof typeof ICONS; children: string }) {
  return <h2 id={id} className="slc-h2"><svg viewBox="0 0 24 24" aria-hidden="true" className="slc-h2-icon">{ICONS[icon]}</svg>{children}</h2>;
}

// The picture: our own illustration at 480/800/1200, or the flat category tile (never a broken image).
function Picture({ e, lang, s, eager }: { e: Ev; lang: Lang; s: SlcWords; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!e.pic || failed) return <div className="slc-art slc-art-tile" aria-hidden="true"><span>{e.category.slice(0, 1).toUpperCase()}</span></div>;
  const base = `/slc/art/cards/${e.pic.subject}-${e.pic.n}`;
  return (
    <div className="slc-art">
      <picture>
        <source type="image/avif" srcSet={`${base}-480.avif 480w, ${base}-800.avif 800w, ${base}-1200.avif 1200w`} sizes={SIZES} />
        <img src={`${base}-800.webp`} srcSet={`${base}-480.webp 480w, ${base}-800.webp 800w, ${base}-1200.webp 1200w`} sizes={SIZES}
          width={800} height={600} alt={s.art[e.pic.key] ?? ""} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} />
      </picture>
    </div>
  );
}

function DateTile({ day, today, w }: { day: string; today: string; w: BrowserWords }) {
  const [, m, d] = day.split("-").map(Number);
  return <div className={`slc-date${day === today ? " today" : ""}`} aria-hidden="true"><b>{d}</b><span>{w.months[m - 1]}</span></div>;
}

function Card({ e, day, today, lang, w, s, featured, eager }: { e: Ev; day: string | null; today: string; lang: Lang; w: BrowserWords; s: SlcWords; featured?: boolean; eager?: boolean }) {
  let when: string;
  if (e.recurring) when = e.sched![lang];
  else if (day && e.startKey < day) when = fmt(w.throughCap, { date: shortDate(e.endKey!, w) });
  else when = time(e.h, e.min, w) + (e.endKey && e.endKey > e.startKey ? `, ${fmt(w.through, { date: shortDate(e.endKey, w) })}` : "");
  const label = featured && day === today ? `${s.tonight} · ${w.cat[e.category]}` : `${when} · ${w.cat[e.category]}`;
  const place = [e.venue, e.city].filter(Boolean).join(", ");
  const price = priceText(e, w);
  return (
    <article className={`slc-card${featured ? " slc-feature" : ""}${e.recurring ? " slc-weekly" : ""}`}>
      <Picture e={e} lang={lang} s={s} eager={eager} />
      {day && !featured && <DateTile day={day} today={today} w={w} />}
      <div className="slc-body">
        {featured && day && <DateTile day={day} today={today} w={w} />}
        <p className={`slc-label${featured && day === today ? " now" : ""}`}>{label}</p>
        <h3 className="slc-title">
          {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.title}<span className="ds-sr"> ({w.newTab})</span><External /></a> : e.title}
        </h3>
        {place && <p className="slc-place">{place}</p>}
        {(e.age || price || e.soldOut || (e.recurring && e.sched)) && (
          <div className="slc-tags">
            {e.age && <span className="slc-pill">{w[e.age]}</span>}
            {price && <span>{price}{e.soldOut && <span className="ds-sr"> ({w.soldOutNote})</span>}</span>}
            {e.soldOut && <span className="slc-pill sold">{w.soldOut}</span>}
          </div>
        )}
        {featured && e.url && <span className="ds-btn slc-btn" aria-hidden="true">{s.seeDetails}</span>}
      </div>
    </article>
  );
}

export function EventBrowser({ events, today0, lang, w, s }: { events: Ev[]; today0: string; lang: Lang; w: BrowserWords; s: SlcWords }) {
  const known = [...new Set(events.map((e) => e.category))];
  const chipCats = Object.keys(w.cats).filter((c) => known.includes(c));
  const [today, setToday] = useState(today0);
  const [when, setWhen] = useState<When>("month");
  const [cats, setCats] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const countRef = useRef<HTMLParagraphElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const sheetBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const apply = () => { const r = readUrl(chipCats); setWhen(r.when); setCats(r.cats); };
    setToday(denverToday()); apply(); setReady(true);
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, []); // eslint-disable-line
  useEffect(() => () => { document.querySelector('meta[name="robots"][data-filtered]')?.remove(); }, []);

  const go = useCallback((nw: When, nc: string[], focusCount = false) => {
    setWhen(nw); setCats(nc);
    const q = new URLSearchParams();
    if (nw !== "month") q.set("when", nw);
    if (nc.length) q.set("cat", nc.join(","));
    const qs = q.toString().replace(/%2C/g, ",");
    history.pushState(null, "", `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`);
    if (focusCount) countRef.current?.focus();
  }, []);
  const toggleCat = (c: string) => go(when, cats.includes(c) ? cats.filter((x) => x !== c) : chipCats.filter((x) => x === c || cats.includes(x)));

  const { days, weekly } = view(events, when, cats, today);
  const dated = days.flatMap((g) => g.events.map((e) => ({ e, day: g.day })));
  const wkEnd = weekendEnd(today);
  const soon = dated.filter((x) => x.day <= wkEnd), later = dated.filter((x) => x.day > wkEnd);
  const featIdx = soon.findIndex((x) => !x.e.soldOut);
  const featured = featIdx >= 0 ? soon[featIdx] : null;
  const soonRest = soon.filter((_, i) => i !== featIdx);
  const n = dated.length;
  const evText = n === 1 ? w.countOne : fmt(w.count, { n });
  const count = weekly.length ? fmt(w.countWeekly, { events: evText, w: weekly.length }) : evText;
  const filtering = when !== "month" || cats.length > 0;

  const chips = (where: string) => (
    <>
      <div role="group" aria-label={w.when} className="slc-chips">
        {WHENS.map((x) => <button key={x} type="button" className="ds-chip slc-chip" aria-pressed={when === x} onClick={() => go(x, cats)}>{w[x]}</button>)}
      </div>
      {chipCats.length > 1 && <span className="slc-sep" aria-hidden="true" />}
      {chipCats.length > 1 && (
        <div role="group" aria-label={w.category} className="slc-chips">
          {chipCats.map((c) => <button key={`${where}-${c}`} type="button" className="ds-chip slc-chip" aria-pressed={cats.includes(c)} onClick={() => toggleCat(c)}>{w.cats[c]}</button>)}
        </div>
      )}
    </>
  );
  const grid = (items: { e: Ev; day: string }[], key: string) => (
    <ul role="list" className={`slc-grid c${cols(items.length)}${items.length === 5 ? " center-last" : ""}`}>
      {items.map((x, i) => <li key={`${key}-${x.e.id}`}><Card e={x.e} day={x.day} today={today} lang={lang} w={w} s={s} eager={key === "soon" && i < 2} /></li>)}
    </ul>
  );

  return (
    <>
      <div className="slc-filterbar ev-js" role="group" aria-label={w.filterHeading}>
        <div className="slc-bar-chips">{chips("bar")}</div>
        <button ref={sheetBtn} type="button" className="ds-chip slc-chip slc-filters-btn" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
          {s.filters} · {w[when]}{cats.length ? ` +${cats.length}` : ""}
        </button>
        <button type="button" className={`ds-btn text slc-clear${filtering ? "" : " is-idle"}`} onClick={() => go("month", [], true)} tabIndex={filtering ? undefined : -1} aria-hidden={filtering ? undefined : true}>{w.clear}</button>
        <p className="slc-count" role="status" aria-live="polite" tabIndex={-1} ref={countRef} data-ready={ready ? "" : undefined}>{count}</p>
      </div>
      <dialog ref={sheet} className="ds-dialog sheet slc-filter-sheet" aria-labelledby="slc-fs-h" onClose={() => sheetBtn.current?.focus()}>
        <h2 id="slc-fs-h" className="ds-title-large">{s.filtersTitle}</h2>
        <div className="slc-sheet-chips">{chips("sheet")}</div>
        <div className="slc-sheet-actions">
          <button type="button" className="ds-btn text" onClick={() => go("month", [])}>{w.clear}</button>
          <button type="button" className="ds-btn" onClick={() => sheet.current?.close()}>{s.done} ({count})</button>
        </div>
      </dialog>

      {n + weekly.length === 0 ? (
        <div className="slc-empty">
          {when === "week" && !cats.length ? (
            <><p className="ds-body-large">{w.nothingWeek}</p><button type="button" className="ds-btn text" onClick={() => go("month", cats, true)}>{w.seeMonth}</button></>
          ) : (
            <><p className="ds-body-large">{w.noMatch}</p><button type="button" className="ds-btn" onClick={() => go("month", [], true)}>{w.clear}</button></>
          )}
        </div>
      ) : (
        <>
          {soon.length > 0 && (
            <section className="slc-group" aria-labelledby="slc-g-soon">
              <Heading id="slc-g-soon" icon="soon">{s.groupSoon}</Heading>
              {featured && <Card e={featured.e} day={featured.day} today={today} lang={lang} w={w} s={s} featured eager />}
              {soonRest.length > 0 && grid(soonRest, "soon")}
            </section>
          )}
          {later.length > 0 && (
            <section className="slc-group" aria-labelledby="slc-g-later">
              <Heading id="slc-g-later" icon="later">{s.groupLater}</Heading>
              {grid(later, "later")}
            </section>
          )}
          {weekly.length > 0 && (
            <section className="slc-group" aria-labelledby="slc-g-weekly">
              <Heading id="slc-g-weekly" icon="weekly">{w.everyWeek}</Heading>
              <ul role="list" className="slc-weekly-list">
                {weekly.map((e) => <li key={e.id}><Card e={e} day={null} today={today} lang={lang} w={w} s={s} /></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}
