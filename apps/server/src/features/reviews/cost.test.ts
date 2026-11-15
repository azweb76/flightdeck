import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { seedDemo } from "../demo/index.ts";
import { localDayKey } from "../run/day.ts";
import { dailySpendUsd } from "../run/store.ts";
import { addReviewCost, getReview, saveReview } from "./store.ts";

describe("review daily spend", () => {
  beforeEach(() => {
    process.env.FLIGHTDECK_DEMO = "1";
    const dir = mkdtempSync(join(tmpdir(), "fd-rev-cost-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    seedDemo();
  });

  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("attributes review spend to event time, not updated_at", () => {
    const prev = process.env.TZ;
    process.env.TZ = "Pacific/Honolulu";
    getDb().exec("DELETE FROM change_events; DELETE FROM pr_review_events");
    const review = getReview("github:acme/web#92")!;
    addReviewCost(review, 1.5, "2026-11-16T08:30:00.000Z");
    saveReview(review);
    expect(localDayKey(new Date("2026-11-16T08:30:00.000Z"))).toBe("2026-11-15");
    expect(dailySpendUsd("2026-11-15")).toBe(1.5);
    expect(dailySpendUsd("2026-11-16")).toBe(0);
    process.env.TZ = prev;
  });
});
