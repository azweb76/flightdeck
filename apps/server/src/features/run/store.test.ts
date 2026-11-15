import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { getChange, insertChange, saveChange } from "./store.ts";

const issue = {
  id: "github:acme/web#1",
  source: "github" as const,
  key: "acme/web#1",
  title: "persist",
  body: "b",
  url: "https://github.com/acme/web/issues/1",
  repoSlug: "acme/web",
  updatedAt: "2026-11-15T00:00:00.000Z",
  saved: true,
};

describe("change store", () => {
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("persists ciPushedAt across close and reopen", () => {
    const dir = mkdtempSync(join(tmpdir(), "fd-store-"));
    const path = join(dir, "app.sqlite");
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(path);
    const change = insertChange(issue, "live", "", "flightdeck/ci", "watching_ci");
    change.ciPushedAt = "2026-11-15T12:00:00.000Z";
    saveChange(change);
    const id = change.id;
    closeDb();
    resetDbForTests(path);
    expect(getChange(id)?.ciPushedAt).toBe("2026-11-15T12:00:00.000Z");
  });
});
