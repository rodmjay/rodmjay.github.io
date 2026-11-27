// The shell: <html> with its language, the header and nav (mounted once per language, so nothing reloads or jumps
// between pages), the footer, the stylesheets and the preloaded fonts. One per language: app/(en) and app/(es) are the
// two root layouts, so `lang` is in the HTML itself. Switching language is a full load, as it was on Pages.
import type { ReactNode } from "react";
import Link from "next/link";
import { HTML_LANG, REMOVE_LIVE, asset, dict } from "@/lib/site.mjs";
import { LANG_SRC } from "@/lib/langscript.mjs";
import { altMap } from "@/lib/routes.mjs";
import { loadQuotes } from "@/lib/quotes.mjs";
import { Header } from "./Header";
import { MotionToggle } from "@/components/living-hero/MotionToggle";
const LIVING_HERO = process.env.LIVING_HERO === "1";
import { Account } from "@/account/gate";
// Accounts (ADR 0004/0005): the header's "Sign in" / "Dashboard" and its footer copy, only where ACCOUNTS_ON=1.
const ACCOUNTS_ON = process.env.ACCOUNTS_ON === "1";

type Lang = "en" | "es";

const FONTS = ["/ds/fonts/inter/inter-latin-wght-normal.woff2", "/ds/fonts/space-grotesk/space-grotesk-latin-wght-normal.woff2"];

export async function RootLayout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const d = dict(lang);
  const alt = await altMap();
  const hasQuotes = (await loadQuotes()).quotes.length > 0;
  const nav = { home: d.nav.home, language: d.nav.language };
  const a = d.account, home = lang === "en" ? "/" : "/es/";
  const words = ACCOUNTS_ON && Account ? { signIn: a.signIn, dashboard: a.dashboard, signInHref: `${home}signin/`, dashHref: `${home}dashboard/` } : null;
  return (
    <html lang={HTML_LANG[lang]} translate="no" className="notranslate" data-brand="rod">
      <head>
        {/* Language picker (src/lib/langscript.mjs): an external file, so the CSP allows no inline script. */}
        <script src={LANG_SRC} />
        <meta name="google" content="notranslate" />
        {FONTS.map((f) => <link key={f} rel="preload" href={f} as="font" type="font/woff2" crossOrigin="anonymous" />)}
        <link rel="stylesheet" href="/ds/fonts.css" />
        <link rel="stylesheet" href={asset("ds/design-system.css")} />
        <link rel="stylesheet" href={asset("site.css")} />
        <link rel="stylesheet" href={asset("blog/blog.css")} />
        <link rel="stylesheet" href={asset("recipes/recipes.css")} />
      </head>
      <body className="ds">
        <a className="skip" href="#main">{d.nav.skip}</a>
        <Header lang={lang} nav={nav} alt={alt} account={words && Account ? <><link rel="stylesheet" href={asset("account.css")} precedence="default" /><Account.AccountLink w={words} where="header" /></> : undefined} />
        {children}
        {/* One line (design/specs/rodmjay-home.md 11/27): Resume · Contact · Quotes · Privacy, plus the removal-request link
            where it's live. No product links: the products are on the home. */}
        <footer className="foot col"><nav aria-label={d.home.footerLabel} className="foot-links ds-body-small">
          <Link href={`${home}about/#resume`}>{d.home.resume}</Link>
          <Link href={`${home}about/#contact`}>{d.home.contact}</Link>
          {hasQuotes && <Link href={`${home}quotes/`}>{d.home.quotes}</Link>}
          <Link href={lang === "en" ? "/privacy/" : "/privacy/es/"}>{d.home.privacy}</Link>
          {REMOVE_LIVE && <Link href={lang === "en" ? "/remove/" : "/es/remove/"}>{d.remove.footerLink}</Link>}
          <span className="foot-note">{d.footer.cookies}</span>
          {LIVING_HERO && <MotionToggle w={{ on: d.home.motionOn, off: d.home.motionOff, nameOn: d.home.motionNameOn, nameOff: d.home.motionNameOff }} />}
        </nav></footer>
      </body>
    </html>
  );
}
