import { getDb } from "../db/index.ts";

export function listFavorites(): string[] {
  const rows = getDb().prepare("SELECT owner, name FROM repo_favorites ORDER BY name").all() as {
    owner: string;
    name: string;
  }[];
  return rows.map((r) => `${r.owner}/${r.name}`);
}

export function setFavorite(owner: string, name: string, on: boolean): void {
  if (on) {
    getDb()
      .prepare("INSERT INTO repo_favorites (owner, name) VALUES (?,?) ON CONFLICT(owner, name) DO NOTHING")
      .run(owner, name);
    return;
  }
  getDb().prepare("DELETE FROM repo_favorites WHERE owner = ? AND name = ?").run(owner, name);
}

export function listRecent(): string[] {
  const rows = getDb()
    .prepare("SELECT owner, name FROM repo_recent ORDER BY used_at DESC LIMIT 12")
    .all() as { owner: string; name: string }[];
  return rows.map((r) => `${r.owner}/${r.name}`);
}

export function touchRecent(slug: string): void {
  const [owner, name] = slug.split("/");
  if (!owner || !name) return;
  getDb()
    .prepare(
      `INSERT INTO repo_recent (owner, name, used_at) VALUES (?,?,?)
       ON CONFLICT(owner, name) DO UPDATE SET used_at = excluded.used_at`,
    )
    .run(owner, name, new Date().toISOString());
}
