// The two account pages, /signin/ and /dashboard/ (each with its /es/ twin). The route files are page.acct.tsx, so they
// exist only where ACCOUNTS_ON=1 (next.config.mjs; scripts/postbuild.mjs removes any leftovers otherwise). Shells only:
// noindex, Cache-Control no-store (staticwebapp.config.json), and nothing private until the person signs in.
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { rvpUrl } from "@/rvp/data";
import { SignIn } from "./SignIn";
import { Dashboard } from "./Dashboard";
import { ConsoleView } from "./ConsoleView";
import type { ConsoleStrings } from "@/kit/console/Console";

type Lang = "en" | "es";
const other = (lang: Lang): Lang => (lang === "en" ? "es" : "en");
const home = (lang: Lang) => (lang === "en" ? "/" : "/es/");
const strings = (lang: Lang) => dict(lang).account as Record<string, string>;
const consoleStrings = (lang: Lang) => dict(lang).console as ConsoleStrings & Record<string, string>;
const privacy = (lang: Lang) => (lang === "en" ? "/privacy/" : "/privacy/es/");

export const accountMeta = (lang: Lang, page: "signin" | "dashboard" | "console") => {
  const s = strings(lang), c = consoleStrings(lang);
  return meta({ lang, title: page === "signin" ? s.signinMetaTitle : page === "console" ? c.metaTitle : s.dashMetaTitle,
    description: page === "signin" ? s.signinMetaDescription : page === "console" ? c.metaDescription : s.dashMetaDescription,
    path: `${home(lang)}${page}/`, alt: `${home(other(lang))}${page}/`, noindex: true });
};

export function SignInPage({ lang }: { lang: Lang }) {
  return (
    <main id="main" className="col acct-page">
      <SignIn lang={lang} s={strings(lang)} dashHref={`${home(lang)}dashboard/`} testHref={rvpUrl(lang, "")} privacyHref={privacy(lang)} />
    </main>
  );
}

export function DashboardPage({ lang }: { lang: Lang }) {
  return (
    <main id="main" className="col acct-page">
      <Dashboard lang={lang} s={strings(lang)} rvp={dict(lang).rvp as Record<string, string>}
        links={{ signin: `${home(lang)}signin/`, test: rvpUrl(lang, ""), take: rvpUrl(lang, "take"), home: home(lang), privacy: privacy(lang) }} />
    </main>
  );
}

export function ConsolePage({ lang }: { lang: Lang }) {
  const c = consoleStrings(lang);
  return (
    <main id="main" className="col acct-page">
      <h1 className="ds-headline-medium">{c.title}</h1>
      <p className="ds-body-large">{c.lede}</p>
      <ConsoleView s={c} signinHref={`${home(lang)}signin/`} />
    </main>
  );
}
