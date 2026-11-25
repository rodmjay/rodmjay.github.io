// The RVP test's content, for both server pages and the browser: the question bank (bank.json, Philosopher's and Rod's
// to edit; never in code) and the 27 archetypes (archetypes.json, from Rod's RVP PDFs). Self-contained under src/rvp so
// the module can move when Designer settles the site's new layout (Philosopher 11/25).
import bankJson from "./bank.json";
import archetypesJson from "./archetypes.json";
import { validateBank, type Bank, type Dim } from "./engine";

export type Lang = "en" | "es";
export type Text = { en: string; es: string };
export type Archetype = { n: number; slug: string; key: string; name: Text; role: Text; examples: Text; strengths: Text; shadow: Text };

export const BANK = bankJson as unknown as Bank;
// Every published bank version stays here so an old result link still reads (add the frozen file when the version moves).
export const BANKS: Record<string, Bank> = { [BANK.version]: BANK };
const bad = Object.values(BANKS).flatMap(validateBank);
if (bad.length) throw new Error(`RVP bank: ${bad.join("; ")}`);

export const ARCHETYPES = archetypesJson.archetypes as Archetype[];
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
