import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { patchSettings } from "../settings/index.ts";
import { addDailySpend, raiseDailyCap, resumeSpendTomorrow, spendStatus } from "./spend.ts";

describe("daily spend cap", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    patchSettings({ dailyDollarCapUsd: 1 });
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("blocks new starts after the daily cap and unblocks when the cap is raised", () => {
    addDailySpend(1.2);
    const blocked = spendStatus();
    expect(blocked.blocked).toBe(true);
    expect(blocked.reason).toMatch(/Daily spend/);
    const raised = raiseDailyCap(5);
    expect(raised.blocked).toBe(false);
  });

  it("lets Resume tomorrow ignore the cap until the next UTC day", () => {
    const now = new Date("2026-11-11T12:00:00.000Z");
    addDailySpend(9, now);
    expect(spendStatus(now).blocked).toBe(true);
    expect(resumeSpendTomorrow(now).blocked).toBe(false);
    expect(spendStatus(now).blocked).toBe(false);
    addDailySpend(1, new Date("2026-11-12T00:00:01.000Z"));
    expect(spendStatus(new Date("2026-11-12T00:00:01.000Z")).blocked).toBe(true);
  });
});
