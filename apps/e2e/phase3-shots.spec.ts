import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { scheme, seedHome, shotDir } from "./helpers.ts";

const DIR = shotDir("phase3");

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}

async function pair(page: Page, prefix: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await scheme(page, "light");
  await shot(page, `${prefix}-light-1280`);
  await scheme(page, "dark");
  await shot(page, `${prefix}-dark-1280`);
}

test("phase 3 screenshots at 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-list")).toBeVisible();
  await expect(page.getByTestId("run-status-acme/web#41")).toHaveText("Interrupted");
  await pair(page, "runs-mixed");

  await page.getByTestId("archive-acme/web#42").click();
  await expect(page.getByTestId("run-status-acme/web#40")).not.toHaveText("Queued", { timeout: 20_000 });
  await pair(page, "queued-started");

  await page.getByTestId("run-status-acme/api#43").click();
  await expect(page.getByTestId("cap-hit")).toBeVisible();
  await pair(page, "cap-hit");

  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("resume-acme/web#41").click();
  await expect(page.getByTestId("resume-acme/web#41")).toHaveCount(0);
  await page.getByTestId("run-status-acme/web#41").click();
  await expect(page.getByTestId("change-page")).toBeVisible();
  await pair(page, "resumed");
});
