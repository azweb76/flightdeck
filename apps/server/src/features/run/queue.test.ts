import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { getSettings, patchSettings } from "../settings/index.ts";
import { archiveChange, dropJobs, getChange, presentChange, resumeChange, startChange, waitForChange } from "./index.ts";
import { archiveAllForTests, countActive, listChanges } from "./store.ts";
import { pumpQueue } from "./queue.ts";
import { setStage } from "./emit.ts";

describe("run queue and resume", () => {
  beforeEach(async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_RUN_FAST = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-queue-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
    dropJobs();
    resetPreflightStore();
    await runChecks();
  });

  afterEach(() => {
    closeDb();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_RUN_FAST;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("queues a second start while a slot is held and starts it when the first finishes", async () => {
    await clearSeededRuns();
    patchSettings({ maxConcurrentAgents: 1 });
    const first = await startChange("github:acme/web#12");
    const second = await startChange("github:acme/web#50");
    expect(second.status).toBe("queued");
    expect(second.worktreePath).not.toBe(first.worktreePath);
    expect(second.repoSlug).toBe(first.repoSlug);
    await waitForChange(first.id);
    expect(getChange(first.id)?.status).toBe("done");
    await waitForChange(second.id);
    expect(getChange(second.id)?.status).toBe("done");
  });

  it("keeps the slot while waiting on Dan so the next start stays queued", async () => {
    await clearSeededRuns();
    patchSettings({ maxConcurrentAgents: 1 });
    const asking = await startChange("github:acme/web#15");
    await waitForChange(asking.id);
    expect(getChange(asking.id)?.status).toBe("asking");
    expect(countActive()).toBeGreaterThanOrEqual(1);
    const extra = await startChange("github:acme/web#50");
    expect(extra.status).toBe("queued");
  });

  it("resumes a seeded interrupted run", async () => {
    const seeded = listChanges().find((c) => c.issueKey === "acme/web#41");
    expect(seeded).toBeTruthy();
    expect(presentChange(seeded!).interrupted).toBe(true);
    await resumeChange(seeded!.id);
    await waitForChange(seeded!.id);
    expect(getChange(seeded!.id)?.status).toBe("done");
  });

  it("archive of a waiting run frees a slot for the queue", async () => {
    await clearSeededRuns();
    patchSettings({ maxConcurrentAgents: 1 });
    const asking = await startChange("github:acme/web#15");
    await waitForChange(asking.id);
    const extra = await startChange("github:acme/web#50");
    expect(extra.status).toBe("queued");
    await archiveChange(asking.id);
    await waitForChange(extra.id);
    expect(getChange(extra.id)?.status).toBe("done");
  });

  it("Promise.all starts only one agent when max is 1", async () => {
    await clearSeededRuns();
    patchSettings({ maxConcurrentAgents: 1 });
    const [a, b] = await Promise.all([startChange("github:acme/web#12"), startChange("github:acme/web#50")]);
    const queued = [a, b].filter((c) => c.status === "queued");
    const running = [a, b].filter((c) => c.status !== "queued");
    expect(queued).toHaveLength(1);
    expect(running).toHaveLength(1);
  });

  it("startup pump leaves the seeded queued run queued when slots are full", () => {
    dropJobs();
    pumpQueue();
    expect(listChanges().find((c) => c.issueKey === "acme/web#40")?.status).toBe("queued");
    expect(countActive()).toBe(getSettings().maxConcurrentAgents);
  });

  it("archiving a queued run is not undone by setStage or pump", async () => {
    await clearSeededRuns();
    patchSettings({ maxConcurrentAgents: 1 });
    const first = await startChange("github:acme/web#12");
    const queued = await startChange("github:acme/web#50");
    expect(queued.status).toBe("queued");
    await archiveChange(queued.id);
    setStage(queued, "planning", "plan", "Plan");
    pumpQueue();
    expect(getChange(queued.id)?.status).toBe("archived");
    await waitForChange(first.id);
    expect(getChange(queued.id)?.status).toBe("archived");
  });
});

async function clearSeededRuns(): Promise<void> {
  dropJobs();
  archiveAllForTests();
}
