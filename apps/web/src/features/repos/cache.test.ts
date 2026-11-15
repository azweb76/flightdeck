import { afterEach, describe, expect, it } from "vitest";
import type { CatalogView } from "@flightdeck/shared";
import {
  configureRepoCatalog,
  ensureRepoCatalog,
  refreshRepoCatalog,
  repoCatalogSnapshot,
  resetRepoCatalogCache,
  shouldAutoLoadCatalog,
  toggleRepoFavorite,
} from "./cache.ts";

const empty: CatalogView = { repos: [], favorites: [], recent: [] };

describe("repo catalog cache", () => {
  afterEach(() => {
    resetRepoCatalogCache();
    configureRepoCatalog({
      load: async () => empty,
      favorite: async () => empty,
    });
  });

  it("shares one in-flight load across ensure calls", async () => {
    let n = 0;
    configureRepoCatalog({
      load: async () => {
        n += 1;
        return { ...empty, favorites: ["dan/app"] };
      },
    });
    const [a, b] = await Promise.all([ensureRepoCatalog(), ensureRepoCatalog()]);
    expect(n).toBe(1);
    expect(a.favorites).toEqual(["dan/app"]);
    expect(b.favorites).toEqual(["dan/app"]);
    await ensureRepoCatalog();
    expect(n).toBe(1);
  });

  it("does not treat no-token or empty catalog responses as sticky", async () => {
    let n = 0;
    configureRepoCatalog({
      load: async () => {
        n += 1;
        return { ...empty, detail: "Add a GitHub token in Settings to list repositories you can access." };
      },
    });
    await ensureRepoCatalog();
    await ensureRepoCatalog();
    expect(n).toBe(2);
    resetRepoCatalogCache();
    n = 0;
    configureRepoCatalog({
      load: async () => {
        n += 1;
        return empty;
      },
    });
    await ensureRepoCatalog();
    await ensureRepoCatalog();
    expect(n).toBe(2);
  });

  it("does not auto-load again after a failed fetch", async () => {
    let n = 0;
    configureRepoCatalog({
      load: async () => {
        n += 1;
        throw new Error("GitHub is down");
      },
    });
    await ensureRepoCatalog().catch(() => undefined);
    expect(n).toBe(1);
    const snap = repoCatalogSnapshot();
    expect(snap.error).toBe("GitHub is down");
    expect(shouldAutoLoadCatalog(snap)).toBe(false);
    await ensureRepoCatalog().catch(() => undefined);
    expect(n).toBe(2);
    await refreshRepoCatalog(true).catch(() => undefined);
    expect(n).toBe(3);
    expect(shouldAutoLoadCatalog(repoCatalogSnapshot())).toBe(false);
  });

  it("Refresh hits the loader again and favorite writes into the same snapshot", async () => {
    let n = 0;
    configureRepoCatalog({
      load: async () => {
        n += 1;
        return { ...empty, fetchedAt: String(n) };
      },
      favorite: async () => ({ ...empty, favorites: ["acme/web"] }),
    });
    await ensureRepoCatalog();
    await refreshRepoCatalog(true);
    expect(n).toBe(2);
    await toggleRepoFavorite("acme", "web", true);
    expect(repoCatalogSnapshot().data?.favorites).toEqual(["acme/web"]);
  });
});
