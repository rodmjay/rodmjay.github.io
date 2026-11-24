"use client";
// The header: the name, the section links and the EN/ES menu. It lives in the root layout and never re-mounts; every
// link is a Next <Link>, so moving between pages swaps only the content. The current section gets aria-current.
import Link from "next/link";
import { usePathname } from "next/navigation";

type Nav = Record<"label" | "home" | "about" | "work" | "resume" | "building" | "contact" | "blog" | "recipes" | "quotes" | "language", string>;
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

export function Header({ lang, nav, showRecipes, showQuotes, alt }: { lang: "en" | "es"; nav: Nav; showRecipes: boolean; showQuotes: boolean; alt: Record<string, string> }) {
  const path = usePathname() || "/";
  const home = lang === "en" ? "/" : "/es/";
  const blog = `${home}blog/`, recipes = `${home}recipes/`, quotes = `${home}quotes/`;
  const current = (base: string) => (path.startsWith(base) ? "page" : undefined);
  const onLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    try { localStorage.setItem("ds-lang", e.target.value); } catch {}
    const here = path.endsWith("/") ? path : `${path}/`;
    location.assign(otherPath(here, lang, alt) + (here === home ? location.hash : ""));
  };
  return (
    <header className="bar">
      <Link className="mark" href={home} aria-label={nav.home}>Rod Johnson</Link>
      <nav aria-label={nav.label}>
        <Link href={`${home}#about`}>{nav.about}</Link>
        <Link href={`${home}#work`}>{nav.work}</Link>
        <Link href={`${home}#resume`}>{nav.resume}</Link>
        <Link href={`${home}#building`}>{nav.building}</Link>
        <Link href={`${home}#contact`}>{nav.contact}</Link>
        <Link href={blog} aria-current={current(blog)}>{nav.blog}</Link>
        {showRecipes && <Link href={recipes} aria-current={current(recipes)}>{nav.recipes}</Link>}
        {showQuotes && <Link href={quotes} aria-current={current(quotes)}>{nav.quotes}</Link>}
      </nav>
      <span className="ds-lang">
        <label>
          <span className="ds-lang-label">{nav.language}</span>
          <select id="lang" aria-label={nav.language} value={lang} onChange={onLang}>
            {(["en", "es"] as const).map((l) => <option key={l} value={l} lang={HTML_LANG[l]}>{NAMES[l]}</option>)}
          </select>
        </label>
      </span>
    </header>
  );
}
