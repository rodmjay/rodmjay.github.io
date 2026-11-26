import { expect, test, type Locator, type Page } from "@playwright/test";

// Recipe tag filters (Designer's spec, design/specs/rodmjay-recipes.md, "Update 2026-11-26: tags and filters"), over the
// local fixture (_content/recipes/sample.json, six dishes):
//   season:summer  skewers, mango salsa               season:winter  arroz con pollo, turkey, sweet potato
//   diet:vegetarian  gallo pinto, mango salsa, sweet potato      occasion:christmas  turkey, sweet potato
//   occasion:weeknight  gallo pinto, arroz con pollo             cuisine:mexican  mango salsa only (tag page, no chip)
// Desktop picks chips in the card above the grid; the phone opens the "Filter" sheet.

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(".recipe-summary[data-ready]")).toBeAttached(); // hydrated: chips answer clicks
}
// The chip block for this size: the card on desktop, the sheet (opened if needed) on the phone.
async function chips(page: Page, isMobile: boolean): Promise<Locator> {
  if (!isMobile) return page.locator("section.recipe-filters");
  const sheet = page.locator("dialog.recipe-sheet");
  if (!(await sheet.isVisible())) await page.locator(".recipe-filter-open button").click();
  await expect(sheet).toBeVisible();
  return sheet;
}
const chip = (scope: Locator, tag: string) => scope.locator(`button.ds-chip[data-tag="${tag}"]`);
async function pick(page: Page, isMobile: boolean, tag: string) { await chip(await chips(page, isMobile), tag).click(); }
async function closeSheet(page: Page, isMobile: boolean) {
  if (!isMobile) return;
  const sheet = page.locator("dialog.recipe-sheet");
  if (await sheet.isVisible()) { await sheet.locator(".recipe-sheet-bar .ds-btn:not(.text)").click(); await expect(sheet).toBeHidden(); }
}
const count = (page: Page) => page.locator(".recipe-count");
const cards = (page: Page) => page.locator(".recipe-grid .recipe-card");
const query = (page: Page) => new URL(page.url()).searchParams.get("tags");

test("OR inside a group, AND across groups, with the right counts", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  await expect(count(page)).toHaveText("6 recipes");
  await pick(page, isMobile, "season:summer");
  await expect(count(page)).toHaveText("2 recipes");
  await pick(page, isMobile, "season:winter"); // OR: summer or winter
  await expect(count(page)).toHaveText("5 recipes");
  await pick(page, isMobile, "diet:vegetarian"); // AND: (summer or winter) and vegetarian
  await expect(count(page)).toHaveText("2 recipes");
  expect(query(page)).toBe("season:summer,season:winter,diet:vegetarian");
  if (isMobile) await expect(page.locator("dialog.recipe-sheet .recipe-sheet-bar .ds-btn:not(.text)")).toHaveText("Show 2 recipes");
  await closeSheet(page, isMobile);
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).locator(".recipe-card-title")).toHaveText(["Mango Salsa", "Sweet Potato Mash"]);
  const scope = await chips(page, isMobile);
  for (const t of ["season:summer", "season:winter", "diet:vegetarian"]) await expect(chip(scope, t)).toHaveAttribute("aria-pressed", "true");
  await expect(chip(scope, "occasion:party")).toHaveAttribute("aria-pressed", "false");
});

test("a chip with no matches is dimmed, not hidden, and stays put", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const scope = await chips(page, isMobile);
  const weeknight = chip(scope, "occasion:weeknight");
  await expect(weeknight).not.toHaveAttribute("aria-disabled", "true");
  const before = await weeknight.boundingBox();
  await pick(page, isMobile, "season:summer");
  await expect(weeknight).toHaveAttribute("aria-disabled", "true");
  await expect(weeknight).toBeVisible();
  await expect(weeknight).toHaveAccessibleDescription("No recipes with this choice");
  expect(await weeknight.boundingBox()).toEqual(before);
  await expect(chip(scope, "occasion:party")).not.toHaveAttribute("aria-disabled", "true");
  await expect(chip(scope, "season:winter")).not.toHaveAttribute("aria-disabled", "true"); // same group: OR, never dimmed by itself
  await weeknight.click({ force: true }); // does nothing (aria-disabled)
  await expect(count(page)).toHaveText("2 recipes");
  await expect(weeknight).toHaveAttribute("aria-pressed", "false");
  await weeknight.focus();
  await expect(weeknight).toBeFocused();
  // A value used by only one recipe has a tag page but no chip.
  await expect(scope.locator('[data-tag="cuisine:mexican"]')).toHaveCount(0);
});

test("the URL holds the selection: load, reload, back", async ({ page, isMobile }) => {
  await open(page, "/recipes/?tags=season:winter,occasion:christmas");
  await expect(count(page)).toHaveText("2 recipes");
  await expect(page.locator(".recipe-selected")).toHaveText(["Christmas", "Winter"]);
  await page.reload();
  await expect(page.locator(".recipe-summary[data-ready]")).toBeAttached();
  await expect(count(page)).toHaveText("2 recipes");
  await expect(chip(await chips(page, isMobile), "occasion:christmas")).toHaveAttribute("aria-pressed", "true");
  await closeSheet(page, isMobile);

  await open(page, "/recipes/");
  await page.evaluate(() => { (window as any).__stay = 1; });
  await pick(page, isMobile, "season:summer");
  await expect.poll(() => query(page)).toBe("season:summer");
  await pick(page, isMobile, "season:winter");
  await expect.poll(() => query(page)).toBe("season:summer,season:winter");
  await closeSheet(page, isMobile);
  await page.goBack();
  await expect.poll(() => query(page)).toBe("season:summer");
  await expect(count(page)).toHaveText("2 recipes");
  await page.goBack();
  await expect(page).toHaveURL(/\/recipes\/$/);
  await expect(count(page)).toHaveText("6 recipes");
  await page.goForward();
  await expect(count(page)).toHaveText("2 recipes");
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1); // no reload anywhere
});

test("remove one chip, then Clear all", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  await pick(page, isMobile, "season:winter");
  await pick(page, isMobile, "diet:paleo-friendly");
  await closeSheet(page, isMobile);
  await expect(count(page)).toHaveText("2 recipes");
  if (isMobile) await expect(page.locator(".recipe-filter-open button")).toHaveText("Filter (2)");
  await page.getByRole("button", { name: "Remove Winter" }).click();
  await expect(count(page)).toHaveText("4 recipes");
  await expect(page.getByRole("button", { name: "Remove Paleo-friendly" })).toBeFocused();
  await page.locator(".recipe-summary .recipe-clear").click();
  await expect(count(page)).toHaveText("6 recipes");
  await expect(page).toHaveURL(/\/recipes\/$/);
  await expect(page.locator(".recipe-selected")).toHaveCount(0);
  await expect(page.locator(".recipe-summary .recipe-clear")).toBeHidden(); // space kept, not shown
  await expect(page.locator('.recipe-chips [aria-pressed="true"]')).toHaveCount(0);
});

test("empty state: outlined card, Clear all filters", async ({ page }) => {
  await open(page, "/recipes/?tags=season:summer,occasion:christmas");
  await expect(count(page)).toHaveText("0 recipes");
  const empty = page.locator(".recipe-empty");
  await expect(empty.getByRole("heading", { level: 2 })).toHaveText("No recipes match");
  await expect(empty).toContainText("Try fewer choices.");
  await empty.getByRole("button", { name: "Clear all filters" }).click();
  await expect(count(page)).toHaveText("6 recipes");
  await expect(cards(page)).toHaveCount(6);
});

test("phone: one Filter button and a full-height sheet; desktop: the card", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const btn = page.locator(".recipe-filter-open button");
  if (!isMobile) {
    await expect(btn).toBeHidden();
    await expect(page.locator("section.recipe-filters")).toBeVisible();
    await expect(page.locator("section.recipe-filters h3")).toHaveText(["Course", "Occasion", "Season", "Cuisine", "Main ingredient", "Diet"]);
    return;
  }
  await expect(page.locator("section.recipe-filters")).toBeHidden();
  await expect(btn).toHaveText("Filter");
  await btn.click();
  const sheet = page.locator("dialog.recipe-sheet");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  await expect(sheet.locator("h3")).toHaveText(["Course", "Occasion", "Season", "Cuisine", "Main ingredient", "Diet"]);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await btn.click();
  await chip(sheet, "season:summer").click();
  await expect(chip(sheet, "season:summer")).toBeFocused();
  await expect(sheet.locator(".recipe-sheet-bar .ds-btn:not(.text)")).toHaveText("Show 2 recipes");
  await sheet.locator(".recipe-sheet-bar .ds-btn.text").click(); // Clear all, sheet stays open
  await expect(sheet.locator(".recipe-sheet-bar .ds-btn:not(.text)")).toHaveText("Show 6 recipes");
  await chip(sheet, "occasion:christmas").click();
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(btn).toHaveText("Filter (1)");
  await expect(count(page)).toHaveText("2 recipes");
});

test("no layout shift while choosing chips", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const results = page.locator(".recipe-results");
  const summary = page.locator(".recipe-summary");
  const foot = page.locator("footer").last();
  const before = { results: await results.boundingBox(), summary: await summary.boundingBox(), foot: await foot.boundingBox(),
    card: isMobile ? null : await page.locator("section.recipe-filters").boundingBox() };
  for (const t of ["season:winter", "diet:vegetarian", "season:summer"]) {
    await pick(page, isMobile, t);
    if (!isMobile) expect(await page.locator("section.recipe-filters").boundingBox()).toEqual(before.card);
  }
  await closeSheet(page, isMobile);
  await expect(count(page)).toHaveText("2 recipes");
  const after = { results: await results.boundingBox(), summary: await summary.boundingBox(), foot: await foot.boundingBox() };
  expect(after.summary).toEqual(before.summary);
  expect(after.results!.y).toBe(before.results!.y);
  expect(after.results!.height).toBe(before.results!.height); // the grid keeps the first page's height
  expect(after.foot!.y).toBe(before.foot!.y);
});

test("tag page: sibling chips of the same group, then Combine filters", async ({ page }) => {
  await page.goto("/recipes/tag/season-summer/");
  await page.evaluate(() => { (window as any).__stay = 1; });
  await expect(page.locator("h1")).toHaveText("Summer");
  await expect(page.locator(".page-head p")).toHaveText("Season");
  const sib = page.locator(".recipe-siblings .ds-chip");
  await expect(sib).toHaveText(["All", "Fall", "Summer", "Winter"]);
  await expect(sib.nth(2)).toHaveAttribute("aria-current", "page");
  await expect(cards(page)).toHaveCount(2);
  await page.locator(".recipe-siblings").getByRole("link", { name: "Winter" }).click();
  await expect(page).toHaveURL(/\/recipes\/tag\/season-winter\/$/);
  await expect(page.locator("h1")).toHaveText("Winter");
  await page.locator(".recipe-siblings").getByRole("link", { name: "Combine filters" }).click();
  await expect(page).toHaveURL(/\/recipes\/\?tags=season:winter$/);
  await expect(page.locator(".recipe-summary[data-ready]")).toBeAttached();
  await expect(count(page)).toHaveText("3 recipes");
  await expect(page.locator(".recipe-selected")).toHaveText(["Winter"]);
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  // A single-use value still gets its flat page.
  await page.goto("/recipes/tag/cuisine-mexican/");
  await expect(page.locator("h1")).toHaveText("Mexican");
  await expect(cards(page)).toHaveCount(1);
});

test("recipe page: tags link to their tag pages, 8 shown, the rest behind Show all tags", async ({ page }) => {
  await page.goto("/recipes/roast-turkey-breast/");
  const tags = page.locator(".recipe-tags");
  await expect(tags.locator(".recipe-tags-label")).toHaveText("Tags");
  await expect(tags.locator("a.ds-chip:visible")).toHaveCount(8);
  await expect(tags.getByRole("link", { name: "Season: Winter" })).toBeVisible();
  await tags.getByText("Show all tags").click();
  await expect(tags.locator("a.ds-chip:visible")).toHaveCount(9);
  await page.evaluate(() => { (window as any).__stay = 1; });
  await tags.getByRole("link", { name: "Season: Winter" }).click();
  await expect(page).toHaveURL(/\/recipes\/tag\/season-winter\/$/);
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  // Cards carry no tag chips: one link, one tab stop.
  await expect(page.locator(".recipe-card .ds-chip:not(.sample-chip)")).toHaveCount(0);
});

test("Spanish: labels, counts, URL and tag pages", async ({ page, isMobile }) => {
  await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "es"); } catch {} });
  await open(page, "/es/recipes/?tags=season:summer");
  await expect(count(page)).toHaveText("2 recetas");
  await expect(page.getByRole("button", { name: "Quitar Verano" })).toBeVisible();
  const scope = await chips(page, isMobile);
  await expect(chip(scope, "season:summer")).toContainText("Verano");
  await expect(scope.locator("h3")).toHaveText(["Tipo de plato", "Ocasión", "Temporada", "Cocina", "Ingrediente principal", "Dieta"]);
  await chip(scope, "diet:paleo-friendly").click();
  await expect(count(page)).toHaveText("2 recetas");
  await chip(scope, "course:side").click();
  await expect(count(page)).toHaveText("1 receta");
  expect(query(page)).toBe("course:side,season:summer,diet:paleo-friendly");
  await closeSheet(page, isMobile);
  if (isMobile) await expect(page.locator(".recipe-filter-open button")).toHaveText("Filtrar (3)");
  await page.locator(".recipe-summary .recipe-clear").click();
  await expect(page.locator(".recipe-summary .recipe-clear")).toBeHidden();
  await expect(count(page)).toHaveText("6 recetas");

  await page.goto("/es/recipes/tag/season-summer/");
  await expect(page.locator("h1")).toHaveText("Verano");
  await expect(page.locator(".page-head p")).toHaveText("Temporada");
  await expect(page.locator(".recipe-siblings .ds-chip")).toHaveText(["Todas", "Invierno", "Otoño", "Verano"]);
  await expect(page.locator(".recipe-siblings").getByRole("link", { name: "Combinar filtros" })).toHaveAttribute("href", "/es/recipes/?tags=season:summer");
  await page.goto("/es/recipes/roast-turkey-breast/");
  await expect(page.locator(".recipe-tags .recipe-tags-label")).toHaveText("Etiquetas");
  await expect(page.locator(".recipe-tags").getByRole("link", { name: "Temporada: Invierno" })).toHaveAttribute("href", "/es/recipes/tag/season-winter/");
});

test.describe("without script", () => {
  test.use({ javaScriptEnabled: false });
  test("the chips are links to the tag pages and the whole list shows", async ({ page }) => {
    await page.goto("/recipes/");
    await expect(page.locator("section.recipe-filters")).toBeHidden();
    await expect(page.locator(".recipe-filter-open")).toBeHidden();
    const links = page.locator("nav.recipe-filters-nojs");
    await expect(links).toBeVisible();
    await expect(cards(page)).toHaveCount(6);
    await expect(links.getByRole("link", { name: "Summer" })).toHaveAttribute("href", "/recipes/tag/season-summer/");
    await page.goto("/recipes/tag/season-summer/");
    await expect(cards(page)).toHaveCount(2);
  });
});
