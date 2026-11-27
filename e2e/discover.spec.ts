import { expect, test } from "@playwright/test";

// Discover SLC (design/specs/rodmjay-events.md): the events block filters by date and category in the browser, keeps the
// state in the URL (Back steps through it), groups by day with the weekly entries last, and links out in a new tab; the
// playlist block is one outlined button. Event checks are skipped when the events feed is off (no event cards built).
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
