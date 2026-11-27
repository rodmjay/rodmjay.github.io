// Discover SLC's filtering and grouping (design/specs/rodmjay-events.md), shared by the build and the browser so both
// print the same list. Days are Denver calendar days as "YYYY-MM-DD" keys; the browser recomputes "today" on load.
export type Ev = {
  id: string; title: string; category: string; venue: string; city: string;
  start: number; startKey: string; wd: number; h: number; min: number; endKey: string | null;
  age: "allAges" | "over21" | null; price: { kind: "free" | "from" | "amount"; amount?: string } | null;
  url: string; soldOut: boolean; recurring: boolean; sched: { en: string; es: string } | null;
  pic: { subject: string; n: number; count: number; key: string } | null;
};
export type When = "week" | "weekend" | "month";
export type Words = {
  weekdays: string[]; months: string[]; dayMonths: string[]; dayFormat: string; shortDate: string; am: string; pm: string;
  [k: string]: unknown;
};

export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

const toUtc = (key: string) => { const [y, m, d] = key.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (key: string, n: number) => fromUtc(toUtc(key) + n * 86_400_000);
const weekday = (key: string) => new Date(toUtc(key)).getUTCDay();

// Today in Denver, in the browser.
export function denverToday(now = Date.now()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// The days a date chip covers, inclusive. "This weekend" is Saturday and Sunday: the coming ones, or what's left of
// this one on a weekend day.
export function range(when: When, today: string): [string, string] {
  if (when === "week") return [today, addDays(today, 6)];
  if (when === "month") return [today, addDays(today, 29)];
  const wd = weekday(today);
  if (wd === 0) return [today, today];
  const sat = wd === 6 ? today : addDays(today, 6 - wd);
  return [sat, addDays(sat, 1)];
}

export type Group = { day: string; events: Ev[] };
// Dated events grouped by day (an event that's already running sits on the first day of the range), sold-out ones
// last in their day; then the weekly entries, ordered by their next occurrence.
export function view(events: Ev[], when: When, cats: string[], today: string): { days: Group[]; weekly: Ev[] } {
  const [a, b] = range(when, today);
  const inCat = (e: Ev) => !cats.length || cats.includes(e.category);
  const byDay = new Map<string, Ev[]>();
  const weekly: Ev[] = [];
  for (const e of events) {
    if (!inCat(e)) continue;
    if (e.recurring) {
      if (when !== "weekend" || e.wd === 0 || e.wd === 6) weekly.push(e);
      continue;
    }
    const end = e.endKey && e.endKey > e.startKey ? e.endKey : e.startKey;
    if (end < a || e.startKey > b) continue;
    const day = e.startKey < a ? a : e.startKey;
    (byDay.get(day) || byDay.set(day, []).get(day)!).push(e);
  }
  const days = [...byDay.entries()].sort(([x], [y]) => (x < y ? -1 : 1)).map(([day, list]) => ({
    day,
    events: list.sort((x, y) => Number(x.soldOut) - Number(y.soldOut) || Number(x.startKey >= day) - Number(y.startKey >= day) || x.start - y.start),
  }));
  weekly.sort((x, y) => x.start - y.start);
  return { days, weekly };
}

const parts = (key: string) => { const [y, m, d] = key.split("-").map(Number); return { y, m, d }; };
export function dayHeading(key: string, w: Words) {
  const { m, d } = parts(key);
  return fmt(w.dayFormat, { weekday: w.weekdays[weekday(key)], day: d, month: w.dayMonths[m - 1] });
}
export function shortDate(key: string, w: Words) {
  const { m, d } = parts(key);
  return fmt(w.shortDate, { day: d, month: w.months[m - 1] });
}
export function time(h: number, min: number, w: Words) {
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? w.am : w.pm}`;
}

// The end of "this weekend" (the coming Sunday, or today on a Sunday): dated items up to it lead the page.
export function weekendEnd(today: string) { const wd = weekday(today); return addDays(today, wd === 0 ? 0 : 7 - wd); }
// Grid columns that leave no orphan on the last row (Designer): 4 → 2, 3 or 6 → 3, 5 → 3 (last row centred), else 3.
export function cols(n: number) { return n === 1 ? 1 : n === 2 || n === 4 ? 2 : 3; }
