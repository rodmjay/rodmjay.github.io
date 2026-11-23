// The synthwave hero (Designer's prototype, design/specs/rodmjay-synthwave/hero.html). The art is static SVG, drawn
// at build time (the grid's rays and rows included); only the parallax runs in the browser.
import { read } from "@/lib/site.mjs";
import { Parallax } from "./Parallax";

const layers = read("src/zones/home/scene-layers.html");

export function Scene({ name, title }: { name: string; title: string }) {
  return (
    <section className="scene" id="scene" aria-labelledby="hero-name">
      <div className="contents" dangerouslySetInnerHTML={{ __html: layers }} />
      <div className="title">
        <h1 id="hero-name">{name}</h1>
        <p>{title}</p>
      </div>
      <Parallax />
    </section>
  );
}
