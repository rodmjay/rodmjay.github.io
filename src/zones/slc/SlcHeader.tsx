"use client";
// Discover SLC's own header (design/specs/discover-slc.md, "its own chrome", Rod 11/27): the Utah-star mark and the
// wordmark (a link to the mixed view), the section links from 840px, a Menu button below it that opens a full-height
// sheet of the same links, and the EN/ES menu. It lives in the product's root layout and never re-mounts; every link is a
// Next <Link>. Nothing from the personal site appears here. Sections without content aren't listed (Designer: a type with
// no items is hidden). The Menu sheet is a modal <dialog>: the page behind it is inert, so focus stays inside; Esc and
// Close close it; focus goes to Close on open and back to Menu on close (Designer 11/27).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Lang = "en" | "es";
export type SlcWords = Record<"name" | "home" | "label" | "menu" | "close" | "language", string>;
export type Section = { href: string; label: string };
const NAMES = { en: "English", es: "Español" } as const;
const HTML_LANG = { en: "en", es: "es-419" } as const;
const BASE = { en: "/slc/", es: "/es/slc/" } as const;

export function SlcHeader({ lang, w, sections }: { lang: Lang; w: SlcWords; sections: Section[] }) {
  const path = usePathname() || BASE[lang];
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => { sheet.current?.close(); setOpen(false); }, [path]);
  const current = (href: string) => (path === href || path.startsWith(href) ? "page" : undefined);
  const links = sections.map((s) => <Link key={s.href} href={s.href} aria-current={current(s.href)}>{s.label}</Link>);
  // The same page in the other language: the product's pages share their English slugs under /es/slc/.
  const onLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const to = e.target.value as Lang;
    try { localStorage.setItem("ds-lang", to); } catch {}
    const here = path.endsWith("/") ? path : `${path}/`;
    location.assign((here.startsWith(BASE[lang]) ? BASE[to] + here.slice(BASE[lang].length) : BASE[to]) + location.search);
  };
  const langMenu = (
    <span className="ds-lang slc-lang">
      <label>
        <span className="ds-lang-label">{w.language}</span>
        <select aria-label={w.language} value={lang} onChange={onLang}>
          {(["en", "es"] as const).map((l) => <option key={l} value={l} lang={HTML_LANG[l]}>{NAMES[l]}</option>)}
        </select>
      </label>
    </span>
  );
  return (
    <header className="slc-bar">
      <Link className="slc-brand" href={BASE[lang]} aria-label={w.home}>
        <img src="/slc/icons/icon-dark.svg" alt="" width={32} height={32} />
        <span>{w.name}</span>
      </Link>
      {links.length > 0 && <nav aria-label={w.label} className="slc-links">{links}</nav>}
      {langMenu}
      {links.length > 0 && (
        <>
          <button ref={button} type="button" className="ds-btn text slc-menu" aria-haspopup="dialog" aria-expanded={open}
            onClick={() => { sheet.current?.showModal(); setOpen(true); closeBtn.current?.focus(); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon"><path d="M3 18v-2h18v2Zm0-5v-2h18v2Zm0-5V6h18v2Z" /></svg>
            {w.menu}
          </button>
          <dialog ref={sheet} className="ds-dialog sheet slc-sheet" aria-label={w.label} onClose={() => { setOpen(false); button.current?.focus(); }}>
            <div className="slc-sheet-head">
              <span className="ds-title-large">{w.name}</span>
              <button ref={closeBtn} type="button" className="ds-btn text icon slc-close" aria-label={w.close} onClick={() => sheet.current?.close()}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="ds-icon"><path d="M6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5l5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6Z" /></svg>
              </button>
            </div>
            <nav aria-label={w.label} className="slc-sheet-links">
              <Link href={BASE[lang]} aria-current={path === BASE[lang] ? "page" : undefined}>{w.name}</Link>
              {links}
            </nav>
            {langMenu}
          </dialog>
        </>
      )}
    </header>
  );
}
