import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { setAgentDriver } from "../agent/index.ts";
import { dropJobs } from "../run/jobs.ts";
import { nestedWorktree } from "../run/worktree.ts";
import { repoPath } from "../clone/index.ts";
import { patchSettings } from "../settings/index.ts";
import { getReview, saveReview } from "./store.ts";
import { archiveReview, chatReview } from "./engine.ts";

describe("review archive abort", () => {
  beforeEach(async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-rev-arch-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
    dropJobs();
    patchSettings({ maxConcurrentAgents: 10 });
    resetPreflightStore();
    await runChecks();
  });

  afterEach(() => {
    closeDb();
    resetPreflightStore();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
    setAgentDriver(undefined);
  });

  it("aborts in-flight PR chat on Archive without posting a reply", async () => {
    const origDemo = process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DEMO;
    let seenAbort = false;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    setAgentDriver({
      async *run(opts) {
        started();
        await new Promise<void>((resolve) => {
          if (opts.abort?.aborted) {
            seenAbort = true;
            resolve();
            return;
          }
          opts.abort?.addEventListener("abort", () => {
            seenAbort = true;
            resolve();
          });
        });
        yield { kind: "text", title: "text", detail: "should not land" };
      },
    });
    const p = chatReview("github:acme/web#92", "Walk the guard");
    await ready;
    const archived = await archiveReview("github:acme/web#92");
    expect(archived.status).toBe("archived");
    const done = await p;
    expect(done.status).toBe("archived");
    expect(seenAbort).toBe(true);
    expect(done.messages.some((m) => m.text === "should not land")).toBe(false);
    process.env.FLIGHTDECK_DEMO = origDemo;
  });

  it("removes a nested review worktree when Archive has no stored path", async () => {
    delete process.env.FLIGHTDECK_DEMO;
    const review = getReview("github:acme/web#90")!;
    const root = repoPath("acme", "web");
    mkdirSync(root, { recursive: true });
    const dest = nestedWorktree(root, `review-${review.id}`).path;
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "kept.txt"), "x");
    review.worktreePath = "";
    saveReview(review);
    await archiveReview(review.id);
    expect(existsSync(dest)).toBe(false);
  });
});
