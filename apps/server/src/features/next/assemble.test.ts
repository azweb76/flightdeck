import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { insertRun, updateRun } from "../runs/store.ts";
import { insertQuestion } from "../questions/store.ts";
import { upsertBoardPr } from "../board-prs/store.ts";
import { assembleNext, nextBadge } from "./assemble.ts";
import { upsertInboxState } from "./store.ts";

describe("assembleNext", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("orders waiting, fix PRs, review requests, then issues and hides done rows", () => {
    const now = new Date().toISOString();
    upsertIssue({
      id: "jira:PROJ-1",
      source: "jira",
      key: "PROJ-1",
      title: "Assigned",
      body: "",
      url: "",
      stage: "new",
      repos: [{ owner: "acme", name: "web", registered: true }],
      repoWarning: "none",
      updatedAt: now,
      jiraPriority: "Highest",
    });
    const run = insertRun({
      issueId: "jira:PROJ-1",
      issueKey: "PROJ-1",
      issueTitle: "Assigned",
      issueSource: "jira",
      issueUrl: "",
      repoId: 1,
      repoSlug: "acme/web",
      branch: "agent/run-1",
      worktreePath: "",
      phase: "implement",
      round: 0,
      maxRounds: 2,
      status: "asking",
      costUsd: 0,
      capUsd: 10,
      prDraft: true,
      pauseReason: "Pick a path",
      createdAt: now,
      updatedAt: now,
    });
    const q = insertQuestion({ runId: run.id, prompt: "Pick a path", options: [{ id: "a", label: "A" }] });
    updateRun(run.id, { questionId: q.id });
    upsertBoardPr({
      id: "acme/web#1",
      number: 1,
      title: "CI red",
      url: "",
      repo: "acme/web",
      role: "mine",
      ci: "failing",
      review: "pending",
      unresolvedThreads: 0,
      draft: false,
      ageDays: 1,
      headRef: "h",
      headRepo: "acme/web",
      viewerCanPush: true,
      isFork: false,
      body: "",
      createdAt: now,
      updatedAt: now,
      linkedIssueIds: [],
      state: "open",
      labels: ["P0"],
    });
    upsertBoardPr({
      id: "acme/api#2",
      number: 2,
      title: "Please review",
      url: "",
      repo: "acme/api",
      role: "review",
      ci: "passing",
      review: "pending",
      unresolvedThreads: 0,
      draft: false,
      ageDays: 1,
      headRef: "h",
      headRepo: "acme/api",
      viewerCanPush: true,
      isFork: false,
      body: "",
      createdAt: now,
      updatedAt: now,
      linkedIssueIds: [],
      state: "open",
      labels: ["priority:high"],
    });
    const items = assembleNext();
    expect(items.map((i) => i.bucket)).toEqual(["waiting", "fix_prs", "review", "issues"]);
    expect(items[1]?.priority).toBe(0);
    expect(items[2]?.priority).toBe(1);
    expect(items[3]?.priority).toBe(0);
    expect(nextBadge()).toBe(3);
    upsertInboxState({ id: "issue:jira:PROJ-1", snoozeUntilChange: false, done: true });
    expect(assembleNext().some((i) => i.bucket === "issues")).toBe(false);
  });

  it("hides a snoozed-until-change row until CI or review moves", () => {
    const now = new Date().toISOString();
    upsertBoardPr({
      id: "acme/web#9",
      number: 9,
      title: "CI red",
      url: "",
      repo: "acme/web",
      role: "mine",
      ci: "failing",
      review: "pending",
      unresolvedThreads: 0,
      draft: false,
      ageDays: 1,
      headRef: "h",
      headRepo: "acme/web",
      viewerCanPush: true,
      isFork: false,
      body: "",
      createdAt: now,
      updatedAt: now,
      linkedIssueIds: [],
      state: "open",
      labels: [],
    });
    const snap = `${now}|failing|pending`;
    upsertInboxState({ id: "pr:acme/web#9", snoozeUntilChange: true, snapshot: snap, done: false });
    expect(assembleNext().some((i) => i.id === "pr:acme/web#9")).toBe(false);
    upsertBoardPr({
      id: "acme/web#9",
      number: 9,
      title: "CI red",
      url: "",
      repo: "acme/web",
      role: "mine",
      ci: "failing",
      review: "changes_requested",
      unresolvedThreads: 0,
      draft: false,
      ageDays: 1,
      headRef: "h",
      headRepo: "acme/web",
      viewerCanPush: true,
      isFork: false,
      body: "",
      createdAt: now,
      updatedAt: now,
      linkedIssueIds: [],
      state: "open",
      labels: [],
    });
    expect(assembleNext().some((i) => i.id === "pr:acme/web#9")).toBe(true);
  });
});
