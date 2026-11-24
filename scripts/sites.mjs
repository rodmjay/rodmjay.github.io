// Adds a static site from another repo under rodmjay.com/<name>/, copied byte-identical, never ported: the Should page
// (scripts/should.mjs calls this) and the project sites GitHub Pages used to serve under the custom domain (altura,
// agentic-squared, agency-squared, moodboard; rodmjay.github.io/<name>/ still 301s to rodmjay.com/<name>/). Runs after
// postbuild, whose guards cover the Next output only: each site gets its own path-scoped route and CSP.
// - Copies <src> into out/<name>/ (everything but dotfiles and what the site's entry below skips). A site with a
//   `build` (agency-squared, a Next.js export) is built first from its own pinned source, with its own lockfile and
//   script, and its output is copied as is.
// - Hashes every inline script in out/<name>/**/*.html (sha256, base64) into that path's script-src, so the CSP is
//   'self' plus those hashes. style-src is 'self' with style-src-attr 'none', unless the site's `allow` below names
//   exactly what it uses (a hashed <style> block, style attributes, a font host, one form endpoint). Each allowance is
//   listed in the PR that adds it, for Security.
// - Fails, naming the site's owner, on anything its CSP would block: a <style> block, a style attribute, an inline
//   event handler, a javascript: URL, a script from another origin, a style sheet, font, image, frame or form target
//   on a host the site doesn't allow. Nothing in a site's repo is ever edited here: fix it there, or allow it here.
// - Writes the routes into out/staticwebapp.config.json (replacing that site's earlier ones) and keeps the file under
//   Static Web Apps' 20 KB limit. /<name> redirects to /<name>/ (trailingSlash "auto"); a rewrite would break the
//   pages' relative URLs.
// Usage: node scripts/sites.mjs <name> <src>   (CI: each <src> is the repo at the sha in the repo variable PROJECT_REFS)
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, rmSync, cpSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const OUT = "out";
const CONFIG = join(OUT, "staticwebapp.config.json");
const GOOGLE_FONTS = { styleHosts: ["https://fonts.googleapis.com"], fontHosts: ["https://fonts.gstatic.com"] };

// One entry per site. `allow` is what the site's own markup needs beyond the strict policy; leave it out for none.
//   styleBlocks: "hash"            <style> blocks allowed by their sha256 in style-src
//   styleAttrs: "inline"           style attributes ('unsafe-inline' in style-src-attr only; scripts stay hash-only)
//   styleHosts, fontHosts          extra style-src / font-src sources
//   connect                        extra connect-src sources (exact URLs)
export const SITES = {
  should: {
    repo: "rodmjay/should", owner: "Product Manager", label: "the Should page",
    required: ["index.html", "demo/404.html"],
    // The gitignored demo-local/, and the root 404.html: GitHub Pages' SPA redirect, which this site never serves (its
    // 404 is the site's own, and /should/demo/* deep links get the demo shell from the routes below).
    skip: (p, src) => basename(p) === "demo-local" || p === join(src, "404.html"),
    routes: shouldRoutes,
  },
  altura: {
    repo: "rodmjay/altura", owner: "Product Manager", label: "Altura",
    // Google Fonts (Fraunces, Inter) and the sign-up form, which posts to its Google Form (no-cors fetch).
    allow: { ...GOOGLE_FONTS, connect: ["https://docs.google.com/forms/d/1fXPf_z4kVkfukXg2xg78lBzH7sfH8WV1RGz1lqXXSQc/formResponse"] },
  },
  "agentic-squared": { repo: "rodmjay/agentic-squared", owner: "Business Executive", label: "Agentic Squared" },
  "agency-squared": {
    repo: "rodmjay/agency-squared", owner: "Software Architect", label: "AgencyPro (Agency Squared)",
    // A Next.js static export, built the way its own Pages workflow builds it.
    build: { env: { PAGES_BASE_PATH: "/agency-squared" }, out: "out" },
    // Material Symbols from Google Fonts. Style attributes: React writes static ones into the exported HTML (chart
    // colors, elevation, icon size), and Material Web's compiled Lit templates write more at run time, which no
    // build-time hash can name (tried: 'unsafe-hashes' with the HTML's hashes still blocked the Lit ones).
    allow: { ...GOOGLE_FONTS, styleAttrs: "inline" },
  },
  moodboard: {
    repo: "rodmjay/moodboard", owner: "Designer", label: "the mood board",
    // One <style> block (by hash), and style attributes the page's script writes from boards.js (swatch and icon
    // colors), which no hash can name ahead of time.
    allow: { styleBlocks: "hash", styleAttrs: "inline" },
  },
};

const sha = (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;
const hostOf = (u) => { try { return new URL(u.startsWith("//") ? `https:${u}` : u).origin; } catch { return u; } };
const external = (u) => /^(https?:)?\/\//i.test(u);
function files(dir, ext) {
  const found = [];
  (function list(d) {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) list(p); else if (name.endsWith(ext)) found.push(p);
    }
  })(dir);
  return found;
}

export function addSite(name, src) {
  const site = SITES[name];
  if (!site) { console.error(`sites: unknown site ${name} (known: ${Object.keys(SITES).join(", ")})`); process.exit(1); }
  const DEST = join(OUT, name);
  const allow = site.allow || {};

  if (src) {
    let from = src;
    if (site.build) {
      const env = { ...process.env, ...site.build.env, NEXT_TELEMETRY_DISABLED: "1" };
      const run = (...args) => execFileSync("npm", args, { cwd: resolve(src), env, stdio: ["ignore", "inherit", "inherit"] });
      run("ci", "--ignore-scripts", "--no-audit", "--no-fund");
      run("run", "build");
      from = join(src, site.build.out);
    }
    for (const f of site.required || ["index.html"]) {
      if (!existsSync(join(from, f))) { console.error(`${name}: ${from} has no ${f}`); process.exit(1); }
    }
    rmSync(DEST, { recursive: true, force: true });
    cpSync(from, DEST, { recursive: true, filter: (p) =>
      !basename(p).startsWith(".") && basename(p) !== "node_modules" && !(site.skip && site.skip(p, from)) });
  }

  const bad = [];
  const scriptHashes = new Set(), styleHashes = new Set();
  let inline = 0;
  const htmlFiles = files(DEST, ".html");
  const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  const isJs = (attrs) => !/\stype=["']?(?!(text|application)\/javascript|module)/i.test(attrs);
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8"), rel = file.slice(OUT.length);
    for (const [, attrs, code] of html.matchAll(SCRIPT)) {
      const src = attrs.match(/\ssrc\s*=\s*["']?([^"'\s>]+)/i)?.[1];
      if (src) {
        if (external(src)) bad.push(`${rel}: script from another origin (script-src is 'self'): ${src}`);
        continue;
      }
      if (!isJs(attrs) || !code) continue;
      scriptHashes.add(sha(code));
      inline++;
    }
    for (const [, css] of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      if (allow.styleBlocks === "hash") styleHashes.add(sha(css));
    }
    if (allow.styleBlocks !== "hash" && /<style[\s>]/i.test(html)) bad.push(`${rel}: <style> block (style-src is 'self': move it into a .css file)`);
    for (const tag of html.match(/<[a-zA-Z][^>]*>/g) || []) {
      if (/\sstyle\s*=/i.test(tag) && allow.styleAttrs !== "inline") bad.push(`${rel}: style attribute (style-src-attr 'none': use a class) in ${tag.slice(0, 80)}`);
      if (/\son[a-z]+\s*=/i.test(tag)) bad.push(`${rel}: inline event handler (no CSP hash allows it) in ${tag.slice(0, 80)}`);
      if (/(href|src|action)\s*=\s*["']?\s*javascript:/i.test(tag)) bad.push(`${rel}: javascript: URL in ${tag.slice(0, 80)}`);
      if (name === "should") continue; // its checks stay exactly as they were (it has none of the below)
      const url = (a) => tag.match(new RegExp(`\\s${a}\\s*=\\s*["']?([^"'\\s>]+)`, "i"))?.[1];
      const tagName = tag.match(/^<([a-zA-Z0-9-]+)/)[1].toLowerCase();
      if (tagName === "link") {
        const relAttr = (tag.match(/\srel\s*=\s*["']?([^"'>]+)/i)?.[1] || "").toLowerCase(), as = (url("as") || "").toLowerCase();
        const href = url("href");
        if (href && external(href) && (/\bstylesheet\b/.test(relAttr) || as === "style") && !(allow.styleHosts || []).includes(hostOf(href)))
          bad.push(`${rel}: style sheet from another origin (style-src): ${href.slice(0, 80)}`);
        if (href && external(href) && as === "font" && !(allow.fontHosts || []).includes(hostOf(href)))
          bad.push(`${rel}: font from another origin (font-src): ${href.slice(0, 80)}`);
      } else if (["img", "source", "video", "audio", "iframe", "embed", "object", "frame"].includes(tagName)) {
        for (const a of ["src", "srcset", "data", "poster"]) {
          const u = url(a);
          if (u && external(u)) bad.push(`${rel}: <${tagName}> from another origin (the CSP allows only this site): ${u.slice(0, 80)}`);
        }
      } else if (tagName === "form") {
        const u = url("action");
        if (u && external(u)) bad.push(`${rel}: form posts to another origin (form-action 'self'): ${u.slice(0, 80)}`);
      }
    }
  }
  if (name !== "should") {
    // Style sheets: @import and url() on other hosts (font-src / style-src / img-src).
    for (const file of files(DEST, ".css")) {
      const css = readFileSync(file, "utf8"), rel = file.slice(OUT.length);
      for (const [, u] of css.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/gi))
        if (external(u) && !(allow.styleHosts || []).includes(hostOf(u))) bad.push(`${rel}: @import from another origin: ${u}`);
      for (const [, u] of css.matchAll(/url\(\s*["']?([^"')\s]+)/gi))
        if (external(u) && !(allow.fontHosts || []).includes(hostOf(u))) bad.push(`${rel}: url() on another origin: ${u}`);
    }
  }

  const sorted = (set) => [...set].sort();
  const CSP = [
    "default-src 'self'",
    ["script-src 'self'", ...sorted(scriptHashes)].join(" "),
    ["style-src 'self'", ...(allow.styleHosts || []), ...sorted(styleHashes)].join(" "),
    `style-src-attr ${allow.styleAttrs === "inline" ? "'unsafe-inline'" : "'none'"}`,
    "img-src 'self' data:",
    ["font-src 'self'", ...(allow.fontHosts || [])].join(" "),
    ["connect-src 'self'", ...(allow.connect || [])].join(" "),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = { "Content-Security-Policy": CSP };
  const { routes, mimeTypes = {}, checks = [], notes = [] } = site.routes
    ? site.routes({ dest: DEST, csp: CSP, headers })
    : { routes: [{ route: `/${name}/*`, headers }] };

  const swa = JSON.parse(readFileSync(CONFIG, "utf8"));
  swa.routes = [...(swa.routes || []).filter((r) => r.route !== `/${name}` && !r.route.startsWith(`/${name}/`)), ...routes];
  swa.mimeTypes = { ...swa.mimeTypes, ...mimeTypes };
  const json = `${JSON.stringify(swa, null, 2)}\n`;
  // Static Web Apps refuses a configuration file over 20 KB.
  if (Buffer.byteLength(json) > 20_000) bad.push(`staticwebapp.config.json is ${Buffer.byteLength(json)} bytes (limit 20 KB)`);
  if (/unsafe-/.test(CSP.match(/script-src([^;]*)/)[1])) bad.push(`the /${name}/ CSP allows inline or eval scripts`);
  if (!site.allow && /unsafe-/.test(CSP)) bad.push(`the /${name}/ CSP allows inline or eval code`);
  bad.push(...checks);
  // An allowance nothing uses any more should go (it's reported, not fatal: the site may only have dropped it today).
  if (allow.styleBlocks === "hash" && !styleHashes.size) notes.push(`${name}: no <style> block left: drop allow.styleBlocks in scripts/sites.mjs`);

  if (bad.length) {
    console.error(`${name}: ${site.label} (repo ${site.repo}, owner ${site.owner}) has what its CSP blocks; fix it there:\n${[...new Set(bad)].join("\n")}`);
    process.exit(1);
  }
  writeFileSync(CONFIG, json);
  for (const n of notes) console.log(n);
  console.log(`${name}: out/${name}/ has ${htmlFiles.length} page(s), ${inline} inline script(s) allowed by ${scriptHashes.size} hash(es)` +
    `, ${routes.length} route(s); config ${Buffer.byteLength(json)} bytes`);
}

// The Should page's routes:
//   /should/demo/<each real top-level file or folder>   the demo CSP, served as is (routes stop at the first match)
//   /should/demo/*                                      anything else is a demo deep link: the SPA shell (404.html)
//   /should/*                                           the CSP
function shouldRoutes({ dest, csp, headers }) {
  // The demo exception (11/23): the demo's compiled Svelte bundle (demo/_app) still writes style attributes at run time
  // (static style="" in component templates, the design system's chart and project markup, SvelteKit's route
  // announcer), which style-src-attr 'none' blocks. Until Product Manager rebuilds it without them, /should/demo/*
  // keeps inline styles; its scripts are as strict as the rest ('self' plus hashes). The build says when it can go.
  const DEMO = join(dest, "demo");
  const demoStyleAttrs = (function count(dir) {
    let n = 0;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) n += count(p); else if (name.endsWith(".js")) n += (readFileSync(p, "utf8").match(/\sstyle=\\?["`$]/g) || []).length;
    }
    return n;
  })(join(DEMO, "_app"));
  const demoHeaders = { "Content-Security-Policy": csp.replace("style-src 'self'; style-src-attr 'none'", "style-src 'self' 'unsafe-inline'") };
  const real = readdirSync(DEMO).sort().map((name) =>
    ({ route: `/should/demo/${name}${statSync(join(DEMO, name)).isDirectory() ? "/*" : ""}`, headers: demoHeaders }));
  return {
    routes: [
      { route: "/should/demo/", headers: demoHeaders },
      ...real,
      { route: "/should/demo/*", rewrite: "/should/demo/404.html", headers: demoHeaders },
      { route: "/should/*", headers },
    ],
    // Types the page serves that the site's own config doesn't name (the e-books, the demo's body model).
    mimeTypes: { ".epub": "application/epub+zip", ".bin": "application/octet-stream" },
    checks: /unsafe-/.test(demoHeaders["Content-Security-Policy"].match(/script-src([^;]*)/)[1]) ? ["the /should/demo/ CSP allows inline or eval scripts"] : [],
    notes: [demoStyleAttrs
      ? `should: the demo's compiled JS still writes ${demoStyleAttrs} style attribute(s) (owner Product Manager), so /should/demo/* keeps style-src 'unsafe-inline'`
      : "should: the demo's compiled JS writes no style attributes: drop the demo exception in scripts/sites.mjs"],
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [name, src] = process.argv.slice(2);
  if (!name || !src) { console.error("usage: node scripts/sites.mjs <name> <src>"); process.exit(1); }
  addSite(name, src);
}
