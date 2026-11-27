"use client";
// The Family Recipe Book's header (Designer's homey spec): the mark and name (home), a short nav (All recipes, Main dishes,
// Breakfast, Desserts, About) from 860px, a visible search box (a plain GET form to All recipes, so it works without
// script), and EN/ES. Below 1140px a Menu button opens a sheet with the same links (and EN/ES, which leaves the bar on
// phones); below 860px the search takes its own full-width row.
// It lives in the book's root layout and never re-mounts; every in-book link is a Next <Link>.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Lang = "en" | "es";
export type NavLink = { href: string; label: string };
export type HeaderWords = Record<"name" | "home" | "menu" | "close" | "language" | "searchLabel" | "searchPlaceholder" | "searchButton", string>;
const NAMES = { en: "English", es: "Español" } as const;
const HTML_LANG = { en: "en", es: "es-419" } as const;
const BASE = { en: "/recipes/", es: "/es/recipes/" } as const;

export function BookHeader({ lang, nav, all, w }: { lang: Lang; nav: NavLink[]; all: string; w: HeaderWords }) {
  const path = usePathname() || BASE[lang];
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  // The box shows the current search on All recipes (?q=), and empties elsewhere.
  useEffect(() => {
    try { setQ(path.startsWith(all) ? new URLSearchParams(location.search).get("q") || "" : ""); } catch { setQ(""); }
    sheet.current?.close();
    setOpen(false);
  }, [path, all]);
  const current = (href: string) => (path === href || (href !== BASE[lang] && path.startsWith(href)) ? "page" : undefined);
  const links = nav.map((s) => <Link key={s.href} href={s.href} aria-current={current(s.href)}>{s.label}</Link>);
  // The same page in the other language: the book's pages share their slugs under /es/recipes/.
  const onLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const to = e.target.value as Lang;
    try { localStorage.setItem("ds-lang", to); } catch {}
    const here = path.endsWith("/") ? path : `${path}/`;
    location.assign((here.startsWith(BASE[lang]) ? BASE[to] + here.slice(BASE[lang].length) : BASE[to]) + location.search);
  };
  const langMenu = (where: "bar" | "sheet") => (
    <label className={`rb-lang rb-lang-${where}`}>
      <span className="rb-sr">{w.language}</span>
      <select aria-label={w.language} value={lang} onChange={onLang}>
        {(["en", "es"] as const).map((l) => <option key={l} value={l} lang={HTML_LANG[l]}>{NAMES[l]}</option>)}
      </select>
    </label>
  );
  return (
    <header className="rb-bar">
      <div className="rb-wrap rb-bar-row">
        <Link className="rb-logo" href={BASE[lang]}>
          <img src="/recipes/icons/icon-light.svg" alt="" width={34} height={34} />
          <span>{w.name}</span>
        </Link>
        <nav aria-label={w.name} className="rb-nav">{links}</nav>
        <form className="rb-search" role="search" action={all} method="get">
          <input type="search" name="q" aria-label={w.searchLabel} placeholder={w.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit">{w.searchButton}</button>
        </form>
        {langMenu("bar")}
        <button ref={button} type="button" className="rb-menu" aria-haspopup="dialog" aria-expanded={open}
          onClick={() => { sheet.current?.showModal(); setOpen(true); closeBtn.current?.focus(); }}>
          <svg viewBox="0 0 24 24" aria-hidden="true" width="22" height="22"><path fill="currentColor" d="M3 18v-2h18v2Zm0-5v-2h18v2Zm0-5V6h18v2Z" /></svg>
          {w.menu}
        </button>
      </div>
      <dialog ref={sheet} className="rb-sheet" aria-label={w.name} onClose={() => { setOpen(false); button.current?.focus(); }}>
        <div className="rb-sheet-head">
          <span className="rb-sheet-title">{w.name}</span>
          <button ref={closeBtn} type="button" className="rb-close" aria-label={w.close} onClick={() => sheet.current?.close()}>
            <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24"><path fill="currentColor" d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z" /></svg>
          </button>
        </div>
        <nav aria-label={w.name} className="rb-sheet-links">
          <Link href={BASE[lang]} aria-current={path === BASE[lang] ? "page" : undefined}>{w.home}</Link>
          {links}
        </nav>
        {langMenu("sheet")}
      </dialog>
    </header>
  );
}
