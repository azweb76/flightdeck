import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { ensureClone, listRememberedRepos } from "./index.ts";

describe("ensureClone", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_DEMO = "1";
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
    delete process.env.FLIGHTDECK_DEMO;
  });

  it("records a demo path without calling git", async () => {
    const { localPath } = await ensureClone("acme", "web");
    expect(localPath).toContain("acme/web");
    expect(listRememberedRepos()[0]).toMatchObject({ owner: "acme", name: "web" });
  });
});
