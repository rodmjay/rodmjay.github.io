import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

// Discover SLC (design/specs/rodmjay-events.md): the events block filters by date and category in the browser, keeps the
// state in the URL (Back steps through it), groups by day with the weekly entries last, and links out in a new tab; the
// playlist block is one outlined button. Event checks are skipped when the events feed is off (no event cards built).
// Built only where DISCOVER_ON=1; with it off there's nothing to test (the URLs are the 404 page).
test.skip(!existsSync("out/slc/index.html"), "Discover SLC isn't built (DISCOVER_ON off)");
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

test("discover: blocks, filters, URL state", async ({ page }) => {
  await page.goto("/slc/");
  await expect(page.locator("h1")).toHaveText("Discover SLC");
  await expect(page.getByRole("link", { name: /Open in Spotify \(opens in a new tab\)/ })).toHaveAttribute("href", /^https:\/\/open\.spotify\.com\/playlist\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
  test.skip((await page.locator(".ev-card").count()) === 0, "events feed is off");
  await expect(page.locator(".ev-summary[data-ready]")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Next 30 days" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ev-clear")).toHaveClass(/is-idle/);
  // Every outbound title link opens a new tab, says so, and is https.
  for (const a of await page.locator(".ev-title a").all()) {
    await expect(a).toHaveAttribute("target", "_blank");
    await expect(a).toHaveAttribute("rel", /noopener/);
    await expect(a).toHaveAttribute("href", /^https:\/\//);
    await expect(a).toContainText("(opens in a new tab)");
  }
  const all = await page.locator(".ev-card").count();
  await page.getByRole("button", { name: "This weekend" }).click();
  await expect(page).toHaveURL(/\?when=weekend$/);
  await expect(page.getByRole("button", { name: "This weekend" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ev-clear")).not.toHaveClass(/is-idle/);
  // A filtered URL is noindex.
  await page.reload();
  await expect(page.locator('meta[name="robots"][data-filtered]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "This weekend" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(page).toHaveURL(/\/slc\/$/);
  await expect(page.locator(".ev-card")).toHaveCount(all);
  await page.goBack();
  await expect(page.getByRole("button", { name: "This weekend" })).toHaveAttribute("aria-pressed", "true");
  // Category chips (when there are two or more categories): OR within the group.
  const chips = page.getByRole("group", { name: "Category" }).getByRole("button");
  if ((await chips.count()) > 1) {
    await page.goto("/slc/");
    await chips.first().click();
    await expect(page).toHaveURL(/\?cat=[a-z]+$/);
    expect(await page.locator(".ev-card").count()).toBeLessThanOrEqual(all);
  }
  await expect(page.locator("body")).not.toContainText("null");
  await expect(page.locator("body")).not.toContainText("undefined");
});

test("discover: Spanish page, Spanish labels, same events", async ({ page }) => {
  await page.goto("/slc/");
  const en = await page.locator(".ev-card").count();
  await page.goto("/es/slc/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  await expect(page.locator("h1")).toHaveText("Descubra SLC");
  await expect(page.getByRole("link", { name: /Abrir en Spotify/ })).toHaveCount(1);
  test.skip(en === 0, "events feed is off");
  await expect(page.locator(".ev-card")).toHaveCount(en);
  await expect(page.getByRole("button", { name: "Próximos 30 días" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".ev-when").first()).not.toContainText(/\b(AM|PM|Every|Concert|Through)\b/);
});

// Its own product (Rod 11/27: "not part of rod johnson, its its own brand, its own chrome, own theme"): no personal-site
// shell, name, nav or links anywhere in the page, its own title, icons, manifest and theme.
for (const path of ["/slc/", "/slc/events/", "/es/slc/", "/es/slc/events/"]) {
  test(`slc chrome: ${path} stands alone`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-brand", "slc");
    expect(await page.title()).toMatch(/(Discover|Descubra) SLC$/);
    expect(await page.content()).not.toContain("Rod Johnson");
    await expect(page.locator("header.bar, nav.bar-links, footer.foot")).toHaveCount(0);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", path.startsWith("/es/") ? "/es/slc/manifest.webmanifest" : "/slc/manifest.webmanifest");
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /^\/slc\/icons\//);
    await expect(page.locator("h1")).toHaveCount(1);
  });
}

test("slc chrome: phone menu opens the sections and switches language", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/slc/");
  test.skip((await page.locator(".slc-menu").count()) === 0, "no sections (events feed off)");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.locator(".slc-sheet")).toBeVisible();
  await page.locator(".slc-sheet").getByRole("link", { name: "Events" }).click();
  await expect(page).toHaveURL(/\/slc\/events\/$/);
  await expect(page.locator("h1")).toHaveText("Events");
  await expect(page.locator(".slc-sheet")).not.toBeVisible();
});

test("the personal site no longer links Discover SLC in its nav", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('header.bar a[href="/slc/"]')).toHaveCount(0);
});

test("slc chrome: the Menu sheet takes focus, closes on Esc, and gives focus back", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/slc/");
  test.skip((await page.locator(".slc-menu").count()) === 0, "no sections (events feed off)");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
  const box = await page.getByRole("button", { name: "Close menu" }).boundingBox();
  expect(Math.round(box!.height)).toBeGreaterThanOrEqual(48);
  expect(Math.round(box!.width)).toBeGreaterThanOrEqual(48);
  await page.keyboard.press("Escape");
  await expect(page.locator(".slc-sheet")).not.toBeVisible();
  await expect(menu).toBeFocused();
});
