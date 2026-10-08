import { test, expect } from "@playwright/test";
test("Mira interviews, skips, saves and opens editable draft", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start guided CV", exact: true })
    .click();
  await page.getByLabel("Your answer", { exact: true }).fill("Jamie Nurse");
  await page.getByRole("button", { name: "Save answer & continue" }).click();
  await expect(
    page.getByText("What professional title should appear under your name?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Skip question", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit draft now" }).click();
  await expect(page.locator("#cv-name")).toHaveValue("Jamie Nurse");
  expect(errors).toEqual([]);
});
test("15 local assistants and reviewed rota import work in dark mode", async ({
  page,
}) => {
  await page.goto("/#/workspace");
  await page.getByRole("button", { name: "Toggle colour theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Assistants", exact: true }).click();
  await expect(page.locator(".assistant-grid button")).toHaveCount(15);
  await page
    .getByLabel(/CV bullet editor · Your notes/)
    .fill("helped with documentation");
  await page.getByRole("button", { name: "Run offline assistant" }).click();
  await expect(page.locator(".assistant-output")).toContainText(
    "Supported documentation",
  );
  await page.getByRole("button", { name: "Shifts", exact: true }).click();
  await page.getByLabel("Rota month").fill("2026-10");
  await page.getByLabel(/Paste your own row/).fill("1 M+E, 2 OFF, 3 CL");
  await page.getByRole("button", { name: "Review roster import" }).click();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(
    page.getByText("14.0 scheduled hours", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("template categories select genuinely different designs", async ({
  page,
}) => {
  await page.goto("/#/new");
  await expect(page.locator(".category-pills button")).toHaveCount(9);
  await page.getByLabel("Template category").selectOption("STUDENT");
  await expect(page.locator(".template-card")).toHaveCount(6);
  await page.locator(".template-card").first().click();
  await page
    .getByRole("button", { name: "Use this template", exact: true })
    .click();
  await expect(page.locator("#cv-name")).toBeVisible();
});
test("complete guided interview supports photo, repeated education and custom sections", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.setViewportSize({ width: 320, height: 720 });
  await page
    .getByRole("button", { name: "Start guided CV", exact: true })
    .click();
  await page.getByLabel("Your answer", { exact: true }).fill("Taylor Student");
  await page.getByRole("button", { name: "Save answer & continue" }).click();
  for (let i = 0; i < 100; i++) {
    if (
      await page
        .getByRole("button", { name: "Add education", exact: true })
        .count()
    )
      break;
    const photo = page.locator('input[type="file"]');
    if (
      (await photo.count()) &&
      (await photo.getAttribute("aria-label")) ===
        "Would you like to add a profile photo?"
    ) {
      const png = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 40;
        c.height = 40;
        c.getContext("2d")!.fillRect(0, 0, 40, 40);
        return c.toDataURL("image/png").split(",")[1];
      });
      await photo.setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: Buffer.from(png, "base64"),
      });
      await expect(page.locator(".chat-bubble")).not.toHaveText(
        "Would you like to add a profile photo?",
      );
    } else
      await page
        .getByRole("button", { name: "Skip question", exact: true })
        .click();
  }
  await page
    .getByRole("button", { name: "Add education", exact: true })
    .click();
  await page.getByLabel("Your answer", { exact: true }).fill("BSc Nursing");
  await page.getByRole("button", { name: "Save answer & continue" }).click();
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Skip question", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Add custom section", exact: true })
    .click();
  await page.getByLabel("Your answer", { exact: true }).fill("Volunteering");
  await page.getByRole("button", { name: "Save answer & continue" }).click();
  for (let i = 0; i < 4; i++)
    await page
      .getByRole("button", { name: "Skip question", exact: true })
      .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Review and finish my CV →",
      exact: true,
    }),
  ).toBeVisible();
  const docs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("medcv:documents")!),
  );
  expect(docs[0].education[0].degree).toBe("BSc Nursing");
  expect(docs[0].personalInfo.profilePhotoDataUrl).toMatch(/^data:image\/jpeg/);
  expect(docs[0].customSections[0].title).toBe("Volunteering");
});
test("first offline install has no false update notice and dark buttons are readable", async ({
  page,
}) => {
  await page.goto("/#/workspace");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.getByRole("button", { name: "Toggle colour theme" }).click();
  await page.getByRole("button", { name: "Shifts", exact: true }).click();
  await expect(
    page.getByText("An app update is ready. Finish editing first.", {
      exact: false,
    }),
  ).not.toBeVisible();
  const contrast = await page
    .getByRole("button", { name: "Review roster import" })
    .evaluate((el) => {
      const style = getComputedStyle(el);
      const luminance = (s: string) => {
        const a = s
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      };
      const a = luminance(style.color),
        b = luminance(style.backgroundColor);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
