import { test, expect } from "@playwright/test";
import { sealSession, openSession } from "../../cloudflare/medico-domain.mjs";

const domain = "https://medico.choicematrix.in";
const backend = "https://jfweexvfnkotusyajkst.supabase.co";
const owner = "00000000-0000-4000-8000-000000000001";
const email = "subhajitsatpathi6@gmail.com";

test("verified owner handoff opens Pulse reports instead of a false expiry error", async ({
  page,
}) => {
  const exp = Math.floor(Date.now() / 1000) + 1800;
  const payload = Buffer.from(
    JSON.stringify({
      sub: owner,
      aud: "authenticated",
      role: "authenticated",
      exp,
    }),
  ).toString("base64url");
  const token = "eyJhbGciOiJIUzI1NiJ9." + payload + ".test-signature";
  const env = { PULSE_HANDOFF_KEY: Buffer.alloc(32, 7).toString("base64") };
  const session = {
    access_token: token,
    refresh_token: "test-refresh",
    expires_at: new Date(exp * 1000).toISOString(),
  };
  const user = {
    id: owner,
    email,
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    factors: [],
    created_at: new Date().toISOString(),
  };
  const account = {
    userId: owner,
    code: "OWNER",
    owner: true,
    qualified: false,
    credits: 0,
    frozen: false,
    unlocks: [],
    ledger: [],
    tickets: [],
    edits: [],
  };
  const report = {
    users: 1,
    qualified: 0,
    awarded: 0,
    spent: 0,
    edits: 0,
    unlocks: 0,
    profiles: [],
    tickets: [],
    audit: [],
    config: { referrals_enabled: true, imports_enabled: true },
  };
  let exchanges = 0;
  await page.route(domain + "/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/pulse/login") {
      const value = await sealSession(session, env);
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<script>location.replace("/pulse/?verified=1")</script>',
        headers: {
          "Set-Cookie": `__Secure-PulseHandoff=${value}; Path=/pulse; Max-Age=120; Secure; HttpOnly; SameSite=Strict`,
          "Cache-Control": "no-store",
        },
      });
      return;
    }
    if (url.pathname === "/pulse/session") {
      exchanges++;
      expect(route.request().method()).toBe("POST");
      expect(route.request().headers()["origin"]).toBe(domain);
      const requestHeaders = await route.request().allHeaders();
      const value = requestHeaders["cookie"]
        .split(";")
        .map((p) => p.trim())
        .find((p) => p.startsWith("__Secure-PulseHandoff="))!
        .slice("__Secure-PulseHandoff=".length);
      const exchanged = await openSession(value, env);
      await route.fulfill({
        json: exchanged,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie":
            "__Secure-PulseHandoff=; Path=/pulse; Max-Age=0; Secure; HttpOnly; SameSite=Strict",
        },
      });
      return;
    }
    expect(url.pathname).not.toBe("/pulse/login/session");
    const response = await route.fetch({
      url: "http://127.0.0.1:4173" + url.pathname + url.search,
    });
    await route.fulfill({ response });
  });
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/v1/user") return route.fulfill({ json: user });
    if (path === "/rest/v1/rpc/medcv_account") {
      const { p_action } = route.request().postDataJSON();
      return route.fulfill({
        json: p_action === "admin_report" ? report : account,
      });
    }
    throw new Error("Unexpected authentication request: " + path);
  });
  // Each fixture navigation starts a new request so Playwright intercepts it.
  // (Redirect-chain requests bypass routing.) Worker tests separately assert HTTP 303.
  // This still exercises cross-site navigation and the real HttpOnly cookie behavior.
  await page.route(
    "https://toolinger-owner.cloudflareaccess.com/test-verified",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<script>location.replace(${JSON.stringify(domain + "/pulse/login")})</script>`,
      }),
  );
  await page.goto("https://toolinger-owner.cloudflareaccess.com/test-verified");
  await expect(
    page.getByRole("heading", { name: "Accounts · newest 200" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Support inbox" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your Gmail is verified. Welcome to Pulse."),
  ).toBeVisible();
  expect(exchanges).toBe(1);
  expect(
    (await page.context().cookies(domain)).some(
      (c) => c.name === "__Secure-PulseHandoff",
    ),
  ).toBe(false);
  expect(new URL(page.url()).search).toBe("");
  expect(
    await page.evaluate(() => sessionStorage.getItem("pulse:expires")),
  ).toBeTruthy();
  await expect(
    page.getByText("Email verification expired. Continue with Gmail again."),
  ).toHaveCount(0);
});

test("owner identity service errors are explained without claiming the email code expired", async ({
  page,
}) => {
  await page.route(domain + "/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: "http://127.0.0.1:4173" + url.pathname + url.search,
    });
    await route.fulfill({ response });
  });
  await page.goto(domain + "/pulse/?login_error=owner_identity_unavailable");
  await expect(
    page.getByText(
      "Your Gmail was verified, but the account service could not open your identity. Please retry.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Accounts · newest 200" }),
  ).toHaveCount(0);
});
