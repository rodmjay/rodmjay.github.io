import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The living hero (docs/adr/0004): the image is always the page; the engine loads only when everything allows it; the
// footer toggle is a live pause control. Skipped where it isn't built (LIVING_HERO off).
const built = existsSync("out/index.html") && readFileSync("out/index.html", "utf8").includes("living-hero");
test.skip(!built, "the living hero isn't built (LIVING_HERO off)");
const engineChunk = () => readdirSync("out/_next/static/chunks").find((f) => readFileSync(`out/_next/static/chunks/${f}`, "utf8").includes("uDrift"));

test("reduced motion: no engine is fetched and the canvas never shows", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const fetched: string[] = [];
  page.on("request", (r) => fetched.push(r.url()));
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  expect(fetched.some((u) => u.includes(engineChunk()!) || u.includes(".mask.png"))).toBe(false);
  await expect(page.locator("canvas.living-hero")).not.toHaveClass(/\bon\b/);
  await expect(page.locator(".cover img")).toBeVisible();
  await ctx.close();
});

test("Motion off: the toggle is a live, keyboard-reachable pause that remembers the choice", async ({ page }) => {
  await page.goto("/");
  const t = page.locator("button.motion-toggle");
  await expect(t).toHaveAttribute("aria-pressed", "true");
  await expect(t).toHaveText("Motion on");
  await t.focus();
  await page.keyboard.press("Enter");
  await expect(t).toHaveAttribute("aria-pressed", "false");
  await expect(t).toHaveAccessibleName("Motion: off");
  await expect(page.locator("canvas.living-hero")).not.toHaveClass(/\bon\b/);
  expect(await page.evaluate(() => localStorage.getItem("motion"))).toBe("off");
  await page.reload();
  await expect(page.locator("button.motion-toggle")).toHaveText("Motion off");
});

test("the canvas is decorative and the picture stays the LCP element", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas.living-hero")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".cover img")).toHaveAttribute("fetchpriority", "high");
  const cls = await page.evaluate(() => new Promise<number>((ok) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries() as any) if (!e.hadRecentInput) v += e.value; }).observe({ type: "layout-shift", buffered: true }); setTimeout(() => ok(v), 3000); }));
  expect(cls).toBeLessThan(0.01);
});
