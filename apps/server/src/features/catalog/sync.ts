import type { CatalogRepo } from "@flightdeck/shared";
import { createGithubClient } from "../github/index.ts";
import { catalogFetchedAt, catalogIsStale, listCatalog, replaceCatalog } from "./store.ts";

let refreshing: Promise<CatalogRepo[]> | undefined;

export function readCatalog(): { repos: CatalogRepo[]; fetchedAt?: string; stale: boolean } {
  return { repos: listCatalog(), fetchedAt: catalogFetchedAt(), stale: catalogIsStale() };
}

export function scheduleCatalogRefresh(): void {
  if (refreshing) return;
  void refreshCatalog().catch(() => undefined);
}

export async function refreshCatalog(): Promise<CatalogRepo[]> {
  if (process.env.FLIGHTDECK_DEMO === "1") return listCatalog();
  if (refreshing) return refreshing;
  refreshing = createGithubClient()
    .listAccessibleRepos()
    .then((rows) => {
      replaceCatalog(rows);
      return listCatalog();
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}
