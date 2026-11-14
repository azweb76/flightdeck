import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedHome } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/octokit-fixes";

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
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, `${prefix}-1440`);
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, `${prefix}-1024`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("settings GitHub missing scopes", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("github-form")).toBeVisible();
  await page.getByTestId("github-token").fill("scopes");
  await page.getByTestId("github-save").click();
  await expect(page.getByTestId("github-form-error")).toContainText("missing scopes");
  await expect(page.getByTestId("github-status")).toContainText("missing scopes");
  await expect(page.getByTestId("github-status")).not.toContainText("Not connected");
  await expect(page.getByTestId("preflight-github")).toContainText("missing scopes");
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-github-scopes-light");
  await scheme(page, "dark");
  await pair(page, "settings-github-scopes-dark");
});
