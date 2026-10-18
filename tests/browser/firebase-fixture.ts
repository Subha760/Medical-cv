import type { Page } from "@playwright/test";

const firebase = "https://identitytoolkit.googleapis.com/**";
export const firebaseTestUser = {
  id: "test-firebase-user",
  email: "nurse@example.test",
};

function token() {
  const now = Math.floor(Date.now() / 1000);
  return (
    "eyJhbGciOiJSUzI1NiJ9." +
    Buffer.from(
      JSON.stringify({
        sub: firebaseTestUser.id,
        exp: now + 3600,
        iat: now,
        auth_time: now,
      }),
    ).toString("base64url") +
    ".fixture"
  );
}

/** Exercise Firebase Auth through the UI instead of forging its local cache. */
export async function signInFirebaseFixture(page: Page) {
  await page.route(firebase, async (route) => {
    const url = route.request().url();
    if (url.includes("accounts:lookup"))
      return route.fulfill({
        json: {
          users: [
            {
              localId: firebaseTestUser.id,
              email: firebaseTestUser.email,
              emailVerified: true,
              providerUserInfo: [
                { providerId: "password", email: firebaseTestUser.email },
              ],
            },
          ],
        },
      });
    return route.fulfill({
      json: {
        localId: firebaseTestUser.id,
        email: firebaseTestUser.email,
        idToken: token(),
        refreshToken: "fixture-refresh",
        expiresIn: "3600",
      },
    });
  });
  await page.goto("/#/login");
  await page.locator("#auth-email").fill(firebaseTestUser.email);
  await page.locator("#auth-password").fill("SecurePass123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/#\/account/);
}
