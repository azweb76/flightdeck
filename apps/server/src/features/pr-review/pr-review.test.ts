import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createFakeDriver, setAgentDriver } from "../agent/index.ts";
import { startReview } from "./index.ts";

describe("startReview", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
    setAgentDriver(createFakeDriver());
  });
  afterEach(() => {
    closeDb();
    setAgentDriver(undefined);
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("drafts comments from the reviewer agent, not a hardcoded string", async () => {
    const session = await startReview("acme/web", 431);
    expect(session.drafts.length).toBeGreaterThan(0);
    expect(session.drafts[0]?.body).toContain("streaming");
    expect(session.drafts[0]?.body).not.toBe("Draft a comment on the riskiest change.");
  });
});
