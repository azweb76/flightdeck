import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { dbPath } from "../../paths.ts";
import { applyMigrations, migrateOpenFile } from "./migrate.ts";

export type Db = DatabaseSync;
export { SCHEMA_VERSION } from "./schema.ts";
export { schemaHealth, databasePreflightCheck, type SchemaHealth } from "./health.ts";
export { getLastBackupPath, resetBackupPathForTests } from "./backup.ts";
export { userVersion, missingColumns, isIncompatibleV1 } from "./inspect.ts";

let instance: Db | undefined;
let txDepth = 0;

export function openDb(path = dbPath()): Db {
  mkdirSync(dirname(path), { recursive: true });
  migrateOpenFile(path);
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
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
  txDepth = 0;
  return instance;
}

export function closeDb(): void {
  instance?.close();
  instance = undefined;
  txDepth = 0;
}

/** One SQLite writer at a time. Nested calls reuse the open transaction. */
export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  if (txDepth > 0) return fn();
  db.exec("BEGIN IMMEDIATE");
  txDepth += 1;
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw err;
  } finally {
    txDepth = 0;
  }
}
