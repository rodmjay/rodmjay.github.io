// Site-wide constants, the EN/ES dictionaries and the build checks every page shares. Runs at build time only.
// The build fails on: a key missing in either language, a design system copy that isn't the pinned version, or a
// recipe/blog rule (their own modules).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { compareDicts } from "../../public/ds/i18n.js";
import { DS_VERSION } from "./ds-version.mjs";

export const ROOT = process.cwd();
export const SITE = "https://rodmjay.com";
export const LANGS = ["en", "es"];
export const HTML_LANG = { en: "en", es: "es-419" };
export const NAMES = { en: "English", es: "Español" };
export const HOME = { en: "/", es: "/es/" };
// Where privacy requests go (Compliance 11/21: an inbox someone reads).
export const PRIVACY_EMAIL = process.env.PRIVACY_EMAIL || "admin@squared.pro"; // EA reads it (EA 11/21)
export const PRIVACY_SUBJECT = "Privacy request – rodmjay.com";
// The privacy page's hosting line names GitHub until cutover. PRIVACY_HOSTING=azure (with PRIVACY_UPDATED=YYYY-MM-DD)
// swaps in privacy.azure (Microsoft, Azure Static Web Apps): set both in the workflow only after Compliance approves the
// exact words (docs/adr/0002, cutover).
export const PRIVACY_HOSTING = process.env.PRIVACY_HOSTING === "azure" ? "azure" : "github";
export const PRIVACY_UPDATED = process.env.PRIVACY_UPDATED || "";
if (PRIVACY_HOSTING === "azure" && !/^\d{4}-\d{2}-\d{2}$/.test(PRIVACY_UPDATED)) throw new Error("PRIVACY_HOSTING=azure needs PRIVACY_UPDATED=YYYY-MM-DD");
// The Recipes nav item waits for RECIPES_LIVE=1; the sample state (chip, noindex, no sitemap) comes off with RECIPES_APPROVED=1.
export const RECIPES_LIVE = process.env.RECIPES_LIVE === "1";
export const RECIPES_APPROVED = process.env.RECIPES_APPROVED === "1";

export const read = (p) => readFileSync(join(ROOT, p), "utf8");

const dicts = { en: JSON.parse(read("i18n/en.json")), es: JSON.parse(read("i18n/es.json")) };
const problems = compareDicts(dicts.en, dicts.es);
if (problems.length) throw new Error(`i18n: the EN and ES dictionaries differ:\n${problems.join("\n")}`);
const shipped = read("public/ds/VERSION").trim();
if (shipped !== DS_VERSION) throw new Error(`design system: public/ds is ${shipped}, the site pins ${DS_VERSION}. Run scripts/sync-design-system.sh ${DS_VERSION}.`);

export const dict = (lang) => dicts[lang];
export const otherLang = (lang) => (lang === "en" ? "es" : "en");

// A missing key is a build error, never a blank or a key on the page.
export function t(lang, path, vars) {
  const v = path.split(".").reduce((o, k) => (o == null ? o : o[k]), dicts[lang]);
  if (v == null) throw new Error(`i18n: missing "${path}" in ${lang}`);
  return typeof v === "string" && vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v;
}

// Cache-busting, as before: a short hash of each asset, appended to its link.
const hash = (p) => createHash("sha256").update(readFileSync(join(ROOT, "public", p))).digest("hex").slice(0, 8);
export const asset = (p) => `/${p}?v=${hash(p)}`;
