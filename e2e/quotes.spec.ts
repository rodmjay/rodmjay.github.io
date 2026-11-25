import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// One page per quote (Rod 11/24): the index links each quote's image to its page; prev/next are real links, ← and →
// follow them without a reload, the last wraps to the first, and each page has its 1200×1200 image. Skipped when the
// quotes feed is off (the build has no quote pages then).
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

test("quotes: index → quote → keys and links → wrap", async ({ page }) => {
  await page.goto("/quotes/");
  const thumbs = page.locator(".quote-grid a.quote-thumb");
  const n = await thumbs.count();
  test.skip(n === 0, "quotes feed is off");
  await thumbs.first().click();
  await expect(page).toHaveURL(/\/quotes\/[a-z0-9-]+\/$/);
  const first = page.url();
  await page.evaluate(() => { (window as any).__stay = 1; });
  await expect(page.locator(".quote-pos")).toHaveText(`1 of ${n}`);
  const img = page.locator(".quote-figure img");
  await expect(img).toHaveAttribute("alt", /\S/);
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(1200);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".quote-pos")).toHaveText(`2 of ${n}`);
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(first);
  await page.getByRole("link", { name: "Previous quote" }).click();
  await expect(page.locator(".quote-pos")).toHaveText(`${n} of ${n}`);
  await page.getByRole("link", { name: "Next quote" }).click();
  await expect(page).toHaveURL(first);
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  await expect(page.locator("body")).not.toContainText("null");
});

test("quotes: Spanish page has the same quote, Spanish labels", async ({ page }) => {
  await page.goto("/es/quotes/");
  const thumbs = page.locator(".quote-grid a.quote-thumb");
  test.skip((await thumbs.count()) === 0, "quotes feed is off");
  await thumbs.first().click();
  await expect(page).toHaveURL(/\/es\/quotes\/[a-z0-9-]+\/$/);
  await expect(page.getByRole("link", { name: "Cita siguiente" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Qué significa");
});

test("quotes: a quote page passes axe (EN and ES)", async ({ page }) => {
  for (const base of ["/quotes/", "/es/quotes/"]) {
    await page.goto(base);
    const thumb = page.locator(".quote-grid a.quote-thumb").first();
    test.skip((await thumb.count()) === 0, "quotes feed is off");
    await page.goto(await thumb.getAttribute("href") as string);
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  }
});
