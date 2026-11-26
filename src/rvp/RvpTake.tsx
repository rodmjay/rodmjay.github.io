"use client";
// Taking the test: one question per screen, options in a fresh random order for each person (never stored), answers kept
// only in this tab's sessionStorage so a refresh doesn't lose them. Nothing is sent anywhere while taking the test; the
// result page reads the answers from the URL fragment, which browsers never send to a server.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { questionOrder, encode, type Answers } from "./engine";
import { BANK, RESULT_HANDOFF, ANSWERS_KEY, bankHasSpanish, rvpUrl, type Lang } from "./data";

type S = Record<string, string>;
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const KEY = ANSWERS_KEY;

function shuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i), r = new Uint32Array(n);
  crypto.getRandomValues(r);
  for (let i = n - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function RvpTake({ lang, s }: { lang: Lang; s: S }) {
  const router = useRouter();
  const order = useMemo(() => questionOrder(BANK), []);
  const spanish = lang === "es" && bankHasSpanish();
  const [ready, setReady] = useState(false);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const shuffles = useRef<Record<number, number[]>>({});
  const legend = useRef<HTMLLegendElement>(null);
  const fieldset = useRef<HTMLFieldSetElement>(null);
  const [need, setNeed] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Answers | null;
      if (saved && typeof saved === "object") {
        setAnswers(saved);
        const firstOpen = order.findIndex((n) => saved[n] === undefined);
        setI(firstOpen < 0 ? order.length - 1 : firstOpen);
      }
    } catch { /* private window or blocked storage: start fresh */ }
    setReady(true);
  }, [order]);

  const save = (a: Answers) => { try { sessionStorage.setItem(KEY, JSON.stringify(a)); } catch { /* fine */ } };
  const n = order[i], q = BANK.questions.find((x) => x.number === n)!;
  // Shuffled only once mounted (the server can't know the order), so the first paint is the fixed-height placeholder.
  const shown = ready ? (shuffles.current[n] ??= shuffle(q.options.length)) : [];
  const chosen = answers[n];
  const last = i === order.length - 1;

  const move = (to: number) => { setNeed(false); setI(to); requestAnimationFrame(() => legend.current?.focus()); };
  const pick = (k: number) => { setNeed(false); const a = { ...answers, [n]: k }; setAnswers(a); save(a); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chosen === undefined) { setNeed(true); requestAnimationFrame(() => fieldset.current?.focus()); return; }
    if (!last) return move(i + 1);
    const frag = encode(BANK, answers);
    // The result also goes to sessionStorage: if a deploy landed while they were answering, Next swaps the client-side
    // move for a full page load and drops the #fragment; RvpResult puts it back (Rod 11/25: don't break people mid-quiz).
    try { sessionStorage.setItem(RESULT_HANDOFF, frag); sessionStorage.removeItem(KEY); } catch { /* fine */ }
    router.push(`${rvpUrl(lang, "result")}#${frag}`);
  };
  const restart = () => { try { sessionStorage.removeItem(KEY); } catch { /* fine */ } shuffles.current = {}; setAnswers({}); move(0); };

  return (
    <div className="rvp-stage">
      {lang === "es" && !spanish ? <p className="ds-body-medium ds-variant">{s.spanishSoon}</p> : null}
      {ready ? (
        <form className="ds-qa rvp-qa" onSubmit={submit} lang={lang === "es" && !spanish ? "en" : undefined}>
          <p className="ds-qa-count" aria-live="polite">{fill(s.question, { i: i + 1, n: order.length })}</p>
          <progress className="rvp-progress" max={order.length} value={i} aria-hidden="true" />
          <fieldset key={n} ref={fieldset} tabIndex={-1} aria-describedby={need ? "rvp-need" : undefined}>
            <legend ref={legend} tabIndex={-1}>{spanish ? q.prompt_es : q.prompt}</legend>
            {shown.map((k) => (
              <label key={k} className="ds-qa-choice">
                <input type="radio" name={`q${n}`} value={k} checked={chosen === k} onChange={() => pick(k)} />
                <span>{spanish ? q.options[k].text_es : q.options[k].text}</span>
              </label>
            ))}
          </fieldset>
          {need ? <p className="ds-supporting error rvp-need" id="rvp-need" role="alert"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2 1 21h22zm1 15h-2v-2h2zm0-4h-2v-4h2z" /></svg> {s.needAnswer}</p> : null}
          <div className="rvp-actions">
            {i > 0 ? <button type="button" className="ds-btn text" onClick={() => move(i - 1)}>{s.back}</button> : null}
            <button type="submit" className="ds-btn">{last ? s.finish : s.next}</button>
            {Object.keys(answers).length ? <button type="button" className="ds-btn text rvp-restart" onClick={restart}>{s.startOver}</button> : null}
          </div>
        </form>
      ) : (
        <div className="ds-qa rvp-qa" aria-busy="true">
          <p className="ds-qa-count">{fill(s.question, { i: 1, n: order.length })}</p>
          <div className="ds-skeleton rvp-skeleton" />
        </div>
      )}
      <noscript><p className="ds-body-medium">{s.needsJs}</p></noscript>
    </div>
  );
}
