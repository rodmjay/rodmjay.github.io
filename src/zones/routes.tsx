// Route factories, so each app/ page file is a few lines: the same page in either language, with its static params.
// Every dynamic route is fully static (dynamicParams = false in the page file): unknown paths are the 404.
import { loadBlog, BASE as BLOG } from "@/lib/blog.mjs";
import { loadRecipes, BASE as RECIPES } from "@/lib/recipes.mjs";
import { BlogList, PostPage, listMeta as blogListMeta, postMeta } from "./blog/Blog";
import { RecipeList, RecipePage, listMeta as recipeListMeta, recipeMeta } from "./recipes/Recipes";

type Lang = "en" | "es";
type P<T> = { params: Promise<T> };
/* eslint-disable @typescript-eslint/no-explicit-any */
// Next's static export refuses a dynamic route with no params, so an empty list builds one placeholder that 404s.
const orNone = <T,>(xs: T[], none: T) => (xs.length ? xs : [none]);

export function blogIndex(lang: Lang) {
  return { Page: () => <BlogList path={BLOG[lang]} />, metadata: () => blogListMeta(BLOG[lang]) };
}
export function blogPaged(lang: Lang) {
  const path = (n: string) => `${BLOG[lang]}page/${n}/`;
  return {
    params: async () => orNone((await loadBlog()).lists.filter((l: any) => l.lang === lang && !l.tagKey && l.n > 1).map((l: any) => ({ n: String(l.n) })), { n: "0" }),
    metadata: async ({ params }: P<{ n: string }>) => blogListMeta(path((await params).n)),
    Page: async ({ params }: P<{ n: string }>) => <BlogList path={path((await params).n)} />,
  };
}
export function blogTag(lang: Lang) {
  const path = (tag: string) => `${BLOG[lang]}tag/${tag}/`;
  return {
    params: async () => orNone((await loadBlog()).lists.filter((l: any) => l.lang === lang && l.tagKey && l.n === 1).map((l: any) => ({ tag: l.path.split("/").at(-2) })), { tag: "none" }),
    metadata: async ({ params }: P<{ tag: string }>) => blogListMeta(path((await params).tag)),
    Page: async ({ params }: P<{ tag: string }>) => <BlogList path={path((await params).tag)} />,
  };
}
export function blogTagPaged(lang: Lang) {
  const path = (tag: string, n: string) => `${BLOG[lang]}tag/${tag}/page/${n}/`;
  return {
    params: async () => orNone((await loadBlog()).lists.filter((l: any) => l.lang === lang && l.tagKey && l.n > 1).map((l: any) => ({ tag: l.base.split("/").at(-2), n: String(l.n) })), { tag: "none", n: "0" }),
    metadata: async ({ params }: P<{ tag: string; n: string }>) => { const p = await params; return blogListMeta(path(p.tag, p.n)); },
    Page: async ({ params }: P<{ tag: string; n: string }>) => { const p = await params; return <BlogList path={path(p.tag, p.n)} />; },
  };
}
export function blogPost(lang: Lang) {
  return {
    params: async () => orNone((await loadBlog()).built[lang].map((p: any) => ({ slug: p.slug })), { slug: "none" }),
    metadata: async ({ params }: P<{ slug: string }>) => postMeta(lang, (await params).slug),
    Page: async ({ params }: P<{ slug: string }>) => <PostPage lang={lang} slug={(await params).slug} />,
  };
}

export function recipeIndex(lang: Lang) {
  return { Page: () => <RecipeList path={RECIPES[lang]} />, metadata: () => recipeListMeta(RECIPES[lang]) };
}
export function recipePaged(lang: Lang) {
  const path = (n: string) => `${RECIPES[lang]}page/${n}/`;
  return {
    params: async () => orNone((await loadRecipes()).lists.filter((l: any) => l.lang === lang && !l.tag && l.n > 1).map((l: any) => ({ n: String(l.n) })), { n: "0" }),
    metadata: async ({ params }: P<{ n: string }>) => recipeListMeta(path((await params).n)),
    Page: async ({ params }: P<{ n: string }>) => <RecipeList path={path((await params).n)} />,
  };
}
export function recipeTag(lang: Lang) {
  const path = (tag: string) => `${RECIPES[lang]}tag/${tag}/`;
  return {
    params: async () => orNone((await loadRecipes()).lists.filter((l: any) => l.lang === lang && l.tag && l.n === 1).map((l: any) => ({ tag: l.tag.slug })), { tag: "none" }),
    metadata: async ({ params }: P<{ tag: string }>) => recipeListMeta(path((await params).tag)),
    Page: async ({ params }: P<{ tag: string }>) => <RecipeList path={path((await params).tag)} />,
  };
}
export function recipeTagPaged(lang: Lang) {
  const path = (tag: string, n: string) => `${RECIPES[lang]}tag/${tag}/page/${n}/`;
  return {
    params: async () => orNone((await loadRecipes()).lists.filter((l: any) => l.lang === lang && l.tag && l.n > 1).map((l: any) => ({ tag: l.tag.slug, n: String(l.n) })), { tag: "none", n: "0" }),
    metadata: async ({ params }: P<{ tag: string; n: string }>) => { const p = await params; return recipeListMeta(path(p.tag, p.n)); },
    Page: async ({ params }: P<{ tag: string; n: string }>) => { const p = await params; return <RecipeList path={path(p.tag, p.n)} />; },
  };
}
export function recipe(lang: Lang) {
  return {
    params: async () => orNone((await loadRecipes()).byLang[lang].map((r: any) => ({ slug: r.slug })), { slug: "none" }),
    metadata: async ({ params }: P<{ slug: string }>) => recipeMeta(lang, (await params).slug),
    Page: async ({ params }: P<{ slug: string }>) => <RecipePage lang={lang} slug={(await params).slug} />,
  };
}
