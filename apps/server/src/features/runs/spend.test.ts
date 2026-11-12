import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Run } from "@flightdeck/shared";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { insertRun, updateRun } from "./store.ts";
import { raiseDailyCap, resumeSpendTomorrow, spendStatus, todaySpend } from "./spend.ts";

describe("daily spend from run costs", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    patchSettings({ dailyDollarCapUsd: 2 });
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("sums costUsd for live runs and today's finished runs in local time, and pauses new starts at the cap", () => {
    const now = new Date(2026, 10, 12, 15, 0, 0);
    const today = now.toISOString();
    const yesterday = new Date(2026, 10, 11, 18, 0, 0).toISOString();
    insertRun(run({ status: "asking", costUsd: 1.84, createdAt: today, updatedAt: today, startedAt: today }));
    insertRun(run({ status: "running", costUsd: 0.3, createdAt: yesterday, updatedAt: today, startedAt: yesterday }));
    insertRun(
      run({
        status: "completed",
        costUsd: 0.42,
        createdAt: today,
        updatedAt: today,
        startedAt: today,
        finishedAt: today,
      }),
    );
    insertRun(
      run({
        status: "failed",
        costUsd: 9,
        createdAt: yesterday,
        updatedAt: yesterday,
        startedAt: yesterday,
        finishedAt: yesterday,
      }),
    );
    expect(todaySpend(now)).toBe(2.56);
    expect(spendStatus(now).blocked).toBe(true);
    expect(spendStatus(now).reason).toMatch(/Daily spend \$2\.56/);
    const live = insertRun(run({ status: "running", costUsd: 0.1, createdAt: today, updatedAt: today, startedAt: today }));
    expect(todaySpend(now)).toBe(2.66);
    updateRun(live.id, { costUsd: 0.5 });
    expect(todaySpend(now)).toBe(3.06);
    expect(raiseDailyCap(5).blocked).toBe(false);
  });

  it("lets Resume tomorrow ignore the cap until the next local day", () => {
    const now = new Date(2026, 10, 11, 22, 0, 0);
    insertRun(
      run({
        status: "interrupted",
        costUsd: 9,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        startedAt: now.toISOString(),
        finishedAt: now.toISOString(),
      }),
    );
    expect(spendStatus(now).blocked).toBe(true);
    expect(resumeSpendTomorrow(now).blocked).toBe(false);
    expect(spendStatus(now).blocked).toBe(false);
    const nextMorning = new Date(2026, 10, 12, 0, 1, 0);
    expect(spendStatus(nextMorning).blocked).toBe(false);
    insertRun(
      run({
        status: "completed",
        costUsd: 3,
        createdAt: nextMorning.toISOString(),
        updatedAt: nextMorning.toISOString(),
        startedAt: nextMorning.toISOString(),
        finishedAt: nextMorning.toISOString(),
      }),
    );
    expect(todaySpend(nextMorning)).toBe(3);
    expect(spendStatus(nextMorning).blocked).toBe(true);
  });
});

function run(extra: Partial<Run>): Omit<Run, "id"> {
  return {
    issueId: "jira:PROJ-150",
    issueKey: "PROJ-150",
    issueTitle: "CSV",
    issueSource: "jira",
    issueUrl: "",
    repoId: 1,
    repoSlug: "acme/web",
    branch: "agent/run-1",
    worktreePath: "",
    phase: "plan",
    round: 0,
    maxRounds: 2,
    status: "queued",
    costUsd: 0,
    capUsd: 10,
    prDraft: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}
