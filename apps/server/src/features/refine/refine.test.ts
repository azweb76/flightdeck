import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { createRepo } from "../repos/index.ts";
import { startRefine, submitAnswers } from "./index.ts";

describe("refine", () => {
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

  it("asks questions from the refiner session then drafts a goal", async () => {
    const qs = await startRefine("jira:PROJ-150");
    expect(qs.length).toBeGreaterThan(0);
    expect(qs[0]?.options.length).toBeGreaterThanOrEqual(2);
    const goal = await submitAnswers("jira:PROJ-150", [
      { questionId: qs[0]!.id, optionId: qs[0]!.options[0]!.id },
    ]);
    expect(goal.markdown).toMatch(/Goal/);
    expect(goal.originalBody.length).toBeGreaterThan(0);
    expect(goal.status).toBe("draft");
  });
});
