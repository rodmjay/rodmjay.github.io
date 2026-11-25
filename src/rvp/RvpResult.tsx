"use client";
// The result, computed in the browser from the URL fragment (#v=…&a=…), which is never sent to a server. Words only:
// no grade, no ranking, no comparison with anyone. Philosopher's spec (SPEC.md, "Making the result useful"): the
// pattern in words, lean on this, watch for this, the growth edge, where you fit, working with people unlike you, a
// 7-day practice and a one-page card made on this device. Every line is a reflection prompt, never a diagnosis.
import { useEffect, useState } from "react";
import Link from "next/link";
import { decode, score, codeKey, type Result, type DimResult } from "./engine";
import { BANKS, CONTENT, archetypeByKey, facetName, dimName, pick, rvpUrl, type Archetype, type Lang } from "./data";
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

export function RvpResult({ lang, s }: { lang: Lang; s: S }) {
  const [state, setState] = useState<{ result: Result; main: Archetype; second: Archetype } | null | undefined>(undefined);
  const [note, setNote] = useState("");

  useEffect(() => {
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
  }, []);

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
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setNote(s.copied); } catch { /* the address bar still has it */ } };
  const save = async () => { await downloadCard(card, `rvp-${main.slug}.png`); setNote(s.cardSaved); };

  return (
    <div className="rvp-stage">
      <article className="ds-card rvp-card">
        <h2 className="ds-headline-medium">{main.name[lang]}</h2>
        <p className="ds-body-large">{main.role[lang]}</p>
        <p className="ds-body-medium ds-variant">{main.examples[lang]}</p>
        <p className="ds-card-actions"><Link href={rvpUrl(lang, main.slug)} className="ds-btn text">{fill(s.moreAbout, { name: main.name[lang] })}</Link></p>
      </article>

      <section className="rvp-section">
        <h2 className="ds-title-large">{s.patternTitle}</h2>
        <ul className="rvp-bullets">{result.dims.map((d) => <li key={d.dim} className="ds-body-medium">{patternLine(lang, s, d)}</li>)}</ul>
        <p className="ds-body-medium"><Link href={rvpUrl(lang, second.slug)}>{second.name[lang]}</Link>
          {" "}{fill(s.secondaryWhy, { dimension: dimName(lang, result.secondaryDim) })}</p>
      </section>

      <ArchetypeDetails lang={lang} s={s} a={main} you afterWatch={growth} afterFit={unlike} />

      <p className="ds-body-medium">{s.mapNotPrison} {s.notClinical}</p>
      <div className="rvp-actions">
        <button type="button" className="ds-btn filled" onClick={save}>{s.downloadCard}</button>
        <button type="button" className="ds-btn outlined" onClick={() => window.print()}>{s.printCard}</button>
        <button type="button" className="ds-btn text" onClick={copy}>{s.copyLink}</button>
        <Link href={rvpUrl(lang, "take")} className="ds-btn text">{s.retake}</Link>
      </div>
      <p className="ds-body-small ds-variant" aria-live="polite">{note}</p>

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
