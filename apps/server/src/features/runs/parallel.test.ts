import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { setAgentDriver, createFakeDriver } from "../agent/index.ts";
import { createRepo } from "../repos/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { startRun } from "./start.ts";
import { listRuns } from "./store.ts";

describe("parallel runner", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_AGENT = "fake";
    resetDbForTests(join(dir, "app.sqlite"));
    createRepo({ owner: "acme", name: "web", pinned: true });
    upsertIssue({
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "CSV",
      body: "",
      url: "",
      stage: "new",
      repos: [{ owner: "acme", name: "web", registered: true }],
      repoWarning: "none",
      updatedAt: new Date().toISOString(),
    });
    setAgentDriver(createFakeDriver({ delayMs: 40 }));
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_AGENT;
  });

  it("starts 10 fake runs without waiting on each other", async () => {
    let peak = 0;
    const tick = setInterval(() => {
      peak = Math.max(peak, listRuns().filter((r) => r.status === "running").length);
    }, 5);
    await Promise.all(Array.from({ length: 10 }, () => startRun({ issueId: "jira:PROJ-150" })));
    for (let i = 0; i < 80; i += 1) {
      if (listRuns().every((r) => r.status === "completed" || r.status === "paused" || r.status === "failed")) break;
      await new Promise((r) => setTimeout(r, 25));
    }
    clearInterval(tick);
    expect(listRuns()).toHaveLength(10);
    expect(new Set(listRuns().map((r) => r.branch)).size).toBeGreaterThan(1);
    expect(peak).toBeGreaterThan(1);
  });
});
