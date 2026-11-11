import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { cacheClearAll, cacheFresh, cacheGet, cacheSet, hourCache } from "./index.ts";

describe("api cache", () => {
  beforeEach(() => {
    resetDbForTests(join(mkdtempSync(join(tmpdir(), "fd-")), "app.sqlite"));
  });
  afterEach(() => closeDb());

  it("stores etags and rebuilds after wipe", async () => {
    cacheSet("repos", JSON.stringify([{ owner: "a", name: "b" }]), "etag-1");
    expect(cacheGet("repos")?.etag).toBe("etag-1");
    expect(cacheFresh("repos")).toBe(true);
    cacheClearAll();
    expect(cacheGet("repos")).toBeUndefined();
    const value = await hourCache("user", async () => ({ login: "dan" }));
    expect(value.login).toBe("dan");
    expect((await hourCache("user", async () => ({ login: "other" }))).login).toBe("dan");
  });
});
