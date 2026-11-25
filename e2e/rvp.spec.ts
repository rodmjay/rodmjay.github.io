import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// The RVP archetype test (src/rvp): take it start to finish, read the result from the link, reopen it, Spanish, and
// nothing sent anywhere while taking it. Skipped where the test isn't built (RVP_ON off: production before Rod's yes).
test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

async function built(page: Page, path: string) {
  const r = await page.goto(path);
  test.skip(r?.status() === 404, "the RVP test isn't built here (RVP_ON off)");
}

test("rvp: take all 27 questions by keyboard, get a result, reopen it from the link", async ({ page }) => {
  await built(page, "/rvp/take/");
  // Only the page's own files load while taking the test: no request leaves for another host, and none carries answers.
  const sent: string[] = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.host !== new URL(page.url()).host || /[?&#]a=/.test(r.url())) sent.push(r.url()); });
  const count = page.locator(".ds-qa-count");
  await expect(count).toHaveText("Question 1 of 27");
  for (let i = 1; i <= 27; i++) {
    await expect(count).toHaveText(`Question ${i} of 27`);
    // A keyboard user's path: each new question puts focus on its heading; Tab reaches the options, Space picks one.
    if (i > 1) await expect(page.locator(".rvp-qa legend")).toBeFocused();
    else await page.locator(".rvp-qa legend").focus();
    await page.keyboard.press("Tab");
    const first = page.locator(".ds-qa-choice input").first();
    await expect(first).toBeFocused();
    await page.keyboard.press("Space");
    await expect(first).toBeChecked();
    await page.keyboard.press("Enter");
  }
  await expect(page).toHaveURL(/\/rvp\/result\/#v=[^&]+&a=[0-2]{27}$/);
  await expect(page.locator(".rvp-card h2")).toHaveText(/^The /);
  await expect(page.locator(".rvp-pattern li")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("undefined");
  expect(sent).toEqual([]);
  // The same link in a fresh page gives the same archetype.
  const url = page.url(), name = await page.locator(".rvp-card h2").textContent();
  const again = await page.context().newPage();
  await again.goto(url);
  await expect(again.locator(".rvp-card h2")).toHaveText(name!);
  expect(await again.evaluate(() => sessionStorage.length)).toBe(0);
});

test("rvp: a broken or old link says so instead of guessing", async ({ page }) => {
  await built(page, "/rvp/result/#v=0.0&a=000");
  await expect(page.locator(".rvp-stage")).toContainText("no result");
});

test("rvp: a refresh keeps the answers so far; Start over clears them", async ({ page }) => {
  await built(page, "/rvp/take/");
  for (let i = 0; i < 3; i++) { await page.locator(".ds-qa-choice").first().click(); await page.getByRole("button", { name: "Next" }).click(); }
  await page.reload();
  await expect(page.locator(".ds-qa-count")).toHaveText("Question 4 of 27");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.locator(".ds-qa-count")).toHaveText("Question 1 of 27");
});

test("rvp: index, an archetype page and Spanish", async ({ page }) => {
  await built(page, "/rvp/");
  await expect(page.locator(".rvp-list li")).toHaveCount(27);
  await page.getByRole("link", { name: "The Strategist" }).click();
  await expect(page).toHaveURL(/\/rvp\/strategist\/$/);
  await expect(page.locator("h1")).toHaveText("The Strategist");
  await page.goto("/es/rvp/strategist/");
  await expect(page.locator("h1")).toHaveText("El Estratega");
  await expect(page.locator("html")).toHaveAttribute("lang", /^es/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("rvp: no accessibility violations on the take and result pages", async ({ page }) => {
  await built(page, "/rvp/take/");
  await expect(page.locator(".ds-qa-choice").first()).toBeVisible();
  expect((await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
  await page.goto("/rvp/result/#v=0.1-draft&a=" + "0".repeat(27));
  await expect(page.locator(".rvp-card h2")).toBeVisible();
  expect((await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
});
