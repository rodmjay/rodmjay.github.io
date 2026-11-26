// The RVP test's content, for both server pages and the browser: the question bank (bank.json, Philosopher's and Rod's
// to edit; never in code) and the 27 archetypes (archetypes.json, from Rod's RVP PDFs). Self-contained under src/rvp so
// the module can move when Designer settles the site's new layout (Philosopher 11/25).
import bankJson from "./bank.json";
import archetypesJson from "./archetypes.json";
import contentJson from "./content.json";
import { validateBank, DIMENSIONS, type Bank, type Dim } from "./engine";
import { validateContent, type Content } from "./content";

export type Lang = "en" | "es";
export type Text = { en: string; es: string };
export type Archetype = { n: number; slug: string; key: string; name: Text; role: Text; examples: Text; strengths: Text; shadow: Text };

export const BANK = bankJson as unknown as Bank;
// Every published bank version stays here so an old result link still reads (add the frozen file when the version moves).
export const BANKS: Record<string, Bank> = { [BANK.version]: BANK };
/** sessionStorage key: the finished test's #fragment, handed from RvpTake to RvpResult once (survives a mid-test deploy). */
export const RESULT_HANDOFF = "rvp:result";
const bad = Object.values(BANKS).flatMap(validateBank);
if (bad.length) throw new Error(`RVP bank: ${bad.join("; ")}`);

export const ARCHETYPES = archetypesJson.archetypes as Archetype[];

// Philosopher's "make it useful" content (scripts/rvp-sync.mjs copies it in). Checked at build: a bad file fails it.
export const CONTENT = contentJson as unknown as Content;
const FACET_KEYS = DIMENSIONS.flatMap((d) => BANK.dimensions[d].map((f) => `${d}.${f}`));
const badContent = validateContent(CONTENT, FACET_KEYS, ARCHETYPES.map((a) => a.slug));
if (badContent.length) throw new Error(`RVP content: ${badContent.join("; ")}`);
/** A text in the page's language; an empty Spanish falls back to English (staging only: going live needs it all). */
export const pick = (lang: Lang, t: Text) => (lang === "es" && !t.es.trim() ? { text: t.en, lang: "en" as const } : { text: t[lang], lang: undefined });
export const archetypeByKey = (key: string) => ARCHETYPES.find((a) => a.key === key) ?? null;
export const archetypeBySlug = (slug: string) => ARCHETYPES.find((a) => a.slug === slug) ?? null;

const FACETS = archetypesJson.facets as Record<Dim, Record<string, Text>>;
const DIMS = archetypesJson.dimensions as Record<Dim, Text>;
/** "V.Moral" → "Moral" / "Moral"; "P.Sustaining" → "Sustaining" / "Sostenedor". */
export const facetName = (lang: Lang, facet: string) => { const [d, f] = facet.split(".") as [Dim, string]; return FACETS[d]?.[f]?.[lang] ?? f; };
export const dimName = (lang: Lang, d: Dim) => DIMS[d][lang];

/** Spanish questions only when every question and option has them; until then the Spanish test points to English. */
export const bankHasSpanish = (b: Bank = BANK) => b.questions.every((q) => q.prompt_es?.trim() && q.options.every((o) => o.text_es?.trim()));

export const BASE: Record<Lang, string> = { en: "/rvp/", es: "/es/rvp/" };
export const rvpUrl = (lang: Lang, page: "" | "take" | "result" | string) => `${BASE[lang]}${page ? `${page}/` : ""}`;

/** Built only where RVP_ON=1 (staging, and pull-request builds): production waits for Rod's yes (DECISIONS 11/25).
 *  scripts/postbuild.mjs removes the pages from out/ otherwise, so production answers 404. */
export const RVP_ON = process.env.RVP_ON === "1";
