import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { upsertIssue } from "../issues/store.ts";
import { archiveChange, dailySpendUsd, getChange, startChange, waitForChange, replyChange } from "./index.ts";

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
    expect(done.events.some((e) => e.detail?.startsWith("Demo: would comment"))).toBe(true);
    expect(done.planText.length).toBeGreaterThan(10);
    expect(done.issueBody).toMatch(/Acceptance criteria/i);
    expect(done.issueBody).toMatch(/paid invoices|CSV/i);
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
    expect(stuck.events.filter((e) => e.title === "review").every((e) => /backoff|5xx|webhook/i.test(e.detail ?? ""))).toBe(true);
    await replyChange(started.id, "Ship retries without the extra 5xx fixture.");
    await waitForChange(started.id);
    const resumed = getChange(started.id)!;
    expect(resumed.status).toBe("done");
    expect(resumed.prUrl).toMatch(/\/pull\/42$/);
    expect(resumed.events.some((e) => e.title === "resume")).toBe(true);
    expect(resumed.events.filter((e) => e.kind === "user" && e.detail?.includes("5xx")).length).toBe(1);
    expect(resumed.events.filter((e) => e.title === "implement" && /Using your answer/.test(e.detail ?? "")).length).toBe(1);
  });

  it("stops when the per-run dollar cap is hit", async () => {
    const started = await startChange("github:acme/api#8");
    await waitForChange(started.id);
    const hit = getChange(started.id)!;
    expect(hit.status).toBe("cap_hit");
    expect(hit.costUsd).toBeGreaterThan(0);
    expect(hit.events.some((e) => e.title === "cap")).toBe(true);
    expect(hit.events.some((e) => e.kind === "usage" && (e.costUsd ?? 0) > 0)).toBe(true);
  });

  it("rejects Start until the issue is saved", async () => {
    upsertIssue({
      id: "github:acme/web#99",
      source: "github",
      key: "acme/web#99",
      title: "Unsaved idea",
      body: "Not saved yet.",
      url: "",
      repoSlug: "acme/web",
      updatedAt: new Date().toISOString(),
      saved: false,
    });
    await expect(startChange("github:acme/web#99")).rejects.toThrow(/Save the issue first/);
  });

  it("archive removes the worktree path", async () => {
    const started = await startChange("github:acme/web#12");
    await waitForChange(started.id);
    const archived = await archiveChange(started.id);
    expect(archived.status).toBe("archived");
    expect(archived.worktreePath).toBe("");
    expect(archived.events.at(-1)?.title).toBe("archived");
    expect(dailySpendUsd()).toBe(archived.costUsd);
    expect(archived.costUsd).toBeGreaterThan(0);
  });
});
