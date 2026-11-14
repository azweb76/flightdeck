import { expect, test } from "@playwright/test";
import { answerFirstQuestion, resetDemo, seedHome, startNewIdea } from "./helpers.ts";

test("empty issues home", async ({ page }) => {
  await resetDemo(page, false);
  await page.goto("/");
  await expect(page.getByTestId("empty-issues")).toContainText("No issues yet");
});

test("nav pages include Issues, Runs, My PRs, Reviews, Settings", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByRole("heading", { name: "Runs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coming in Phase 3" })).toBeVisible();
  await page.getByRole("tab", { name: "My PRs" }).click();
  await expect(page.getByRole("heading", { name: "My PRs" })).toBeVisible();
  await page.getByRole("tab", { name: "Reviews" }).click();
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
});

test("start from a new idea, chat, and live draft", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await expect(page.getByText(/backend API change or a UI change/i)).toBeVisible();
  await answerFirstQuestion(page);
  await expect(page.getByTestId("draft-goal")).toContainText("Finance");
  await expect(page.getByTestId("draft-acceptance")).toContainText("CSV");
  await expect(page.getByTestId("draft-files")).toContainText("export.ts");
  await expect(page.getByTestId("draft-approach")).toContainText("export route");
  await expect(page.getByTestId("draft-outOfScope")).toContainText("PDF");
  await expect(page.getByTestId("draft-testPlan")).toContainText("Unit test");
});

test("start from an existing issue", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("shape-PROJ-150").click();
  await expect(page.getByRole("dialog")).toContainText("Pick a repo");
  await page.getByTestId("repo-select").click();
  await page.getByRole("option", { name: "acme/web" }).click();
  await page.getByTestId("confirm-repo").click();
  await expect(page.getByTestId("chat-pane")).toBeVisible();
  await expect(page.getByTestId("draft-title")).toContainText("Invoice CSV");
});

test("save to GitHub then wait with Start disabled", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await answerFirstQuestion(page);
  await page.getByTestId("save-issue").click();
  await page.getByTestId("tracker-select").click();
  await page.getByRole("option", { name: "GitHub", exact: true }).click();
  await page.getByTestId("confirm-save").click();
  await expect(page.getByTestId("saved-banner")).toContainText(/Saved as acme\/web#/);
  await expect(page.getByTestId("start-run")).toBeDisabled();
});

test("save to Jira", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await answerFirstQuestion(page);
  await page.getByTestId("save-issue").click();
  await page.getByTestId("tracker-select").click();
  await page.getByRole("option", { name: "Jira", exact: true }).click();
  await page.getByTestId("confirm-save").click();
  await expect(page.getByTestId("saved-banner")).toContainText(/PROJ-200/);
});

test("save without a tracker shows an error", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await page.getByTestId("save-issue").click();
  await page.getByTestId("confirm-save").click();
  await expect(page.getByTestId("save-error")).toContainText("Choose Jira or GitHub");
});

test("Settings shows Claude, GitHub, Jira, repos and caps", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await expect(page.getByTestId("claude-status")).toContainText("apiKeyHelper");
  await expect(page.getByTestId("github-status")).toContainText("dan-demo");
  await expect(page.getByTestId("jira-status")).toContainText("Connected");
  await expect(page.getByTestId("repos-list")).toContainText("acme/web");
  await expect(page.getByTestId("cap-run")).toHaveValue("10");
  await expect(page.getByTestId("cap-daily")).toHaveValue("50");
  await expect(page.getByTestId("cap-concurrent")).toHaveValue("3");
  await expect(page.getByTestId("github-status")).not.toContainText("gh auth login");
  await page.getByTestId("claude-recheck").click();
  await expect(page.getByTestId("claude-status")).toContainText("apiKeyHelper");
  await page.getByTestId("cap-run").fill("12");
  await page.getByTestId("cap-run").blur();
  await expect(page.getByText("Caps saved")).toBeVisible();
});

test("Jira connect success is not an error banner", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await page.getByTestId("jira-token").fill("ok");
  await page.getByTestId("jira-connect").click();
  await expect(page.getByTestId("jira-form-success")).toContainText("Connected as dan@example.com (demo)");
  await expect(page.getByTestId("page-error")).toHaveCount(0);
  await expect(page.locator('[role="alert"].MuiAlert-colorError, [role="alert"].MuiAlert-standardError')).toHaveCount(0);
  await expect(page.getByTestId("jira-status")).toContainText("Connected");
});

test("invalid cap error clears once corrected", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await page.getByTestId("cap-run").fill("0");
  await page.getByTestId("cap-run").blur();
  await expect(page.getByTestId("cap-error")).toContainText("greater than 0");
  await page.getByTestId("cap-run").fill("12");
  await expect(page.getByTestId("cap-error")).toHaveCount(0);
  await page.getByTestId("cap-run").blur();
  await expect(page.getByTestId("cap-saved")).toContainText("Caps saved");
});

test("Jira connect error is visible", async ({ page }) => {
  await seedHome(page);
  await page.goto("/settings");
  await page.getByTestId("jira-url").fill("https://invalid.example");
  await page.getByTestId("jira-token").fill("fail");
  await page.getByTestId("jira-connect").click();
  await expect(page.getByTestId("jira-form-error")).toContainText(/Jira login failed/);
  await expect(page.getByTestId("jira-status")).toContainText("Not connected");
});

test("demo draft follows the idea text", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page, "Add dark mode to settings");
  await page.getByTestId("option-ui").click();
  await expect(page.getByTestId("draft-title")).toContainText(/dark mode/i);
});

test("Refresh is on Issues home", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("refresh-issues").click();
  await expect(page.getByTestId("issue-row").first()).toBeVisible();
});
