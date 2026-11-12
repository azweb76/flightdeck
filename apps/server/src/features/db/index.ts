import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dbPath } from "../../paths.ts";

export type Db = DatabaseSync;

let instance: Db | undefined;

const SQL = `
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    repo_slug TEXT,
    updated_at TEXT NOT NULL,
    saved INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS repos (
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    local_path TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (owner, name)
  );
  CREATE TABLE IF NOT EXISTS shape_sessions (
    id TEXT PRIMARY KEY,
    repo_slug TEXT NOT NULL,
    issue_id TEXT,
    status TEXT NOT NULL,
    draft_json TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    saved_key TEXT
  );
`;

export function openDb(path = dbPath()): Db {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SQL);
  migrate(db);
  return db;
}

function migrate(db: Db): void {
  const cols = db.prepare("PRAGMA table_info(shape_sessions)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "saved_key")) db.exec("ALTER TABLE shape_sessions ADD COLUMN saved_key TEXT");
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
