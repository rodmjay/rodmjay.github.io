import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The Family Recipe Book (Designer's homey spec, design/specs/recipe-book-homey.md, 11/27), against its Definition of DONE:
// home, All recipes, a course page, a recipe page and the print view; search (title and ingredient); the course links,
// breadcrumb and related recipes; Jump to recipe, Print and the ingredient checkboxes; Recipe structured data; the sitemap;
// its own chrome; EN and ES; phones. The data is data/recipes/recipes.json (143 recipes in both languages at the time).
test.skip(!existsSync("out/recipes/all/index.html"), "the recipe book isn't built");
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

const rows: { slug: string; lang: string; title: string; ingredients: string[]; facets?: { tag: string }[] }[] = JSON.parse(readFileSync("data/recipes/recipes.json", "utf8")).rows;
const en = rows.filter((r) => r.lang === "en");
const TOTAL = en.length;

test("home: welcome, browse by course with counts, latest recipes, see all", async ({ page }) => {
  await page.goto("/recipes/");
  await expect(page.locator("html")).toHaveAttribute("data-brand", "recipes");
  expect(await page.title()).toBe("Family Recipe Book");
  await expect(page.locator("h1")).toHaveText("Home cooking we grew up on");
  await expect(page.locator(".rb-welcome img")).toBeVisible();
  const cats = page.locator(".rb-cat");
  expect(await cats.count()).toBeGreaterThanOrEqual(6);
  await expect(cats.first()).toContainText("Main dishes");
  await expect(cats.first()).toContainText(/\d+ recipes/);
  await expect(page.locator(".rb-grid .rb-card")).toHaveCount(6);
  await expect(page.getByRole("link", { name: "See all recipes" })).toHaveAttribute("href", "/recipes/all/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
});

// Its own chrome (Definition of DONE 5): no personal-site shell, and "Rod Johnson" nowhere but About and Privacy.
for (const path of ["/recipes/", "/recipes/all/", "/recipes/tag/course-main/", "/recipes/chicken-piccata/", "/es/recipes/", "/es/recipes/chicken-piccata/"]) {
  test(`own chrome: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("header.bar, nav.bar-links, footer.foot")).toHaveCount(0);
    expect(await page.title()).toMatch(/(Family Recipe Book|Recetario familiar)$/);
    expect(await page.locator("body").innerText()).not.toMatch(/Rod Johnson|rodmjay\.com/);
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /^\/recipes\/icons\//);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator(".rb-foot")).toContainText(/No tracking cookies\.|Sin cookies de rastreo\./);
  });
}

test("About names who keeps the book and how to reach them (Compliance)", async ({ page }) => {
  await page.goto("/recipes/about/");
  await expect(page.locator("main")).toContainText("Rod Johnson");
  await expect(page.getByRole("link", { name: "Get in touch" })).toHaveAttribute("href", "/about/#contact");
});

test("search from the header: title and ingredient matches, then clear", async ({ page, isMobile }) => {
  await page.goto("/recipes/");
  await page.getByRole("searchbox", { name: "Search recipes" }).fill("capers");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/all\/\?q=capers$/);
  await expect(page.locator(".rb-summary[data-ready]")).toHaveCount(1);
  // "capers" is an ingredient, not a title word: Chicken Piccata has it.
  await expect(page.locator(".rb-card-title", { hasText: "Chicken Piccata" })).toHaveCount(1);
  const withCapers = en.filter((r) => r.ingredients.some((i) => !i.startsWith("## ") && /capers/i.test(i)) || /capers/i.test(r.title)).length;
  await expect(page.locator(".rb-count")).toContainText(`${withCapers} recipe`);
  await expect(page.locator('meta[name="robots"][data-filtered]')).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page).toHaveURL(/\/recipes\/all\/$/);
  await expect(page.locator(".rb-count")).toContainText(`${TOTAL} recipes`);
  test.skip(isMobile, "accents: one check is enough");
  await page.goto("/es/recipes/all/?q=jalapeno");
  expect(await page.locator(".rb-card").count()).toBeGreaterThan(0);
});

test("All recipes: course links on top, filters under a collapsed More filters, Back restores", async ({ page }) => {
  await page.goto("/recipes/all/");
  await expect(page.locator(".rb-courses a").first()).toHaveText("All recipes");
  const more = page.locator("details.rb-more.rb-js");
  await expect(more).not.toHaveAttribute("open", "");
  await more.locator("summary").click();
  await more.locator(".rb-chip", { hasText: "Chicken" }).first().click();
  await expect(page).toHaveURL(/\?tags=main:chicken$/);
  const n = await page.locator(".rb-card").count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(24);
  await page.goBack();
  await expect(page.locator(".rb-count")).toContainText(`${TOTAL} recipes`);
});

test("a course page from the nav: plural label, count, breadcrumb", async ({ page, isMobile }) => {
  test.skip(isMobile, "the nav is in the Menu sheet on phones (tested below)");
  await page.goto("/recipes/");
  await page.locator(".rb-nav").getByRole("link", { name: "Main dishes" }).click();
  await expect(page).toHaveURL(/\/recipes\/tag\/course-main\/$/);
  await expect(page.locator("h1")).toHaveText("Main dishes");
  const mains = en.filter((r) => r.facets?.some((f) => f.tag === "course:main")).length;
  await expect(page.locator(".rb-lede")).toHaveText(`${mains} recipes`);
  await expect(page.locator(".rb-crumbs a")).toHaveText(["Home", "All recipes"]);
});

test("recipe page: byline, photo, meta bar, jump, print, checkable ingredients, numbered steps, related", async ({ page }) => {
  await page.goto("/recipes/chicken-piccata/");
  await expect(page.locator(".rb-crumbs a")).toHaveText(["Home", "Main dishes"]);
  await expect(page.locator(".rb-by")).toContainText("Updated");
  await expect(page.locator(".rb-hero img")).toHaveAttribute("alt", /.+/);
  await expect(page.locator(".rb-hero figcaption")).toHaveText("AI-generated image");
  await expect(page.locator(".rb-bar-meta dt")).toHaveText(["Total time", "Servings", "Course", "Cuisine"]);
  await page.getByRole("link", { name: /Jump to recipe/ }).click();
  await expect(page).toHaveURL(/#recipe$/);
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  const first = page.locator(".rb-ing li").first();
  await first.locator("label").click();
  await expect(first.locator("input")).toBeChecked();
  await expect(page.locator(".rb-steps li").first()).toBeVisible();
  const related = page.locator(".rb-related .rb-card");
  await expect(related).toHaveCount(3);
  for (const a of await related.locator("a").all()) expect(await a.getAttribute("href")).toMatch(/^\/recipes\/[a-z0-9-]+\/$/);
  // Save waits for Security's pass on its storage key (RECIPES_SAVE=1).
  if (process.env.RECIPES_SAVE !== "1") await expect(page.getByRole("button", { name: /Save/ })).toHaveCount(0);
});

test("ingredient sub-headings: a small heading, no checkbox, never a bare ## line", async ({ page }) => {
  const r = en.find((x) => x.ingredients.some((i) => i.startsWith("## ")))!;
  await page.goto(`/recipes/${r.slug}/`);
  await expect(page.locator(".rb-ing-h")).toHaveCount(r.ingredients.filter((i) => i.startsWith("## ")).length);
  await expect(page.locator(".rb-ing input")).toHaveCount(r.ingredients.filter((i) => !i.startsWith("## ")).length);
  expect(await page.locator(".rb-recipe").innerText()).not.toContain("##");
});

test("Recipe structured data on three recipes", async ({ page }) => {
  for (const slug of ["chicken-piccata", "gallo-pinto", en[en.length - 1].slug]) {
    await page.goto(`/recipes/${slug}/`);
    const d = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(d["@type"]).toBe("Recipe");
    expect(d.name).toBeTruthy();
    // Own-origin images, said to be AI-generated (Security and Compliance 11/27).
    expect(d.image.length).toBeGreaterThan(0);
    for (const i of d.image) { expect(i["@type"]).toBe("ImageObject"); expect(i.url).toMatch(/^https:\/\/rodmjay\.com\/recipes\/images\//); expect(i.creditText).toBe("AI-generated image"); }
    expect(d).not.toHaveProperty("nutrition");
    expect(d).not.toHaveProperty("aggregateRating");
    expect(d.recipeIngredient.length).toBeGreaterThan(0);
    expect(d.recipeIngredient.some((i: string) => i.startsWith("## "))).toBe(false);
    expect(d.recipeInstructions[0]["@type"]).toBe("HowToStep");
    expect(d.author.name).toBe("Family Recipe Book");
  }
});

test("the sitemap lists every recipe in both languages with hreflang", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const r of en) {
    expect(xml, r.slug).toContain(`/recipes/${r.slug}/</loc>`);
    expect(xml, r.slug).toContain(`/es/recipes/${r.slug}/</loc>`);
  }
  expect(xml).toContain('hreflang="es-419" href="https://rodmjay.com/es/recipes/chicken-piccata/"');
});

test("Spanish: the same book, its own words, the language menu goes to the twin", async ({ page, isMobile }) => {
  await page.goto("/es/recipes/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(page.locator("h1")).toHaveText("La cocina casera con la que crecimos");
  await page.goto("/es/recipes/all/");
  await expect(page.locator(".rb-count")).toContainText(`${TOTAL} recetas`);
  test.skip(isMobile, "the bar's language menu is in the Menu sheet on phones");
  await page.goto("/recipes/chicken-piccata/");
  await page.locator(".rb-lang-bar select").selectOption("es");
  await expect(page).toHaveURL(/\/es\/recipes\/chicken-piccata\/$/);
  await expect(page.locator(".rb-bar-meta dt").first()).toHaveText("Tiempo total");
});

test("phone: the Menu sheet has the links and the language menu; no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ["/recipes/", "/recipes/all/", "/recipes/chicken-piccata/"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBe(375);
  }
  await page.getByRole("button", { name: "Menu" }).click();
  const sheet = page.locator(".rb-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Desserts" })).toBeVisible();
  await expect(sheet.locator("select")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  // Every control in the bar has a 48px hit area.
  for (const el of await page.locator(".rb-bar a, .rb-bar button, .rb-bar input").all()) {
    if (!(await el.isVisible())) continue;
    const box = (await el.boundingBox())!;
    expect(Math.round(box.height)).toBeGreaterThanOrEqual(48);
  }
});

test("print: the recipe only", async ({ page }) => {
  await page.goto("/recipes/chicken-piccata/");
  await page.emulateMedia({ media: "print" });
  for (const sel of [".rb-bar", ".rb-foot", ".rb-related", ".rb-acts", ".rb-crumbs", ".rb-tags"]) await expect(page.locator(sel).first(), sel).toBeHidden();
  await expect(page.locator(".rb-steps")).toBeVisible();
  const h = await page.locator(".rb-hero img").evaluate((i) => i.getBoundingClientRect().height);
  expect(h).toBeLessThanOrEqual(181);
});

test.describe("without script", () => {
  test.use({ javaScriptEnabled: false });
  test("All recipes is the plain list, and the filter chips are links to the tag pages", async ({ page }) => {
    await page.goto("/recipes/all/");
    await expect(page.locator(".rb-card")).toHaveCount(Math.min(24, TOTAL));
    await expect(page.locator("details.rb-more.rb-nojs a.rb-chip").first()).toHaveAttribute("href", /^\/recipes\/tag\/[a-z0-9-]+\/$/);
    await page.goto("/recipes/chicken-piccata/");
    await expect(page.locator(".rb-steps li").first()).toBeVisible();
  });
});

// Save (RECIPES_SAVE=1, after Security's pass, 11/27): only slugs are stored; a bad stored value is dropped silently.
test("Save keeps a validated list of slugs", async ({ page }) => {
  test.skip(process.env.RECIPES_SAVE !== "1", "Save is off in this build");
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("recipes-saved", JSON.stringify(["<img src=x>", "gallo-pinto", "gallo-pinto", 7])); sessionStorage.setItem("seeded", "1"); } } catch {} });
  await page.goto("/recipes/chicken-piccata/");
  const btn = page.getByRole("button", { name: /Save/ });
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem("recipes-saved")))!)).toEqual(["chicken-piccata", "gallo-pinto"]);
  await page.reload();
  await expect(page.getByRole("button", { name: /Saved/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/privacy/");
  await expect(page.locator("main")).toContainText("recipes-saved");
});
