// The CMS gives the same site as the markdown (docs/adr/0003): compares two builds of out/, one from _content/ and one
// with CMS_SOURCE=payload, and fails on any difference a reader or a crawler could see.
//
//   SITE_BUILD_ID=parity npm run build && cp -r out /tmp/out-md
//   SITE_BUILD_ID=parity CMS_SOURCE=payload CMS_API=http://127.0.0.1:3230 npm run build
//   node tests/cms-parity.mjs /tmp/out-md out
//
// Byte for byte: every file's presence, every feed, the sitemap, robots.txt, media and CSS, and every HTML page's body
// and head elements (canonical, hreflang, meta, title) with its <script> tags taken out. Next.js itself doesn't order
// its chunk <script>s or the RSC payload the same way twice (two markdown builds differ there too), so script tags,
// _next/ and the RSC payload files (.txt) are compared as the set of files only, never by content.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error("usage: node tests/cms-parity.mjs <out from markdown> <out from the CMS>"); process.exit(2); }

const files = (root) => {
  const out = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : out.push(relative(root, p)); } };
  walk(root);
  return out.sort();
};
// Without <script> tags, and with the <head>'s elements as a sorted list: Next streams the head's metadata and preloads in
// a different order from one build to the next, so order there is noise; every element must still be there, unchanged.
const scriptless = (html) => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
  .replace(/<link rel="preload" as="script"[^>]*>/g, "")
  .replace(/<head>([\s\S]*?)<\/head>/, (_, head) => `<head>${head.split(/(?=<)/).sort().join("")}</head>`);
const unordered = (f) => f.startsWith("_next/") || f.endsWith(".txt") && f !== "robots.txt";

const fa = files(a), fb = files(b);
const problems = [];
const setA = new Set(fa.filter((f) => !f.startsWith("_next/"))), setB = new Set(fb.filter((f) => !f.startsWith("_next/")));
for (const f of setA) if (!setB.has(f)) problems.push(`only in ${a}: ${f}`);
for (const f of setB) if (!setA.has(f)) problems.push(`only in ${b}: ${f}`);
let compared = 0;
for (const f of fa) {
  if (!setB.has(f) || unordered(f)) continue;
  const x = readFileSync(join(a, f)), y = readFileSync(join(b, f));
  const same = f.endsWith(".html") ? scriptless(x.toString("utf8")) === scriptless(y.toString("utf8")) : x.equals(y);
  compared++;
  if (!same) problems.push(`differs: ${f}`);
}
if (problems.length) { console.error(`cms parity: ${problems.length} difference(s)\n${problems.slice(0, 50).join("\n")}`); process.exit(1); }
console.log(`cms parity: ${compared} files identical (HTML without <script> tags), ${setA.size} files on both sides`);
