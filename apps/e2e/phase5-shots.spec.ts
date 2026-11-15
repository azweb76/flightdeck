import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { raiseConcurrent, scheme, seedHome, shotDir } from "./helpers.ts";

const DIR = shotDir("phase5");

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}

async function pair(page: Page, prefix: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await scheme(page, "light");
  await shot(page, `${prefix}-light`);
  await scheme(page, "dark");
  await shot(page, `${prefix}-dark`);
}

test("phase 5 screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await raiseConcurrent(page, 10);

  await page.getByRole("tab", { name: "Reviews" }).click();
  await expect(page.getByTestId("review-list")).toBeVisible();
  await pair(page, "reviews-list");

  await page.getByTestId("review-row-91").click();
  await expect(page.getByTestId("review-detail-status")).toHaveText("Reviewing");
  await pair(page, "review-in-progress");

  await page.getByRole("tab", { name: "Reviews" }).click();
  await page.getByTestId("review-row-92").click();
  await expect(page.getByTestId("draft-comments")).toBeVisible();
  await expect(page.getByTestId("review-summary")).toContainText("Looks close");
  await expect(page.getByTestId("draft-approve-24")).toBeVisible();
  await pair(page, "review-drafts");

  await page.getByTestId("draft-approve-24").click();
  await expect(page.getByTestId("draft-src/checkout.ts-24")).toContainText("approved");
  await page.getByTestId("open-post-review").click();
  await expect(page.getByTestId("post-review-dialog")).toBeVisible();
  await pair(page, "review-post-dialog");
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(page.getByTestId("review-chat")).toBeVisible();
  await page.getByTestId("review-reply").fill("Walk me through the checkout guard.");
  await pair(page, "review-chat");
});
