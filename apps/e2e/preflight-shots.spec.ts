import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  expectAllDisabledContainedGrey,
  expectDialogListAboveActions,
  expectDisabledNotPrimary,
  mockRepoCatalog,
  openRepoPicker,
  pickRepo,
  scheme,
  seedHome,
  setPreflight,
  startNewIdea,
} from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/preflight-fixes";

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string, fullPage = true): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage });
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

test("no-token picker empty state", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "github");
  await scheme(page, "light");
  await page.getByTestId("new-idea").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-picker-detail")).toContainText("Add a GitHub token in Settings");
  await shot(page, "picker-no-token-light");
  await scheme(page, "dark");
  await shot(page, "picker-no-token-dark");
});

test("banner with only GitHub failing", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "github");
  await expect(page.getByTestId("preflight-stay-off")).toContainText("Start and GitHub save stay off");
  await expect(page.getByTestId("preflight-stay-off")).not.toContainText("Refine");
  await expect(page.getByTestId("preflight-banner-title")).toContainText("Start and GitHub save");
  await scheme(page, "light");
  await shot(page, "banner-github-only-light");
  await scheme(page, "dark");
  await shot(page, "banner-github-only-dark");
});

test("banner failing", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("preflight-banner")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "banner-fail-light");
  await scheme(page, "dark");
  await pair(page, "banner-fail-dark");
  await scheme(page, "light");
  await page.getByTestId("preflight-claude").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("preflight-fix-claude")).toContainText("Then type /login");
  await shot(page, "claude-banner-light");
});

test("dark Refine page disabled Start", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await scheme(page, "dark");
  await expect(page.getByTestId("start-run")).toBeDisabled();
  await shot(page, "refine-dark-start-disabled");
});

test("tooltips on New idea, Refine, and Start", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const mode of ["light", "dark"] as const) {
    await scheme(page, mode);
    await openTip(page, "new-idea-gate", "brew install git");
    await shot(page, `tooltip-new-idea-${mode}-1440`, false);
    await openTip(page, "refine-PROJ-150-gate", "brew install git");
    await shot(page, `tooltip-shape-${mode}-1440`, false);
    await openTip(page, "start-PROJ-150-gate", "brew install git");
    await shot(page, `tooltip-start-${mode}-1440`, false);
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await scheme(page, "light");
  await openTip(page, "new-idea-gate", "brew install git");
  await shot(page, "tooltip-new-idea-light-1024", false);
  await openTip(page, "refine-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-shape-light-1024", false);
  await openTip(page, "start-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-start-light-1024", false);
  await scheme(page, "dark");
  await openTip(page, "new-idea-gate", "brew install git");
  await shot(page, "tooltip-new-idea-dark-1024", false);
  await openTip(page, "refine-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-shape-dark-1024", false);
  await openTip(page, "start-PROJ-150-gate", "brew install git");
  await shot(page, "tooltip-start-dark-1024", false);
});

test("settings pass and fail", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("github-token-source")).toContainText("Using GITHUB_TOKEN from environment");
  await expect(page.getByTestId("preflight-section")).toHaveCount(0);
  await page.getByTestId("github-form").scrollIntoViewIfNeeded();
  await scheme(page, "light");
  await pair(page, "settings-pass-light");
  await scheme(page, "dark");
  await pair(page, "settings-pass-dark");
});

test("refine Jira save shows the repo picker", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await page.getByTestId("save-issue").click();
  await page.getByTestId("tracker-jira").click();
  await expect(page.getByTestId("repo-picker")).toBeVisible();
  await scheme(page, "light");
  await shot(page, "save-jira-repo-picker-light");
  await scheme(page, "dark");
  await shot(page, "save-jira-repo-picker-dark");
});

test("save tracker cards gated", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await setPreflight(page, "fail");
  await page.getByTestId("save-issue").click({ force: true });
  await expect(page.getByTestId("tracker-github")).toContainText("Add a GitHub token in Settings");
  await expect(page.getByTestId("tracker-jira")).toContainText("Add a Jira API token");
  await expect(page.getByTestId("tracker-jira")).toContainText("needs a token");
  await page.getByTestId("tracker-github").click();
  await expect(page.getByTestId("tracker-gate-hint")).toBeVisible();
  await expect(page.getByTestId("confirm-save")).toBeDisabled();
  await scheme(page, "light");
  await expectDisabledNotPrimary(page, "confirm-save");
  await expectAllDisabledContainedGrey(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "save-gated-light-1440", false);
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "save-gated-light-1024", false);
  await scheme(page, "dark");
  await expectDisabledNotPrimary(page, "confirm-save");
  await expectAllDisabledContainedGrey(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot(page, "save-gated-dark-1440", false);
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "save-gated-dark-1024", false);
});

test("save dialog list does not overlap actions", async ({ page }) => {
  await mockRepoCatalog(page, 40);
  await seedHome(page);
  await page.getByTestId("new-idea").click();
  await pickRepo(page, "acme/repo-01");
  await page.getByTestId("idea-input").fill("Export invoices as CSV");
  await page.getByTestId("start-idea").click();
  await expect(page.getByTestId("chat-pane")).toBeVisible();
  await page.getByTestId("save-issue").click();
  await page.getByTestId("tracker-jira").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-option-acme/repo-40").first()).toBeAttached();
  await page.setViewportSize({ width: 1024, height: 720 });
  await expectDialogListAboveActions(page);
  await scheme(page, "light");
  await expectDialogListAboveActions(page);
  await shot(page, "save-dialog-list-light", false);
  await scheme(page, "dark");
  await expectDialogListAboveActions(page);
  await shot(page, "save-dialog-list-dark", false);
});

test("issue row disabled Refine contrast", async ({ page }) => {
  await seedHome(page);
  await setPreflight(page, "fail");
  await expect(page.getByTestId("refine-PROJ-150")).toBeDisabled();
  await scheme(page, "light");
  await shot(page, "issue-row-refine-disabled-light", false);
  await scheme(page, "dark");
  await shot(page, "issue-row-refine-disabled-dark", false);
});
