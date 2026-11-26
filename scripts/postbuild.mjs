// After `next build`: tidies out/ for Static Web Apps and checks it.
// - Removes the placeholder pages a dynamic route builds when it has nothing to list (Next's static export refuses an
//   empty generateStaticParams, so src/zones/routes.tsx gives it one placeholder that 404s: page/0, tag/none, none).
// - Removes out/404/ (out/404.html is the 404; staticwebapp.config.json serves it).
// - Fails if any other page is an error page, or if the 404 or a feed is missing.
// - Moves every inline script into a file, so the Content-Security-Policy (public/staticwebapp.config.json) can say
//   script-src 'self' with no 'unsafe-inline': Next's static export writes its bootstrap and RSC payload as inline
//   <script>s. Each run of consecutive inline scripts becomes one content-addressed file in /_next/static/inline/,
//   loaded by a plain (blocking) <script src> in the same place, so the order is unchanged. Writes the language
//   picker (src/lib/langscript.mjs) there too.
// - Then fails on anything the CSP would block: an inline script, a style attribute or <style>, an on* handler, a
//   javascript: URL; and on a CSP that allows inline or eval scripts.
// All of this covers the Next output only: out/should/ (scripts/should.mjs, after this) is Product Manager's page,
// copied as is under its own route and CSP, so every step here skips it.
import { readdirSync, readFileSync, rmSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { LANG_JS, LANG_SRC } from "../src/lib/langscript.mjs";

const OUT = "out";
const SHOULD = join(OUT, "should"); // not ours to tidy or check (scripts/should.mjs)
const PLACEHOLDER = /\/(page\/0|tag\/none|none)$/;
const bad = [];
let pruned = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (!statSync(p).isDirectory() || p === SHOULD) continue;
    const rel = `/${p.slice(OUT.length + 1)}`;
    const html = join(p, "index.html");
    if (existsSync(html) && readFileSync(html, "utf8").includes('id="__next_error__"')) {
      if (PLACEHOLDER.test(rel)) { rmSync(p, { recursive: true, force: true }); pruned++; continue; }
      bad.push(`${rel}/ is an error page`);
    }
    walk(p);
    // What's left of a placeholder (its RSC payload files, or nothing), and folders the pruning emptied.
    const left = readdirSync(p);
    if ((PLACEHOLDER.test(rel) && !left.includes("index.html")) || left.length === 0) {
      rmSync(p, { recursive: true, force: true });
    }
  }
}
rmSync(join(OUT, "404"), { recursive: true, force: true });
// The RVP test ships only where RVP_ON=1 (staging and checks; production after Rod's yes): otherwise it isn't served.
if (process.env.RVP_ON !== "1") for (const d of ["personality-test", "es/test-de-personalidad"]) rmSync(join(OUT, d), { recursive: true, force: true });
// Accounts the same way (ACCOUNTS_ON, ADR 0004): off, no /signin/ or /dashboard/ page and none of their header rules.
const ACCOUNT_PAGES = ["signin", "es/signin", "dashboard", "es/dashboard"];
if (process.env.ACCOUNTS_ON !== "1") {
  for (const d of ACCOUNT_PAGES) rmSync(join(OUT, d), { recursive: true, force: true });
  rmSync(join(OUT, "account.css"), { force: true });
  const file = join(OUT, "staticwebapp.config.json"), cfg = JSON.parse(readFileSync(file, "utf8"));
  cfg.routes = (cfg.routes || []).filter((r) => !ACCOUNT_PAGES.some((d) => r.route === `/${d}/*`));
  writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
}
walk(OUT);
for (const f of ["404.html", "index.html", "es/index.html", "blog/feed.xml", "es/blog/feed.xml", "sitemap.xml", "robots.txt", "staticwebapp.config.json"])
  if (!existsSync(join(OUT, f))) bad.push(`out/${f} is missing`);

// ---- Inline scripts → files (CSP) ----
const INLINE_DIR = join(OUT, "_next/static/inline");
mkdirSync(INLINE_DIR, { recursive: true });
writeFileSync(join(OUT, LANG_SRC), LANG_JS);
const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const isInlineJs = (attrs) => !/\ssrc=/.test(attrs) && !/\stype="(?!(text|application)\/javascript"|module")/.test(attrs);
const files = new Set();
let moved = 0;
function emit(code) {
  const name = `${createHash("sha256").update(code).digest("hex").slice(0, 16)}.js`;
  if (!files.has(name)) { writeFileSync(join(INLINE_DIR, name), code); files.add(name); }
  return `<script src="/_next/static/inline/${name}"></script>`;
}
// The head script (src/lib/langscript.mjs) carries the deploy safety net (reload once on a missing /_next/static file,
// Rod 11/25), so it must be listening before any chunk can fail: Next writes its async chunk <script>s at the top of
// <head>, so move ours to just after <meta charset>. It's blocking, so no chunk element exists until it has run.
const LANG_TAG = `<script src="${LANG_SRC}"></script>`;
function guardFirst(html) {
  if (!html.includes(LANG_TAG)) return html;
  const rest = html.replace(LANG_TAG, ""), at = rest.match(/<head>(<meta charSet="utf-8"\/>)?/);
  if (!at) return html;
  const i = at.index + at[0].length;
  return rest.slice(0, i) + LANG_TAG + rest.slice(i);
}
const htmlFiles = [];
(function list(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (p === SHOULD) continue;
    if (statSync(p).isDirectory()) list(p); else if (name.endsWith(".html")) htmlFiles.push(p);
  }
})(OUT);
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  let out = "", last = 0, run = null; // run = { start, parts } of consecutive attribute-less inline scripts
  const flush = () => { if (run) { out += html.slice(last, run.start) + emit(run.parts.join(";\n")); last = run.end; moved += run.parts.length; run = null; } };
  for (const m of html.matchAll(SCRIPT)) {
    const [whole, attrs, code] = m, start = m.index, end = start + whole.length;
    if (!isInlineJs(attrs) || !code.trim()) { flush(); continue; }
    if (attrs.trim()) { flush(); out += html.slice(last, start) + emit(code).replace("<script ", `<script${attrs} `); last = end; moved++; continue; }
    if (run && /^\s*$/.test(html.slice(run.end, start))) { run.parts.push(code); run.end = end; continue; }
    flush();
    run = { start, end, parts: [code] };
  }
  flush();
  out += html.slice(last);
  out = guardFirst(out);
  if (out !== html) writeFileSync(file, out);
}

// ---- Nothing the CSP would block ----
for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8"), rel = file.slice(OUT.length);
  const g = html.indexOf(LANG_TAG), c = html.indexOf("/_next/static/chunks/");
  if (g >= 0 && c >= 0 && c < g) bad.push(`${rel}: a chunk script comes before the head script (deploy safety net)`);
  for (const m of html.matchAll(SCRIPT)) if (isInlineJs(m[1]) && m[2].trim()) bad.push(`${rel}: inline script left`);
  if (/<style[\s>]/i.test(html)) bad.push(`${rel}: <style> element (the CSP allows only style sheets from the site)`);
  for (const tag of html.match(/<[a-zA-Z][^>]*>/g) || []) {
    if (/\sstyle\s*=/i.test(tag)) bad.push(`${rel}: style attribute in ${tag.slice(0, 80)}`);
    if (/\son[a-z]+\s*=/i.test(tag)) bad.push(`${rel}: inline event handler in ${tag.slice(0, 80)}`);
    if (/(href|src|action)\s*=\s*"\s*javascript:/i.test(tag)) bad.push(`${rel}: javascript: URL in ${tag.slice(0, 80)}`);
  }
}
const swa = JSON.parse(readFileSync(join(OUT, "staticwebapp.config.json"), "utf8"));
const csp = swa.globalHeaders?.["Content-Security-Policy"] || "";
const scriptSrc = csp.match(/script-src([^;]*)/)?.[1] ?? "";
if (!csp) bad.push("staticwebapp.config.json: no global Content-Security-Policy");
if (/unsafe-(inline|eval)|\*/.test(scriptSrc) || /'unsafe-inline'/.test(csp)) bad.push("staticwebapp.config.json: the site CSP allows inline or eval code");

if (bad.length) { console.error(`postbuild:\n${[...new Set(bad)].join("\n")}`); process.exit(1); }
console.log(`postbuild: out/ is ready (${pruned} placeholder page(s) removed, ${moved} inline script(s) moved into ${files.size} file(s))`);
