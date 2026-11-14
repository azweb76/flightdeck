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
  return instance;
}

export function closeDb(): void {
  instance?.close();
  instance = undefined;
}
