import { expect, test, type Locator, type Page } from "@playwright/test";

// Recipe tag filters (Designer's spec, design/specs/rodmjay-recipes.md, "Update 2026-11-26: tags and filters"), over the
// local fixture (_content/recipes/sample.json, six dishes):
//   season:summer  skewers, mango salsa               season:winter  arroz con pollo, turkey, sweet potato
//   diet:vegetarian  gallo pinto, mango salsa, sweet potato      occasion:christmas  turkey, sweet potato
//   occasion:weeknight  gallo pinto, arroz con pollo             cuisine:mexican  mango salsa only (tag page, no chip)
//   dish:rice-beans, dish:skillet  gallo pinto, arroz con pollo
// Desktop picks chips in the card above the grid; the phone opens the "Filter" sheet (and its "More filters" when needed).
// Course and Dish lead the block (Designer 11/26); the other groups sit under "More filters".

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

// The counts below are the fixture's. A deploy build reads the live feed (Health Agent publishes as it goes), so there these
// tests step aside and the data-independent check at the end runs instead.
let fixture: boolean | undefined;
test.beforeEach(async ({ request }, info) => {
  if (info.title.startsWith("live data:")) return;
  if (fixture === undefined) fixture = /data-recipes-source="fixture"/.test(await (await request.get("/recipes/")).text());
  test.skip(!fixture, "built from the live recipes feed: the fixture's counts don't apply");
});

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
  const more = sheet.locator("details.recipe-more"); // collapsed in the sheet: open it to reach the other groups
  if ((await more.count()) && !(await more.evaluate((d) => (d as HTMLDetailsElement).open))) await more.locator("summary").click();
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
const GROUPS_EN = ["Course", "Dish", "Occasion", "Season", "Cuisine", "Main ingredient", "Diet"];
// The data-tag of every chip in one group, in page order.
const order = (scope: Locator, group: string) =>
  scope.locator(`[role=group][aria-labelledby$="-${group}"] button.ds-chip`).evaluateAll((els) => els.map((e) => e.getAttribute("data-tag")));

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
    await expect(page.locator("section.recipe-filters h3")).toHaveText(GROUPS_EN);
    await expect(page.locator("section.recipe-filters details.recipe-more")).toHaveAttribute("open", ""); // open on desktop
    return;
  }
  await expect(page.locator("section.recipe-filters")).toBeHidden();
  await expect(btn).toHaveText("Filter");
  await btn.click();
  const sheet = page.locator("dialog.recipe-sheet");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(page.viewportSize()!.height - 1);
  await expect(sheet.locator("h3")).toHaveText(GROUPS_EN);
  // Course and Dish first; the rest collapsed under "More filters".
  await expect(sheet.locator(".recipe-lead h3")).toHaveText(["Course", "Dish"]);
  await expect(chip(sheet, "course:main")).toBeVisible();
  await expect(sheet.locator("details.recipe-more")).not.toHaveAttribute("open", "");
  await expect(chip(sheet, "season:summer")).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(btn).toBeFocused();
  await btn.click();
  await sheet.locator(".recipe-more-summary").click();
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
  await expect(sib).toHaveText(["All", "Summer", "Fall", "Winter"]); // the catalog's order, not the alphabet
  await expect(sib.nth(1)).toHaveAttribute("aria-current", "page");
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
  await expect(scope.locator("h3")).toHaveText(["Tipo de plato", "Preparación", "Ocasión", "Temporada", "Cocina", "Ingrediente principal", "Dieta"]);
  await expect(scope.locator(".recipe-more-summary")).toHaveText("Más filtros");
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
  await expect(page.locator(".recipe-siblings .ds-chip")).toHaveText(["Todas", "Verano", "Otoño", "Invierno"]);
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

test("live data: chips filter the list and the URL keeps them", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const total = await cards(page).count();
  expect(total).toBeGreaterThan(0);
  const scope = await chips(page, isMobile);
  const first = scope.locator("button.ds-chip[data-tag]:not([aria-disabled=\"true\"])").first();
  const tag = await first.getAttribute("data-tag");
  await first.click();
  await closeSheet(page, isMobile);
  await expect.poll(() => query(page)).toBe(tag);
  const n = await cards(page).count();
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThanOrEqual(total);
});

test("chip order follows the catalog's sort; cuisine and main stay alphabetical in each language", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  let scope = await chips(page, isMobile);
  expect(await order(scope, "course")).toEqual(["course:main", "course:side"]);
  expect(await order(scope, "dish")).toEqual(["dish:skillet", "dish:rice-beans"]);
  expect(await order(scope, "occasion")).toEqual(["occasion:holiday", "occasion:christmas", "occasion:party", "occasion:weeknight"]);
  expect(await order(scope, "season")).toEqual(["season:summer", "season:winter"]);
  expect(await order(scope, "cuisine")).toEqual(["cuisine:american", "cuisine:costa-rican"]); // American, Costa Rican
  await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "es"); } catch {} });
  await open(page, "/es/recipes/");
  scope = await chips(page, isMobile);
  expect(await order(scope, "cuisine")).toEqual(["cuisine:costa-rican", "cuisine:american"]); // Costarricense, Estadounidense
  expect(await order(scope, "occasion")).toEqual(["occasion:holiday", "occasion:christmas", "occasion:party", "occasion:weeknight"]);
});

test("Course and Dish lead with 56px chips; the rest under More filters, same OR/AND rule", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const scope = await chips(page, isMobile);
  await expect(scope.locator(".recipe-lead h3")).toHaveText(["Course", "Dish"]);
  await expect(scope.locator(".recipe-more-summary")).toHaveText("More filters");
  await expect(scope.locator(".recipe-more-groups h3")).toHaveText(["Occasion", "Season", "Cuisine", "Main ingredient", "Diet"]);
  expect((await chip(scope, "dish:skillet").boundingBox())!.height).toBe(56);
  await pick(page, isMobile, "dish:rice-beans");
  await expect(count(page)).toHaveText("2 recipes");
  await pick(page, isMobile, "dish:skillet"); // OR inside Dish
  await expect(count(page)).toHaveText("2 recipes");
  await pick(page, isMobile, "season:winter"); // AND with Season
  await expect(count(page)).toHaveText("1 recipe");
  expect(query(page)).toBe("dish:skillet,dish:rice-beans,season:winter");
  await closeSheet(page, isMobile);
  await expect(cards(page).locator(".recipe-card-title")).toHaveText(["Arroz con Pollo"]);
});

// A 48px target whatever it looks like: the box, plus an invisible ::before reaching past it, is at least 48px each way,
// and the control (not a neighbour) is what a tap 23px above, below, left and right of its centre lands on.
async function hit48(loc: Locator, what: string) {
  await loc.scrollIntoViewIfNeeded();
  const r = await loc.evaluate((el) => {
    const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const at = (x: number, y: number) => { const e = document.elementFromPoint(x, y); return !!e && (e === el || el.contains(e)); };
    const cs = getComputedStyle(el), pre = getComputedStyle(el, "::before");
    const out = (v: string) => (pre.position === "absolute" ? Math.max(0, -(parseFloat(v) || 0)) : 0);
    return { probes: [at(cx, cy - 23), at(cx, cy + 23), at(cx - 23, cy), at(cx + 23, cy)],
      reach: [b.height + out(pre.top) + out(pre.bottom), b.width + out(pre.left) + out(pre.right)],
      look: b.height - parseFloat(cs.borderTopWidth) - parseFloat(cs.borderBottomWidth) };
  });
  expect(r.probes, `${what}: taps land on it`).toEqual([true, true, true, true]);
  expect(Math.min(...r.reach), `${what}: 48px reach`).toBeGreaterThanOrEqual(47.9);
  return r.look;
}

test("live data: every control has a 48px hit area; chips keep their 32px look", async ({ page, isMobile }) => {
  await open(page, "/recipes/");
  const scope = await chips(page, isMobile);
  const plain = scope.locator(".recipe-more-groups button.ds-chip").first();
  expect(await hit48(plain, "chip")).toBe(32);
  await hit48(scope.locator(".recipe-lead button.ds-chip").first(), "lead chip");
  await hit48(scope.locator(".recipe-more-summary"), "More filters");
  if (isMobile) {
    await hit48(scope.getByRole("button", { name: "Close" }), "sheet close");
    await hit48(scope.locator(".recipe-sheet-bar .ds-btn.text"), "sheet Clear all");
    await hit48(scope.locator(".recipe-sheet-bar .ds-btn:not(.text)"), "Show N recipes");
  }
  await scope.locator("button.ds-chip[data-tag]:not([aria-disabled=\"true\"])").first().click();
  await closeSheet(page, isMobile);
  if (isMobile) await hit48(page.locator(".recipe-filter-open button"), "Filter");
  expect(await hit48(page.locator(".recipe-selected").first(), "selected chip")).toBe(32);
  await hit48(page.locator(".recipe-summary .recipe-clear"), "Clear all");
  await page.locator(".recipe-summary .recipe-clear").click();
  const pager = page.locator(".recipe-pager .ds-btn");
  if (await pager.count()) await hit48(pager.first(), "Older");
  await cards(page).first().click();
  await expect(page.locator(".recipe-steps")).toBeVisible();
  const tag = page.locator(".recipe-tags a.ds-chip").first();
  if (await tag.count()) expect(await hit48(tag, "recipe tag")).toBe(32);
  await hit48(page.locator(".recipe-actions .ds-btn"), "Print");
});

test("live data: a filtered URL is noindex with its canonical at /recipes/", async ({ page }) => {
  const filtered = 'meta[name="robots"][data-filtered]';
  await open(page, "/recipes/?tags=season:summer");
  await expect(page.locator(filtered)).toHaveAttribute("content", "noindex");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://rodmjay.com/recipes/");
  await open(page, "/es/recipes/?tags=season:summer");
  await expect(page.locator(filtered)).toHaveAttribute("content", "noindex");
  await open(page, "/recipes/");
  await expect(page.locator(filtered)).toHaveCount(0);
  await page.goto("/recipes/tag/season-summer/");
  await expect(page.locator(filtered)).toHaveCount(0);
  // Leaving a filtered index in the same visit takes the tag away.
  await open(page, "/recipes/?tags=season:summer");
  await cards(page).first().click();
  await expect(page.locator(".recipe-steps")).toBeVisible();
  await expect(page.locator(filtered)).toHaveCount(0);
});
