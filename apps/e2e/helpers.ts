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

export async function raiseConcurrent(page: Page, n = 10): Promise<void> {
  const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
  const res = await page.request.patch(`http://127.0.0.1:${apiPort}/api/settings`, {
    data: { maxConcurrentAgents: n },
  });
  expect(res.ok()).toBeTruthy();
}

export async function archiveAllChanges(page: Page): Promise<void> {
  const apiPort = process.env.FLIGHTDECK_PORT ?? "47421";
  const api = `http://127.0.0.1:${apiPort}`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const body = (await (await page.request.get(`${api}/api/changes`)).json()) as {
      changes: { id: string; status: string }[];
    };
    const open = body.changes.filter((c) => c.status !== "archived");
    if (open.length === 0) {
      await archiveOccupyingReviews(api, page);
      return;
    }
    const queued = open.filter((c) => c.status === "queued");
    const rest = open.filter((c) => c.status !== "queued");
    let archived = 0;
    for (const change of [...queued, ...rest]) {
      const res = await page.request.post(`${api}/api/changes/${change.id}/archive`);
      if (res.ok()) archived += 1;
    }
    if (archived === 0) await page.waitForTimeout(50);
  }
  const left = (await (await page.request.get(`${api}/api/changes`)).json()) as {
    changes: { id: string; status: string }[];
  };
  expect(left.changes.every((c) => c.status === "archived")).toBeTruthy();
  await archiveOccupyingReviews(api, page);
}

async function archiveOccupyingReviews(api: string, page: Page): Promise<void> {
  const body = (await (await page.request.get(`${api}/api/reviews`)).json()) as {
    reviews: { id: string; status: string }[];
  };
  for (const review of body.reviews.filter((r) => r.status === "reviewing" || r.status === "queued")) {
    await page.request.post(`${api}/api/reviews/${encodeURIComponent(review.id)}/archive`);
  }
}

export async function openRepoPicker(page: Page): Promise<void> {
  await expect(page.getByTestId("repo-picker")).toBeVisible();
  if ((await page.getByTestId("repo-dropdown").count()) > 0) return;
  await page.getByTestId("repo-search").click();
  await expect(page.getByTestId("repo-dropdown")).toBeVisible();
}

export async function clearRepo(page: Page): Promise<void> {
  await page.getByTestId("repo-search").hover();
  await page.locator(".MuiAutocomplete-clearIndicator").click();
}

export async function pickRepo(page: Page, slug = "acme/web"): Promise<void> {
  await openRepoPicker(page);
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

export async function mockRepoCatalog(page: Page, count: number): Promise<void> {
  const repos = Array.from({ length: count }, (_, i) => ({
    owner: "acme",
    name: `repo-${String(i + 1).padStart(2, "0")}`,
    localPath: "",
  }));
  await page.route(/\/api\/repos(\?|$)/, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ repos, favorites: [], recent: [] }),
    });
  });
}

function overlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export async function scrollPickerToEnd(page: Page): Promise<void> {
  const list = page.locator("#repo-listbox");
  await expect(list).toBeVisible();
  await list.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByTestId("repo-option-acme/repo-40").first()).toBeVisible();
}

export async function expectPickerNotOverActions(page: Page): Promise<void> {
  await openRepoPicker(page);
  await scrollPickerToEnd(page);
  const list = page.locator("#repo-listbox");
  const listBox = await list.boundingBox();
  const actionBox = await page.locator(".MuiDialogActions-root").boundingBox();
  expect(listBox && actionBox).toBeTruthy();
  expect(overlap(listBox!, actionBox!)).toBe(false);
  expect(listBox!.height).toBeGreaterThanOrEqual(120);
  const idea = page.locator("#idea-input");
  if ((await idea.count()) > 0) {
    const ideaBox = await idea.boundingBox();
    if (ideaBox) expect(overlap(listBox!, ideaBox)).toBe(false);
  }
  expect(await listTopmostIsInside(page)).toBe(true);
  const cancel = page.getByRole("dialog").getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeVisible();
  await cancel.click({ trial: true });
}

async function listTopmostIsInside(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.getElementById("repo-listbox");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.bottom - 6);
    return Boolean(hit && el.contains(hit));
  });
}

export async function expectLastAboveComposer(page: Page, lastTestId: string, inputTestId: string): Promise<void> {
  const last = page.getByTestId(lastTestId).last();
  const input = page.getByTestId(inputTestId);
  await expect(last).toBeVisible();
  const a = await last.boundingBox();
  const b = await input.boundingBox();
  expect(a && b).toBeTruthy();
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y + 1);
}

export async function dismissDialog(page: Page): Promise<void> {
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
