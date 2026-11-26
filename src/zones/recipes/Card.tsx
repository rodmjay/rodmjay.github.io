// One recipe card and its photo, shared by the server-rendered lists (tag pages, section mode) and the client filter
// on the index (RecipeBrowser). No build-time imports here: everything a card shows comes in as data.
import Link from "next/link";

export type PhotoData = { srcset: string; jpg: string; width: number; height: number } | null;
export type CardData = { url: string; title: string; dek: string; facts: string[]; photo: PhotoData; imageAlt: string; tags: string[] };

export function Photo({ photo, alt, sizes, eager }: { photo: PhotoData; alt: string; sizes: string; eager?: boolean }) {
  if (!photo) return null;
  return (
    <picture>
      <source type="image/webp" srcSet={photo.srcset} sizes={sizes} />
      <img src={photo.jpg} alt={alt} width={photo.width} height={photo.height} loading={eager ? "eager" : "lazy"} decoding="async" />
    </picture>
  );
}

// The whole card is one link, one tab stop; no tag chips on the card (Designer, 11/26).
export function RecipeCard({ x, eager, sampleLabel }: { x: CardData; eager?: boolean; sampleLabel?: string }) {
  return (
    <Link className={`ds-card outlined recipe-card${x.photo ? "" : " flat"}`} href={x.url}>
      {x.photo ? <Photo photo={x.photo} alt={x.imageAlt} sizes="(min-width: 1024px) 22rem, (min-width: 600px) 45vw, 100vw" eager={eager} /> : <span className="flat-title" aria-hidden="true">{x.title}</span>}
      <span className="recipe-card-body">
        {sampleLabel && <span className="ds-chip sample-chip">{sampleLabel}</span>}
        <span className="ds-title-medium recipe-card-title">{x.title}</span>
        <span className="ds-body-medium ds-variant recipe-card-dek">{x.dek}</span>
        {x.facts.length > 0 && <span className="ds-overline recipe-card-facts">{x.facts.join(" · ")}</span>}
      </span>
    </Link>
  );
}
