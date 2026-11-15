import { expect, test } from "@playwright/test";
import {
  expectAllDisabledContainedGrey,
  expectPickerNotOverActions,
  expectDisabledNotPrimary,
  dismissDialog,
  openRepoPicker,
  scheme,
  seedHome,
  setPreflight,
  startNewIdea,
  watchRepoCatalogGets,
} from "./helpers.ts";

test("demo home has no preflight banner and Refine stays enabled", async ({ page }) => {
  await seedHome(page);
  await expect(page.getByTestId("preflight-banner")).toHaveCount(0);
  await expect(page.getByTestId("new-idea")).toBeEnabled();
  await expect(page.getByTestId("refine-PROJ-150")).toBeEnabled();
});

test("github-only failure still opens the repo picker empty state", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "github");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await expect(page.getByTestId("new-idea")).toBeEnabled();
  await expect(page.getByTestId("refine-PROJ-150")).toBeEnabled();
  await expect(page.getByTestId("start-PROJ-150")).toBeDisabled();
  await expect(page.getByTestId("preflight-stay-off")).toContainText("Start and GitHub save stay off");
  await expect(page.getByTestId("preflight-stay-off")).not.toContainText("Refine");
  await expect(page.getByTestId("preflight-stay-off")).not.toContainText("Jira");
  await expect(page.getByTestId("preflight-banner-title")).toContainText("Start and GitHub save");
  await expect(page.getByTestId("preflight-banner-title")).not.toContainText("refining");
  await page.getByTestId("new-idea").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-picker-detail")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("repo-all")).toHaveCount(0);
});

test("failing preflight shows the banner, Re-check, and gated Refine", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await expect(page.getByTestId("preflight-banner")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("preflight-fix-github")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("new-idea")).toBeDisabled();
  await expect(page.getByTestId("refine-PROJ-150")).toBeDisabled();
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "dark");
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "light");
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
  await expect(page.getByTestId("tracker-jira")).toContainText("needs a token");
  await expect(page.getByTestId("tracker-jira")).toContainText("Add a Jira API token");
  await page.getByTestId("tracker-github").click();
  await expect(page.getByTestId("tracker-gate-hint")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("confirm-save")).toBeDisabled();
  await expectDisabledNotPrimary(page, "confirm-save");
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "dark");
  await expectDisabledNotPrimary(page, "confirm-save");
  await expectAllDisabledContainedGrey(page);
});

test("disabled contained buttons match disabledBackground on pages", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await expect(page.getByTestId("start-run")).toBeDisabled();
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "dark");
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "light");
  await page.goto("/settings");
  await expect(page.getByTestId("github-save")).toBeDisabled();
  await expectAllDisabledContainedGrey(page);
  await scheme(page, "dark");
  await expectAllDisabledContainedGrey(page);
});

test("picker refetches after github fixture without reload", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("new-idea").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-option-acme/web").first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await setPreflight(page, "github");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await page.getByTestId("new-idea").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-picker-detail")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("repo-all")).toHaveCount(0);
});

test("token save invalidates the repo catalog for the next open", async ({ page }) => {
  await seedHome(page);
  const gets = watchRepoCatalogGets(page);
  await page.getByTestId("new-idea").click();
  await expect(page.getByTestId("repo-picker")).toBeVisible();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-option-acme/web").first()).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  const before = gets.count();
  expect(before).toBeGreaterThan(0);
  await page.goto("/settings");
  await page.getByTestId("github-token").fill("ghp_test");
  await page.getByTestId("github-save").click();
  await expect(page.getByTestId("github-form-success")).toBeVisible();
  await page.goto("/");
  await page.getByTestId("new-idea").click();
  await expect(page.getByTestId("repo-picker")).toBeVisible();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-option-acme/web").first()).toBeVisible();
  expect(gets.count()).toBeGreaterThan(before);
});

test("open repo picker never covers dialog actions", async ({ page }) => {
  await seedHome(page);
  for (const { width, height } of [
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.getByTestId("new-idea").click();
    await expectPickerNotOverActions(page);
    await dismissDialog(page);
    await page.getByTestId("refine-PROJ-150").click();
    await expectPickerNotOverActions(page);
    await dismissDialog(page);
  }
  await startNewIdea(page);
  await page.getByTestId("save-issue").click();
  for (const tracker of ["tracker-jira", "tracker-github"] as const) {
    await page.getByTestId(tracker).click();
    for (const { width, height } of [
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width, height });
      await expectPickerNotOverActions(page);
    }
  }
});
