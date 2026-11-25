// "Remove my information" (Rod 11/24): the request form and the confirm page. The function is erase-request (Database
// Administrator; design in database/designs/erasure-request.md). The form always gets {ok:true}; the link is
// /remove/confirm/#<token> (a fragment, so the token never reaches a log). Neutral wording only: nothing here says
// whether anything was held, and "Done" lives in the done email (Legal and Compliance 11/24).
import Link from "next/link";
import { dict, PRIVACY_EMAIL, REMOVE_LIVE } from "@/lib/site.mjs";
import { meta } from "@/lib/meta";
import { RemoveForm, ConfirmRemoval } from "./RemoveClient";

type Lang = "en" | "es";
const PATH = { en: "/remove/", es: "/es/remove/" } as const;
const CONFIRM = { en: "/remove/confirm/", es: "/es/remove/confirm/" } as const;
const PRIVACY = { en: "/privacy/", es: "/privacy/es/" } as const;

export function removeMeta(lang: Lang, confirm = false) {
  const r = dict(lang).remove;
  const path = (confirm ? CONFIRM : PATH)[lang], alt = (confirm ? CONFIRM : PATH)[lang === "en" ? "es" : "en"];
  return meta({ lang, title: r.metaTitle, description: r.metaDescription, path, alt, noindex: confirm || !REMOVE_LIVE });
}

function withMail(text: string) {
  const [a, b] = text.split("{email}");
  return <>{a}<a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>{b}</>;
}

export function Remove({ lang }: { lang: Lang }) {
  const r = dict(lang).remove;
  return (
    <main id="main" className="col quotes-page">
      <h1 className="ds-headline-medium project-title">{r.title}</h1>
      <p className="ds-body-large">{r.lede}</p>
      <RemoveForm lang={lang} t={r} />
      <p className="ds-body-medium">{withMail(r.scope)}</p>
      <h2 className="ds-title-large">{r.coveredHeading}</h2>
      <p className="ds-body-large">{r.covered}</p>
      <p className="ds-body-large">{r.backups}</p>
      <p className="ds-body-large">{r.keepRecord}</p>
      <p><Link href={PRIVACY[lang]}>{r.privacy}</Link></p>
    </main>
  );
}

export function RemoveConfirm({ lang }: { lang: Lang }) {
  const r = dict(lang).remove;
  return (
    <main id="main" className="col quotes-page">
      <ConfirmRemoval lang={lang} t={r} requestHref={PATH[lang]} homeHref={lang === "en" ? "/" : "/es/"} />
      <noscript><p className="ds-body-large">{r.nojs}</p></noscript>
    </main>
  );
}
