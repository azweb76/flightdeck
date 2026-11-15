import { expect, test } from "@playwright/test";
import { archiveAllChanges, raiseConcurrent, seedHome } from "./helpers.ts";

test("My PRs lists mixed states, filters, and opens GitHub detail", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await page.getByRole("tab", { name: "My PRs" }).click();
  await expect(page.getByTestId("my-prs")).toBeVisible();
  await expect(page.getByTestId("pr-ci-80")).toHaveText("CI passing");
  await expect(page.getByTestId("pr-ci-81")).toHaveText("CI failing");
  await expect(page.getByTestId("pr-ci-82")).toHaveText("CI failing");
  await expect(page.getByTestId("pr-needs-82")).toHaveCount(0);
  await expect(page.getByTestId("pr-needs-83")).toBeVisible();
  await expect(page.getByTestId("pr-review-84")).toHaveText("Changes requested");
  await page.getByTestId("pr-filter-needs_you").click();
  await expect(page.getByTestId("pr-list").getByTestId("pr-row")).toHaveCount(3);
  await page.getByTestId("pr-filter-draft").click();
  await expect(page.getByTestId("pr-draft-82")).toHaveText("Draft");
  await page.getByTestId("pr-row").click();
  await expect(page.getByTestId("pr-detail")).toBeVisible();
  await expect(page.getByTestId("pr-detail-ci")).toHaveText("CI failing");
  await expect(page.getByTestId("pr-detail-draft")).toHaveText("Draft");
  await expect(page.getByTestId("pr-github-link")).toHaveAttribute("href", /github\.com/);
});

test("change timeline shows CI rounds and the give-up ask", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await page.getByTestId("run-status-acme/web#44").click();
  await expect(page.getByTestId("stage-caption-ci")).toContainText("Attempt 2 of 3");
  await expect(page.getByTestId("transcript")).toContainText("Attempt 1 of 3");
  await expect(page.getByTestId("transcript")).toContainText("Attempt 2 of 3");

  await archiveAllChanges(page);
  await raiseConcurrent(page, 10);
  await page.goto("/");
  await page.getByTestId("start-acme/web#70").click();
  await expect(page.getByTestId("needs-dan")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("needs-dan")).toContainText("CI still fails after 3");
  await expect(page.getByTestId("stage-caption-ci")).toContainText("Stopped after 3 failed attempts");
  await expect(page.getByTestId("transcript")).toContainText("Attempt 3 of 3");
});

test("reviewing seed is Review and queued banner is not error-red", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-status-acme/web#45")).toHaveText("Review");
  await expect(page.getByTestId("resume-acme/web#45")).toHaveCount(0);
  await page.getByTestId("run-status-acme/web#40").click();
  const banner = page.getByTestId("run-queued");
  await expect(banner).toBeVisible();
  const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).not.toBe("rgb(139, 18, 25)");
});
