import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { resetPreflightStore, runChecks } from "../preflight/index.ts";
import { patchSettings } from "../settings/index.ts";
import { dropJobs, getChange, startChange, waitForChange } from "./index.ts";
import { localDayKey } from "./day.ts";
import { addEvent, archiveAllForTests, dailySpendUsd, listChanges, saveChange } from "./store.ts";

describe("dollar caps across concurrent runs", () => {
  beforeEach(async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    process.env.FLIGHTDECK_RUN_FAST = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-caps-"));
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

  it("stops a run on the per-run cap and records why", async () => {
    const started = await startChange("github:acme/api#8");
    await waitForChange(started.id);
    const hit = getChange(started.id)!;
    expect(hit.status).toBe("cap_hit");
    expect(hit.events.some((e) => e.title === "cap" && /per-run dollar cap/.test(e.detail ?? ""))).toBe(true);
  });

  it("enforces the daily cap across two concurrent runs", async () => {
    dropJobs();
    for (const change of listChanges()) {
      change.status = "archived";
      saveChange(change);
    }
    patchSettings({ dailyDollarCapUsd: 0.2, maxConcurrentAgents: 2, dollarCapUsd: 10 });
    const a = await startChange("github:acme/web#12");
    const b = await startChange("github:acme/web#50");
    await waitForChange(a.id);
    await waitForChange(b.id);
    const statuses = [getChange(a.id)?.status, getChange(b.id)?.status];
    expect(statuses).toContain("cap_hit");
    expect(dailySpendUsd()).toBeGreaterThan(0);
    const cap = [getChange(a.id)!, getChange(b.id)!].find((c) => c.status === "cap_hit");
    expect(cap?.events.some((e) => /daily dollar cap/.test(e.detail ?? ""))).toBe(true);
  });

  it("uses the local calendar day, not UTC, for daily spend", () => {
    const prev = process.env.TZ;
    process.env.TZ = "Pacific/Honolulu";
    getDb().exec("DELETE FROM change_events");
    const change = listChanges()[0];
    expect(change).toBeTruthy();
    addEvent(change!, {
      kind: "usage",
      title: "usage",
      costUsd: 3.25,
      at: "2026-11-16T08:30:00.000Z",
    });
    expect(localDayKey(new Date("2026-11-16T08:30:00.000Z"))).toBe("2026-11-15");
    expect(dailySpendUsd("2026-11-15")).toBe(3.25);
    expect(dailySpendUsd("2026-11-16")).toBe(0);
    process.env.TZ = prev;
  });
});
