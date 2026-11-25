// The language picker for the two home pages, as an external file so the Content-Security-Policy needs no inline
// script (public/staticwebapp.config.json). RootLayout points at LANG_SRC; scripts/postbuild.mjs writes LANG_JS there.
// Picks the language before paint: ?lang= wins and is remembered, then /es/, then the visitor's choice, browser and
// time zone. Every other page is in the language its URL says. On every page it first marks <html data-js>, so the
// phone Menu button shows only when script runs (Designer 11/24); React doesn't manage that attribute.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const kit = readFileSync(join(process.cwd(), "public/ds/i18n.js"), "utf8")
  .replace(/^export /gm, "").replace(/^export\s*\{[^}]*\};?$/gm, "");
export const LANG_JS = `document.documentElement.setAttribute("data-js","");(function(){var p=location.pathname;if(p!=="/"&&p!=="/es/")return;${kit}
var here=p==="/es/"?"es":"en",want=pickLang();
try{var u=new URL(location.href),q=u.searchParams.get("lang");if(q==="en"||q==="es"){want=q;localStorage.setItem("ds-lang",q);u.searchParams.delete("lang");history.replaceState(null,"",u)}}catch(e){}if(want!==here)location.replace((want==="es"?"/es/":"/")+location.search+location.hash);})();
`;
export const LANG_SRC = `/_next/static/inline/lang-${createHash("sha256").update(LANG_JS).digest("hex").slice(0, 16)}.js`;
