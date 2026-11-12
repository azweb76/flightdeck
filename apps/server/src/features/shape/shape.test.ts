import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { replyShape, saveShapedIssue, startShape } from "./index.ts";

describe("shaping", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
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
  });

  it("starts from an existing issue and saves to GitHub or Jira only on Save", async () => {
    upsertIssue({
      id: "jira:PROJ-150",
      source: "jira",
      key: "PROJ-150",
      title: "Export",
      body: "Need CSV",
      url: "",
      updatedAt: new Date().toISOString(),
      saved: true,
    });
    const session = await startShape({ repoSlug: "acme/web", issueId: "jira:PROJ-150" });
    expect(session.draft.title).toBe("Export");
    const gh = await saveShapedIssue(session.id, "github", { repoSlug: "acme/web" });
    expect(gh.source).toBe("github");
    expect(gh.saved).toBe(true);
    const jira = await saveShapedIssue(session.id, "jira", { projectKey: "PROJ" });
    expect(jira.source).toBe("jira");
  });
});
