import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dbPath } from "../../paths.ts";
import { MIGRATIONS } from "./migrations.ts";

export type Db = DatabaseSync;

let instance: Db | undefined;

export function openDb(path = dbPath()): Db {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  applyMigrations(db);
  return db;
}

export function getDb(): Db {
  instance ??= openDb();
  return instance;
}

export function resetDbForTests(path: string): Db {
  instance?.close();
  instance = openDb(path);
  return instance;
}

export function closeDb(): void {
  instance?.close();
  instance = undefined;
}

function applyMigrations(db: Db): void {
  const rows = db.prepare("SELECT id FROM schema_migrations").all() as { id: string }[];
  const applied = new Set(rows.map((row) => row.id));
  const now = new Date().toISOString();
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(m.id, now);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
}
