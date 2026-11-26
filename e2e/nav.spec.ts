import { expect, test, type Page } from "@playwright/test";

// Moving around the site never reloads the page or re-mounts the header (Rod 11/20, "no jitter"): every in-app link is
// a Next <Link>. A marker on window and on the header survives each click only if nothing reloaded or re-mounted.
async function mark(page: Page) {
  await page.evaluate(() => { (window as any).__stay = 1; document.querySelector("header.bar")!.setAttribute("data-stay", "1"); });
}
async function expectStayed(page: Page, url: RegExp) {
  await expect(page).toHaveURL(url);
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  await expect(page.locator("header.bar")).toHaveAttribute("data-stay", "1");
}
const box = (page: Page) => page.locator("header.bar .mark").boundingBox();

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

test("blog: index → post → tag → index → home, no reload, header still", async ({ page, isMobile }) => {
  await page.goto("/blog/");
  await mark(page);
  const before = await box(page);
  await page.locator(".ds-post-list h2 a").first().click();
  await expectStayed(page, /\/blog\/[a-z-]+\/$/);
  expect(await box(page)).toEqual(before);
  await page.locator(".post-foot .ds-chip").first().click();
  await expectStayed(page, /\/blog\/tag\/[a-z-]+\/$/);
  await page.locator(".filters .ds-chip").first().click();
  await expectStayed(page, /\/blog\/$/);
  await page.locator("header.bar .mark").click();
  await expectStayed(page, /\/$/);
  await expect(page.locator("#hero-name")).toBeVisible();
  expect(await box(page)).toEqual(before);
  if (!isMobile) {
    await page.locator("header.bar nav").getByRole("link", { name: "Blog" }).click();
    await expectStayed(page, /\/blog\/$/);
    await expect(page.locator("header.bar nav a[aria-current=page]")).toHaveText("Blog");
  }
});

test("home and about: section links and the privacy link stay in the page", async ({ page, isMobile }) => {
  test.skip(isMobile, "the section links are hidden on phones");
  await page.goto("/");
  await mark(page);
  for (const id of ["projects", "contact"]) {
    await page.locator(`header.bar nav a[href="/#${id}"]`).click();
    await expectStayed(page, new RegExp(`/#${id}$`));
  }
  await page.locator('header.bar nav a[href="/about/"]').click();
  await expectStayed(page, /\/about\/$/);
  await page.locator("#rform").getByRole("link", { name: "Privacy", exact: true }).click();
  await expectStayed(page, /\/privacy\/$/);
});

test("recipes: index → recipe → tag, no reload", async ({ page }) => {
  await page.goto("/es/recipes/");
  await mark(page);
  await page.locator(".recipe-card").first().click();
  await expectStayed(page, /\/es\/recipes\/[a-z-]+\/$/);
  await expect(page.locator(".recipe-steps ol li").first()).toBeVisible();
  await page.locator(".ds-post-head a.ds-chip").first().click();
  await expectStayed(page, /\/es\/recipes\/tag\/[a-z-]+\/$/);
});

test("the language menu goes to the twin page", async ({ page }) => {
  await page.goto("/blog/ai-writes-the-code/");
  await page.locator("#lang").selectOption("es");
  await expect(page).toHaveURL(/\/es\/blog\/ia-escribe-el-codigo\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
  // Switching language is a full load: let the new page hydrate (its payload is a file since the CSP) before the next pick.
  await page.waitForLoadState("load");
  await page.locator("#lang").selectOption("en");
  await expect(page).toHaveURL(/\/blog\/ai-writes-the-code\/$/);
  await page.goto("/recipes/arroz-con-pollo/");
  await page.locator("#lang").selectOption("es");
  await expect(page).toHaveURL(/\/es\/recipes\/arroz-con-pollo\/$/);
});

test("home picks the language before paint: ?lang=es goes to /es/", async ({ page }) => {
  await page.goto("/?lang=es");
  await expect(page).toHaveURL(/\/es\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-419");
});

test("resume form posts what site.js posted, to the same function", async ({ page }) => {
  let sent: any = null;
  await page.route("https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/resume-request", async (route) => {
    const req = route.request();
    expect(req.method()).toBe("POST");
    expect(req.headers()["content-type"]).toBe("application/json");
    sent = req.postDataJSON();
    await route.fulfill({ json: { ok: true, url: "https://example.test/resume.pdf" } });
  });
  await page.goto("/es/about/#resume");
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rf-name-err")).toBeVisible();
  await page.fill("#rf-name", "Ana Prueba");
  await page.fill("#rf-email", "ana@example.test");
  await page.fill("#rf-company", "Ejemplo");
  await page.check("#rf-consent");
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rf-lookup-err")).toBeVisible();
  expect(sent).toBeNull();
  await page.check("#rf-lookup");
  await expect(page.locator("#rf-lookup-err")).toBeHidden();
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rdone")).toBeVisible();
  await expect(page.locator("#rdone-link")).toHaveAttribute("href", "https://example.test/resume.pdf");
  expect(Object.keys(sent).sort()).toEqual(["company", "consent", "email", "hp", "lang", "lookup_consent", "lookup_consent_version", "name", "role", "source", "t"]);
  expect(sent).toMatchObject({ name: "Ana Prueba", email: "ana@example.test", company: "Ejemplo", role: null, source: null, consent: true, lookup_consent: true, lookup_consent_version: "lookup-2026-11-24", hp: "", lang: "es" });
  expect(typeof sent.t).toBe("number");
});

test("resume form shows the rate limit message", async ({ page, baseURL }) => {
  test.skip(!/localhost/.test(baseURL!), "?mock= works only on localhost; elsewhere this would send a real request");
  await page.goto("/about/?mock=rate#resume");
  await page.fill("#rf-name", "Ana");
  await page.fill("#rf-email", "ana@example.test");
  await page.check("#rf-lookup");
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rf-banner")).toContainText("12 minutes");
});

// Phones get a Menu button (Designer 11/24): it opens the same links over the content without moving the header;
// Esc closes it and returns focus; following a link closes it.
test("phone menu: open, Esc, follow a link", async ({ page, isMobile }) => {
  test.skip(!isMobile, "phones only");
  await page.goto("/blog/");
  const header = await page.locator("header.bar").boundingBox();
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#phone-nav");
  await expect(panel.getByRole("link", { name: "Blog" })).toHaveAttribute("aria-current", "page");
  expect(await page.locator("header.bar").boundingBox()).toEqual(header);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(menu).toBeFocused();
  await menu.click();
  await panel.getByRole("link", { name: "Blog" }).click();
  await expect(panel).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => window.innerWidth));
});

test("phone menu: without script the button is hidden and the links are listed", async ({ browser, isMobile }) => {
  test.skip(!isMobile, "phones only");
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await ctx.newPage();
  await page.goto("/blog/");
  await expect(page.locator(".bar-menu")).toBeHidden();
  await expect(page.locator("nav.phone-nav.static").getByRole("link", { name: "Blog" })).toBeVisible();
  await ctx.close();
});

test("resume form: a pending answer says Rod reviews each request and shows no download", async ({ page }) => {
  await page.route("https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/resume-request", (route) => route.fulfill({ json: { ok: true, pending: true } }));
  await page.goto("/about/#resume");
  await page.fill("#rf-name", "Ana Prueba");
  await page.fill("#rf-email", "ana@example.test");
  await page.check("#rf-lookup");
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rdone-pending")).toBeVisible();
  await expect(page.locator("#rdone-pending")).toContainText("I review each request");
  await expect(page.locator("#rdone")).toBeHidden();
  await expect(page.locator("#rdone-link")).toBeHidden();
});
