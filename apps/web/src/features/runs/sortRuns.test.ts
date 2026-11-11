import { describe, expect, it } from "vitest";
import type { Run } from "@flightdeck/shared";
import { elapsedLabel, sortRuns } from "./sortRuns.ts";

function run(partial: Partial<Run>): Run {
  return {
    id: 1,
    issueId: "jira:X",
    issueKey: "X",
    issueTitle: "t",
    issueSource: "jira",
    issueUrl: "",
    repoId: 1,
    repoSlug: "acme/web",
    branch: "agent/run-1",
    worktreePath: "",
    phase: "implement",
    round: 0,
    maxRounds: 2,
    status: "running",
    costUsd: 0,
    capUsd: 10,
    prDraft: true,
    createdAt: "2026-11-11T12:00:00.000Z",
    updatedAt: "2026-11-11T12:00:00.000Z",
    ...partial,
  };
}

describe("sortRuns", () => {
  it("puts waiting-on-you first", () => {
    const rows = sortRuns([
      run({ id: 3, status: "completed" }),
      run({ id: 2, status: "running" }),
      run({ id: 1, status: "asking" }),
    ]);
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe("elapsedLabel", () => {
  it("formats minutes from startedAt", () => {
    expect(elapsedLabel(run({ startedAt: "2026-11-11T12:00:00.000Z" }), Date.parse("2026-11-11T12:05:00.000Z"))).toBe(
      "5m",
    );
  });
});
