import { expect, type Page } from "@playwright/test";

export async function resetDemo(page: Page, seed: boolean): Promise<void> {
  const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
  const res = await page.request.post(`http://127.0.0.1:${apiPort}/api/demo/reset`, {
    data: { seed },
  });
  expect(res.ok()).toBeTruthy();
}

export async function seedHome(page: Page): Promise<void> {
  await resetDemo(page, true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My issues" })).toBeVisible();
}

export async function startNewIdea(page: Page, idea = "Export invoices as CSV"): Promise<void> {
  await page.getByTestId("new-idea").click();
  await expect(page.getByRole("dialog")).toContainText("Start from a new idea");
  await page.getByTestId("repo-select").click();
  await page.getByRole("option", { name: "acme/web" }).click();
  await page.getByTestId("idea-input").fill(idea);
  await page.getByTestId("start-idea").click();
  await expect(page.getByTestId("chat-pane")).toBeVisible();
}

export async function answerFirstQuestion(page: Page): Promise<void> {
  await expect(page.getByTestId("option-api")).toBeVisible();
  await page.getByTestId("option-api").click();
  await expect(page.getByTestId("draft-title")).toContainText(/CSV/i);
}
