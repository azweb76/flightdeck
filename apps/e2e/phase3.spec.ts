import { expect, test } from "@playwright/test";
import { archiveAllChanges, seedHome } from "./helpers.ts";

test("Runs lists mixed demo states and opens a row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-status-acme/web#40")).toHaveText("Queued");
  await expect(page.getByTestId("run-status-acme/web#42")).toHaveText("Needs you");
  await expect(page.getByTestId("run-status-acme/api#43")).toHaveText("Cap hit");
  await expect(page.getByTestId("run-status-acme/web#44")).toHaveText("Done");
  await expect(page.getByTestId("run-status-acme/web#41")).toHaveText("Interrupted");
  await expect(page.getByTestId("resume-acme/web#41")).toBeVisible();
  await expect(page.getByTestId("run-meta-acme/web#41")).toContainText("acme/web");
  await page.getByTestId("run-status-acme/api#43").click();
  await expect(page.getByTestId("change-page")).toBeVisible();
  await expect(page.getByTestId("cap-hit")).toBeVisible();
  await expect(page.getByTestId("transcript")).toContainText("per-run dollar cap");
});

test("Resume continues an interrupted run", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("resume-acme/web#41").click();
  await expect(page.getByTestId("resume-acme/web#41")).toHaveCount(0);
  await page.getByTestId("run-status-acme/web#41").click();
  await expect(page.getByTestId("change-page")).toBeVisible();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 40_000 });
});

test("Archive removes a finished run and Start queues over the cap", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("archive-acme/web#44").click();
  await expect(page.getByTestId("run-status-acme/web#44")).toHaveText("Archived");
  await expect(page.getByTestId("archive-acme/web#44")).toBeDisabled();
  await archiveAllChanges(page);

  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByTestId("cap-concurrent").fill("1");
  await page.getByTestId("cap-concurrent").blur();
  await expect(page.getByTestId("cap-saved")).toBeVisible();

  await page.goto("/");
  await page.getByTestId("start-acme/web#15").click();
  await expect(page.getByTestId("run-option-paid")).toBeVisible({ timeout: 20_000 });
  await page.goto("/");
  await page.getByTestId("start-acme/web#50").click();
  await expect(page.getByTestId("run-queued")).toBeVisible();
});
