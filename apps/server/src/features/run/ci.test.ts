import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { watchLiveCi } from "./ci.ts";
import { archiveChange } from "./index.ts";
import { getChange, insertChange, saveChange } from "./store.ts";

const issue = {
  id: "github:acme/web#1",
  source: "github" as const,
  key: "acme/web#1",
  title: "CI poll",
  body: "b",
  url: "https://github.com/acme/web/issues/1",
  repoSlug: "acme/web",
  updatedAt: "2026-11-15T00:00:00.000Z",
  saved: true,
};

describe("live CI poll", () => {
  beforeEach(() => {
    delete process.env.FLIGHTDECK_DEMO;
    process.env.GITHUB_TOKEN = "t";
    process.env.FLIGHTDECK_DATA_DIR = mkdtempSync(join(tmpdir(), "fd-ci-"));
    resetDbForTests(join(process.env.FLIGHTDECK_DATA_DIR, "app.sqlite"));
  });

  afterEach(() => {
    closeDb();
    delete process.env.GITHUB_TOKEN;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("stops watching when the change is archived", async () => {
    const change = insertChange(issue, "live", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.prNumber = 9;
    change.ciPhase = "watching";
    change.ciRound = 1;
    saveChange(change);
    const pending = async () => ({ state: "pending" as const, sha: "abc", summary: "pending" });
    const open = async () => ({ state: "open", merged: false });
    const running = watchLiveCi(change, undefined, { checks: pending, pullState: open, pollMs: 5 });
    await archiveChange(change.id);
    await running;
    expect(getChange(change.id)?.status).toBe("archived");
  });

  it("watchLiveCi marks the change done when checks pass", async () => {
    const change = insertChange(issue, "live", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.prNumber = 9;
    change.ciPhase = "watching";
    change.ciRound = 1;
    saveChange(change);
    await watchLiveCi(change, undefined, {
      checks: async () => ({ state: "passing", sha: "abc", summary: "All checks passed." }),
      pullState: async () => ({ state: "open", merged: false }),
      pollMs: 5,
    });
    expect(change.status).toBe("done");
    expect(change.events.some((e) => e.detail === "All checks passed.")).toBe(true);
  });

  it("stops watching when the pull request is merged", async () => {
    const change = insertChange(issue, "live", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.prNumber = 9;
    change.ciPhase = "watching";
    change.ciRound = 1;
    saveChange(change);
    await watchLiveCi(change, undefined, {
      checks: async () => ({ state: "pending", sha: "abc", summary: "pending" }),
      pullState: async () => ({ state: "closed", merged: true }),
      pollMs: 5,
    });
    expect(change.status).toBe("done");
    expect(change.events.some((e) => e.detail === "Pull request merged.")).toBe(true);
  });
});
