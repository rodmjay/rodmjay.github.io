// One 404 for both languages (out/404.html; staticwebapp.config.json serves it for any missing path), so links use the
// full site path. It sits outside the two root layouts, like the 404.html the Pages build wrote.
import type { Metadata } from "next";
import { dict, asset } from "@/lib/site.mjs";

export const metadata: Metadata = { title: `${dict("en").notFound.title} · Rod Johnson`, robots: { index: false } };

export default function NotFound() {
  const nf = (l: "en" | "es") => dict(l).notFound;
  return (
    <html lang="en" translate="no" className="notranslate" data-brand="rod">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="stylesheet" href="/ds/fonts.css" />
        <link rel="stylesheet" href={asset("ds/design-system.css")} />
        <link rel="stylesheet" href={asset("site.css")} />
      </head>
      <body className="ds">
        <main className="ds-container nf">
          <section lang="en"><h1>{nf("en").title}</h1><p className="ds-variant">{nf("en").body}</p><a className="ds-btn" href="/">{nf("en").cta}</a></section>
          <section lang="es-419"><h1>{nf("es").title}</h1><p className="ds-variant">{nf("es").body}</p><a className="ds-btn tonal" href="/es/">{nf("es").cta}</a></section>
        </main>
      </body>
    </html>
  );
}
