import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { setAgentDriver, createFakeDriver } from "../agent/index.ts";
import { createRepo } from "../repos/index.ts";
import { startRun } from "./start.ts";
import { listEvents, listRuns } from "./store.ts";
import { upsertIssue } from "../issues/store.ts";
import { rememberIssuePick } from "../discovery/index.ts";

describe("startRun", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_AGENT = "fake";
    resetDbForTests(join(dir, "app.sqlite"));
    createRepo({ owner: "acme", name: "web", pinned: true });
    setAgentDriver(createFakeDriver());
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_AGENT;
  });

  it("queues a run for a single-repo issue and records a transcript", async () => {
    const run = await startRun({ issueId: "jira:PROJ-150" });
    expect(run.status).toBeDefined();
    await new Promise((r) => setTimeout(r, 50));
    const stored = listRuns()[0];
    expect(stored?.issueKey).toBe("PROJ-150");
    expect(listEvents(stored!.id).length).toBeGreaterThan(0);
  });

  it("starts an unlabeled Jira issue on the last repo for that project", async () => {
    rememberIssuePick("jira:PROJ-1", "acme", "web");
    upsertIssue({
      id: "jira:PROJ-9",
      source: "jira",
      key: "PROJ-9",
      title: "No labels",
      body: "",
      url: "",
      stage: "new",
      repos: [],
      repoWarning: "missing",
      updatedAt: new Date().toISOString(),
    });
    const run = await startRun({ issueId: "jira:PROJ-9" });
    expect(run.repoSlug).toBe("acme/web");
  });
});
