import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import { getSettings, patchSettings } from "./index.ts";

describe("settings board PR defaults", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "flightdeck-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("persists Phase 11 toggles ON for settings saved before those keys existed", () => {
    patchSettings({ setupComplete: true, jiraJql: "assignee = currentUser()" });
    getDb()
      .prepare("UPDATE settings SET value = ? WHERE key = ?")
      .run(JSON.stringify({ setupComplete: true, jiraJql: "assignee = currentUser()" }), "app");
    const settings = getSettings();
    expect(settings.boardAuthoredPrs).toBe(true);
    expect(settings.boardReviewPrs).toBe(true);
    expect(settings.boardLinkedIssues).toBe(true);
    const stored = JSON.parse(
      (getDb().prepare("SELECT value FROM settings WHERE key = ?").get("app") as { value: string }).value,
    ) as Record<string, unknown>;
    expect(stored.boardAuthoredPrs).toBe(true);
    expect(stored.boardReviewPrs).toBe(true);
  });
});
