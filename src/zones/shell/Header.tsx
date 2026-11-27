"use client";
// The header: the name, the section links and the EN/ES menu. It lives in the root layout and never re-mounts; every
// link is a Next <Link>, so moving between pages swaps only the content. The current section gets aria-current.
// Phones (≤600px) get a "Menu" button instead of the row of links (Designer 11/24): it opens a panel of the same links
// right under the header, over the content (the header never changes height). Esc, a second tap or following a link
// closes it; Esc returns focus to the button. Without script the same list is in a <noscript>, so it stays reachable.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Nav = Record<"label" | "menu" | "home" | "about" | "resume" | "building" | "contact" | "blog" | "recipes" | "discover" | "quotes" | "language", string>;
const NAMES = { en: "English", es: "Español" } as const;
const HTML_LANG = { en: "en", es: "es-419" } as const;

// The other language's page: its twin when it has one, otherwise that language's section index.
function otherPath(path: string, lang: "en" | "es", alt: Record<string, string>) {
  if (alt[path]) return alt[path];
  const to = lang === "en" ? "es" : "en";
  for (const section of ["blog", "recipes", "quotes"]) {
    if (path.startsWith(lang === "en" ? `/${section}/` : `/es/${section}/`)) return to === "es" ? `/es/${section}/` : `/${section}/`;
  }
  return to === "es" ? "/es/" : "/";
}

// `account` is the "Sign in" / "Dashboard" slot at the right end, next to the language menu (only where accounts are on).
export function Header({ lang, nav, showRecipes, showDiscover, showQuotes, alt, account }: { lang: "en" | "es"; nav: Nav; showRecipes: boolean; showDiscover: boolean; showQuotes: boolean; alt: Record<string, string>; account?: ReactNode }) {
  const path = usePathname() || "/";
  const home = lang === "en" ? "/" : "/es/";
  const blog = `${home}blog/`, recipes = `${home}recipes/`, quotes = `${home}quotes/`, discover = lang === "en" ? "/discover/" : "/es/descubra/";
  const current = (base: string) => (path.startsWith(base) ? "page" : undefined);
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  const links = (close?: () => void) => [
    <Link key="building" href={`${home}#projects`} onClick={close}>{nav.building}</Link>,
    <Link key="about" href={`${home}about/`} aria-current={current(`${home}about/`)} onClick={close}>{nav.about}</Link>,
    <Link key="resume" href={`${home}about/#resume`} onClick={close}>{nav.resume}</Link>,
    <Link key="contact" href={`${home}#contact`} onClick={close}>{nav.contact}</Link>,
    <Link key="blog" href={blog} aria-current={current(blog)} onClick={close}>{nav.blog}</Link>,
    showRecipes && <Link key="recipes" href={recipes} aria-current={current(recipes)} onClick={close}>{nav.recipes}</Link>,
    showDiscover && <Link key="discover" href={discover} aria-current={current(discover)} onClick={close}>{nav.discover}</Link>,
    showQuotes && <Link key="quotes" href={quotes} aria-current={current(quotes)} onClick={close}>{nav.quotes}</Link>,
  ];
  const onLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    try { localStorage.setItem("ds-lang", e.target.value); } catch {}
    const here = path.endsWith("/") ? path : `${path}/`;
    location.assign(otherPath(here, lang, alt) + (here === home ? location.hash : ""));
  };
  return (
    <>
    <header className="bar">
      <Link className="mark" href={home} aria-label={nav.home}>Rod Johnson</Link>
      <nav aria-label={nav.label} className="bar-links">{links()}</nav>
      <button ref={button} type="button" className="ds-btn text bar-menu" aria-expanded={open} aria-controls="phone-nav" onClick={() => setOpen((o) => !o)}>{nav.menu}</button>
      {account}
      <span className="ds-lang">
        <label>
          <span className="ds-lang-label">{nav.language}</span>
          <select id="lang" aria-label={nav.language} value={lang} onChange={onLang}>
            {(["en", "es"] as const).map((l) => <option key={l} value={l} lang={HTML_LANG[l]}>{NAMES[l]}</option>)}
          </select>
        </label>
      </span>
    </header>
    {open && <nav id="phone-nav" aria-label={nav.label} className="phone-nav">{links(() => setOpen(false))}{account}</nav>}
    <noscript><nav aria-label={nav.label} className="phone-nav static">{links()}</nav></noscript>
    </>
  );
}
