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

// The personality test moved from /rvp/ to /personality-test/ and /es/test-de-personalidad/ (Rod 11/26), then the Spanish
// test took the English slug, /es/personality-test/ (PR Person and Designer 11/27, like /es/recipes/ and /es/slc/). Every old path
// has its own 301 to the same page at the new address (Static Web Apps can't carry a wildcard's tail), and where the
// test is built, each target exists.
const swa = JSON.parse(readFileSync("out/staticwebapp.config.json", "utf8"));
const archetypes = JSON.parse(readFileSync("src/rvp/archetypes.json", "utf8")).archetypes;
const moves = { "/rvp/": "/personality-test/", "/es/rvp/": "/es/personality-test/", "/es/test-de-personalidad/": "/es/personality-test/" };
const wrong = [];
for (const [from, to] of Object.entries(moves)) {
  for (const tail of ["", "take/", "result/", ...archetypes.map((a) => `${a.slug}/`)]) {
    const r = swa.routes.find((x) => x.route === from + tail);
    if (!r || r.redirect !== to + tail || r.statusCode !== 301) wrong.push(`${from + tail} must 301 to ${to + tail}`);
    if (process.env.RVP_ON === "1" && !existsSync(join("out", to + tail, "index.html"))) wrong.push(`${to + tail} is missing from out/`);
  }
  // Only the wildcard: Static Web Apps treats /rvp and /rvp/ as one route and refuses a deploy that lists both (11/26).
  for (const route of [`${from}*`]) {
    const r = swa.routes.find((x) => x.route === route);
    if (!r || r.redirect !== to || r.statusCode !== 301) wrong.push(`${route} must 301 to ${to}`);
  }
}
if (wrong.length) { console.error(`old RVP URLs:\n${wrong.join("\n")}`); process.exit(1); }
console.log(`old RVP URLs: all ${Object.keys(moves).length * (archetypes.length + 4)} redirect to the personality test`);
