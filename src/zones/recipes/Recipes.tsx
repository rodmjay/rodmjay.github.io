// The Family Recipe Book's pages (Designer's homey spec, design/specs/recipe-book-homey.md, 11/27; Rod: "treat it like a
// normal recipe page on the internet ... very homey, like a blog, very easy to navigate"): the home (welcome, browse by
// course, latest recipes), All recipes (search and the tag filters), the course and tag pages, About, and the recipe page
// (byline, hero photo, meta bar, Jump to recipe / Print / Save, the recipe card with checkable ingredients and numbered
// steps, tags, related recipes, Recipe structured data). The data and its checks are src/lib/recipes.mjs.
import Link from "next/link";
import { notFound } from "next/navigation";
import { dict, HTML_LANG, SITE, t } from "@/lib/site.mjs";
import { loadRecipes, ABOUT, ALL, BASE, COURSES, FEATURED, PER_PAGE, splitAmount } from "@/lib/recipes.mjs";
import { bookMeta } from "./RecipeLayout";
import { PrintButton } from "./PrintButton";
import { SaveButton } from "./SaveButton";
import { Photo, RecipeCard, type CardData } from "./Card";
import { RecipeBrowser, type BrowserWords, type FacetGroup } from "./RecipeBrowser";

type Lang = "en" | "es";
/* eslint-disable @typescript-eslint/no-explicit-any */
type Recipe = any;
const SAVE_ON = process.env.RECIPES_SAVE === "1";
const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// "1 hr 10 min" / "1 h 10 min"; under an hour "45 min".
function duration(lang: Lang, m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60, hu = lang === "en" ? "hr" : "h";
  return r ? `${h} ${hu} ${r} min` : `${h} ${hu}`;
}
const longDate = (lang: Lang, iso: string) => {
  try { return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-419", { dateStyle: "long", timeZone: "America/Denver" }).format(new Date(iso)); }
  catch { return iso.slice(0, 10); }
};
function cardMeta(r: Recipe) {
  const R = dict(r.lang).recipes;
  if (r.minutes != null && r.servings) return fmt(R.card, { t: duration(r.lang, r.minutes), s: r.servings });
  if (r.minutes != null) return duration(r.lang, r.minutes);
  if (r.servings) return fmt(R.cardServes, { s: r.servings });
  return "";
}
const card = (r: Recipe): CardData => ({ slug: r.slug, url: r.url, title: r.title, meta: cardMeta(r), photo: r.photo, imageAlt: r.imageAlt,
  tags: r.facets.map((f: any) => f.tag), search: r.search });
// The course's plural label (Designer 11/27) when there is one, else the tag's own label.
const tagLabel = (lang: Lang, tag: string, fallback: string) => dict(lang).recipes.courses[tag] || fallback;

function facetGroups(r: any, lang: Lang): FacetGroup[] {
  const R = dict(lang).recipes;
  return r.facetGroups(lang).map((g: any) => ({ group: g.group, label: R.groups[g.group],
    values: g.values.map((v: any) => ({ tag: v.tag, label: v.label, url: v.url, chip: v.count >= 2 })) }));
}

function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="rb-crumbs" aria-label="Breadcrumb">
      <ol>{items.map((c, i) => <li key={i}>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>)}</ol>
    </nav>
  );
}

// The course links on top of the list pages (Designer: "course links on top").
async function CourseLinks({ lang, current }: { lang: Lang; current?: string }) {
  const r = await loadRecipes(), R = dict(lang).recipes;
  return (
    <ul className="rb-courses">
      <li><Link className="rb-chip" href={ALL[lang]} aria-current={current ? undefined : "page"}>{R.allRecipes}</Link></li>
      {r.courseCounts(lang).map((c: any) => (
        <li key={c.tag}><Link className="rb-chip" href={c.url} aria-current={current === c.slug ? "page" : undefined}>{R.courses[c.tag]}</Link></li>
      ))}
    </ul>
  );
}

// ---- Home ----
export async function homeMeta(lang: Lang) {
  const R = dict(lang).recipes, r = await loadRecipes();
  const hero = r.byLang[lang].find((x: Recipe) => x.slug === FEATURED[0]);
  return bookMeta({ lang, description: R.description, path: BASE[lang], alt: BASE[lang === "en" ? "es" : "en"], noindex: r.sample,
    image: hero?.photo?.jpg, imageAlt: hero?.imageAlt });
}

export async function BookHome({ lang }: { lang: Lang }) {
  const r = await loadRecipes(), R = dict(lang).recipes;
  const list = r.byLang[lang];
  const hero = FEATURED.map((s) => list.find((x: Recipe) => x.slug === s)).find(Boolean) || list[0];
  return (
    <main id="main" className="rb-wrap rb-home">
      <section className="rb-welcome" aria-labelledby="rb-welcome-h">
        {hero?.photo && <Link href={hero.url} tabIndex={-1} aria-hidden="true" className="rb-welcome-photo"><Photo photo={hero.photo} alt="" sizes="(min-width: 860px) 560px, 100vw" eager /></Link>}
        <div>
          <p className="rb-kicker">{R.welcomeKicker}{hero ? `: ${hero.title}` : ""}</p>
          <h1 id="rb-welcome-h">{R.welcomeTitle}</h1>
          <p className="rb-welcome-body">{R.welcomeBody}</p>
          <p className="rb-acts">
            {hero && <Link className="rb-btn" href={hero.url}>{R.tryFavorite}</Link>}
            <Link className="rb-btn o" href={ALL[lang]}>{R.browseAll}</Link>
          </p>
        </div>
      </section>
      <h2 className="rb-sec">{R.browseByCourse}</h2>
      <ul className="rb-cats">
        {r.courseCounts(lang).map((c: any) => (
          <li key={c.tag}><Link className="rb-cat" href={c.url}><b>{R.courses[c.tag]}</b><span>{fmt(R.countRecipes, { n: c.count })}</span></Link></li>
        ))}
      </ul>
      <h2 className="rb-sec">{R.latest}</h2>
      <ul className="rb-grid">{list.slice(0, 6).map((x: Recipe) => <li key={x.slug}><RecipeCard x={card(x)} /></li>)}</ul>
      <p className="rb-center"><Link className="rb-btn o" href={ALL[lang]}>{R.seeAll}</Link></p>
    </main>
  );
}

// ---- All recipes and the tag (course) pages ----
async function findList(path: string) {
  const r = await loadRecipes();
  const l = r.lists.find((x: any) => x.path === path);
  if (!l) notFound();
  return { r, l };
}

export async function listMeta(path: string) {
  const { r, l } = await findList(path);
  const R = dict(l.lang).recipes;
  const title0 = l.tag ? tagLabel(l.lang, l.tag.key, l.tag.name) : R.allRecipes;
  const title = l.n > 1 ? `${title0} · ${t(l.lang, "recipes.page", { n: l.n, total: l.total })}` : title0;
  return bookMeta({ lang: l.lang, title, description: l.tag ? `${title0}: ${R.description}` : R.description, path: l.path, alt: l.otherPath, noindex: r.sample || !l.items.length });
}

export async function RecipeList({ path }: { path: string }) {
  const { r, l } = await findList(path);
  const lang: Lang = l.lang, R = dict(lang).recipes;
  if (!l.tag) {
    const w: BrowserWords = {
      count: R.count, countOne: R.countOne, clearAll: R.clearAll, clearAllFilters: R.clearAllFilters, remove: R.remove, selected: R.selected,
      noMatch: R.noMatch, emptyTitle: R.emptyTitle, emptyBody: R.emptyBody, filterHeading: R.filterHeading, moreFilters: R.moreFilters,
      newer: R.newer, older: R.older, page: R.page, pages: R.pages, searchFor: R.searchFor, searchClear: R.searchClear,
    };
    return (
      <main id="main" className="rb-wrap rb-list">
        <Crumbs items={[{ href: BASE[lang], label: R.home }, { label: R.allRecipes }]} />
        <h1>{R.allRecipes}</h1>
        <p className="rb-lede">{R.allIntro}</p>
        <CourseLinks lang={lang} />
        <RecipeBrowser base={ALL[lang]} items={r.byLang[lang].map(card)} groups={facetGroups(r, lang)} page0={l.n} perPage={PER_PAGE} w={w} />
      </main>
    );
  }
  const label = tagLabel(lang, l.tag.key, l.tag.name);
  const pageUrl = (n: number) => (n === 1 ? l.base : `${l.base}page/${n}/`);
  const count = r.lists.filter((x: any) => x.base === l.base).reduce((k: number, x: any) => k + x.items.length, 0);
  return (
    <main id="main" className="rb-wrap rb-list">
      <Crumbs items={[{ href: BASE[lang], label: R.home }, { href: ALL[lang], label: R.allRecipes }, { label }]} />
      <h1>{label}</h1>
      <p className="rb-lede">{COURSES.includes(l.tag.key) ? fmt(R.countRecipes, { n: count }) : `${R.groups[l.tag.group]} · ${fmt(R.countRecipes, { n: count })}`}</p>
      <CourseLinks lang={lang} current={l.tag.slug} />
      {l.items.length ? (
        <ul className="rb-grid">{l.items.map((x: Recipe, i: number) => <li key={x.url}><RecipeCard x={card(x)} eager={i < 3} heading="h2" /></li>)}</ul>
      ) : <p className="rb-lede">{R.tagEmpty}</p>}
      {l.total > 1 && (
        <nav className="rb-pager" aria-label={R.pages}>
          {l.n > 1 ? <Link className="rb-btn o" href={pageUrl(l.n - 1)}>← {R.newer}</Link> : null}
          <span>{t(lang, "recipes.page", { n: l.n, total: l.total })}</span>
          {l.n < l.total ? <Link className="rb-btn o" href={pageUrl(l.n + 1)}>{R.older} →</Link> : null}
        </nav>
      )}
    </main>
  );
}

// ---- About ----
export async function aboutMeta(lang: Lang) {
  const R = dict(lang).recipes, r = await loadRecipes();
  return bookMeta({ lang, title: R.about, description: R.aboutBody[0], path: ABOUT[lang], alt: ABOUT[lang === "en" ? "es" : "en"], noindex: r.sample });
}

export function BookAbout({ lang }: { lang: Lang }) {
  const R = dict(lang).recipes;
  return (
    <main id="main" className="rb-wrap rb-about">
      <Crumbs items={[{ href: BASE[lang], label: R.home }, { label: R.about }]} />
      <h1>{R.aboutTitle}</h1>
      {R.aboutBody.map((p: string) => <p key={p}>{p}</p>)}
      <p className="rb-soft">{R.aiPhotos}</p>
      <p className="rb-acts"><Link className="rb-btn" href={ALL[lang]}>{R.browseAll}</Link></p>
    </main>
  );
}

// ---- A recipe ----
async function findRecipe(lang: Lang, slug: string) {
  const r = await loadRecipes();
  const x = r.byLang[lang].find((y: Recipe) => y.slug === slug);
  if (!x) notFound();
  return { r, x };
}

export async function recipeMeta(lang: Lang, slug: string) {
  const { r, x } = await findRecipe(lang, slug);
  return bookMeta({ lang, title: x.title, description: x.dek, path: x.url, alt: x.twinUrl, noindex: r.sample, type: "article", image: x.photo?.jpg, imageAlt: x.imageAlt });
}

// Recipe structured data (schema.org/Recipe, Google's required and recommended fields). A data block, not a script;
// "<" escaped so no text can close the tag.
function jsonLd(x: Recipe, lang: Lang) {
  const R = dict(lang).recipes;
  const abs = (u: string) => new URL(u, SITE).href;
  const big = x.photo ? x.photo.srcset.split(", ").map((s: string) => s.split(" ")[0]).pop() : null;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org", "@type": "Recipe", name: x.title, description: x.dek, url: `${SITE}${x.url}`, inLanguage: HTML_LANG[lang],
    ...(x.photo ? { image: [abs(big || x.photo.jpg), abs(x.photo.jpg)] } : {}),
    author: { "@type": "Organization", name: R.name, url: `${SITE}${BASE[lang]}` },
    datePublished: x.updatedAt.slice(0, 10), dateModified: x.updatedAt,
    ...(x.servings ? { recipeYield: String(x.servings) } : {}),
    ...(x.minutes != null ? { totalTime: `PT${x.minutes}M` } : {}),
    ...(x.course ? { recipeCategory: x.course.label } : {}),
    ...(x.cuisine ? { recipeCuisine: x.cuisine.label } : {}),
    keywords: x.facets.map((f: any) => f.label).join(", "),
    recipeIngredient: x.ingredients.filter((l: string) => !l.startsWith("## ")),
    recipeInstructions: x.steps.map((s: string, i: number) => ({ "@type": "HowToStep", position: i + 1, text: s })),
  };
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// "Serve it with" text with the book's own recipes linked where their titles appear.
function linked(text: string, lang: Lang, all: Recipe[], self: string) {
  const low = text.toLowerCase();
  const hits: { at: number; end: number; x: Recipe }[] = [];
  for (const x of [...all].filter((y) => y.slug !== self).sort((a, b) => b.title.length - a.title.length)) {
    const at = low.indexOf(x.title.toLowerCase());
    if (at >= 0 && !hits.some((h) => at < h.end && at + x.title.length > h.at)) hits.push({ at, end: at + x.title.length, x });
  }
  hits.sort((a, b) => a.at - b.at);
  const out: React.ReactNode[] = [];
  let i = 0;
  for (const h of hits) { out.push(text.slice(i, h.at)); out.push(<Link key={h.x.slug} href={h.x.url}>{text.slice(h.at, h.end)}</Link>); i = h.end; }
  out.push(text.slice(i));
  return out;
}

export async function RecipePage({ lang, slug }: { lang: Lang; slug: string }) {
  const { r, x } = await findRecipe(lang, slug);
  const R = dict(lang).recipes;
  const list = r.byLang[lang];
  const related = x.related.map((s: string) => list.find((y: Recipe) => y.slug === s)).filter(Boolean);
  const course = x.course ? { href: `${BASE[lang]}tag/${x.course.tag.replace(":", "-")}/`, label: tagLabel(lang, x.course.tag, x.course.label) } : null;
  // Ingredient lines starting "## " are sub-headings (Health Agent 11/27): a small heading over its own list, no checkbox.
  const groups: { label: string; items: string[] }[] = [];
  for (const line of x.ingredients) {
    if (line.startsWith("## ")) { groups.push({ label: line.slice(3).trim(), items: [] }); continue; }
    if (!groups.length) groups.push({ label: "", items: [] });
    groups[groups.length - 1].items.push(line);
  }
  let n = 0;
  const ingredients = groups.map((g, gi) => (
    <div key={gi} className="rb-ing-block">
      {g.label && <h4 className="rb-ing-h">{g.label}</h4>}
      <ul className="rb-ing">
        {g.items.map((line) => {
          const id = `ing-${n++}`, { amount, rest } = splitAmount(line);
          return <li key={id}><input type="checkbox" id={id} /><label htmlFor={id}>{amount && <strong>{amount}</strong>}{rest}</label></li>;
        })}
      </ul>
    </div>
  ));
  const byline = [x.credit, fmt(R.updated, { date: longDate(lang, x.updatedAt) })].filter(Boolean).join(" · ");
  return (
    <main id="main" className="rb-wrap rb-post">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(x, lang) }} />
      <Crumbs items={[{ href: BASE[lang], label: R.home }, ...(course ? [course] : [{ href: ALL[lang], label: R.recipesCrumb }]), { label: x.title }]} />
      <article>
        <h1>{x.title}</h1>
        <p className="rb-by">{byline}</p>
        {x.photo && (
          <figure className="rb-hero">
            <Photo photo={x.photo} alt={x.imageAlt} sizes="(min-width: 1040px) 1000px, 100vw" eager />
            <figcaption>{R.photoCredit}</figcaption>
          </figure>
        )}
        <p className="rb-intro">{x.dek}</p>
        <dl className="rb-bar-meta">
          {x.minutes != null && <div><dt>{R.totalTime}</dt><dd>{duration(lang, x.minutes)}</dd></div>}
          {x.servings && <div><dt>{R.servingsLabel}</dt><dd>{x.servings}</dd></div>}
          <div><dt>{R.course}</dt><dd>{x.course ? x.course.label : "—"}</dd></div>
          <div><dt>{R.cuisine}</dt><dd>{x.cuisine ? x.cuisine.label : R.cuisineDefault}</dd></div>
        </dl>
        <p className="rb-acts rb-noprint">
          <a className="rb-btn" href="#recipe">{R.jump} ↓</a>
          <PrintButton label={R.print} />
          {SAVE_ON && <SaveButton slug={x.slug} save={R.save} saved={R.saved} />}
        </p>
        <section className="rb-recipe" id="recipe" aria-labelledby="rb-recipe-h">
          <h2 id="rb-recipe-h" className="rb-recipe-title">{x.title}</h2>
          <div className="rb-cols">
            <div>
              <h3 className="rb-col-h">{R.ingredients}</h3>
              {ingredients}
            </div>
            <div>
              <h3 className="rb-col-h">{R.instructions}</h3>
              <ol className="rb-steps">{x.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
              {x.tip && <p className="rb-tip"><b>{R.tipLabel}</b> {x.tip}</p>}
              {(x.serveWith || x.pairsWith) && (
                <dl className="rb-serve">
                  {x.serveWith && <><dt>{R.serveItWith}</dt><dd>{linked(x.serveWith, lang, list, x.slug)}</dd></>}
                  {x.pairsWith && <><dt>{R.pairsWith}</dt><dd>{linked(x.pairsWith, lang, list, x.slug)}</dd></>}
                </dl>
              )}
            </div>
          </div>
        </section>
        {x.facets.length > 0 && (
          <nav className="rb-tags rb-noprint" aria-label={R.moreTags}>
            {x.facets.map((f: any, i: number) => <Link key={f.tag} className="rb-chip" href={r.tagUrl(lang, x.tagSlugs[i])}>{tagLabel(lang, f.tag, f.label)}</Link>)}
          </nav>
        )}
      </article>
      {related.length > 0 && (
        <section className="rb-related rb-noprint" aria-labelledby="rb-related-h">
          <h2 className="rb-sec" id="rb-related-h">{R.related}</h2>
          <ul className="rb-grid">{related.map((y: Recipe) => <li key={y.slug}><RecipeCard x={card(y)} /></li>)}</ul>
        </section>
      )}
    </main>
  );
}
