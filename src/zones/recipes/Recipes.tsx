// Recipes (Rod 11/23; Designer's spec, design/specs/rodmjay-recipes.md): the index and tag pages as a card grid, and a
// recipe page with ingredients and steps. It reuses the blog's parts (the horizon strip, chips, the pager). Until Rod
// approves the set (RECIPES_APPROVED=1) every page shows the Sample chip, is noindex and stays out of the sitemap.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, HTML_LANG, t } from "@/lib/site.mjs";
import { loadBlog } from "@/lib/blog.mjs";
import { loadRecipes, BASE, splitAmount } from "@/lib/recipes.mjs";
import { meta } from "@/lib/meta";
import { PrintButton } from "./PrintButton";

type Lang = "en" | "es";
/* eslint-disable @typescript-eslint/no-explicit-any */
type Recipe = any;

const Html = ({ html }: { html: string }) => <div className="contents" dangerouslySetInnerHTML={{ __html: html }} />;
const Chip = ({ lang }: { lang: Lang }) => <span className="ds-chip sample-chip">{dict(lang).recipes.sampleChip}</span>;

function facts(r: Recipe) {
  const out: string[] = [];
  if (r.minutes != null) out.push(t(r.lang, "recipes.minutes", { n: r.minutes }));
  if (r.servings) out.push(t(r.lang, "recipes.servings", { n: r.servings }));
  return out;
}

function Photo({ r, sizes, eager }: { r: Recipe; sizes: string; eager?: boolean }) {
  if (!r.photo) return null;
  return (
    <picture>
      <source type="image/webp" srcSet={r.photo.srcset} sizes={sizes} />
      <img src={r.photo.jpg} alt={r.imageAlt} width={r.photo.width} height={r.photo.height} loading={eager ? "eager" : "lazy"} decoding="async" />
    </picture>
  );
}

async function findList(path: string) {
  const r = await loadRecipes();
  const l = r.lists.find((x: any) => x.path === path);
  if (!l) notFound();
  return { r, l };
}

export async function listMeta(path: string) {
  const { r, l } = await findList(path);
  const R = dict(l.lang).recipes;
  const heading = l.tag ? t(l.lang, "recipes.tagged", { tag: l.tag.name }) : R.tagline;
  const title0 = l.tag ? heading : R.title;
  const title = l.n > 1 ? `${title0} · ${t(l.lang, "recipes.page", { n: l.n, total: l.total })}` : title0;
  return meta({ lang: l.lang, title, description: l.tag ? heading : R.description, path: l.path, alt: l.otherPath, noindex: r.sample || !l.items.length, ogLocale: R.ogLocale });
}

export async function RecipeList({ path }: { path: string }) {
  const { r, l } = await findList(path);
  const b = await loadBlog();
  const lang: Lang = l.lang, R = dict(lang).recipes;
  const heading = l.tag ? t(lang, "recipes.tagged", { tag: l.tag.name }) : R.tagline;
  const used = r.usedTags(lang);
  const pageUrl = (n: number) => (n === 1 ? l.base : `${l.base}page/${n}/`);
  return (
    <>
      <section className="strip wide" aria-labelledby="recipes-title">
        <Html html={b.strip} />
        <div className="wide-col"><h1 id="recipes-title">{R.title}</h1><p>{heading}</p>{r.sample && <Chip lang={lang} />}</div>
      </section>
      <main id="main" className="wide-col ix recipes">
        {r.sample && l.items.length > 0 && <p className="ds-banner sample">{R.sample}</p>}
        {used.length > 0 && (
          <ul className="filters" aria-label={R.tags}>
            <li><Link className="ds-chip" href={BASE[lang]} aria-current={l.tag ? undefined : "page"}>{R.all}</Link></li>
            {used.map((tg: any) => <li key={tg.slug}><Link className="ds-chip" href={r.tagUrl(lang, tg.slug)} aria-current={tg.slug === l.tag?.slug ? "page" : undefined}>{tg.name}</Link></li>)}
          </ul>
        )}
        {l.items.length ? (
          <ul className="recipe-grid">
            {l.items.map((x: Recipe, i: number) => (
              <li key={x.url}>
                <Link className={`ds-card outlined recipe-card${x.photo ? "" : " flat"}`} href={x.url}>
                  {x.photo ? <Photo r={x} sizes="(min-width: 1024px) 22rem, (min-width: 600px) 45vw, 100vw" eager={i < 3} /> : <span className="flat-title" aria-hidden="true">{x.title}</span>}
                  <span className="recipe-card-body">
                    {r.sample && <Chip lang={lang} />}
                    <span className="ds-title-medium recipe-card-title">{x.title}</span>
                    <span className="ds-body-medium ds-variant recipe-card-dek">{x.dek}</span>
                    {facts(x).length > 0 && <span className="ds-overline recipe-card-facts">{facts(x).join(" · ")}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="ds-body-large ds-variant">{R.empty}</p>}
        {l.total > 1 && (
          <nav className="more" aria-label={R.pages}>
            {l.n > 1 ? <Link className="ds-btn text" href={pageUrl(l.n - 1)}>← {R.newer}</Link> : null}
            <span className="ds-body-medium ds-variant">{t(lang, "recipes.page", { n: l.n, total: l.total })}</span>
            {l.n < l.total ? <Link className="ds-btn text" href={pageUrl(l.n + 1)}>{R.older} →</Link> : null}
          </nav>
        )}
      </main>
    </>
  );
}

async function findRecipe(lang: Lang, slug: string) {
  const r = await loadRecipes();
  const x = r.byLang[lang].find((y: Recipe) => y.slug === slug);
  if (!x) notFound();
  return { r, x };
}

export async function recipeMeta(lang: Lang, slug: string) {
  const { r, x } = await findRecipe(lang, slug);
  return meta({ lang, title: x.title, description: x.dek, path: x.url, alt: x.twinUrl, noindex: r.sample, type: "article",
    image: x.photo?.jpg, imageAlt: x.imageAlt, ogLocale: dict(lang).recipes.ogLocale });
}

export async function RecipePage({ lang, slug }: { lang: Lang; slug: string }) {
  const { r, x } = await findRecipe(lang, slug);
  const b = await loadBlog();
  const R = dict(lang).recipes, other: Lang = lang === "en" ? "es" : "en";
  // Ingredient lines starting "## " are group labels.
  const groups: { label: string; items: string[] }[] = [];
  for (const line of x.ingredients) {
    if (line.startsWith("## ")) { groups.push({ label: line.slice(3).trim(), items: [] }); continue; }
    if (!groups.length) groups.push({ label: "", items: [] });
    groups[groups.length - 1].items.push(line);
  }
  const credit = [x.credit, ...x.sources.map((s: any) => s.title)].filter(Boolean);
  const [basedPre, basedPost] = R.basedOn.split("{source}");
  return (
    <>
      <div className="strip slim" aria-hidden="true"><Html html={b.stripSlim} /></div>
      <main id="main" className="col post recipes recipe">
        <article>
          <header className="ds-post-head">
            {r.sample && <p className="ds-post-kicker"><Chip lang={lang} /></p>}
            <h1 className="ds-post-title">{x.title}</h1>
            <p className="ds-post-dek">{x.dek}</p>
            {facts(x).length > 0 && <p className="ds-post-meta">{facts(x).map((f) => <span key={f}>{f}</span>)}</p>}
            <p className="recipe-actions">
              <a className="ds-post-lang" href={x.twinUrl} lang={HTML_LANG[other]}>{R.otherLang}</a>
              <PrintButton label={R.print} />
            </p>
            {x.tags.length > 0 && <div className="ds-post-tags">{x.tags.map((tg: string, i: number) => <Link key={tg} className="ds-chip" href={r.tagUrl(lang, x.tagSlugs[i])}>{tg}</Link>)}</div>}
          </header>
          {x.photo && <figure className="ds-post-cover recipe-photo"><Photo r={x} sizes="(min-width: 1024px) 60rem, 100vw" eager /></figure>}
          <div className="recipe-body">
            <section className="recipe-ingredients" aria-labelledby="ingredients">
              <h2 id="ingredients" className="ds-title-large">{R.ingredients}</h2>
              {groups.map((g, i) => (
                <div key={i}>
                  {g.label && <h3 className="ds-title-small">{g.label}</h3>}
                  <ul>{g.items.map((line) => { const { amount, rest } = splitAmount(line); return <li key={line}>{amount && <strong>{amount}</strong>}{rest}</li>; })}</ul>
                </div>
              ))}
            </section>
            <section className="recipe-steps" aria-labelledby="steps">
              <h2 id="steps" className="ds-title-large">{R.steps}</h2>
              <ol>{x.steps.map((s: string) => <li key={s}>{s}</li>)}</ol>
            </section>
          </div>
          {(x.tip || x.serveWith || x.pairsWith) && (
            <dl className="recipe-notes">
              {x.tip && <><dt>{R.tip}</dt><dd>{x.tip}</dd></>}
              {x.serveWith && <><dt>{R.serveWith}</dt><dd>{x.serveWith}</dd></>}
              {x.pairsWith && <><dt>{R.pairsWith}</dt><dd>{x.pairsWith}</dd></>}
            </dl>
          )}
          {credit.length > 0 && (
            <p className="ds-body-small ds-variant recipe-credit">
              {x.credit}{x.credit && x.sources.length > 0 && " · "}
              {x.sources.map((s: any, i: number) => (
                <span key={s.title}>{i > 0 && ", "}{basedPre}{s.url ? <a href={s.url} rel="noopener">{s.title}</a> : <cite>{s.title}</cite>}{basedPost}</span>
              ))}
            </p>
          )}
        </article>
      </main>
    </>
  );
}
