import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createSdkDriver, setAgentDriver } from "../agent/index.ts";
import { createRepo } from "../repos/index.ts";
import { getRun, insertRun } from "./store.ts";
import { runAgentPhase } from "./execute.ts";
import { pushLiveInput, resolveLiveAnswer } from "./live.ts";

describe("runAgentPhase live SDK session", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_AGENT;
    resetDbForTests(join(dir, "app.sqlite"));
    createRepo({ owner: "acme", name: "web", pinned: true });
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("posts AskUserQuestion tool results and current-phase text on the same prompt stream", async () => {
    const seen: unknown[] = [];
    setAgentDriver(
      createSdkDriver(async function* (args) {
        const iter = (args.prompt as AsyncIterable<unknown>)[Symbol.asyncIterator]();
        await iter.next();
        yield {
          type: "assistant",
          session_id: "live-1",
          message: {
            content: [
              {
                type: "tool_use",
                id: "ask-9",
                name: "AskUserQuestion",
                input: { questions: [{ question: "Ship it?", options: [{ id: "yes", label: "Yes" }] }] },
              },
            ],
          },
        };
        const tool = await iter.next();
        seen.push(tool.value);
        const extra = await iter.next();
        seen.push(extra.value);
        yield { type: "result", session_id: "live-1", total_cost_usd: 0.11, result: "done live" };
      }),
    );
    const now = new Date().toISOString();
    const run = insertRun({
      issueId: "jira:PROJ-1",
      issueKey: "PROJ-1",
      issueTitle: "Live",
      issueSource: "jira",
      issueUrl: "",
      repoId: 1,
      repoSlug: "acme/web",
      branch: "agent/PROJ-1",
      worktreePath: "/tmp",
      phase: "implement",
      round: 1,
      maxRounds: 2,
      status: "running",
      costUsd: 0,
      capUsd: 10,
      prDraft: true,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
    });
    const pending = runAgentPhase(run, "implementer", "implement the issue");
    for (let i = 0; i < 40; i += 1) {
      if (getRun(run.id)?.status === "asking") break;
      await new Promise((r) => setTimeout(r, 25));
    }
    expect(resolveLiveAnswer(run.id, "yes", "ask-9")).toBe(true);
    pushLiveInput(run.id, "keep the current names");
    const result = await pending;
    expect(result.status).toBe("ok");
    expect(result.output).toContain("done live");
    const tool = seen[0] as { message: { content: { type: string; tool_use_id: string }[] } };
    expect(tool.message.content[0]?.type).toBe("tool_result");
    expect(tool.message.content[0]?.tool_use_id).toBe("ask-9");
    const extra = seen[1] as { message: { content: string } };
    expect(extra.message.content).toContain("keep the current names");
  });
});
