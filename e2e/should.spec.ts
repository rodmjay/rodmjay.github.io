import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// The Should page at /should/ (Product Manager's static site, copied by scripts/should.mjs) under its own CSP: inline
// scripts allowed by hash only, and the demo's deep links served by the SPA shell. Locally this needs a build with
// SHOULD_SRC=<a clone of rodmjay/should>; in CI and with BASE_URL it always runs.
const built = !!process.env.BASE_URL || !!process.env.CI || existsSync("out/should/index.html");
const SITE = JSON.parse(readFileSync("public/staticwebapp.config.json", "utf8"));
const SITE_CSP: string = SITE.globalHeaders["Content-Security-Policy"];

async function watch(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" || /Content.Security.Policy/i.test(m.text())) seen.push(`console ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => seen.push(`page error: ${e.message}`));
  await page.exposeFunction("__cspViolation", (v: string) => seen.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).__cspViolation(`${e.violatedDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber})`));
  });
  return seen;
}

const PAGES: [string, RegExp][] = [
  ["/should/", /autopilot/i],
  ["/should/demo/", /\S/],
  ["/should/demo/r/health", /Health Agent/],
];

test.describe("the Should page", () => {
  test.skip(!built, "build with SHOULD_SRC=<clone of rodmjay/should> to test /should/");

  for (const [path, heading] of PAGES) {
    test(`should ${path} loads under its CSP`, async ({ page }) => {
      const seen = await watch(page);
      const res = await page.goto(path);
      expect(res!.status()).toBe(200);
      const h = res!.headers(), csp = h["content-security-policy"];
      expect(csp).toMatch(/script-src 'self'( 'sha256-[A-Za-z0-9+/]+=*')+;/); // 'self' plus the build's hashes only
      expect(csp.match(/script-src([^;]*)/)![1]).not.toContain("unsafe-");
      if (path.startsWith("/should/demo/")) {
        // The demo exception (scripts/should.mjs): its compiled bundle still writes style attributes.
        expect(csp).toContain("style-src 'self' 'unsafe-inline';");
      } else {
        expect(csp).not.toContain("unsafe-");
        expect(csp).toContain("style-src 'self'; style-src-attr 'none';");
      }
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(h["strict-transport-security"]).toContain("max-age=");
      expect(h["x-frame-options"]).toBe("DENY");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("camera=()");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1").first()).toHaveText(heading);
      expect(page.url()).toContain(path); // a deep link stays where it is (the shell, not a redirect)
      expect(seen, seen.join("\n")).toEqual([]);
    });
  }

  test("should: clicking from the demo home into other screens stays inside the CSP", async ({ page }) => {
    const seen = await watch(page);
    // Client-side navigation (SvelteKit) from the home screen, so each screen renders under the home page's CSP.
    for (const [href, heading] of [["/should/demo/org", /org chart/i], ["/should/demo/r/bookkeeper", /\S/],
      ["/should/demo/projects", /\S/], ["/should/demo/tv", /TV/i]] as const) {
      await page.goto("/should/demo/");
      await page.waitForLoadState("networkidle");
      await page.locator(`a[href="${href}"]:visible`).first().click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1").first()).toHaveText(heading);
    }
    expect(seen, seen.join("\n")).toEqual([]);
  });

  test("should: /should redirects to /should/", async ({ request }) => {
    const res = await request.get("/should", { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(new URL(res.headers().location, "http://x").pathname).toBe("/should/");
  });

  test("should: the demo's real files are served as files, and a missing one is a 404", async ({ request }) => {
    const json = await request.get("/should/demo/api/today.json");
    expect(json.status()).toBe(200);
    expect(json.headers()["content-type"]).toContain("json");
    expect(await json.json()).toBeTruthy();
    expect((await request.get("/should/demo/favicon.svg")).headers()["content-type"]).toContain("svg");
    expect((await request.get("/should/demo/_app/no-such-file.js")).status()).toBe(404);
  });
});

test("csp: the rest of the site keeps its policy", async ({ request }) => {
  const OUT = JSON.parse(readFileSync(existsSync("out/staticwebapp.config.json") ? "out/staticwebapp.config.json" : "public/staticwebapp.config.json", "utf8"));
  expect(OUT.globalHeaders).toEqual(SITE.globalHeaders);
  expect(OUT.responseOverrides).toEqual(SITE.responseOverrides);
  // The copied sites' own routes (scripts/sites.mjs) come after the site's.
  const copied = /^\/(should|altura|agentic-squared|agency-squared|moodboard)(\/|$)/;
  // The account pages' no-store rules leave out/ with the pages where accounts are off (scripts/postbuild.mjs).
  const account = /^\/(es\/)?(signin|dashboard)\/\*$/, accounts = existsSync("out/signin/index.html") || !existsSync("out/staticwebapp.config.json");
  expect(OUT.routes.filter((r: { route: string }) => !copied.test(r.route))).toEqual(SITE.routes.filter((r: { route: string }) => accounts || !account.test(r.route)));
  for (const path of ["/", "/blog/", "/recipes/", "/no-such-page/", "/shouldnt/"])
    expect((await request.get(path)).headers()["content-security-policy"], path).toBe(SITE_CSP);
});
