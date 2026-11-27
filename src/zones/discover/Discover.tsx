// Discover SLC, /slc/ and /es/slc/ (design/specs/discover-slc.md; prototype design/specs/slc-prototype/). The events come
// from src/lib/events.mjs, the pictures from src/lib/slc-art.mjs. A block with no data is left out.
import { dict } from "@/lib/site.mjs";
import { slcMeta } from "@/zones/slc/SlcLayout";
import { BASE, PLAYLIST_URL, loadEvents } from "@/lib/events.mjs";
import { EventBrowser, type BrowserWords, type SlcWords } from "./EventBrowser";
import { heroSrc, season } from "@/lib/slc-art.mjs";

type Lang = "en" | "es";

type View = "all" | "events";
const other = (lang: Lang) => (lang === "en" ? "es" : "en");
const path = (lang: Lang, view: View) => (view === "all" ? BASE[lang] : `${BASE[lang]}events/`);

export async function discoverMeta(lang: Lang, view: View = "all") {
  const d = dict(lang).discover, s = dict(lang).slc;
  return slcMeta({ lang, title: view === "all" ? undefined : s.eventsMetaTitle, description: view === "all" ? d.metaDescription : s.eventsMetaDescription,
    path: path(lang, view), alt: path(other(lang), view) });
}

// The page (design/specs/discover-slc.md, the design-elevation prototype): the season's plate full-bleed (chosen at build
// time, alt="", never a share image), then the one AI label, the title and the lede on the page surface; the events; then
// "Playing SLC Soon". /slc/events/ is the events alone with its own h1. The "Updated" date lives in the footer.
function Hero({ season }: { season: string }) {
  const set = (ext: string) => [1280, 1920, 2560].map((w) => `${heroSrc(season, w, ext)} ${w}w`).join(", ");
  return (
    <div className="slc-hero">
      <picture>
        <source type="image/avif" srcSet={set("avif")} sizes="100vw" />
        <img src={heroSrc(season, 1920, "webp")} srcSet={set("webp")} sizes="100vw" width={1920} height={815} alt="" fetchPriority="high" decoding="async" />
      </picture>
    </div>
  );
}

export async function Discover({ lang, view = "all" }: { lang: Lang; view?: View }) {
  const d = dict(lang).discover as BrowserWords & Record<string, string>;
  const s = dict(lang).slc as SlcWords & Record<string, string>;
  const { events, stale, today } = await loadEvents();
  const browser = events.length ? <EventBrowser events={events} today0={today} lang={lang} w={d} s={s} /> : <div className="slc-empty"><p className="ds-body-large">{d.none}</p></div>;
  if (view === "events") return (
    <main id="main" className="slc-wrap discover-page">
      <div className="slc-top">
        <h1 className="slc-h1">{s.events}</h1>
        <p className="slc-lede">{d.lede}</p>
      </div>
      {stale && <div className="ds-banner" role="status"><strong>{d.stale}</strong></div>}
      {browser}
    </main>
  );
  return (
    <main id="main" className="discover-page">
      <Hero season={season(today)} />
      <div className="slc-wrap">
        <div className="slc-top">
          <p className="slc-ai">{s.aiLabel}</p>
          <h1 className="slc-h1">{d.title}</h1>
          <p className="slc-lede">{s.heroLede}</p>
        </div>
        {stale && <div className="ds-banner" role="status"><strong>{d.stale}</strong></div>}
        {browser}
        <section className="slc-group" aria-labelledby="pl-h">
          <h2 id="pl-h" className="slc-h2">{d.playlistTitle}</h2>
          <div className="slc-play">
            <p>{d.playlistLede}</p>
            <a className="ds-btn outlined slc-play-btn" href={PLAYLIST_URL} target="_blank" rel="noopener noreferrer">
              {d.openSpotify}<span className="ds-sr"> ({d.newTab})</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon sm"><path d="M5 21q-.82 0-1.41-.59T3 19V5q0-.82.59-1.41T5 3h7v2H5v14h14v-7h2v7q0 .82-.59 1.41T19 21Zm4.7-5.3-1.4-1.4L17.6 5H14V3h7v7h-2V6.4Z" /></svg>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
