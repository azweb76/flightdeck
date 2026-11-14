import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedHome, setPreflight, startNewIdea } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/preflight";

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string, fullPage = true): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage });
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

test("banner failing", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await expect(page.getByTestId("new-idea")).toBeDisabled();
  await scheme(page, "light");
  await pair(page, "banner-fail-light");
  await scheme(page, "dark");
  await pair(page, "banner-fail-dark");
});

test("gated tooltips", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("new-idea")).toBeDisabled();
  await scheme(page, "dark");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByTestId("shape-PROJ-150-gate").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "brew install git" }).first()).toBeVisible();
  await shot(page, "gated-shape-tooltip-dark-1440", false);
  await page.getByRole("heading", { name: "My issues" }).hover();
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.getByTestId("new-idea-gate").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "brew install git" }).first()).toBeVisible();
  await shot(page, "gated-new-idea-tooltip-dark-1024", false);
  await scheme(page, "light");
  await page.getByTestId("new-idea-gate").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "brew install git" }).first()).toBeVisible();
  await shot(page, "gated-new-idea-tooltip-light-1024", false);
});

test("banner passing", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "pass");
  await page.goto("/");
  await expect(page.getByTestId("preflight-banner")).toHaveCount(0);
  await expect(page.getByTestId("new-idea")).toBeEnabled();
  await scheme(page, "light");
  await pair(page, "banner-pass-light");
  await scheme(page, "dark");
  await pair(page, "banner-pass-dark");
});

test("settings section", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-section")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "settings-light");
  await scheme(page, "dark");
  await pair(page, "settings-dark");
});

test("save github gated", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await setPreflight(page, "fail");
  await scheme(page, "light");
  await page.getByTestId("save-issue").click({ force: true });
  await expect(page.getByRole("dialog")).toContainText("Choose Jira or GitHub");
  await page.getByTestId("tracker-select").click({ force: true });
  await expect(page.getByTestId("tracker-github")).toHaveAttribute("aria-disabled", "true");
  await shot(page, "save-github-gated-light-1440", false);
  await page.keyboard.press("Escape");
  await scheme(page, "dark");
  await page.getByTestId("save-issue").click({ force: true });
  await page.getByTestId("tracker-select").click({ force: true });
  await expect(page.getByTestId("tracker-github")).toHaveAttribute("aria-disabled", "true");
  await shot(page, "save-github-gated-dark-1440", false);
});
