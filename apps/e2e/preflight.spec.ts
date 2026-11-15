import { expect, test } from "@playwright/test";
import { seedHome, setPreflight, startNewIdea } from "./helpers.ts";

test("demo home has no preflight banner and Shape stays enabled", async ({ page }) => {
  await seedHome(page);
  await expect(page.getByTestId("preflight-banner")).toHaveCount(0);
  await expect(page.getByTestId("new-idea")).toBeEnabled();
  await expect(page.getByTestId("shape-PROJ-150")).toBeEnabled();
});

test("failing preflight shows the banner, Re-check, and gated Shape", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await expect(page.getByTestId("preflight-banner")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("preflight-fix-github")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("new-idea")).toBeDisabled();
  await expect(page.getByTestId("shape-PROJ-150")).toBeDisabled();
  await page.getByTestId("new-idea-gate").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "brew install git" })).toHaveCount(1);
  await page.getByRole("heading", { name: "My issues" }).hover();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByTestId("start-PROJ-150-gate").hover();
  await expect(page.getByRole("tooltip").filter({ hasText: "brew install git" })).toHaveCount(1);
  await page.getByTestId("preflight-recheck").click();
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await setPreflight(page, "pass");
  await page.goto("/");
  await expect(page.getByTestId("preflight-banner")).toHaveCount(0);
  await expect(page.getByTestId("new-idea")).toBeEnabled();
});

test("Settings stays save-only while the banner holds Re-check", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-section")).toHaveCount(0);
  await expect(page.getByTestId("preflight-recheck")).toHaveCount(0);
  await expect(page.getByTestId("github-token-source")).toContainText("Using GITHUB_TOKEN from environment");
  await page.goto("/");
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await expect(page.getByTestId("preflight-github")).toContainText("Fail");
  await page.getByTestId("preflight-recheck").click();
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByTestId("github-form")).toBeVisible();
  await expect(page.getByTestId("preflight-section")).toHaveCount(0);
});

test("Save tracker cards explain gated GitHub and Jira", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await setPreflight(page, "fail");
  await page.getByTestId("save-issue").click();
  await expect(page.getByTestId("tracker-github")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("tracker-jira")).toContainText("Add a Jira API token");
  await page.getByTestId("tracker-github").click();
  await expect(page.getByTestId("tracker-gate-hint")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("confirm-save")).toBeDisabled();
});
