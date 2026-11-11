import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { insertMessage } from "../messages/index.ts";
import { createRepo } from "../repos/index.ts";
import { enqueue } from "./start.ts";
import { getRun, insertRun, listEvents, latestSdkSessionId } from "./store.ts";

describe("resume same worktree and session", () => {
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

  it("keeps the worktree, resumes the sdk session, and injects the operator answer", async () => {
    const now = new Date().toISOString();
    const run = insertRun({
      issueId: "jira:PROJ-150",
      issueKey: "PROJ-150",
      issueTitle: "CSV",
      issueSource: "jira",
      issueUrl: "",
      repoId: 1,
      repoSlug: "acme/web",
      branch: "agent/PROJ-150",
      worktreePath: "/tmp/keep-wt",
      phase: "implement",
      round: 1,
      maxRounds: 2,
      status: "paused",
      costUsd: 0,
      capUsd: 10,
      prDraft: true,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    });
    getDb()
      .prepare(
        "INSERT INTO sessions (run_id, role, phase, round, sdk_session_id, status, created_at) VALUES (?,?,?,?,?,?,?)",
      )
      .run(run.id, "implementer", "implement", 1, "sess-keep", "running", now);
    insertMessage(run.id, { target: "current", text: "Operator answered: yes, /v2" });
    enqueue(run.id);
    for (let i = 0; i < 40; i += 1) {
      const live = getRun(run.id);
      if (live && ["completed", "paused", "failed", "asking"].includes(live.status) && live.startedAt) {
        const details = listEvents(run.id).map((e) => e.detail).join("\n");
        if (details.includes("yes, /v2") || details.includes("Operator answered")) break;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(getRun(run.id)?.worktreePath).toBe("/tmp/keep-wt");
    const details = listEvents(run.id).map((e) => e.detail).join("\n");
    expect(details).toContain("Operator answered");
    expect(latestSdkSessionId(run.id, "implementer")).toBeTruthy();
  });
});
