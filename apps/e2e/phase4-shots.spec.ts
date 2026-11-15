import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { archiveAllChanges, raiseConcurrent, scheme, seedHome } from "./helpers.ts";

const DIR = "/opt/cursor/artifacts/phase4";

test.beforeAll(() => {
  mkdirSync(DIR, { recursive: true });
});

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: false });
}

async function pair(page: Page, prefix: string): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 800 });
  await scheme(page, "light");
  await shot(page, `${prefix}-light-1280`);
  await scheme(page, "dark");
  await shot(page, `${prefix}-dark-1280`);
}

test("phase 4 screenshots at 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);

  await page.getByRole("tab", { name: "My PRs" }).click();
  await expect(page.getByTestId("pr-list")).toBeVisible();
  await pair(page, "my-prs-mixed");

  await page.getByTestId("pr-row").first().click();
  await expect(page.getByTestId("pr-detail")).toBeVisible();
  await pair(page, "pr-detail");
  await page.getByRole("button", { name: "All my PRs" }).click();

  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-status-acme/web#45")).toHaveText("Review");
  await page.getByTestId("run-status-acme/web#44").click();
  await expect(page.getByTestId("stage-caption-ci")).toContainText("Attempt 2 of 3");
  await pair(page, "ci-timeline");

  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-status-acme/web#73")).toHaveText("Waiting for slot");
  await page.getByTestId("run-status-acme/web#73").click();
  await expect(page.getByTestId("stage-caption-plan")).toContainText("Kept in the app only");
  await expect(page.getByTestId("stage-caption-review")).toContainText("Round 1 of 3");
  await expect(page.getByTestId("stage-caption-pr")).toContainText("Draft PR opened");
  await expect(page.getByTestId("stage-caption-ci")).toHaveText("Waiting for a free slot");
  await expect(page.getByTestId("run-queued")).toBeVisible();
  await pair(page, "ci-waiting-slot");

  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("run-status-acme/web#40").click();
  await expect(page.getByTestId("run-queued")).toBeVisible();
  await pair(page, "queued-info");

  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("run-status-acme/web#41").click();
  await expect(page.getByTestId("run-interrupted")).toBeVisible();
  await pair(page, "interrupted");

  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("archive-acme/web#44").click();
  await expect(page.getByTestId("run-status-acme/web#44")).toHaveText("Archived");
  await pair(page, "archived");

  await archiveAllChanges(page);
  await raiseConcurrent(page, 10);
  await page.goto("/");
  await page.getByTestId("start-acme/web#72").click();
  await expect(page.getByTestId("needs-dan")).toContainText("A GitHub check needs your action", { timeout: 20_000 });
  await pair(page, "ci-action-required");

  await page.goto("/");
  await page.getByTestId("start-acme/web#70").click();
  await expect(page.getByTestId("needs-dan")).toContainText("CI still fails after 3", { timeout: 20_000 });
  await pair(page, "ci-gave-up");
});
