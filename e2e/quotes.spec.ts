import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// One page per quote (Rod 11/24): the index links each quote's image to its page; prev/next are real links, ← and →
// follow them without a reload, the last wraps to the first, and each page has its 1200×1200 image. Skipped when the
// quotes feed is off (the build has no quote pages then).
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

test("quotes: index → quote → keys and links → wrap", async ({ page }) => {
  await page.goto("/quotes/");
  const pos = page.locator(".quote-pos");
  test.skip((await pos.count()) === 0, "quotes feed is off");
  const n = Number(((await pos.textContent()) || "").split(" of ")[1]);
  // /quotes/ opens straight into the first quote; its canonical is that quote's own URL.
  const canon = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canon).toMatch(/\/quotes\/[a-z0-9-]+\/$/);
  const first = new URL(canon as string).pathname;
  await page.goto(first);
  await page.evaluate(() => { (window as any).__stay = 1; });
  await expect(page.locator(".quote-pos")).toHaveText(`1 of ${n}`);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
  const img = page.locator(".quote-figure img");
  await expect(img).toHaveAttribute("alt", /\S/);
  expect(await img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBe(1200);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".quote-pos")).toHaveText(`2 of ${n}`);
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(first));
  await page.getByRole("link", { name: "Previous quote" }).click();
  await expect(page.locator(".quote-pos")).toHaveText(`${n} of ${n}`);
  await page.getByRole("link", { name: "Next quote" }).click();
  await expect(page).toHaveURL(new RegExp(first));
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  await expect(page.locator("body")).not.toContainText("null");
});

test("quotes: Spanish page has the same quote, Spanish labels", async ({ page }) => {
  await page.goto("/es/quotes/");
  test.skip((await page.locator(".quote-pos").count()) === 0, "quotes feed is off");
  await expect(page.getByRole("link", { name: "Cita siguiente" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Qué significa");
  // The image is the Spanish one (Rod 11/24: images need Spanish versions), served under /es/.
  await expect(page.locator(".quote-figure img")).toHaveAttribute("src", /^\/es\/quotes\/[a-z0-9-]+\/quote\.png$/);
});

test("quotes: a quote page passes axe (EN and ES)", async ({ page }) => {
  for (const base of ["/quotes/", "/es/quotes/"]) {
    await page.goto(base);
    test.skip((await page.locator(".quote-pos").count()) === 0, "quotes feed is off");
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  }
});
