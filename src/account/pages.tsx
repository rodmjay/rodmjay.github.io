// The two account pages, /signin/ and /dashboard/ (each with its /es/ twin). The route files are page.acct.tsx, so they
// exist only where ACCOUNTS_ON=1 (next.config.mjs; scripts/postbuild.mjs removes any leftovers otherwise). Shells only:
// noindex, Cache-Control no-store (staticwebapp.config.json), and nothing private until the person signs in.
import { dict } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { rvpUrl } from "@/rvp/data";
import { SignIn } from "./SignIn";
import { Dashboard } from "./Dashboard";

type Lang = "en" | "es";
const other = (lang: Lang): Lang => (lang === "en" ? "es" : "en");
const home = (lang: Lang) => (lang === "en" ? "/" : "/es/");
const strings = (lang: Lang) => dict(lang).account as Record<string, string>;
const privacy = (lang: Lang) => (lang === "en" ? "/privacy/" : "/privacy/es/");

export const accountMeta = (lang: Lang, page: "signin" | "dashboard") => {
  const s = strings(lang);
  return meta({ lang, title: page === "signin" ? s.signinMetaTitle : s.dashMetaTitle, description: page === "signin" ? s.signinMetaDescription : s.dashMetaDescription,
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
