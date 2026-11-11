import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { createRepo } from "../repos/index.ts";
import { insertRun } from "../runs/store.ts";
import { decideImprovement, reviewSession } from "./index.ts";
import { getSettings } from "../settings/index.ts";

describe("session review", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
    const repo = createRepo({ owner: "acme", name: "web" });
    const now = new Date().toISOString();
    insertRun({
      issueId: "jira:PROJ-150",
      issueKey: "PROJ-150",
      issueTitle: "CSV",
      issueSource: "jira",
      issueUrl: "",
      repoId: repo.id,
      repoSlug: "acme/web",
      branch: "agent/PROJ-150",
      worktreePath: "",
      phase: "pr",
      round: 1,
      maxRounds: 2,
      status: "completed",
      costUsd: 1,
      capUsd: 10,
      prDraft: true,
      createdAt: now,
      updatedAt: now,
    });
    setAgentDriver(createFakeDriver());
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("scores a run and auto-applies an eval-passing prompt edit", async () => {
    const { score, improvements } = await reviewSession(1);
    expect(score.notes.length).toBeGreaterThan(0);
    const prompt = improvements.find((i) => i.kind === "prompt_edit");
    expect(prompt).toBeTruthy();
    decideImprovement(prompt!.id, "approved");
    expect(getSettings().promptImplementer).toContain("test");
  });
});
