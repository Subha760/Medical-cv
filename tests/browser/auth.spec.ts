import { test, expect } from "@playwright/test";
import { firebaseConfig } from "../../src/account/firebaseConfig";
const firebase = "https://identitytoolkit.googleapis.com/**";
const id = "test-firebase-user";
const token = () =>
  "eyJhbGciOiJSUzI1NiJ9." +
  Buffer.from(
    JSON.stringify({
      sub: id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      auth_time: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64url") +
  ".fixture";
const account = {
  userId: id,
  code: "AABBCCDDEEFF",
  credits: 0,
  owner: false,
  emailVerified: false,
  qualified: false,
  frozen: false,
  unlocks: [],
  ledger: [],
  tickets: [],
  edits: [],
};
async function setup(page: any) {
  await page.route(firebase, async (route: any) => {
    const url = route.request().url();
    if (url.includes("accounts:lookup"))
      return route.fulfill({
        json: {
          users: [
            {
              localId: id,
              email: "nurse@example.test",
              emailVerified: false,
              providerUserInfo: [
                { providerId: "password", email: "nurse@example.test" },
              ],
            },
          ],
        },
      });
    if (url.includes("accounts:sendOobCode"))
      return route.fulfill({ json: { email: "nurse@example.test" } });
    return route.fulfill({
      json: {
        localId: id,
        email: "nurse@example.test",
        idToken: token(),
        refreshToken: "fixture-refresh",
        expiresIn: "3600",
      },
    });
  });
  await page.route("https://medico.choicematrix.in/api/account", (route: any) =>
    route.fulfill({ json: account }),
  );
}
test("signup validates confirmation, requests a verification email and opens a basic account", async ({
  page,
}) => {
  await setup(page);
  let verification = false;
  await page.route(firebase, async (route) => {
    const body = route.request().postDataJSON();
    if (route.request().url().includes("sendOobCode")) {
      verification = body.requestType === "VERIFY_EMAIL";
      await route.fulfill({ json: { email: "nurse@example.test" } });
    } else await route.fallback();
  });
  await page.goto("/#/signup");
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByLabel("Confirm password").fill("Different123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await page.getByLabel("Confirm password").fill("SecurePass123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/account/);
  await expect.poll(() => verification).toBe(true);
  await expect(
    page.getByText("You’re signed in. Verify your email", { exact: false }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "SecurePass123",
  );
});
test("login survives reload; logout preserves drafts and owner storage", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/#/login");
  await page.evaluate(() => {
    localStorage.setItem("medcv:workspace", '{"notes":"saved nursing notes"}');
    localStorage.setItem("pulse:theme", "dark");
  });
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("You’re signed in. Verify your email", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("You’re signed in. Verify your email", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  expect(
    await page.evaluate(() => localStorage.getItem("medcv:workspace")),
  ).toContain("saved nursing notes");
  expect(await page.evaluate(() => localStorage.getItem("pulse:theme"))).toBe(
    "dark",
  );
});
test("invalid credentials produce clear recovery guidance", async ({
  page,
}) => {
  await page.route(firebase, (route) =>
    route.fulfill({
      status: 400,
      json: { error: { message: "INVALID_LOGIN_CREDENTIALS" } },
    }),
  );
  await page.goto("/#/login");
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("older123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("password");
  await expect(page.getByRole("link", { name: /Forgot/ })).toBeVisible();
});
test("password reset uses Firebase hosted recovery and does not expose account existence", async ({
  page,
}) => {
  let request: any;
  await page.route(firebase, (route) => {
    request = route.request().postDataJSON();
    return route.fulfill({ json: { email: "nurse@example.test" } });
  });
  await page.goto("/#/forgot-password");
  await page.locator("#auth-email").fill("nurse@example.test");
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  expect(request?.requestType).toBe("PASSWORD_RESET");
  expect(request.continueUrl).toBe(
    "https://medico.choicematrix.in/#/login?email_return=reset",
  );
  await expect(page.getByRole("status")).toContainText(
    "If an account uses this email",
  );
});
test("reset URL alone cannot authorize password changes; signup fits small phones", async ({
  page,
}) => {
  await page.goto("/?auth=reset");
  await expect(
    page.getByRole("link", { name: "Request a reset link" }),
  ).toBeVisible();
  const requests: unknown[] = [];
  await page.route(firebase, (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.locator("#auth-password").fill("NewSecurePass123");
  await page.getByLabel("Confirm password").fill("NewSecurePass123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/reset-password/);
  expect(requests).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/#/signup");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
});
test("failed signup does not announce success or erase work", async ({
  page,
}) => {
  await page.route(firebase, (route) =>
    route.fulfill({
      status: 503,
      json: { error: { message: "INTERNAL_ERROR" } },
    }),
  );
  await page.goto("/#/signup");
  await page.evaluate(() =>
    localStorage.setItem("medcv:workspace", "preserved"),
  );
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByLabel("Confirm password").fill("SecurePass123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/signup/);
  expect(
    await page.evaluate(() => localStorage.getItem("medcv:workspace")),
  ).toBe("preserved");
});

test("account service failure keeps the Firebase session available for retry", async ({
  page,
}) => {
  await setup(page);
  let fail = true;
  await page.route("https://medico.choicematrix.in/api/account", (route) =>
    fail
      ? route.fulfill({
          status: 503,
          json: { error: "Account service unavailable." },
        })
      : route.fallback(),
  );
  await page.goto("/#/login");
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Account service unavailable",
  );
  await expect(
    page.getByRole("heading", { name: "You’re signed in" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toHaveCount(
    0,
  );
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByText("You’re signed in. Verify your email", { exact: false }),
  ).toBeVisible();
});

test("password reset accepts a Firebase reset link and returns to sign-in", async ({
  page,
}) => {
  const requests: unknown[] = [];
  await page.route(
    "https://identitytoolkit.googleapis.com/**/accounts:resetPassword?*",
    (route) => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({
        json: { email: "nurse@example.test", requestType: "PASSWORD_RESET" },
      });
    },
  );
  await page.goto("/#/reset-password");
  await page
    .getByLabel("Original password reset link")
    .fill(
      `https://${firebaseConfig.authDomain}/__/auth/action?mode=resetPassword&apiKey=${firebaseConfig.apiKey}&oobCode=test-reset-code`,
    );
  await page.locator("#auth-password").fill("NewSecurePass123");
  await page.getByLabel("Confirm password").fill("NewSecurePass123");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Password updated" }),
  ).toBeVisible();
  await expect(page.locator("#auth-email")).toHaveValue("nurse@example.test");
  expect(requests).toEqual([
    expect.objectContaining({ oobCode: "test-reset-code" }),
    expect.objectContaining({
      oobCode: "test-reset-code",
      newPassword: "NewSecurePass123",
    }),
  ]);
});

test("signup stays recoverable when verification email fails", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route(
    "https://identitytoolkit.googleapis.com/**/accounts:sendOobCode?*",
    (route) =>
      ++attempts === 1
        ? route.fulfill({
            status: 400,
            json: { error: { message: "TOO_MANY_ATTEMPTS_TRY_LATER" } },
          })
        : route.fallback(),
  );
  await page.goto("/#/signup");
  await page.locator("#auth-email").fill("nurse@example.test");
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByLabel("Confirm password").fill("SecurePass123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/verify-email/);
  await expect(page.getByRole("alert")).toContainText(
    "Your account was created",
  );
  await page.getByRole("button", { name: "Resend verification email" }).click();
  await expect(
    page.getByText("A new verification email was requested.", { exact: false }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});
