import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import type { Run } from "@flightdeck/shared";
import { insertRun, getRun } from "./store.ts";
import { recoverInterrupted } from "./recover.ts";

describe("recoverInterrupted", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    delete process.env.FLIGHTDECK_DEMO;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("marks queued, running, and asking runs interrupted", () => {
    const now = new Date().toISOString();
    const a = insertRun(base({ status: "queued", createdAt: now, updatedAt: now }));
    const b = insertRun(base({ status: "running", createdAt: now, updatedAt: now, startedAt: now }));
    const c = insertRun(base({ status: "asking", createdAt: now, updatedAt: now, startedAt: now }));
    const ids = recoverInterrupted();
    expect(ids.sort()).toEqual([a.id, b.id, c.id].sort());
    expect(getRun(a.id)?.status).toBe("interrupted");
    expect(getRun(b.id)?.pauseReason).toMatch(/restarted/);
  });
});

function base(extra: Partial<Run>): Omit<Run, "id"> {
  return {
    issueId: "jira:PROJ-150",
    issueKey: "PROJ-150",
    issueTitle: "CSV",
    issueSource: "jira" as const,
    issueUrl: "",
    repoId: 1,
    repoSlug: "acme/web",
    branch: "agent/run-1",
    worktreePath: "",
    phase: "plan" as const,
    round: 0,
    maxRounds: 2,
    costUsd: 0,
    capUsd: 10,
    prDraft: true,
    ...extra,
  } as Omit<Run, "id">;
}
