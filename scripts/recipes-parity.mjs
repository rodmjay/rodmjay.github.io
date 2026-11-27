// The ADR 0005 parity week: data/recipes/recipes.json (what the site now builds from) against the public-recipes Edge
// Function (what it built from before). Same rows and the same content, field by field; updated_at, facet order and the
// image bookkeeping fields are ignored. A report, never a failure: it writes one line to the job summary on every
// deploy, so a week of "0 differences" tells Database Administrator the function can be retired.
import { appendFileSync, existsSync, readFileSync } from "node:fs";

const API = process.env.RECIPES_API || "";
const out = (line) => { console.log(line); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`); };
if (!API || !existsSync("data/recipes/recipes.json")) { out("Recipes parity: skipped (no RECIPES_API or no data file)"); process.exit(0); }
try {
  const file = JSON.parse(readFileSync("data/recipes/recipes.json", "utf8")).rows;
  const api = [];
  for (const lang of ["en", "es"]) {
    const res = await fetch(`${API}?lang=${lang}`, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${lang} answered ${res.status}`);
    api.push(...(await res.json()));
  }
  const IGNORE = new Set(["updated_at", "image_license", "image_url", "image_sha256", "sources"]);
  const norm = (r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) if (!IGNORE.has(k)) o[k] = k === "facets" && Array.isArray(v) ? [...v].map((f) => JSON.stringify(f)).sort() : v;
    return JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
  };
  const key = (r) => `${r.slug}/${r.lang}`;
  const a = new Map(api.map((r) => [key(r), norm(r)])), f = new Map(file.map((r) => [key(r), norm(r)]));
  const onlyFile = [...f.keys()].filter((k) => !a.has(k)), onlyApi = [...a.keys()].filter((k) => !f.has(k));
  const differ = [...f.keys()].filter((k) => a.has(k) && a.get(k) !== f.get(k));
  const n = onlyFile.length + onlyApi.length + differ.length;
  out(`Recipes parity (ADR 0005): ${file.length} file rows, ${api.length} function rows, ${n} differences` +
    (n ? ` (only in file: ${onlyFile.slice(0, 5).join(", ") || "none"}; only in function: ${onlyApi.slice(0, 5).join(", ") || "none"}; content: ${differ.slice(0, 5).join(", ") || "none"})` : ""));
} catch (e) {
  out(`Recipes parity: couldn't compare (${e.message})`);
}
