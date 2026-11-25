import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

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
  await expect(page.locator(".rvp-section").first().locator("li")).toHaveCount(3);
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
  await expect(page.locator(".rvp-grid li")).toHaveCount(27);
  await page.getByRole("link", { name: "The Strategist" }).click();
  await expect(page).toHaveURL(/\/rvp\/strategist\/$/);
  await expect(page.locator("h1")).toHaveText("The Strategist");
  await page.goto("/es/rvp/strategist/");
  await expect(page.locator("h1")).toHaveText("Estratega");
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

// The Strategist (Intellectual, Pragmatic, Creative): the first archetypes with Philosopher's full content.
const bank = JSON.parse(readFileSync(new URL("../src/rvp/bank.json", import.meta.url), "utf8"));
const target: Record<string, string> = { R: "R.Intellectual", V: "V.Pragmatic", P: "P.Creative" };
const strategist = `v=${encodeURIComponent(bank.version)}&a=${bank.questions.map((q: any) => q.options.findIndex((o: any) => o.facet === target[q.dimension])).join("")}`;

test("rvp: a full result is useful: pattern, lean on, watch for, growth edge, fit, people unlike you, 7 days, a card", async ({ page }) => {
  await built(page, `/rvp/result/#${strategist}`);
  await expect(page.locator(".rvp-card h2")).toHaveText("The Strategist");
  for (const h of ["Your pattern, in words", "Lean on this", "Watch for this", "Where it fits", "A 7-day practice", "Your growth edge", "Working with people unlike you"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.locator(".rvp-days li")).toHaveCount(7);
  await expect(page.locator(".rvp-details")).toHaveCount(6);
  await page.locator(".rvp-details summary").first().click();
  await expect(page.locator(".rvp-details[open]")).toContainText("Try saying:");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download my card" }).click()]);
  expect(dl.suggestedFilename()).toBe("rvp-strategist.png");
  const png = readFileSync(await dl.path());
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.readUInt32BE(16)).toBe(1080);
  expect(png.length, "a card with text, not one flat color (a blank 1080×1350 PNG is a few KB)").toBeGreaterThan(30_000);
  await expect(page.locator(".rvp-print")).toBeHidden();
  expect((await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
});

test("rvp: Spanish result shows English where the Spanish isn't written yet, marked lang=en", async ({ page }) => {
  await built(page, `/es/rvp/result/#${strategist}`);
  await expect(page.locator(".rvp-card h2")).toHaveText("Estratega");
  await expect(page.getByRole("heading", { name: "Apóyese en esto" })).toBeVisible();
  const en = page.locator('.rvp-section [lang="en"]');
  if (await en.count()) await expect(en.first()).toBeVisible();
});

test("rvp: the Spanish test asks its questions in Spanish", async ({ page }) => {
  await built(page, "/es/rvp/take/");
  await expect(page.locator(".ds-qa-count")).toHaveText("Pregunta 1 de 27");
  await expect(page.locator(".rvp-qa legend")).toHaveText(bank.questions[0].prompt_es);
  await expect(page.locator(".rvp-qa")).not.toHaveAttribute("lang", "en");
  await expect(page.getByText("Por ahora las preguntas están en inglés.")).toHaveCount(0);
});
