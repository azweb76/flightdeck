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

test("Settings lists every preflight check", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-section")).toBeVisible();
  await expect(page.getByTestId("preflight-node")).toContainText("Pass");
  await expect(page.getByTestId("preflight-github")).toContainText("dan-demo");
  await expect(page.getByTestId("claude-recheck")).toHaveCount(0);
  await page.getByTestId("preflight-section").getByTestId("preflight-recheck").click();
  await expect(page.getByTestId("preflight-claude")).toContainText("Pass");
});

test("failing preflight matches Settings cards", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await page.goto("/settings");
  await expect(page.getByTestId("preflight-claude")).toContainText("Fail");
  await expect(page.getByTestId("claude-status")).toContainText("Needs login");
  await expect(page.getByTestId("github-status")).toContainText("Not connected");
  await expect(page.getByTestId("jira-status")).toContainText("Not connected");
  await expect(page.getByTestId("jira-status")).toContainText("token is missing");
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
