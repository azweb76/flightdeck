import { expect, test } from "@playwright/test";
import { seedHome } from "./helpers.ts";

test("successful run opens a draft PR", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("start-acme/web#12").click();
  await expect(page.getByTestId("change-page")).toBeVisible();
  await expect(page.getByTestId("transcript")).toBeVisible();
  await expect(page.getByTestId("pr-link")).toContainText("/pull/42", { timeout: 20_000 });
  await expect(page.getByTestId("change-status")).toContainText("Done");
  await expect(page.getByTestId("stage-ci")).toContainText("Phase 4");
});

test("run can pause for a question and continue after a reply", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("start-acme/web#15").click();
  await expect(page.getByTestId("run-option-paid")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("run-option-paid").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
});

test("failed review rounds ask Dan", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("start-acme/web#21").click();
  await expect(page.getByTestId("needs-dan")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("stage-review")).toContainText("Round 3 of 3");
});

test("dollar cap stops the run", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("start-acme/api#8").click();
  await expect(page.getByTestId("cap-hit")).toBeVisible({ timeout: 20_000 });
});

test("Runs page lists changes and archive works", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("start-acme/web#12").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-row")).toHaveCount(1);
  await page.getByTestId("archive-acme/web#12").click();
  await expect(page.getByTestId("run-status-acme/web#12")).toContainText("Archived");
});
