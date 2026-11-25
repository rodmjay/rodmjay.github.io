// Every page's twin in the other language, for the EN/ES menu and hreflang. A page with no twin falls back to the
// other language's section index (the menu does that on its own).
import { loadBlog } from "./blog.mjs";
import { loadRecipes } from "./recipes.mjs";

let memo;
export function altMap() {
  return (memo ||= (async () => {
    const map = { "/": "/es/", "/es/": "/", "/privacy/": "/privacy/es/", "/privacy/es/": "/privacy/",
      "/quotes/": "/es/quotes/", "/es/quotes/": "/quotes/", };
    const blog = await loadBlog();
    for (const l of blog.lists) map[l.path] = l.otherPath;
    for (const p of blog.posts) if (p.url) map[p.url] = p.twinUrl;
    const recipes = await loadRecipes();
    for (const l of recipes.lists) map[l.path] = l.otherPath;
    for (const r of recipes.recipes) map[r.url] = r.twinUrl;
    return map;
  })());
}
