// The archetype's own guidance (Philosopher's content): lean on this, watch for this, where you fit, the 7-day practice.
// Plain render, no hooks: the result page (browser) and each archetype page (static) share it. Spanish that isn't
// written yet shows the English with lang="en" (staging only; going live needs every text in both).
import type { ReactNode } from "react";
import { CONTENT, pick, type Archetype, type Lang } from "./data";
import type { Text } from "./content";

type S = Record<string, string>;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

export function T({ lang, t }: { lang: Lang; t: Text }) {
  const p = pick(lang, t);
  return p.lang ? <span lang={p.lang}>{p.text}</span> : <>{p.text}</>;
}

// Philosopher's order (SPEC.md): lean on, watch for, [growth edge], where it fits, [people unlike you], the practice.
export function ArchetypeDetails({ lang, s, a, you, afterWatch, afterFit }: { lang: Lang; s: S; a: Archetype; you: boolean; afterWatch?: ReactNode; afterFit?: ReactNode }) {
  const c = CONTENT.archetypes[a.slug];
  return (
    <>
      <section className="rvp-section">
        <h2 className="ds-title-large">{you ? s.leanOnYou : s.leanOn}</h2>
        <p className="ds-body-medium">{a.strengths[lang]}</p>
        {c ? <ul className="rvp-bullets">{c.leanOn.map((t, i) => <li key={i} className="ds-body-medium"><T lang={lang} t={t} /></li>)}</ul> : null}
      </section>
      <section className="rvp-section">
        <h2 className="ds-title-large">{you ? s.watchForYou : s.watchFor}</h2>
        <p className="ds-body-medium">{a.shadow[lang]}</p>
        {c ? (
          <dl className="rvp-facts">
            <dt className="ds-title-small">{s.earlySign}</dt><dd className="ds-body-medium"><T lang={lang} t={c.watchFor.sign} /></dd>
            <dt className="ds-title-small">{s.counterMove}</dt><dd className="ds-body-medium"><T lang={lang} t={c.watchFor.counter} /></dd>
          </dl>
        ) : null}
      </section>
      {afterWatch}
      {c ? (
        <>
          <section className="rvp-section">
            <h2 className="ds-title-large">{s.fitTitle}</h2>
            <div className="rvp-two">
              <div><h3 className="ds-title-small">{s.thrives}</h3><ul className="rvp-bullets">{c.fit.thrives.map((t, i) => <li key={i} className="ds-body-medium"><T lang={lang} t={t} /></li>)}</ul></div>
              <div><h3 className="ds-title-small">{s.strains}</h3><ul className="rvp-bullets">{c.fit.strains.map((t, i) => <li key={i} className="ds-body-medium"><T lang={lang} t={t} /></li>)}</ul></div>
            </div>
          </section>
          {afterFit}
          <section className="rvp-section">
            <h2 className="ds-title-large">{s.practiceTitle}</h2>
            <p className="ds-body-medium ds-variant">{s.practiceLede}</p>
            <ol className="rvp-days">{c.practice.map((t, i) => (
              <li key={i} className="ds-body-medium"><strong>{fill(s.day, { n: i + 1 })}</strong> <T lang={lang} t={t} /></li>
            ))}</ol>
            <p className="ds-body-small ds-variant">{s.sixMonths}</p>
          </section>
        </>
      ) : afterFit}
    </>
  );
}
