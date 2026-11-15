import type { CatalogRepo, CatalogView } from "@flightdeck/shared";
import { CACHE_KEYS, getCache } from "../cache/index.ts";
import { listRememberedRepos } from "../clone/index.ts";
import { createGithubClient, resolveGithubToken } from "../github/index.ts";
import { cacheFresh, readRepoCache, writeRepoCache } from "./cache.ts";
import { listFavorites, listRecent, setFavorite, touchRecent } from "./stars.ts";

export { setFavorite, touchRecent };

const DEMO: CatalogRepo[] = [
  { owner: "acme", name: "web", localPath: "" },
  { owner: "acme", name: "api", localPath: "" },
  { owner: "acme", name: "mobile", localPath: "" },
];

export async function listCatalog(opts: { refresh?: boolean } = {}): Promise<CatalogView> {
  const favorites = listFavorites();
  const recent = listRecent();
  if (process.env.FLIGHTDECK_DEMO === "1") {
    return view(merge(DEMO, listRememberedRepos()), favorites, recent, new Date().toISOString());
  }
  if (!(await resolveGithubToken())) {
    return view(listRememberedRepos(), favorites, recent, undefined, "Add a GitHub token in Settings to list repositories you can access.");
  }
  try {
    const repos = await loadRemote(Boolean(opts.refresh));
    const fetchedAt = new Date(readRepoCache()?.at ?? Date.now()).toISOString();
    const merged = merge(repos, listRememberedRepos());
    const detail = merged.length ? undefined : "No repositories found for this GitHub account.";
    return view(merged, favorites, recent, fetchedAt, detail);
  } catch (err) {
    const stale = readRepoCache()?.repos ?? [];
    const merged = merge(stale, listRememberedRepos());
    const message = err instanceof Error ? err.message : "Could not list GitHub repositories";
    return view(merged, favorites, recent, undefined, message);
  }
}

async function loadRemote(refresh: boolean): Promise<CatalogRepo[]> {
  const cached = readRepoCache();
  if (!refresh && cacheFresh(cached) && cached) return cached.repos;
  if (refresh) getCache().invalidate(CACHE_KEYS.githubRepos);
  const repos = await createGithubClient().listRepos();
  writeRepoCache(repos);
  return repos;
}

function merge(remote: CatalogRepo[], remembered: CatalogRepo[]): CatalogRepo[] {
  const byKey = new Map<string, CatalogRepo>();
  for (const r of [...remote, ...remembered]) {
    const key = `${r.owner}/${r.name}`;
    byKey.set(key, {
      owner: r.owner,
      name: r.name,
      localPath: r.localPath || byKey.get(key)?.localPath || "",
    });
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function view(
  repos: CatalogRepo[],
  favorites: string[],
  recent: string[],
  fetchedAt?: string,
  detail?: string,
): CatalogView {
  return { repos, favorites, recent, fetchedAt, detail };
}
