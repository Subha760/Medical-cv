import { test, expect } from "@playwright/test";
import { sealSession, openSession } from "../../cloudflare/medico-domain.mjs";

const domain = "https://medico.choicematrix.in";
const backend = "https://jfweexvfnkotusyajkst.supabase.co";
const owner = "00000000-0000-4000-8000-000000000001";
const email = "subhajitsatpathi6@gmail.com";

test("verified owner handoff opens Pulse reports instead of a false expiry error", async ({
  page,
}) => {
  await page.clock.install();
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
    users: 2,
    qualified: 1,
    awarded: 2,
    spent: 0,
    edits: 0,
    unlocks: 0,
    profiles: [
      {
        user_id: "00000000-0000-4000-8000-000000000002",
        code: "ALPHA",
        credits: 2,
        frozen: false,
        created_at: new Date().toISOString(),
      },
      {
        user_id: "00000000-0000-4000-8000-000000000003",
        code: "BETA",
        credits: 0,
        frozen: true,
        created_at: new Date().toISOString(),
      },
    ],
    tickets: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        subject: "Template help",
        message: "Please explain my unlock",
        status: "open",
        reply: "",
        created_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        subject: "Old request",
        message: "Resolved already",
        status: "resolved",
        reply: "Thanks for contacting support.",
        created_at: new Date().toISOString(),
      },
    ],
    audit: [
      {
        actor: owner,
        action: "admin_credit",
        created_at: new Date().toISOString(),
        details: { reason: "Verified support correction" },
      },
    ],
    config: { referrals_enabled: true, imports_enabled: true },
  };
  let exchanges = 0;
  let reportReads = 0;
  const changes: { p_action: string; p_payload: Record<string, unknown> }[] =
    [];
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
    // Fetch fixtures independently: Firefox retains the original Host header
    // when route.fetch changes the URL, which Vite correctly refuses.
    const response = await page.request.get(
      "http://127.0.0.1:4173" + url.pathname + url.search,
    );
    await route.fulfill({ response });
  });
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/v1/user") return route.fulfill({ json: user });
    if (path === "/rest/v1/rpc/medcv_account") {
      const { p_action, p_payload } = route.request().postDataJSON();
      if (p_action === "admin_credit") {
        changes.push({ p_action, p_payload });
        const profile = report.profiles.find(
          (p) => p.user_id === p_payload.userId,
        )!;
        profile.credits += p_payload.amount;
        return route.fulfill({ json: { ok: true } });
      }
      if (p_action === "admin_ticket") {
        changes.push({ p_action, p_payload });
        const ticket = report.tickets.find((t) => t.id === p_payload.id)!;
        ticket.reply = p_payload.reply;
        ticket.status = "resolved";
        return route.fulfill({ json: { ok: true } });
      }
      if (p_action === "admin_report") reportReads++;
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
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator(".pulse-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await page.getByLabel("Search accounts").fill("ALPHA");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Grant 1 credit", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Reason for administrative changes (required)")
    .fill("Verified support correction");
  await page.getByLabel("Support credit amount").fill("21");
  await expect(
    page.getByRole("button", { name: "Grant 21 credits", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Support credit amount").fill("3");
  await page
    .getByRole("button", { name: "Grant 3 credits", exact: true })
    .click();
  await expect(page.locator(".pulse-credit-value")).toHaveText("5");
  expect(changes[0].p_payload.amount).toBe(3);
  expect(changes[0].p_payload.reason).toBe("Verified support correction");
  await expect(
    page.getByRole("heading", { name: "Old request", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Response to Template help")
    .fill("Your template unlock remains available in Account.");
  await page.getByRole("button", { name: "Reply and resolve" }).click();
  await expect(
    page.getByRole("heading", { name: "Your inbox is clear." }),
  ).toBeVisible();
  await page.getByLabel("Ticket status").selectOption("resolved");
  await expect(
    page.getByRole("heading", { name: "Template help", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Your template unlock remains available in Account."),
  ).toBeVisible();
  const reportsBeforeTick = reportReads;
  await page.clock.fastForward(30001);
  await expect.poll(() => reportReads).toBeGreaterThan(reportsBeforeTick);
  await page.getByLabel("Refresh every 30 seconds").uncheck();
  const reportsWhilePaused = reportReads;
  await page.clock.fastForward(30001);
  await page.waitForTimeout(200);
  expect(reportReads).toBe(reportsWhilePaused);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export filtered accounts" }).click();
  expect((await downloaded).suggestedFilename()).toContain("pulse-accounts");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: `tmp/pulse-upgraded-${test.info().project.name}.png`,
    fullPage: true,
  });
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
    const response = await page.request.get(
      "http://127.0.0.1:4173" + url.pathname + url.search,
    );
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
