// The RVP archetype test's engine (knowledge/philosophy/rvp-test/SPEC.md and BUILD-PLAN.md in the personal workspace).
// Pure functions, no framework and no I/O: it scores whatever bank it is given, so the questions stay in bank.json
// (Rod and Philosopher edit them) and never in code. The pattern follows the Gnostic Codex engine: weighted options,
// each facet normalized by the most it could score, a primary and a secondary, a coherence reading, a version.
// Everything runs in the browser: answers never leave it (the result travels only in the URL fragment).

export const DIMENSIONS = ["R", "V", "P"] as const;
export type Dim = (typeof DIMENSIONS)[number];

export type Option = { text: string; text_es?: string; facet: string; weight: number; also?: { facet: string; weight: number }[] };
export type Question = { number: number; dimension: Dim | "mixed"; prompt: string; prompt_es?: string; options: Option[] };
export type Bank = { version: string; dimensions: Record<Dim, string[]>; questions: Question[]; order?: number[] };

/** One answer per question: the index of the chosen option in the bank (not the screen position). */
export type Answers = Record<number, number>;

export type Coherence = "clear" | "leaning" | "blended";
export type DimResult = {
  dim: Dim;
  ranked: { facet: string; raw: number; max: number; score: number }[]; // highest first; score is 0 to 100
  primary: string;
  runnerUp: string;
  margin: number; // raw points between first and second
  tied: boolean; // first and second have the same raw score
  coherence: Coherence;
};
export type Result = { version: string; code: [string, string, string]; secondary: [string, string, string]; secondaryDim: Dim; dims: DimResult[] };

const facetKey = (dim: Dim, name: string) => `${dim}.${name}`;

/** Checks a bank before anything uses it; the build fails on a bad bank, never a visitor. */
export function validateBank(b: Bank): string[] {
  const bad: string[] = [];
  if (!b.version || !/^[0-9A-Za-z.-]{1,20}$/.test(b.version)) bad.push("version must be 1-20 of [0-9A-Za-z.-]");
  const facets = new Set(DIMENSIONS.flatMap((d) => (b.dimensions?.[d] ?? []).map((f) => facetKey(d, f))));
  for (const d of DIMENSIONS) if ((b.dimensions?.[d] ?? []).length !== 3) bad.push(`dimension ${d} needs 3 facets`);
  const numbers = new Set<number>();
  for (const q of b.questions ?? []) {
    if (numbers.has(q.number)) bad.push(`question ${q.number} is repeated`);
    numbers.add(q.number);
    if (!q.prompt?.trim()) bad.push(`question ${q.number} has no prompt`);
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 9) bad.push(`question ${q.number} needs 2-9 options`);
    for (const o of q.options ?? []) {
      for (const w of [{ facet: o.facet, weight: o.weight }, ...(o.also ?? [])]) {
        if (!facets.has(w.facet)) bad.push(`question ${q.number}: unknown facet ${w.facet}`);
        if (!(typeof w.weight === "number" && w.weight > 0 && w.weight <= 10)) bad.push(`question ${q.number}: weight must be 0-10`);
      }
      if (!o.text?.trim()) bad.push(`question ${q.number}: an option has no text`);
    }
  }
  for (const f of facets) if (maxFor(b, f) === 0) bad.push(`facet ${f} can never score`);
  if (b.order) {
    const o = [...b.order].sort((x, y) => x - y), n = [...numbers].sort((x, y) => x - y);
    if (o.join() !== n.join()) bad.push("order must list every question number once");
  }
  return bad;
}

const weights = (o: Option) => [{ facet: o.facet, weight: o.weight }, ...(o.also ?? [])];

/** The most a facet can score: the best option for it in every question (the Gnostic engine's normalization). */
function maxFor(b: Bank, facet: string) {
  let m = 0;
  for (const q of b.questions) m += Math.max(0, ...q.options.map((o) => weights(o).filter((w) => w.facet === facet).reduce((s, w) => s + w.weight, 0)));
  return m;
}

/** The order questions are asked in: the bank's own `order`, or R, V and P interleaved (Rod's open question; Philosopher
 *  11/25: interleave, so the structure isn't obvious). Mixed questions go last. */
export function questionOrder(b: Bank): number[] {
  if (b.order) return [...b.order];
  const by = (d: string) => b.questions.filter((q) => q.dimension === d).map((q) => q.number);
  const lanes = DIMENSIONS.map(by), out: number[] = [];
  for (let i = 0; i < Math.max(...lanes.map((l) => l.length)); i++) for (const l of lanes) if (i < l.length) out.push(l[i]);
  return [...out, ...by("mixed")];
}

export function score(b: Bank, answers: Answers): Result {
  const raw = new Map<string, number>();
  for (const q of b.questions) {
    const o = q.options[answers[q.number]];
    if (!o) throw new Error(`question ${q.number} has no answer`);
    for (const w of weights(o)) raw.set(w.facet, (raw.get(w.facet) ?? 0) + w.weight);
  }
  // An exact tie goes to the tied facet the person chose most recently, in asking order. Breaking it by the bank's facet
  // order would favor the first facet: with 9 questions about 18% of dimensions tie under random answers, and the first
  // facet would then win 42% instead of 33% (simulation, 200,000 runs). The result still says it's a tie.
  const lastPicked = new Map<string, number>();
  for (const [pos, n] of questionOrder(b).entries()) {
    const q = b.questions.find((x) => x.number === n)!, o = q.options[answers[n]];
    for (const w of weights(o)) lastPicked.set(w.facet, pos);
  }
  const dims: DimResult[] = DIMENSIONS.map((dim) => {
    const ranked = b.dimensions[dim].map((name) => {
      const f = facetKey(dim, name), max = maxFor(b, f), r = raw.get(f) ?? 0;
      return { facet: f, raw: r, max, score: max ? Math.round((r / max) * 100) : 0, last: lastPicked.get(f) ?? -1 };
    }).sort((x, y) => y.raw - x.raw || y.last - x.last).map(({ last: _last, ...rest }) => rest);
    const [a, c] = ranked, margin = a.raw - c.raw, ratio = a.max ? margin / a.max : 0;
    // SPEC step 6: clear over 0.33, leaning 0.17 to 0.33, blended under 0.17 (within one answer is always blended).
    const coherence: Coherence = ratio > 0.33 ? "clear" : ratio >= 0.17 ? "leaning" : "blended";
    return { dim, ranked, primary: a.facet, runnerUp: c.facet, margin, tied: margin === 0, coherence };
  });
  const code = dims.map((d) => d.primary) as Result["code"];
  // SPEC step 5: the secondary swaps in the runner-up of the closest dimension (the first one in R, V, P order on a tie).
  const closest = dims.reduce((m, d) => (d.margin < m.margin ? d : m), dims[0]);
  const secondary = dims.map((d) => (d === closest ? d.runnerUp : d.primary)) as Result["secondary"];
  return { version: b.version, code, secondary, secondaryDim: closest.dim, dims };
}

// The link that carries a result: #v=<version>&a=<one digit per question, in bank order>. The fragment is never sent
// to a server; the digit is the option's index in the bank, so shuffling options on screen can't change a result.
export function encode(b: Bank, answers: Answers): string {
  const digits = b.questions.map((q) => {
    const i = answers[q.number];
    if (!(Number.isInteger(i) && i >= 0 && i < q.options.length)) throw new Error(`question ${q.number} has no answer`);
    return String(i);
  }).join("");
  return `v=${encodeURIComponent(b.version)}&a=${digits}`;
}

/** Reads a fragment back; null for anything that isn't a complete answer sheet for a known bank version. */
export function decode(banks: Record<string, Bank>, fragment: string): { bank: Bank; answers: Answers } | null {
  const p = new URLSearchParams(fragment.replace(/^#/, ""));
  const bank = banks[p.get("v") ?? ""], a = p.get("a") ?? "";
  if (!bank || a.length !== bank.questions.length || !/^[0-9]+$/.test(a)) return null;
  const answers: Answers = {};
  for (const [i, q] of bank.questions.entries()) {
    const d = Number(a[i]);
    if (d >= q.options.length) return null;
    answers[q.number] = d;
  }
  return { bank, answers };
}

/** "R.Physical-V.Moral-P.Creative" → the archetype key the content file uses. */
export const codeKey = (code: readonly string[]) => code.join("-");
