import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, createSdkDriver, setAgentDriver } from "../agent/index.ts";
import { startReview } from "./index.ts";
import type { GithubClient } from "../github/index.ts";

describe("startReview", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("drafts comments from the reviewer agent, not a hardcoded string", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    setAgentDriver(createFakeDriver());
    const session = await startReview("acme/web", 431);
    expect(session.drafts.length).toBeGreaterThan(0);
    expect(session.drafts[0]?.body).toContain("streaming");
    expect(session.drafts[0]?.body).not.toBe("Draft a comment on the riskiest change.");
  });

  it("uses the SDK driver with a mocked query, not createFakeDriver", async () => {
    delete process.env.FLIGHTDECK_DEMO;
    setAgentDriver(
      createSdkDriver(async function* () {
        yield {
          type: "assistant",
          session_id: "pr-sess",
          message: {
            content: [
              {
                type: "text",
                text: '```json\n{"kind":"pr_review","comments":[{"path":"src/a.ts","line":4,"body":"SDK drafted this."}]}\n```',
              },
            ],
          },
        };
        yield { type: "result", session_id: "pr-sess", total_cost_usd: 0.03, result: "ok" };
      }),
    );
    const github = {
      prView: async () => ({ title: "Add export", files: "[]" }),
      prDiff: async () => "+export function x() {}",
    } as unknown as GithubClient;
    const session = await startReview("acme/web", 99, { github });
    expect(session.drafts[0]?.body).toBe("SDK drafted this.");
  });
});
