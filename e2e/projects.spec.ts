import { expect, test, type Page } from "@playwright/test";
import { existsSync } from "node:fs";

// The project sites GitHub Pages used to serve under rodmjay.com (scripts/sites.mjs copies each one in, pinned by
// PROJECT_REFS), each under its own path-scoped CSP: every page loads with no CSP violation and no script error.
// Locally this needs the copier run on clones of the repos; in CI and with BASE_URL it always runs.
const built = !!process.env.BASE_URL || !!process.env.CI || existsSync("out/altura/index.html");

async function watch(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => { if (/Content.Security.Policy/i.test(m.text())) seen.push(`console ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => seen.push(`page error: ${e.message}`));
  await page.exposeFunction("__cspViolation", (v: string) => seen.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) =>
      (window as any).__cspViolation(`${e.violatedDirective} blocked ${e.blockedURI || "inline"} (${e.sourceFile}:${e.lineNumber})`));
  });
  return seen;
}

// [path, what its CSP may add to the strict one (scripts/sites.mjs `allow`)]
const PAGES: [string, RegExp[]][] = [
  ["/altura/", [/style-src 'self' https:\/\/fonts\.googleapis\.com;/, /connect-src 'self' https:\/\/docs\.google\.com\/forms\/d\/[\w-]+\/formResponse;/]],
  ["/altura/es/", []],
  ["/agentic-squared/", [/style-src 'self'; style-src-attr 'none';/, /connect-src 'self';/]],
  ["/agentic-squared/es/", []],
  ["/agency-squared/", [/style-src 'self' https:\/\/fonts\.googleapis\.com; style-src-attr 'unsafe-inline';/]],
  ["/agency-squared/es/", []],
  ["/agency-squared/demo/", []],
  ["/moodboard/", [/style-src 'self' 'sha256-[A-Za-z0-9+/]+=*'; style-src-attr 'unsafe-inline';/]],
];

test.describe("the project sites", () => {
  test.skip(!built, "run scripts/sites.mjs on clones of the project repos to test them");

  for (const [path, expected] of PAGES) {
    test(`projects ${path} loads under its CSP`, async ({ page }) => {
      const seen = await watch(page);
      const res = await page.goto(path);
      expect(res!.status()).toBe(200);
      const h = res!.headers(), csp = h["content-security-policy"];
      expect(csp.match(/script-src([^;]*)/)![1]).toMatch(/^ 'self'( 'sha256-[A-Za-z0-9+/]+=*')*$/); // 'self' plus hashes only
      expect(csp).not.toContain("'unsafe-eval'");
      for (const re of expected) expect(csp).toMatch(re);
      for (const d of ["default-src 'self'", "img-src 'self' data:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"])
        expect(csp).toContain(d);
      expect(h["strict-transport-security"]).toContain("max-age=");
      expect(h["x-frame-options"]).toBe("DENY");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toBeEmpty();
      expect(seen, seen.join("\n")).toEqual([]);
    });
  }

  for (const name of ["altura", "agentic-squared", "agency-squared", "moodboard"]) {
    test(`projects: /${name} redirects to /${name}/`, async ({ request }) => {
      const res = await request.get(`/${name}`, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers().location, "http://x").pathname).toBe(`/${name}/`);
    });
  }
});
