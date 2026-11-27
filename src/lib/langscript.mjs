// The language picker for the two home pages, as an external file so the Content-Security-Policy needs no inline
// script (public/staticwebapp.config.json). RootLayout points at LANG_SRC; scripts/postbuild.mjs writes LANG_JS there.
// Picks the language before paint: ?lang= wins and is remembered, then /es/, then the visitor's choice, browser and
// time zone. Every other page is in the language its URL says. On every page it first marks <html data-js>, so the
// phone Menu button shows only when script runs (Designer 11/24); React doesn't manage that attribute.
// A filtered recipe index (/recipes/?tags=…, also /es/ and /page/N/) is the same static file as the plain index, so it
// gets its own robots noindex tag here, before anything renders (Designer 11/26; a separate tag, never Next's own); its canonical stays /recipes/. RecipeBrowser
// removes the tag (data-filtered) when the visitor leaves the index, so later pages in the same visit don't carry it.
// The same goes for a filtered Discover SLC page (/slc/?when=…&cat=…, /es/slc/; EventBrowser removes it).
// Before anything else it sets the deploy safety net (Rod 11/25, DECISIONS: don't kick people offline when we update):
// if a /_next/static file fails to load, or a chunk-load error reaches the page, it reloads the same URL once. The URL
// keeps the hash (where RVP results live) and the test keeps its answers in sessionStorage, so a reload resumes. At most
// one reload per URL in 30 seconds, and none without sessionStorage, so it can never loop. Deploys also carry the last
// 7 days of /_next/static files forward (scripts/skew.mjs), so this should rarely fire.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const kit = readFileSync(join(process.cwd(), "public/ds/i18n.js"), "utf8")
  .replace(/^export /gm, "").replace(/^export\s*\{[^}]*\};?$/gm, "");
const GUARD = `(function(){var K="skew-reload",E=/ChunkLoadError|Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i;
function again(){try{var u=location.pathname+location.search,t=JSON.parse(sessionStorage.getItem(K)||"null");if(t&&t.u===u&&Date.now()-t.t<30000)return;sessionStorage.setItem(K,JSON.stringify({u:u,t:Date.now()}))}catch(e){return}location.reload()}
function isChunk(x){return !!x&&E.test(String(x.name)+" "+String(x.message))}
addEventListener("error",function(e){var s=e.target,u=s&&(s.src||s.href);if(s&&s!==window&&typeof u==="string"&&u.indexOf("/_next/static/")>=0)again();else if(isChunk(e.error))again()},true);
addEventListener("unhandledrejection",function(e){if(isChunk(e.reason))again()});})();
`;
export const LANG_JS = `${GUARD}document.documentElement.setAttribute("data-js","");(function(){var p=location.pathname,s=location.search;if(!(/[?&]tags=/.test(s)&&new RegExp("^/(es/)?recipes/(page/[0-9]+/)?$").test(p))&&!(/[?&](when|cat)=/.test(s)&&new RegExp("^/(es/)?slc/$").test(p)))return;var m=document.createElement("meta");m.setAttribute("name","robots");m.setAttribute("content","noindex");m.setAttribute("data-filtered","");document.head.appendChild(m)})();(function(){var p=location.pathname;if(p!=="/"&&p!=="/es/")return;${kit}
var here=p==="/es/"?"es":"en",want=pickLang();
try{var u=new URL(location.href),q=u.searchParams.get("lang");if(q==="en"||q==="es"){want=q;localStorage.setItem("ds-lang",q);u.searchParams.delete("lang");history.replaceState(null,"",u)}}catch(e){}if(want!==here)location.replace((want==="es"?"/es/":"/")+location.search+location.hash);})();
`;
export const LANG_SRC = `/_next/static/inline/lang-${createHash("sha256").update(LANG_JS).digest("hex").slice(0, 16)}.js`;
