"use client";
// The result, computed in the browser from the URL fragment (#v=…&a=…), which is never sent to a server. Words only: the
// archetype, how clear each dimension is, the secondary and "a map, not a prison". No grade, no ranking, no comparison.
import { useEffect, useState } from "react";
import Link from "next/link";
import { decode, score, codeKey, type Result } from "./engine";
import { BANKS, archetypeByKey, facetName, dimName, rvpUrl, type Archetype, type Lang } from "./data";

type S = Record<string, string>;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function RvpResult({ lang, s }: { lang: Lang; s: S }) {
  const [state, setState] = useState<{ result: Result; main: Archetype; second: Archetype } | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

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
  const copy = async () => { try { await navigator.clipboard.writeText(window.location.href); setCopied(true); } catch { /* the address bar still has it */ } };
  return (
    <div className="rvp-stage">
      <article className="ds-card rvp-card">
        <h2 className="ds-headline-medium">{main.name[lang]}</h2>
        <p className="ds-body-large">{main.role[lang]}</p>
        <dl className="rvp-facts">
          <dt className="ds-title-small">{s.strengths}</dt><dd>{main.strengths[lang]}</dd>
          <dt className="ds-title-small">{s.shadow}</dt><dd>{main.shadow[lang]}</dd>
          <dt className="ds-title-small">{s.examples}</dt><dd>{main.examples[lang]}</dd>
        </dl>
        <p className="ds-card-actions"><Link href={rvpUrl(lang, main.slug)} className="ds-btn text">{main.name[lang]} →</Link></p>
      </article>
      <section>
        <h2 className="ds-title-large">{s.pattern}</h2>
        <ul className="rvp-pattern">
          {result.dims.map((d) => (
            <li key={d.dim} className="ds-body-medium">
              {fill(s.patternLine, {
                dimension: dimName(lang, d.dim),
                facet: facetName(lang, d.primary),
                reading: d.tied ? fill(s.tie, { a: facetName(lang, d.primary), b: facetName(lang, d.runnerUp) }) : s[d.coherence],
              })}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="ds-title-large">{s.secondary}</h2>
        <p className="ds-body-medium"><Link href={rvpUrl(lang, second.slug)}>{second.name[lang]}</Link>: {second.role[lang]}</p>
        <p className="ds-body-small ds-variant">{fill(s.secondaryWhy, { dimension: dimName(lang, result.secondaryDim) })}</p>
      </section>
      <p className="ds-body-medium">{s.mapNotPrison} {s.notClinical}</p>
      <div className="rvp-actions">
        <button type="button" className="ds-btn outlined" onClick={copy}>{s.copyLink}</button>
        <Link href={rvpUrl(lang, "take")} className="ds-btn text">{s.retake}</Link>
        <Link href={rvpUrl(lang, "")} className="ds-btn text">{s.seeAll}</Link>
      </div>
      <p className="ds-body-small ds-variant" aria-live="polite">{copied ? s.copied : ""}</p>
    </div>
  );
}
