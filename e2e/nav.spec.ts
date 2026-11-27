import { expect, test, type Page } from "@playwright/test";

// Moving around the site never reloads the page or re-mounts the header (Rod 11/20, "no jitter"): every in-app link is
// a Next <Link>. A marker on window and on the header survives each click only if nothing reloaded or re-mounted.
// The personal site's header is header.bar; a product with its own chrome passes its own (the recipe book: header.rb-bar).
async function mark(page: Page, header = "header.bar") {
  await page.evaluate((h) => { (window as any).__stay = 1; document.querySelector(h)!.setAttribute("data-stay", "1"); }, header);
}
async function expectStayed(page: Page, url: RegExp, header = "header.bar") {
  await expect(page).toHaveURL(url);
  expect(await page.evaluate(() => (window as any).__stay)).toBe(1);
  await expect(page.locator(header)).toHaveAttribute("data-stay", "1");
}
const box = (page: Page) => page.locator("header.bar .mark").boundingBox();

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

test("blog: index → post → tag → index → home → blog, no reload, header still", async ({ page }) => {
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
  // Back to the blog from the home's project card (the header has no section links since 11/27).
  await page.locator(".home-project-link", { hasText: "Blog" }).click();
  await expectStayed(page, /\/blog\/$/);
});

// The simplified home (design/specs/rodmjay-home.md 11/27): the header is the wordmark, the language menu and Sign in,
// nothing else; Resume and Contact land on /about/; the footer's links stay in the page.
test("home: header has no section links; Resume, Contact and the footer stay in the page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header.bar nav, header.bar .bar-menu")).toHaveCount(0);
  await expect(page.locator(".home-projects > li")).not.toHaveCount(0);
  await mark(page);
  await page.locator(".hero-actions").getByRole("link", { name: "Contact" }).click();
  await expectStayed(page, /\/about\/#contact$/);
  await page.locator("footer").getByRole("link", { name: "Resume" }).click();
  await expectStayed(page, /\/about\/#resume$/);
  await page.locator("#rform").getByRole("link", { name: "Privacy", exact: true }).click();
  await expectStayed(page, /\/privacy\/$/);
});

test("home: each project card is one link, the whole card", async ({ page }) => {
  await page.goto("/");
  for (const li of await page.locator(".home-projects > li").all()) {
    await expect(li.locator("a")).toHaveCount(1);
    const card = await li.boundingBox(), hit = await li.locator("a").evaluate((a) => { const r = a.getBoundingClientRect(); const s = getComputedStyle(a, "::after"); return { pos: s.position, w: r.width }; });
    expect(hit.pos).toBe("absolute");
    expect(card!.height).toBeGreaterThanOrEqual(96);
  }
});

test("recipes: home → recipe → tag, no reload", async ({ page }) => {
  await page.goto("/es/recipes/");
  await mark(page, "header.rb-bar");
  await page.locator(".rb-grid .rb-card-title a").first().click();
  await expectStayed(page, /\/es\/recipes\/[a-z-]+\/$/, "header.rb-bar");
  await expect(page.locator(".rb-steps li").first()).toBeVisible();
  await page.locator(".rb-tags a.rb-chip").first().click();
  await expectStayed(page, /\/es\/recipes\/tag\/[a-z-]+\/$/, "header.rb-bar");
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
  if (!(await page.locator(".rb-lang-bar select").isVisible())) await page.getByRole("button", { name: "Menu" }).click();
  await page.locator(".rb-lang select:visible").selectOption("es");
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
