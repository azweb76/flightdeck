import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { savePromptVersion } from "./prompt-versions.ts";
import { implementPrompt } from "./prompts.ts";

describe("applied prompt versions", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("appends the latest prompt_versions body to the implementer prompt", () => {
    savePromptVersion("implementer", "Always run pnpm test.");
    const text = implementPrompt(
      {
        id: 1,
        issueId: "jira:X",
        issueKey: "X",
        issueTitle: "t",
        issueSource: "jira",
        issueUrl: "",
        repoId: 1,
        repoSlug: "a/b",
        branch: "agent/X",
        worktreePath: "",
        phase: "implement",
        round: 1,
        maxRounds: 2,
        status: "running",
        costUsd: 0,
        capUsd: 10,
        prDraft: true,
        createdAt: "",
        updatedAt: "",
      },
      1,
    );
    expect(text).toContain("Always run pnpm test.");
  });
});
