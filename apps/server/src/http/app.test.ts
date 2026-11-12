import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../features/db/index.ts";
import { seedDemo } from "../features/demo/index.ts";
import { upsertIssue } from "../features/issues/store.ts";
import { createApp } from "./app.ts";

describe("http", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    delete process.env.FLIGHTDECK_SEED;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("binds health on the API and lists seeded issues", async () => {
    const app = createApp();
    const health = await app.request("http://127.0.0.1/api/health");
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, host: "127.0.0.1", demo: true });
    const issues = await app.request("http://127.0.0.1/api/issues");
    const body = (await issues.json()) as { issues: { key: string; repoSlug?: string }[] };
    expect(body.issues.map((i) => i.key)).toContain("PROJ-150");
    expect(body.issues.find((i) => i.key === "PROJ-150")?.repoSlug).toBeUndefined();
  });

  it("shapes, updates the draft, and saves only on Save", async () => {
    const app = createApp();
    const started = await app.request("http://127.0.0.1/api/shape", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoSlug: "acme/web", idea: "CSV export" }),
    });
    const session = (await started.json()) as { id: string; status: string };
    expect(session.status).toBe("asking");
    const replied = await app.request(`http://127.0.0.1/api/shape/${session.id}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "Backend API" }),
    });
    const next = (await replied.json()) as { draft: { title: string } };
    expect(next.draft.title).toMatch(/CSV/i);
    const saved = await app.request(`http://127.0.0.1/api/shape/${session.id}/save`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tracker: "github", repoSlug: "acme/web" }),
    });
    expect((await saved.json() as { saved: boolean }).saved).toBe(true);
  });

  it("PATCH repo survives a later Jira upsert without repoSlug", async () => {
    const app = createApp();
    const patched = await app.request("http://127.0.0.1/api/issues/jira%3APROJ-150/repo", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoSlug: "acme/web" }),
    });
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ id: "jira:PROJ-150", repoSlug: "acme/web" });
    upsertIssue({
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Invoice CSV on the web app",
      body: "Need an export for finance.",
      url: "https://example.atlassian.net/browse/PROJ-150",
      updatedAt: "2026-11-12T13:00:00.000Z",
      saved: true,
    });
    const issues = await app.request("http://127.0.0.1/api/issues");
    const body = (await issues.json()) as { issues: { id: string; repoSlug?: string }[] };
    expect(body.issues.find((i) => i.id === "jira:PROJ-150")?.repoSlug).toBe("acme/web");
  });

  it("rejects a Jira connect with a bad token", async () => {
    const app = createApp();
    const res = await app.request("http://127.0.0.1/api/jira/connect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteUrl: "https://invalid.example", email: "a@b.c", token: "fail" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/Jira login failed/i) });
  });
});
