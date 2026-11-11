import { getDb } from "../db/index.ts";

const HOUR_MS = 60 * 60 * 1000;

export function cacheGet(key: string): { body: string; etag?: string; fetchedAt: string } | undefined {
  const row = getDb()
    .prepare("SELECT body, etag, fetched_at FROM api_cache WHERE key = ?")
    .get(key) as { body: string; etag: string | null; fetched_at: string } | undefined;
  if (!row) return undefined;
  return { body: row.body, etag: row.etag ?? undefined, fetchedAt: row.fetched_at };
}

export function cacheSet(key: string, body: string, etag?: string): void {
  getDb()
    .prepare(
      `INSERT INTO api_cache (key, etag, body, fetched_at) VALUES (?,?,?,?)
       ON CONFLICT(key) DO UPDATE SET etag=excluded.etag, body=excluded.body, fetched_at=excluded.fetched_at`,
    )
    .run(key, etag ?? null, body, new Date().toISOString());
}

export function cacheFresh(key: string, ttlMs = HOUR_MS): boolean {
  const row = cacheGet(key);
  if (!row) return false;
  return Date.now() - Date.parse(row.fetchedAt) < ttlMs;
}

export function cacheClearPrefix(prefix: string): void {
  getDb().prepare("DELETE FROM api_cache WHERE key LIKE ?").run(`${prefix}%`);
}

export function cacheClearAll(): void {
  getDb().exec("DELETE FROM api_cache");
}

export function hourCache<T>(key: string, load: () => Promise<T>, refresh = false): Promise<T> {
  if (!refresh && cacheFresh(key)) {
    return Promise.resolve(JSON.parse(cacheGet(key)!.body) as T);
  }
  return load().then((value) => {
    cacheSet(key, JSON.stringify(value));
    return value;
  });
}
