// The "make it useful" content (Philosopher's, knowledge/philosophy/rvp-test/content; SCHEMA.md there): per archetype
// lean-on, watch-for, fit and a 7-day practice; a growth edge per facet; 9 notes on working with someone who differs on
// one facet. Pure: checked here so a malformed file fails the build, never a visitor's page. Archetypes without a file
// yet simply show fewer sections.
export type Text = { en: string; es: string };
export type ArchetypeContent = {
  slug: string; leanOn: Text[]; watchFor: { sign: Text; counter: Text };
  fit: { thrives: Text[]; strains: Text[] }; practice: Text[];
};
export type FacetContent = { edge: Text; practice: Text };
export type Difference = { wrong: Text; say: Text };
export type Content = { facets: Record<string, FacetContent>; differences: Record<string, Difference>; archetypes: Record<string, ArchetypeContent> };

const isText = (t: unknown): t is Text => !!t && typeof (t as Text).en === "string" && (t as Text).en.trim() !== "" && typeof (t as Text).es === "string";
const list = (xs: unknown, min: number, max: number) => Array.isArray(xs) && xs.length >= min && xs.length <= max && xs.every(isText);

export function validateContent(c: Content, facets: string[], slugs: string[]): string[] {
  const bad: string[] = [];
  for (const f of facets) {
    const x = c.facets?.[f];
    if (!x || !isText(x.edge) || !isText(x.practice)) bad.push(`facets.${f}: needs edge and practice`);
  }
  for (const k of Object.keys(c.facets ?? {})) if (!facets.includes(k)) bad.push(`facets.${k}: unknown facet`);
  const pairs = facets.flatMap((a, i) => facets.slice(i + 1).filter((b) => a.split(".")[0] === b.split(".")[0]).map((b) => [a, b]));
  for (const [a, b] of pairs) {
    const d = c.differences?.[`${a}|${b}`] ?? c.differences?.[`${b}|${a}`];
    if (!d || !isText(d.wrong) || !isText(d.say)) bad.push(`differences ${a}|${b}: needs wrong and say`);
  }
  for (const [slug, a] of Object.entries(c.archetypes ?? {})) {
    if (!slugs.includes(slug)) { bad.push(`archetypes.${slug}: unknown slug`); continue; }
    if (!list(a.leanOn, 2, 3)) bad.push(`${slug}.leanOn: 2 or 3 items`);
    if (!isText(a.watchFor?.sign) || !isText(a.watchFor?.counter)) bad.push(`${slug}.watchFor: sign and counter`);
    if (!list(a.fit?.thrives, 2, 4) || !list(a.fit?.strains, 2, 4)) bad.push(`${slug}.fit: thrives and strains, 2-4 each`);
    if (!list(a.practice, 7, 7)) bad.push(`${slug}.practice: exactly 7 days`);
  }
  return bad;
}

/** Every text still waiting for its Spanish (the build lists them; going live needs none). */
export function missingSpanish(c: Content): string[] {
  const out: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (isText(v)) { if (!v.es.trim()) out.push(path); return; }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk({ facets: c.facets, differences: c.differences, archetypes: c.archetypes }, "");
  return out;
}

/** The note for two facets of one dimension, whichever order the file names them in. */
export const differenceFor = (c: Content, a: string, b: string) => c.differences[`${a}|${b}`] ?? c.differences[`${b}|${a}`] ?? null;
