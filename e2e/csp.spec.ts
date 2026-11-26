import { expect, test, type Page } from "@playwright/test";

// Security headers (Security Officer, psh #70): every kind of page gets them, and nothing on the page breaks the
// Content-Security-Policy. Locally tests/serve.mjs sends the headers from staticwebapp.config.json; with BASE_URL set
// the same checks run against the Static Web App itself.
const PAGES = ["/", "/es/", "/blog/", "/blog/ai-writes-the-code/", "/es/blog/tag/arquitectura/", "/privacy/", "/privacy/es/", 
  "/recipes/", "/es/recipes/gallo-pinto/", "/recipes/tag/latin-table/", "/no-such-page/"];

async function watch(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => { if (/Content.Security.Policy/i.test(m.text())) seen.push(`console: ${m.text()}`); });
  await page.exposeFunction("__cspViolation", (v: string) => seen.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).__cspViolation(`${e.violatedDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber})`));
  });
  return seen;
}

for (const path of PAGES) {
  test(`csp ${path}`, async ({ page }) => {
    const seen = await watch(page);
    const res = await page.goto(path);
    const h = res!.headers();
    expect(h["content-security-policy"]).toContain("script-src 'self';");
    expect(h["content-security-policy"]).not.toContain("unsafe-");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    await page.waitForLoadState("networkidle");
    // Hydrated: Next's runtime started from the payload files postbuild moved out of the HTML (it sets window.next).
    await page.waitForFunction(() => (window as any).next?.appDir === true);
    expect(seen, seen.join("\n")).toEqual([]);
  });
}

test("csp: the home pages' language picker still runs (external file)", async ({ page }) => {
  const seen = await watch(page);
  await page.goto("/?lang=es");
  await expect(page).toHaveURL(/\/es\/$/);
  expect(seen, seen.join("\n")).toEqual([]);
});

test("csp: the resume form's request is allowed (answered here, never sent)", async ({ page }) => {
  const seen = await watch(page);
  let reached = false;
  await page.route("https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/resume-request", async (route) => {
    reached = true; // CSP is checked in the page before the request leaves it, so a blocked fetch never gets here.
    await route.fulfill({ json: { ok: true, url: "https://example.test/resume.pdf" } });
  });
  await page.goto("/about/#resume");
  await page.fill("#rf-name", "CSP Check");
  await page.fill("#rf-email", "csp@example.test");
  await page.check("#rf-lookup");
  await page.locator("#rf-submit").click();
  await expect(page.locator("#rdone")).toBeVisible();
  expect(reached).toBe(true);
  expect(seen, seen.join("\n")).toEqual([]);
});
