// One recipe card and its photo (Designer's homey spec): the photo, the title under it, and "50 min · serves 4" small.
// The whole card is one link, one tab stop. Shared by the server-rendered lists (home, tag pages, related) and the client
// browser on All recipes. No build-time imports here: everything a card shows comes in as data.
import Link from "next/link";

export type PhotoData = { srcset: string; jpg: string; width: number; height: number } | null;
export type CardData = { slug: string; url: string; title: string; meta: string; photo: PhotoData; imageAlt: string; tags: string[]; search: string };

export function Photo({ photo, alt, sizes, eager, className }: { photo: PhotoData; alt: string; sizes: string; eager?: boolean; className?: string }) {
  if (!photo) return null;
  return (
    <picture className={className}>
      <source type="image/webp" srcSet={photo.srcset} sizes={sizes} />
      <img src={photo.jpg} alt={alt} width={photo.width} height={photo.height} loading={eager ? "eager" : "lazy"} decoding="async" fetchPriority={eager ? "high" : undefined} />
    </picture>
  );
}

export function RecipeCard({ x, eager, heading: H = "h3" }: { x: CardData; eager?: boolean; heading?: "h2" | "h3" }) {
  return (
    <article className={`rb-card${x.photo ? "" : " flat"}`}>
      {x.photo ? <Photo photo={x.photo} alt={x.imageAlt} sizes="(min-width: 1040px) 330px, (min-width: 560px) 45vw, 100vw" eager={eager} />
        : <span className="rb-card-flat" aria-hidden="true">{x.title}</span>}
      <div className="rb-card-body">
        <H className="rb-card-title"><Link href={x.url}>{x.title}</Link></H>
        {x.meta && <span className="rb-card-meta">{x.meta}</span>}
      </div>
    </article>
  );
}
