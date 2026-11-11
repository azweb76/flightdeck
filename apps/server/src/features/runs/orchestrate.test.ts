import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { insertGoal } from "../goals/store.ts";
import { listHandoffs } from "../handoffs/store.ts";
import { createRepo } from "../repos/index.ts";
import { startRun } from "./start.ts";
import { getRun, listEvents } from "./store.ts";

async function settle(id: number): Promise<void> {
  for (let i = 0; i < 40; i += 1) {
    const run = getRun(id);
    if (run && ["completed", "paused", "failed", "asking"].includes(run.status)) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe("orchestrate", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_AGENT = "fake";
    resetDbForTests(join(dir, "app.sqlite"));
    createRepo({ owner: "acme", name: "web", pinned: true });
    const now = new Date().toISOString();
    insertGoal({
      issueId: "jira:PROJ-150",
      originalBody: "export csv",
      markdown: "## Goal\nCSV export",
      status: "approved",
      createdAt: now,
      updatedAt: now,
    });
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_AGENT;
  });

  it("stores Zod handoffs from the fake planner/implementer/reviewer", async () => {
    setAgentDriver(createFakeDriver());
    const run = await startRun({ issueId: "jira:PROJ-150" });
    await settle(run.id);
    const kinds = listHandoffs(run.id).map((h) => h.json.kind);
    expect(kinds).toContain("plan");
    expect(kinds).toContain("implement");
    expect(kinds).toContain("review");
  });

  it("re-plans after a major finding", async () => {
    setAgentDriver(createFakeDriver({ majorFirst: true }));
    const run = await startRun({ issueId: "jira:PROJ-150" });
    await settle(run.id);
    const planners = listEvents(run.id).filter((e) => e.role === "planner" && e.title.includes("started"));
    expect(planners.length).toBeGreaterThanOrEqual(2);
  });
});
