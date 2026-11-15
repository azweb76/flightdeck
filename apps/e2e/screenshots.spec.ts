import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { answerFirstQuestion, resetDemo, seedHome } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/phase1";

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

test("phase 1 screenshots", async ({ page }) => {
  await seedHome(page);
  await scheme(page, "light");
  await shot(page, "issues-light");
  await scheme(page, "dark");
  await shot(page, "issues-dark");
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "issues-narrow");
  await page.setViewportSize({ width: 1440, height: 900 });

  await scheme(page, "light");
  await resetDemo(page, false);
  await page.goto("/");
  await expect(page.getByTestId("empty-issues")).toBeVisible();
  await shot(page, "issues-empty-light");
  await scheme(page, "dark");
  await shot(page, "issues-empty-dark");

  await scheme(page, "light");
  await seedHome(page);
  await page.getByTestId("shape-PROJ-150").click();
  await expect(page.getByRole("dialog")).toContainText("Pick a repo");
  await shot(page, "pick-repo-light");
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByTestId("new-idea").click();
  await expect(page.getByRole("dialog")).toContainText("Start from a new idea");
  await page.getByTestId("repo-select").click();
  await page.getByRole("option", { name: "acme/web", exact: true }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page.getByTestId("idea-input").fill("Export invoices as CSV");
  await shot(page, "new-idea-dialog-light");
  await page.getByTestId("start-idea").click();
  await expect(page.getByTestId("option-api")).toBeVisible();
  await shot(page, "shape-asking-light");
  await scheme(page, "dark");
  await shot(page, "shape-asking-dark");
  await scheme(page, "light");

  await answerFirstQuestion(page);
  await expect(page.getByTestId("draft-title")).toContainText(/CSV/i);
  await shot(page, "shape-draft-light");
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "shape-draft-narrow");
  await page.setViewportSize({ width: 1440, height: 900 });
  await scheme(page, "dark");
  await shot(page, "shape-draft-dark");
  await scheme(page, "light");

  await page.getByTestId("save-issue").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("tracker-github")).toBeVisible();
  await expect(page.getByTestId("tracker-jira")).toBeVisible();
  await shot(page, "save-dialog-light");
  await page.getByTestId("tracker-github").click();
  await shot(page, "save-github-light");
  await page.getByTestId("confirm-save").click();
  await expect(page.getByTestId("saved-banner")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await shot(page, "shape-saved-light");

  await page.goto("/settings");
  await expect(page.getByTestId("github-form")).toBeVisible();
  await expect(page.getByTestId("claude-form")).toBeVisible();
  await expect(page.getByTestId("github-status")).toHaveCount(0);
  await expect(page.getByTestId("preflight-section")).toHaveCount(0);
  await shot(page, "settings-light");
  await scheme(page, "dark");
  await shot(page, "settings-dark");
  await page.setViewportSize({ width: 1024, height: 900 });
  await shot(page, "settings-narrow");
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByTestId("jira-token").fill("ok");
  await page.getByTestId("jira-save").click();
  await expect(page.getByTestId("jira-form-success")).toBeVisible();
  await shot(page, "settings-jira-saved-dark");

  await scheme(page, "light");
  await page.goto("/runs");
  await shot(page, "runs-light");
  await page.goto("/prs");
  await shot(page, "prs-light");
  await page.goto("/reviews");
  await shot(page, "reviews-light");
});
