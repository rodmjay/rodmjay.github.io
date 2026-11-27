// Discover SLC, /slc/ and /es/slc/ (Designer's spec, design/specs/rodmjay-events.md): h1 the section name,
// block 1 "Upcoming events" (filters, count, day groups, "Every week"), block 2 "Playing SLC Soon" (one outlined
// button to the public playlist, no embed). A block with no data is left out; the events come from src/lib/events.mjs.
import { dict } from "@/lib/site.mjs";
import { slcMeta } from "@/zones/slc/SlcLayout";
import { BASE, PLAYLIST_URL, loadEvents } from "@/lib/events.mjs";
import { EventBrowser, type BrowserWords } from "./EventBrowser";

type Lang = "en" | "es";

type View = "all" | "events";
const other = (lang: Lang) => (lang === "en" ? "es" : "en");
const path = (lang: Lang, view: View) => (view === "all" ? BASE[lang] : `${BASE[lang]}events/`);

export async function discoverMeta(lang: Lang, view: View = "all") {
  const d = dict(lang).discover, s = dict(lang).slc;
  return slcMeta({ lang, title: view === "all" ? undefined : s.eventsMetaTitle, description: view === "all" ? d.metaDescription : s.eventsMetaDescription,
    path: path(lang, view), alt: path(other(lang), view) });
}

// The mixed view (/slc/: events, then the playlist) or one section (/slc/events/: its own h1). The "Updated" date lives in
// the product's footer (SlcLayout).
export async function Discover({ lang, view = "all" }: { lang: Lang; view?: View }) {
  const d = dict(lang).discover as BrowserWords & Record<string, string>;
  const s = dict(lang).slc;
  const { events, stale, today } = await loadEvents();
  if (view === "events") return (
    <main id="main" className="slc-col discover-page">
      <h1 className="ds-headline-medium project-title">{s.events}</h1>
      <p className="ds-body-large discover-lede">{d.lede}</p>
      {stale && <div className="ds-banner" role="status"><strong>{d.stale}</strong></div>}
      {events.length ? <EventBrowser events={events} today0={today} lang={lang} w={d} /> : <div className="ds-card outlined"><p className="ds-body-large">{d.none}</p></div>}
    </main>
  );
  return (
    <main id="main" className="slc-col discover-page">
      <h1 className="ds-headline-medium project-title">{d.title}</h1>
      {events.length > 0 && (
        <section className="discover-block" aria-labelledby="ev-h">
          <h2 id="ev-h" className="ds-headline-small">{d.eventsTitle}</h2>
          <p className="ds-body-large discover-lede">{d.lede}</p>
          {stale && <div className="ds-banner" role="status"><strong>{d.stale}</strong></div>}
          <EventBrowser events={events} today0={today} lang={lang} w={d} />
        </section>
      )}
      <section className="discover-block discover-playlist" aria-labelledby="pl-h">
        <h2 id="pl-h" className="ds-headline-small">{d.playlistTitle}</h2>
        <p className="ds-body-large discover-lede">{d.playlistLede}</p>
        <p>
          <a className="ds-btn outlined" href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer">
            {d.openSpotify}<span className="ds-sr"> ({d.newTab})</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M5 21q-.82 0-1.41-.59T3 19V5q0-.82.59-1.41T5 3h7v2H5v14h14v-7h2v7q0 .82-.59 1.41T19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z" /></svg>
          </a>
        </p>
      </section>
    </main>
  );
}
