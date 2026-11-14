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
  await expect(page.getByTestId("preflight-banner")).toContainText("gh auth login");
  await expect(page.getByTestId("preflight-fix-gh")).toContainText("gh auth login");
  await expect(page.getByTestId("new-idea")).toBeDisabled();
  await expect(page.getByTestId("shape-PROJ-150")).toBeDisabled();
  await page.getByTestId("new-idea-gate").hover();
  await expect(page.getByRole("tooltip")).toContainText("brew install git");
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
  await expect(page.getByTestId("preflight-gh")).toContainText("dan-demo");
  await page.getByTestId("preflight-section").getByTestId("preflight-recheck").click();
  await expect(page.getByTestId("preflight-claude")).toContainText("Pass");
});

test("Save to GitHub is gated when gh fails", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await setPreflight(page, "fail");
  await page.getByTestId("save-issue").click();
  await page.getByTestId("tracker-select").click();
  await expect(page.getByTestId("tracker-github")).toBeDisabled();
  await expect(page.getByTestId("tracker-github")).toContainText("needs gh");
});
