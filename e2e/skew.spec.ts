import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Deploys never kick anyone offline (Rod 11/25, DECISIONS; CLAUDE.md "Releasing without kicking anyone offline").
// The head script (src/lib/langscript.mjs) reloads the page once when a /_next/static file is missing (an open page from
// an earlier build), never more than once in 30 seconds for the same URL, so a file that stays missing can't loop.
// scripts/skew.mjs (the deploy job's carry step) is tested in tests/skew.test.mjs.

test("a missing /_next/static file reloads the page once, then it works", async ({ page }) => {
  let loads = 0, broken = 0;
  page.on("request", (r) => { if (r.resourceType() === "document") loads++; }); // page loads (a reload can come before "load")
  await page.route("**/_next/static/chunks/**", async (route) => {
    if (broken === 0) { broken++; return route.fulfill({ status: 404, contentType: "text/html", body: "gone" }); }
    return route.continue();
  });
  await page.goto("/blog/");
  await expect.poll(() => loads).toBe(2);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-js", "");
});

test("a file that stays missing reloads once and stops (no loop)", async ({ page }) => {
  let loads = 0;
  page.on("request", (r) => { if (r.resourceType() === "document") loads++; }); // page loads (a reload can come before "load")
  await page.route("**/_next/static/chunks/**", (route) => route.fulfill({ status: 404, contentType: "text/html", body: "gone" }));
  await page.goto("/blog/");
  await expect.poll(() => loads).toBe(2);
  await page.waitForTimeout(2500);
  expect(loads).toBe(2);
});

test("rvp: a result that lost its #fragment on the way (deploy mid-test) is put back from the hand-off", async ({ page }) => {
  const bank = JSON.parse(readFileSync("src/rvp/bank.json", "utf8"));
  const frag = `v=${encodeURIComponent(bank.version)}&a=${"0".repeat(bank.questions.length)}`;
  const r = await page.goto("/personality-test/take/");
  test.skip(r?.status() === 404, "the RVP test isn't built here (RVP_ON off)");
  // What RvpTake leaves when the last answer is in; Next then arrives by a full load without the fragment.
  await page.evaluate((f) => sessionStorage.setItem("rvp:result", f), frag);
  await page.goto("/personality-test/result/");
  await expect(page.locator(".rvp-card h2")).toHaveText(/^The /);
  expect(new URL(page.url()).hash).toBe(`#${frag}`);
  expect(await page.evaluate(() => sessionStorage.getItem("rvp:result"))).toBeNull(); // used once
});
