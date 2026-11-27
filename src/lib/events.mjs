// Discover SLC: upcoming events in the Salt Lake valley, read once at build time from the public-life feed "events"
// (getFeed, src/lib/feeds.mjs; Database Administrator 0263, Security passed 11/27). Local Guide curates the rows;
// Designer's spec is design/specs/rodmjay-events.md (personal repo). The page is /discover/ and /es/descubra/.
// Row: {id, title, category, venue_name, city, starts_at, ends_at, age_limit, recurring, recurrence_text,
// recurrence_text_es?, price_text, ticket_url, sold_out, feed_updated_at}. Free text (title, venue, city, the schedule
// line) is only ever rendered as text (Security 11/27). Built only where DISCOVER_ON=1 (staging and checks; production
// once the reviews pass and DISCOVER_LIVE=1 is set).
//
// What the build drops (both pages always list the same events):
// - a category outside the eight below (Local Guide 11/27: it simply doesn't show);
// - a dated event that has ended (ends_at, or starts_at when it has none, before the build);
// - a weekly entry whose season ended (ends_at before the build), or that has no es-419 schedule line
//   (recurrence_text_es): the site never machine-translates and an English line can't go on the Spanish page.
// Dates and times are computed here in America/Denver as plain numbers, and named from the dictionaries, so the server
// and every browser print the same words ("8:00 PM", "8:00 p. m.").
import { getFeed } from "./feeds.mjs";

export const DISCOVER_ON = process.env.DISCOVER_ON === "1";
export const BASE = { en: "/discover/", es: "/es/descubra/" };
// Block 2, "Playing SLC Soon": Local Guide's public Spotify playlist (Rod's yes 11/27, DECISIONS). One fixed link, no
// embed (Designer), so the page loads nothing from Spotify.
export const PLAYLIST_URL = "https://open.spotify.com/playlist/3N39Ob2httZezAYqRk1WW1";
// Chip order (Designer 11/27): only categories with at least one event become chips.
export const CATEGORIES = ["concert", "festival", "art", "market", "convention", "comedy", "family", "networking"];
const AGES = { all_ages: "allAges", "21_plus": "over21" };
const TZ = "America/Denver";
const STALE_MS = 48 * 3600_000;

const str = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());
// Only plain https links leave the page; anything else leaves the title as plain text.
const safeLink = (v) => { const s = str(v); return /^https:\/\/[^\s"'<>\\]+$/.test(s) ? s : ""; };
const ms = (v) => { const t = Date.parse(str(v)); return Number.isFinite(t) ? t : NaN; };

const PARTS = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" });
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
// A moment as Denver wall-clock numbers: {key: "2026-12-04", y, m, d, wd (0 = Sunday), h, min}.
export function denver(t) {
  const p = Object.fromEntries(PARTS.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  const y = +p.year, m = +p.month, d = +p.day;
  return { key: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, y, m, d, wd: WD[p.weekday], h: +p.hour % 24, min: +p.minute };
}

// A price as given, in the page's words: "Free"/"Gratis", "From $25"/"Desde $25", or digits and currency only (a
// range's hyphen becomes an en dash). Anything with other words is left out, so no English lands on the Spanish page.
function price(v) {
  const s = str(v);
  if (!s) return null;
  if (/^free$/i.test(s)) return { kind: "free" };
  const from = /^from\s+(.+)$/i.exec(s);
  const amount = (from ? from[1] : s).replace(/\s*-\s*/g, "–");
  if (!/^\$?\d[\d.,]*(–\$?\d[\d.,]*)?$/.test(amount)) return null;
  return { kind: from ? "from" : "amount", amount };
}

let memo;
export function loadEvents(now = Date.now()) {
  return (memo ||= (async () => {
    const items = await getFeed("events");
    const events = [];
    const dropped = [];
    let updated = 0;
    for (const r of items) {
      const title = str(r?.title), category = str(r?.category), start = ms(r?.starts_at), end = ms(r?.ends_at);
      const u = ms(r?.feed_updated_at);
      if (u > updated) updated = u;
      if (!title || !Number.isFinite(start)) throw new Error(`events: ${str(r?.id) || "a row"} has no title or start`);
      if (!CATEGORIES.includes(category)) { dropped.push(`${title}: category ${JSON.stringify(category)}`); continue; }
      const recurring = r.recurring === true;
      const sched = recurring ? { en: str(r.recurrence_text), es: str(r.recurrence_text_es) } : null;
      if (recurring && (!sched.en || !sched.es)) { dropped.push(`${title}: weekly entry with no ${sched.en ? "es-419" : "English"} schedule line`); continue; }
      if (recurring ? end < now : (Number.isFinite(end) ? end : start) < now) continue; // over
      const s = denver(start);
      events.push({
        id: str(r.id) || `${s.key}-${title}`, title, category, venue: str(r.venue_name), city: str(r.city),
        start, startKey: s.key, wd: s.wd, h: s.h, min: s.min,
        endKey: Number.isFinite(end) ? denver(end).key : null,
        age: AGES[str(r.age_limit)] || null, price: price(r.price_text), url: safeLink(r.ticket_url), soldOut: r.sold_out === true,
        recurring, sched,
      });
    }
    if (dropped.length) console.warn(`events: left out ${dropped.length}:\n  ${dropped.join("\n  ")}`);
    events.sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));
    return { events, updated, stale: updated > 0 && now - updated > STALE_MS, today: denver(now).key, from: "public-life events" };
  })());
}

// The page's routes only exist where DISCOVER_ON=1. The playlist block always has its link, so the page and its nav
// link show whenever it's on; the events block is left out while there are no events.
