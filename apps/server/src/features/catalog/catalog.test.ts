import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetCacheForTests } from "../cache/store.ts";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { listCatalog, setFavorite, touchRecent } from "./index.ts";
import { cacheFresh, readRepoCache, REPO_CACHE_TTL_MS, writeRepoCache } from "./cache.ts";

describe("repo catalog", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "fd-cat-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    process.env.FLIGHTDECK_NO_KEYCHAIN = "1";
    resetDbForTests(join(dir, "app.sqlite"));
    resetCacheForTests();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_TOKEN;
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DEMO;
    delete process.env.GITHUB_TOKEN;
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("uses mock repos in demo mode", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    const view = await listCatalog();
    expect(view.repos.map((r) => `${r.owner}/${r.name}`)).toEqual(["acme/api", "acme/mobile", "acme/web"]);
    expect(view.detail).toBeUndefined();
  });

  it("explains a missing GitHub token", async () => {
    const view = await listCatalog();
    expect(view.repos).toEqual([]);
    expect(view.detail).toMatch(/Add a GitHub token/i);
  });

  it("persists favorites and recent locally", async () => {
    process.env.FLIGHTDECK_DEMO = "1";
    setFavorite("acme", "web", true);
    touchRecent("acme/api");
    const view = await listCatalog();
    expect(view.favorites).toEqual(["acme/web"]);
    expect(view.recent).toEqual(["acme/api"]);
  });

  it("keeps the SQLite repo cache for an hour", () => {
    writeRepoCache([{ owner: "acme", name: "web", localPath: "" }]);
    expect(cacheFresh(readRepoCache())).toBe(true);
    expect(cacheFresh(readRepoCache(), Date.now() + REPO_CACHE_TTL_MS + 1)).toBe(false);
  });
});
