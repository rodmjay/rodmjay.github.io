import { expect, test } from "@playwright/test";

// "Remove my information": the form says the same thing whatever the answer, the confirm page never deletes on load,
// and the token stays out of the address bar and out of the request URL.
const API = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/erase-request";

test("remove: the form posts email and shows one neutral answer", async ({ page }) => {
  let sent: any = null;
  await page.route(API, async (route) => { sent = route.request().postDataJSON(); await route.fulfill({ json: { ok: true } }); });
  await page.goto("/remove/");
  await page.getByRole("button", { name: "Send the confirmation link" }).click();
  await expect(page.locator("#rm-email-err")).toBeVisible();
  expect(sent).toBeNull();
  await page.fill("#rm-email", "ana@example.test");
  await page.getByRole("button", { name: "Send the confirmation link" }).click();
  await expect(page.getByText("If I hold anything for that address")).toBeVisible();
  expect(sent).toMatchObject({ email: "ana@example.test", hp: "" });
  expect(Object.keys(sent).sort()).toEqual(["email", "hp", "name", "t"]);
});

test("remove: the confirm page peeks, then deletes only on the button", async ({ page }) => {
  const calls: any[] = [];
  await page.route(API, async (route) => {
    const b = route.request().postDataJSON(); calls.push(b);
    await route.fulfill({ json: b.action === "peek" ? { state: "valid", email: "ana@example.test" } : { state: "done" } });
  });
  await page.goto("/es/remove/confirm/#tok123");
  await expect(page.getByRole("button", { name: "Sí, bórrelo" })).toBeVisible();
  expect(calls.map((c) => c.action)).toEqual(["peek"]);
  expect(page.url()).not.toContain("tok123");
  await page.getByRole("button", { name: "Sí, bórrelo" }).click();
  await expect(page.getByText("Gracias, recibí su confirmación")).toBeVisible();
  expect(calls.map((c) => c.action)).toEqual(["peek", "confirm"]);
  expect(calls[1].token).toBe("tok123");
});

test("remove: an expired, used or missing token shows one screen", async ({ page }) => {
  await page.route(API, (route) => route.fulfill({ json: { state: "expired" } }));
  await page.goto("/remove/confirm/#old");
  await expect(page.getByText("This link has expired or was already used.").first()).toBeVisible();
  await page.goto("/remove/confirm/");
  await expect(page.getByText("This link has expired or was already used.").first()).toBeVisible();
});
