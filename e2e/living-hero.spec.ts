import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The living hero (docs/adr/0004): the image is always the page; the engine loads only when everything allows it; the
// footer toggle is a live pause control. Skipped where it isn't built (LIVING_HERO off).
const built = existsSync("out/index.html") && readFileSync("out/index.html", "utf8").includes("living-hero");
test.skip(!built, "the living hero isn't built (LIVING_HERO off)");
const engineChunk = () => readdirSync("out/_next/static/chunks", { withFileTypes: true })
  .find((f) => f.isFile() && f.name.endsWith(".js") && readFileSync(`out/_next/static/chunks/${f.name}`, "utf8").includes("uAur"))?.name;

test("reduced motion: no engine is fetched and the canvas never shows", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const fetched: string[] = [];
  page.on("request", (r) => fetched.push(r.url()));
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  const chunk = engineChunk();
  expect(chunk).toBeTruthy();
  expect(fetched.some((u) => u.includes(chunk!) || u.includes(".mask.png"))).toBe(false);
  await expect(page.locator("canvas.living-hero")).not.toHaveClass(/\bon\b/);
  await expect(page.locator(".cover img")).toBeVisible();
  // Compliance 11/27: the toggle defaults to off under reduced motion, and nothing is stored until the visitor clicks.
  await expect(page.locator("button.motion-toggle")).toHaveText("Motion off");
  expect(await page.evaluate(() => localStorage.getItem("motion"))).toBeNull();
  await ctx.close();
});

test("Motion off: the toggle is a live, keyboard-reachable pause that remembers the choice", async ({ page }) => {
  await page.goto("/");
  const t = page.locator("button.motion-toggle");
  await expect(t).toHaveAttribute("aria-pressed", "true");
  await expect(t).toHaveText("Motion on");
  expect(await page.evaluate(() => localStorage.getItem("motion"))).toBeNull();
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

test("privacy page lists the motion setting; the footer still says no tracking cookies", async ({ page }) => {
  await page.goto("/privacy/");
  await expect(page.locator("main")).toContainText("one setting called 'motion'");
  await expect(page.locator("footer")).toContainText("No tracking cookies.");
  await page.goto("/privacy/es/");
  await expect(page.locator("main")).toContainText("un ajuste llamado 'motion'");
});

// A shader that fails to compile or link falls back to the static image silently, by design; this catches it in CI.
test("the hero's shaders compile and link in a real WebGL context", async ({ page }) => {
  const { VS, FS } = await import("../src/components/living-hero/engine");
  await page.goto("/");
  const r = await page.evaluate(([vsrc, fsrc]) => {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return "no webgl";
    const sh = (t: number, s: string): WebGLShader | string => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); return gl.getShaderParameter(x, gl.COMPILE_STATUS) ? x : String(gl.getShaderInfoLog(x)); };
    const v = sh(gl.VERTEX_SHADER, vsrc), f = sh(gl.FRAGMENT_SHADER, fsrc);
    if (typeof v === "string" || typeof f === "string") return `compile: ${v} ${f}`;
    const p = gl.createProgram()!; gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? "ok" : `link: ${gl.getProgramInfoLog(p)}`;
  }, [VS, FS]);
  test.skip(r === "no webgl", "no WebGL in this browser");
  expect(r).toBe("ok");
});
