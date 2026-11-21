// Builds the English and Spanish pages from src/page.html and i18n/*.json.
// Fails on any key missing in either language, or a placeholder the dictionary lacks.
//   node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { compareDicts } from "../ds/i18n.js";

const SITE = "https://rodmjay.com/";
// Cache-busting: a short hash of the CSS and JS, appended to their links so a normal reload gets the new files.
import { createHash } from "node:crypto";
const ASSET_V = createHash("sha256").update(readFileSync("site.css")).update(readFileSync("site.js")).update(readFileSync("ds/design-system.css")).digest("hex").slice(0, 8);
const HTML_LANG = { en: "en", es: "es-419" };
const NAMES = { en: "English", es: "Español" };

const dicts = { en: JSON.parse(readFileSync("i18n/en.json", "utf8")), es: JSON.parse(readFileSync("i18n/es.json", "utf8")) };
const problems = compareDicts(dicts.en, dicts.es);
if (problems.length) { console.error(problems.join("\n")); process.exit(1); }

// Picks the language before paint: ?lang= wins and is remembered, then /es/, then the visitor's choice, browser and time zone.
const kit = readFileSync("ds/i18n.js", "utf8").replace(/^export /gm, "").replace(/^export\s*\{[^}]*\};?$/gm, "");
const langScript = (lang) => `(function(){${kit}
var want=pickLang();
try{var u=new URL(location.href),q=u.searchParams.get("lang");if(q==="en"||q==="es"){want=q;localStorage.setItem("ds-lang",q);u.searchParams.delete("lang");history.replaceState(null,"",u)}}catch(e){}if(want!=="${lang}")location.replace(${lang === "en" ? '"es/"' : '"../"'}+location.search+location.hash);})();`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);

function render(tpl, dict, at) {
  const value = (key, item, i) => {
    if (key.startsWith("@")) {
      const k = key.slice(1);
      if (k === "i") return String(i);
      if (k === "n") return fmtStep(dict, i);
      if (k === "first") return String(i === 0);
      if (k === "hiddenUnlessFirst") return i === 0 ? "" : " hidden";
      if (k in at) return at[k];
    } else {
      const v = key.startsWith(".") ? get(item, key.slice(1)) : get(dict, key);
      if (typeof v === "string") return v;
    }
    throw new Error(`missing "${key}" in ${at.htmlLang}`);
  };
  const fill = (s, item, i) => s
    .replace(/\{\{\{([@.\w]+)\}\}\}/g, (m, k) => value(k, item, i))
    .replace(/\{\{([@.\w]+)\}\}/g, (m, k) => esc(value(k, item, i)));
  return fill(tpl.replace(/\{\{#each ([.\w]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (m, key, body) => {
    const list = get(dict, key);
    if (!Array.isArray(list)) throw new Error(`"${key}" is not a list`);
    return list.map((item, i) => fill(body, item, i)).join("");
  }));
}
const fmtStep = (dict, i) => String(i + 1);

const tpl = readFileSync("src/page.html", "utf8");
for (const lang of ["en", "es"]) {
  const other = lang === "en" ? "es" : "en";
  const at = {
    htmlLang: HTML_LANG[lang], root: lang === "en" ? "" : "../", home: "./",
    canonical: lang === "en" ? SITE : `${SITE}es/`, siteEn: SITE, siteEs: `${SITE}es/`,
    otherPath: lang === "en" ? "es/" : "../",
    langScript: langScript(lang),
    langOptions: ["en", "es"].map((l) => `<option value="${l}" lang="${HTML_LANG[l]}"${l === lang ? " selected" : ""}>${NAMES[l]}</option>`).join(""),
  };
  const html = render(tpl, dicts[lang], at).replace(/(site\.css|site\.js|ds\/design-system\.css)"/g, `$1?v=${ASSET_V}"`);
  if (/\{\{[#/@.\w]/.test(html)) throw new Error(`${lang}: unfilled placeholder`);
  const out = lang === "en" ? "index.html" : "es/index.html";
  mkdirSync("es", { recursive: true });
  writeFileSync(out, html);
  console.log(`wrote ${out}`);
}

// One 404 for both languages: GitHub Pages serves it for any missing path, so links use the full site path.
const nf = (l) => dicts[l].notFound;
writeFileSync("404.html", `<!doctype html>
<html lang="en" translate="no" class="notranslate" data-brand="rod">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(nf("en").title)} · Rod Johnson</title><meta name="robots" content="noindex"><meta name="google" content="notranslate">
<link rel="stylesheet" href="/ds/fonts.css"><link rel="stylesheet" href="/ds/design-system.css"><link rel="stylesheet" href="/site.css"></head>
<body class="ds"><main class="ds-container nf">
<section lang="en"><h1>${esc(nf("en").title)}</h1><p class="ds-variant">${esc(nf("en").body)}</p><a class="ds-btn" href="/">${esc(nf("en").cta)}</a></section>
<section lang="es-419"><h1>${esc(nf("es").title)}</h1><p class="ds-variant">${esc(nf("es").body)}</p><a class="ds-btn tonal" href="/es/">${esc(nf("es").cta)}</a></section>
</main></body></html>
`);
console.log("wrote 404.html");
