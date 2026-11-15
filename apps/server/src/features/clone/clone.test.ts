import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, getDb, resetDbForTests } from "../db/index.ts";
import type { ExecFn } from "../exec/index.ts";
import { ensureClone, listRememberedRepos, rememberRepo, repoPath } from "./index.ts";

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
    expect(localPath).toContain("flightdeck-demo/acme/web");
    expect(listRememberedRepos()[0]).toMatchObject({ owner: "acme", name: "web" });
    const row = getDb().prepare("SELECT demo, local_path FROM repos WHERE owner = ? AND name = ?").get("acme", "web") as {
      demo: number;
      local_path: string;
    };
    expect(row.demo).toBe(1);
    expect(row.local_path).toContain("flightdeck-demo");
  });

  it("does not overwrite a real clone path with a demo remember", () => {
    rememberRepo("acme", "web", "/Users/dan/src/web", false);
    rememberRepo("acme", "web", "/tmp/flightdeck-demo/acme/web", true);
    const row = getDb().prepare("SELECT demo, local_path FROM repos WHERE owner = ? AND name = ?").get("acme", "web") as {
      demo: number;
      local_path: string;
    };
    expect(row).toEqual({ demo: 0, local_path: "/Users/dan/src/web" });
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
