// The schema check for public product data in data/ (ADR 0005, Security 11/27 condition 2c). It runs in CI on every PR
// and push, before the build. Health Agent's export runs the same rules before it commits (fail-closed); this is the
// second layer. A file with an unknown field, a missing required field, or text that fails the checks fails the run.
// A new field needs Security's pass and an edit to ALLOWED in the same PR.
import { existsSync, readFileSync } from "node:fs";

const problems = [];
const bad = (where, why) => problems.push(`${where}: ${why}`);
// Text checks: no markup, no email-like @, nothing phone-like, no http links (https only).
const PHONE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
function text(where, v) {
  if (typeof v !== "string") return bad(where, "is not text");
  if (/[<>]/.test(v)) bad(where, "has < or >");
  if (v.includes("@")) bad(where, "has @");
  if (PHONE.test(v)) bad(where, "looks like a phone number");
  if (/\bhttp:\/\//i.test(v)) bad(where, "has an http:// link");
}
const texts = (where, v) => (Array.isArray(v) ? v.forEach((x, i) => text(`${where}[${i}]`, x)) : bad(where, "is not a list"));

// data/recipes/recipes.json (Health Agent's public_rows.py --export-site).
const RECIPE = {
  required: { slug: "slug", lang: "lang", title: "text", ingredients: "texts", steps: "texts", image: "text", image_alt: "text", image_license: "text" },
  optional: { dek: "text", servings: "text", minutes: "minutes", tags: "texts", facets: "facets", updated_at: "date",
    from_credit: "text", tip: "text", serve_with: "text", pairs_with: "text" },
};
function recipes() {
  const path = "data/recipes/recipes.json";
  if (!existsSync(path)) return 0;
  let body;
  try { body = JSON.parse(readFileSync(path, "utf8")); } catch (e) { bad(path, `isn't JSON: ${e.message}`); return 0; }
  if (body?.version !== 1 || !Array.isArray(body.rows)) { bad(path, "isn't {version: 1, generated_at, rows: []}"); return 0; }
  for (const k of Object.keys(body)) if (!["version", "generated_at", "rows"].includes(k)) bad(path, `unknown top-level field ${k}`);
  const seen = new Set();
  body.rows.forEach((r, i) => {
    const at = `${path} rows[${i}] ${r?.slug || ""}/${r?.lang || ""}`;
    if (!r || typeof r !== "object") return bad(at, "is not an object");
    for (const k of Object.keys(r)) if (!(k in RECIPE.required) && !(k in RECIPE.optional)) bad(at, `unknown field ${k}`);
    for (const k of Object.keys(RECIPE.required)) if (r[k] == null || r[k] === "" || (Array.isArray(r[k]) && !r[k].length)) bad(at, `missing ${k}`);
    for (const [k, kind] of Object.entries({ ...RECIPE.required, ...RECIPE.optional })) {
      const v = r[k];
      if (v == null || v === "") continue;
      if (kind === "slug" && !/^[a-z0-9][a-z0-9-]{0,80}$/.test(v)) bad(at, `bad slug`);
      else if (kind === "lang" && !["en", "es"].includes(v)) bad(at, `bad lang`);
      else if (kind === "text") text(`${at} ${k}`, v);
      else if (kind === "texts") texts(`${at} ${k}`, v);
      else if (kind === "minutes" && !(Number.isInteger(v) && v > 0 && v < 10000)) bad(at, "bad minutes");
      else if (kind === "date" && Number.isNaN(Date.parse(v))) bad(at, "bad updated_at");
      else if (kind === "facets") {
        if (!Array.isArray(v)) bad(at, "facets is not a list");
        else v.forEach((f, j) => {
          for (const fk of Object.keys(f || {})) if (!["group", "key", "tag", "label", "sort"].includes(fk)) bad(`${at} facets[${j}]`, `unknown field ${fk}`);
          if (!/^[a-z]+$/.test(f?.group || "") || !/^[a-z0-9-]+$/.test(f?.key || "") || f?.tag !== `${f?.group}:${f?.key}`) bad(`${at} facets[${j}]`, "bad group, key or tag");
          text(`${at} facets[${j}] label`, f?.label);
        });
      }
    }
    const key = `${r.slug}/${r.lang}`;
    if (seen.has(key)) bad(at, "appears twice");
    seen.add(key);
  });
  // Every recipe in both languages.
  for (const k of seen) { const [slug, lang] = k.split("/"); if (!seen.has(`${slug}/${lang === "en" ? "es" : "en"}`)) bad(path, `${slug} has no ${lang === "en" ? "es" : "en"} row`); }
  return body.rows.length;
}

const n = recipes();
if (problems.length) { console.error(`data/ check failed (${problems.length}):\n  ${problems.slice(0, 50).join("\n  ")}`); process.exit(1); }
console.log(`data/ check: recipes.json ${n} rows ok`);
