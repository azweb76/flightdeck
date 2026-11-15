import type { CatalogRepo } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

export const REPO_CACHE_TTL_MS = 60 * 60 * 1000;
const KEY = "github_repos_cache";

type Blob = { at: number; repos: CatalogRepo[] };

export function readRepoCache(): Blob | undefined {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(KEY) as { value: string } | undefined;
  if (!row?.value) return undefined;
  try {
    const parsed = JSON.parse(row.value) as Blob;
    if (!Array.isArray(parsed.repos) || typeof parsed.at !== "number") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeRepoCache(repos: CatalogRepo[]): Blob {
  const blob: Blob = { at: Date.now(), repos };
  getDb()
    .prepare("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(KEY, JSON.stringify(blob));
  return blob;
}

export function cacheFresh(blob: Blob | undefined, now = Date.now()): boolean {
  return Boolean(blob && now - blob.at < REPO_CACHE_TTL_MS);
}
