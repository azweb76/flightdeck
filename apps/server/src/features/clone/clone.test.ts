import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import type { ExecFn } from "../exec/index.ts";
import { ensureClone, listRememberedRepos, repoPath } from "./index.ts";

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

  it("skips git fetch origin within TTL", async () => {
    delete process.env.FLIGHTDECK_DEMO;
    resetCacheForTests();
    const dest = repoPath("acme", "web");
    mkdirSync(join(dest, ".git"), { recursive: true });
    let fetches = 0;
    const exec: ExecFn = async (_file, args) => {
      if (args[0] === "fetch") fetches += 1;
      return { code: 0, stdout: "", stderr: "" };
    };
    await ensureClone("acme", "web", exec);
    await ensureClone("acme", "web", exec);
    expect(fetches).toBe(1);
  });
});
