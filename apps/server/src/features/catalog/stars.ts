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
    const demo = process.env.FLIGHTDECK_DEMO === "1" ? 1 : 0;
    getDb()
      .prepare(
        `INSERT INTO repo_favorites (owner, name, demo) VALUES (?,?,?)
         ON CONFLICT(owner, name) DO UPDATE SET
           demo = CASE WHEN repo_favorites.demo = 0 THEN 0 ELSE excluded.demo END`,
      )
      .run(owner, name, demo);
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
  const demo = process.env.FLIGHTDECK_DEMO === "1" ? 1 : 0;
  getDb()
    .prepare(
      `INSERT INTO repo_recent (owner, name, used_at, demo) VALUES (?,?,?,?)
       ON CONFLICT(owner, name) DO UPDATE SET
         used_at = excluded.used_at,
         demo = CASE WHEN repo_recent.demo = 0 THEN 0 ELSE excluded.demo END`,
    )
    .run(owner, name, new Date().toISOString(), demo);
}
