import { test, expect } from "@playwright/test";
import { demoCv } from "../../src/data/demoCv";
import { TEMPLATE_CATALOG } from "../../src/data/templateCatalog";

const backend = "https://jfweexvfnkotusyajkst.supabase.co";
const id = "00000000-0000-4000-8000-000000000022";
function session() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token =
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(
      JSON.stringify({ sub: id, role: "authenticated", exp }),
    ).toString("base64url") +
    ".fixture";
  return {
    access_token: token,
    refresh_token: "fixture-refresh",
    expires_at: exp,
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id,
      email: "nurse@example.test",
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  };
}
function account(credits = 0, qualified = false) {
  return {
    userId: id,
    code: "AABBCCDDEEFF",
    owner: false,
    qualified,
    credits,
    frozen: false,
    unlocks: [],
    ledger: [],
    tickets: [],
    edits: [],
  };
}

test("automatic CV verification requires consent and sends only completion fields", async ({
  page,
}) => {
  const auth = session();
  const cv = demoCv(TEMPLATE_CATALOG[0].id, "teal");
  cv.isDraft = false;
  cv.personalInfo.fullAddress = "PRIVATE ADDRESS";
  cv.personalInfo.dateOfBirth = "PRIVATE DATE";
  cv.signatureDataUrl = null;
  const completions: Record<string, unknown>[] = [];
  let qualified = false;
  await page.addInitScript(
    ({ auth, cv }) => {
      if (!localStorage.getItem("medico:auth"))
        localStorage.setItem("medico:auth", JSON.stringify(auth));
      if (!localStorage.getItem("medcv:documents"))
        localStorage.setItem("medcv:documents", JSON.stringify([cv]));
    },
    { auth, cv },
  );
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/rest/v1/rpc/medcv_account")
      return route.fulfill({ json: account(0, qualified) });
    if (path === "/functions/v1/medcv-gateway") {
      const body = route.request().postDataJSON();
      expect(body.action).toBe("complete");
      completions.push(body.cv);
      qualified = true;
      return route.fulfill({ json: { ok: true } });
    }
    if (path === "/auth/v1/user") return route.fulfill({ json: auth.user });
    throw new Error("Unexpected backend request: " + path);
  });
  await page.goto("/#/preview/demo");
  await page
    .getByRole("button", { name: "Download PDF", exact: true })
    .first()
    .click();
  expect(completions).toHaveLength(0);
  await page.goto("/#/account");
  const consent = page.getByLabel(
    "Verify my first qualifying CV automatically when I download it",
  );
  await expect(consent).not.toBeChecked();
  await consent.check();
  await page.goto("/#/preview/demo");
  await page
    .getByRole("button", { name: "Download PDF", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Your first CV is verified." }),
  ).toBeVisible();
  expect(completions).toHaveLength(1);
  expect(Object.keys(completions[0]).sort()).toEqual([
    "education",
    "experience",
    "personalInfo",
  ]);
  expect(JSON.stringify(completions[0])).not.toContain("PRIVATE");
  expect(Object.keys(completions[0].personalInfo as object).sort()).toEqual([
    "email",
    "fullName",
    "professionalTitle",
  ]);
  await page
    .getByRole("button", { name: "Download PDF", exact: true })
    .first()
    .click();
  expect(completions).toHaveLength(1);
  await page.goto("/#/account");
  await expect(page.getByText("Complete", { exact: true })).toBeVisible();
  await page
    .getByLabel(
      "Verify my first qualifying CV automatically when I download it",
    )
    .uncheck();
  await page.reload();
  await expect(
    page.getByLabel(
      "Verify my first qualifying CV automatically when I download it",
    ),
  ).not.toBeChecked();
});

test("credit balance updates automatically and offline refresh keeps the account visible", async ({
  page,
}) => {
  const auth = session();
  let balance = 0;
  let fail = false;
  let polls = 0;
  await page.clock.install();
  await page.addInitScript(
    (auth) => localStorage.setItem("medico:auth", JSON.stringify(auth)),
    auth,
  );
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/rest/v1/rpc/medcv_account") {
      polls++;
      if (fail)
        return route.fulfill({
          status: 503,
          json: { message: "Temporary outage" },
        });
      return route.fulfill({ json: account(balance) });
    }
    if (path === "/auth/v1/user") return route.fulfill({ json: auth.user });
    throw new Error("Unexpected backend request: " + path);
  });
  await page.goto("/#/account");
  const credit = page
    .locator(".metric-grid article")
    .filter({ hasText: "Available credits" })
    .locator("strong");
  await expect(credit).toHaveText("0");
  const initialPolls = polls;
  balance = 2;
  await page.clock.fastForward(30001);
  await expect(credit).toHaveText("2");
  expect(polls).toBeGreaterThan(initialPolls);
  fail = true;
  await page.clock.fastForward(30001);
  await expect(credit).toHaveText("2");
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
  fail = false;
  balance = 3;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(credit).toHaveText("3");
});
