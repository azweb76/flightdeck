import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedHome, setPreflight } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/octokit";

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

test("settings GitHub connected, empty, and error", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("github-form")).toBeVisible();
  await expect(page.getByTestId("github-status")).toContainText("dan-demo");
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-github-connected-light");
  await scheme(page, "dark");
  await pair(page, "settings-github-connected-dark");
  await page.getByTestId("github-disconnect").click();
  await expect(page.getByTestId("github-status")).toContainText("Not connected");
  await expect(page.getByTestId("preflight-github")).toContainText("Fail");
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-github-empty-light");
  await scheme(page, "dark");
  await pair(page, "settings-github-empty-dark");
  await page.getByTestId("github-token").fill("fail");
  await page.getByTestId("github-save").click();
  await expect(page.getByTestId("github-form-error")).toBeVisible();
  await expect(page.getByTestId("preflight-github")).toContainText("rejected");
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-github-error-light");
  await scheme(page, "dark");
  await pair(page, "settings-github-error-dark");
});

test("preflight GitHub token fail", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toContainText("Add a GitHub token in Settings");
  await scheme(page, "light");
  await pair(page, "preflight-github-fail-light");
  await scheme(page, "dark");
  await pair(page, "preflight-github-fail-dark");
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-github")).toContainText("Fail");
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-preflight-github-fail-light");
  await scheme(page, "dark");
  await pair(page, "settings-preflight-github-fail-dark");
});
