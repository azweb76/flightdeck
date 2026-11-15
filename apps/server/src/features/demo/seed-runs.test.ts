import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "./index.ts";
import { presentChange } from "../run/view.ts";
import { listChanges } from "../run/store.ts";
import { listStoredPulls } from "../prs/store.ts";

describe("demo run seeds", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-seed-runs-")), "app.sqlite"));
    seedDemo();
  });

  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("holds a job on the reviewing seed so it is not Interrupted", () => {
    const reviewing = listChanges().find((c) => c.issueKey === "acme/web#45");
    expect(reviewing?.status).toBe("reviewing");
    expect(presentChange(reviewing!).interrupted).toBe(false);
    const interrupted = listChanges().find((c) => c.issueKey === "acme/web#41");
    expect(presentChange(interrupted!).interrupted).toBe(true);
  });

  it("seeds the waiting CI run with plan, review, and draft PR done", () => {
    const waiting = listChanges().find((c) => c.issueKey === "acme/web#73");
    expect(waiting?.planText.length).toBeGreaterThan(10);
    expect(waiting?.reviewRound).toBe(1);
    expect(waiting?.prUrl).toMatch(/\/pull\/73$/);
    expect(waiting?.ciPhase).toBe("queued");
    expect(waiting?.events.some((e) => e.title === "Plan")).toBe(true);
    expect(waiting?.events.some((e) => e.title === "Review")).toBe(true);
    expect(waiting?.events.some((e) => e.title === "draft pr")).toBe(true);
  });

  it("seeds demo PRs when issues already exist", () => {
    getDb().exec("DELETE FROM pull_requests");
    expect(listStoredPulls()).toHaveLength(0);
    seedDemo();
    expect(listStoredPulls().length).toBeGreaterThan(0);
  });
});
