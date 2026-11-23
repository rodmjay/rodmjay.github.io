"use client";
// The Copy buttons on code blocks (the design system's prose.js), wired after each post renders.
import { useEffect } from "react";

declare global { interface Window { DSProse?: { wireCodeBlocks: (root: Document, lang?: string) => void } } }
let loading: Promise<void> | null = null;
const load = () => (loading ||= new Promise<void>((done) => {
  const s = document.createElement("script");
  s.src = "/ds/prose.global.js";
  s.onload = () => done();
  document.head.append(s);
}));

export function CodeCopy({ lang }: { lang: string }) {
  useEffect(() => {
    if (!document.querySelector(".ds-codeblock-copy")) return;
    (window.DSProse ? Promise.resolve() : load()).then(() => window.DSProse?.wireCodeBlocks(document, lang));
  }, [lang]);
  return null;
}
