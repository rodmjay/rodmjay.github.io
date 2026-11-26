"use client";
// The result, computed in the browser from the URL fragment (#v=…&a=…), which is never sent to a server. Words only:
// no grade, no ranking, no comparison with anyone. Philosopher's spec (SPEC.md, "Making the result useful"): the
// pattern in words, lean on this, watch for this, the growth edge, where you fit, working with people unlike you, a
// 7-day practice and a one-page card made on this device. Every line is a reflection prompt, never a diagnosis.
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { decode, score, codeKey, type Result, type DimResult } from "./engine";
import { BANKS, RESULT_HANDOFF, CONTENT, archetypeByKey, facetName, dimName, pick, rvpUrl, type Archetype, type Lang } from "./data";
import { differenceFor } from "./content";
import { ArchetypeDetails, T } from "./Details";
import { downloadCard, type CardData } from "./card";

type S = Record<string, string>;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

function patternLine(lang: Lang, s: S, d: DimResult) {
  const f = facetName(lang, d.primary), r = facetName(lang, d.runnerUp);
  const how = d.tied ? fill(s.tie, { a: f, b: r }) : d.coherence === "clear" ? fill(s.clearly, { facet: f })
    : d.coherence === "leaning" ? fill(s.leaning, { facet: f, runner: r }) : fill(s.closeBehind, { facet: f, runner: r });
  return `${s[`pattern${d.dim}`]}: ${how}`;
}

/** The least-used facet overall: the lowest score of all nine (ch. 12: integrate it, never reject it). */
const weakest = (r: Result) => r.dims.flatMap((d) => d.ranked).reduce((m, f) => (f.score < m.score ? f : m));

/** The result from the address (#v=…&a=…), or from `fragment` when a page already holds one (the dashboard's saved
 *  takes: same layout, no second one). `children` sit under the share buttons, only once there is a result (the save card). */
export function RvpResult({ lang, s, fragment, children }: { lang: Lang; s: S; fragment?: string; children?: ReactNode }) {
  const [state, setState] = useState<{ result: Result; main: Archetype; second: Archetype } | null | undefined>(undefined);
  const [note, setNote] = useState("");
  const own = fragment === undefined; // reading the address bar (the result page), not a given take

  useEffect(() => {
    if (!own) {
      const got = decode(BANKS, fragment ?? "");
      const result = got ? score(got.bank, got.answers) : null;
      const main = result && archetypeByKey(codeKey(result.code)), second = result && archetypeByKey(codeKey(result.secondary));
      setState(result && main && second ? { result, main, second } : null);
      return;
    }
    // Straight from the last question: take the result RvpTake handed over, once. Normally the URL already has it; after a
    // deploy mid-test Next arrives here by a full load without the #fragment, so put it back in the URL first.
    try {
      const handed = sessionStorage.getItem(RESULT_HANDOFF);
      if (handed !== null) {
        sessionStorage.removeItem(RESULT_HANDOFF);
        if (window.location.hash.length <= 1) history.replaceState(history.state, "", `#${handed}`);
      }
    } catch { /* storage blocked: the URL is all there is */ }
    const read = () => {
      const got = decode(BANKS, window.location.hash);
      if (!got) return setState(null);
      const result = score(got.bank, got.answers);
      const main = archetypeByKey(codeKey(result.code)), second = archetypeByKey(codeKey(result.secondary));
      setState(main && second ? { result, main, second } : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [own, fragment]);

  // Arriving here from the last question: focus the page heading, not the body (Designer 11/25).
  useEffect(() => { if (state && own) (document.querySelector("main h1") as HTMLElement | null)?.focus(); }, [state === undefined || state === null ? 0 : 1]);

  if (state === undefined) return <div className="rvp-stage" aria-busy="true"><div className="ds-skeleton rvp-skeleton" /></div>;
  if (state === null) {
    return (
      <div className="rvp-stage">
        <p className="ds-body-large">{s.noResult}</p>
        <p><Link href={rvpUrl(lang, "take")} className="ds-btn filled">{s.takeIt}</Link></p>
      </div>
    );
  }
  const { result, main, second } = state;
  const edge = weakest(result), edgeText = CONTENT.facets[edge.facet];
  const practice1 = CONTENT.archetypes[main.slug]?.practice[0];
  const card: CardData = {
    title: s.cardTitle, name: main.name[lang], role: main.role[lang], footer: s.cardFooter,
    rows: [
      { label: s.strengths, text: main.strengths[lang] },
      { label: s.shadow, text: main.shadow[lang] },
      ...(edgeText ? [{ label: fill(s.cardEdge, { facet: facetName(lang, edge.facet) }), text: pick(lang, edgeText.practice).text }] : []),
      ...(practice1 ? [{ label: s.cardPractice, text: pick(lang, practice1).text }] : []),
    ],
  };
  const growth = edgeText ? (

        <section className="rvp-section">
          <h2 className="ds-title-large">{s.growthTitle}</h2>
          <p className="ds-body-medium ds-variant">{fill(s.leastUsed, { list: result.dims.map((d) => facetName(lang, d.ranked[2].facet)).join(", ") })}</p>
          <p className="ds-body-medium"><T lang={lang} t={edgeText.edge} /></p>
          <p className="ds-body-medium"><strong>{s.tryThis}</strong> <T lang={lang} t={edgeText.practice} /></p>
        </section>
      
  ) : null;
  const unlike = (
      <section className="rvp-section">
        <h2 className="ds-title-large">{s.unlikeTitle}</h2>
        <p className="ds-body-medium ds-variant">{s.unlikeLede}</p>
        {result.dims.flatMap((d) => d.ranked.slice(1).map((other) => {
          const n = differenceFor(CONTENT, d.primary, other.facet);
          return n ? (
            <details key={`${d.dim}${other.facet}`} className="rvp-details">
              <summary className="ds-body-medium">{fill(s.unlikeWhen, { facet: facetName(lang, other.facet), dimension: dimName(lang, d.dim) })}</summary>
              <p className="ds-body-medium"><T lang={lang} t={n.wrong} /></p>
              <p className="ds-body-medium"><strong>{s.trySaying}</strong> “<T lang={lang} t={n.say} />”</p>
            </details>
          ) : null;
        }))}
      </section>
  );
  const link = () => (own ? window.location.href : `${window.location.origin}${rvpUrl(lang, "result")}#${fragment}`);
  const copy = async () => { try { await navigator.clipboard.writeText(link()); setNote(s.copied); } catch { /* the address bar still has it */ } };
  const save = async () => { await downloadCard(card, `rvp-${main.slug}.png`); setNote(s.cardSaved); };

  return (
    <div className="rvp-stage">
      <article className="ds-card rvp-card">
        <h2 className="ds-headline-medium">{main.name[lang]}</h2>
        <p className="ds-body-large">{main.role[lang]}</p>
        <p className="ds-body-medium ds-variant">{main.examples[lang]}</p>
        <p className="ds-card-actions"><Link href={rvpUrl(lang, main.slug)} className="ds-btn text">{fill(s.moreAbout, { name: main.name[lang] })}</Link></p>
      </article>

      <div className="rvp-actions">
        <button type="button" className="ds-btn" onClick={save}>{s.downloadCard}</button>
        <button type="button" className="ds-btn outlined" onClick={copy}>{s.copyLink}</button>
        <button type="button" className="ds-btn text" onClick={() => window.print()}>{s.printCard}</button>
      </div>
      <p className="ds-body-small ds-variant" aria-live="polite">{note}</p>
      {children}

      <section className="rvp-section">
        <h2 className="ds-title-large">{s.patternTitle}</h2>
        <ul className="rvp-bullets">{result.dims.map((d) => <li key={d.dim} className="ds-body-medium">{patternLine(lang, s, d)}</li>)}</ul>
        <p className="ds-body-medium"><Link href={rvpUrl(lang, second.slug)}>{second.name[lang]}</Link>
          {" "}{fill(s.secondaryWhy, { dimension: dimName(lang, result.secondaryDim) })}</p>
      </section>

      <ArchetypeDetails lang={lang} s={s} a={main} you afterWatch={growth} afterFit={unlike} />

      <p className="ds-body-medium">{s.mapNotPrison} {s.notClinical}</p>
      <p><Link href={rvpUrl(lang, "take")} className="ds-btn text">{s.retake}</Link></p>

      {/* Printing shows only this card (site.css @media print). */}
      <section className="rvp-print" aria-hidden="true">
        <p className="ds-overline">{card.title}</p>
        <h2 className="ds-headline-medium">{card.name}</h2>
        <p className="ds-body-large">{card.role}</p>
        <dl className="rvp-facts">{card.rows.map((r) => <div key={r.label}><dt className="ds-title-small">{r.label}</dt><dd className="ds-body-medium">{r.text}</dd></div>)}</dl>
        <p className="ds-body-small">{card.footer}</p>
      </section>
    </div>
  );
}
