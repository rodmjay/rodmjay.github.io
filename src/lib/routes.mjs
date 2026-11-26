// Every page's twin in the other language, for the EN/ES menu and hreflang. A page with no twin falls back to the
// other language's section index (the menu does that on its own).
import { loadBlog } from "./blog.mjs";
import { loadRecipes } from "./recipes.mjs";
import { loadQuotes, quoteUrl } from "./quotes.mjs";
import archetypes from "../rvp/archetypes.json" with { type: "json" };

let memo;
export function altMap() {
  return (memo ||= (async () => {
    const map = { "/": "/es/", "/es/": "/", "/privacy/": "/privacy/es/", "/privacy/es/": "/privacy/",
      "/remove/": "/es/remove/", "/es/remove/": "/remove/", "/remove/confirm/": "/es/remove/confirm/", "/es/remove/confirm/": "/remove/confirm/",
      "/quotes/": "/es/quotes/", "/es/quotes/": "/quotes/",
      "/about/": "/es/about/", "/es/about/": "/about/", };
    const blog = await loadBlog();
    for (const l of blog.lists) map[l.path] = l.otherPath;
    for (const p of blog.posts) if (p.url) map[p.url] = p.twinUrl;
    const recipes = await loadRecipes();
    for (const l of recipes.lists) map[l.path] = l.otherPath;
    for (const r of recipes.recipes) map[r.url] = r.twinUrl;
    for (const q of (await loadQuotes()).quotes) { map[quoteUrl("en", q.slug)] = quoteUrl("es", q.slug); map[quoteUrl("es", q.slug)] = quoteUrl("en", q.slug); }
    // The RVP test (src/rvp), only where it is built (RVP_ON; production after Rod's yes).
    if (process.env.RVP_ON === "1") for (const p of ["", "take/", "result/", ...archetypes.archetypes.map((a) => `${a.slug}/`)]) { map[`/rvp/${p}`] = `/es/rvp/${p}`; map[`/es/rvp/${p}`] = `/rvp/${p}`; }
    return map;
  })());
}
