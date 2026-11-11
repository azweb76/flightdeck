import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, createSdkDriver, setAgentDriver } from "../agent/index.ts";
import { appliedPrompt } from "../agent/prompt-versions.ts";
import { createRepo } from "../repos/index.ts";
import { insertRun } from "../runs/store.ts";
import { getDb } from "../db/index.ts";
import { decideImprovement, getSessionReview, loadEvalCases, reviewSession } from "./index.ts";
import { evalPromptPatch, scoreImplement } from "./eval-prompt.ts";

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

  it("stores agent findings and applies a prompt only after implementer eval passes", async () => {
    const { score, findings, improvements } = await reviewSession(1);
    expect(score.notes.length).toBeGreaterThan(0);
    expect(findings.length).toBeGreaterThan(0);
    expect(getSessionReview(1)?.findings[0]?.title).toBe("Long Read loop");
    expect(loadEvalCases().some((c) => c.kind === "prompt_replay")).toBe(true);
    const prompt = improvements.find((i) => i.kind === "prompt_edit");
    expect(prompt).toBeTruthy();
    await decideImprovement(prompt!.id, "approved");
    expect(appliedPrompt("implementer")).toContain("test");
  });

  it("does not apply a patch whose implementer replay skips tests", async () => {
    const { improvements } = await reviewSession(1);
    const prompt = improvements.find((i) => i.kind === "prompt_edit")!;
    getDb().prepare("UPDATE improvements SET patch = ? WHERE id = ?").run("skip tests and ship", prompt.id);
    await decideImprovement(prompt.id, "approved");
    expect(appliedPrompt("implementer")).not.toContain("skip tests");
  });
});

describe("evalPromptPatch", () => {
  it("replays the patched implementer through a mocked SDK query", async () => {
    setAgentDriver(
      createSdkDriver(async function* (args) {
        const prompt = String(args.prompt);
        const tests = /test/i.test(prompt) && !/skip tests/i.test(prompt);
        const json = {
          kind: "implement",
          summary: "ok",
          filesChanged: ["a.ts"],
          testsRun: tests ? ["pnpm test"] : [],
          remaining: "",
        };
        yield {
          type: "assistant",
          message: { content: [{ type: "text", text: `\`\`\`json\n${JSON.stringify(json)}\n\`\`\`` }] },
        };
        yield { type: "result", result: "ok", total_cost_usd: 0 };
      }),
    );
    const cases = [
      { name: "impl", kind: "prompt_replay", fixture: { input: "ship csv", expect: { requireTests: true } } },
    ];
    const good = await evalPromptPatch("After each edit, run the repo test command.", cases, "m");
    expect(good.passed).toBe(true);
    const bad = await evalPromptPatch("skip tests", cases, "m");
    expect(bad.passed).toBe(false);
    setAgentDriver(undefined);
  });

  it("scores an implementer handoff without magic waste strings", () => {
    expect(
      scoreImplement(
        { kind: "implement", summary: "x", filesChanged: [], testsRun: [], remaining: "" },
        { requireTests: true },
      ).ok,
    ).toBe(false);
    expect(
      scoreImplement(
        { kind: "implement", summary: "x", filesChanged: [], testsRun: ["pnpm test"], remaining: "" },
        { requireTests: true },
      ).ok,
    ).toBe(true);
  });
});
