import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const DIR = "/opt/cursor/artifacts/review-fixes";

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

test("issues and settings after leaving demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My issues" })).toBeVisible();
  await expect(page.getByTestId("empty-issues")).toBeVisible();
  await expect(page.getByTestId("issue-row")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("example.atlassian.net");
  await expect(page.locator("body")).not.toContainText("Jira configured but the API token is missing");
  const api = `http://127.0.0.1:${process.env.FLIGHTDECK_PORT ?? "47421"}`;
  const health = await page.request.get(`${api}/api/health`);
  expect(await health.json()).toMatchObject({ demo: false });
  const preflight = await page.request.get(`${api}/api/preflight`);
  expect(preflight.status()).toBe(200);
  const report = (await preflight.json()) as { checks: { id: string; status: string; ok: boolean; detail: string; gates?: string[] }[] };
  const jira = report.checks.find((c) => c.id === "jira");
  expect(jira).toMatchObject({ status: "skip", ok: true });
  expect(jira?.detail).not.toMatch(/token is missing/i);
  expect(report.checks.some((c) => !c.ok && c.gates?.includes("saveJira"))).toBe(false);
  const catalog = await page.request.get(`${api}/api/repos`);
  expect(((await catalog.json()) as { favorites: string[] }).favorites).toContain("dan/app");
  await scheme(page, "light");
  await shot(page, "issues-live-after-demo-light");
  await scheme(page, "dark");
  await shot(page, "issues-live-after-demo-dark");
  await scheme(page, "light");
  await page.goto("/settings");
  await expect(page.getByTestId("jira-form")).toBeVisible();
  await expect(page.getByTestId("jira-url")).toHaveValue("");
  await expect(page.getByTestId("jira-email")).toHaveValue("");
  await shot(page, "settings-live-after-demo-light");
  await scheme(page, "dark");
  await shot(page, "settings-live-after-demo-dark");
});
