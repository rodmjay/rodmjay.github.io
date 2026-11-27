"use client";
// "Print" on a recipe page: the print stylesheet (recipes.css) is black on white, no header, buttons or related recipes.
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="rb-btn o" onClick={() => window.print()}>{label}</button>;
}
