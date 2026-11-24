// Every URL the Pages site served still exists in out/: the sitemap's pages and every built page and feed
// (tests/fixtures/pages-*.txt|xml were taken from main before the port), plus the project sites GitHub Pages served
// under the custom domain (rodmjay.github.io/<name>/ still 301s here; scripts/sites.mjs copies them in).
// Run after `npm run build` and the copier.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const urls = new Set(readFileSync("tests/fixtures/pages-urls.txt", "utf8").split("\n").filter(Boolean));
const PROJECTS = ["/altura/", "/altura/es/", "/agentic-squared/", "/agentic-squared/es/", "/agency-squared/",
  "/agency-squared/es/", "/agency-squared/demo/", "/moodboard/"];
for (const u of PROJECTS) urls.add(u);
for (const m of readFileSync("tests/fixtures/pages-sitemap.xml", "utf8").matchAll(/<loc>https:\/\/rodmjay\.com([^<]*)<\/loc>/g)) urls.add(m[1]);
const missing = [...urls].filter((u) => !existsSync(join("out", u.endsWith("/") ? `${u}index.html` : u)));
if (missing.length) { console.error(`old URLs missing from out/:\n${missing.join("\n")}`); process.exit(1); }
console.log(`old URLs: all ${urls.size} exist in out/`);
