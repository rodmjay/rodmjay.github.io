// Discover SLC, /slc/ and /es/slc/ (Designer's spec, design/specs/rodmjay-events.md): h1 the section name,
// block 1 "Upcoming events" (filters, count, day groups, "Every week"), block 2 "Playing SLC Soon" (one outlined
// button to the public playlist, no embed). A block with no data is left out; the events come from src/lib/events.mjs.
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { BASE, PLAYLIST_URL, loadEvents } from "@/lib/events.mjs";
import { EventBrowser, type BrowserWords } from "./EventBrowser";
import { shortDate, type Words } from "./logic";

type Lang = "en" | "es";

export async function discoverMeta(lang: Lang) {
  const d = dict(lang).discover;
  return meta({ lang, title: d.metaTitle, description: d.metaDescription, path: BASE[lang], alt: BASE[lang === "en" ? "es" : "en"] });
}

export async function Discover({ lang }: { lang: Lang }) {
  const d = dict(lang).discover as BrowserWords & Record<string, string>;
  const { events, updated, stale, today } = await loadEvents();
  const updatedKey = updated ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(updated)) : "";
  return (
    <main id="main" className="wide-col discover-page">
      <h1 className="ds-headline-medium project-title">{d.title}</h1>
      {events.length > 0 && (
        <section className="discover-block" aria-labelledby="ev-h">
          <h2 id="ev-h" className="ds-headline-small">{d.eventsTitle}</h2>
          <p className="ds-body-large discover-lede">{d.lede}</p>
          {updatedKey && <p className="ds-label-large ds-variant">{d.updated.replace("{date}", shortDate(updatedKey, d as Words))}</p>}
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
