import { test, expect } from "@playwright/test";
const backend = "https://jfweexvfnkotusyajkst.supabase.co";
test("signup has a separate page, validates confirmation and requests verified email", async ({
  page,
}) => {
  let calls = 0;
  await page.route(backend + "/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/signup") {
      calls++;
      expect(url.searchParams.get("redirect_to")).toContain("auth=verify");
      await route.fulfill({
        json: {
          user: {
            id: "00000000-0000-4000-8000-000000000022",
            email: "nurse@example.test",
            identities: [],
          },
          session: null,
        },
      });
    } else await route.fulfill({ json: {} });
  });
  await page.goto("/#/signup");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByLabel("Confirm password").fill("DifferentPass123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  expect(calls).toBe(0);
  await page.getByLabel("Confirm password").fill("SecurePass123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/verify-email/);
  await expect(
    page.getByRole("heading", { name: "Verify your email", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "SecurePass123",
  );
});
test("existing short passwords reach the server and recovery errors are understandable", async ({
  page,
}) => {
  let calls = 0;
  await page.route(backend + "/**", async (route) => {
    calls++;
    await route.fulfill({
      status: 400,
      json: {
        code: "invalid_credentials",
        message: "Invalid login credentials",
      },
    });
  });
  await page.goto("/#/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("nurse@example.test");
  await page.locator("#auth-password").fill("older123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("password");
  expect(calls).toBe(1);
  await expect(page.getByRole("link", { name: /Forgot/ })).toBeVisible();
});
test("reset URL alone cannot authorize password changes and mobile layout fits", async ({
  page,
}) => {
  await page.goto("/?auth=reset");
  await expect(
    page.getByRole("link", { name: "Request a reset link" }),
  ).toBeVisible();
  await expect(page.locator("#auth-password")).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
test("persistent login survives reload and local logout preserves work and Pulse storage", async ({
  page,
}) => {
  const id = "00000000-0000-4000-8000-000000000022";
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id,
    email: "nurse@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token:
      "eyJhbGciOiJIUzI1NiJ9." +
      Buffer.from(
        JSON.stringify({ sub: id, role: "authenticated", exp }),
      ).toString("base64url") +
      ".fixture",
    refresh_token: "fixture",
    expires_at: exp,
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
  let logoutScope = "";
  await page.route(backend + "/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/token")
      return route.fulfill({ json: session });
    if (url.pathname === "/auth/v1/user") return route.fulfill({ json: user });
    if (url.pathname === "/auth/v1/logout") {
      logoutScope = url.searchParams.get("scope") || "";
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === "/rest/v1/rpc/medcv_account")
      return route.fulfill({
        json: {
          userId: id,
          code: "AABBCCDDEEFF",
          credits: 3,
          owner: false,
          qualified: false,
          frozen: false,
          unlocks: [],
          ledger: [],
          tickets: [],
          edits: [],
        },
      });
    return route.fulfill({ json: {} });
  });
  await page.goto("/#/login");
  await page.evaluate(() => {
    localStorage.setItem("medcv:workspace", '{"notes": "kept"}');
    localStorage.setItem("pulse:auth", "separate-owner-session");
  });
  await page.getByLabel("Email address", { exact: true }).fill(user.email);
  await page.locator("#auth-password").fill("older123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  expect(logoutScope).toBe("local");
  expect(
    await page.evaluate(() => localStorage.getItem("medcv:workspace")),
  ).toContain("kept");
  expect(await page.evaluate(() => localStorage.getItem("pulse:auth"))).toBe(
    "separate-owner-session",
  );
  await expect(page.getByLabel("Email address", { exact: true })).toHaveValue(
    user.email,
  );
});

test("password recovery requests the canonical callback and explains delivery without exposing account existence", async ({
  page,
}) => {
  let recovery = 0;
  await page.route(backend + "/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/recover") {
      recovery++;
      expect(url.searchParams.get("redirect_to")).toContain("auth=reset");
      expect(route.request().postDataJSON().email).toBe("nurse@example.test");
    }
    await route.fulfill({ json: {} });
  });
  await page.goto("/#/forgot-password");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("nurse@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText(
    "If an account uses this email",
  );
  await expect(
    page.getByRole("button", { name: /Try again in/ }),
  ).toBeDisabled();
  expect(recovery).toBe(1);
});

test("a verified recovery callback permits one password update without losing the account", async ({
  page,
}) => {
  const id = "00000000-0000-4000-8000-000000000022",
    exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id,
    email: "nurse@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token =
    "eyJhbGciOiJIUzI1NiJ9." +
    Buffer.from(
      JSON.stringify({ sub: id, role: "authenticated", exp }),
    ).toString("base64url") +
    ".fixture";
  let updates = 0;
  await page.route(backend + "/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/auth/v1/user") {
      if (route.request().method() === "PUT") {
        updates++;
        expect(route.request().postDataJSON().password).toBe(
          "RecoveredPass123",
        );
      }
      return route.fulfill({ json: user });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto(
    "/?auth=reset#access_token=" +
      token +
      "&refresh_token=fixture&expires_in=3600&token_type=bearer&type=recovery",
  );
  await expect(
    page.getByRole("heading", { name: "Set new password", exact: true }),
  ).toBeVisible();
  await page.locator("#auth-password").fill("RecoveredPass123");
  await page.getByLabel("Confirm password").fill("RecoveredPass123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect(updates).toBe(1);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "RecoveredPass123",
  );
  await expect(page).toHaveURL(/reset-password/);
});

test("account page Tools button opens the tools panel directly", async ({
  page,
}) => {
  await page.goto("/#/login");
  await page.getByRole("button", { name: "Open tools", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Tools & appearance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close tools" }).click();
  await expect(
    page.getByRole("dialog", { name: "Tools & appearance" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Tools & appearance" }),
  ).toHaveCount(0);
});
