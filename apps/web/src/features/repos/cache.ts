import type { CatalogView } from "@flightdeck/shared";
import { api } from "../../api.ts";

export const REPOS_QUERY_KEY = "repos";

type Loader = (refresh: boolean) => Promise<CatalogView>;
type Favorite = (owner: string, name: string, on: boolean) => Promise<CatalogView>;

type Entry = {
  data?: CatalogView;
  error?: string;
  loading: boolean;
  inflight?: Promise<CatalogView>;
};

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
let loadCatalogFn: Loader = (refresh) => api.repos(refresh);
let favoriteFn: Favorite = (owner, name, on) => api.favoriteRepo(owner, name, on);

export function configureRepoCatalog(opts: { load?: Loader; favorite?: Favorite }): void {
  if (opts.load) loadCatalogFn = opts.load;
  if (opts.favorite) favoriteFn = opts.favorite;
}

export function resetRepoCatalogCache(): void {
  store.clear();
  emit();
}

export function subscribeRepoCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function repoCatalogSnapshot(key = REPOS_QUERY_KEY): Entry {
  return take(key);
}

export function shouldAutoLoadCatalog(entry: Entry): boolean {
  return !entry.data && !entry.loading && !entry.inflight && !entry.error;
}

export function ensureRepoCatalog(key = REPOS_QUERY_KEY): Promise<CatalogView> {
  const entry = take(key);
  if (entry.inflight) return entry.inflight;
  if (entry.data && isSticky(entry.data)) return Promise.resolve(entry.data);
  return refreshRepoCatalog(false, key);
}

export function refreshRepoCatalog(force = true, key = REPOS_QUERY_KEY): Promise<CatalogView> {
  const entry = take(key);
  if (!force && entry.inflight) return entry.inflight;
  entry.loading = true;
  entry.error = undefined;
  emit();
  const inflight = loadCatalogFn(force)
    .then((data) => finish(entry, data))
    .catch((err: unknown) => fail(entry, err));
  entry.inflight = inflight;
  return inflight;
}

export async function toggleRepoFavorite(owner: string, name: string, on: boolean, key = REPOS_QUERY_KEY): Promise<void> {
  const data = await favoriteFn(owner, name, on);
  finish(take(key), data);
}

function take(key: string): Entry {
  const existing = store.get(key);
  if (existing) return existing;
  const entry: Entry = { loading: false };
  store.set(key, entry);
  return entry;
}

function finish(entry: Entry, data: CatalogView): CatalogView {
  entry.data = data;
  entry.error = undefined;
  entry.loading = false;
  entry.inflight = undefined;
  emit();
  return data;
}

function fail(entry: Entry, err: unknown): Promise<CatalogView> {
  entry.error = err instanceof Error ? err.message : "Could not load repositories";
  entry.loading = false;
  entry.inflight = undefined;
  emit();
  return Promise.reject(err);
}

function isSticky(data: CatalogView): boolean {
  if (data.detail) return false;
  return data.repos.length > 0 || data.favorites.length > 0 || data.recent.length > 0;
}

function emit(): void {
  for (const listener of listeners) listener();
}
