import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedHome } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/phase2";

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
}

async function scheme(page: Page, mode: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme: mode });
  await page.evaluate((next) => {
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.style.colorScheme = next;
  }, mode);
}

async function pair(page: Page, prefix: string): Promise<void> {
  await scheme(page, "light");
  await shot(page, `${prefix}-light`);
  await scheme(page, "dark");
  await shot(page, `${prefix}-dark`);
}

test("phase 2 screenshots", async ({ page }) => {
  await seedHome(page);
  await pair(page, "issues-start");

  await page.getByTestId("start-acme/web#15").click();
  await expect(page.getByTestId("run-option-paid")).toBeVisible({ timeout: 20_000 });
  await pair(page, "question-reply");
  await page.getByTestId("run-option-paid").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
  await pair(page, "draft-pr");

  await page.goto("/");
  await page.getByTestId("start-acme/web#12").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("change-status")).toContainText("Done");
  await pair(page, "live-transcript");

  await page.goto("/");
  await page.getByTestId("start-acme/web#21").click();
  await expect(page.getByTestId("needs-dan")).toBeVisible({ timeout: 20_000 });
  await pair(page, "failed-after-3");

  await page.goto("/");
  await page.getByTestId("start-acme/api#8").click();
  await expect(page.getByTestId("cap-hit")).toBeVisible({ timeout: 20_000 });
  await pair(page, "cap-hit");

  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-row").first()).toBeVisible();
  await pair(page, "runs");
  await page.getByTestId("archive-acme/web#12").click();
  await expect(page.getByTestId("run-status-acme/web#12")).toContainText("Archived");
  await pair(page, "archive");

  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByTestId("github-token-source")).toContainText("Using GITHUB_TOKEN from environment");
  await pair(page, "settings-github");
});
