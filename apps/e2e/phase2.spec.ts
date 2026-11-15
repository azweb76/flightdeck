import { expect, test } from "@playwright/test";
import { expectLastAboveComposer, raiseConcurrent, seedHome } from "./helpers.ts";

test("successful run opens a draft PR", async ({ page }) => {
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/web#12").click();
  await expect(page.getByTestId("change-page")).toBeVisible();
  await expect(page.getByTestId("transcript")).toBeVisible();
  await expect(page.getByTestId("pr-link")).toContainText("/pull/42", { timeout: 20_000 });
  await expect(page.getByTestId("change-status")).toContainText("Done");
  await expect(page.getByTestId("stage-caption-ci")).toContainText("Attempt 1 of 3");
  await expect(page.getByTestId("stage-pr")).toContainText("Draft PR opened");
  await expect(page.getByTestId("transcript")).toContainText("Review · Round 1");
  await expect(page.getByTestId("event-usage").first()).toBeVisible();
});

test("transcript keeps scrollTop when a new event arrives while reading", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/web#21").click();
  const scroller = page.getByTestId("chat-scroller");
  await expect(scroller).toBeVisible();
  await expect.poll(async () => scroller.evaluate((el) => el.scrollHeight - el.clientHeight > 48)).toBe(true);
  await scroller.evaluate((el) => {
    el.scrollTop = 24;
    el.dispatchEvent(new Event("scroll"));
  });
  const top = await scroller.evaluate((el) => el.scrollTop);
  expect(top).toBeGreaterThan(0);
  await expect(page.getByTestId("needs-dan")).toBeVisible({ timeout: 20_000 });
  expect(await scroller.evaluate((el) => el.scrollTop)).toBe(top);
});

test("run can pause for a question and continue after a reply", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/web#15").click();
  await expect(page.getByTestId("run-option-paid")).toBeVisible({ timeout: 20_000 });
  await expectLastAboveComposer(page, "run-option-paid", "run-reply");
  await expect(page.getByTestId("stage-plan")).toContainText("Paused for your answer");
  await expect(page.getByTestId("change-status")).toContainText("Needs you");
  await page.getByTestId("run-option-paid").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
});

test("failed review rounds ask Dan", async ({ page }) => {
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/web#21").click();
  await expect(page.getByTestId("needs-dan")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("stage-review")).toContainText("Round 3 of 3");
  await expect(page.getByTestId("transcript")).toContainText("backoff");
  await page.getByTestId("run-reply").fill("Ship retries without the extra 5xx fixture.");
  await page.getByTestId("run-send").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("stage-review")).toContainText("Follow-up after Dan answered");
  await expect(page.getByTestId("stage-caption-review")).not.toContainText("of 3");
});

test("dollar cap stops the run", async ({ page }) => {
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/api#8").click();
  await expect(page.getByTestId("cap-hit")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("change-cost")).not.toContainText("$0.00");
});

test("Runs page lists changes and archive works", async ({ page }) => {
  await seedHome(page);
  await raiseConcurrent(page);
  await page.getByTestId("start-acme/web#12").click();
  await expect(page.getByTestId("pr-link")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: "Runs" }).click();
  await expect(page.getByTestId("run-status-acme/web#12")).toBeVisible();
  await page.getByTestId("archive-acme/web#12").click();
  await expect(page.getByTestId("run-status-acme/web#12")).toContainText("Archived");
  await expect(page.getByTestId("archive-acme/web#12")).toBeDisabled();
});
