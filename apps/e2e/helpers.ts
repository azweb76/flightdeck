import { expect, type Page } from "@playwright/test";

export async function setPreflight(page: Page, fixture: "pass" | "fail" | "github"): Promise<void> {
  const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
  const res = await page.request.post(`http://127.0.0.1:${apiPort}/api/demo/preflight`, {
    data: { fixture },
  });
  expect(res.ok()).toBeTruthy();
}

export async function resetDemo(page: Page, seed: boolean): Promise<void> {
  const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
  const res = await page.request.post(`http://127.0.0.1:${apiPort}/api/demo/reset`, {
    data: { seed },
  });
  expect(res.ok()).toBeTruthy();
}

export async function scheme(page: Page, mode: "light" | "dark"): Promise<void> {
  await page.emulateMedia({ colorScheme: mode });
  await page.evaluate((next) => {
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
    root.style.colorScheme = next;
  }, mode);
  await expect(page.locator("html.dark")).toHaveCount(mode === "dark" ? 1 : 0);
}

export async function seedHome(page: Page): Promise<void> {
  await resetDemo(page, true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My issues" })).toBeVisible();
}

export async function pickRepo(page: Page, slug = "acme/web"): Promise<void> {
  await expect(page.getByTestId("repo-picker")).toBeVisible();
  await page.getByTestId("repo-search").fill(slug.split("/")[1] ?? slug);
  await page.getByTestId(`repo-option-${slug}`).first().click();
}

export async function startNewIdea(page: Page, idea = "Export invoices as CSV"): Promise<void> {
  await page.getByTestId("new-idea").click();
  await expect(page.getByRole("dialog")).toContainText("Start from a new idea");
  await pickRepo(page);
  await page.getByTestId("idea-input").fill(idea);
  await page.getByTestId("start-idea").click();
  await expect(page.getByTestId("chat-pane")).toBeVisible();
}

export async function disabledContainedGrey(page: Page): Promise<string> {
  const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  return dark ? "rgb(58, 58, 60)" : "rgb(210, 210, 215)";
}

export async function expectDisabledNotPrimary(page: Page, testId: string): Promise<void> {
  const btn = page.getByTestId(testId);
  await expect(btn).toBeDisabled();
  const bg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe(await disabledContainedGrey(page));
}

export async function expectAllDisabledContainedGrey(page: Page): Promise<void> {
  const expected = await disabledContainedGrey(page);
  const loc = page.locator("button.MuiButton-contained.Mui-disabled");
  const n = await loc.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i += 1) {
    const bg = await loc.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe(expected);
  }
}

export function watchRepoCatalogGets(page: Page): { count: () => number } {
  let n = 0;
  page.on("request", (req) => {
    if (req.method() !== "GET") return;
    const path = new URL(req.url()).pathname;
    if (path === "/api/repos" || path.endsWith("/api/repos")) n += 1;
  });
  return { count: () => n };
}

export async function answerFirstQuestion(page: Page): Promise<void> {
  await expect(page.getByTestId("option-api")).toBeVisible();
  await page.getByTestId("option-api").click();
  await expect(page.getByTestId("draft-title")).toContainText(/CSV/i);
}
