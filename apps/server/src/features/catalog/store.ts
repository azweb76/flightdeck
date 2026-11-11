import type { CatalogRepo, RepoPermission } from "@flightdeck/shared";
import { slugOf } from "@flightdeck/shared";
import { getDb } from "../db/index.ts";

type CatalogRow = {
  owner: string;
  name: string;
  description: string;
  private: number;
  default_branch: string;
  pushed_at: string;
  permission: string;
  fetched_at: string;
};

const HOUR_MS = 60 * 60 * 1000;

export function listCatalog(): CatalogRepo[] {
  const rows = getDb()
    .prepare("SELECT * FROM repo_catalog ORDER BY owner, name")
    .all() as CatalogRow[];
  const favorites = favoriteSet();
  const recent = recentMap();
  return rows.map((row) => toCatalog(row, favorites, recent));
}

export function replaceCatalog(repos: Omit<CatalogRepo, "favorite" | "lastUsedAt">[]): void {
  const db = getDb();
  const fetchedAt = new Date().toISOString();
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM repo_catalog");
    const insert = db.prepare(
      `INSERT INTO repo_catalog (owner, name, description, private, default_branch, pushed_at, permission, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const repo of repos) {
      insert.run(
        repo.owner,
        repo.name,
        repo.description,
        repo.private ? 1 : 0,
        repo.defaultBranch,
        repo.pushedAt,
        repo.permission,
        fetchedAt,
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function catalogFetchedAt(): string | undefined {
  const row = getDb()
    .prepare("SELECT fetched_at FROM repo_catalog ORDER BY fetched_at DESC LIMIT 1")
    .get() as { fetched_at: string } | undefined;
  return row?.fetched_at;
}

export function catalogIsStale(ttlMs = HOUR_MS): boolean {
  const at = catalogFetchedAt();
  if (!at) return true;
  return Date.now() - Date.parse(at) >= ttlMs;
}

export function listFavorites(): { owner: string; name: string }[] {
  return getDb()
    .prepare("SELECT owner, name FROM repo_favorites ORDER BY created_at DESC")
    .all() as { owner: string; name: string }[];
}

export function setFavorite(owner: string, name: string, favorite: boolean): void {
  const db = getDb();
  if (favorite) {
    db.prepare(
      `INSERT INTO repo_favorites (owner, name, created_at) VALUES (?, ?, ?)
       ON CONFLICT(owner, name) DO NOTHING`,
    ).run(owner, name, new Date().toISOString());
    return;
  }
  db.prepare("DELETE FROM repo_favorites WHERE owner = ? AND name = ?").run(owner, name);
}

export function touchRecent(owner: string, name: string, usedAt = new Date().toISOString()): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO repo_recent (owner, name, used_at) VALUES (?, ?, ?)
     ON CONFLICT(owner, name) DO UPDATE SET used_at = excluded.used_at`,
  ).run(owner, name, usedAt);
  db.prepare(
    `DELETE FROM repo_recent WHERE rowid NOT IN (
       SELECT rowid FROM repo_recent ORDER BY used_at DESC LIMIT 10
     )`,
  ).run();
}

export function getCatalogRepo(owner: string, name: string): CatalogRepo | undefined {
  const row = getDb()
    .prepare("SELECT * FROM repo_catalog WHERE owner = ? AND name = ?")
    .get(owner, name) as CatalogRow | undefined;
  if (!row) return undefined;
  return toCatalog(row, favoriteSet(), recentMap());
}

function favoriteSet(): Set<string> {
  return new Set(listFavorites().map((r) => slugOf(r).toLowerCase()));
}

function recentMap(): Map<string, string> {
  const rows = getDb()
    .prepare("SELECT owner, name, used_at FROM repo_recent")
    .all() as { owner: string; name: string; used_at: string }[];
  return new Map(rows.map((r) => [slugOf(r).toLowerCase(), r.used_at]));
}

function toCatalog(
  row: CatalogRow,
  favorites: Set<string>,
  recent: Map<string, string>,
): CatalogRepo {
  const key = `${row.owner}/${row.name}`.toLowerCase();
  return {
    owner: row.owner,
    name: row.name,
    description: row.description,
    private: row.private === 1,
    defaultBranch: row.default_branch,
    pushedAt: row.pushed_at,
    permission: row.permission as RepoPermission,
    favorite: favorites.has(key),
    lastUsedAt: recent.get(key),
  };
}
