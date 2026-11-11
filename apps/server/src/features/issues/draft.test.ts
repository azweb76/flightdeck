import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createRepo } from "../repos/index.ts";
import { loadIssue } from "./store.ts";
import { draftGithubIssue, draftJiraIssue } from "./draft.ts";

describe("draft issues", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("stores a GitHub draft in demo mode", async () => {
    const repo = createRepo({ owner: "acme", name: "web" });
    const { id } = await draftGithubIssue(repo, "Title", "Body");
    expect(loadIssue(id)?.title).toBe("Title");
  });

  it("stores a Jira draft in demo mode", async () => {
    const { id } = await draftJiraIssue("PROJ", "Jira title", "Body");
    expect(id).toBe("jira:PROJ-DRAFT");
    expect(loadIssue(id)?.source).toBe("jira");
  });
});
