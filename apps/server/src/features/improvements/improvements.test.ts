import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { appliedPrompt } from "../agent/prompt-versions.ts";
import { createRepo } from "../repos/index.ts";
import { insertRun } from "../runs/store.ts";
import { decideImprovement, getSessionReview, loadEvalCases, reviewSession } from "./index.ts";

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

  it("stores agent findings and applies a prompt only after eval replay passes", async () => {
    const { score, findings, improvements } = await reviewSession(1);
    expect(score.notes.length).toBeGreaterThan(0);
    expect(findings.length).toBeGreaterThan(0);
    expect(getSessionReview(1)?.findings[0]?.title).toBe("Long Read loop");
    expect(loadEvalCases().some((c) => c.kind === "handoff")).toBe(true);
    const prompt = improvements.find((i) => i.kind === "prompt_edit");
    expect(prompt).toBeTruthy();
    decideImprovement(prompt!.id, "approved");
    expect(appliedPrompt("implementer")).toContain("test");
  });
});
