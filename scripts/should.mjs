// Adds the Should page at /should/: Product Manager's static site (repo rodmjay/should, the folder product/site in the
// personal workspace), copied byte-identical, never ported. Runs after postbuild, whose guards cover the Next output
// only: the Should page has inline <script>s, so it gets its own route and CSP.
// - Copies <src> into out/should/ (everything but dotfiles: .git, .github, .nojekyll, .gitignore; the gitignored
//   demo-local/; and the root 404.html, GitHub Pages' SPA redirect, which this site never serves: its 404 is the site's
//   own, and /should/demo/* deep links get the demo shell from the routes below).
// - Hashes every inline script in out/should/**/*.html (sha256, base64) into the /should/* script-src, so the CSP is
//   'self' plus those hashes, nothing else. style-src is 'self' with style-src-attr 'none' (no inline CSS; dynamic
//   values go through CSSOM). Fails, naming Product Manager as the owner, on anything that CSP would block: a <style>
//   block, a style attribute, an inline event handler, a javascript: URL, a script from another origin.
// - Writes the routes into out/staticwebapp.config.json:
//     /should/demo/<each real top-level file or folder>   the CSP, served as is (routes stop at the first match)
//     /should/demo/*                                      anything else is a demo deep link: the SPA shell (404.html)
//     /should/*                                           the CSP
//   /should redirects to /should/ (trailingSlash "auto"); a rewrite would break the page's relative URLs (ds/, i18n/).
// Usage: node scripts/should.mjs <src>, or SHOULD_SRC=<src> npm run build. With neither, it leaves out/ as it is.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, cpSync } from "node:fs";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";

const OUT = "out";
const DEST = join(OUT, "should");
const CONFIG = join(OUT, "staticwebapp.config.json");

const src = process.argv[2] || process.env.SHOULD_SRC;
if (!src && !existsSync(join(DEST, "index.html"))) {
  console.log("should: no source (SHOULD_SRC or an argument), /should/ not added");
  process.exit(0);
}
if (src) {
  if (!existsSync(join(src, "index.html")) || !existsSync(join(src, "demo/404.html"))) {
    console.error(`should: ${src} has no index.html or demo/404.html`);
    process.exit(1);
  }
  rmSync(DEST, { recursive: true, force: true });
  cpSync(src, DEST, { recursive: true, filter: (p) =>
    !basename(p).startsWith(".") && basename(p) !== "demo-local" && p !== join(src, "404.html") });
}

const bad = [];
const hashes = new Set();
let inline = 0;
const htmlFiles = [];
(function list(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) list(p); else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(DEST);
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const isJs = (attrs) => !/\stype=["']?(?!(text|application)\/javascript|module)/i.test(attrs);
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8"), rel = file.slice(OUT.length);
  for (const [, attrs, code] of html.matchAll(SCRIPT)) {
    const src = attrs.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (src) {
      if (/^(https?:)?\/\//i.test(src)) bad.push(`${rel}: script from another origin (script-src is 'self'): ${src}`);
      continue;
    }
    if (!isJs(attrs) || !code) continue;
    hashes.add(`'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`);
    inline++;
  }
  if (/<style[\s>]/i.test(html)) bad.push(`${rel}: <style> block (style-src is 'self': move it into a .css file)`);
  for (const tag of html.match(/<[a-zA-Z][^>]*>/g) || []) {
    if (/\sstyle\s*=/i.test(tag)) bad.push(`${rel}: style attribute (style-src-attr 'none': use a class) in ${tag.slice(0, 80)}`);
    if (/\son[a-z]+\s*=/i.test(tag)) bad.push(`${rel}: inline event handler (no CSP hash allows it) in ${tag.slice(0, 80)}`);
    if (/(href|src|action)\s*=\s*["']?\s*javascript:/i.test(tag)) bad.push(`${rel}: javascript: URL in ${tag.slice(0, 80)}`);
  }
}

const CSP = [
  "default-src 'self'",
  ["script-src 'self'", ...[...hashes].sort()].join(" "),
  "style-src 'self'",
  "style-src-attr 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const headers = { "Content-Security-Policy": CSP };
// The demo exception (11/23): the demo's compiled Svelte bundle (demo/_app) still writes style attributes at run time
// (static style="" in component templates, the design system's chart and project markup, SvelteKit's route announcer),
// which style-src-attr 'none' blocks. Until Product Manager rebuilds it without them, /should/demo/* keeps inline
// styles; its scripts are as strict as the rest ('self' plus hashes). The build says when the exception can go.
const DEMO = join(DEST, "demo");
const demoStyleAttrs = (function count(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) n += count(p); else if (name.endsWith(".js")) n += (readFileSync(p, "utf8").match(/\sstyle=\\?["`$]/g) || []).length;
  }
  return n;
})(join(DEMO, "_app"));
const demoHeaders = { "Content-Security-Policy": CSP.replace("style-src 'self'; style-src-attr 'none'", "style-src 'self' 'unsafe-inline'") };
const real = readdirSync(DEMO).sort().map((name) =>
  ({ route: `/should/demo/${name}${statSync(join(DEMO, name)).isDirectory() ? "/*" : ""}`, headers: demoHeaders }));
const routes = [
  { route: "/should/demo/", headers: demoHeaders },
  ...real,
  { route: "/should/demo/*", rewrite: "/should/demo/404.html", headers: demoHeaders },
  { route: "/should/*", headers },
];

const swa = JSON.parse(readFileSync(CONFIG, "utf8"));
swa.routes = [...(swa.routes || []).filter((r) => !r.route.startsWith("/should")), ...routes];
// Types the page serves that the site's own config doesn't name (the e-books, the demo's body model).
swa.mimeTypes = { ...swa.mimeTypes, ".epub": "application/epub+zip", ".bin": "application/octet-stream" };
const json = `${JSON.stringify(swa, null, 2)}\n`;
// Static Web Apps refuses a configuration file over 20 KB.
if (Buffer.byteLength(json) > 20_000) bad.push(`staticwebapp.config.json is ${Buffer.byteLength(json)} bytes (limit 20 KB)`);
if (/unsafe-/.test(CSP)) bad.push("the /should/ CSP allows inline or eval code");
if (/unsafe-/.test(demoHeaders["Content-Security-Policy"].match(/script-src([^;]*)/)[1])) bad.push("the /should/demo/ CSP allows inline or eval scripts");

if (bad.length) {
  console.error(`should: the Should page (repo rodmjay/should, owner Product Manager) has what its CSP blocks; fix it there:\n${[...new Set(bad)].join("\n")}`);
  process.exit(1);
}
writeFileSync(CONFIG, json);
console.log(demoStyleAttrs
  ? `should: the demo's compiled JS still writes ${demoStyleAttrs} style attribute(s) (owner Product Manager), so /should/demo/* keeps style-src 'unsafe-inline'`
  : "should: the demo's compiled JS writes no style attributes: drop the demo exception in scripts/should.mjs");
console.log(`should: out/should/ has ${htmlFiles.length} page(s), ${inline} inline script(s) allowed by ${hashes.size} hash(es), ${routes.length} route(s)`);
