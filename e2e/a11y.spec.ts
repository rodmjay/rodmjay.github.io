import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Accessibility (WCAG 2.1 AA, EN and ES, at 1280 and 375) on every kind of page, the same approach as Privacy Squared's
// spec. axe checks what a machine can (contrast, names, roles, landmarks, labels); the rest (screen reader wording,
// zoom, reduced motion) is Designer's staging check. Add a path here when a new kind of page ships.
const PAGES = {
  en: ["/", "/blog/", "/blog/ai-writes-the-code/", "/blog/tag/architecture/", "/privacy/", "/quotes/", "/recipes/", "/recipes/gallo-pinto/", "/recipes/tag/latin-table/", "/404.html"],
  es: ["/es/", "/es/blog/", "/es/blog/ia-escribe-el-codigo/", "/es/blog/tag/arquitectura/", "/privacy/es/", "/es/quotes/", "/es/recipes/", "/es/recipes/gallo-pinto/", "/es/recipes/tag/mesa-latina/"],
};
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const lang of ["en", "es"] as const) {
  for (const path of PAGES[lang]) {
    test(`a11y ${lang} ${path}`, async ({ page }) => {
      await page.addInitScript((l) => { try { localStorage.setItem("ds-lang", l); } catch {} }, lang);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      // Let entrance fades finish, or axe measures contrast mid-fade. Endless animations are skipped.
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => undefined))));
      if (path !== "/404.html") await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(`^${lang}`));
      // `as never`: axe pins a newer playwright-core than the test runner; the page is the same object at runtime.
      const { violations } = await new AxeBuilder({ page: page as never }).withTags(TAGS).analyze();
      const lines = violations.map(
        (v) => `${v.id} (${v.impact}) ${v.nodes.length}x: ${v.help}\n   ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
      );
      expect(lines, lines.join("\n")).toEqual([]);
    });
  }
}
