import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { answerFirstQuestion, openRepoPicker, pickRepo, scheme, seedHome, startNewIdea } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/fields";

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}

async function pair(page: Page, prefix: string): Promise<void> {
  for (const [w, h] of [
    [1280, 800],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: w, height: h });
    await shot(page, `${prefix}-${w}`);
  }
}

test("repo picker closed", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("new-idea").click();
  await pickRepo(page);
  await expect(page.getByTestId("repo-dropdown")).toHaveCount(0);
  await expect(page.getByTestId("repo-search")).toHaveValue("acme/web");
  await scheme(page, "light");
  await pair(page, "picker-closed-light");
  await scheme(page, "dark");
  await pair(page, "picker-closed-dark");
});

test("repo picker open with groups", async ({ page }) => {
  await seedHome(page);
  await page.getByTestId("refine-PROJ-150").click();
  await openRepoPicker(page);
  await page.getByTestId("repo-star-acme/api").first().click();
  await pickRepo(page, "acme/web");
  await page.getByTestId("confirm-repo").click();
  await expect(page.getByTestId("chat-pane")).toBeVisible();
  await page.goto("/");
  await page.getByTestId("new-idea").click();
  await openRepoPicker(page);
  await expect(page.getByTestId("repo-favorites")).toContainText("acme/api");
  await expect(page.getByTestId("repo-recent")).toContainText("acme/web");
  await expect(page.getByTestId("repo-all")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "picker-open-light");
  await scheme(page, "dark");
  await openRepoPicker(page);
  await pair(page, "picker-open-dark");
});

test("chat and markdown draft look unchanged", async ({ page }) => {
  await seedHome(page);
  await startNewIdea(page);
  await expect(page.getByTestId("chat-pane")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "chat-light");
  await scheme(page, "dark");
  await pair(page, "chat-dark");
  await answerFirstQuestion(page);
  await expect(page.getByTestId("draft-pane")).toBeVisible();
  await scheme(page, "light");
  await pair(page, "markdown-light");
  await scheme(page, "dark");
  await pair(page, "markdown-dark");
});
