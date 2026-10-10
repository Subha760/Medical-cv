import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { Document, Packer, Paragraph } from "docx";
test("free and premium libraries, original previews and custom design work", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/#/new");
  await page
    .getByRole("button", { name: "Premium · 86 designs", exact: true })
    .click();
  await expect(page.locator(".premium-card")).toHaveCount(86);
  await expect(page.locator(".premium-card img").first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".premium-card img")
        .first()
        .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
    )
    .toBeTruthy();
  await page.locator(".premium-card").first().click();
  await expect(
    page.getByRole("heading", { name: "Account & referral credits" }),
  ).toBeVisible();
  await page.goto("/#/design");
  await expect(
    page.getByRole("heading", { name: "A layout that feels like you." }),
  ).toBeVisible();
  await page.getByLabel("Design name").fill("My Nursing Portfolio");
  await page.getByLabel("layout", { exact: true }).selectOption("ledger");
  await page.getByLabel("fontStyle", { exact: true }).selectOption("serif");
  // Keep an in-flight smooth scroll from moving the lazy PDF host out of view.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "View live layout preview" }).click();
  await page.locator(".pdf-pages > div").first().scrollIntoViewIfNeeded();
  await expect(page.locator(".pdf-pages > div").first()).toBeInViewport();
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Apply custom design" }).click();
  await expect(
    page.getByText("Personal Details", { exact: true }),
  ).toBeVisible();
  const draft = await page.evaluate(
    () => JSON.parse(localStorage.getItem("medcv:documents") || "[]")[0],
  );
  expect(draft.customTemplate.layout).toBe("ledger");
  expect(draft.customTemplate.fontStyle).toBe("serif");
  expect(pageErrors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("PDF and Word references can be previewed without spending credits", async ({
  page,
}) => {
  await page.goto("/#/import");
  const p = await PDFDocument.create();
  p.addPage();
  const bytes = await p.save();
  await page.getByLabel("Reference document").setInputFiles({
    name: "reference.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(bytes),
  });
  await expect(
    page.getByRole("heading", { name: "Ready to edit reference.pdf" }),
  ).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in to use a referral credit" }),
  ).toBeVisible();
  const word = await Packer.toBuffer(
    new Document({
      sections: [
        { children: [new Paragraph("Original nursing CV reference")] },
      ],
    }),
  );
  await page.getByLabel("Reference document").setInputFiles({
    name: "reference.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: word,
  });
  await expect(page.locator(".word-reference")).toContainText(
    "Original nursing CV reference",
  );
  await expect(
    page.getByRole("heading", { name: "Ready to edit reference.docx" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("Pulse discloses no owner reports to signed-out visitors", async ({
  page,
}) => {
  await page.goto("/pulse/");
  await expect(
    page.getByRole("heading", { name: "Owner sign-in" }),
  ).toBeVisible();
  await expect(page.getByLabel("Owner Gmail")).toHaveValue(
    "subhajitsatpathi6@gmail.com",
  );
  await expect(page.getByLabel("Owner Gmail")).toHaveAttribute("readonly", "");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Continue with Gmail" }),
  ).toHaveAttribute("href", "https://medico.choicematrix.in/pulse/login");
  await expect(
    page.getByRole("heading", { name: "Accounts · newest 200" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Support inbox" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
});
test("privacy, deletion and original guides are public and ads are absent", async ({
  page,
}) => {
  await page.goto("/privacy.html");
  await expect(
    page.getByRole("heading", { name: "Privacy & storage policy" }),
  ).toBeVisible();
  await page.goto("/account-deletion.html");
  await expect(
    page.getByRole("heading", { name: "Delete your account or local data" }),
  ).toBeVisible();
  await page.goto("/guides.html");
  await expect(
    page.getByRole("link", { name: "Build a clear nursing CV" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByLabel("Storage and cache notice")).toBeVisible();
  expect(await page.locator('script[src*="googlesyndication"]').count()).toBe(
    0,
  );
});
