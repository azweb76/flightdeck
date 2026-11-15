import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../features/db/index.ts";
import { resetDemo, seedDemo } from "../features/demo/index.ts";
import { resetDemoGithubMode } from "../features/github/index.ts";
import { preflightBuildCount, resetDemoPreflightFixture, resetPreflightStore, runChecks } from "../features/preflight/index.ts";
import { subscribe } from "../features/events/index.ts";
import { upsertIssue } from "../features/issues/store.ts";
import { createApp } from "./app.ts";

describe("http", () => {
  beforeEach(async () => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    delete process.env.FLIGHTDECK_SEED;
    resetDbForTests(join(dir, "app.sqlite"));
    resetDemoPreflightFixture();
    resetPreflightStore();
    resetDemoGithubMode();
    seedDemo();
    await runChecks();
  });
  afterEach(() => {
    closeDb();
    resetDemoPreflightFixture();
    resetPreflightStore();
    resetDemoGithubMode();
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("reports SQLite schema health on GET /api/preflight", async () => {
    const app = createApp();
    const res = await app.request("http://127.0.0.1/api/preflight");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; checks: { id: string; ok: boolean }[] };
    expect(body.ok).toBe(true);
    expect(body.checks.find((c) => c.id === "database")).toMatchObject({ ok: true });
  });

  it("GET /api/preflight is 503 when the snapshot is empty", async () => {
    resetPreflightStore();
    const app = createApp();
    const res = await app.request("http://127.0.0.1/api/preflight");
    expect(res.status).toBe(503);
    expect(preflightBuildCount()).toBe(0);
  });

  it("GET /api/preflight never rebuilds; recheck does", async () => {
    const app = createApp();
    expect(preflightBuildCount()).toBe(1);
    const first = (await (await app.request("http://127.0.0.1/api/preflight")).json()) as { checkedAt: string };
    expect(preflightBuildCount()).toBe(1);
    const second = (await (await app.request("http://127.0.0.1/api/preflight?refresh=1")).json()) as {
      checkedAt: string;
    };
    expect(second.checkedAt).toBe(first.checkedAt);
    expect(preflightBuildCount()).toBe(1);
    const token = await app.request("http://127.0.0.1/api/github/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "ok" }),
    });
    expect(token.status).toBe(200);
    expect(preflightBuildCount()).toBe(1);
    await new Promise((r) => setTimeout(r, 5));
    const fresh = (await (
      await app.request("http://127.0.0.1/api/preflight/recheck", { method: "POST" })
    ).json()) as { checkedAt: string };
    expect(fresh.checkedAt).not.toBe(first.checkedAt);
    expect(preflightBuildCount()).toBe(2);
  });

  it("demo reset rebuilds preflight so GET does not", async () => {
    const app = createApp();
    await resetDemo({ seed: true });
    expect(preflightBuildCount()).toBe(1);
    const res = await app.request("http://127.0.0.1/api/preflight");
    expect(res.status).toBe(200);
    expect(preflightBuildCount()).toBe(1);
  });

  it("can switch the demo preflight fixture to failing", async () => {
    const app = createApp();
    const res = await app.request("http://127.0.0.1/api/demo/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture: "fail" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      checks: { id: string; status: string; ok: boolean; detail?: string }[];
    };
    expect(body.ok).toBe(false);
    expect(body.checks.find((c) => c.id === "github")?.status).toBe("fail");
    expect(body.checks.find((c) => c.id === "claude")?.ok).toBe(false);
    expect(body.checks.find((c) => c.id === "jira")?.detail).toMatch(/token is missing/i);
    const blocked = await app.request("http://127.0.0.1/api/shape", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoSlug: "acme/web", idea: "CSV export" }),
    });
    expect(blocked.status).toBe(409);
    const blockedBody = (await blocked.json()) as { error: string };
    expect(blockedBody.error).toMatch(/git|Claude|GitHub/i);
    expect(blockedBody.error).toMatch(/\.\nFix:/);
    const githubOnly = await app.request("http://127.0.0.1/api/demo/preflight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixture: "github" }),
    });
    const githubBody = (await githubOnly.json()) as { ok: boolean; checks: { id: string; ok: boolean; gates?: string[] }[] };
    expect(githubBody.ok).toBe(false);
    expect(githubBody.checks.find((c) => c.id === "github")?.gates).toEqual(["start", "saveGithub"]);
    expect(githubBody.checks.find((c) => c.id === "claude")?.ok).toBe(true);
    const refineOk = await app.request("http://127.0.0.1/api/shape", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoSlug: "acme/web", idea: "CSV export" }),
    });
    expect(refineOk.status).toBe(200);
    const startBlocked = await app.request("http://127.0.0.1/api/changes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ issueId: "github:acme/web#12" }),
    });
    expect(startBlocked.status).toBe(409);
    expect((await app.request("http://127.0.0.1/api/status")).status).toBe(404);
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

  it("GET /api/issues in demo does not publish issues.updated", async () => {
    const types: string[] = [];
    const unsub = subscribe((ev) => types.push(ev.type));
    const app = createApp();
    await app.request("http://127.0.0.1/api/issues");
    await app.request("http://127.0.0.1/api/issues");
    const synced = await app.request("http://127.0.0.1/api/issues/sync", { method: "POST" });
    unsub();
    expect(synced.status).toBe(200);
    expect(types.filter((t) => t === "issues.updated")).toEqual([]);
  });

  it("stores GitHub and Jira secrets without probing connectivity", async () => {
    const app = createApp();
    const urls: string[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      urls.push(String(input));
      return orig(input, init);
    }) as typeof fetch;
    try {
      const settings = await app.request("http://127.0.0.1/api/settings");
      expect(settings.status).toBe(200);
      const gh = await app.request("http://127.0.0.1/api/github/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "fail" }),
      });
      expect(gh.status).toBe(200);
      expect(await gh.json()).toMatchObject({ ok: true, hasGithubToken: true });
      const jira = await app.request("http://127.0.0.1/api/jira/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteUrl: "https://invalid.example", email: "a@b.c", token: "fail" }),
      });
      expect(jira.status).toBe(200);
      expect(preflightBuildCount()).toBe(1);
      expect(urls.filter((u) => /github\.com|atlassian|anthropic/i.test(u))).toEqual([]);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe("http settings save without demo", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-live-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_SEED;
    resetDbForTests(join(dir, "app.sqlite"));
    resetPreflightStore();
  });
  afterEach(() => {
    closeDb();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("stores GitHub and Jira secrets without calling /user, /myself, or Anthropic", async () => {
    const urls: string[] = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input));
      return new Response("stubbed", { status: 500 });
    }) as typeof fetch;
    try {
      const app = createApp();
      const gh = await app.request("http://127.0.0.1/api/github/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "ghp_not_a_real_token" }),
      });
      expect(gh.status).toBe(200);
      const jira = await app.request("http://127.0.0.1/api/jira/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteUrl: "https://invalid.example", email: "a@b.c", token: "fail" }),
      });
      expect(jira.status).toBe(200);
      expect(urls.filter((u) => /github\.com|atlassian|anthropic/i.test(u))).toEqual([]);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
