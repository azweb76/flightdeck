import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { replyShape, saveShapedIssue, startShape } from "./index.ts";

describe("shaping", () => {
  beforeEach(async () => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
    resetPreflightStore();
    await runChecks();
  });
  afterEach(() => {
    closeDb();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("starts from a new idea, asks, then updates the live draft", async () => {
    const session = await startShape({ repoSlug: "acme/web", idea: "CSV export" });
    expect(session.status).toBe("asking");
    expect(session.messages.some((m) => m.options?.length)).toBe(true);
    const next = await replyShape(session.id, "Backend API");
    expect(next.draft.title).toMatch(/CSV/i);
    expect(next.draft.goal.length).toBeGreaterThan(0);
    expect(next.draft.acceptance.length).toBeGreaterThan(0);
    const again = await replyShape(session.id, "Backend API");
    expect(again.messages.filter((m) => m.role === "user" && m.text === "Backend API")).toHaveLength(1);
  });

  it("rejects an empty idea and locks replies after save", async () => {
    await expect(startShape({ repoSlug: "acme/web", idea: "   " })).rejects.toThrow(/idea/i);
    const session = await startShape({ repoSlug: "acme/web", idea: "CSV export" });
    await replyShape(session.id, "Backend API");
    const saved = await saveShapedIssue(session.id, "github", { repoSlug: "acme/web" });
    expect(saved.key).toMatch(/acme\/web#/);
    expect(saved.demo).toBe(true);
    await expect(replyShape(session.id, "more")).rejects.toThrow(/already saved/i);
  });

  it("starts from an existing issue and saves to GitHub or Jira only on Save", async () => {
    upsertIssue({
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Export",
      body: "# Export\n\n## Goal and background\nNeed CSV\n\n## Acceptance criteria\n- Paid only",
      url: "",
      updatedAt: new Date().toISOString(),
      saved: true,
    });
    const session = await startShape({ repoSlug: "acme/web", issueId: "jira:PROJ-150" });
    expect(session.draft.title).toBe("Export");
    expect(session.draft.goal).toBe("Need CSV");
    expect(session.draft.acceptance).toBe("- Paid only");
    expect(session.draft.goal).not.toContain("##");
    const gh = await saveShapedIssue(session.id, "github", { repoSlug: "acme/web" });
    expect(gh.source).toBe("github");
    expect(gh.saved).toBe(true);
    const jira = await saveShapedIssue(session.id, "jira", { projectKey: "PROJ" });
    expect(jira.source).toBe("jira");
    expect(jira.repoSlug).toBe("acme/web");
  });
});
