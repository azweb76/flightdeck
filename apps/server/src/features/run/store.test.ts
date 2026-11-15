import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { getChange, insertChange, nextQueued, saveChange } from "./store.ts";

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

  it("skips terminal rows in nextQueued even when ci_phase is queued", () => {
    const dir = mkdtempSync(join(tmpdir(), "fd-store-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    const archived = insertChange(issue, "live", "", "flightdeck/a", "watching_ci");
    archived.ciPhase = "queued";
    archived.status = "archived";
    saveChange(archived);
    const waiting = insertChange({ ...issue, id: "github:acme/web#2", key: "acme/web#2" }, "live", "", "flightdeck/b", "queued");
    expect(nextQueued()?.id).toBe(waiting.id);
  });

  it("clears ci_phase when a change is archived", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fd-store-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
    const change = insertChange(issue, "live", "", "flightdeck/ci", "watching_ci");
    change.ciPhase = "queued";
    saveChange(change);
    const { archiveChange } = await import("./index.ts");
    await archiveChange(change.id);
    expect(getChange(change.id)?.status).toBe("archived");
    expect(getChange(change.id)?.ciPhase).toBe("");
    expect(nextQueued()).toBeUndefined();
  });
});
