import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { loadIssue } from "../issues/index.ts";
import { archiveChange, getChange, resumeChange, startChange, startRunQueue, waitForChange, replyChange } from "./index.ts";
import { dropJobs } from "./jobs.ts";
import { presentChange } from "./view.ts";
import { addEvent, archiveAllForTests, insertChange, saveChange } from "./store.ts";

describe("run engine CI (demo)", () => {
  beforeEach(async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_RUN_FAST = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-run-ci-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
    dropJobs();
    archiveAllForTests();
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

  it("auto-fixes one CI failure then passes", async () => {
    const started = await startChange("github:acme/web#71");
    await waitForChange(started.id);
    const done = getChange(started.id)!;
    expect(done.status).toBe("done");
    expect(done.ciRound).toBe(2);
    expect(
      done.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? "")).map((e) => e.detail),
    ).toEqual(["Attempt 1 of 3", "Attempt 2 of 3"]);
    expect(done.events.some((e) => e.title === "ci fix")).toBe(true);
  });

  it("stops a CI fix when the dollar cap is hit", async () => {
    const { patchSettings } = await import("../settings/index.ts");
    patchSettings({ dollarCapUsd: 0.2 });
    const issue = loadIssue("github:acme/web#71");
    const change = insertChange(issue!, "ci-fix", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.ciRound = 1;
    change.ciPhase = "watching";
    change.prNumber = 42;
    saveChange(change);
    addEvent(change, { kind: "stage", title: "CI", detail: "Attempt 1 of 3" });
    await resumeChange(change.id);
    await waitForChange(change.id);
    const hit = getChange(change.id)!;
    expect(hit.status).toBe("cap_hit");
    expect(hit.ciRound).toBe(1);
    expect(hit.events.some((e) => e.title === "cap")).toBe(true);
  });

  it("stops after 3 CI fixes and asks Dan, then one extra attempt", async () => {
    const started = await startChange("github:acme/web#70");
    await waitForChange(started.id);
    const stuck = getChange(started.id)!;
    expect(stuck.status).toBe("needs_dan");
    expect(stuck.stage).toBe("ci");
    expect(stuck.ciRound).toBe(3);
    expect(stuck.ask?.prompt).toMatch(/CI still fails after 3/);
    expect(stuck.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? ""))).toHaveLength(3);
    await replyChange(started.id, "Try one more fix");
    await waitForChange(started.id);
    const resumed = getChange(started.id)!;
    expect(resumed.status).toBe("done");
    expect(resumed.ciRound).toBe(4);
    expect(resumed.events.some((e) => e.detail === "Follow-up after Dan answered")).toBe(true);
  });

  it("Leave it ends the CI run without another auto-fix", async () => {
    const started = await startChange("github:acme/web#70");
    await waitForChange(started.id);
    expect(getChange(started.id)?.status).toBe("needs_dan");
    await replyChange(started.id, "Leave it for me", "leave");
    const left = getChange(started.id)!;
    expect(left.status).toBe("done");
    expect(left.ciRound).toBe(3);
    expect(left.events.some((e) => e.detail === "Left the failing checks for you.")).toBe(true);
  });

  it("action_required does not log a CI failure before the ask", async () => {
    const started = await startChange("github:acme/web#72");
    await waitForChange(started.id);
    const stuck = getChange(started.id)!;
    expect(stuck.status).toBe("needs_dan");
    expect(stuck.events.some((e) => e.detail === "CI failed on attempt 1.")).toBe(false);
    expect(stuck.events.some((e) => e.detail === "A check needs a GitHub action.")).toBe(true);
  });

  it("CI auto-fix waits for a slot without advancing ciRound twice", async () => {
    const { patchSettings } = await import("../settings/index.ts");
    patchSettings({ maxConcurrentAgents: 1 });
    const blocker = await startChange("github:acme/web#15");
    await waitForChange(blocker.id);
    expect(getChange(blocker.id)?.status).toBe("asking");
    const issue = loadIssue("github:acme/web#71");
    const change = insertChange(issue!, "ci-fix", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.ciRound = 1;
    change.ciPhase = "watching";
    change.prNumber = 42;
    saveChange(change);
    addEvent(change, { kind: "stage", title: "CI", detail: "Attempt 1 of 3" });
    const pending = resumeChange(change.id).then(() => waitForChange(change.id));
    await new Promise((r) => setTimeout(r, 40));
    const waiting = getChange(change.id)!;
    expect(waiting.ciPhase).toBe("queued");
    expect(waiting.ciRound).toBe(1);
    expect(waiting.events.some((e) => e.detail === "Waiting for a free slot")).toBe(true);
    expect(presentChange(waiting).interrupted).toBe(false);
    await archiveChange(blocker.id);
    await pending;
    const done = getChange(change.id)!;
    expect(done.status).toBe("done");
    expect(done.ciRound).toBe(2);
    expect(
      done.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? "")).map((e) => e.detail),
    ).toEqual(["Attempt 1 of 3", "Attempt 2 of 3"]);
  });

  it("startRunQueue claims a parked CI fix after restart", async () => {
    const issue = loadIssue("github:acme/web#71");
    const change = insertChange(issue!, "ci-fix", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.ciRound = 1;
    change.ciPhase = "queued";
    change.prNumber = 42;
    saveChange(change);
    addEvent(change, { kind: "stage", title: "CI", detail: "Attempt 1 of 3" });
    dropJobs();
    expect(presentChange(getChange(change.id)!).interrupted).toBe(false);
    await startRunQueue();
    await waitForChange(change.id);
    const done = getChange(change.id)!;
    expect(done.status).toBe("done");
    expect(done.ciRound).toBe(2);
    expect(
      done.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? "")).map((e) => e.detail),
    ).toEqual(["Attempt 1 of 3", "Attempt 2 of 3"]);
  });

  it("Resume continues the in-flight CI attempt after dropJobs", async () => {
    const issue = loadIssue("github:acme/web#71");
    expect(issue).toBeTruthy();
    const change = insertChange(issue!, "ci-fix", "", "flightdeck/ci", "watching_ci");
    change.stage = "ci";
    change.ciRound = 1;
    change.ciPhase = "watching";
    change.prNumber = 42;
    change.prUrl = "https://github.com/acme/web/pull/42";
    saveChange(change);
    addEvent(change, { kind: "stage", title: "CI", detail: "Attempt 1 of 3" });
    dropJobs();
    expect(presentChange(getChange(change.id)!).interrupted).toBe(true);
    await resumeChange(change.id);
    await waitForChange(change.id);
    const done = getChange(change.id)!;
    expect(done.status).toBe("done");
    expect(done.ciRound).toBe(2);
    expect(
      done.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? "")).map((e) => e.detail),
    ).toEqual(["Attempt 1 of 3", "Attempt 2 of 3"]);
    expect(done.events.some((e) => e.title === "ci fix")).toBe(true);
  });

  it("Resume during an in-flight CI fix does not start a new attempt", async () => {
    const issue = loadIssue("github:acme/web#71");
    const change = insertChange(issue!, "ci-fix", "", "flightdeck/ci", "fixing_ci");
    change.stage = "ci";
    change.ciRound = 1;
    change.ciPhase = "fixing";
    change.prNumber = 42;
    change.prUrl = "https://github.com/acme/web/pull/42";
    saveChange(change);
    addEvent(change, { kind: "stage", title: "CI", detail: "Attempt 1 of 3" });
    dropJobs();
    await resumeChange(change.id);
    await waitForChange(change.id);
    const done = getChange(change.id)!;
    expect(done.status).toBe("done");
    expect(done.ciRound).toBe(2);
    expect(
      done.events.filter((e) => e.kind === "stage" && /^Attempt /.test(e.detail ?? "")).map((e) => e.detail),
    ).toEqual(["Attempt 1 of 3", "Attempt 2 of 3"]);
  });
});
