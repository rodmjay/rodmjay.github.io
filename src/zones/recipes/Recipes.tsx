// Recipes (Rod 11/23; Designer's spec, design/specs/rodmjay-recipes.md): the index and tag pages as a card grid, and a
// recipe page with ingredients and steps. It reuses the blog's parts (chips, the pager). Until Rod
// approves the set (RECIPES_APPROVED=1) every page shows the Sample chip, is noindex and stays out of the sitemap.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, HTML_LANG, t } from "@/lib/site.mjs";
import { loadRecipes, BASE, PER_PAGE, splitAmount } from "@/lib/recipes.mjs";
import { meta } from "@/lib/meta";
import { PrintButton } from "./PrintButton";
import { Photo, RecipeCard, type CardData } from "./Card";
import { RecipeBrowser, type BrowserWords, type FacetGroup } from "./RecipeBrowser";

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

// What a card shows, as plain data (the client filter gets the whole list of these).
const card = (r: Recipe): CardData => ({ url: r.url, title: r.title, dek: r.dek, facts: facts(r), photo: r.photo, imageAlt: r.imageAlt,
  tags: r.facets.map((f: any) => f.tag) });

// Facet groups for one language, labelled; `chip` is false for a value only one recipe has (tag page, no chip).
function facetGroups(r: any, lang: Lang): FacetGroup[] {
  const R = dict(lang).recipes;
  return r.facetGroups(lang).map((g: any) => ({ group: g.group, label: R.groups[g.group],
    values: g.values.map((v: any) => ({ tag: v.tag, label: v.label, url: v.url, chip: v.count >= 2 })) }));
}

function Empty({ lang, title, body, href }: { lang: Lang; title: string; body: string; href: string }) {
  return (
    <div className="ds-card outlined recipe-empty">
      <h2 className="ds-title-large">{title}</h2>
      <p className="ds-body-large ds-variant">{body}</p>
      <Link className="ds-btn" href={href}>{dict(lang).recipes.allRecipes}</Link>
    </div>
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
  // Filtered views (?tags=…) are this same static page, so their canonical is the index; the flat tag pages are the
  // indexable ones (and in the sitemap once approved).
  const title0 = l.tag ? heading : R.title;
  const title = l.n > 1 ? `${title0} · ${t(l.lang, "recipes.page", { n: l.n, total: l.total })}` : title0;
  return meta({ lang: l.lang, title, description: l.tag ? heading : R.description, path: l.path, alt: l.otherPath, noindex: r.sample || !l.items.length, ogLocale: R.ogLocale });
}

export async function RecipeList({ path }: { path: string }) {
  const { r, l } = await findList(path);
  if (r.facetMode) return l.tag ? <FacetTagPage r={r} l={l} /> : <FacetIndex r={r} l={l} />;
  const lang: Lang = l.lang, R = dict(lang).recipes;
  const heading = l.tag ? t(lang, "recipes.tagged", { tag: l.tag.name }) : R.tagline;
  const used = r.usedTags(lang);
  const pageUrl = (n: number) => (n === 1 ? l.base : `${l.base}page/${n}/`);
  return (
    <>
      <header className="page-head wide-col"><h1 className="ds-headline-large" id="recipes-title">{R.title}</h1><p className="ds-body-large">{heading}</p>{r.sample && <Chip lang={lang} />}</header>
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
              <li key={x.url}><RecipeCard x={card(x)} eager={i < 3} sampleLabel={r.sample ? R.sampleChip : undefined} /></li>
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

// Facet mode, the index and its static pages: the client filter over the whole book (Designer, 11/26).
function FacetIndex({ r, l }: { r: any; l: any }) {
  const lang: Lang = l.lang, R = dict(lang).recipes;
  const w: BrowserWords = {
    count: R.count, countOne: R.countOne, show: R.show, showOne: R.showOne, clearAll: R.clearAll, clearAllFilters: R.clearAllFilters,
    remove: R.remove, selected: R.selected, noMatch: R.noMatch, emptyTitle: R.emptyTitle, emptyBody: R.emptyBody, filter: R.filter,
    filterCount: R.filterCount, filterHeading: R.filterHeading, moreFilters: R.moreFilters, close: R.close, newer: R.newer, older: R.older, page: R.page, pages: R.pages,
  };
  return (
    <>
      <header className="page-head wide-col"><h1 className="ds-headline-large" id="recipes-title">{R.title}</h1><p className="ds-body-large">{R.tagline}</p>{r.sample && <Chip lang={lang} />}</header>
      <main id="main" className="wide-col ix recipes" data-recipes-source={r.sampleData ? "fixture" : "feed"}>
        {r.sample && <p className="ds-banner sample">{R.sample}</p>}
        <RecipeBrowser base={BASE[lang]} items={r.byLang[lang].map(card)} groups={facetGroups(r, lang)} page0={l.n} perPage={PER_PAGE}
          sampleLabel={r.sample ? R.sampleChip : undefined} w={w} />
      </main>
    </>
  );
}

// Facet mode, one tag: a flat page (h1 the tag, its group under it), the group's other values as links to move
// sideways, and "Combine filters" to the index with this tag chosen.
function FacetTagPage({ r, l }: { r: any; l: any }) {
  const lang: Lang = l.lang, R = dict(lang).recipes;
  const group = facetGroups(r, lang).find((g) => g.group === l.tag.group);
  const groupLabel = R.groups[l.tag.group];
  const pageUrl = (n: number) => (n === 1 ? l.base : `${l.base}page/${n}/`);
  return (
    <>
      <header className="page-head wide-col"><h1 className="ds-headline-large" id="recipes-title">{l.tag.name}</h1><p className="ds-body-large">{groupLabel}</p>{r.sample && <Chip lang={lang} />}</header>
      <main id="main" className="wide-col ix recipes">
        {r.sample && l.items.length > 0 && <p className="ds-banner sample">{R.sample}</p>}
        <nav className="recipe-siblings" aria-label={groupLabel}>
          <ul className="filters">
            <li><Link className="ds-chip" href={BASE[lang]}>{R.all}</Link></li>
            {group?.values.map((v) => <li key={v.tag}><Link className="ds-chip" href={v.url} aria-current={v.tag === l.tag.key ? "page" : undefined}>{v.label}</Link></li>)}
          </ul>
          <Link className="ds-btn text recipe-combine" href={`${BASE[lang]}?tags=${l.tag.key}`} rel="nofollow">{R.combine}</Link>
        </nav>
        {l.items.length ? (
          <ul className="recipe-grid">
            {l.items.map((x: Recipe, i: number) => <li key={x.url}><RecipeCard x={card(x)} eager={i < 3} sampleLabel={r.sample ? R.sampleChip : undefined} /></li>)}
          </ul>
        ) : <Empty lang={lang} title={R.emptyTitle} body={R.tagEmpty} href={BASE[lang]} />}
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

// The recipe page's tags (facet mode): chip links in group order, the group as a hidden prefix ("Season: Summer"),
// at most 8 shown and the rest behind "Show all tags" (a <details>, so it works without script).
const MAX_TAGS = 8;
function FacetTags({ r, x, lang }: { r: any; x: Recipe; lang: Lang }) {
  const R = dict(lang).recipes;
  const chip = (f: any) => (
    <Link key={f.tag} className="ds-chip" href={r.tagUrl(lang, x.tagSlugs[x.facets.indexOf(f)])}>
      <span className="ds-sr">{R.groups[f.group]}: </span>{f.label}
    </Link>
  );
  const first = x.facets.slice(0, MAX_TAGS), rest = x.facets.slice(MAX_TAGS);
  return (
    <div className="ds-post-tags recipe-tags">
      <span className="ds-label-large recipe-tags-label">{R.tags}</span>
      {first.map(chip)}
      {rest.length > 0 && <details className="recipe-more-tags"><summary className="ds-btn text">{R.showAllTags}</summary>{rest.map(chip)}</details>}
    </div>
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
            {r.facetMode ? (x.facets.length > 0 && <FacetTags r={r} x={x} lang={lang} />)
              : x.tags.length > 0 && <div className="ds-post-tags">{x.tags.map((tg: string, i: number) => <Link key={tg} className="ds-chip" href={r.tagUrl(lang, x.tagSlugs[i])}>{tg}</Link>)}</div>}
          </header>
          {x.photo && <figure className="ds-post-cover recipe-photo"><Photo photo={x.photo} alt={x.imageAlt} sizes="(min-width: 1024px) 60rem, 100vw" eager /><figcaption className="recipe-photo-credit">{dict(lang).recipes.photoCredit}</figcaption></figure>}
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
