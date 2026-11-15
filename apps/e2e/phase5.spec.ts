import { expect, test } from "@playwright/test";
import { raiseConcurrent, seedHome } from "./helpers.ts";

test("select a PR, Review, edit/discard drafts, post one verdict, and chat", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await raiseConcurrent(page, 10);
  await page.getByRole("tab", { name: "Reviews" }).click();
  await expect(page.getByTestId("reviews-page")).toBeVisible();
  await expect(page.getByTestId("review-status-90")).toHaveText("Selected");
  await expect(page.getByTestId("review-status-91")).toHaveText("Reviewing");
  await expect(page.getByTestId("review-status-92")).toHaveText("Drafts ready");
  await expect(page.getByTestId("review-status-93")).toHaveText("Posted");
  await expect(page.getByTestId("review-status-94")).toHaveText("Not started");

  await page.getByTestId("select-review-94").click();
  await expect(page.getByTestId("review-status-94")).toHaveText("Selected");

  await page.getByTestId("review-row-90").click();
  await expect(page.getByTestId("review-page")).toBeVisible();
  await page.getByTestId("start-review").click();
  await expect(page.getByTestId("review-detail-status")).toHaveText("Drafts ready", { timeout: 20_000 });
  await expect(page.getByTestId("draft-comments")).toBeVisible();

  await page.getByTestId("draft-edit-btn-18").click();
  await page.getByTestId("draft-edit-18").fill("Return [] when the list is empty.");
  await page.getByTestId("draft-save-18").click();
  await expect(page.getByTestId("draft-src/api.ts-18")).toContainText("Return [] when the list is empty.");
  await page.getByTestId("draft-approve-18").click();
  await expect(page.getByTestId("draft-src/api.ts-18")).toContainText("approved");

  await page.getByRole("tab", { name: "Reviews" }).click();
  await page.getByTestId("review-row-92").click();
  await expect(page.getByTestId("draft-comments")).toBeVisible();
  await page.getByTestId("draft-discard-40").click();
  await expect(page.getByTestId("draft-src/checkout.ts-40")).toContainText("discarded");
  await page.getByTestId("draft-approve-24").click();
  await page.getByTestId("open-post-review").click();
  await expect(page.getByTestId("post-review-dialog")).toBeVisible();
  await page.getByTestId("verdict-request-changes").click();
  await page.getByTestId("confirm-post-review").click();
  await expect(page.getByTestId("review-detail-status")).toHaveText("Posted");

  await page.getByTestId("review-reply").fill("Does the empty list need a test?");
  await page.getByTestId("review-send").click();
  await expect(page.getByTestId("review-chat")).toContainText("Does the empty list need a test?");
  await expect(page.getByTestId("review-chat")).toContainText("acme/web#92");
});

test("repo review skill is shown on the reviewing seed", async ({ page }) => {
  await seedHome(page);
  await page.getByRole("tab", { name: "Reviews" }).click();
  await page.getByTestId("review-row-91").click();
  await expect(page.getByTestId("review-skill")).toHaveText(".cursor/skills/review/SKILL.md");
  await expect(page.getByTestId("review-detail-status")).toHaveText("Reviewing");
});
