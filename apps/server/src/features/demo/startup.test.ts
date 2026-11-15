import { blockedBy, type PreflightReport } from "@flightdeck/shared";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createApp } from "../../http/app.ts";
import { resetPreflightStore, runStartupPreflight } from "../preflight/index.ts";
import { getSettings, patchSettings } from "../settings/index.ts";
import { applyDemoLifecycle, seedDemo } from "./index.ts";
import { DEMO_JIRA_EMAIL, DEMO_JIRA_SITE } from "./seed-jira.ts";

describe("startup preflight after leaving demo", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-start-"));
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

  it("GET /api/preflight skips leftover demo Jira without Re-check", async () => {
    const gh = process.env.GITHUB_TOKEN;
    const gh2 = process.env.GH_TOKEN;
    process.env.FLIGHTDECK_DEMO = "1";
    seedDemo();
    patchSettings({
      jiraSiteUrl: DEMO_JIRA_SITE,
      jiraEmail: DEMO_JIRA_EMAIL,
      jiraConfigured: true,
    });
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response("stubbed", { status: 401 })) as typeof fetch;
    try {
      applyDemoLifecycle();
      await runStartupPreflight();
      const app = createApp();
      const issues = await app.request("http://127.0.0.1/api/issues");
      expect(issues.status).toBe(200);
      expect(getSettings()).toMatchObject({ jiraSiteUrl: "", jiraEmail: "", jiraConfigured: false });
      const preflight = await app.request("http://127.0.0.1/api/preflight");
      expect(preflight.status).toBe(200);
      const report = (await preflight.json()) as PreflightReport;
      const jira = report.checks.find((c) => c.id === "jira");
      expect(jira).toMatchObject({ status: "skip", ok: true });
      expect(jira?.detail).not.toMatch(/configured but the API token is missing/i);
      expect(blockedBy(report, "saveJira")).toBeUndefined();
    } finally {
      globalThis.fetch = orig;
      if (gh) process.env.GITHUB_TOKEN = gh;
      if (gh2) process.env.GH_TOKEN = gh2;
    }
  });
});
