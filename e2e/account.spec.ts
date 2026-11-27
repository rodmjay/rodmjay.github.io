import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

// Accounts on the personality test (ADR 0004/0005; Designer's rvp-accounts.md and site-roles.md). The two ways in, end to
// end, in English and Spanish at both widths, against the rvp-account function as the page sees it: page.route() answers
// the function URL with the replies the deployed function gives (no mock code in the app). Skipped where accounts
// aren't built (ACCOUNTS_ON off: production before the reviews and Rod's yes).
//   (a) test first: take the test → result → Save my result (email, name, the box) → code → saved, still on the result;
//       or "Sign in instead" → code → saved as a new take; signed in already → one tap, never an automatic save.
//   (b) sign in first: /signin/ → code → "Before you start" → dashboard with the test card → take the test → tap Save →
//       the result card in the test card's place.
const API = "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/rvp-account";
const CODE = "12345678";
const TOKEN = `eyJ${"a".repeat(60)}.payload.sig`;
const dict = (l: "en" | "es") => JSON.parse(readFileSync(`i18n/${l}.json`, "utf8"));
const bank = JSON.parse(readFileSync("src/rvp/bank.json", "utf8"));
const LANGS = [
  { lang: "en" as const, home: "/", test: "/personality-test/", a: dict("en").account, r: dict("en").rvp },
  { lang: "es" as const, home: "/es/", test: "/es/personality-test/", a: dict("es").account, r: dict("es").rvp },
];
const strategist = (() => {
  const t: Record<string, string> = { R: "R.Intellectual", V: "V.Pragmatic", P: "P.Creative" };
  return `v=${encodeURIComponent(bank.version)}&a=${bank.questions.map((q: any) => q.options.findIndex((o: any) => o.facet === t[q.dimension])).join("")}`;
})();

type Call = { action: string; auth?: string; [k: string]: unknown };
const SITE_OFF = { ok: false, error: "unavailable" };
const LEAD = { ok: true, linked: false, consent: false, wordings: {}, lang: "en", commands: [], requests: [] };
const LINKED = { ok: true, linked: true, consent_required: true, wordings: {}, lang: "en", commands: [], requests: [] };
/** The function as rvp-account v4 answers (committed, not deployed yet): neutral start/login, verify with a session, me
 *  (with consent_covers_results and the site part), consent, site_consent, decline, save, delete, signout. */
async function fn(page: Page, init: { consentAt?: string | null; covers?: boolean; site?: any; results?: any[]; meDelay?: number } = {}) {
  const st = { consentAt: init.consentAt ?? null, covers: init.covers ?? false, site: { ...(init.site ?? SITE_OFF) }, results: [...(init.results ?? [])],
    meDelay: init.meDelay ?? 0, signedIn: false };
  const calls: Call[] = [];
  await page.route(API, async (route: Route) => {
    const req = route.request(), b = req.postDataJSON() as Call;
    const auth = req.headers()["authorization"];
    calls.push({ ...b, auth });
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (b.action === "start" || b.action === "login") return json({ ok: true });
    if (b.action === "verify") {
      if (b.code !== CODE) return json({ ok: false, error: "code" });
      st.signedIn = true;
      return json({ ok: true, session: { access_token: TOKEN, refresh_token: "refresh-1", expires_at: Math.floor(Date.now() / 1000) + 900 } });
    }
    if (auth !== `Bearer ${TOKEN}` || !st.signedIn) return json({ ok: false, error: "signin" }, 401);
    if (b.action === "me") {
      if (st.meDelay) await new Promise((r) => setTimeout(r, st.meDelay));
      return json({ ok: true, profile: { email: "ana@example.test", first_name: "Ana", lang: "en", created_at: "2026-11-26T15:00:00Z" },
        consent_covers_results: st.covers, consent: { source: st.consentAt ? "rodmjay.com/rvp/result" : null, at: st.consentAt, wording_sha256: st.consentAt ? "c".repeat(64) : null },
        results: st.results, site: st.site });
    }
    if (b.action === "consent") { st.consentAt = "2026-11-26T15:01:00Z"; st.covers = true; return json({ ok: true }); }
    if (b.action === "site_consent") {
      if (b.accept !== true || !st.site.ok) return json({ ok: false, error: "consent" }, 400);
      st.site = { ...st.site, consent: true, consent_required: false };
      return json(b.kind === "lead" ? { ok: true, lead: { ok: true } } : { ok: true });
    }
    if (b.action === "decline") { st.signedIn = false; return json({ ok: true }); }
    if (b.action === "save") {
      if (!st.covers) return json({ ok: false, error: "consent_required" });
      const p = new URLSearchParams(String(b.fragment));
      st.results.unshift({ id: `r${st.results.length + 1}`, taken_at: new Date().toISOString(), bank_version: p.get("v"), is_draft: true, engine_version: "rvp-engine-1",
        code: "R.Intellectual-V.Pragmatic-P.Creative", secondary: null, scores: {}, answers: p.get("a") });
      return json({ ok: true, id: st.results[0].id });
    }
    if (b.action === "delete") return json(b.confirm === "DELETE" || b.confirm === "BORRAR" ? { ok: true, state: "done" } : { ok: false, error: "confirm" }, b.confirm ? 200 : 400);
    if (b.action === "signout") { st.signedIn = false; return json({ ok: true }); }
    return json({ ok: false, error: "action" }, 400);
  });
  return { st, calls, actions: () => calls.map((c) => c.action) };
}

async function built(page: Page, path: string) {
  const r = await page.goto(path);
  test.skip(r?.status() === 404, "accounts aren't built here (ACCOUNTS_ON off)");
}
/** Answer all 27 questions (the first option each time) and land on the result. */
async function takeTest(page: Page, test: string) {
  await expect(page.locator(".ds-qa-count")).toBeVisible();
  for (let i = 0; i < bank.questions.length; i++) {
    await page.locator(".ds-qa-choice").first().click();
    await page.locator(".rvp-qa button[type=submit]").click();
  }
  await expect(page).toHaveURL(new RegExp(`${test}result/#v=`));
  await expect(page.locator(".rvp-card h2")).toBeVisible();
}
async function enterCode(page: Page, code = CODE) {
  const input = page.locator("#acct-code");
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await expect(input).toHaveAttribute("autocomplete", "one-time-code");
  await expect(input).toHaveAttribute("maxlength", "8");
  await input.pressSequentially(code); // the eighth digit submits by itself
}
const sessionIsTabOnly = async (page: Page) => {
  const where = await page.evaluate((t) => ({
    session: sessionStorage.getItem("acct:session") ?? "",
    local: Object.keys(localStorage).map((k) => `${k}=${localStorage.getItem(k)}`).join("\n"),
  }), TOKEN);
  expect(where.session).toContain(TOKEN);
  expect(where.local).not.toContain(TOKEN);
  expect(where.local).not.toContain("refresh-1");
};

test.beforeEach(async ({ page }) => { await page.addInitScript(() => { try { localStorage.setItem("ds-lang", "en"); } catch {} }); });

for (const L of LANGS) {
  const { a } = L;

  test(`account (a) ${L.lang}: test → result → save card → code → saved, still on the result`, async ({ page }) => {
    const api = await fn(page);
    await built(page, `${L.home}signin/`);
    await page.goto(`${L.test}take/`);
    await takeTest(page, L.test);
    const card = page.locator(".acct-save");
    await expect(card.getByRole("heading", { name: a.saveTitle })).toBeVisible();
    // The box is required and unticked: an error under it, focus on it, and nothing sent.
    await page.fill("#acct-email", "not-an-email");
    await card.getByRole("button", { name: a.sendCode }).click();
    await expect(page.locator("#acct-email-err")).toHaveText(a.errEmail);
    await page.fill("#acct-email", "ana@example.test");
    await page.fill("#acct-name", "Ana");
    await expect(page.locator("#acct-consent")).not.toBeChecked();
    await card.getByRole("button", { name: a.sendCode }).click();
    await expect(page.locator("#acct-consent-err")).toHaveText(a.errConsent);
    await expect(page.locator("#acct-consent")).toBeFocused();
    await expect(page.locator("#acct-consent")).toHaveAttribute("aria-describedby", "acct-consent-err");
    expect(api.actions()).toEqual([]);
    // The label is Compliance's exact sentence and is itself the click target.
    await expect(card.locator(".acct-consent-row span")).toHaveText(a.consent);
    await card.locator(".acct-consent-row span").click();
    await expect(page.locator("#acct-consent")).toBeChecked();
    await page.waitForTimeout(3000); // a person's pace: the function drops anything sent within 3 s of the form appearing
    await card.getByRole("button", { name: a.sendCode }).click();
    await expect(card.getByRole("heading", { name: a.codeTitle })).toBeVisible();
    await expect(card).toContainText(a.codeSent.replace("{email}", "ana@example.test"));
    const start = api.calls.find((c) => c.action === "start")!;
    expect(start).toMatchObject({ email: "ana@example.test", hp: "", lang: L.lang });
    expect(start.t as number).toBeGreaterThanOrEqual(3000);
    await expect(card).toContainText(a.resendIn.replace("{s}", "2").split("2")[0]);
    // A wrong code: the words, the input kept and selected, focus stays.
    await enterCode(page, "11112222");
    await expect(page.locator("#acct-code-err")).toHaveText(a.errCode);
    await expect(page.locator("#acct-code")).toBeFocused();
    await expect.poll(() => page.locator("#acct-code").evaluate((i: HTMLInputElement) => [i.value, i.selectionStart, i.selectionEnd])).toEqual(["11112222", 0, 8]); // kept and selected
    await page.locator("#acct-code").fill("");
    await page.locator("#acct-code").pressSequentially(CODE);
    await expect(card.getByRole("heading", { name: a.saved })).toBeVisible();
    expect(api.actions()).toEqual(["start", "verify", "verify", "me", "consent", "save"]);
    expect(api.calls.find((c) => c.action === "consent")).toMatchObject({ consent: true, age: true, first_name: "Ana" });
    expect(api.calls.find((c) => c.action === "save")!.fragment).toBe(new URL(page.url()).hash.slice(1));
    await expect(page.locator(".rvp-card h2")).toBeVisible(); // still on the result
    await sessionIsTabOnly(page);
    await expect(page.locator("header.bar .acct-slot, .phone-nav .acct-slot").first()).toHaveAttribute("data-acct", "in");
    await card.getByRole("link", { name: a.goDashboard }).click();
    await expect(page).toHaveURL(new RegExp(`${L.home}dashboard/$`));
    await expect(page.locator(".acct-result h2").first()).toContainText(a.latestLabel.split("{date}")[0].trim());
    await expect(page.locator(".acct-result .rvp-card h2")).toBeVisible();
  });

  test(`account (a) ${L.lang}: "Sign in instead" swaps the card in place and saves this result as a new take`, async ({ page }) => {
    const earlier = { id: "r0", taken_at: "2026-10-01T15:00:00Z", bank_version: bank.version, is_draft: true, code: "x", secondary: null, answers: "0".repeat(27) };
    const api = await fn(page, { consentAt: "2026-10-01T15:00:00Z", covers: true, results: [earlier] });
    await built(page, `${L.home}signin/`);
    await page.goto(`${L.test}result/#${strategist}`);
    const card = page.locator(".acct-save");
    const top = () => card.evaluate((el) => el.getBoundingClientRect().top + window.scrollY); // page position, not viewport
    const before = await top();
    await card.getByRole("button", { name: a.haveAccount }).click();
    await expect(card.getByRole("heading", { name: a.signinTitle })).toBeFocused();
    await expect(page.locator("#acct-consent")).toHaveCount(0); // no box when signing in
    expect(await top()).toBe(before); // same card, same place
    await page.fill("#acct-email", "ana@example.test");
    await page.waitForTimeout(3000);
    await card.getByRole("button", { name: a.sendCode }).click();
    await expect(card).toContainText(a.codeSentNeutral);
    await enterCode(page);
    await expect(card.getByRole("heading", { name: a.saved })).toBeVisible();
    expect(api.actions()).toEqual(["login", "verify", "me", "save"]); // consent on record covers results: no box again
    expect(api.st.results).toHaveLength(2); // a new take, never an overwrite
  });

  test(`account (a) ${L.lang}: signed in, the result is never saved by itself; one tap saves it (box first when consent doesn't cover it)`, async ({ page }) => {
    const api = await fn(page, { consentAt: null });
    await built(page, `${L.home}signin/`);
    await page.evaluate((t) => sessionStorage.setItem("acct:session", JSON.stringify({ access_token: t, refresh_token: "refresh-1", expires_at: Date.now() / 1000 + 900 })), TOKEN);
    api.st.signedIn = true;
    await page.goto(`${L.test}result/#${strategist}`);
    const card = page.locator(".acct-save");
    await expect(card.getByRole("button", { name: a.saveToDashboard })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(api.actions()).toEqual([]); // nothing on arrival
    await card.getByRole("button", { name: a.saveToDashboard }).click();
    // The consent on record doesn't cover results: 0004's box, unticked, the same error.
    await expect(page.locator("#acct-bys")).not.toBeChecked();
    await card.getByRole("button", { name: a.saveToDashboard }).click();
    await expect(page.locator("#acct-bys-err")).toHaveText(a.errConsent);
    await expect(page.locator("#acct-bys")).toBeFocused();
    expect(api.actions()).toEqual(["me"]);
    await page.locator("#acct-bys").check();
    await card.getByRole("button", { name: a.saveToDashboard }).click();
    await expect(page.getByText(a.savedLine)).toBeVisible();
    await expect(page.getByRole("link", { name: a.viewDashboard })).toBeVisible();
    expect(api.actions()).toEqual(["me", "consent", "save"]);
    // A reload doesn't save it twice: the tab remembers this result is saved.
    await page.reload();
    await expect(page.getByText(a.savedLine)).toBeVisible();
    expect(api.actions().filter((x) => x === "save")).toHaveLength(1);
  });

  test(`account (b) ${L.lang}: sign in → before you start → dashboard leads with the test → take it → tap save → the result in its place`, async ({ page }) => {
    const api = await fn(page, { meDelay: 600, site: LEAD });
    await built(page, `${L.home}signin/`);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1, name: a.signinTitle })).toBeVisible();
    await expect(page.locator("#acct-email")).toHaveAttribute("autocomplete", "email");
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await page.fill("#acct-email", "ana@example.test");
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: a.sendCode }).click();
    // The same neutral reply whether or not the email has an account.
    await expect(page.getByText(a.codeSentNeutral)).toBeVisible();
    await enterCode(page);
    // Someone new: the sign-in box (Compliance's exact words), unticked, required.
    await expect(page.getByRole("heading", { level: 1, name: a.bysTitle })).toBeVisible();
    await expect(page.locator(".acct-consent-row span")).toHaveText(a.consentLead);
    await page.getByRole("button", { name: a.continue }).click();
    await expect(page.locator("#acct-bys-err")).toHaveText(a.errConsentContinue);
    await page.locator("#acct-bys").check();
    await page.getByRole("button", { name: a.continue }).click();
    await expect(page).toHaveURL(new RegExp(`${L.home}dashboard/$`));
    await sessionIsTabOnly(page);
    // While `me` loads: one skeleton at the lead block's size; then the test card in exactly the same box.
    const lead = page.locator(".acct-lead-card");
    await expect(page.locator(".acct-lead-hold")).toBeVisible();
    const skeleton = await lead.boundingBox();
    await expect(page.getByRole("heading", { name: a.leadTitle })).toBeVisible();
    const testCard = await lead.boundingBox();
    expect(testCard).toEqual(skeleton);
    await expect(page.locator(".acct-test")).toContainText(a.leadBody);
    expect(api.actions()).toEqual(["login", "verify", "me", "site_consent", "me"]);
    expect(api.calls.find((c) => c.action === "site_consent")).toMatchObject({ kind: "lead", accept: true, source: "rodmjay.com/signin" });
    // Take the test from the card; the answers stay in this tab, the result page offers one tap.
    await page.locator(".acct-test").getByRole("link", { name: a.takeTest }).click();
    await page.getByRole("link", { name: L.r.start }).click();
    await takeTest(page, L.test);
    await page.waitForTimeout(500);
    expect(api.actions().filter((x) => x === "save")).toHaveLength(0);
    await page.locator(".acct-save").getByRole("button", { name: a.saveToDashboard }).click();
    // The sign-in box doesn't cover results: the tap shows 0004's box first, then saves this one result.
    await page.locator("#acct-bys").check();
    await page.locator(".acct-save").getByRole("button", { name: a.saveToDashboard }).click();
    await expect(page.getByText(a.savedLine)).toBeVisible();
    expect(api.actions().slice(-3)).toEqual(["me", "consent", "save"]);
    await page.getByRole("link", { name: a.viewDashboard }).click();
    await expect(page).toHaveURL(new RegExp(`${L.home}dashboard/$`));
    await expect(page.locator(".acct-result .rvp-card h2")).toBeVisible();
    const resultCard = await lead.boundingBox();
    expect([resultCard!.x, resultCard!.y, resultCard!.width]).toEqual([testCard!.x, testCard!.y, testCard!.width]);
    expect(resultCard!.height).toBeGreaterThanOrEqual(testCard!.height);
    await expect(page.getByRole("heading", { name: a.leadTitle })).toHaveCount(0);
    await expect(page.getByText(a.earlierEmpty)).toBeVisible();
  });

  test(`account (b) ${L.lang}: a linked email sees the linked box; the site mode off means no box at all`, async ({ page }) => {
    const api = await fn(page, { site: LINKED });
    await built(page, `${L.home}signin/`);
    await page.fill("#acct-email", "ana@example.test");
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: a.sendCode }).click();
    await enterCode(page);
    await expect(page.locator(".acct-consent-row span")).toHaveText(a.consentLinked);
    await page.locator("#acct-bys").check();
    await page.getByRole("button", { name: a.continue }).click();
    await expect(page).toHaveURL(new RegExp(`${L.home}dashboard/$`));
    expect(api.calls.find((c) => c.action === "site_consent")).toMatchObject({ kind: "linked", accept: true });
    await expect(page.getByRole("heading", { name: a.leadTitle })).toBeVisible();
    // Site mode off ({ok:false}): straight to the dashboard after the code.
    await page.evaluate(() => sessionStorage.clear());
    api.st.site = { ...SITE_OFF }; api.st.signedIn = false; api.calls.length = 0;
    await page.goto(`${L.home}signin/`);
    await page.fill("#acct-email", "ana@example.test");
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: a.sendCode }).click();
    await enterCode(page);
    await expect(page).toHaveURL(new RegExp(`${L.home}dashboard/$`));
    await expect.poll(() => api.actions()).toEqual(["login", "verify", "me", "me"]);
  });

  test(`account (b) ${L.lang}: "No thanks, sign me out" deletes the account just made and keeps nothing`, async ({ page }) => {
    const api = await fn(page, { site: LEAD });
    await built(page, `${L.home}signin/`);
    await page.fill("#acct-email", "ana@example.test");
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: a.sendCode }).click();
    await enterCode(page);
    await page.getByRole("button", { name: a.decline }).click();
    await expect(page.getByRole("heading", { level: 1, name: a.declined })).toBeVisible();
    expect(api.actions()).toEqual(["login", "verify", "me", "decline"]);
    expect(await page.evaluate(() => sessionStorage.getItem("acct:session"))).toBeNull();
  });
}

test("account: the account pages are noindex and never cached", async ({ page, request }) => {
  await built(page, "/signin/");
  for (const p of ["/signin/", "/es/signin/", "/dashboard/", "/es/dashboard/"]) {
    const r = await request.get(p);
    expect(r.status(), p).toBe(200);
    expect(r.headers()["x-robots-tag"], p).toBe("noindex");
    expect(r.headers()["cache-control"], p).toBe("no-store");
    expect(await r.text(), p).toMatch(/<meta name="robots" content="noindex"/);
  }
});

test("account: the dashboard signed out goes to sign in; the delete dialog needs the word", async ({ page }) => {
  const a = LANGS[0].a;
  await built(page, "/dashboard/");
  await expect(page).toHaveURL(/\/signin\/$/);
  const api = await fn(page, { consentAt: "2026-11-26T15:00:00Z", covers: true });
  await page.evaluate((t) => sessionStorage.setItem("acct:session", JSON.stringify({ access_token: t, refresh_token: "refresh-1", expires_at: Date.now() / 1000 + 900 })), TOKEN);
  api.st.signedIn = true;
  await page.goto("/dashboard/");
  await page.getByRole("button", { name: a.deleteBtn }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: a.cancel })).toBeFocused();
  await dialog.getByRole("button", { name: a.deleteBtn }).click();
  await expect(page.locator("#acct-del-err")).toHaveText(a.delErr);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: a.deleteBtn })).toBeFocused();
  await page.getByRole("button", { name: a.deleteBtn }).click();
  await page.fill("#acct-del-word", "borrar"); // either word, any case
  await dialog.getByRole("button", { name: a.deleteBtn }).click();
  await expect(page.getByRole("heading", { level: 1, name: a.deleted })).toBeVisible();
  expect(api.calls.find((c) => c.action === "delete")!.confirm).toBe("BORRAR");
});

test("account: no accessibility violations on sign in, the save card, the code step and the dashboard", async ({ page }) => {
  const axe = async () => (await new AxeBuilder({ page: page as never }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations;
  const a = LANGS[1].a;
  const api = await fn(page, { covers: true, consentAt: "2026-11-26T15:00:00Z", results: [{ id: "r1", taken_at: "2026-11-26T15:00:00Z", bank_version: bank.version, is_draft: true, code: "x", secondary: null, answers: strategist.split("a=")[1] }] });
  await built(page, "/es/signin/");
  expect(await axe()).toEqual([]);
  await page.goto(`/es/personality-test/result/#${strategist}`);
  await expect(page.locator(".acct-save h2")).toHaveText(a.saveTitle);
  expect(await axe()).toEqual([]);
  await page.fill("#acct-email", "ana@example.test");
  await page.locator("#acct-consent").check();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: a.sendCode }).click();
  await expect(page.locator("#acct-code")).toBeVisible();
  expect(await axe()).toEqual([]);
  await page.locator("#acct-code").pressSequentially(CODE);
  await expect(page.locator(".acct-save").getByRole("heading", { name: a.saved })).toBeVisible();
  await page.goto("/es/dashboard/");
  await expect(page.locator(".acct-result .rvp-card h2")).toBeVisible();
  expect(await axe()).toEqual([]);
  expect(api.actions()).toContain("save");
});
