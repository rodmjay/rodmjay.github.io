"use client";
// The header: the name, the section links and the EN/ES menu. It lives in the root layout and never re-mounts; every
// link is a Next <Link>, so moving between pages swaps only the content. The current section gets aria-current.
// Phones (≤600px) get a "Menu" button instead of the row of links (Designer 11/24): it opens a panel of the same links
// right under the header, over the content (the header never changes height). Esc, a second tap or following a link
// closes it; Esc returns focus to the button. Without script the same list is in a <noscript>, so it stays reachable.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Nav = Record<"home" | "language", string>;
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

// `account` is the "Sign in" / "Dashboard" slot after the language menu (only where accounts are on). No section links
// (design/specs/rodmjay-home.md, Rod 11/27: the home is "just core of me and then list of my projects"): the products
// have their own chrome, and the rest is reached from the home and the footer.
export function Header({ lang, nav, alt, account }: { lang: "en" | "es"; nav: Nav; alt: Record<string, string>; account?: ReactNode }) {
  const path = usePathname() || "/";
  const home = lang === "en" ? "/" : "/es/";
  const onLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    try { localStorage.setItem("ds-lang", e.target.value); } catch {}
    const here = path.endsWith("/") ? path : `${path}/`;
    location.assign(otherPath(here, lang, alt) + (here === home ? location.hash : ""));
  };
  return (
    <header className="bar">
      <Link className="mark" href={home} aria-label={nav.home}>Rod Johnson</Link>
      <span className="ds-lang">
        <label>
          <span className="ds-lang-label">{nav.language}</span>
          <select id="lang" aria-label={nav.language} value={lang} onChange={onLang}>
            {(["en", "es"] as const).map((l) => <option key={l} value={l} lang={HTML_LANG[l]}>{NAMES[l]}</option>)}
          </select>
        </label>
      </span>
      {account}
    </header>
  );
}
