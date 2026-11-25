// The RVP test's engine (src/rvp/engine.ts) against the real bank and archetypes: `node --test tests/rvp.test.ts`.
// No browser and no build: the scoring, the link encoding and the content file's coverage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateBank, questionOrder, score, encode, decode, codeKey, DIMENSIONS, type Bank, type Answers } from "../src/rvp/engine.ts";

const bank: Bank = JSON.parse(readFileSync(new URL("../src/rvp/bank.json", import.meta.url), "utf8"));
const content = JSON.parse(readFileSync(new URL("../src/rvp/archetypes.json", import.meta.url), "utf8"));
const banks = { [bank.version]: bank };

/** Answers that pick, in every question, the option for the facet given for its dimension. */
function aim(target: Record<string, string>): Answers {
  const a: Answers = {};
  for (const q of bank.questions) {
    const i = q.options.findIndex((o) => o.facet === target[q.dimension]);
    a[q.number] = i >= 0 ? i : 0;
  }
  return a;
}
/** Answers with a chosen count per facet in one dimension (others aimed at their first facet). */
function counts(dim: string, per: number[], order: "asked" | "bank" = "bank"): Answers {
  const a = aim({ R: `R.${bank.dimensions.R[0]}`, V: `V.${bank.dimensions.V[0]}`, P: `P.${bank.dimensions.P[0]}` });
  const qs = bank.questions.filter((q) => q.dimension === dim);
  const seq = order === "asked" ? questionOrder(bank).map((n) => qs.find((q) => q.number === n)).filter(Boolean) as typeof qs : qs;
  let k = 0;
  per.forEach((c, fi) => { for (let j = 0; j < c; j++) { const q = seq[k++]; a[q.number] = q.options.findIndex((o) => o.facet === `${dim}.${bank.dimensions[dim as "R"][fi]}`); } });
  return a;
}

test("the bank is valid: 27 questions, 3 facets per dimension, every facet can score", () => {
  assert.deepEqual(validateBank(bank), []);
  assert.equal(bank.questions.length, 27);
});

test("a bad bank is refused before any visitor sees it", () => {
  const broken: Bank = JSON.parse(JSON.stringify(bank));
  broken.questions[0].options[0].facet = "R.Nope";
  broken.questions[1].options[1].weight = 0;
  broken.questions.push({ ...broken.questions[2] });
  const bad = validateBank(broken);
  assert.ok(bad.some((m) => m.includes("unknown facet R.Nope")));
  assert.ok(bad.some((m) => m.includes("weight")));
  assert.ok(bad.some((m) => m.includes("repeated")));
});

test("the content file has all 27 archetypes, one per facet combination, in English and Spanish", () => {
  const keys = new Set(content.archetypes.map((a: any) => a.key));
  assert.equal(keys.size, 27);
  for (const r of bank.dimensions.R) for (const v of bank.dimensions.V) for (const p of bank.dimensions.P) {
    assert.ok(keys.has(`R.${r}-V.${v}-P.${p}`), `missing ${r} ${v} ${p}`);
  }
  for (const a of content.archetypes) for (const f of ["name", "role", "examples", "strengths", "shadow"]) {
    assert.ok(a[f].en?.trim() && a[f].es?.trim(), `${a.slug}.${f}`);
  }
  assert.equal(new Set(content.archetypes.map((a: any) => a.slug)).size, 27);
});

test("every one of the 27 archetypes is reachable", () => {
  for (const a of content.archetypes) {
    const [r, v, p] = a.key.split("-");
    const res = score(bank, aim({ R: r, V: v, P: p }));
    assert.equal(codeKey(res.code), a.key);
    for (const d of res.dims) { assert.equal(d.coherence, "clear"); assert.equal(d.ranked[0].score, 100); }
  }
});

test("questions are asked with R, V and P interleaved", () => {
  const o = questionOrder(bank);
  assert.deepEqual(o.slice(0, 6), [1, 10, 19, 2, 11, 20]);
  assert.deepEqual([...o].sort((x, y) => x - y), bank.questions.map((q) => q.number));
  assert.deepEqual(questionOrder({ ...bank, order: [...o].reverse() }), [...o].reverse(), "the bank's own order wins");
});

test("coherence: within one answer is blended, two answers leaning, three or more clear", () => {
  const reading = (per: number[]) => score(bank, counts("V", per)).dims.find((d) => d.dim === "V")!;
  assert.equal(reading([3, 3, 3]).coherence, "blended");
  assert.equal(reading([4, 3, 2]).coherence, "blended"); // margin 2 points (one answer)
  assert.equal(reading([5, 3, 1]).coherence, "leaning"); // margin 4
  assert.equal(reading([6, 3, 0]).coherence, "clear"); // margin 6 (0.333)
  assert.equal(reading([9, 0, 0]).coherence, "clear");
});

test("an exact tie is shown as a tie and goes to the tied facet chosen most recently", () => {
  // Moral, Aesthetic, Pragmatic 4/4/1, with Aesthetic picked in the later questions (as asked).
  const a = counts("V", [4, 4, 1], "asked");
  const v = score(bank, a).dims.find((d) => d.dim === "V")!;
  assert.equal(v.tied, true);
  assert.equal(v.coherence, "blended");
  assert.deepEqual([v.primary, v.runnerUp], ["V.Aesthetic", "V.Moral"]);
});

test("the secondary swaps in the runner-up of the closest dimension", () => {
  const a = { ...aim({ R: "R.Social", V: "V.Moral", P: "P.Adaptive" }), ...Object.fromEntries(
    Object.entries(counts("P", [4, 5, 0])).filter(([n]) => bank.questions.find((q) => q.number === +n)!.dimension === "P")) };
  const res = score(bank, a);
  assert.deepEqual(res.code, ["R.Social", "V.Moral", "P.Adaptive"]);
  assert.equal(res.secondaryDim, "P");
  assert.deepEqual(res.secondary, ["R.Social", "V.Moral", "P.Creative"]);
});

test("the link round-trips, names the version and refuses anything incomplete or unknown", () => {
  const a = aim({ R: "R.Intellectual", V: "V.Pragmatic", P: "P.Creative" });
  const frag = encode(bank, a);
  assert.match(frag, /^v=0\.1-draft&a=[0-2]{27}$/);
  assert.deepEqual(decode(banks, `#${frag}`)?.answers, a);
  assert.equal(decode(banks, frag.replace("0.1-draft", "9.9")), null, "unknown version");
  assert.equal(decode(banks, frag.slice(0, -1)), null, "one answer short");
  assert.equal(decode(banks, frag.replace(/a=./, "a=7")), null, "an option that doesn't exist");
  assert.equal(decode(banks, "#v=0.1-draft&a=" + "x".repeat(27)), null);
  assert.throws(() => encode(bank, { ...a, 5: undefined as unknown as number }));
});

test("the screen's option order can't change a result: answers name the bank's option, not its position", () => {
  const a = aim({ R: "R.Physical", V: "V.Aesthetic", P: "P.Sustaining" });
  const shuffled: Bank = JSON.parse(JSON.stringify(bank));
  for (const q of shuffled.questions) q.options.reverse();
  const back: Answers = Object.fromEntries(Object.entries(a).map(([n, i]) => [n, bank.questions.find((q) => q.number === +n)!.options.length - 1 - i]));
  assert.deepEqual(score(shuffled, back).code, score(bank, a).code);
});

test("random answers spread across all 27 archetypes with no facet favored (100,000 runs)", () => {
  // mulberry32: seeded, so the test is repeatable (a plain LCG's low bits are correlated and skew the counts).
  let seed = 42;
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const seen = new Map<string, number>(), facetWins = new Map<string, number>();
  const N = 100_000;
  for (let i = 0; i < N; i++) {
    const a: Answers = {};
    for (const q of bank.questions) a[q.number] = Math.floor(rnd() * q.options.length);
    const res = score(bank, a);
    seen.set(codeKey(res.code), (seen.get(codeKey(res.code)) ?? 0) + 1);
    for (const f of res.code) facetWins.set(f, (facetWins.get(f) ?? 0) + 1);
  }
  assert.equal(seen.size, 27);
  for (const [k, n] of seen) assert.ok(n / N > 0.8 / 27 && n / N < 1.2 / 27, `${k}: ${n}`);
  for (const d of DIMENSIONS) for (const f of bank.dimensions[d]) {
    const share = (facetWins.get(`${d}.${f}`) ?? 0) / N;
    assert.ok(share > 0.31 && share < 0.36, `${d}.${f}: ${share}`);
  }
});
