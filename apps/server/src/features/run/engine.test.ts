import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { archiveChange, getChange, startChange, waitForChange, replyChange } from "./index.ts";

describe("run engine (demo)", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_RUN_FAST = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-run-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
  });

  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_RUN_FAST;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("runs a successful change through review and a draft PR", async () => {
    const started = await startChange("github:acme/web#12");
    await waitForChange(started.id);
    const done = getChange(started.id)!;
    expect(done.status).toBe("done");
    expect(done.prUrl).toMatch(/\/pull\/42$/);
    expect(done.reviewRound).toBe(1);
    expect(done.events.some((e) => e.title === "draft pr")).toBe(true);
    expect(done.planText.length).toBeGreaterThan(10);
  });

  it("pauses for a question and continues after Dan replies", async () => {
    const started = await startChange("github:acme/web#15");
    await waitForChange(started.id);
    const asking = getChange(started.id)!;
    expect(asking.status).toBe("asking");
    expect(asking.ask?.prompt).toMatch(/refund/i);
    await replyChange(started.id, "Paid only");
    await waitForChange(started.id);
    const done = getChange(started.id)!;
    expect(done.status).toBe("done");
    expect(done.events.some((e) => e.kind === "user" && e.detail === "Paid only")).toBe(true);
  });

  it("stops and asks Dan after 3 failed review rounds", async () => {
    const started = await startChange("github:acme/web#21");
    await waitForChange(started.id);
    const stuck = getChange(started.id)!;
    expect(stuck.status).toBe("needs_dan");
    expect(stuck.reviewRound).toBe(3);
    expect(stuck.events.filter((e) => e.title === "review").length).toBe(3);
  });

  it("stops when the per-run dollar cap is hit", async () => {
    const started = await startChange("github:acme/api#8");
    await waitForChange(started.id);
    const hit = getChange(started.id)!;
    expect(hit.status).toBe("cap_hit");
    expect(hit.events.some((e) => e.title === "cap")).toBe(true);
  });

  it("archive removes the worktree path", async () => {
    const started = await startChange("github:acme/web#12");
    await waitForChange(started.id);
    const archived = await archiveChange(started.id);
    expect(archived.status).toBe("archived");
    expect(archived.worktreePath).toBe("");
    expect(archived.events.at(-1)?.title).toBe("archived");
  });
});
