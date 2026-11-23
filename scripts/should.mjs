// Adds the Should page at /should/: Product Manager's static site (repo rodmjay/should, the folder product/site in the
// personal workspace), copied byte-identical, never ported. Runs after postbuild, whose no-inline-code guards cover the
// Next output only: the Should page has inline <script>s and style attributes, so it gets its own route and CSP.
// - Copies <src> into out/should/ (everything but dotfiles: .git, .github, .nojekyll, .gitignore; and the gitignored
//   demo-local/).
// - Hashes every inline script in out/should/**/*.html (sha256, base64) into the /should/* script-src, so the CSP never
//   needs 'unsafe-inline' for scripts. Fails on an inline event handler or javascript: URL (no hash can allow those) and
//   on a script from another origin that isn't in EXTERNAL_SCRIPTS below (Security reviews each addition).
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
// Scripts the page loads from other origins, by exact URL. The demo shell loads htmx (unused by the demo's own code).
const EXTERNAL_SCRIPTS = ["https://unpkg.com/htmx.org@1.9.12/dist/htmx.min.js"];

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
  cpSync(src, DEST, { recursive: true, filter: (p) => !basename(p).startsWith(".") && basename(p) !== "demo-local" });
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
      if (/^(https?:)?\/\//i.test(src) && !EXTERNAL_SCRIPTS.includes(src)) bad.push(`${rel}: script from another origin, not allowed: ${src}`);
      continue;
    }
    if (!isJs(attrs) || !code) continue;
    hashes.add(`'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`);
    inline++;
  }
  for (const tag of html.match(/<[a-zA-Z][^>]*>/g) || []) {
    if (/\son[a-z]+\s*=/i.test(tag)) bad.push(`${rel}: inline event handler (no CSP hash allows it) in ${tag.slice(0, 80)}`);
    if (/(href|src|action)\s*=\s*["']?\s*javascript:/i.test(tag)) bad.push(`${rel}: javascript: URL in ${tag.slice(0, 80)}`);
  }
}

const CSP = [
  "default-src 'self'",
  `script-src 'self' ${[...EXTERNAL_SCRIPTS, ...[...hashes].sort()].join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");
const headers = { "Content-Security-Policy": CSP };
const DEMO = join(DEST, "demo");
const real = readdirSync(DEMO).sort().map((name) =>
  ({ route: `/should/demo/${name}${statSync(join(DEMO, name)).isDirectory() ? "/*" : ""}`, headers }));
const routes = [
  { route: "/should/demo/", headers },
  ...real,
  { route: "/should/demo/*", rewrite: "/should/demo/404.html", headers },
  { route: "/should/*", headers },
];

const swa = JSON.parse(readFileSync(CONFIG, "utf8"));
swa.routes = [...(swa.routes || []).filter((r) => !r.route.startsWith("/should")), ...routes];
// Types the page serves that the site's own config doesn't name (the e-books, the demo's body model).
swa.mimeTypes = { ...swa.mimeTypes, ".epub": "application/epub+zip", ".bin": "application/octet-stream" };
const json = `${JSON.stringify(swa, null, 2)}\n`;
// Static Web Apps refuses a configuration file over 20 KB.
if (Buffer.byteLength(json) > 20_000) bad.push(`staticwebapp.config.json is ${Buffer.byteLength(json)} bytes (limit 20 KB)`);
if (/unsafe-(inline|eval)/.test(CSP.match(/script-src([^;]*)/)[1])) bad.push("the /should/ CSP allows inline or eval scripts");

if (bad.length) { console.error(`should:\n${[...new Set(bad)].join("\n")}`); process.exit(1); }
writeFileSync(CONFIG, json);
console.log(`should: out/should/ has ${htmlFiles.length} page(s), ${inline} inline script(s) allowed by ${hashes.size} hash(es), ${routes.length} route(s)`);
