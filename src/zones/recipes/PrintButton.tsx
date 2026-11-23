"use client";
// "Print" on a recipe page: the print stylesheet (recipes.css) is plain black on white, no scene.
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="ds-btn text recipe-print" onClick={() => window.print()}>{label}</button>;
}
