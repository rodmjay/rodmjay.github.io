// Recipes, read once at build time (never in the browser) from the public-recipes Edge Function (RECIPES_API, GET,
// ?lang=en|es; Database Administrator 11/23). Locally, when it's unset or returns [], the build uses the sample set in
// _content/recipes/sample.json; in CI an empty answer fails the build (no sample data in production). Designer's spec: ~/dev/personal/design/specs/rodmjay-recipes.md.
//
// Row: {slug, lang, title, dek, image, image_alt, servings, minutes|null, tags[], ingredients[], steps[], updated_at,
//       from_credit, tip, serve_with, pairs_with, sources[]}. Ingredient lines starting "## " are group labels.
// The build fails when: a recipe lacks its other language, a required field is empty, the Spanish isn't "usted", a
// recipe mentions alcohol, coffee or tea, or a private section ("For Rod") slips in. With RECIPES_APPROVED=1 it also
// fails on any "[ES TODO" placeholder. Photos are the site's own copies (public/recipes/images/<slug>-<w>.webp|jpg).
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, LANGS, read, RECIPES_APPROVED } from "./site.mjs";
import { checkUsted, slugify, words } from "./usted.mjs";
import { imgDims } from "./blog.mjs";

export const PER_PAGE = 12;
export const BASE = { en: "/recipes/", es: "/es/recipes/" };
const API = process.env.RECIPES_API || "";
// public-recipes v1 counts every number in prep and cook ("1 hour at 350°F" reads as 410 min); v2 counts only numbers
// with a time unit. Until v2 is live, no time is shown rather than a wrong one: set RECIPES_TRUST_MINUTES=1 after.
const TRUST_MINUTES = process.env.RECIPES_TRUST_MINUTES === "1" || !API;

// Family is LDS: nothing with alcohol, coffee or tea in a recipe or tag (Designer's spec, Rod 11/20).
const BANNED = new Set(("wine wines beer beers ale lager rum vodka tequila mezcal whiskey whisky bourbon brandy gin liqueur sake " +
  "champagne prosecco cocktail cocktails margarita margaritas sangria mimosa coffee espresso latte cappuccino mocha tea teas " +
  "matcha chai kombucha vino vinos cerveza cervezas ron licor licores aguardiente guaro café cafés té tés").split(" "));
// Whole phrases taken out before the banned-word check: alcohol-free things named with a banned word.
const SOFT_DRINKS = /\b(?:ginger\s+ale|hot\s+buttered\s+rum\s+(?:mix|batter))\b/gi;
const PRIVATE = /\b(for rod|para rod)\b|\b(kcal|calories|calorías|protein target|meta de proteína)\b/i;

async function fetchRows() {
  if (!API) return { rows: [], from: "fixture (RECIPES_API unset)" };
  const rows = [];
  for (const lang of LANGS) {
    const url = `${API}${API.includes("?") ? "&" : "?"}lang=${lang}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`recipes: ${url} answered ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body)) throw new Error(`recipes: ${url} didn't return a list`);
    rows.push(...body.filter((r) => r && r.lang === lang));
  }
  return { rows, from: API };
}

// The site's own copies of a photo: <slug>-<w>.webp at each width, and <slug>-<w>.jpg as the fallback.
function photo(slug) {
  const dir = join(ROOT, "public/recipes/images");
  if (!existsSync(dir)) return null;
  const mine = readdirSync(dir).filter((f) => f.startsWith(`${slug}-`) && /^\d+\.(webp|jpg)$/.test(f.slice(slug.length + 1)));
  const webp = mine.filter((f) => f.endsWith(".webp")).map((f) => ({ src: `/recipes/images/${f}`, w: Number(f.slice(slug.length + 1, -5)) })).sort((a, b) => a.w - b.w);
  const jpg = mine.filter((f) => f.endsWith(".jpg")).map((f) => `/recipes/images/${f}`)[0];
  if (!webp.length || !jpg) return null;
  const dims = imgDims(jpg);
  return dims ? { srcset: webp.map((x) => `${x.src} ${x.w}w`).join(", "), jpg, ...dims } : null;
}

const str = (v) => (v == null ? "" : String(v).trim());
const list = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

async function build() {
  const errors = [];
  const fail = (m) => errors.push(m);
  let { rows, from } = await fetchRows();
  // Production never shows sample data (Rod 11/23): a deploy build (CI) that reaches the API and gets nothing fails,
  // so a broken or empty function can't quietly put the fixture on the live site. Local builds still use the fixture.
  if (API && rows.length === 0 && process.env.CI) throw new Error(`recipes: ${API} returned no published recipes; refusing to deploy the sample set`);
  const sampleData = rows.length === 0;
  const fixture = JSON.parse(read("_content/recipes/sample.json"));
  if (sampleData) { rows = fixture; from = API ? "fixture (RECIPES_API returned [])" : from; }
  // Our own alt text, written per photo and language; the function's image_alt is just the title.
  const ownAlt = new Map(fixture.map((r) => [`${r.slug}/${r.lang}`, r.image_alt]));

  const recipes = [];
  for (const r of rows) {
    const where = `recipe ${r?.slug}/${r?.lang}`;
    const rec = {
      slug: str(r.slug), lang: str(r.lang), title: str(r.title), dek: str(r.dek), imageAlt: str(r.image_alt),
      servings: r.servings == null ? null : str(r.servings), minutes: TRUST_MINUTES && Number.isFinite(Number(r.minutes)) && r.minutes != null ? Number(r.minutes) : null,
      tags: list(r.tags), ingredients: list(r.ingredients), steps: list(r.steps), updatedAt: str(r.updated_at),
      credit: str(r.from_credit), tip: str(r.tip), serveWith: str(r.serve_with), pairsWith: str(r.pairs_with),
      sources: (Array.isArray(r.sources) ? r.sources : []).map((s) => (typeof s === "string" ? { title: s.trim(), url: "" }
        : { title: str(s?.title ?? s?.name), url: /^https:\/\//.test(str(s?.url)) ? str(s.url) : "" })).filter((s) => s.title),
    };
    if (!LANGS.includes(rec.lang)) { fail(`${where}: lang must be en or es`); continue; }
    if (!rec.slug || rec.slug !== slugify(rec.slug)) fail(`${where}: the slug must be a plain slug (a-z, 0-9, -)`);
    for (const k of ["title", "dek"]) if (!rec[k]) fail(`${where}: needs a ${k}`);
    if (!rec.ingredients.length) fail(`${where}: needs ingredients`);
    if (!rec.steps.length) fail(`${where}: needs steps`);
    const text = [rec.title, rec.dek, rec.imageAlt, rec.tip, rec.serveWith, rec.pairsWith, rec.credit, ...rec.tags, ...rec.ingredients, ...rec.steps].join("\n");
    // Alcohol-free things whose names hold a banned word are fine (EA 11/26: ginger ale, and the hot buttered rum mix).
    for (const w of words(text.replace(SOFT_DRINKS, " "))) if (BANNED.has(w)) fail(`${where}: "${w}" (no alcohol, coffee or tea on the site)`);
    if (PRIVATE.test(text)) fail(`${where}: a private section or health number (dishes only)`);
    if (rec.lang === "es") checkUsted(text, where, fail);
    if (RECIPES_APPROVED && /\[ES TODO/i.test(text)) fail(`${where}: a Spanish placeholder is still there`);
    // Spanish quantities are metric first, then US in parentheses: "900 g (2 lb)", "360 ml (1½ tazas)", "200 °C (400 °F)"
    // (Designer). English stays US. Spoons (cda, cdta) stay as they are. A US-only amount warns now, fails once approved.
    if (rec.lang === "es") for (const line of [...rec.ingredients, ...rec.steps, rec.tip]) {
      if (!US_ONLY.test(line.replace(/\([^)]*\)/g, ""))) continue;
      if (RECIPES_APPROVED) fail(`${where}: "${line}" needs metric first, US in parentheses`);
      else console.warn(`recipes: ${where}: "${line}" needs metric first, US in parentheses`);
    }
    rec.url = `${BASE[rec.lang]}${rec.slug}/`;
    rec.photo = photo(rec.slug);
    // The function's image_alt is the title; our own alt text says what's in the dish, so it wins when we have it.
    if ((!rec.imageAlt || rec.imageAlt === rec.title) && ownAlt.get(`${rec.slug}/${rec.lang}`)) rec.imageAlt = ownAlt.get(`${rec.slug}/${rec.lang}`);
    if (rec.photo && !rec.imageAlt) fail(`${where}: the photo needs alt text`);
    rec.tagSlugs = rec.tags.map(slugify);
    recipes.push(rec);
  }
  const bySlug = new Map();
  for (const r of recipes) {
    const g = bySlug.get(r.slug) || {};
    if (g[r.lang]) fail(`recipe ${r.slug}/${r.lang}: listed twice`);
    g[r.lang] = r;
    bySlug.set(r.slug, g);
  }
  for (const [slug, g] of bySlug) for (const lang of LANGS) if (!g[lang]) fail(`recipe ${slug}: no ${lang === "en" ? "English" : "Spanish"} version (both languages or none)`);
  // Recipes publish continuously (Rod 11/26: "Just publish them as you go"), so one recipe that fails a check is left off
  // the site, in both languages, instead of stopping every deploy. The checks are unchanged: nothing that fails one is shown.
  // The skipped list goes to the build log and the run summary for Health Agent. A failure not tied to a recipe still stops
  // the build, and so does a deploy build that would be left with no recipes at all.
  const bad = new Set(), loose = [];
  for (const m of errors) { const slug = /^recipe ([^/:\s]+)/.exec(m)?.[1]; if (slug) bad.add(slug); else loose.push(m); }
  if (loose.length) throw new Error(`recipes:\n${loose.join("\n")}`);
  if (bad.size) {
    console.warn(`recipes: left off the site until fixed (${bad.size}):\n${errors.join("\n")}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      const { appendFileSync } = await import("node:fs");
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Recipes left off the site (${bad.size})\n\n${errors.map((e) => `- ${e}`).join("\n")}\n`);
    }
    for (let i = recipes.length - 1; i >= 0; i--) if (bad.has(recipes[i].slug)) recipes.splice(i, 1);
    for (const slug of bad) bySlug.delete(slug);
    if (!recipes.length && process.env.CI && !sampleData) throw new Error(`recipes: every recipe failed a check:\n${errors.join("\n")}`);
  }
  for (const r of recipes) r.twinUrl = bySlug.get(r.slug)[r.lang === "en" ? "es" : "en"].url;

  const newest = (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title);
  const byLang = Object.fromEntries(LANGS.map((l) => [l, recipes.filter((r) => r.lang === l).sort(newest)]));

  // List pages: the index and each tag, 12 to a page. Tag pages link across languages by position in the twin's tags.
  const tagName = (lang, slug) => byLang[lang].flatMap((r) => r.tags.map((t, i) => [r.tagSlugs[i], t])).find(([s]) => s === slug)?.[1];
  const lists = [];
  for (const lang of LANGS) {
    const other = lang === "en" ? "es" : "en";
    const add = (items, base, otherBase, tag) => {
      const total = Math.max(1, Math.ceil(items.length / PER_PAGE));
      for (let n = 1; n <= total; n++) lists.push({ lang, n, total, tag, base, items: items.slice((n - 1) * PER_PAGE, n * PER_PAGE),
        path: n === 1 ? base : `${base}page/${n}/`, otherPath: n === 1 ? otherBase : `${otherBase}page/${n}/` });
    };
    add(byLang[lang], BASE[lang], BASE[other], null);
    const slugs = [...new Set(byLang[lang].flatMap((r) => r.tagSlugs))].sort((a, b) => tagName(lang, a).localeCompare(tagName(lang, b), lang === "es" ? "es-419" : "en"));
    for (const s of slugs) {
      const items = byLang[lang].filter((r) => r.tagSlugs.includes(s));
      // The same tag in the other language: the twin of the first recipe here, at the same position.
      const first = items[0], twin = bySlug.get(first.slug)[other], i = first.tagSlugs.indexOf(s);
      const otherBase = twin.tagSlugs[i] ? `${BASE[other]}tag/${twin.tagSlugs[i]}/` : BASE[other];
      add(items, `${BASE[lang]}tag/${s}/`, otherBase, { slug: s, name: tagName(lang, s) });
    }
  }
  return { recipes, byLang, lists, sample: !RECIPES_APPROVED, sampleData, from, tagUrl: (lang, s) => `${BASE[lang]}tag/${s}/`,
    usedTags: (lang) => lists.filter((l) => l.lang === lang && l.tag && l.n === 1).map((l) => l.tag) };
}

// A US unit after a number (outside parentheses) in a Spanish line.
const US_ONLY = /(\d|[½¼¾⅓⅔⅛])\s*(?:lb|lbs|libras?|oz|onzas?|tazas?|°\s*F|pulg(?:adas?|\.)?|cuartos? de gal[oó]n|galones?)(?![a-záéíóú])/i;

let memo;
export const loadRecipes = () => (memo ||= build());

// Bold the amount at the start of an ingredient line ("2 lb", "1½ cups", "360 ml (1½ tazas)", "480 a 720 ml (2 a 3 tazas)").
const AMOUNT = /^((?:\d+|[½¼¾⅓⅔⅛])(?:[\d½¼¾⅓⅔⅛.,/]*)(?:\s*(?:–|-|a|to)\s*(?:\d+|[½¼¾⅓⅔⅛])[\d½¼¾⅓⅔⅛.,/]*)?(?:\s+(?:cups?|tbsp|tsp|lb|lbs|oz|g|kg|ml|l|cans?|cloves?|jars?|tazas?|cdas?|cdtas?|latas?|dientes?|frascos?|lb de)(?:\s+\((?:\d|[½¼¾⅓⅔⅛])[^)]*\))?)?)(\s|$)/i;
export function splitAmount(line) {
  const m = line.match(AMOUNT);
  return m ? { amount: m[1], rest: line.slice(m[1].length) } : { amount: "", rest: line };
}
