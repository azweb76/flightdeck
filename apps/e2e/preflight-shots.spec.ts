import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { seedHome, setPreflight, startNewIdea } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/preflight-fixes";

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

async function openTip(page: Page, testId: string, text: string): Promise<void> {
  await page.getByRole("heading", { name: "My issues" }).hover();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByTestId(testId).hover();
  const tip = page.getByRole("tooltip").filter({ hasText: text });
  await expect(tip).toHaveCount(1);
  await expect(tip).toBeInViewport();
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
  await scheme(page, "light");
  await pair(page, "banner-fail-light");
  await scheme(page, "dark");
  await pair(page, "banner-fail-dark");
});

test("tooltips on New idea, Shape, and Start", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const mode of ["light", "dark"] as const) {
    await scheme(page, mode);
    await openTip(page, "new-idea-gate", "brew install git");
    await shot(page, `tooltip-new-idea-${mode}-1440`, false);
    await openTip(page, "shape-PROJ-150-gate", "brew install git");
    await shot(page, `tooltip-shape-${mode}-1440`, false);
    await openTip(page, "start-PROJ-150-gate", "brew install git");
    await shot(page, `tooltip-start-${mode}-1440`, false);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await scheme(page, "light");
  await openTip(page, "new-idea-gate", "brew install git");
  await shot(page, "tooltip-new-idea-light-1024", false);
  await openTip(page, "shape-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-shape-light-1024", false);
  await openTip(page, "start-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-start-light-1024", false);
  await scheme(page, "dark");
  await openTip(page, "new-idea-gate", "brew install git");
  await shot(page, "tooltip-new-idea-dark-1024", false);
  await openTip(page, "shape-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-shape-dark-1024", false);
  await openTip(page, "start-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-start-dark-1024", false);
});

test("settings pass and fail", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-section")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "settings-pass-light");
  await scheme(page, "dark");
  await pair(page, "settings-pass-dark");
  await setPreflight(page, "fail");
  await expect(page.getByTestId("claude-status")).toContainText("Needs login");
  await scheme(page, "light");
  await pair(page, "settings-fail-light");
  await scheme(page, "dark");
  await pair(page, "settings-fail-dark");
});

test("save tracker cards gated", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await setPreflight(page, "fail");
  await page.getByTestId("save-issue").click({ force: true });
  await expect(page.getByTestId("tracker-github")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("tracker-jira")).toContainText("Add a Jira API token");
  await page.getByTestId("tracker-github").click();
  await expect(page.getByTestId("tracker-gate-hint")).toBeVisible();
  await scheme(page, "light");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "save-gated-light-1440", false);
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "save-gated-light-1024", false);
  await scheme(page, "dark");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "save-gated-dark-1440", false);
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "save-gated-dark-1024", false);
});
