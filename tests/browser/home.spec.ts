import { test, expect } from "@playwright/test";

test("home categories search, open a filtered gallery and carry the selected colour into the CV", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".home-category")).toHaveCount(8);
  await page
    .getByRole("button", { name: "purple accent", exact: true })
    .click();
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Timeline", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "purple accent", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Explore categories", { exact: true }).fill("student");
  await expect(page.locator(".home-category")).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Explore Student & Graduate templates",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Template category")).toHaveValue("STUDENT");
  await expect(page.locator(".template-card")).toHaveCount(8);
  await page.locator(".template-card").first().click();
  await page
    .getByRole("button", { name: "Use this template", exact: true })
    .click();
  await expect(page.locator("#cv-name")).toBeVisible();
  const saved = await page.evaluate(() => {
    const documents = JSON.parse(
      localStorage.getItem("medcv:documents") || "[]",
    );
    return documents.some(
      (doc: { colorId: string }) => doc.colorId === "purple",
    );
  });
  expect(saved).toBeTruthy();
});

test("Mira stays at the lower right, traps dialog focus and keeps an unfinished answer when closed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  const launcher = page.getByRole("button", {
    name: "Open Mira CV guide",
    exact: true,
  });
  const bounds = await launcher.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds).not.toBeNull();
  expect(viewport.width - bounds!.x - bounds!.width).toBeLessThanOrEqual(24);
  expect(viewport.height - bounds!.y - bounds!.height).toBeLessThanOrEqual(24);
  await launcher.click();
  const panel = page.getByRole("dialog", {
    name: "Mira · Your CV guide",
    exact: true,
  });
  await expect(panel).toBeVisible();
  await page
    .getByRole("button", { name: "Start guided CV", exact: true })
    .click();
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("Not finished yet");
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(page.getByLabel("Your answer", { exact: true })).toHaveValue(
    "Not finished yet",
  );
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest("#mira-panel")),
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Close Mira", exact: true }).click();
  await page
    .getByRole("button", { name: "Toggle colour theme", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});

test("home search recovers from no results and reduced-motion mode disables robot animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByLabel("Explore categories", { exact: true })
    .fill("unmatched category");
  await expect(page.getByText(/No categories match/)).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".home-category")).toHaveCount(8);
  expect(
    await page
      .locator(".mira-launcher .robot-float")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  await page
    .getByRole("button", { name: "Customize a design", exact: false })
    .click();
  await expect(page).toHaveURL(/#\/design$/);
});
