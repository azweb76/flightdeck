import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDb, resetDbForTests } from "../db/index.ts";
import { createRepo } from "../repos/index.ts";
import { listCatalog, listFavorites, replaceCatalog, setFavorite, touchRecent } from "./store.ts";

function sample(name: string) {
  return {
    owner: "acme",
    name,
    description: `${name} svc`,
    private: false,
    defaultBranch: "main",
    pushedAt: "2026-11-11T00:00:00Z",
    permission: "WRITE" as const,
  };
}

describe("repo catalog persistence", () => {
  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "flightdeck-"));
    process.env.FLIGHTDECK_DATA_DIR = dir;
    resetDbForTests(join(dir, "app.sqlite"));
  });
  afterEach(() => {
    closeDb();
    delete process.env.FLIGHTDECK_DATA_DIR;
  });

  it("treats a pinned settings repo as a favorite", () => {
    createRepo({ owner: "acme", name: "web", pinned: true });
    createRepo({ owner: "acme", name: "docs", pinned: false });
    expect(listFavorites()).toEqual([{ owner: "acme", name: "web" }]);
  });

  it("stores catalog rows and favorite/recent flags", () => {
    replaceCatalog([sample("web"), sample("api")]);
    setFavorite("acme", "web", true);
    touchRecent("acme", "api");
    const listed = listCatalog();
    expect(listed.find((r) => r.name === "web")).toMatchObject({ favorite: true, description: "web svc" });
    expect(listed.find((r) => r.name === "api")?.lastUsedAt).toBeTruthy();
  });

  it("keeps only the last 10 recent repos", () => {
    replaceCatalog(Array.from({ length: 12 }, (_, i) => sample(`r${i}`)));
    for (let i = 0; i < 12; i++) {
      touchRecent("acme", `r${i}`, `2026-11-11T00:00:${String(i).padStart(2, "0")}.000Z`);
    }
    const recent = listCatalog().filter((r) => r.lastUsedAt);
    expect(recent).toHaveLength(10);
    expect(recent.some((r) => r.name === "r0")).toBe(false);
    expect(recent.some((r) => r.name === "r11")).toBe(true);
  });
});
