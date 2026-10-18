import { firebaseTestUser, signInFirebaseFixture } from "./firebase-fixture";
import { test, expect } from "@playwright/test";
import { demoCv } from "../../src/data/demoCv";
import {
  LOCKED_ORIGINAL_TEMPLATES,
  TEMPLATE_CATALOG,
} from "../../src/data/templateCatalog";
import { readFileSync } from "node:fs";
const configs = JSON.parse(
  readFileSync("release/premium-configs.json", "utf8"),
);
const backend = "https://medico.choicematrix.in";
const uid = firebaseTestUser.id;
const config = configs[0];
test("forged cached unlocks cannot enable Mira themes or premium exports", async ({
  page,
}) => {
  const cv = demoCv(LOCKED_ORIGINAL_TEMPLATES[0].id, "teal");
  await page.addInitScript(
    ({ cv, config }) => {
      localStorage.setItem("medcv:documents", JSON.stringify([cv]));
      localStorage.setItem(
        "medcv:premium:" + config.id,
        JSON.stringify(config),
      );
      localStorage.setItem("medico:cache-notice", "yes");
    },
    { cv, config },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Create my CV", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Open Mira CV guide", exact: true })
    .click();
  await expect(page.locator("#mira-theme option:not(:disabled)")).toHaveCount(
    10,
  );
  await expect(
    page.locator(`#mira-theme option[value="${config.id}"]`),
  ).toHaveCount(0);
  await page.goto("/#/preview/demo");
  await expect(page.getByText(/This design is locked/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Choose a free or unlocked design",
      exact: true,
    })
    .click();
  await expect(page.locator(".template-card")).toHaveCount(10);
});
test("Mira offers only verified owned designs and exports recheck the server", async ({
  page,
}) => {
  const cv = demoCv(config.id, "teal");
  let denied = false;
  let frozen = false;
  let verifications = 0;
  await page.addInitScript((cv) => {
    localStorage.setItem("medcv:documents", JSON.stringify([cv]));
    localStorage.setItem("medico:cache-notice", "yes");
  }, cv);
  await page.route(backend + "/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/v1/user") return route.fulfill({ json: {} });
    if (path === "/api/account") {
      const body = route.request().postDataJSON();
      if (body.action === "template") {
        verifications++;
        return denied
          ? route.fulfill({ status: 403, json: { error: "Template locked" } })
          : route.fulfill({ json: config });
      }
      return route.fulfill({
        json: {
          userId: uid,
          code: "AABBCCDDEEFF",
          owner: false,
          qualified: true,
          credits: 0,
          frozen,
          unlocks: [config.id],
          ledger: [],
          tickets: [],
          edits: [],
        },
      });
    }
    throw new Error("Unexpected request " + path);
  });
  await signInFirebaseFixture(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Mira CV guide", exact: true })
    .click();
  await expect(page.locator("#mira-theme option")).toHaveCount(11);
  await page.locator("#mira-theme").selectOption(config.id);
  await page.goto("/#/preview/demo");
  await expect(
    page.getByRole("button", { name: "Download PDF", exact: true }).first(),
  ).toBeVisible();
  const before = verifications;
  denied = true;
  await page
    .getByRole("button", { name: "Download PDF", exact: true })
    .first()
    .click();
  await expect(page.getByRole("alert")).toHaveText(/Template locked/);
  expect(verifications).toBeGreaterThan(before);
  frozen = true;
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open Mira CV guide", exact: true })
    .click();
  await expect(page.locator("#mira-theme option")).toHaveCount(10);
  await expect(
    page.locator(`#mira-theme option[value="${config.id}"]`),
  ).toHaveCount(0);
});
